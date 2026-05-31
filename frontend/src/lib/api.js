import { buildApiUrl, ensureApiConnection } from "./localAgent.js";

async function parseResponse(response) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || "Falha na requisição.");
  }

  return response.json();
}

export { ensureApiConnection, refreshLocalAgent, getAgentStatus, getResolvedApiBase } from "./localAgent.js";

export async function runHealthCheck(payload) {
  const response = await fetch(await buildApiUrl("/api/health-check"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function fetchHistory() {
  const response = await fetch(await buildApiUrl("/api/history"));
  return parseResponse(response);
}

export async function fetchRun(id) {
  const response = await fetch(await buildApiUrl(`/api/history/${id}`));
  return parseResponse(response);
}

export async function previewRouting(payload) {
  const response = await fetch(await buildApiUrl("/api/routing/preview"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function applyRoutingPlan(payload) {
  const response = await fetch(await buildApiUrl("/api/routing/apply"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function generateTacPackage(payload) {
  const response = await fetch(await buildApiUrl("/api/tac-package"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function downloadTacPackage(id) {
  window.open(await buildApiUrl(`/api/tac-package/${id}/download`), "_blank", "noopener,noreferrer");
}

export async function downloadReport(id) {
  window.open(await buildApiUrl(`/api/reports/${id}/export`), "_blank", "noopener,noreferrer");
}
