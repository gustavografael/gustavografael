import "dotenv/config";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { NodeSSH } from "node-ssh";
import { z } from "zod";
import { CHECKPOINT_COMMANDS } from "./checkpointCommands.js";
import { getRunById, readHistory, saveRun } from "./historyStore.js";
import { parseCheckpointResults } from "./parsers.js";
import { formatMarkdownReport } from "./reportFormatter.js";
import { applyRoutingPlan, createRoutingPreview } from "./routingValidator.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const historyLimit = Number(process.env.HISTORY_LIMIT ?? 25);
const sshConnectTimeoutMs = Number(process.env.SSH_CONNECT_TIMEOUT_MS ?? 15000);
const sshCommandTimeoutMs = Number(process.env.SSH_COMMAND_TIMEOUT_MS ?? 30000);
const routingPlanTtlMs = Number(process.env.ROUTING_PLAN_TTL_MS ?? 10 * 60 * 1000);
const routeSummaryCommand = process.env.ROUTING_SUMMARY_COMMAND;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const healthCheckSchema = z
  .object({
    hostname: z.string().trim().min(1, "Informe o hostname."),
    gatewayIp: z.string().trim().min(1, "Informe o IP do gateway."),
    port: z.coerce.number().int().min(1).max(65535).default(22),
    username: z.string().trim().min(1, "Informe o usuário SSH."),
    password: z.string().optional(),
    privateKey: z.string().optional(),
    passphrase: z.string().optional()
  })
  .refine((value) => Boolean(value.password || value.privateKey), {
    message: "Informe senha SSH ou chave privada.",
    path: ["password"]
  });

const sharedRoutingCredentialsSchema = z
  .object({
    port: z.coerce.number().int().min(1).max(65535).default(22),
    username: z.string().trim().min(1, "Informe o usuário SSH."),
    password: z.string().optional(),
    privateKey: z.string().optional(),
    passphrase: z.string().optional()
  })
  .refine((value) => Boolean(value.password || value.privateKey), {
    message: "Informe senha SSH ou chave privada.",
    path: ["password"]
  });

const routingFirewallSchema = z.object({
  hostname: z.string().trim().min(1, "Informe o hostname."),
  gatewayIp: z.string().trim().min(1, "Informe o IP do gateway."),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  username: z.string().trim().optional(),
  password: z.string().optional(),
  privateKey: z.string().optional(),
  passphrase: z.string().optional()
});

const routingPreviewSchema = z.object({
  sharedCredentials: sharedRoutingCredentialsSchema,
  firewalls: z.array(routingFirewallSchema).length(2, "Informe exatamente duas caixas do cluster.")
});

const routingApplySchema = z.object({
  previewId: z.string().trim().min(1, "Informe o previewId."),
  confirmation: z.literal("CONFIRMAR", {
    errorMap: () => ({ message: "Digite CONFIRMAR para aplicar a correção." })
  })
});

function publicRun(run) {
  return {
    id: run.id,
    target: run.target,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    durationMs: run.durationMs,
    overallStatus: run.overallStatus,
    sections: run.sections,
    recommendations: run.recommendations,
    commandCount: run.commandCount
  };
}

function summarizeRun(run) {
  return {
    id: run.id,
    target: run.target,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    durationMs: run.durationMs,
    overallStatus: run.overallStatus,
    recommendationCount: run.recommendations.length
  };
}

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} excedeu ${timeoutMs} ms.`)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function runCheckpointCommands(credentials) {
  const ssh = new NodeSSH();
  const resultsByCommand = {};

  await withTimeout(
    ssh.connect({
      host: credentials.gatewayIp,
      port: credentials.port,
      username: credentials.username,
      password: credentials.password || undefined,
      privateKey: credentials.privateKey || undefined,
      passphrase: credentials.passphrase || undefined,
      readyTimeout: sshConnectTimeoutMs,
      tryKeyboard: Boolean(credentials.password)
    }),
    sshConnectTimeoutMs + 1000,
    "Conexão SSH"
  );

  try {
    for (const definition of CHECKPOINT_COMMANDS) {
      const startedAt = new Date().toISOString();
      const command = `bash -lc ${JSON.stringify(definition.command)}`;

      try {
        const result = await withTimeout(
          ssh.execCommand(command, { execOptions: { pty: true } }),
          sshCommandTimeoutMs,
          `Comando ${definition.command}`
        );

        resultsByCommand[definition.id] = {
          ...definition,
          startedAt,
          finishedAt: new Date().toISOString(),
          stdout: result.stdout ?? "",
          stderr: result.stderr ?? "",
          code: result.code ?? 0,
          signal: result.signal ?? null
        };
      } catch (error) {
        resultsByCommand[definition.id] = {
          ...definition,
          startedAt,
          finishedAt: new Date().toISOString(),
          stdout: "",
          stderr: error.message,
          code: 1,
          signal: null
        };
      }
    }
  } finally {
    ssh.dispose();
  }

  return resultsByCommand;
}

app.get("/api/status", (_req, res) => {
  res.json({
    ok: true,
    service: "checkpoint-troubleshooting-backend",
    commandCount: CHECKPOINT_COMMANDS.length
  });
});

app.get("/api/commands", (_req, res) => {
  res.json(
    CHECKPOINT_COMMANDS.map(({ id, label, section, command }) => ({
      id,
      label,
      section,
      command
    }))
  );
});

app.get("/api/history", async (_req, res, next) => {
  try {
    const history = await readHistory();
    res.json(history.map(summarizeRun));
  } catch (error) {
    next(error);
  }
});

app.get("/api/history/:id", async (req, res, next) => {
  try {
    const run = await getRunById(req.params.id);
    if (!run) {
      return res.status(404).json({ error: "Execução não encontrada." });
    }

    return res.json(publicRun(run));
  } catch (error) {
    return next(error);
  }
});

app.post("/api/health-check", async (req, res, next) => {
  const parsed = healthCheckSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Dados inválidos.",
      details: parsed.error.flatten()
    });
  }

  const startedAt = new Date();
  const credentials = parsed.data;

  try {
    const resultsByCommand = await runCheckpointCommands(credentials);
    const parsedResults = parseCheckpointResults(resultsByCommand);
    const finishedAt = new Date();

    const run = {
      id: randomUUID(),
      target: {
        hostname: credentials.hostname,
        gatewayIp: credentials.gatewayIp,
        port: credentials.port,
        username: credentials.username
      },
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      commandCount: CHECKPOINT_COMMANDS.length,
      commands: resultsByCommand,
      ...parsedResults
    };

    await saveRun(run, historyLimit);
    return res.json(publicRun(run));
  } catch (error) {
    return next(error);
  }
});

app.post("/api/routing/preview", async (req, res, next) => {
  const parsed = routingPreviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Dados inválidos.",
      details: parsed.error.flatten()
    });
  }

  try {
    const preview = await createRoutingPreview(parsed.data, {
      connectTimeoutMs: sshConnectTimeoutMs,
      commandTimeoutMs: sshCommandTimeoutMs,
      routeSummaryCommand
    });
    return res.json(preview);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/routing/apply", async (req, res, next) => {
  const parsed = routingApplySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Confirmação inválida.",
      details: parsed.error.flatten()
    });
  }

  try {
    const result = await applyRoutingPlan(parsed.data.previewId, {
      connectTimeoutMs: sshConnectTimeoutMs,
      commandTimeoutMs: sshCommandTimeoutMs,
      planTtlMs: routingPlanTtlMs
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

app.get("/api/reports/:id/export", async (req, res, next) => {
  try {
    const run = await getRunById(req.params.id);
    if (!run) {
      return res.status(404).json({ error: "Execução não encontrada." });
    }

    const report = formatMarkdownReport(run);
    const safeHostname = run.target.hostname.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();

    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="checkpoint-${safeHostname}-${run.id}.md"`);
    return res.send(report);
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = /authentication|permission denied/i.test(error.message) ? 401 : 500;
  res.status(status).json({
    error: "Falha ao executar troubleshooting.",
    message: error.message
  });
});

app.listen(port, () => {
  console.log(`Checkpoint troubleshooting backend listening on port ${port}`);
});
