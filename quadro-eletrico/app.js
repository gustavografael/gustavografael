(() => {
  "use strict";

  const MODULE_WIDTH = 18;
  const RAIL_Y = [70, 210, 350];
  const PANEL_W = 920;
  const PANEL_H = 520;
  const AMPS = [6, 10, 16, 20, 25, 32, 40, 50, 63];
  const ASSET = (name) => `assets/${name}`;

  const WIRE_COLORS = {
    L1: "#1a1a1a",
    L2: "#c62828",
    L3: "#8d6e63",
    N: "#1e88e5",
    PE: "#2f9e44",
  };

  const WIRE_LABELS = {
    L1: "Fase L1",
    L2: "Fase L2",
    L3: "Fase L3",
    N: "Neutro",
    PE: "Terra (PE)",
  };

  function polesTerminals(poles, withNeutral = false) {
    const top = [];
    const bottom = [];
    const phaseTypes = ["L1", "L2", "L3"];
    const phases = withNeutral ? poles - 1 : poles;
    for (let i = 0; i < phases; i++) {
      const t = phaseTypes[i] || "L1";
      top.push({ id: `in-${t.toLowerCase()}`, side: "top", type: t, label: t });
      bottom.push({ id: `out-${t.toLowerCase()}`, side: "bottom", type: t, label: t });
    }
    if (withNeutral) {
      top.push({ id: "in-n", side: "top", type: "N", label: "N" });
      bottom.push({ id: "out-n", side: "bottom", type: "N", label: "N" });
    }
    if (poles === 1 && !withNeutral) {
      return [
        { id: "in", side: "top", type: "L1", label: "In" },
        { id: "out", side: "bottom", type: "L1", label: "Out" },
      ];
    }
    if (poles === 2 && withNeutral) {
      return [
        { id: "in-l", side: "top", type: "L1", label: "L" },
        { id: "in-n", side: "top", type: "N", label: "N" },
        { id: "out-l", side: "bottom", type: "L1", label: "L" },
        { id: "out-n", side: "bottom", type: "N", label: "N" },
      ];
    }
    return [...top, ...bottom];
  }

  const CATALOG = [
    // Disjuntores Steck
    {
      id: "mcb-1p-10",
      group: "breakers",
      name: "Steck 1P 10A",
      short: "SD 1P C10",
      poles: 1,
      modules: 1,
      kind: "mcb",
      defaultAmps: 10,
      image: "mcb-1p-10a.png",
      thumb: "mcb-1p-10a-thumb.png",
      terminals: polesTerminals(1),
    },
    {
      id: "mcb-1p-16",
      group: "breakers",
      name: "Steck 1P 16A",
      short: "SD 1P C16",
      poles: 1,
      modules: 1,
      kind: "mcb",
      defaultAmps: 16,
      image: "mcb-1p.png",
      thumb: "mcb-1p-thumb.png",
      terminals: polesTerminals(1),
    },
    {
      id: "mcb-1p-20",
      group: "breakers",
      name: "Steck 1P 20A",
      short: "SD 1P C20",
      poles: 1,
      modules: 1,
      kind: "mcb",
      defaultAmps: 20,
      image: "mcb-1p-20a.png",
      thumb: "mcb-1p-20a-thumb.png",
      terminals: polesTerminals(1),
    },
    {
      id: "mcb-1p-32",
      group: "breakers",
      name: "Steck 1P 32A",
      short: "SD 1P C32",
      poles: 1,
      modules: 1,
      kind: "mcb",
      defaultAmps: 32,
      image: "mcb-1p-32a.png",
      thumb: "mcb-1p-32a-thumb.png",
      terminals: polesTerminals(1),
    },
    {
      id: "mcb-1p-40",
      group: "breakers",
      name: "Steck 1P 40A",
      short: "SD 1P C40",
      poles: 1,
      modules: 1,
      kind: "mcb",
      defaultAmps: 40,
      image: "mcb-1p-40a.png",
      thumb: "mcb-1p-40a-thumb.png",
      terminals: polesTerminals(1),
    },
    {
      id: "mcb-2p-25",
      group: "breakers",
      name: "Steck 2P 25A",
      short: "SD 2P C25",
      poles: 2,
      modules: 2,
      kind: "mcb",
      defaultAmps: 25,
      image: "mcb-2p.png",
      thumb: "mcb-2p-thumb.png",
      terminals: polesTerminals(2, true),
    },
    {
      id: "mcb-2p-40",
      group: "breakers",
      name: "Steck 2P 40A",
      short: "SD 2P C40",
      poles: 2,
      modules: 2,
      kind: "mcb",
      defaultAmps: 40,
      image: "mcb-2p-40a.png",
      thumb: "mcb-2p-40a-thumb.png",
      terminals: polesTerminals(2, true),
    },
    {
      id: "mcb-3p-32",
      group: "breakers",
      name: "Steck 3P 32A",
      short: "SD 3P C32",
      poles: 3,
      modules: 3,
      kind: "mcb",
      defaultAmps: 32,
      image: "mcb-3p.png",
      thumb: "mcb-3p-thumb.png",
      terminals: polesTerminals(3),
    },
    {
      id: "mcb-3p-63",
      group: "breakers",
      name: "Steck 3P 63A",
      short: "SD 3P C63",
      poles: 3,
      modules: 3,
      kind: "mcb",
      defaultAmps: 63,
      image: "mcb-3p-63a.png",
      thumb: "mcb-3p-63a-thumb.png",
      terminals: polesTerminals(3),
    },
    {
      id: "mcb-4p-40",
      group: "breakers",
      name: "Steck 4P 40A",
      short: "SD 4P C40",
      poles: 4,
      modules: 4,
      kind: "mcb",
      defaultAmps: 40,
      image: "mcb-4p.png",
      thumb: "mcb-4p-thumb.png",
      terminals: polesTerminals(4, true),
    },

    // DR
    {
      id: "dr-2p-25",
      group: "dr",
      name: "Steck DR 2P 25A",
      short: "DR 2P 25A",
      poles: 2,
      modules: 2,
      kind: "dr",
      defaultAmps: 25,
      image: "dr-2p-25a.png",
      thumb: "dr-2p-25a-thumb.png",
      terminals: polesTerminals(2, true),
    },
    {
      id: "dr-2p-40",
      group: "dr",
      name: "Steck DR 2P 40A",
      short: "DR 2P 40A",
      poles: 2,
      modules: 2,
      kind: "dr",
      defaultAmps: 40,
      image: "dr-2p.png",
      thumb: "dr-2p-thumb.png",
      terminals: polesTerminals(2, true),
    },
    {
      id: "dr-4p-40",
      group: "dr",
      name: "Steck DR 4P 40A",
      short: "DR 4P 40A",
      poles: 4,
      modules: 4,
      kind: "dr",
      defaultAmps: 40,
      image: "dr-4p.png",
      thumb: "dr-4p-thumb.png",
      terminals: polesTerminals(4, true),
    },
    {
      id: "dr-4p-63",
      group: "dr",
      name: "Steck DR 4P 63A",
      short: "DR 4P 63A",
      poles: 4,
      modules: 4,
      kind: "dr",
      defaultAmps: 63,
      image: "dr-4p-63a.png",
      thumb: "dr-4p-63a-thumb.png",
      terminals: polesTerminals(4, true),
    },

    // DPS
    {
      id: "dps-1p",
      group: "dps",
      name: "Steck DPS 1P",
      short: "DPS 1P",
      poles: 1,
      modules: 1,
      kind: "dps",
      defaultAmps: 20,
      image: "dps-1p.png",
      thumb: "dps-1p-thumb.png",
      terminals: [
        { id: "l1", side: "top", type: "L1", label: "L" },
        { id: "pe", side: "bottom", type: "PE", label: "PE" },
      ],
    },
    {
      id: "dps-2p",
      group: "dps",
      name: "Steck DPS 2P",
      short: "DPS 2P",
      poles: 2,
      modules: 2,
      kind: "dps",
      defaultAmps: 20,
      image: "dps-2p.png",
      thumb: "dps-2p-thumb.png",
      terminals: [
        { id: "l1", side: "top", type: "L1", label: "L" },
        { id: "n", side: "top", type: "N", label: "N" },
        { id: "pe", side: "bottom", type: "PE", label: "PE" },
      ],
    },
    {
      id: "dps-3p",
      group: "dps",
      name: "Steck DPS 3P",
      short: "DPS 3P",
      poles: 3,
      modules: 3,
      kind: "dps",
      defaultAmps: 20,
      image: "dps-3p.png",
      thumb: "dps-3p-thumb.png",
      terminals: [
        { id: "l1", side: "top", type: "L1", label: "L1" },
        { id: "l2", side: "top", type: "L2", label: "L2" },
        { id: "l3", side: "top", type: "L3", label: "L3" },
        { id: "pe", side: "bottom", type: "PE", label: "PE" },
      ],
    },

    // Barramentos
    {
      id: "bus-n",
      group: "bus",
      name: "Barramento Neutro",
      short: "Barra N",
      poles: 1,
      modules: 8,
      kind: "bus-n",
      defaultAmps: 63,
      image: "bus-n.png",
      thumb: "bus-n-thumb.png",
      terminals: Array.from({ length: 8 }, (_, i) => ({
        id: `n${i + 1}`,
        side: "bottom",
        type: "N",
        label: `N${i + 1}`,
      })),
    },
    {
      id: "bus-pe",
      group: "bus",
      name: "Barramento Terra",
      short: "Barra PE",
      poles: 1,
      modules: 8,
      kind: "bus-pe",
      defaultAmps: 63,
      image: "bus-pe.png",
      thumb: "bus-pe-thumb.png",
      terminals: Array.from({ length: 8 }, (_, i) => ({
        id: `pe${i + 1}`,
        side: "bottom",
        type: "PE",
        label: `PE${i + 1}`,
      })),
    },
  ];

  const CABLES = [
    { id: "cable-l1", type: "L1", name: "Cabo Fase L1", image: "cable-l1.png", color: WIRE_COLORS.L1 },
    { id: "cable-l2", type: "L2", name: "Cabo Fase L2", image: "cable-l2.png", color: WIRE_COLORS.L2 },
    { id: "cable-l3", type: "L3", name: "Cabo Fase L3", image: "cable-l3.png", color: WIRE_COLORS.L3 },
    { id: "cable-n", type: "N", name: "Cabo Neutro", image: "cable-n.png", color: WIRE_COLORS.N },
    { id: "cable-pe", type: "PE", name: "Cabo Terra", image: "cable-pe.png", color: WIRE_COLORS.PE },
  ];

  const state = {
    mode: "select",
    components: [],
    wires: [],
    selectedId: null,
    selectedWireId: null,
    pendingTerminal: null,
    forcedWireType: null,
    drag: null,
    history: [],
    future: [],
    nextId: 1,
  };

  const svg = document.getElementById("panel-svg");
  const railsLayer = document.getElementById("rails-layer");
  const componentsLayer = document.getElementById("components-layer");
  const wiresLayer = document.getElementById("wires-layer");
  const previewWire = document.getElementById("preview-wire");
  const terminalsOverlay = document.getElementById("terminals-overlay");
  const statusText = document.getElementById("status-text");
  const countText = document.getElementById("count-text");
  const inspectorEmpty = document.getElementById("inspector-empty");
  const inspectorForm = document.getElementById("inspector-form");
  const toastEl = document.getElementById("toast");
  const activeCableEl = document.getElementById("active-cable");
  const activeCableSwatch = document.getElementById("active-cable-swatch");
  const activeCableLabel = document.getElementById("active-cable-label");

  function uid(prefix) {
    return `${prefix}-${state.nextId++}`;
  }

  function catalogById(id) {
    return CATALOG.find((c) => c.id === id);
  }

  function cloneState() {
    return {
      components: structuredClone(state.components),
      wires: structuredClone(state.wires),
      nextId: state.nextId,
    };
  }

  function pushHistory() {
    state.history.push(cloneState());
    if (state.history.length > 60) state.history.shift();
    state.future = [];
  }

  function restoreSnapshot(snap) {
    state.components = structuredClone(snap.components);
    state.wires = structuredClone(snap.wires);
    state.nextId = snap.nextId;
    state.selectedId = null;
    state.selectedWireId = null;
    state.pendingTerminal = null;
    render();
  }

  function undo() {
    if (!state.history.length) return;
    state.future.push(cloneState());
    restoreSnapshot(state.history.pop());
    toast("Desfeito");
  }

  function redo() {
    if (!state.future.length) return;
    state.history.push(cloneState());
    restoreSnapshot(state.future.pop());
    toast("Refeito");
  }

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  function updateCableUI() {
    document.querySelectorAll(".cable-item").forEach((el) => {
      el.dataset.active = String(el.dataset.wireType === state.forcedWireType);
    });
    if (state.forcedWireType) {
      activeCableEl.hidden = false;
      activeCableSwatch.style.background =
        state.forcedWireType === "PE"
          ? "repeating-linear-gradient(90deg,#f5d76e 0 4px,#2f9e44 4px 8px)"
          : WIRE_COLORS[state.forcedWireType];
      activeCableLabel.textContent = `Cabo ativo: ${WIRE_LABELS[state.forcedWireType]}`;
    } else {
      activeCableEl.hidden = true;
    }
  }

  function setMode(mode) {
    state.mode = mode;
    state.pendingTerminal = null;
    previewWire.innerHTML = "";
    if (mode !== "wire") state.forcedWireType = null;
    document.getElementById("btn-select").dataset.active = String(mode === "select");
    document.getElementById("btn-wire").dataset.active = String(mode === "wire");
    statusText.textContent =
      mode === "wire"
        ? state.forcedWireType
          ? `Cabo ${WIRE_LABELS[state.forcedWireType]} — clique em dois terminais`
          : "Modo fiação — escolha um cabo no menu ou clique em terminais"
        : "Modo mover — arraste componentes no trilho";
    updateCableUI();
    renderTerminals();
  }

  function selectCable(type) {
    state.forcedWireType = type;
    setMode("wire");
    toast(`${WIRE_LABELS[type]} selecionado`);
  }

  function snapToRail(y) {
    let best = RAIL_Y[0];
    let bestDist = Infinity;
    for (const ry of RAIL_Y) {
      const d = Math.abs(y - ry);
      if (d < bestDist) {
        bestDist = d;
        best = ry;
      }
    }
    return best;
  }

  function snapX(x, modules) {
    const width = modules * MODULE_WIDTH;
    const min = 40;
    const max = PANEL_W - 40 - width;
    const stepped = Math.round((x - min) / MODULE_WIDTH) * MODULE_WIDTH + min;
    return Math.max(min, Math.min(max, stepped));
  }

  function overlaps(comp, x, railY, ignoreId) {
    const width = catalogById(comp.typeId).modules * MODULE_WIDTH;
    for (const other of state.components) {
      if (other.id === ignoreId || other.id === comp.id) continue;
      if (other.railY !== railY) continue;
      const ow = catalogById(other.typeId).modules * MODULE_WIDTH;
      if (x < other.x + ow && x + width > other.x) return true;
    }
    return false;
  }

  function findFreeSlot(typeId, preferredRail = RAIL_Y[0]) {
    const cat = catalogById(typeId);
    for (const railY of [preferredRail, ...RAIL_Y.filter((y) => y !== preferredRail)]) {
      for (let x = 40; x <= PANEL_W - 40 - cat.modules * MODULE_WIDTH; x += MODULE_WIDTH) {
        const probe = { id: "__probe", typeId, x, railY };
        if (!overlaps(probe, x, railY, null)) return { x, railY };
      }
    }
    return { x: 40, railY: preferredRail };
  }

  function addComponent(typeId, at = null, { silent = false } = {}) {
    const cat = catalogById(typeId);
    if (!cat) return null;
    if (!silent) pushHistory();
    const slot = at
      ? { x: snapX(at.x, cat.modules), railY: snapToRail(at.y) }
      : findFreeSlot(typeId);
    if (overlaps({ id: "__new", typeId }, slot.x, slot.railY, null)) {
      const free = findFreeSlot(typeId, slot.railY);
      slot.x = free.x;
      slot.railY = free.railY;
    }
    const count = state.components.filter((c) => c.typeId === typeId).length + 1;
    const comp = {
      id: uid("c"),
      typeId,
      x: slot.x,
      railY: slot.railY,
      amps: cat.defaultAmps,
      curve: "C",
      label: `${cat.short} ${count}`,
    };
    state.components.push(comp);
    state.selectedId = comp.id;
    state.selectedWireId = null;
    if (!silent) {
      render();
      toast(`${cat.name} adicionado`);
    }
    return comp;
  }

  function deleteSelected() {
    if (state.selectedWireId) {
      pushHistory();
      state.wires = state.wires.filter((w) => w.id !== state.selectedWireId);
      state.selectedWireId = null;
      render();
      toast("Cabo removido");
      return;
    }
    if (!state.selectedId) return;
    pushHistory();
    const id = state.selectedId;
    state.components = state.components.filter((c) => c.id !== id);
    state.wires = state.wires.filter((w) => w.from.compId !== id && w.to.compId !== id);
    state.selectedId = null;
    render();
    toast("Componente removido");
  }

  function clearPanel() {
    if (!state.components.length && !state.wires.length) return;
    pushHistory();
    state.components = [];
    state.wires = [];
    state.selectedId = null;
    state.selectedWireId = null;
    state.pendingTerminal = null;
    render();
    toast("Quadro limpo");
  }

  function terminalWorldPos(compId, terminalId) {
    const comp = state.components.find((c) => c.id === compId);
    if (!comp) return null;
    const cat = catalogById(comp.typeId);
    const term = cat.terminals.find((t) => t.id === terminalId);
    if (!term) return null;
    const list = cat.terminals.filter((t) => t.side === term.side);
    const idx = list.findIndex((t) => t.id === terminalId);
    const width = cat.modules * MODULE_WIDTH;
    const spacing = width / (list.length + 1);
    const x = comp.x + spacing * (idx + 1);
    const y = term.side === "top" ? comp.railY - 52 : comp.railY + 52;
    return { x, y, type: term.type, side: term.side };
  }

  function wirePath(a, b) {
    const midY = (a.y + b.y) / 2;
    const bend = Math.abs(a.y - b.y) < 20 ? 28 : 0;
    if (bend) {
      return `M ${a.x} ${a.y} C ${a.x} ${a.y + bend}, ${b.x} ${b.y + bend}, ${b.x} ${b.y}`;
    }
    return `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`;
  }

  function tryConnect(from, to) {
    if (from.compId === to.compId && from.terminalId === to.terminalId) return;
    const a = terminalWorldPos(from.compId, from.terminalId);
    const b = terminalWorldPos(to.compId, to.terminalId);
    if (!a || !b) return;

    if (state.forcedWireType) {
      if (a.type !== state.forcedWireType || b.type !== state.forcedWireType) {
        toast(`Use terminais ${state.forcedWireType} com este cabo`);
        return;
      }
    } else if (a.type !== b.type) {
      toast(`Tipos incompatíveis: ${a.type} ≠ ${b.type}`);
      return;
    }

    const wireType = state.forcedWireType || a.type;
    const exists = state.wires.some(
      (w) =>
        (w.from.compId === from.compId &&
          w.from.terminalId === from.terminalId &&
          w.to.compId === to.compId &&
          w.to.terminalId === to.terminalId) ||
        (w.from.compId === to.compId &&
          w.from.terminalId === to.terminalId &&
          w.to.compId === from.compId &&
          w.to.terminalId === from.terminalId)
    );
    if (exists) {
      toast("Essa ligação já existe");
      return;
    }
    pushHistory();
    state.wires.push({
      id: uid("w"),
      type: wireType,
      from: { ...from },
      to: { ...to },
    });
    state.pendingTerminal = null;
    previewWire.innerHTML = "";
    render();
    toast(`Cabo ${WIRE_LABELS[wireType]} conectado`);
  }

  function drawRails() {
    railsLayer.innerHTML = "";
    RAIL_Y.forEach((y, i) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const rail = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rail.setAttribute("x", "28");
      rail.setAttribute("y", String(y - 8));
      rail.setAttribute("width", String(PANEL_W - 56));
      rail.setAttribute("height", "16");
      rail.setAttribute("rx", "2");
      rail.setAttribute("fill", "#7a8494");
      rail.setAttribute("stroke", "#5a6472");
      rail.setAttribute("stroke-width", "1");

      const groove = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      groove.setAttribute("x", "28");
      groove.setAttribute("y", String(y - 2));
      groove.setAttribute("width", String(PANEL_W - 56));
      groove.setAttribute("height", "4");
      groove.setAttribute("fill", "#4e5764");

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", "32");
      label.setAttribute("y", String(y - 16));
      label.setAttribute("fill", "#6d7785");
      label.setAttribute("font-size", "11");
      label.setAttribute("font-family", "Outfit, sans-serif");
      label.textContent = `Trilho DIN ${i + 1}`;

      g.append(rail, groove, label);
      railsLayer.appendChild(g);
    });
  }

  function componentVisual(comp) {
    const cat = catalogById(comp.typeId);
    const w = cat.modules * MODULE_WIDTH;
    const h = 104;
    const x = comp.x;
    const y = comp.railY - h / 2;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("component-group");
    g.dataset.id = comp.id;
    if (state.selectedId === comp.id) g.classList.add("selected");
    g.setAttribute("transform", `translate(${x}, ${y})`);
    g.setAttribute("filter", "url(#soft-shadow)");

    const hit = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    hit.classList.add("comp-body");
    hit.setAttribute("width", String(w));
    hit.setAttribute("height", String(h));
    hit.setAttribute("rx", "4");
    hit.setAttribute("fill", "transparent");
    hit.setAttribute("stroke", state.selectedId === comp.id ? "#e08a3c" : "transparent");
    hit.setAttribute("stroke-width", "2.2");

    const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
    image.setAttribute("href", ASSET(cat.image));
    image.setAttributeNS("http://www.w3.org/1999/xlink", "href", ASSET(cat.image));
    image.setAttribute("width", String(w));
    image.setAttribute("height", String(h));
    image.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const tag = document.createElementNS("http://www.w3.org/2000/svg", "text");
    tag.setAttribute("x", String(w / 2));
    tag.setAttribute("y", String(h + 13));
    tag.setAttribute("text-anchor", "middle");
    tag.setAttribute("fill", "#3d4654");
    tag.setAttribute("font-size", "10");
    tag.setAttribute("font-family", "Outfit, sans-serif");
    tag.textContent = comp.label;

    g.append(image, hit, tag);
    g.addEventListener("pointerdown", onComponentPointerDown);
    return g;
  }

  function renderWires() {
    wiresLayer.innerHTML = "";
    for (const wire of state.wires) {
      const a = terminalWorldPos(wire.from.compId, wire.from.terminalId);
      const b = terminalWorldPos(wire.to.compId, wire.to.terminalId);
      if (!a || !b) continue;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", wirePath(a, b));
      path.setAttribute("stroke", WIRE_COLORS[wire.type] || "#333");
      path.setAttribute("stroke-width", wire.type === "PE" ? "4" : "3.2");
      if (wire.type === "PE") path.setAttribute("stroke-dasharray", "8 4");
      path.classList.add("wire-path");
      if (state.selectedWireId === wire.id) path.classList.add("selected");
      path.dataset.wireId = wire.id;
      path.addEventListener("click", (e) => {
        e.stopPropagation();
        state.selectedWireId = wire.id;
        state.selectedId = null;
        updateInspector();
        renderWires();
        renderComponents();
      });
      wiresLayer.appendChild(path);
    }
  }

  function renderTerminals() {
    terminalsOverlay.innerHTML = "";
    if (state.mode !== "wire") return;
    for (const comp of state.components) {
      const cat = catalogById(comp.typeId);
      for (const term of cat.terminals) {
        if (state.forcedWireType && term.type !== state.forcedWireType) continue;
        const pos = terminalWorldPos(comp.id, term.id);
        if (!pos) continue;
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", String(pos.x));
        circle.setAttribute("cy", String(pos.y));
        circle.setAttribute("r", "4.5");
        circle.setAttribute(
          "fill",
          term.type === "PE" ? "#2f9e44" : term.type === "N" ? "#1e88e5" : term.type === "L2" ? "#c62828" : term.type === "L3" ? "#8d6e63" : "#222"
        );
        circle.setAttribute("stroke", "#fff");
        circle.setAttribute("stroke-width", "1.5");
        circle.classList.add("terminal");
        if (
          state.pendingTerminal &&
          state.pendingTerminal.compId === comp.id &&
          state.pendingTerminal.terminalId === term.id
        ) {
          circle.classList.add("hot");
          circle.setAttribute("r", "6.5");
          circle.setAttribute("stroke", "#e08a3c");
        }
        circle.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          e.preventDefault();
          onTerminalClick(comp.id, term.id);
        });
        terminalsOverlay.appendChild(circle);
      }
    }
  }

  function renderComponents() {
    componentsLayer.innerHTML = "";
    for (const comp of state.components) {
      componentsLayer.appendChild(componentVisual(comp));
    }
  }

  function updateInspector() {
    const comp = state.components.find((c) => c.id === state.selectedId);
    if (!comp) {
      inspectorEmpty.hidden = false;
      inspectorForm.hidden = true;
      return;
    }
    const cat = catalogById(comp.typeId);
    inspectorEmpty.hidden = true;
    inspectorForm.hidden = false;
    document.getElementById("prop-label").value = comp.label;
    document.getElementById("prop-type").value = cat.name;
    const amps = document.getElementById("prop-amps");
    amps.innerHTML = AMPS.map(
      (a) => `<option value="${a}" ${a === comp.amps ? "selected" : ""}>${a} A</option>`
    ).join("");
    document.getElementById("prop-curve").value = comp.curve;
    const curveLabel = document.getElementById("prop-curve").closest("label");
    curveLabel.style.display = cat.kind.startsWith("bus") || cat.kind === "dps" ? "none" : "";
  }

  function updateCounts() {
    countText.textContent = `${state.components.length} componentes · ${state.wires.length} cabos`;
  }

  function render() {
    drawRails();
    renderWires();
    renderComponents();
    renderTerminals();
    updateInspector();
    updateCounts();
  }

  function svgPoint(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return pt.matrixTransform(ctm.inverse());
  }

  function onComponentPointerDown(evt) {
    if (state.mode === "wire") return;
    evt.stopPropagation();
    const id = evt.currentTarget.dataset.id;
    const comp = state.components.find((c) => c.id === id);
    if (!comp) return;
    state.selectedId = id;
    state.selectedWireId = null;
    updateInspector();
    renderComponents();

    const start = svgPoint(evt);
    state.drag = {
      id,
      offsetX: start.x - comp.x,
      offsetY: start.y - comp.railY,
      moved: false,
      origin: { x: comp.x, railY: comp.railY },
    };
    evt.currentTarget.classList.add("dragging");
    evt.currentTarget.setPointerCapture?.(evt.pointerId);
  }

  function onPointerMove(evt) {
    if (state.drag) {
      const comp = state.components.find((c) => c.id === state.drag.id);
      if (!comp) return;
      const p = svgPoint(evt);
      const cat = catalogById(comp.typeId);
      let x = snapX(p.x - state.drag.offsetX, cat.modules);
      let railY = snapToRail(p.y - state.drag.offsetY);
      if (overlaps(comp, x, railY, comp.id)) {
        if (!overlaps(comp, comp.x, railY, comp.id)) x = comp.x;
        else if (!overlaps(comp, x, comp.railY, comp.id)) railY = comp.railY;
        else {
          x = comp.x;
          railY = comp.railY;
        }
      }
      if (x !== comp.x || railY !== comp.railY) state.drag.moved = true;
      comp.x = x;
      comp.railY = railY;
      renderWires();
      renderComponents();
      renderTerminals();
      return;
    }

    if (state.mode === "wire" && state.pendingTerminal) {
      const a = terminalWorldPos(state.pendingTerminal.compId, state.pendingTerminal.terminalId);
      if (!a) return;
      const p = svgPoint(evt);
      const color = WIRE_COLORS[state.forcedWireType || a.type] || "#333";
      previewWire.innerHTML = "";
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", wirePath(a, p));
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", "2.5");
      path.setAttribute("stroke-dasharray", "6 4");
      path.setAttribute("fill", "none");
      path.setAttribute("opacity", "0.75");
      previewWire.appendChild(path);
    }
  }

  function onPointerUp() {
    if (!state.drag) return;
    const drag = state.drag;
    state.drag = null;
    if (drag.moved) {
      const comp = state.components.find((c) => c.id === drag.id);
      if (comp && (comp.x !== drag.origin.x || comp.railY !== drag.origin.railY)) {
        const current = { x: comp.x, railY: comp.railY };
        comp.x = drag.origin.x;
        comp.railY = drag.origin.railY;
        pushHistory();
        comp.x = current.x;
        comp.railY = current.railY;
      }
    }
    render();
  }

  function onTerminalClick(compId, terminalId) {
    if (!state.pendingTerminal) {
      state.pendingTerminal = { compId, terminalId };
      renderTerminals();
      statusText.textContent = "Selecione o terminal de destino";
      return;
    }
    tryConnect(state.pendingTerminal, { compId, terminalId });
  }

  function buildPalette() {
    const groups = {
      breakers: document.getElementById("palette-breakers"),
      dr: document.getElementById("palette-dr"),
      dps: document.getElementById("palette-dps"),
      bus: document.getElementById("palette-bus"),
    };

    for (const item of CATALOG) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "palette-item";
      btn.draggable = true;
      btn.dataset.typeId = item.id;
      btn.innerHTML = `
        <span class="thumb photo"><img src="${ASSET(item.thumb || item.image)}" alt=""></span>
        <span>
          <strong>${item.name}</strong>
          <small>${item.modules} mód. · ${item.poles}P · ${item.defaultAmps}A</small>
        </span>
      `;
      btn.addEventListener("click", () => addComponent(item.id));
      btn.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/typeId", item.id);
        e.dataTransfer.effectAllowed = "copy";
      });
      groups[item.group].appendChild(btn);
    }

    const cableGrid = document.getElementById("palette-cables");
    for (const cable of CABLES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "palette-item cable-item";
      btn.dataset.wireType = cable.type;
      btn.innerHTML = `
        <span class="thumb photo"><img src="${ASSET(cable.image)}" alt=""></span>
        <span>
          <strong>${cable.name}</strong>
          <small>Ligar terminais ${cable.type}</small>
        </span>
      `;
      btn.addEventListener("click", () => selectCable(cable.type));
      cableGrid.appendChild(btn);
    }
  }

  function setupTabs() {
    document.querySelectorAll(".palette-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const id = tab.dataset.tab;
        document.querySelectorAll(".palette-tab").forEach((t) => {
          t.dataset.active = String(t === tab);
        });
        document.querySelectorAll(".palette-panel").forEach((panel) => {
          const on = panel.id === `tab-${id}`;
          panel.hidden = !on;
          panel.dataset.active = String(on);
        });
      });
    });
  }

  function exportProject() {
    const payload = {
      version: 2,
      name: "MontaQuadro",
      createdAt: new Date().toISOString(),
      components: state.components,
      wires: state.wires,
      nextId: state.nextId,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `montaquadro-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Projeto exportado");
  }

  function importProject(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.components) || !Array.isArray(data.wires)) {
          throw new Error("Formato inválido");
        }
        pushHistory();
        state.components = data.components;
        state.wires = data.wires;
        state.nextId = data.nextId || state.components.length + state.wires.length + 1;
        state.selectedId = null;
        state.selectedWireId = null;
        render();
        toast("Projeto importado");
      } catch {
        toast("Não foi possível importar o arquivo");
      }
    };
    reader.readAsText(file);
  }

  function seedDemo() {
    const general = addComponent("mcb-3p-32", null, { silent: true });
    const dr = addComponent("dr-2p-40", null, { silent: true });
    const c1 = addComponent("mcb-1p-16", null, { silent: true });
    const c2 = addComponent("mcb-1p-10", null, { silent: true });
    const dps = addComponent("dps-3p", null, { silent: true });
    const busN = addComponent("bus-n", { x: 40, y: RAIL_Y[2] }, { silent: true });
    const busPE = addComponent("bus-pe", { x: 220, y: RAIL_Y[2] }, { silent: true });

    if (general && dr && c1 && c2 && busN) {
      state.wires.push(
        {
          id: uid("w"),
          type: "L1",
          from: { compId: general.id, terminalId: "out-l1" },
          to: { compId: dr.id, terminalId: "in-l" },
        },
        {
          id: uid("w"),
          type: "L1",
          from: { compId: dr.id, terminalId: "out-l" },
          to: { compId: c1.id, terminalId: "in" },
        },
        {
          id: uid("w"),
          type: "L1",
          from: { compId: dr.id, terminalId: "out-l" },
          to: { compId: c2.id, terminalId: "in" },
        },
        {
          id: uid("w"),
          type: "N",
          from: { compId: dr.id, terminalId: "out-n" },
          to: { compId: busN.id, terminalId: "n1" },
        }
      );
      if (dps && busPE) {
        state.wires.push({
          id: uid("w"),
          type: "PE",
          from: { compId: dps.id, terminalId: "pe" },
          to: { compId: busPE.id, terminalId: "pe1" },
        });
      }
    }

    state.selectedId = null;
    state.history = [];
    state.future = [];
  }

  document.getElementById("btn-undo").addEventListener("click", undo);
  document.getElementById("btn-redo").addEventListener("click", redo);
  document.getElementById("btn-wire").addEventListener("click", () => setMode("wire"));
  document.getElementById("btn-select").addEventListener("click", () => setMode("select"));
  document.getElementById("btn-clear").addEventListener("click", clearPanel);
  document.getElementById("btn-export").addEventListener("click", exportProject);
  document.getElementById("btn-delete-comp").addEventListener("click", deleteSelected);
  document.getElementById("import-file").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importProject(file);
    e.target.value = "";
  });

  document.getElementById("prop-label").addEventListener("change", (e) => {
    const comp = state.components.find((c) => c.id === state.selectedId);
    if (!comp) return;
    pushHistory();
    comp.label = e.target.value.trim() || comp.label;
    render();
  });
  document.getElementById("prop-amps").addEventListener("change", (e) => {
    const comp = state.components.find((c) => c.id === state.selectedId);
    if (!comp) return;
    pushHistory();
    comp.amps = Number(e.target.value);
    render();
  });
  document.getElementById("prop-curve").addEventListener("change", (e) => {
    const comp = state.components.find((c) => c.id === state.selectedId);
    if (!comp) return;
    pushHistory();
    comp.curve = e.target.value;
    render();
  });

  svg.setAttribute("viewBox", `0 0 ${PANEL_W} ${PANEL_H}`);
  svg.addEventListener("pointermove", onPointerMove);
  svg.addEventListener("pointerup", onPointerUp);
  svg.addEventListener("pointerleave", onPointerUp);
  svg.addEventListener("click", () => {
    if (state.mode === "select") {
      state.selectedId = null;
      state.selectedWireId = null;
      updateInspector();
      renderComponents();
      renderWires();
    }
  });

  svg.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });
  svg.addEventListener("drop", (e) => {
    e.preventDefault();
    const typeId = e.dataTransfer.getData("text/typeId");
    if (!typeId) return;
    addComponent(typeId, svgPoint(e));
  });

  window.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      deleteSelected();
    } else if (e.key.toLowerCase() === "w") setMode("wire");
    else if (e.key.toLowerCase() === "v") setMode("select");
    else if (e.key === "Escape") {
      state.pendingTerminal = null;
      previewWire.innerHTML = "";
      setMode("select");
    }
  });

  buildPalette();
  setupTabs();
  seedDemo();
  setMode("select");
  render();
})();
