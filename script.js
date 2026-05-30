const form = document.querySelector("#packet-form");
const pieces = [...document.querySelectorAll(".piece")];
const dropFields = [...document.querySelectorAll(".drop-field")];
const logList = document.querySelector("#journey-log");
const packet = document.querySelector("#packet");
const progressLabel = document.querySelector("#progress-label");
const packetStatus = document.querySelector("#packet-status");
const score = document.querySelector("#score");
const resetButton = document.querySelector("#reset-button");
const viewToggle = document.querySelector("#view-toggle");
const networkMap = document.querySelector("#network-map");
const natBefore = document.querySelector("#nat-before");
const natAfter = document.querySelector("#nat-after");
const nodes = [...document.querySelectorAll(".node")];
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

function setPieceUsed(target, used) {
  const piece = pieces.find((button) => button.dataset.target === target);
  if (piece) {
    piece.classList.toggle("is-used", used);
  }
}

function fillField(target, value) {
  const field = document.querySelector(`#${target}`);
  if (!field) return;

  field.value = value;
  field.classList.add("is-filled");
  setPieceUsed(target, true);

  if (target === "ip-destino") {
    nodeDestIp.textContent = value;
    testDestinationIp({ silent: false });
  }
}

function validatePacket() {
  const missingFields = dropFields.filter((field) => !field.value.trim());
  dropFields.forEach((field) => markFieldFilled(field));

  if (!missingFields.length) return true;

  missingFields.forEach((field) => {
    field.classList.remove("shake");
    window.requestAnimationFrame(() => field.classList.add("shake"));
  });
  addLog("Complete todos os campos com borda antes de enviar.");
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
  packet.classList.add("is-visible");
  let stepIndex = 0;

  updateNodes(stepIndex);
  updateProgress(route[stepIndex]);
  addLog(route[stepIndex].log);

  activeTimer = window.setInterval(() => {
    stepIndex += 1;

    if (stepIndex >= route.length) {
      clearAnimation();
      packetStatus.textContent = "Pacote entregue";
      score.textContent = "100";
      addLog("Resposta pronta para voltar pela rota de retorno.");
      return;
    }

    updateNodes(stepIndex);
    updateProgress(route[stepIndex]);
    addLog(route[stepIndex].log);
  }, 850);
}

async function detectLocalIp() {
  if (!window.RTCPeerConnection) return null;

  return new Promise((resolve) => {
    const candidates = new Set();
    const pc = new RTCPeerConnection({ iceServers: [] });
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
    }, 2500);
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

function applyDetectedIps({ localIp, publicIp, announce = true }) {
  networkState.localIp = localIp;
  networkState.publicIp = publicIp;

  localIpDisplay.textContent = localIp || "Não detectado";
  publicIpDisplay.textContent = publicIp || "Não detectado";

  if (localIp) {
    nodeLocalIp.textContent = localIp;
  }

  if (announce) {
    if (localIp && publicIp) {
      addLog(`Rede detectada: local ${localIp}, público ${publicIp}.`);
    } else if (publicIp) {
      addLog(`IP público detectado: ${publicIp}.`);
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
      "Não foi possível detectar automaticamente. Digite o IP manualmente ou tente novamente.";
    if (announce) addLog("Falha ao detectar IP automaticamente.");
    return;
  }

  networkInfoNote.textContent =
    "Use “Usar meu IP” para preencher a origem com o IP local detectado.";

  if (localIp && !ipOrigemInput.dataset.userEdited) {
    ipOrigemInput.value = localIp;
    nodeLocalIp.textContent = localIp;
    setFeedback(ipOrigemFeedback, `Origem atualizada para ${localIp}.`, "is-ok");
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
  setFeedback(ipOrigemFeedback, `Origem definida como ${ip}.`, "is-ok");
  addLog(`IP de origem definido como ${ip}.`);
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
      message += ` Localização aproximada: ${lookup.city}, ${lookup.country_name}.`;
    }
    if (sameAsPublic) message += " Este é o seu IP público.";
    if (sameAsLocal) message += " Este é o IP local da sua máquina.";

    setFeedback(ipDestinoFeedback, message, "is-ok");
    addLog(`Teste de IP concluído para ${ip}.`);
    return true;
  } catch {
    const scope = isPrivateIpv4(ip) ? "rede local" : "internet";
    nodeDestIp.textContent = ip;

    if (isPrivateIpv4(ip)) {
      const message = `IP ${ip} válido (${scope}). Consulta externa indisponível para endereços privados.`;
      setFeedback(ipDestinoFeedback, message, "is-ok");
      addLog(`IP privado ${ip} aceito para teste local.`);
      return true;
    }

    setFeedback(
      ipDestinoFeedback,
      `IP ${ip} parece válido, mas a consulta externa falhou. Você ainda pode enviar o pacote.`,
      "is-error",
    );
    if (!silent) addLog(`Não foi possível consultar detalhes do IP ${ip}.`);
    return true;
  } finally {
    testIpButton.disabled = false;
    testIpButton.textContent = "Testar IP";
  }
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
  });
});

ipOrigemInput.addEventListener("input", () => {
  ipOrigemInput.dataset.userEdited = "true";
  const ip = ipOrigemInput.value.trim();
  nodeLocalIp.textContent = ip || "192.168.1.10";

  if (!ip) {
    setFeedback(ipOrigemFeedback, "", "");
    return;
  }

  if (isValidIpv4(ip)) {
    setFeedback(ipOrigemFeedback, `IP de origem válido: ${ip}.`, "is-ok");
  } else {
    setFeedback(ipOrigemFeedback, "Digite um IPv4 válido, por exemplo 192.168.1.10.", "is-error");
  }
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validatePacket()) return;

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
  addLog(
    `Enviando ${data.get("protocolo")} para ${data.get("ipDestino")}:${data.get("porta")} com TTL ${data.get("ttl")}.`,
  );
  animateJourney();
});

resetButton.addEventListener("click", () => {
  clearAnimation();
  form.reset();
  delete ipOrigemInput.dataset.userEdited;
  form.elements.macOrigem.value = "11:22:33:44:55:66";
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
  nodeDestIp.textContent = "8.8.8.8";
  detectNetworkIps({ announce: false });
});

viewToggle.addEventListener("click", () => {
  const enabled = networkMap.classList.toggle("is-3d");
  viewToggle.textContent = enabled ? "Ver plano" : "Ver em 3D";
});

detectNetworkIps({ announce: true });
