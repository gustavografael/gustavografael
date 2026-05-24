async function parseResponse(response) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || "Falha na requisição.");
  }

  return response.json();
}

export async function runHealthCheck(payload) {
  const response = await fetch("/api/health-check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function fetchHistory() {
  const response = await fetch("/api/history");
  return parseResponse(response);
}

export async function fetchRun(id) {
  const response = await fetch(`/api/history/${id}`);
  return parseResponse(response);
}

export async function previewRouting(payload) {
  const response = await fetch("/api/routing/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function applyRoutingPlan(payload) {
  const response = await fetch("/api/routing/apply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export function downloadReport(id) {
  window.open(`/api/reports/${id}/export`, "_blank", "noopener,noreferrer");
}
