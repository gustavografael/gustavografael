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
}

function validatePacket() {
  const missingFields = dropFields.filter((field) => !field.value.trim());
  dropFields.forEach((field) => field.classList.toggle("is-filled", Boolean(field.value.trim())));

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
  progressLabel.value = `${step.progress}%`;
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
      score.value = "100";
      addLog("Resposta pronta para voltar pela rota de retorno.");
      return;
    }

    updateNodes(stepIndex);
    updateProgress(route[stepIndex]);
    addLog(route[stepIndex].log);
  }, 850);
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
    field.classList.toggle("is-filled", Boolean(field.value.trim()));
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!validatePacket()) return;

  const data = new FormData(form);
  const localAddress = `${data.get("ipOrigem")}:${Math.floor(50000 + Math.random() * 9999)}`;
  const publicAddress = `189.XX.XX.25:${Math.floor(62000 + Math.random() * 999)}`;

  natBefore.textContent = localAddress;
  natAfter.textContent = publicAddress;
  score.value = "0";
  progressLabel.value = "0%";
  packetStatus.textContent = "Pacote em trânsito";
  addLog(
    `Enviando ${data.get("protocolo")} para ${data.get("ipDestino")}:${data.get("porta")} com TTL ${data.get("ttl")}.`,
  );
  animateJourney();
});

resetButton.addEventListener("click", () => {
  clearAnimation();
  form.reset();
  form.elements.macOrigem.value = "11:22:33:44:55:66";
  form.elements.ipOrigem.value = "192.168.1.10";
  form.elements.protocolo.value = "TCP";
  dropFields.forEach((field) => field.classList.remove("is-filled", "is-over", "shake"));
  pieces.forEach((piece) => piece.classList.remove("is-used"));
  nodes.forEach((node, index) => {
    node.classList.toggle("node--active", index === 0);
    node.classList.remove("node--done");
  });
  packet.classList.remove("is-visible");
  packet.style.left = "7%";
  score.value = "0";
  progressLabel.value = "0%";
  packetStatus.textContent = "Pacote aguardando";
  logList.innerHTML = "<li><time>00:00:00</time> Pacote aguardando montagem...</li>";
});

viewToggle.addEventListener("click", () => {
  const enabled = networkMap.classList.toggle("is-3d");
  viewToggle.textContent = enabled ? "Ver plano" : "Ver em 3D";
});
