const agentUrl = (process.env.LOCAL_AGENT_URL ?? "http://127.0.0.1:3737").replace(/\/$/, "");
const uiOrigin = process.env.LOCAL_UI_ORIGIN ?? "http://localhost:5173";

const checks = [];

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    checks.push({ name, ok: false, error: error.message });
    console.error(`✗ ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

await check("GET /api/status", async () => {
  const response = await fetch(`${agentUrl}/api/status`);
  assert(response.ok, `HTTP ${response.status}`);

  const payload = await response.json();
  assert(payload.ok === true, "payload.ok !== true");
  assert(payload.mode === "local-agent", `mode=${payload.mode}`);
  assert(payload.service === "netguardian-local-agent", `service=${payload.service}`);
});

await check("CORS preflight (localhost UI)", async () => {
  const response = await fetch(`${agentUrl}/api/status`, {
    method: "OPTIONS",
    headers: {
      Origin: uiOrigin,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Private-Network": "true"
    }
  });

  assert(response.status === 204, `HTTP ${response.status}`);
  assert(
    response.headers.get("access-control-allow-private-network") === "true",
    "missing Access-Control-Allow-Private-Network"
  );
  assert(
    response.headers.get("access-control-allow-origin") === uiOrigin,
    `allow-origin=${response.headers.get("access-control-allow-origin")}`
  );
});

await check("CORS preflight (GitHub Pages UI)", async () => {
  const pagesOrigin = "https://gustavografael.github.io";
  const response = await fetch(`${agentUrl}/api/status`, {
    method: "OPTIONS",
    headers: {
      Origin: pagesOrigin,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Private-Network": "true"
    }
  });

  assert(response.status === 204, `HTTP ${response.status}`);
  assert(
    response.headers.get("access-control-allow-origin") === pagesOrigin,
    `allow-origin=${response.headers.get("access-control-allow-origin")}`
  );
});

await check("GET /api/history", async () => {
  const response = await fetch(`${agentUrl}/api/history`);
  assert(response.ok, `HTTP ${response.status}`);
  const payload = await response.json();
  assert(Array.isArray(payload), "history is not an array");
});

await check("POST /api/health-check validation", async () => {
  const response = await fetch(`${agentUrl}/api/health-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });

  assert(response.status === 400, `expected 400, got ${response.status}`);
  const payload = await response.json();
  assert(payload.error, "missing validation error");
});

const failed = checks.filter((item) => !item.ok);

console.log("");
if (failed.length === 0) {
  console.log(`All ${checks.length} local agent checks passed (${agentUrl}).`);
  process.exit(0);
}

console.error(`${failed.length}/${checks.length} checks failed.`);
console.error("Start the agent with: npm run agent");
process.exit(1);
