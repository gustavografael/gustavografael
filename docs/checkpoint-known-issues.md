# Regras acionadas de problemas conhecidos Check Point

O NetGuardian **não transfere** a base de conhecimento completa da Check Point/CheckMates para dentro da ferramenta.

O que existe aqui é uma lista pequena de regras acionadas por evidência. Uma referência só aparece na UI quando o output dos comandos de saúde identifica o sintoma correspondente.

Exemplo:

- Se `top` mostrar `monitord` ou `confd` consumindo CPU alta, o NetGuardian mostra referências públicas relacionadas a esse padrão.
- Se `top` não mostrar esse processo, essas referências não aparecem.

Essas regras não substituem análise de TAC, SK oficial autenticada ou validação manual. Elas servem para acelerar a interpretação inicial quando o ambiente já apresentou um sintoma detectável no output.

## Padrões modelados

### Processo específico consumindo CPU alta

Correlação usada:

- `top` mostra processo com CPU >= 40%.
- O nome do processo bate com uma regra salva.

Regras iniciais:

- `monitord` / `confd`
  - https://support.checkpoint.com/results/sk/sk102988
  - https://support.checkpoint.com/results/sk/sk163614
- `rad` / `rad_resp_slow`
  - https://community.checkpoint.com/t5/Firewall-and-Security-Management/Unusual-higher-that-average-CPU/td-p/247356
  - https://community.checkpoint.com/t5/Firewall-and-Security-Management/High-CPU-on-Security-Gateway-caused-by-RAD-service-Slow-Internet/td-p/230702
- `pdpd` / `vpnd`
  - https://support.checkpoint.com/results/sk/sk173706
- `cpd` / `fwm`
  - https://support.checkpoint.com/results/sk/sk170256
  - https://support.checkpoint.com/results/sk/sk123859
- FW instances / workers
  - https://support.checkpoint.com/results/sk/sk168513

### RX_DRP / RX drops dependentes de carga

Correlação usada:

- RX/TX drops ou errors em interfaces.
- CPU alta.

Possível interpretação:

- Saturação de gateway.
- Ring buffer/fila não drenada rápido o suficiente.
- Pressão em SND/Multi-Queue.
- Em alguns casos, contador pode crescer por tráfego inválido ou ruído.

Referências:

- https://community.checkpoint.com/t5/Firewall-and-Security-Management/Unable-to-find-reason-for-RX-DRP/td-p/274430
- https://community.checkpoint.com/t5/General-Topics/High-RX-Drops-Observed/td-p/252720
- https://support.checkpoint.com/results/sk/sk166424

### SecureXL OFF com tráfego alto

Correlação usada:

- `fwaccel stat` indica SecureXL desabilitado/off.
- Throughput alto detectado em saída de `cpview`/`fw ctl pstat`, ou muitas conexões.

Possível interpretação:

- Tráfego indo para caminho menos acelerado.
- Maior risco de CPU alta e gargalo em software.

Referências:

- https://sc1.checkpoint.com/documents/R81.20/WebAdminGuides/EN/CP_R81.20_PerformanceTuning_AdminGuide/CP_R81.20_PerformanceTuning_AdminGuide.pdf
- https://community.checkpoint.com/t5/General-Topics/Finding-root-cause-for-all-the-F2F-traffic/td-p/51290
- https://sc1.checkpoint.com/documents/R81.20/WebAdminGuides/EN/CP_R81.20_PerformanceTuning_AdminGuide/Content/Topics-PTG/CLI/fwaccel-conns.htm

### CoreXL / SND / Multi-Queue imbalance

Correlação usada:

- `fw ctl multik stat` indica distribuição desbalanceada entre workers.

Possível interpretação:

- Worker/SND sobrecarregado.
- Multi-Queue limitado ou mal distribuído.
- Elephant flow ou baixa diversidade de fluxos.

Referências:

- https://community.checkpoint.com/t5/Firewall-and-Security-Management/R80-x-Performance-Tuning-Tip-Multi-Queue/td-p/41608
- https://sc1.checkpoint.com/documents/R81.10/WebAdminGuides/EN/CP_R81.10_PerformanceTuning_AdminGuide/Topics-PTG/CoreXL-Default-Configuration.htm

### Disco cheio impactando logging/performance

Correlação usada:

- Filesystem acima de 85/90%.

Possível interpretação:

- Risco de falha em logging, dumps, upgrades, `cpinfo`, `cpview export` e estabilidade operacional.

Referência:

- https://support.checkpoint.com/

### Pressão em tabela de conexões / filas CoreXL

Correlação usada:

- `fw ctl pstat` indica table full, allocation failure, drop ou out of memory.

Possível interpretação:

- Possível pressão em tabela de conexões, filas internas ou taxa alta de novas conexões.

Referência:

- https://community.checkpoint.com/t5/Firewall-and-Security-Management/Unexpected-fwFullyUtilizedDrops-with-low-CPU-how-to-identify-the/td-p/273037
