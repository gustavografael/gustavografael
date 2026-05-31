import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const agentUrl = "http://127.0.0.1:3737";
const uiUrl = "http://localhost:5173";

function run(command, args, label) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${label}] encerrou com código ${code}`);
    }
  });

  return child;
}

async function waitFor(url, attempts = 30) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.ok) {
        return true;
      }
    } catch {
      // retry
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

if (!existsSync(join(root, "node_modules"))) {
  console.log("Instalando dependências...");
  await new Promise((resolve, reject) => {
    const install = run("npm", ["install"], "install");
    install.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("npm install falhou"))));
  });
}

console.log("Iniciando NetGuardian Local Agent + UI...");
console.log(`  Agente: ${agentUrl}`);
console.log(`  UI:     ${uiUrl}`);
console.log("");

const agent = run("npm", ["run", "agent", "-w", "backend"], "agent");
const ui = run("npm", ["run", "dev", "-w", "frontend"], "ui");

const ready = await Promise.all([waitFor(`${agentUrl}/api/status`), waitFor(uiUrl)]);

console.log("");
if (ready[0]) {
  console.log(`✓ Agente local: ${agentUrl}`);
} else {
  console.log(`✗ Agente local não respondeu em ${agentUrl}`);
}

if (ready[1]) {
  console.log(`✓ Interface web: ${uiUrl}`);
  console.log("");
  console.log(`Abra no navegador: ${uiUrl}`);
} else {
  console.log(`✗ Interface web não respondeu em ${uiUrl}`);
  console.log("Verifique se a porta 5173 está livre.");
}

function shutdown() {
  agent.kill("SIGTERM");
  ui.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
