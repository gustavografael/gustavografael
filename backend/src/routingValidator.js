import { randomUUID } from "node:crypto";
import { NodeSSH } from "node-ssh";

const IPV4_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;

export const pendingRoutingPlans = new Map();

function normalizeLine(line) {
  return line.replace(/\s+/g, " ").trim();
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function wrapForShell(command) {
  return `bash -lc ${JSON.stringify(command)}`;
}

function clish(command) {
  return `clish -c ${JSON.stringify(command)}`;
}

function normalizeCredentials(firewall, shared) {
  return {
    hostname: firewall.hostname,
    gatewayIp: firewall.gatewayIp,
    port: Number(firewall.port || shared.port || 22),
    username: firewall.username || shared.username,
    password: firewall.password || shared.password || undefined,
    privateKey: firewall.privateKey || shared.privateKey || undefined,
    passphrase: firewall.passphrase || shared.passphrase || undefined
  };
}

async function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} excedeu ${timeoutMs} ms.`)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function connect(credentials, timeouts) {
  const ssh = new NodeSSH();

  await withTimeout(
    ssh.connect({
      host: credentials.gatewayIp,
      port: credentials.port,
      username: credentials.username,
      password: credentials.password,
      privateKey: credentials.privateKey,
      passphrase: credentials.passphrase,
      readyTimeout: timeouts.connectTimeoutMs,
      tryKeyboard: Boolean(credentials.password)
    }),
    timeouts.connectTimeoutMs + 1000,
    `Conexão SSH ${credentials.hostname}`
  );

  return ssh;
}

async function execCommand(ssh, command, timeouts) {
  const result = await withTimeout(
    ssh.execCommand(wrapForShell(command), { execOptions: { pty: true } }),
    timeouts.commandTimeoutMs,
    `Comando ${command}`
  );

  return {
    command,
    stdout: stripAnsi(result.stdout ?? "").trim(),
    stderr: stripAnsi(result.stderr ?? "").trim(),
    code: result.code ?? 0
  };
}

async function execFallback(ssh, commands, timeouts) {
  const attempts = [];

  for (const command of commands) {
    const result = await execCommand(ssh, command, timeouts);
    attempts.push(result);

    const output = `${result.stdout}\n${result.stderr}`;
    if (result.code === 0 && result.stdout && !/invalid command|unknown command|command not found|syntax error/i.test(output)) {
      return { ...result, attempts };
    }
  }

  return { ...attempts.at(-1), attempts };
}

export function parseClusterRole(output) {
  const lines = stripAnsi(output)
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  const localLine = lines.find((line) => /\(local\)|\blocal\b/i.test(line));
  const stateLine = localLine ?? lines.find((line) => /\b(active|standby|backup|down)\b/i.test(line));

  if (!stateLine) {
    return "unknown";
  }

  if (/\bactive\b/i.test(stateLine)) {
    return "active";
  }

  if (/\bstandby\b|\bbackup\b/i.test(stateLine)) {
    return "standby";
  }

  if (/\bdown\b/i.test(stateLine)) {
    return "down";
  }

  return "unknown";
}

function routeTypeFromLine(line) {
  const trimmed = normalizeLine(line);
  const firstToken = trimmed.split(" ")[0]?.replace(/[*:>]/g, "").toUpperCase();

  if (["S", "STATIC"].includes(firstToken) || /^static\b/i.test(trimmed)) {
    return "static";
  }

  if (["C", "CONNECTED"].includes(firstToken) || /^connected\b/i.test(trimmed)) {
    return "connected";
  }

  if (["B", "BGP"].includes(firstToken) || /^bgp\b/i.test(trimmed)) {
    return "bgp";
  }

  if (["O", "OSPF"].includes(firstToken) || /^ospf\b/i.test(trimmed)) {
    return "ospf";
  }

  return "unknown";
}

function parseDestination(line) {
  const cidr = line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b/);
  if (cidr) {
    return cidr[0];
  }

  const destination = line.match(/\b(?:network|route|destination)\s+((?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?)/i);
  return destination?.[1] ?? null;
}

function parseNextHop(line) {
  const via = line.match(/\bvia\s+((?:\d{1,3}\.){3}\d{1,3})\b/i);
  if (via) {
    return via[1];
  }

  const gateway = line.match(/\b(?:gateway|nexthop|next-hop)\s+(?:address\s+)?((?:\d{1,3}\.){3}\d{1,3})\b/i);
  if (gateway) {
    return gateway[1];
  }

  const addresses = line.match(new RegExp(IPV4_REGEX.source, "g")) ?? [];
  return addresses.length > 1 ? addresses[1] : null;
}

export function parseRouteSummary(output) {
  return stripAnsi(output)
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter((line) => {
      if (!line) {
        return false;
      }

      return !/^(codes|legend|destination|kernel|flags|proto|protocol|default gateway|routing table|total|type)\b/i.test(line);
    })
    .filter((line) => /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|default/i.test(line))
    .map((line) => ({
      raw: line,
      key: line.toLowerCase(),
      type: routeTypeFromLine(line),
      destination: parseDestination(line),
      nextHop: parseNextHop(line)
    }));
}

function diffRoutes(activeRoutes, standbyRoutes) {
  const activeKeys = new Set(activeRoutes.map((route) => route.key));
  const standbyKeys = new Set(standbyRoutes.map((route) => route.key));

  return {
    missingOnStandby: activeRoutes.filter((route) => !standbyKeys.has(route.key)),
    extraOnStandby: standbyRoutes.filter((route) => !activeKeys.has(route.key))
  };
}

function commandForMissingRoute(route) {
  if (route.type !== "static" || !route.destination || !route.nextHop) {
    return null;
  }

  return {
    action: "add",
    route: route.raw,
    clishCommand: `set static-route ${route.destination} nexthop gateway address ${route.nextHop} on`,
    description: `Adicionar rota estática ${route.destination} via ${route.nextHop} no standby.`
  };
}

function commandForExtraRoute(route) {
  if (route.type !== "static" || !route.destination || !route.nextHop) {
    return null;
  }

  return {
    action: "delete",
    route: route.raw,
    clishCommand: `delete static-route ${route.destination} nexthop gateway address ${route.nextHop}`,
    description: `Remover rota estática ${route.destination} via ${route.nextHop} do standby.`
  };
}

function buildCorrectionPlan(diff) {
  const addCommands = diff.missingOnStandby.map(commandForMissingRoute).filter(Boolean);
  const deleteCommands = diff.extraOnStandby.map(commandForExtraRoute).filter(Boolean);
  const executableCommands = [...addCommands, ...deleteCommands];
  const executableRoutes = new Set(executableCommands.map((item) => item.route));
  const manualChanges = [...diff.missingOnStandby, ...diff.extraOnStandby]
    .filter((route) => !executableRoutes.has(route.raw))
    .map((route) => ({
      route: route.raw,
      reason: "Diferença não convertida automaticamente. Validar manualmente antes de alterar."
    }));

  return {
    executableCommands,
    manualChanges,
    canApply: executableCommands.length > 0,
    saveCommand: executableCommands.length > 0 ? "save config" : null
  };
}

function publicFirewall(firewall) {
  return {
    hostname: firewall.hostname,
    gatewayIp: firewall.gatewayIp,
    port: firewall.port,
    username: firewall.username
  };
}

async function collectFirewallRouting(firewall, shared, timeouts, routeSummaryCommand) {
  const credentials = normalizeCredentials(firewall, shared);
  const ssh = await connect(credentials, timeouts);

  try {
    const cluster = await execFallback(ssh, ["cphaprob stat", "cphapro stat"], timeouts);
    const routeSummary = await execFallback(
      ssh,
      [routeSummaryCommand, clish("show route summary"), "show route summary"],
      timeouts
    );
    const role = parseClusterRole(cluster.stdout || cluster.stderr);
    const routes = parseRouteSummary(routeSummary.stdout);

    return {
      credentials,
      publicTarget: publicFirewall(credentials),
      role,
      routes,
      routeCount: routes.length,
      commands: {
        cluster,
        routeSummary
      }
    };
  } finally {
    ssh.dispose();
  }
}

function determinePair(first, second) {
  if (first.role === "active" && second.role === "standby") {
    return { active: first, standby: second, status: "ready", message: "Caixa ativa e standby identificadas." };
  }

  if (second.role === "active" && first.role === "standby") {
    return { active: second, standby: first, status: "ready", message: "Caixa ativa e standby identificadas." };
  }

  if (first.role === "active" && second.role !== "active") {
    return { active: first, standby: second, status: "blocked", message: "Ativa identificada, mas a outra caixa não está como standby." };
  }

  if (second.role === "active" && first.role !== "active") {
    return { active: second, standby: first, status: "blocked", message: "Ativa identificada, mas a outra caixa não está como standby." };
  }

  return {
    active: first,
    standby: second,
    status: "blocked",
    message: "Não foi possível identificar claramente uma caixa active e outra standby."
  };
}

export async function createRoutingPreview(payload, options) {
  const routeSummaryCommand = options.routeSummaryCommand || clish("show route summary");
  const startedAt = new Date();
  const [first, second] = await Promise.all([
    collectFirewallRouting(payload.firewalls[0], payload.sharedCredentials, options, routeSummaryCommand),
    collectFirewallRouting(payload.firewalls[1], payload.sharedCredentials, options, routeSummaryCommand)
  ]);

  const pair = determinePair(first, second);
  const diff = diffRoutes(pair.active.routes, pair.standby.routes);
  const correctionPlan = pair.status === "ready" ? buildCorrectionPlan(diff) : { executableCommands: [], manualChanges: [], canApply: false, saveCommand: null };
  const finishedAt = new Date();
  const status = pair.status !== "ready" ? "blocked" : diff.missingOnStandby.length || diff.extraOnStandby.length ? "different" : "synced";

  const preview = {
    id: randomUUID(),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    status,
    message: status === "synced" ? "Roteamento das caixas está sincronizado." : pair.message,
    active: {
      target: pair.active.publicTarget,
      role: pair.active.role,
      routeCount: pair.active.routeCount
    },
    standby: {
      target: pair.standby.publicTarget,
      role: pair.standby.role,
      routeCount: pair.standby.routeCount
    },
    firewalls: [
      {
        target: first.publicTarget,
        role: first.role,
        routeCount: first.routeCount,
        commands: first.commands
      },
      {
        target: second.publicTarget,
        role: second.role,
        routeCount: second.routeCount,
        commands: second.commands
      }
    ],
    diff: {
      missingOnStandby: diff.missingOnStandby,
      extraOnStandby: diff.extraOnStandby
    },
    correctionPlan
  };

  if (correctionPlan.canApply) {
    pendingRoutingPlans.set(preview.id, {
      createdAt: Date.now(),
      activeCredentials: pair.active.credentials,
      standbyCredentials: pair.standby.credentials,
      preview
    });
  }

  return preview;
}

export async function applyRoutingPlan(previewId, options) {
  const pending = pendingRoutingPlans.get(previewId);
  if (!pending) {
    throw new Error("Plano não encontrado ou expirado. Gere uma nova validação antes de corrigir.");
  }

  const maxAgeMs = Number(options.planTtlMs ?? 10 * 60 * 1000);
  if (Date.now() - pending.createdAt > maxAgeMs) {
    pendingRoutingPlans.delete(previewId);
    throw new Error("Plano expirado. Gere uma nova validação antes de corrigir.");
  }

  const ssh = await connect(pending.standbyCredentials, options);

  try {
    const cluster = await execFallback(ssh, ["cphaprob stat", "cphapro stat"], options);
    const currentRole = parseClusterRole(cluster.stdout || cluster.stderr);
    if (currentRole !== "standby") {
      throw new Error(`Correção bloqueada: a caixa alvo não está como standby no momento (${currentRole}).`);
    }

    const commandResults = [];
    for (const item of pending.preview.correctionPlan.executableCommands) {
      commandResults.push({
        ...item,
        result: await execCommand(ssh, clish(item.clishCommand), options)
      });
    }

    if (pending.preview.correctionPlan.saveCommand) {
      commandResults.push({
        action: "save",
        route: null,
        clishCommand: pending.preview.correctionPlan.saveCommand,
        description: "Salvar configuração no Gaia.",
        result: await execCommand(ssh, clish(pending.preview.correctionPlan.saveCommand), options)
      });
    }

    pendingRoutingPlans.delete(previewId);

    return {
      id: previewId,
      appliedAt: new Date().toISOString(),
      target: pending.preview.standby.target,
      commandResults,
      message: "Correção executada no standby. Recomenda-se rodar a validação novamente para confirmar sincronismo."
    };
  } finally {
    ssh.dispose();
  }
}
