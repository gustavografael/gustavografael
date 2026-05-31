const configuredApiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const configuredAgentUrl = (import.meta.env.VITE_LOCAL_AGENT_URL ?? "").replace(/\/$/, "");

const LOCAL_AGENT_CANDIDATES = [
  configuredAgentUrl,
  "http://127.0.0.1:3737",
  "http://localhost:3737"
].filter(Boolean);

let resolvedApiBase = configuredApiBase;
let agentStatus = null;
let probePromise = null;

async function probeAgentUrl(baseUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(`${baseUrl}/api/status`, {
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    if (!payload.ok) {
      return null;
    }

    if (payload.mode === "local-agent" || payload.service === "netguardian-local-agent") {
      return payload;
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function ensureApiConnection() {
  if (resolvedApiBase) {
    return resolvedApiBase;
  }

  if (!probePromise) {
    probePromise = (async () => {
      for (const candidate of LOCAL_AGENT_CANDIDATES) {
        const status = await probeAgentUrl(candidate);
        if (status) {
          resolvedApiBase = candidate;
          agentStatus = status;
          return candidate;
        }
      }

      if (import.meta.env.DEV) {
        resolvedApiBase = "";
        return "";
      }

      return "";
    })();
  }

  return probePromise;
}

export function getAgentStatus() {
  return agentStatus;
}

export function getResolvedApiBase() {
  return resolvedApiBase;
}

export async function refreshLocalAgent() {
  resolvedApiBase = configuredApiBase;
  agentStatus = null;
  probePromise = null;
  return ensureApiConnection();
}

export async function buildApiUrl(path) {
  const base = await ensureApiConnection();
  return `${base}${path}`;
}
