# MontaQuadro — Simulador de Quadros Elétricos

Ferramenta web para simular a montagem de quadros de distribuição: trilhos DIN, disjuntores, IDR, DPS, barramentos e fiação colorida.

## Como usar

1. Abra `index.html` no navegador (Chrome, Edge ou Firefox)
2. Arraste componentes da biblioteca para o painel (ou clique para adicionar)
3. Ative **Fiação** e clique em dois terminais do mesmo tipo (L1/L2/L3/N/PE)
4. Edite corrente, curva e etiqueta no painel de propriedades
5. Exporte/importe o projeto em JSON

### Atalhos

| Tecla | Ação |
|-------|------|
| V | Modo mover |
| W | Modo fiação |
| Delete | Remover selecionado |
| Ctrl+Z / Ctrl+Y | Desfazer / Refazer |
| Esc | Cancelar fiação |

## Componentes

- Disjuntores MCB 1P / 2P / 3P / 4P
- IDR 2P / 4P
- DPS (classe II)
- Barramento de neutro e terra

## Arquivos

- `index.html` — estrutura
- `styles.css` — interface
- `app.js` — lógica do canvas, snap no trilho e fiação
