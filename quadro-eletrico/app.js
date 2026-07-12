(() => {
  "use strict";

  const MODULE_WIDTH = 18;
  const RAIL_Y = [70, 210, 350];
  const PANEL_W = 920;
  const PANEL_H = 520;
  const AMPS = [6, 10, 16, 20, 25, 32, 40, 50, 63];

  const WIRE_COLORS = {
    L1: "#1a1a1a",
    L2: "#c62828",
    L3: "#8d6e63",
    N: "#1e88e5",
    PE: "#2f9e44",
  };

  const CATALOG = [
    {
      id: "mcb1",
      group: "breakers",
      name: "Disjuntor 1P",
      short: "MCB 1P",
      poles: 1,
      modules: 1,
      kind: "mcb",
      defaultAmps: 16,
      terminals: [
        { id: "in", side: "top", type: "L1", label: "In" },
        { id: "out", side: "bottom", type: "L1", label: "Out" },
      ],
    },
    {
      id: "mcb2",
      group: "breakers",
      name: "Disjuntor 2P",
      short: "MCB 2P",
      poles: 2,
      modules: 2,
      kind: "mcb",
      defaultAmps: 25,
      terminals: [
        { id: "in-l", side: "top", type: "L1", label: "L" },
        { id: "in-n", side: "top", type: "N", label: "N" },
        { id: "out-l", side: "bottom", type: "L1", label: "L" },
        { id: "out-n", side: "bottom", type: "N", label: "N" },
      ],
    },
    {
      id: "mcb3",
      group: "breakers",
      name: "Disjuntor 3P",
      short: "MCB 3P",
      poles: 3,
      modules: 3,
      kind: "mcb",
      defaultAmps: 32,
      terminals: [
        { id: "in-l1", side: "top", type: "L1", label: "L1" },
        { id: "in-l2", side: "top", type: "L2", label: "L2" },
        { id: "in-l3", side: "top", type: "L3", label: "L3" },
        { id: "out-l1", side: "bottom", type: "L1", label: "L1" },
        { id: "out-l2", side: "bottom", type: "L2", label: "L2" },
        { id: "out-l3", side: "bottom", type: "L3", label: "L3" },
      ],
    },
    {
      id: "mcb4",
      group: "breakers",
      name: "Disjuntor 4P",
      short: "MCB 4P",
      poles: 4,
      modules: 4,
      kind: "mcb",
      defaultAmps: 40,
      terminals: [
        { id: "in-l1", side: "top", type: "L1", label: "L1" },
        { id: "in-l2", side: "top", type: "L2", label: "L2" },
        { id: "in-l3", side: "top", type: "L3", label: "L3" },
        { id: "in-n", side: "top", type: "N", label: "N" },
        { id: "out-l1", side: "bottom", type: "L1", label: "L1" },
        { id: "out-l2", side: "bottom", type: "L2", label: "L2" },
        { id: "out-l3", side: "bottom", type: "L3", label: "L3" },
        { id: "out-n", side: "bottom", type: "N", label: "N" },
      ],
    },
    {
      id: "idr2",
      group: "protection",
      name: "IDR 2P",
      short: "IDR 2P",
      poles: 2,
      modules: 2,
      kind: "idr",
      defaultAmps: 40,
      terminals: [
        { id: "in-l", side: "top", type: "L1", label: "L" },
        { id: "in-n", side: "top", type: "N", label: "N" },
        { id: "out-l", side: "bottom", type: "L1", label: "L" },
        { id: "out-n", side: "bottom", type: "N", label: "N" },
      ],
    },
    {
      id: "idr4",
      group: "protection",
      name: "IDR 4P",
      short: "IDR 4P",
      poles: 4,
      modules: 4,
      kind: "idr",
      defaultAmps: 40,
      terminals: [
        { id: "in-l1", side: "top", type: "L1", label: "L1" },
        { id: "in-l2", side: "top", type: "L2", label: "L2" },
        { id: "in-l3", side: "top", type: "L3", label: "L3" },
        { id: "in-n", side: "top", type: "N", label: "N" },
        { id: "out-l1", side: "bottom", type: "L1", label: "L1" },
        { id: "out-l2", side: "bottom", type: "L2", label: "L2" },
        { id: "out-l3", side: "bottom", type: "L3", label: "L3" },
        { id: "out-n", side: "bottom", type: "N", label: "N" },
      ],
    },
    {
      id: "dps",
      group: "protection",
      name: "DPS",
      short: "DPS",
      poles: 3,
      modules: 3,
      kind: "dps",
      defaultAmps: 20,
      terminals: [
        { id: "l1", side: "top", type: "L1", label: "L1" },
        { id: "l2", side: "top", type: "L2", label: "L2" },
        { id: "l3", side: "top", type: "L3", label: "L3" },
        { id: "pe", side: "bottom", type: "PE", label: "PE" },
      ],
    },
    {
      id: "bus-n",
      group: "bus",
      name: "Barramento Neutro",
      short: "Barra N",
      poles: 1,
      modules: 8,
      kind: "bus-n",
      defaultAmps: 63,
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
      terminals: Array.from({ length: 8 }, (_, i) => ({
        id: `pe${i + 1}`,
        side: "bottom",
        type: "PE",
        label: `PE${i + 1}`,
      })),
    },
  ];

  const state = {
    mode: "select",
    components: [],
    wires: [],
    selectedId: null,
    selectedWireId: null,
    pendingTerminal: null,
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
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("show");
    }, 1800);
  }

  function setMode(mode) {
    state.mode = mode;
    state.pendingTerminal = null;
    previewWire.innerHTML = "";
    document.getElementById("btn-select").dataset.active = String(mode === "select");
    document.getElementById("btn-wire").dataset.active = String(mode === "wire");
    statusText.textContent =
      mode === "wire"
        ? "Modo fiação — clique em dois terminais para ligar"
        : "Modo mover — arraste componentes no trilho";
    renderTerminals();
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
        if (!overlaps(probe, x, railY, null)) {
          return { x, railY };
        }
      }
    }
    return { x: 40, railY: preferredRail };
  }

  function addComponent(typeId, at = null, { silent = false } = {}) {
    const cat = catalogById(typeId);
    if (!cat) return null;
    if (!silent) pushHistory();
    const slot = at
      ? {
          x: snapX(at.x, cat.modules),
          railY: snapToRail(at.y),
        }
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
    const terms = cat.terminals.filter((t) => t.side === "top" || t.side === "bottom");
    const top = cat.terminals.filter((t) => t.side === "top");
    const bottom = cat.terminals.filter((t) => t.side === "bottom");
    const term = cat.terminals.find((t) => t.id === terminalId);
    if (!term) return null;
    const list = term.side === "top" ? top : bottom;
    const idx = list.findIndex((t) => t.id === terminalId);
    const width = cat.modules * MODULE_WIDTH;
    const spacing = width / (list.length + 1);
    const x = comp.x + spacing * (idx + 1);
    const y = term.side === "top" ? comp.railY - 48 : comp.railY + 48;
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
    if (a.type !== b.type) {
      toast(`Tipos incompatíveis: ${a.type} ≠ ${b.type}`);
      return;
    }
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
      type: a.type,
      from: { ...from },
      to: { ...to },
    });
    state.pendingTerminal = null;
    previewWire.innerHTML = "";
    render();
    toast(`Cabo ${a.type} conectado`);
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
    const h = 96;
    const x = comp.x;
    const y = comp.railY - h / 2;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("component-group");
    g.dataset.id = comp.id;
    if (state.selectedId === comp.id) g.classList.add("selected");
    g.setAttribute("transform", `translate(${x}, ${y})`);
    g.setAttribute("filter", "url(#soft-shadow)");

    const body = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    body.classList.add("comp-body");
    body.setAttribute("width", String(w));
    body.setAttribute("height", String(h));
    body.setAttribute("rx", "4");
    body.setAttribute("fill", cat.kind.startsWith("bus") ? "#f4c430" : "#f7f8fa");
    body.setAttribute("stroke", "#9aa3af");
    body.setAttribute("stroke-width", "1.2");
    g.appendChild(body);

    if (cat.kind === "bus-pe") {
      body.setAttribute("fill", "url(#earth-stripe)");
    } else if (cat.kind === "bus-n") {
      body.setAttribute("fill", "#42a5f5");
      body.setAttribute("stroke", "#1e88e5");
    }

    if (!cat.kind.startsWith("bus")) {
      for (let i = 0; i < cat.poles; i++) {
        const pw = w / cat.poles;
        if (i > 0) {
          const divider = document.createElementNS("http://www.w3.org/2000/svg", "line");
          divider.setAttribute("x1", String(pw * i));
          divider.setAttribute("x2", String(pw * i));
          divider.setAttribute("y1", "8");
          divider.setAttribute("y2", String(h - 8));
          divider.setAttribute("stroke", "#c5ccd6");
          divider.setAttribute("stroke-width", "1");
          g.appendChild(divider);
        }

        const lever = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        lever.setAttribute("x", String(pw * i + pw * 0.28));
        lever.setAttribute("y", "28");
        lever.setAttribute("width", String(pw * 0.44));
        lever.setAttribute("height", "22");
        lever.setAttribute("rx", "3");
        lever.setAttribute("fill", cat.kind === "idr" ? "#c62828" : "#2b2f36");
        g.appendChild(lever);

        if (cat.kind === "dps") {
          lever.setAttribute("fill", "#fb8c00");
        }
      }

      const brand = document.createElementNS("http://www.w3.org/2000/svg", "text");
      brand.setAttribute("x", String(w / 2));
      brand.setAttribute("y", "18");
      brand.setAttribute("text-anchor", "middle");
      brand.setAttribute("fill", "#5a6472");
      brand.setAttribute("font-size", "8");
      brand.setAttribute("font-family", "Outfit, sans-serif");
      brand.textContent = cat.kind === "idr" ? "IDR" : cat.kind === "dps" ? "DPS" : "MCB";
      g.appendChild(brand);

      const rating = document.createElementNS("http://www.w3.org/2000/svg", "text");
      rating.setAttribute("x", String(w / 2));
      rating.setAttribute("y", String(h - 14));
      rating.setAttribute("text-anchor", "middle");
      rating.setAttribute("fill", "#1a2330");
      rating.setAttribute("font-size", "10");
      rating.setAttribute("font-weight", "700");
      rating.setAttribute("font-family", "Outfit, sans-serif");
      rating.textContent =
        cat.kind === "idr"
          ? `${comp.curve}${comp.amps}A 30mA`
          : cat.kind === "dps"
            ? "Classe II"
            : `${comp.curve}${comp.amps}A`;
      g.appendChild(rating);
    } else {
      const busLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      busLabel.setAttribute("x", String(w / 2));
      busLabel.setAttribute("y", String(h / 2 + 4));
      busLabel.setAttribute("text-anchor", "middle");
      busLabel.setAttribute("fill", cat.kind === "bus-n" ? "#fff" : "#1a2330");
      busLabel.setAttribute("font-size", "12");
      busLabel.setAttribute("font-weight", "700");
      busLabel.setAttribute("font-family", "Outfit, sans-serif");
      busLabel.textContent = cat.kind === "bus-n" ? "NEUTRO" : "TERRA";
      g.appendChild(busLabel);
    }

    const tag = document.createElementNS("http://www.w3.org/2000/svg", "text");
    tag.setAttribute("x", String(w / 2));
    tag.setAttribute("y", String(h + 14));
    tag.setAttribute("text-anchor", "middle");
    tag.setAttribute("fill", "#3d4654");
    tag.setAttribute("font-size", "10");
    tag.setAttribute("font-family", "Outfit, sans-serif");
    tag.textContent = comp.label;
    g.appendChild(tag);

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
      path.setAttribute("stroke-width", wire.type === "PE" ? "4" : "3");
      if (wire.type === "PE") {
        path.setAttribute("stroke-dasharray", "8 4");
      }
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
        const pos = terminalWorldPos(comp.id, term.id);
        if (!pos) continue;
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", String(pos.x));
        circle.setAttribute("cy", String(pos.y));
        circle.setAttribute("r", "4");
        circle.setAttribute(
          "fill",
          term.type === "PE" ? "#2f9e44" : term.type === "N" ? "#1e88e5" : "#222"
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
          circle.setAttribute("r", "6");
          circle.setAttribute("stroke", "#e08a3c");
        }
        circle.dataset.compId = comp.id;
        circle.dataset.terminalId = term.id;
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
        // keep previous if overlap at new slot; still allow vertical rail change when free
        if (!overlaps(comp, comp.x, railY, comp.id)) {
          railY = railY;
          x = comp.x;
        } else if (!overlaps(comp, x, comp.railY, comp.id)) {
          railY = comp.railY;
        } else {
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
      previewWire.innerHTML = "";
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", wirePath(a, p));
      path.setAttribute("stroke", WIRE_COLORS[a.type] || "#333");
      path.setAttribute("stroke-width", "2.5");
      path.setAttribute("stroke-dasharray", "6 4");
      path.setAttribute("fill", "none");
      path.setAttribute("opacity", "0.7");
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
        // history was not pushed during drag — push with previous restored then current
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
      protection: document.getElementById("palette-protection"),
      bus: document.getElementById("palette-bus"),
    };
    for (const item of CATALOG) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "palette-item";
      btn.draggable = true;
      btn.dataset.typeId = item.id;
      btn.innerHTML = `
        <span class="thumb">${paletteThumb(item)}</span>
        <span>
          <strong>${item.name}</strong>
          <small>${item.modules} módulo${item.modules > 1 ? "s" : ""} · ${item.poles}P</small>
        </span>
      `;
      btn.addEventListener("click", () => addComponent(item.id));
      btn.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/typeId", item.id);
        e.dataTransfer.effectAllowed = "copy";
      });
      groups[item.group].appendChild(btn);
    }
  }

  function paletteThumb(item) {
    const w = Math.max(28, item.modules * 8);
    if (item.kind === "bus-n") {
      return `<svg viewBox="0 0 44 36"><rect x="2" y="10" width="40" height="16" rx="3" fill="#42a5f5"/></svg>`;
    }
    if (item.kind === "bus-pe") {
      return `<svg viewBox="0 0 44 36"><rect x="2" y="10" width="40" height="16" rx="3" fill="#f5d76e"/><rect x="2" y="10" width="20" height="16" fill="#2f9e44"/></svg>`;
    }
    const fill = item.kind === "idr" ? "#c62828" : item.kind === "dps" ? "#fb8c00" : "#2b2f36";
    let levers = "";
    for (let i = 0; i < Math.min(item.poles, 4); i++) {
      levers += `<rect x="${6 + i * 9}" y="12" width="6" height="10" rx="1" fill="${fill}"/>`;
    }
    return `<svg viewBox="0 0 44 36"><rect x="2" y="4" width="40" height="28" rx="3" fill="#eef1f5" stroke="#b0b8c4"/>${levers}</svg>`;
  }

  function exportProject() {
    const payload = {
      version: 1,
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
    const general = addComponent("mcb3", null, { silent: true });
    const idr = addComponent("idr2", null, { silent: true });
    const c1 = addComponent("mcb1", null, { silent: true });
    const c2 = addComponent("mcb1", null, { silent: true });
    addComponent("dps", null, { silent: true });
    const busN = addComponent("bus-n", { x: 40, y: RAIL_Y[2] }, { silent: true });
    const busPE = addComponent("bus-pe", { x: 220, y: RAIL_Y[2] }, { silent: true });

    if (general && idr) {
      state.wires.push(
        {
          id: uid("w"),
          type: "L1",
          from: { compId: general.id, terminalId: "out-l1" },
          to: { compId: idr.id, terminalId: "in-l" },
        },
        {
          id: uid("w"),
          type: "L1",
          from: { compId: idr.id, terminalId: "out-l" },
          to: { compId: c1.id, terminalId: "in" },
        },
        {
          id: uid("w"),
          type: "L1",
          from: { compId: idr.id, terminalId: "out-l" },
          to: { compId: c2.id, terminalId: "in" },
        },
        {
          id: uid("w"),
          type: "N",
          from: { compId: idr.id, terminalId: "out-n" },
          to: { compId: busN.id, terminalId: "n1" },
        }
      );
      const dps = state.components.find((c) => c.typeId === "dps");
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

  // Events
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
    const p = svgPoint(e);
    addComponent(typeId, p);
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
    } else if (e.key.toLowerCase() === "w") {
      setMode("wire");
    } else if (e.key.toLowerCase() === "v") {
      setMode("select");
    } else if (e.key === "Escape") {
      state.pendingTerminal = null;
      previewWire.innerHTML = "";
      setMode("select");
    }
  });

  buildPalette();
  seedDemo();
  setMode("select");
  render();
})();
