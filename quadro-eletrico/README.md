# MontaQuadro — Simulador de Quadros Elétricos

Ferramenta web para simular a montagem de quadros de distribuição com visual estilo **Steck**.

## Menu lateral

- **Disjuntores** — Steck 1P/2P/3P/4P (10A–63A)
- **DR** — interruptores diferenciais 2P e 4P
- **DPS** — 1P, 2P e 3P
- **Cabos** — Fase L1, L2, L3, Neutro e Terra
- **Barras** — barramentos de neutro e terra

## Como usar

1. Abra `index.html` (precisa da pasta `assets/`) **ou** `montaquadro-standalone.html` (arquivo único)
2. Escolha componentes no menu e posicione no trilho DIN
3. Em **Cabos**, selecione L1/L2/L3/N/PE e ligue terminais
4. Exporte/importe o projeto em JSON

### Atalhos

| Tecla | Ação |
|-------|------|
| V | Modo mover |
| W | Modo fiação |
| Delete | Remover selecionado |
| Ctrl+Z / Ctrl+Y | Desfazer / Refazer |
| Esc | Cancelar fiação |
