import { attachKnownIssue } from "./checkpointKnowledgeBase.js";

const SECTION_DEFINITIONS = {
  cpu: "CPU",
  memory: "Memória",
  load: "Load Average",
  interfaces: "Interfaces",
  interfaceErrors: "RX/TX Errors",
  corexl: "CoreXL",
  securexl: "SecureXL",
  disk: "Disco",
  cluster: "Cluster",
  logs: "Logs críticos",
  coredumps: "Core Dumps",
  hardware: "Hardware",
  sessions: "Sessões/conexões"
};

const SEVERITY_SCORE = {
  healthy: 0,
  warning: 1,
  critical: 2,
  unknown: 0
};

const SCORE_SEVERITY = ["healthy", "warning", "critical"];

function normalizeOutput(result) {
  const stdout = result?.stdout?.trim() ?? "";
  const stderr = result?.stderr?.trim() ?? "";
  return [stdout, stderr].filter(Boolean).join("\n").trim();
}

function lineCount(value) {
  if (!value?.trim()) {
    return 0;
  }

  return value.trim().split(/\r?\n/).filter(Boolean).length;
}

function getOutput(resultsByCommand, id) {
  return normalizeOutput(resultsByCommand[id]);
}

function setStatus(current, next) {
  return SEVERITY_SCORE[next] > SEVERITY_SCORE[current] ? next : current;
}

function section(id, rawOutputs, parser) {
  const parsed = parser(rawOutputs);
  const recommendations = parsed.recommendations ?? [];

  return {
    id,
    title: SECTION_DEFINITIONS[id],
    status: parsed.status,
    summary: parsed.summary,
    metrics: parsed.metrics ?? [],
    recommendations,
    rawOutputs
  };
}

function metric(label, value, status = "healthy") {
  return { label, value, status };
}

function parsePercent(value) {
  const match = String(value).match(/(\d+(?:[.,]\d+)?)\s*%?/);
  return match ? Number(match[1].replace(",", ".")) : null;
}

function parseTopCpu(topOutput) {
  const cpuLine = topOutput.split(/\r?\n/).find((line) => /%?Cpu\(s\)|^Cpu\(s\)|^%Cpu/.test(line));
  if (!cpuLine) {
    return null;
  }

  const idleMatch = cpuLine.match(/(\d+(?:[.,]\d+)?)\s*(?:id|idle)/i);
  if (idleMatch) {
    return Math.max(0, 100 - Number(idleMatch[1].replace(",", ".")));
  }

  const usedMatches = [...cpuLine.matchAll(/(\d+(?:[.,]\d+)?)\s*(us|sy|ni|hi|si|st)/gi)];
  if (!usedMatches.length) {
    return null;
  }

  return usedMatches.reduce((sum, match) => sum + Number(match[1].replace(",", ".")), 0);
}

function parseMpstat(mpstatOutput) {
  const averageRows = mpstatOutput
    .split(/\r?\n/)
    .filter((line) => /^Average:/i.test(line) && !/\bCPU\b/i.test(line));

  const rows = averageRows.length
    ? averageRows
    : mpstatOutput.split(/\r?\n/).filter((line) => /\s(all|\d+)\s+/.test(line) && /\d/.test(line));

  const cpuRows = rows
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 10);

  const allRow = cpuRows.find((parts) => parts[1] === "all" || parts[2] === "all") ?? cpuRows[0];
  const perCoreRows = cpuRows.filter((parts) => /^\d+$/.test(parts[1]) || /^\d+$/.test(parts[2]));
  const idleRaw = allRow ? Number(allRow[allRow.length - 1]?.replace(",", ".")) : null;
  const avgUsage = Number.isFinite(idleRaw) ? Math.max(0, 100 - idleRaw) : null;

  return {
    avgUsage,
    coreCount: perCoreRows.length,
    perCoreUsages: perCoreRows
      .map((parts) => {
        const cpu = /^\d+$/.test(parts[1]) ? parts[1] : parts[2];
        const idle = Number(parts[parts.length - 1]?.replace(",", "."));
        return Number.isFinite(idle) ? { cpu, usage: Math.max(0, 100 - idle) } : null;
      })
      .filter(Boolean)
  };
}

function parseMemory(freeOutput) {
  const memLine = freeOutput.split(/\r?\n/).find((line) => /^Mem:/i.test(line));
  if (!memLine) {
    return null;
  }

  const parts = memLine.trim().split(/\s+/).map((part) => Number(part));
  const [, total, used, free, shared, buffCache, available] = parts;
  const effectiveAvailable = Number.isFinite(available) ? available : free + buffCache;
  const usedPct = total > 0 ? ((total - effectiveAvailable) / total) * 100 : null;

  return {
    total,
    used,
    free,
    shared,
    buffCache,
    available: effectiveAvailable,
    usedPct
  };
}

function parseLoad(loadOutput) {
  const parts = loadOutput.trim().split(/\s+/);
  const load1 = Number(parts[0]);
  const load5 = Number(parts[1]);
  const load15 = Number(parts[2]);

  if (![load1, load5, load15].every(Number.isFinite)) {
    return null;
  }

  return { load1, load5, load15 };
}

function parseNetstatErrors(netstatOutput) {
  return netstatOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^Kernel|^Iface|^Name|^Table/i.test(line))
    .map((line) => {
      const parts = line.split(/\s+/);
      const iface = parts[0];
      const values = parts.slice(1).map((part) => Number(part));
      const rxErrors = values[3] ?? 0;
      const rxDropped = values[4] ?? 0;
      const txErrors = values[7] ?? 0;
      const txDropped = values[8] ?? 0;
      return { iface, rxErrors, rxDropped, txErrors, txDropped };
    })
    .filter((item) => item.iface && !Number.isNaN(item.rxErrors));
}

function parseIfconfigErrors(ifconfigOutput) {
  const blocks = ifconfigOutput.split(/\n(?=\S)/);

  return blocks
    .map((block) => {
      const iface = block.match(/^([^\s:]+)/)?.[1];
      if (!iface) {
        return null;
      }

      const rxLine = block.match(/RX packets.*(?:errors|errs)[\s:]+(\d+).*?(?:dropped|drop)[\s:]+(\d+)/is);
      const txLine = block.match(/TX packets.*(?:errors|errs)[\s:]+(\d+).*?(?:dropped|drop)[\s:]+(\d+)/is);
      const legacyRxLine = block.match(/RX errors\s+(\d+)\s+dropped\s+(\d+)/i);
      const legacyTxLine = block.match(/TX errors\s+(\d+)\s+dropped\s+(\d+)/i);

      return {
        iface,
        rxErrors: Number(rxLine?.[1] ?? legacyRxLine?.[1] ?? 0),
        rxDropped: Number(rxLine?.[2] ?? legacyRxLine?.[2] ?? 0),
        txErrors: Number(txLine?.[1] ?? legacyTxLine?.[1] ?? 0),
        txDropped: Number(txLine?.[2] ?? legacyTxLine?.[2] ?? 0)
      };
    })
    .filter(Boolean);
}

function parseDisk(dfOutput) {
  return dfOutput
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 6)
    .map((parts) => ({
      filesystem: parts[0],
      size: parts[1],
      used: parts[2],
      available: parts[3],
      usagePct: parsePercent(parts[4]),
      mount: parts.slice(5).join(" ")
    }))
    .filter((item) => item.usagePct !== null);
}

function parseConnections(output) {
  const line = output.split(/\r?\n/).find((item) => /connections/i.test(item) || /\bentries\b/i.test(item));
  const number = line?.match(/(\d+)/)?.[1];
  return number ? Number(number) : null;
}

function parseThroughputMbps(output) {
  const units = {
    kbps: 1 / 1000,
    "kbit/s": 1 / 1000,
    mbps: 1,
    "mbit/s": 1,
    gbps: 1000,
    "gbit/s": 1000
  };

  const matches = [...output.matchAll(/(\d+(?:[.,]\d+)?)\s*(gbps|gbit\/s|mbps|mbit\/s|kbps|kbit\/s)/gi)];
  const values = matches
    .map((match) => Number(match[1].replace(",", ".")) * units[match[2].toLowerCase()])
    .filter(Number.isFinite);

  return values.length ? Math.max(...values) : null;
}

function parseCoreXl(corexlOutput) {
  const rows = corexlOutput
    .split(/\r?\n/)
    .filter((line) => /^\s*\d+\s+/.test(line))
    .map((line) => line.trim().split(/\s+/));

  const values = rows
    .map((parts) => parts.map((part) => Number(part)).filter(Number.isFinite).at(-1))
    .filter((value) => Number.isFinite(value));

  if (values.length < 2) {
    return { workerCount: rows.length, imbalancePct: null };
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    workerCount: rows.length,
    imbalancePct: avg > 0 ? ((max - min) / avg) * 100 : 0
  };
}

function buildOutputMap(resultsByCommand, ids) {
  return ids.reduce((acc, id) => {
    acc[id] = getOutput(resultsByCommand, id);
    return acc;
  }, {});
}

function diagnostic({ id, title, severity, summary, evidence, interpretation, recommendation, confidence = "alta" }) {
  return { id, title, severity, summary, evidence, interpretation, recommendation, confidence };
}

function buildHealthSignals(resultsByCommand) {
  const topOutput = getOutput(resultsByCommand, "top");
  const mpstatOutput = getOutput(resultsByCommand, "mpstat");
  const netstatOutput = getOutput(resultsByCommand, "netstat");
  const ifconfigOutput = getOutput(resultsByCommand, "ifconfig");
  const secureXlOutput = getOutput(resultsByCommand, "securexlStat");
  const coreXlOutput = getOutput(resultsByCommand, "corexlStat");
  const diskOutput = getOutput(resultsByCommand, "disk");
  const cpviewOutput = getOutput(resultsByCommand, "cpview");
  const fwPstatOutput = getOutput(resultsByCommand, "fwPstat");
  const connectionsOutput = getOutput(resultsByCommand, "connections");

  const mpstat = parseMpstat(mpstatOutput);
  const cpuUsage = mpstat.avgUsage ?? parseTopCpu(topOutput);
  const interfaceRows = [...parseNetstatErrors(netstatOutput), ...parseIfconfigErrors(ifconfigOutput)];
  const interfacesWithDrops = interfaceRows
    .map((item) => ({
      ...item,
      totalDrops: item.rxDropped + item.txDropped,
      totalErrors: item.rxErrors + item.txErrors,
      totalIssues: item.rxErrors + item.rxDropped + item.txErrors + item.txDropped
    }))
    .filter((item) => item.totalIssues > 0);
  const worstInterface = interfacesWithDrops.reduce((max, item) => (item.totalIssues > (max?.totalIssues ?? -1) ? item : max), null);
  const secureXlDisabled = /disabled|off/i.test(secureXlOutput) && !/enabled|on|running/i.test(secureXlOutput);
  const coreXl = parseCoreXl(coreXlOutput);
  const disks = parseDisk(diskOutput);
  const maxDisk = disks.reduce((max, item) => (item.usagePct > (max?.usagePct ?? -1) ? item : max), null);
  const throughputMbps = parseThroughputMbps(`${cpviewOutput}\n${fwPstatOutput}`);
  const connections = parseConnections(connectionsOutput);
  const tableSaturation = /table.*full|failed.*alloc|out of memory|drop/i.test(fwPstatOutput);

  return {
    cpuUsage,
    interfacesWithDrops,
    worstInterface,
    secureXlDisabled,
    coreXlImbalancePct: coreXl.imbalancePct,
    maxDisk,
    throughputMbps,
    connections,
    tableSaturation
  };
}

function buildIntelligentDiagnostics(resultsByCommand) {
  const signals = buildHealthSignals(resultsByCommand);
  const diagnostics = [];
  const cpuHigh = signals.cpuUsage !== null && signals.cpuUsage >= 85;
  const cpuCritical = signals.cpuUsage !== null && signals.cpuUsage >= 90;
  const hasDrops = signals.interfacesWithDrops.length > 0;
  const throughputHigh = signals.throughputMbps !== null ? signals.throughputMbps >= 500 : (signals.connections ?? 0) >= 100000;

  if (hasDrops && cpuHigh) {
    diagnostics.push(
      attachKnownIssue(
        diagnostic({
          id: "rx-drops-cpu-saturation",
          title: "Possível saturação do gateway",
          severity: cpuCritical || (signals.worstInterface?.totalIssues ?? 0) > 100 ? "critical" : "warning",
          summary: "RX/TX drops ou errors aparecem junto com CPU alta.",
          evidence: [
            `CPU estimada: ${signals.cpuUsage.toFixed(1)}%`,
            `Interface mais afetada: ${signals.worstInterface.iface} (${signals.worstInterface.totalIssues} drops/errors)`,
            `${signals.interfacesWithDrops.length} interface(s) com drops/errors`
          ],
          interpretation:
            "Quando drops de interface coincidem com CPU alta, o firewall pode estar saturado e descartando pacotes por pressão de processamento, fila, ring buffer ou SND.",
          recommendation:
            "Validar throughput por interface, top talkers, sar -n EDEV, ethtool -S, Multi-Queue, CoreXL/SecureXL e capacidade do appliance."
        }),
        "loadBasedRxDrops"
      )
    );
  }

  if (signals.secureXlDisabled && throughputHigh) {
    diagnostics.push(
      attachKnownIssue(
        diagnostic({
          id: "securexl-off-throughput",
          title: "Gargalo por processamento em software",
          severity: signals.throughputMbps !== null && signals.throughputMbps >= 1000 ? "critical" : "warning",
          summary: "SecureXL está OFF/inativo enquanto há indício de tráfego alto.",
          evidence: [
            "SecureXL: OFF/inativo",
            signals.throughputMbps !== null
              ? `Throughput detectado: ${signals.throughputMbps.toFixed(1)} Mbps`
              : `Conexões reportadas: ${(signals.connections ?? 0).toLocaleString("pt-BR")}`
          ],
          interpretation:
            "Sem aceleração SecureXL, mais tráfego pode passar pelo caminho de software/slow path, aumentando risco de gargalo de CPU.",
          recommendation:
            "Verificar motivo do SecureXL estar desabilitado, templates/acceleration, blades que impedem aceleração e impacto de regras."
        }),
        "secureXlSoftwarePath"
      )
    );
  }

  if (signals.coreXlImbalancePct !== null && signals.coreXlImbalancePct > 80) {
    diagnostics.push(
      attachKnownIssue(
        diagnostic({
          id: "corexl-worker-imbalance",
          title: "CoreXL imbalance",
          severity: "warning",
          summary: "Workers CoreXL aparentam estar desbalanceados.",
          evidence: [`Desbalanceamento estimado: ${signals.coreXlImbalancePct.toFixed(1)}%`],
          interpretation:
            "Um ou poucos workers/SNDs podem estar recebendo carga desproporcional, causando latência ou CPU alta mesmo com cores livres.",
          recommendation:
            "Validar elephant flows, afinidade, distribuição de SND/worker, SecureXL templates, Multi-Queue e balanceamento de interfaces."
        }),
        "coreXlMultiQueueImbalance"
      )
    );
  }

  if (signals.maxDisk && signals.maxDisk.usagePct >= 85) {
    diagnostics.push(
      attachKnownIssue(
        diagnostic({
          id: "disk-logging-performance",
          title: "Risco de impacto em logging/performance",
          severity: signals.maxDisk.usagePct >= 90 ? "critical" : "warning",
          summary: "Filesystem com uso elevado pode afetar logs, dumps e processos do gateway.",
          evidence: [`${signals.maxDisk.mount}: ${signals.maxDisk.usagePct}% usado`, `Filesystem: ${signals.maxDisk.filesystem}`],
          interpretation: "Disco cheio tende a impactar escrita de logs, geração de dumps, upgrades, cpinfo e estabilidade de serviços.",
          recommendation: "Limpar/rotacionar logs, mover pacotes antigos, validar retenção e aumentar capacidade quando necessário."
        }),
        "diskLoggingPressure"
      )
    );
  }

  if (signals.tableSaturation) {
    diagnostics.push(
      attachKnownIssue(
        diagnostic({
          id: "connections-table-pressure",
          title: "Pressão na tabela de conexões",
          severity: "critical",
          summary: "fw ctl pstat indica possível saturação, drops ou falhas de alocação.",
          evidence: ["Sinais de saturação encontrados em fw ctl pstat"],
          interpretation: "Falhas na tabela de conexões podem causar queda de sessões novas ou comportamento intermitente.",
          recommendation: "Validar limites de tabela, taxa de novas conexões, timeouts, possíveis ataques ou varreduras e sizing do gateway."
        }),
        "connectionTablePressure"
      )
    );
  }

  if (!diagnostics.length) {
    diagnostics.push(
      diagnostic({
        id: "no-critical-correlation",
        title: "Sem correlação crítica evidente",
        severity: "healthy",
        summary: "Nenhuma combinação crítica foi detectada entre CPU, drops, SecureXL, CoreXL e disco.",
        evidence: ["Os sinais avaliados não cruzaram os limiares de correlação."],
        interpretation: "A análise não encontrou um padrão composto de falha nos dados coletados.",
        recommendation: "Se houver sintoma reportado, correlacione horário, tráfego, logs e mudanças recentes."
      })
    );
  }

  return diagnostics;
}

export function parseCheckpointResults(resultsByCommand) {
  const sections = [
    section("cpu", buildOutputMap(resultsByCommand, ["top", "mpstat"]), (outputs) => {
      const topUsage = parseTopCpu(outputs.top);
      const mpstat = parseMpstat(outputs.mpstat);
      const cpuUsage = mpstat.avgUsage ?? topUsage;
      const status = cpuUsage === null ? "unknown" : cpuUsage >= 90 ? "critical" : cpuUsage >= 75 ? "warning" : "healthy";
      const recommendations = [];

      if (cpuUsage >= 90) {
        recommendations.push("CPU acima de 90%, possível gargalo.");
      } else if (cpuUsage >= 75) {
        recommendations.push("CPU elevada; valide processos ativos e política de inspeção.");
      }

      return {
        status,
        summary: cpuUsage === null ? "Não foi possível calcular o uso de CPU." : `Uso médio estimado em ${cpuUsage.toFixed(1)}%.`,
        metrics: [
          cpuUsage === null ? metric("Uso de CPU", "N/D", "unknown") : metric("Uso de CPU", `${cpuUsage.toFixed(1)}%`, status),
          metric("Cores detectados", mpstat.coreCount || "N/D", "healthy")
        ],
        recommendations
      };
    }),

    section("memory", buildOutputMap(resultsByCommand, ["free"]), (outputs) => {
      const memory = parseMemory(outputs.free);
      const status = !memory ? "unknown" : memory.usedPct >= 90 ? "critical" : memory.usedPct >= 80 ? "warning" : "healthy";
      const recommendations = [];

      if (memory?.usedPct >= 90) {
        recommendations.push("Memória acima de 90%; valide consumo de processos e pressão de swap.");
      } else if (memory?.usedPct >= 80) {
        recommendations.push("Memória em nível de atenção; monitore crescimento do consumo.");
      }

      return {
        status,
        summary: memory ? `Memória efetiva em uso: ${memory.usedPct.toFixed(1)}%.` : "Não foi possível calcular memória.",
        metrics: memory
          ? [
              metric("Total", `${memory.total} MB`),
              metric("Disponível", `${memory.available} MB`, status),
              metric("Uso efetivo", `${memory.usedPct.toFixed(1)}%`, status)
            ]
          : [metric("Memória", "N/D", "unknown")],
        recommendations
      };
    }),

    section("load", buildOutputMap(resultsByCommand, ["loadavg", "mpstat"]), (outputs) => {
      const load = parseLoad(outputs.loadavg);
      const coreCount = parseMpstat(outputs.mpstat).coreCount || 1;
      const status = !load ? "unknown" : load.load1 > coreCount * 1.5 ? "critical" : load.load1 > coreCount ? "warning" : "healthy";
      const recommendations = [];

      if (load?.load1 > coreCount * 1.5) {
        recommendations.push("Load average muito acima da quantidade de cores; investigue fila de CPU ou I/O.");
      } else if (load?.load1 > coreCount) {
        recommendations.push("Load average acima da quantidade de cores; acompanhe tendência.");
      }

      return {
        status,
        summary: load ? `Load 1/5/15 min: ${load.load1}, ${load.load5}, ${load.load15}.` : "Load average indisponível.",
        metrics: load
          ? [
              metric("Load 1 min", load.load1, status),
              metric("Load 5 min", load.load5),
              metric("Load 15 min", load.load15),
              metric("Cores base", coreCount)
            ]
          : [metric("Load", "N/D", "unknown")],
        recommendations
      };
    }),

    section("interfaces", buildOutputMap(resultsByCommand, ["netstat", "ifconfig"]), (outputs) => {
      const netstatRows = parseNetstatErrors(outputs.netstat);
      const ifconfigRows = parseIfconfigErrors(outputs.ifconfig);
      const interfaceCount = new Set([...netstatRows, ...ifconfigRows].map((item) => item.iface)).size;

      return {
        status: interfaceCount ? "healthy" : "unknown",
        summary: interfaceCount ? `${interfaceCount} interface(s) encontradas para análise.` : "Nenhuma interface foi identificada.",
        metrics: [metric("Interfaces detectadas", interfaceCount || "N/D", interfaceCount ? "healthy" : "unknown")],
        recommendations: []
      };
    }),

    section("interfaceErrors", buildOutputMap(resultsByCommand, ["netstat", "ifconfig"]), (outputs) => {
      const rows = [...parseNetstatErrors(outputs.netstat), ...parseIfconfigErrors(outputs.ifconfig)];
      const offenders = rows
        .map((item) => ({
          ...item,
          totalErrors: item.rxErrors + item.rxDropped + item.txErrors + item.txDropped
        }))
        .filter((item) => item.totalErrors > 0);

      const worst = offenders.reduce((max, item) => (item.totalErrors > (max?.totalErrors ?? -1) ? item : max), null);
      const status = !offenders.length ? (rows.length ? "healthy" : "unknown") : worst.totalErrors > 100 ? "critical" : "warning";
      const recommendations = offenders.map((item) => `Interface ${item.iface} possui RX/TX errors ou drops (${item.totalErrors}).`);

      return {
        status,
        summary: offenders.length ? `${offenders.length} interface(s) com erros ou drops.` : "Não foram encontrados RX/TX errors ou drops.",
        metrics: [
          metric("Interfaces com erro", offenders.length, status),
          worst ? metric("Pior interface", `${worst.iface} (${worst.totalErrors})`, status) : metric("Pior interface", "Nenhuma")
        ],
        recommendations
      };
    }),

    section("corexl", buildOutputMap(resultsByCommand, ["corexlStat", "affinity"]), (outputs) => {
      const corexl = parseCoreXl(outputs.corexlStat);
      const outputText = `${outputs.corexlStat}\n${outputs.affinity}`;
      let status = corexl.workerCount ? "healthy" : "unknown";
      const recommendations = [];

      if (/disabled|off|inactive/i.test(outputText)) {
        status = "warning";
        recommendations.push("CoreXL pode estar desabilitado ou inativo; valide configuração.");
      }

      if (corexl.imbalancePct !== null && corexl.imbalancePct > 80) {
        status = setStatus(status, "warning");
        recommendations.push("CoreXL desbalanceado; valide distribuição de workers, afinidade e elephant flows.");
      }

      return {
        status,
        summary: corexl.workerCount ? `${corexl.workerCount} worker(s) CoreXL detectados.` : "Informações de CoreXL indisponíveis.",
        metrics: [
          metric("Workers", corexl.workerCount || "N/D", status),
          metric("Desbalanceamento estimado", corexl.imbalancePct === null ? "N/D" : `${corexl.imbalancePct.toFixed(1)}%`, status)
        ],
        recommendations
      };
    }),

    section("securexl", buildOutputMap(resultsByCommand, ["securexlStat"]), (outputs) => {
      const enabled = /enabled|on|running/i.test(outputs.securexlStat) && !/disabled|off/i.test(outputs.securexlStat);
      const disabled = /disabled|off/i.test(outputs.securexlStat);
      const status = enabled ? "healthy" : disabled ? "warning" : "unknown";

      return {
        status,
        summary: enabled ? "SecureXL aparenta estar habilitado." : disabled ? "SecureXL aparenta estar desabilitado." : "Não foi possível determinar o status do SecureXL.",
        metrics: [metric("SecureXL", enabled ? "Ativo" : disabled ? "Inativo" : "N/D", status)],
        recommendations: disabled ? ["SecureXL desabilitado; valide se há motivo operacional ou limitação de aceleração."] : []
      };
    }),

    section("disk", buildOutputMap(resultsByCommand, ["disk", "iostat"]), (outputs) => {
      const disks = parseDisk(outputs.disk);
      const critical = disks.filter((item) => item.usagePct >= 90);
      const warning = disks.filter((item) => item.usagePct >= 85 && item.usagePct < 90);
      const status = critical.length ? "critical" : warning.length ? "warning" : disks.length ? "healthy" : "unknown";
      const recommendations = [
        ...critical.map((item) => `Disco ${item.mount} acima de 90% (${item.usagePct}%).`),
        ...warning.map((item) => `Disco ${item.mount} acima de 85% (${item.usagePct}%).`)
      ];

      return {
        status,
        summary: disks.length ? `${disks.length} filesystem(s) analisados.` : "Uso de disco indisponível.",
        metrics: [
          metric("Filesystems", disks.length || "N/D", disks.length ? "healthy" : "unknown"),
          metric("Acima de 85%", warning.length + critical.length, status),
          metric("Maior uso", disks.length ? `${Math.max(...disks.map((item) => item.usagePct))}%` : "N/D", status)
        ],
        recommendations
      };
    }),

    section("cluster", buildOutputMap(resultsByCommand, ["clusterStat", "clusterSync"]), (outputs) => {
      const text = `${outputs.clusterStat}\n${outputs.clusterSync}`;
      const hasCritical = /down|lost|problem|failed|not synchronized|collision/i.test(text);
      const hasClusterData = text.trim().length > 0;
      const status = hasCritical ? "critical" : hasClusterData ? "healthy" : "unknown";

      return {
        status,
        summary: hasCritical ? "Possível problema de cluster ou sincronismo." : hasClusterData ? "Cluster sem falhas óbvias nos comandos executados." : "Dados de cluster indisponíveis.",
        metrics: [metric("Estado do cluster", hasCritical ? "Atenção" : hasClusterData ? "OK" : "N/D", status)],
        recommendations: hasCritical ? ["Cluster ou sincronismo com indícios de falha; valide cphaprob stat e syncstat detalhadamente."] : []
      };
    }),

    section("logs", buildOutputMap(resultsByCommand, ["messageErrors", "messageFails"]), (outputs) => {
      const errorLines = lineCount(outputs.messageErrors);
      const failLines = lineCount(outputs.messageFails);
      const total = errorLines + failLines;
      const status = total > 30 ? "critical" : total > 0 ? "warning" : "healthy";

      return {
        status,
        summary: total ? `${total} linha(s) recentes com error/fail em /var/log/messages.` : "Sem ocorrências recentes de error/fail retornadas.",
        metrics: [
          metric("Linhas error", errorLines, errorLines ? status : "healthy"),
          metric("Linhas fail", failLines, failLines ? status : "healthy")
        ],
        recommendations: total ? ["Existem logs críticos recentes; correlacione horário dos eventos com sintomas reportados."] : []
      };
    }),

    section("coredumps", buildOutputMap(resultsByCommand, ["coreDumps"]), (outputs) => {
      const lines = outputs.coreDumps.split(/\r?\n/).filter((line) => line && !/^total\s+0$/i.test(line) && !/^total\s+\d+/i.test(line));
      const dumps = lines.filter((line) => !/No such file|cannot access/i.test(line));
      const status = dumps.length ? "warning" : "healthy";

      return {
        status,
        summary: dumps.length ? `${dumps.length} possível(is) core dump(s) encontrado(s).` : "Nenhum core dump encontrado em /var/log/dump/usermode/.",
        metrics: [metric("Core dumps", dumps.length, status)],
        recommendations: dumps.length ? ["Core dump encontrado; valide processo, timestamp e necessidade de TAC/SR."] : []
      };
    }),

    section("hardware", buildOutputMap(resultsByCommand, ["cpview", "sensors"]), (outputs) => {
      const text = `${outputs.cpview}\n${outputs.sensors}`;
      const critical = /critical|fail|failed|down|overheat|alarm/i.test(text);
      const warning = /warning|warn|degraded/i.test(text);
      const status = critical ? "critical" : warning ? "warning" : text.trim() ? "healthy" : "unknown";

      return {
        status,
        summary: critical ? "Sensores/hardware indicam falha crítica." : warning ? "Sensores/hardware indicam alerta." : text.trim() ? "Sem alerta óbvio de hardware." : "Dados de hardware indisponíveis.",
        metrics: [metric("Sensores", status === "healthy" ? "OK" : status === "unknown" ? "N/D" : "Atenção", status)],
        recommendations: status === "critical" || status === "warning" ? ["Hardware com alerta; verifique sensores, fontes, fans e temperatura."] : []
      };
    }),

    section("sessions", buildOutputMap(resultsByCommand, ["fwPstat", "connections"]), (outputs) => {
      const connections = parseConnections(outputs.connections);
      const tableFull = /table.*full|failed.*alloc|out of memory|drop/i.test(outputs.fwPstat);
      const status = tableFull ? "critical" : "healthy";

      return {
        status,
        summary: connections === null ? "Tabela de conexões analisada sem contagem clara." : `${connections.toLocaleString("pt-BR")} conexões reportadas.`,
        metrics: [
          metric("Conexões", connections === null ? "N/D" : connections.toLocaleString("pt-BR"), status),
          metric("Sinais de saturação", tableFull ? "Sim" : "Não", status)
        ],
        recommendations: tableFull ? ["Sessões/conexões com sinal de saturação; valide tabela connections e limites do gateway."] : []
      };
    })
  ];

  const overallScore = Math.max(...sections.map((item) => SEVERITY_SCORE[item.status] ?? 0));
  const recommendations = sections.flatMap((item) => item.recommendations.map((text) => ({ section: item.title, text })));
  const diagnostics = buildIntelligentDiagnostics(resultsByCommand);

  return {
    overallStatus: SCORE_SEVERITY[overallScore] ?? "unknown",
    sections,
    recommendations,
    diagnostics
  };
}
