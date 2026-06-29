const form = document.querySelector("#packet-form");
const pieces = [...document.querySelectorAll(".piece")];
const dropFields = [...document.querySelectorAll(".drop-field")];
const logList = document.querySelector("#journey-log");
const packet = document.querySelector("#packet");
const progressLabel = document.querySelector("#progress-label");
const packetStatus = document.querySelector("#packet-status");
const score = document.querySelector("#score");
const resetButton = document.querySelector("#reset-button");
const autoSendButton = document.querySelector("#auto-send-button");
const sendButton = document.querySelector("#send-button");
const viewToggle = document.querySelector("#view-toggle");
const networkMap = document.querySelector("#network-map");
const natBefore = document.querySelector("#nat-before");
const natAfter = document.querySelector("#nat-after");
let nodes = [];
const steps = [...document.querySelectorAll(".steps__item")];
const localIpDisplay = document.querySelector("#local-ip");
const publicIpDisplay = document.querySelector("#public-ip");
const networkInfoNote = document.querySelector("#network-info-note");
const detectIpButton = document.querySelector("#detect-ip-button");
const useLocalIpButton = document.querySelector("#use-local-ip");
const testIpButton = document.querySelector("#test-ip-button");
const ipOrigemInput = document.querySelector("#ip-origem");
const ipDestinoInput = document.querySelector("#ip-destino");
const ipOrigemFeedback = document.querySelector("#ip-origem-feedback");
const ipDestinoFeedback = document.querySelector("#ip-destino-feedback");
let nodeLocalIp = null;
let nodeDestIp = null;
const packetReadiness = document.querySelector("#packet-readiness");
const routeStatus = document.querySelector("#route-status");
const routePlaceholder = document.querySelector("#route-placeholder");
const vendorList = document.querySelector("#vendor-list");
const routeMap = document.querySelector("#route-map");
const routeSummary = document.querySelector("#route-summary");
const macOrigemInput = document.querySelector("#mac-origem");
const macDestinoInput = document.querySelector("#mac-destino");
const macOrigemFeedback = document.querySelector("#mac-origem-feedback");
const macDestinoFeedback = document.querySelector("#mac-destino-feedback");
const testMacOrigButton = document.querySelector("#test-mac-orig-button");
const testMacDestButton = document.querySelector("#test-mac-dest-button");

const fieldLabels = {
  "mac-destino": "MAC destino",
  "ip-destino": "IP destino",
  ttl: "TTL",
  porta: "Porta TCP",
};

let route = [];

const networkState = {
  localIp: null,
  publicIp: null,
  countryCode: null,
  countryName: null,
  city: null,
  region: null,
  latitude: null,
  longitude: null,
  tracedDestination: null,
  probeLabel: null,
  lastPath: [],
  lastSummary: null,
};

let activeTimer = null;
let journeyRunning = false;

function now() {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function addLog(message) {
  const item = document.createElement("li");
  const time = document.createElement("time");
  time.textContent = now();
  item.append(time, ` ${message}`);
  logList.prepend(item);
}

function isValidIpv4(ip) {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const value = Number(part);
    return value >= 0 && value <= 255;
  });
}

function isPrivateIpv4(ip) {
  if (!isValidIpv4(ip)) return false;

  const [a, b] = ip.split(".").map(Number);
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  return false;
}

function setFeedback(element, message, status = "") {
  element.textContent = message;
  element.classList.remove("is-ok", "is-error", "is-loading");
  if (status) element.classList.add(status);
}

function markFieldFilled(field) {
  field.classList.toggle("is-filled", Boolean(field.value.trim()));
}

function lookupMac(mac) {
  return window.MacVendor.lookupVendor(mac);
}

function renderVendorBadge(node, result) {
  const badge = node.querySelector("[data-vendor-badge]");
  if (!badge) return;

  badge.classList.remove("vendor-badge--network", "vendor-badge--endpoint", "vendor-badge--cloud", "vendor-badge--virtual", "vendor-badge--unknown");

  if (!result.valid || !result.vendor) {
    badge.textContent = result.valid ? "Fabricante desconhecido" : "MAC inválido";
    badge.classList.add("vendor-badge--unknown");
    return;
  }

  badge.textContent = `${result.vendor} · ${result.device.label}`;
  badge.classList.add(`vendor-badge--${result.device.type}`);
}

function renderVendorBadgeFromHop(node, hop) {
  const badge = node.querySelector("[data-vendor-badge]");
  if (!badge || !hop) return;

  badge.classList.remove(
    "vendor-badge--network",
    "vendor-badge--endpoint",
    "vendor-badge--cloud",
    "vendor-badge--virtual",
    "vendor-badge--unknown",
  );

  if (!hop.org) {
    badge.textContent = "Operador desconhecido";
    badge.classList.add("vendor-badge--unknown");
    return;
  }

  badge.textContent = [hop.asn, hop.org, hop.role].filter(Boolean).join(" · ") || "Operador desconhecido";
  badge.classList.add(`vendor-badge--${hop.deviceType || "unknown"}`);
}

function formatHopRtt(hop) {
  return window.RouteTracer.formatRtt(hop.rttStats || {});
}

function formatHopLocation(hop) {
  return window.RouteTracer.formatLocation(hop);
}

function renderVendorListFromPath(path) {
  vendorList.innerHTML = "";

  path.forEach((hop, index) => {
    const node = nodes[index];
    const item = document.createElement("li");
    if (hop.isSlowest) item.classList.add("vendor-list__item--slow");

    const name = document.createElement("strong");
    name.textContent = `${hop.label}${hop.isSlowest ? " · maior latência" : ""}`;

    const address = document.createElement("span");
    address.className = "vendor-list__mac";
    address.textContent = [hop.ip, hop.hostname].filter(Boolean).join(" · ");

    const meta = document.createElement("span");
    meta.className = "vendor-list__meta";
    meta.textContent = [
      hop.asn,
      hop.org,
      hop.role,
      formatHopLocation(hop),
    ].filter(Boolean).join(" · ");

    const detail = document.createElement("span");
    detail.className = "vendor-list__detail";
    detail.textContent = [
      `RTT ${formatHopRtt(hop)}`,
      hop.distanceKm != null ? `trecho ${hop.distanceKm.toFixed(0)} km` : null,
      hop.accumulatedKm != null && hop.accumulatedKm > 0 ? `acumulado ${hop.accumulatedKm.toFixed(0)} km` : null,
      hop.roleHint,
    ].filter(Boolean).join(" · ");

    item.append(name, address, meta, detail);
    vendorList.append(item);
    if (node) renderVendorBadgeFromHop(node, hop);
  });
}

function getHopVendorMessage(stepIndex) {
  const hop = route[stepIndex]?.hop;
  if (!hop) return "";
  const parts = [
    hop.org ? `Operador: ${hop.org}` : null,
    hop.asn,
    hop.role,
    formatHopLocation(hop) !== "Localização indisponível" ? formatHopLocation(hop) : null,
    hop.rttStats?.avg != null ? `RTT ${formatHopRtt(hop)}` : null,
  ].filter(Boolean);
  return parts.length ? ` ${parts.join(" · ")}.` : "";
}

function createNodeElement(hop, index, total) {
  const article = document.createElement("article");
  article.className = `node${index === 0 ? " node--active" : ""}${hop.isSlowest ? " node--slowest" : ""}`;
  article.dataset.node = String(index);
  article.dataset.ip = hop.ip;
  if (hop.org) article.dataset.org = hop.org;

  const icon = document.createElement("span");
  icon.className = "node__icon";
  icon.textContent = hop.icon;

  const title = document.createElement("h3");
  title.textContent = hop.label;

  const details = document.createElement("p");
  if (index === 0) details.id = "node-local-ip";
  if (index === total - 1) details.id = "node-dest-ip";

  const lines = [
    hop.ip,
    hop.hostname,
    hop.asn,
    hop.org,
    hop.role,
    formatHopLocation(hop),
    hop.rttStats?.avg != null ? `RTT ${formatHopRtt(hop)}` : null,
    hop.distanceKm != null ? `+${hop.distanceKm.toFixed(0)} km` : null,
  ].filter(Boolean);
  details.innerHTML = lines.join("<br />");

  const badge = document.createElement("span");
  badge.className = "vendor-badge";
  badge.dataset.vendorBadge = "";

  article.append(icon, title, details, badge);
  return article;
}

function projectMapPoints(path, width = 760, height = 220, padding = 28) {
  const geoPoints = path
    .map((hop, index) => ({ hop, index }))
    .filter(({ hop }) => hop.latitude != null && hop.longitude != null);

  if (geoPoints.length < 2) return null;

  const lats = geoPoints.map(({ hop }) => hop.latitude);
  const lons = geoPoints.map(({ hop }) => hop.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latSpan = Math.max(maxLat - minLat, 0.8);
  const lonSpan = Math.max(maxLon - minLon, 0.8);

  return geoPoints.map(({ hop, index }) => ({
    hop,
    index,
    x: padding + ((hop.longitude - minLon) / lonSpan) * (width - padding * 2),
    y: padding + (1 - (hop.latitude - minLat) / latSpan) * (height - padding * 2),
  }));
}

function renderRouteMap(path) {
  if (!routeMap) return;

  const points = projectMapPoints(path);
  if (!points) {
    routeMap.innerHTML = '<p class="route-map__empty">Sem coordenadas suficientes para desenhar o mapa desta rota.</p>';
    return;
  }

  const width = 760;
  const height = 220;
  const polyline = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

  const markers = points
    .map(({ hop, index, x, y }) => {
      const fill = hop.isSlowest ? "#ff8f9d" : index === 0 ? "#7dffb2" : index === points.length - 1 ? "#9db4ff" : "#c4b5fd";
      const title = `${hop.label} (${hop.ip})`;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${fill}" stroke="#0b1020" stroke-width="2"><title>${title}</title></circle>`;
    })
    .join("");

  const labels = points
    .filter((_, index) => index === 0 || index === points.length - 1 || points[index].hop.isSlowest)
    .map(({ hop, x, y }) => `<text x="${x.toFixed(1)}" y="${(y - 12).toFixed(1)}" text-anchor="middle" class="route-map__label">${hop.label}</text>`)
    .join("");

  routeMap.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="route-map__svg" role="img" aria-label="Mapa geográfico da rota">
      <defs>
        <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#8b5cf6" />
          <stop offset="100%" stop-color="#43d7ff" />
        </linearGradient>
      </defs>
      <polyline points="${polyline}" fill="none" stroke="url(#routeGradient)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${markers}
      ${labels}
    </svg>`;
}

function renderRouteSummary(path, summary, probeLabel) {
  if (!routeSummary) return;

  const countries = [...new Set(path.map((hop) => hop.country).filter(Boolean))];
  const slowHop = path[summary?.slowestHopIndex];
  const entries = [
    ["Saltos", `${summary?.hopCount ?? path.length - 1}`],
    ["Distância acumulada", summary?.totalDistanceKm ? `${summary.totalDistanceKm.toFixed(0)} km` : "—"],
    ["Países na rota", countries.length ? countries.join(", ") : "—"],
    [
      "Maior latência",
      slowHop?.rttStats?.avg != null
        ? `${slowHop.label} (${slowHop.ip}) · ${slowHop.rttStats.avg.toFixed(1)} ms`
        : "—",
    ],
    ["Probe do teste", probeLabel || "—"],
    ["ASN do probe", summary?.probeAsn || "—"],
    ["Rede do probe", summary?.probeNetwork || "—"],
  ];

  routeSummary.innerHTML = entries
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");
}

function rebuildRouteFromPath(path) {
  route = path.map((hop, index) => ({
    label: hop.label,
    progress: Math.round((index / Math.max(path.length - 1, 1)) * 100),
    log: hop.log,
    hop,
  }));
}

function rebuildNetworkMap(path, summary, probeLabel) {
  if (routePlaceholder) routePlaceholder.remove();

  networkMap.querySelectorAll(".node").forEach((node) => node.remove());

  path.forEach((hop, index) => {
    networkMap.appendChild(createNodeElement(hop, index, path.length));
  });

  nodes = [...networkMap.querySelectorAll(".node")];
  nodeLocalIp = document.querySelector("#node-local-ip");
  nodeDestIp = document.querySelector("#node-dest-ip");

  networkMap.style.setProperty("--hop-count", String(Math.max(path.length, 1)));
  networkMap.classList.remove("network-map--empty");
  networkMap.classList.add("network-map--traced");

  rebuildRouteFromPath(path);
  renderVendorListFromPath(path);
  renderRouteMap(path);
  renderRouteSummary(path, summary, probeLabel);
}

async function fallbackLookupIp(ip) {
  const response = await fetch(
    `https://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,regionName,city,lat,lon,isp,org,as,query,timezone`,
  );
  if (!response.ok) throw new Error("lookup-failed");
  const data = await response.json();
  if (data.status !== "success") throw new Error(data.message || "lookup-failed");
  return data;
}

async function enrichUserGeo() {
  if (!networkState.publicIp || networkState.countryCode) return;

  try {
    const geo = await lookupIp(networkState.publicIp);
    networkState.countryCode = geo.country_code || "BR";
    networkState.countryName = geo.country_name || networkState.countryCode;
    networkState.city = geo.city || null;
    networkState.region = geo.region || null;
    networkState.latitude = geo.latitude ?? null;
    networkState.longitude = geo.longitude ?? null;
  } catch {
    try {
      const geo = await fallbackLookupIp(networkState.publicIp);
      networkState.countryCode = geo.countryCode || "BR";
      networkState.countryName = geo.country || networkState.countryCode;
      networkState.city = geo.city || null;
      networkState.region = geo.regionName || null;
      networkState.latitude = geo.lat ?? null;
      networkState.longitude = geo.lon ?? null;
    } catch {
      networkState.countryCode = "BR";
      networkState.countryName = "Brasil";
    }
  }
}

async function traceAndBuildRoute(destinationIp) {
  await enrichUserGeo();

  const traceData = await window.RouteTracer.traceToDestination(
    destinationIp,
    networkState,
    lookupIp,
    isPrivateIpv4,
  );

  const built = await window.RouteTracer.buildPath(
    traceData,
    networkState,
    networkState.localIp || ipOrigemInput.value.trim() || "192.168.1.10",
    lookupIp,
    fallbackLookupIp,
    isPrivateIpv4,
  );

  networkState.tracedDestination = destinationIp;
  networkState.probeLabel = built.probeLabel;
  networkState.lastPath = built.path;
  networkState.lastSummary = built.summary;
  rebuildNetworkMap(built.path, built.summary, built.probeLabel);

  if (routeStatus) {
    const distance = built.summary.totalDistanceKm
      ? ` · ~${built.summary.totalDistanceKm.toFixed(0)} km`
      : "";
    routeStatus.textContent = `Traceroute real via ${built.probeLabel}. ${built.summary.hopCount} saltos até ${destinationIp}${distance}.`;
  }

  return built;
}

function testMacField(input, feedbackEl, { silent = false, label = "MAC" } = {}) {
  const mac = input.value.trim();
  markFieldFilled(input);

  if (!mac) {
    setFeedback(feedbackEl, `Digite um ${label} para testar.`, "is-error");
    if (!silent) addLog(`Informe um ${label} antes de testar.`);
    return false;
  }

  const result = lookupMac(mac);
  if (!result.valid) {
    setFeedback(feedbackEl, result.message, "is-error");
    if (!silent) addLog(`${label} inválido: ${mac}.`);
    return false;
  }

  input.value = result.mac;
  const status = result.vendor ? "is-ok" : "is-error";
  setFeedback(feedbackEl, result.message, status);

  if (!silent) {
    addLog(
      result.vendor
        ? `OUI identificado em ${result.mac}: ${result.vendor} (${result.device.label}).`
        : `MAC ${result.mac} válido, mas fabricante não encontrado na base local.`,
    );
  }

  updateReadiness();
  return true;
}

function initPathVendors() {
  vendorList.innerHTML = "<li><strong>Aguardando traceroute</strong><span class=\"vendor-list__detail\">Informe o IP destino e clique em Traçar rota.</span></li>";
  testMacField(macOrigemInput, macOrigemFeedback, { silent: true, label: "MAC de origem" });
}

function getMissingFields() {
  return dropFields.filter((field) => !field.value.trim());
}

function updateReadiness() {
  if (journeyRunning) {
    packetReadiness.textContent = "Pacote em trânsito. Acompanhe a rota à direita.";
    packetReadiness.classList.add("is-running");
    packetReadiness.classList.remove("is-ready");
    return;
  }

  const missing = getMissingFields();
  packetReadiness.classList.remove("is-running");

  if (!missing.length) {
    packetReadiness.textContent = "Tudo pronto. Clique em Montar e enviar ou Enviar pacote.";
    packetReadiness.classList.add("is-ready");
    autoSendButton.classList.add("primary-button--pulse");
    return;
  }

  const names = missing.map((field) => fieldLabels[field.id] || field.id).join(", ");
  packetReadiness.textContent =
    missing.length === 1
      ? `Falta 1 campo: ${names}.`
      : `Faltam ${missing.length} campos: ${names}.`;
  packetReadiness.classList.remove("is-ready");
  autoSendButton.classList.toggle("primary-button--pulse", missing.length <= 2);
}

function updateSteps(activeStep) {
  steps.forEach((step, index) => {
    step.classList.toggle("steps__item--active", index === activeStep);
    step.classList.toggle("steps__item--done", index < activeStep);
  });
}

function setPieceUsed(target, used) {
  const piece = pieces.find((button) => button.dataset.target === target);
  if (piece) {
    piece.classList.toggle("is-used", used);
  }
}

function fillField(target, value, { testIp = true } = {}) {
  const field = document.querySelector(`#${target}`);
  if (!field) return;

  field.value = value;
  field.classList.add("is-filled");
  setPieceUsed(target, true);

  if (target === "ip-destino") {
    if (nodeDestIp) nodeDestIp.textContent = value;
    if (testIp) {
      testDestinationIp({ silent: true });
    }
  }

  if (target === "mac-destino" && testIp) {
    testMacField(macDestinoInput, macDestinoFeedback, { silent: true, label: "MAC destino" });
  }

  updateReadiness();
}

function autoFillMissingFields() {
  pieces.forEach((piece) => {
    const field = document.querySelector(`#${piece.dataset.target}`);
    if (field && !field.value.trim()) {
      fillField(piece.dataset.target, piece.dataset.value, { testIp: false });
    }
  });

  if (!ipDestinoInput.value.trim()) {
    fillField("ip-destino", "8.8.8.8", { testIp: false });
  }

  updateReadiness();
  addLog("Campos restantes preenchidos automaticamente.");
}

function validatePacket() {
  const missingFields = getMissingFields();
  dropFields.forEach((field) => markFieldFilled(field));

  if (!missingFields.length) return true;

  missingFields.forEach((field) => {
    field.classList.remove("shake");
    window.requestAnimationFrame(() => field.classList.add("shake"));
  });

  const names = missingFields.map((field) => fieldLabels[field.id]).join(", ");
  addLog(`Complete os campos faltantes antes de enviar: ${names}.`);
  updateReadiness();
  return false;
}

function updateNodes(activeIndex) {
  nodes.forEach((node, index) => {
    node.classList.toggle("node--active", index === activeIndex);
    node.classList.toggle("node--done", index < activeIndex);
  });
}

function updateProgress(step) {
  progressLabel.textContent = `${step.progress}%`;
  packetStatus.textContent = step.label;
  packet.style.left = `${7 + step.progress * 0.86}%`;
}

function clearAnimation() {
  if (activeTimer) {
    window.clearInterval(activeTimer);
    activeTimer = null;
  }
}

function animateJourney() {
  clearAnimation();
  journeyRunning = true;
  updateSteps(2);
  updateReadiness();
  autoSendButton.disabled = true;
  sendButton.disabled = true;

  packet.classList.add("is-visible");
  let stepIndex = 0;

  updateNodes(stepIndex);
  updateProgress(route[stepIndex]);
  addLog(route[stepIndex].log + getHopVendorMessage(stepIndex));

  activeTimer = window.setInterval(() => {
    stepIndex += 1;

    if (stepIndex >= route.length) {
      clearAnimation();
      journeyRunning = false;
      packetStatus.textContent = "Pacote entregue";
      score.textContent = "100";
      progressLabel.textContent = "100%";
      updateSteps(3);
      autoSendButton.disabled = false;
      sendButton.disabled = false;
      updateReadiness();
      addLog("Resposta pronta para voltar pela rota de retorno.");
      return;
    }

    updateNodes(stepIndex);
    updateProgress(route[stepIndex]);
    addLog(route[stepIndex].log + getHopVendorMessage(stepIndex));
  }, 850);
}

async function detectLocalIp() {
  if (!window.RTCPeerConnection) return null;

  return new Promise((resolve) => {
    const candidates = new Set();
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.createDataChannel("probe");
    pc.onicecandidate = (event) => {
      if (!event.candidate?.candidate) return;

      const match = /(\d{1,3}(?:\.\d{1,3}){3})/.exec(event.candidate.candidate);
      if (!match) return;

      const ip = match[1];
      if (!isPrivateIpv4(ip) && !ip.startsWith("169.254.")) return;
      candidates.add(ip);
    };

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => resolve(null));

    window.setTimeout(() => {
      pc.close();
      resolve([...candidates][0] || null);
    }, 3500);
  });
}

async function detectPublicIp() {
  const response = await fetch("https://api.ipify.org?format=json");
  if (!response.ok) throw new Error("public-ip-unavailable");
  const data = await response.json();
  return data.ip || null;
}

async function lookupIp(ip) {
  const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
  if (!response.ok) throw new Error("lookup-failed");
  const data = await response.json();
  if (data.error) throw new Error(data.reason || "lookup-failed");
  return data;
}

function resolveLocalIpDisplay(localIp) {
  const originIp = ipOrigemInput.value.trim();
  if (localIp) return localIp;
  if (isValidIpv4(originIp) && isPrivateIpv4(originIp)) {
    return `${originIp} (origem)`;
  }
  return "Não detectado";
}

function applyDetectedIps({ localIp, publicIp, announce = true }) {
  networkState.localIp = localIp || (isPrivateIpv4(ipOrigemInput.value.trim()) ? ipOrigemInput.value.trim() : null);
  networkState.publicIp = publicIp;

  localIpDisplay.textContent = resolveLocalIpDisplay(localIp);
  publicIpDisplay.textContent = publicIp || "Não detectado";

  if (networkState.localIp) {
    if (nodeLocalIp) nodeLocalIp.textContent = networkState.localIp;
  }

  if (announce) {
    if (localIp && publicIp) {
      addLog(`Rede detectada: local ${localIp}, público ${publicIp}.`);
    } else if (publicIp) {
      addLog(`IP público detectado: ${publicIp}.`);
      if (!localIp && networkState.localIp) {
        addLog(`Usando ${networkState.localIp} como IP local de origem.`);
      }
    } else if (localIp) {
      addLog(`IP local detectado: ${localIp}.`);
    }
  }
}

async function detectNetworkIps({ announce = true } = {}) {
  detectIpButton.disabled = true;
  detectIpButton.textContent = "Detectando...";
  localIpDisplay.textContent = "Detectando...";
  publicIpDisplay.textContent = "Detectando...";
  networkInfoNote.textContent = "Consultando o endereço da sua máquina e da internet...";

  let localIp = null;
  let publicIp = null;

  try {
    [localIp, publicIp] = await Promise.all([
      detectLocalIp().catch(() => null),
      detectPublicIp().catch(() => null),
    ]);
  } finally {
    detectIpButton.disabled = false;
    detectIpButton.textContent = "Detectar IP";
  }

  applyDetectedIps({ localIp, publicIp, announce });
  await enrichUserGeo().catch(() => null);

  if (!localIp && !publicIp) {
    networkInfoNote.textContent =
      "Não foi possível detectar automaticamente. Use Montar e enviar ou preencha manualmente.";
    if (announce) addLog("Falha ao detectar IP automaticamente.");
    return;
  }

  networkInfoNote.textContent =
    'Clique em "Montar e enviar pacote" para iniciar a simulação com um clique.';

  if ((localIp || networkState.localIp) && !ipOrigemInput.dataset.userEdited) {
    const origin = localIp || networkState.localIp;
    ipOrigemInput.value = origin;
    if (nodeLocalIp) nodeLocalIp.textContent = origin;
    setFeedback(ipOrigemFeedback, `Origem atualizada para ${origin}.`, "is-ok");
  }
}

function useLocalIp() {
  const ip = networkState.localIp || ipOrigemInput.value.trim();
  if (!isValidIpv4(ip)) {
    setFeedback(ipOrigemFeedback, "Detecte ou digite um IP local válido primeiro.", "is-error");
    addLog("Não há IP local válido para usar como origem.");
    return;
  }

  ipOrigemInput.value = ip;
  ipOrigemInput.dataset.userEdited = "true";
  if (nodeLocalIp) nodeLocalIp.textContent = ip;
  networkState.localIp = ip;
  localIpDisplay.textContent = ip;
  setFeedback(ipOrigemFeedback, `Origem definida como ${ip}.`, "is-ok");
  addLog(`IP de origem definido como ${ip}.`);
  updateReadiness();
}

async function testDestinationIp({ silent = false, skipTrace = false } = {}) {
  const ip = ipDestinoInput.value.trim();
  markFieldFilled(ipDestinoInput);

  if (!ip) {
    setFeedback(ipDestinoFeedback, "Digite um IP de destino para traçar a rota.", "is-error");
    if (!silent) addLog("Informe um IP de destino antes de traçar.");
    return false;
  }

  if (!isValidIpv4(ip)) {
    setFeedback(ipDestinoFeedback, "Formato inválido. Use algo como 8.8.8.8.", "is-error");
    if (!silent) addLog(`IP inválido: ${ip}.`);
    return false;
  }

  testIpButton.disabled = true;
  testIpButton.textContent = "Traçando...";
  setFeedback(ipDestinoFeedback, "Executando traceroute real na sua região...", "is-loading");

  try {
    let lookup = null;
    try {
      lookup = await lookupIp(ip);
    } catch {
      lookup = null;
    }

    if (!skipTrace && !isPrivateIpv4(ip)) {
      if (!silent) addLog(`Traceroute real iniciado para ${ip}...`);
      const built = await traceAndBuildRoute(ip);
      if (!silent) {
        addLog(`Rota real encontrada: ${built.path.length - 1} saltos via ${built.probeLabel}.`);
      }
    } else if (isPrivateIpv4(ip)) {
      if (routeStatus) {
        routeStatus.textContent = "IP privado: traceroute global não se aplica. Use um IP público para ver saltos reais.";
      }
      if (!silent) addLog("IP privado informado. Traceroute global requer IP público de destino.");
    }

    const scope = isPrivateIpv4(ip) ? "rede local" : "internet";
    let message = `IP ${ip} válido (${scope}).`;
    if (lookup?.org) message += ` Operador: ${lookup.org}.`;
    if (lookup?.city && lookup?.country_name) {
      message += ` Localização: ${lookup.city}, ${lookup.country_name}.`;
    }
    if (networkState.tracedDestination === ip && route.length > 1) {
      message += ` ${route.length - 1} saltos mapeados na rota.`;
    }

    setFeedback(ipDestinoFeedback, message, "is-ok");
    if (!silent && networkState.tracedDestination !== ip) addLog(`Consulta de IP concluída para ${ip}.`);
    autoFillMissingFields();
    updateReadiness();
    return true;
  } catch (error) {
    const reason = error?.message || "erro";
    setFeedback(
      ipDestinoFeedback,
      `Não foi possível traçar a rota agora (${reason}). Tente novamente em alguns segundos.`,
      "is-error",
    );
    if (!silent) addLog(`Falha no traceroute para ${ip}: ${reason}.`);
    return false;
  } finally {
    testIpButton.disabled = false;
    testIpButton.textContent = "Traçar rota";
  }
}

async function sendPacket({ autoFill = false } = {}) {
  if (journeyRunning) {
    addLog("Aguarde a viagem atual terminar ou clique em Reiniciar.");
    return;
  }

  if (autoFill) {
    autoFillMissingFields();
  }

  if (!validatePacket()) return;

  updateSteps(1);

  if (networkState.tracedDestination !== ipDestinoInput.value.trim() || route.length < 2) {
    const traced = await testDestinationIp({ silent: true });
    if (!traced) return;
  }

  if (route.length < 2) {
    addLog("Traçe a rota antes de enviar o pacote (botão Traçar rota).");
    setFeedback(ipDestinoFeedback, "Traçe a rota real antes de enviar o pacote.", "is-error");
    return;
  }

  const data = new FormData(form);
  const localAddress = `${data.get("ipOrigem")}:${Math.floor(50000 + Math.random() * 9999)}`;
  const publicAddress = networkState.publicIp
    ? `${networkState.publicIp}:${Math.floor(62000 + Math.random() * 999)}`
    : `189.XX.XX.25:${Math.floor(62000 + Math.random() * 999)}`;

  natBefore.textContent = localAddress;
  natAfter.textContent = publicAddress;
  score.textContent = "0";
  progressLabel.textContent = "0%";
  packetStatus.textContent = "Pacote em trânsito";
  const macDest = lookupMac(data.get("macDestino"));
  const macOrig = lookupMac(data.get("macOrigem"));

  addLog(
    `Enviando ${data.get("protocolo")} para ${data.get("ipDestino")}:${data.get("porta")} com TTL ${data.get("ttl")}.`,
  );

  if (macOrig.vendor) {
    addLog(`Origem MAC ${macOrig.mac}: ${macOrig.vendor} (${macOrig.device.label}).`);
  }

  if (macDest.vendor) {
    addLog(`Destino MAC ${macDest.mac}: ${macDest.vendor} (${macDest.device.label}).`);
  }

  animateJourney();
}

pieces.forEach((piece) => {
  piece.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        target: piece.dataset.target,
        value: piece.dataset.value,
      }),
    );
  });

  piece.addEventListener("click", () => {
    fillField(piece.dataset.target, piece.dataset.value);
  });
});

dropFields.forEach((field) => {
  field.addEventListener("dragover", (event) => {
    event.preventDefault();
    field.classList.add("is-over");
  });

  field.addEventListener("dragleave", () => {
    field.classList.remove("is-over");
  });

  field.addEventListener("drop", (event) => {
    event.preventDefault();
    field.classList.remove("is-over");

    const payload = JSON.parse(event.dataTransfer.getData("application/json") || "{}");
    if (payload.target !== field.id) {
      addLog(`A peça "${payload.value || "selecionada"}" não pertence a este campo.`);
      field.classList.add("shake");
      window.setTimeout(() => field.classList.remove("shake"), 360);
      return;
    }

    fillField(payload.target, payload.value);
  });

  field.addEventListener("input", () => {
    markFieldFilled(field);
    if (field.id === "ip-destino") {
      networkState.tracedDestination = null;
      if (nodeDestIp) nodeDestIp.textContent = field.value.trim() || "8.8.8.8";
    }
    updateReadiness();
  });
});

macOrigemInput.addEventListener("input", () => updateReadiness());
macDestinoInput.addEventListener("input", () => updateReadiness());

macOrigemInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    testMacField(macOrigemInput, macOrigemFeedback, { label: "MAC de origem" });
  }
});

macDestinoInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    testMacField(macDestinoInput, macDestinoFeedback, { label: "MAC destino" });
  }
});

ipOrigemInput.addEventListener("input", () => {
  ipOrigemInput.dataset.userEdited = "true";
  const ip = ipOrigemInput.value.trim();
  if (nodeLocalIp) nodeLocalIp.textContent = ip || "192.168.1.10";

  if (!ip) {
    setFeedback(ipOrigemFeedback, "", "");
    updateReadiness();
    return;
  }

  if (isValidIpv4(ip)) {
    setFeedback(ipOrigemFeedback, `IP de origem válido: ${ip}.`, "is-ok");
    if (isPrivateIpv4(ip)) {
      networkState.localIp = ip;
      localIpDisplay.textContent = `${ip} (origem)`;
    }
  } else {
    setFeedback(ipOrigemFeedback, "Digite um IPv4 válido, por exemplo 192.168.1.10.", "is-error");
  }

  updateReadiness();
});

ipDestinoInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    testDestinationIp();
  }
});

detectIpButton.addEventListener("click", () => detectNetworkIps({ announce: true }));
useLocalIpButton.addEventListener("click", useLocalIp);
testIpButton.addEventListener("click", () => testDestinationIp());
testMacOrigButton.addEventListener("click", () =>
  testMacField(macOrigemInput, macOrigemFeedback, { label: "MAC de origem" }),
);
testMacDestButton.addEventListener("click", () =>
  testMacField(macDestinoInput, macDestinoFeedback, { label: "MAC destino" }),
);
autoSendButton.addEventListener("click", () => sendPacket({ autoFill: true }));
form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendPacket({ autoFill: false });
});

resetButton.addEventListener("click", () => {
  clearAnimation();
  journeyRunning = false;
  form.reset();
  delete ipOrigemInput.dataset.userEdited;
  form.elements.macOrigem.value = "00:1B:21:44:55:66";
  form.elements.protocolo.value = "TCP";
  dropFields.forEach((field) => field.classList.remove("is-filled", "is-over", "shake"));
  pieces.forEach((piece) => piece.classList.remove("is-used"));
  networkMap.querySelectorAll(".node").forEach((node) => node.remove());
  networkMap.classList.add("network-map--empty");
  networkMap.classList.remove("network-map--traced");
  networkMap.style.setProperty("--hop-count", "1");
  if (!networkMap.querySelector("#route-placeholder")) {
    const placeholder = document.createElement("p");
    placeholder.className = "route-placeholder";
    placeholder.id = "route-placeholder";
    placeholder.textContent = "A rota aparece aqui após o traceroute. Cada destino mostra saltos diferentes.";
    networkMap.appendChild(placeholder);
  }
  nodes = [];
  route = [];
  networkState.tracedDestination = null;
  networkState.probeLabel = null;
  if (routeStatus) {
    routeStatus.textContent = "Informe o IP destino e clique em Traçar rota para descobrir os saltos reais.";
  }
  if (routeMap) {
    routeMap.innerHTML = '<p class="route-map__empty">O mapa aparece após traçar a rota.</p>';
  }
  if (routeSummary) {
    routeSummary.innerHTML = '<div><dt>Saltos</dt><dd>—</dd></div><div><dt>Distância</dt><dd>—</dd></div><div><dt>Maior latência</dt><dd>—</dd></div><div><dt>Probe</dt><dd>—</dd></div>';
  }
  networkState.lastPath = [];
  networkState.lastSummary = null;
  packet.classList.remove("is-visible");
  packet.style.left = "7%";
  score.textContent = "0";
  progressLabel.textContent = "0%";
  packetStatus.textContent = "Pacote aguardando";
  logList.innerHTML = "<li><time>00:00:00</time> Pacote aguardando montagem...</li>";
  setFeedback(ipOrigemFeedback, "", "");
  setFeedback(ipDestinoFeedback, "", "");
  setFeedback(macOrigemFeedback, "", "");
  setFeedback(macDestinoFeedback, "", "");
  if (nodeDestIp) nodeDestIp.textContent = "8.8.8.8";
  autoSendButton.disabled = false;
  sendButton.disabled = false;
  updateSteps(0);
  updateReadiness();
  initPathVendors();
  detectNetworkIps({ announce: false });
});

viewToggle.addEventListener("click", () => {
  const enabled = networkMap.classList.toggle("is-3d");
  viewToggle.textContent = enabled ? "Ver plano" : "Ver em 3D";
});

initPathVendors();
detectNetworkIps({ announce: true });
updateReadiness();
