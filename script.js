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
const nodes = [...document.querySelectorAll(".node")];
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
const nodeLocalIp = document.querySelector("#node-local-ip");
const nodeDestIp = document.querySelector("#node-dest-ip");
const packetReadiness = document.querySelector("#packet-readiness");
const vendorList = document.querySelector("#vendor-list");
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

const route = [
  {
    label: "Seu Computador",
    progress: 0,
    log: "Pacote saiu da máquina de origem.",
  },
  {
    label: "Switch",
    progress: 16,
    log: "Switch consultou a tabela MAC e encaminhou o quadro.",
  },
  {
    label: "Roteador",
    progress: 32,
    log: "Roteador leu o IP destino e reduziu o TTL.",
  },
  {
    label: "NAT",
    progress: 50,
    log: "NAT traduziu o IP privado para um endereço público.",
  },
  {
    label: "Firewall",
    progress: 66,
    log: "Firewall liberou a conexão conforme a regra de segurança.",
  },
  {
    label: "DNS",
    progress: 82,
    log: "DNS confirmou o destino quando o nome precisa ser resolvido.",
  },
  {
    label: "Servidor",
    progress: 100,
    log: "Servidor recebeu o pacote e preparou a resposta.",
  },
];

const networkState = {
  localIp: null,
  publicIp: null,
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

function renderVendorList() {
  vendorList.innerHTML = "";

  nodes.forEach((node) => {
    const mac = node.dataset.mac;
    const title = node.querySelector("h3")?.textContent || "Dispositivo";
    const result = lookupMac(mac);
    const item = document.createElement("li");

    const name = document.createElement("strong");
    name.textContent = title;

    const address = document.createElement("span");
    address.className = "vendor-list__mac";
    address.textContent = result.mac || mac;

    const detail = document.createElement("span");
    detail.className = "vendor-list__detail";
    detail.textContent = result.vendor
      ? `${result.vendor} — ${result.device.label}`
      : result.message;

    item.append(name, address, detail);
    vendorList.append(item);
    renderVendorBadge(node, result);
  });
}

function getHopVendorMessage(stepIndex) {
  const node = nodes[stepIndex];
  if (!node?.dataset.mac) return "";

  const result = lookupMac(node.dataset.mac);
  if (!result.vendor) return "";
  return ` Fabricante: ${result.vendor} (${result.device.label}).`;
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
  renderVendorList();
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
    nodeDestIp.textContent = value;
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
    nodeLocalIp.textContent = networkState.localIp;
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
    nodeLocalIp.textContent = origin;
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
  nodeLocalIp.textContent = ip;
  networkState.localIp = ip;
  localIpDisplay.textContent = ip;
  setFeedback(ipOrigemFeedback, `Origem definida como ${ip}.`, "is-ok");
  addLog(`IP de origem definido como ${ip}.`);
  updateReadiness();
}

async function testDestinationIp({ silent = false } = {}) {
  const ip = ipDestinoInput.value.trim();
  markFieldFilled(ipDestinoInput);

  if (!ip) {
    setFeedback(ipDestinoFeedback, "Digite um IP de destino para testar.", "is-error");
    if (!silent) addLog("Informe um IP de destino antes de testar.");
    return false;
  }

  if (!isValidIpv4(ip)) {
    setFeedback(ipDestinoFeedback, "Formato inválido. Use algo como 8.8.8.8.", "is-error");
    if (!silent) addLog(`IP inválido: ${ip}.`);
    return false;
  }

  testIpButton.disabled = true;
  testIpButton.textContent = "Testando...";
  setFeedback(ipDestinoFeedback, "Testando rota e consultando informações do IP...", "is-loading");

  try {
    const lookup = await lookupIp(ip);
    const scope = isPrivateIpv4(ip) ? "rede local" : "internet";
    const sameAsPublic = networkState.publicIp && ip === networkState.publicIp;
    const sameAsLocal = networkState.localIp && ip === networkState.localIp;

    nodeDestIp.textContent = ip;

    let message = `IP ${ip} válido (${scope}).`;
    if (lookup.org) message += ` Operador: ${lookup.org}.`;
    if (lookup.city && lookup.country_name) {
      message += ` Localização: ${lookup.city}, ${lookup.country_name}.`;
    }
    if (sameAsPublic) message += " Este é o seu IP público.";
    if (sameAsLocal) message += " Este é o IP local da sua máquina.";

    setFeedback(ipDestinoFeedback, `${message} Agora clique em Montar e enviar.`, "is-ok");
    if (!silent) addLog(`Teste de IP concluído para ${ip}.`);
    autoFillMissingFields();
    updateReadiness();
    return true;
  } catch {
    nodeDestIp.textContent = ip;

    if (isPrivateIpv4(ip)) {
      const message = `IP ${ip} válido (rede local). Clique em Montar e enviar para continuar.`;
      setFeedback(ipDestinoFeedback, message, "is-ok");
      if (!silent) addLog(`IP privado ${ip} aceito para teste local.`);
      autoFillMissingFields();
      updateReadiness();
      return true;
    }

    setFeedback(
      ipDestinoFeedback,
      `IP ${ip} válido. Consulta externa falhou, mas você pode enviar o pacote.`,
      "is-ok",
    );
    if (!silent) addLog(`Não foi possível consultar detalhes do IP ${ip}.`);
    autoFillMissingFields();
    updateReadiness();
    return true;
  } finally {
    testIpButton.disabled = false;
    testIpButton.textContent = "Testar IP";
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

  const destinationOk = await testDestinationIp({ silent: true });
  if (!destinationOk) return;

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
      nodeDestIp.textContent = field.value.trim() || "8.8.8.8";
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
  nodeLocalIp.textContent = ip || "192.168.1.10";

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
  nodes.forEach((node, index) => {
    node.classList.toggle("node--active", index === 0);
    node.classList.remove("node--done");
  });
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
  nodeDestIp.textContent = "8.8.8.8";
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
