# Base local de problemas conhecidos Check Point

O NetGuardian usa uma base local de heurísticas para enriquecer o **Diagnóstico Inteligente** da página de saúde.

Essas regras não substituem análise de TAC, SK oficial autenticada ou validação manual. Elas servem para acelerar a interpretação inicial correlacionando sintomas comuns com referências públicas do CheckMates e documentação Check Point.

## Padrões modelados

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
