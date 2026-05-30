const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

function apiPath(path) {
  return `${API_BASE_URL}${path}`;
}

async function parseResponse(response) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || "Falha na requisição.");
  }

  return response.json();
}

export async function runHealthCheck(payload) {
  const response = await fetch(apiPath("/api/health-check"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function fetchHistory() {
  const response = await fetch(apiPath("/api/history"));
  return parseResponse(response);
}

export async function fetchRun(id) {
  const response = await fetch(apiPath(`/api/history/${id}`));
  return parseResponse(response);
}

export async function previewRouting(payload) {
  const response = await fetch(apiPath("/api/routing/preview"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function applyRoutingPlan(payload) {
  const response = await fetch(apiPath("/api/routing/apply"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function generateTacPackage(payload) {
  const response = await fetch(apiPath("/api/tac-package"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export function downloadTacPackage(id) {
  window.open(apiPath(`/api/tac-package/${id}/download`), "_blank", "noopener,noreferrer");
}

export function downloadReport(id) {
  window.open(apiPath(`/api/reports/${id}/export`), "_blank", "noopener,noreferrer");
}
