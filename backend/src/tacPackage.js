import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { NodeSSH } from "node-ssh";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TAC_PACKAGE_DIR = path.resolve(__dirname, "../data/tac-packages");
const PACKAGE_INDEX = new Map();

function safeName(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function wrapForShell(command) {
  return `bash -lc ${JSON.stringify(command)}`;
}

function quote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function publicTarget(credentials) {
  return {
    hostname: credentials.hostname,
    gatewayIp: credentials.gatewayIp,
    port: credentials.port,
    username: credentials.username
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
      password: credentials.password || undefined,
      privateKey: credentials.privateKey || undefined,
      passphrase: credentials.passphrase || undefined,
      readyTimeout: timeouts.connectTimeoutMs,
      tryKeyboard: Boolean(credentials.password)
    }),
    timeouts.connectTimeoutMs + 1000,
    `Conexão SSH ${credentials.hostname}`
  );

  return ssh;
}

async function execCommand(ssh, command, timeouts, label = command) {
  const startedAt = new Date().toISOString();

  try {
    const result = await withTimeout(
      ssh.execCommand(wrapForShell(command), { execOptions: { pty: true } }),
      timeouts.commandTimeoutMs,
      `Comando ${label}`
    );

    return {
      label,
      command,
      startedAt,
      finishedAt: new Date().toISOString(),
      stdout: stripAnsi(result.stdout ?? "").trim(),
      stderr: stripAnsi(result.stderr ?? "").trim(),
      code: result.code ?? 0,
      ok: (result.code ?? 0) === 0
    };
  } catch (error) {
    return {
      label,
      command,
      startedAt,
      finishedAt: new Date().toISOString(),
      stdout: "",
      stderr: error.message,
      code: 1,
      ok: false
    };
  }
}

function commandWithFallback(commands) {
  return commands.map((command) => `(${command})`).join(" || ");
}

function buildRemoteCommands(remoteDir, remoteArchive, options) {
  const remoteDirQ = quote(remoteDir);
  const remoteArchiveQ = quote(remoteArchive);
  const logPaths = options.logPaths ?? "/var/log/messages* /var/log/secure* /var/log/audit* /var/log/dmesg*";
  const dumpPaths = options.dumpPaths ?? "/var/log/dump /var/log/dump/usermode";

  return [
    {
      label: "Preparar diretório TAC",
      command: `rm -rf ${remoteDirQ} ${remoteArchiveQ} && mkdir -p ${remoteDirQ}/logs ${remoteDirQ}/dumps ${remoteDirQ}/outputs`
    },
    {
      label: "Executar cpinfo",
      command: commandWithFallback([
        `cpinfo -z -o ${remoteDirQ}/cpinfo`,
        `cpinfo > ${remoteDirQ}/outputs/cpinfo.txt 2>&1`
      ])
    },
    {
      label: "Executar cpview export",
      command: commandWithFallback([
        `cpview export -f ${remoteDirQ}/cpview_export`,
        `cpview export > ${remoteDirQ}/outputs/cpview_export.txt 2>&1`
      ])
    },
    {
      label: "Coletar logs",
      command: `tar -chf ${remoteDirQ}/logs/logs.tar ${logPaths} 2> ${remoteDirQ}/outputs/logs-copy-warnings.txt || true`
    },
    {
      label: "Coletar dumps",
      command: `tar -chf ${remoteDirQ}/dumps/dumps.tar ${dumpPaths} 2> ${remoteDirQ}/outputs/dumps-copy-warnings.txt || true`
    },
    {
      label: "Gerar manifesto",
      command: `printf '%s\\n' 'NetGuardian TAC package' 'Generated at: '$(date -u +%Y-%m-%dT%H:%M:%SZ) 'Hostname: '$(hostname) > ${remoteDirQ}/manifest.txt && find ${remoteDirQ} -maxdepth 3 -type f -ls >> ${remoteDirQ}/manifest.txt`
    },
    {
      label: "Compactar tar.gz",
      command: `tar -czf ${remoteArchiveQ} -C ${quote(path.posix.dirname(remoteDir))} ${quote(path.posix.basename(remoteDir))}`
    },
    {
      label: "Validar pacote remoto",
      command: `ls -lh ${remoteArchiveQ}`
    }
  ];
}

function summarizeSteps(steps) {
  const failed = steps.filter((step) => !step.ok);
  if (!failed.length) {
    return { status: "ready", message: "Pacote TAC gerado e baixado com sucesso." };
  }

  const criticalFailed = failed.filter((step) => ["Preparar diretório TAC", "Compactar tar.gz", "Validar pacote remoto"].includes(step.label));
  if (criticalFailed.length) {
    return { status: "failed", message: "Falha em etapa crítica da geração do pacote TAC." };
  }

  return { status: "warning", message: "Pacote TAC gerado, mas uma ou mais coletas retornaram alerta." };
}

export async function generateTacPackage(credentials, options) {
  await mkdir(TAC_PACKAGE_DIR, { recursive: true });

  const id = randomUUID();
  const hostname = safeName(credentials.hostname || credentials.gatewayIp || "checkpoint");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const packageBase = `netguardian-tac-${hostname}-${timestamp}`;
  const remoteBaseDir = options.remoteBaseDir || "/var/log";
  const remoteDir = path.posix.join(remoteBaseDir, packageBase);
  const remoteArchive = `${remoteDir}.tar.gz`;
  const localPath = path.join(TAC_PACKAGE_DIR, `${packageBase}.tar.gz`);
  const startedAt = new Date();

  const ssh = await connect(credentials, options);
  const steps = [];

  try {
    const commands = buildRemoteCommands(remoteDir, remoteArchive, options);
    for (const item of commands) {
      const step = await execCommand(ssh, item.command, options, item.label);
      steps.push(step);

      if (!step.ok && ["Preparar diretório TAC", "Compactar tar.gz", "Validar pacote remoto"].includes(item.label)) {
        throw new Error(step.stderr || `Falha na etapa ${item.label}.`);
      }
    }

    await withTimeout(ssh.getFile(localPath, remoteArchive), options.downloadTimeoutMs, "Download do pacote TAC");
    const localStats = await stat(localPath);
    const cleanup = await execCommand(ssh, `rm -rf ${quote(remoteDir)} ${quote(remoteArchive)}`, options, "Limpar temporários remotos");
    steps.push(cleanup);

    const finishedAt = new Date();
    const summary = summarizeSteps(steps);
    const result = {
      id,
      ...summary,
      target: publicTarget(credentials),
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      fileName: path.basename(localPath),
      sizeBytes: localStats.size,
      remoteArchive,
      steps
    };

    PACKAGE_INDEX.set(id, { ...result, localPath });
    return result;
  } finally {
    ssh.dispose();
  }
}

export function getTacPackage(id) {
  return PACKAGE_INDEX.get(id) ?? null;
}
