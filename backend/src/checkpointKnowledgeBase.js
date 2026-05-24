const CHECKPOINT_KNOWLEDGE_BASE = {
  loadBasedRxDrops: {
    title: "RX_DRP dependente de carga / ring buffer / SND",
    pattern:
      "Drops de RX que crescem junto com tráfego e CPU podem indicar fila/ring buffer não esvaziada rápido o suficiente, limitação de queue, SND pressionado ou tráfego inválido incrementando contador.",
    interpretation:
      "Nem todo RX_DRP representa perda de tráfego válido. Em discussões CheckMates, o padrão de crescimento em rajadas ou junto com pico de tráfego é tratado como mais suspeito de perda real; crescimento constante pode ser ruído, frames inválidos, VLAN tag incorreta ou protocolos não esperados.",
    nextChecks: [
      "Comparar netstat -ni/ifconfig antes e depois do pico.",
      "Validar ethtool -S da interface procurando counters como fifo, missed, buffer ou rx_out_of_buffer.",
      "Checar sar -n EDEV para entender se drops sobem em rajadas ou continuamente.",
      "Validar Multi-Queue com mq_mng -o -v e distribuição em cpview > Advanced > SecureXL > Network-per-CPU.",
      "Verificar se a interface está em bond/LACP e se o hashing distribui fluxos."
    ],
    references: [
      {
        label: "CheckMates: Unable to find reason for RX_DRP",
        url: "https://community.checkpoint.com/t5/Firewall-and-Security-Management/Unable-to-find-reason-for-RX-DRP/td-p/274430"
      },
      {
        label: "CheckMates: High RX Drops Observed",
        url: "https://community.checkpoint.com/t5/General-Topics/High-RX-Drops-Observed/td-p/252720"
      },
      {
        label: "Check Point SK166424: RX packet drops increase on R80.30+ Gaia kernel 3.10",
        url: "https://support.checkpoint.com/results/sk/sk166424"
      }
    ]
  },
  secureXlSoftwarePath: {
    title: "SecureXL OFF / tráfego indo para caminho menos acelerado",
    pattern:
      "SecureXL desabilitado ou inativo combinado com tráfego alto tende a empurrar processamento para caminhos de software, elevando CPU e latência.",
    interpretation:
      "A documentação de performance descreve SecureXL como o recurso de aceleração de tráfego. CheckMates também reforça que desabilitar CoreXL/SecureXL pode levar tráfego para caminhos menos eficientes, como F2F/slow path.",
    nextChecks: [
      "Validar fwaccel stat e motivo operacional de SecureXL estar OFF.",
      "Checar fwaccel conns -s com cuidado em ambientes com muitas conexões.",
      "Verificar blades/regras que desqualificam aceleração, como inspeções profundas, QoS ou recursos específicos.",
      "Validar se CoreXL está ativo; sem CoreXL, o medium path/PXL pode não estar disponível."
    ],
    references: [
      {
        label: "R81.20 Performance Tuning Guide: SecureXL accelerates gateway traffic",
        url: "https://sc1.checkpoint.com/documents/R81.20/WebAdminGuides/EN/CP_R81.20_PerformanceTuning_AdminGuide/CP_R81.20_PerformanceTuning_AdminGuide.pdf"
      },
      {
        label: "CheckMates: Finding root cause for all the F2F traffic",
        url: "https://community.checkpoint.com/t5/General-Topics/Finding-root-cause-for-all-the-F2F-traffic/td-p/51290"
      },
      {
        label: "R81.20 Performance Tuning Guide: fwaccel conns",
        url: "https://sc1.checkpoint.com/documents/R81.20/WebAdminGuides/EN/CP_R81.20_PerformanceTuning_AdminGuide/Content/Topics-PTG/CLI/fwaccel-conns.htm"
      }
    ]
  },
  coreXlMultiQueueImbalance: {
    title: "CoreXL/SND imbalance e possível limitação de Multi-Queue",
    pattern:
      "Desbalanceamento entre workers ou SNDs pode causar CPU alta em poucos cores, mesmo com capacidade livre em outros cores.",
    interpretation:
      "CheckMates descreve cenários onde tráfego acelerado por SecureXL pressiona SNDs enquanto workers ficam com baixa carga; Multi-Queue ajuda quando SecureXL e CoreXL estão ativos, mas depende de driver/NIC, diversidade de fluxos e quantidade de filas.",
    nextChecks: [
      "Validar fw ctl multik stat para distribuição entre workers.",
      "Validar fw ctl affinity -l -a -v e affinities automáticas.",
      "Checar cpview > Advanced > SecureXL > Network-per-CPU.",
      "Checar mq_mng -o -v e limites do driver/NIC.",
      "Investigar elephant flows, baixa diversidade de fluxos e tráfego concentrado em uma interface."
    ],
    references: [
      {
        label: "CheckMates: R80.x Performance Tuning Tip - Multi Queue",
        url: "https://community.checkpoint.com/t5/Firewall-and-Security-Management/R80-x-Performance-Tuning-Tip-Multi-Queue/td-p/41608"
      },
      {
        label: "R81.10 Performance Tuning Guide: Default Configuration of CoreXL",
        url: "https://sc1.checkpoint.com/documents/R81.10/WebAdminGuides/EN/CP_R81.10_PerformanceTuning_AdminGuide/Topics-PTG/CoreXL-Default-Configuration.htm"
      }
    ]
  },
  diskLoggingPressure: {
    title: "Disco cheio impactando logs, dumps e estabilidade operacional",
    pattern:
      "Filesystems de log ou sistema acima de 85/90% podem impactar gravação de logs, criação de dumps, upgrades, cpinfo/cpview export e performance de processos.",
    interpretation:
      "Em gateways Check Point, /var/log e áreas de dump concentram arquivos operacionais. Uso elevado aumenta risco de falha em logging, coleta TAC e processos que dependem de escrita em disco.",
    nextChecks: [
      "Validar df -h e maior filesystem por uso.",
      "Checar /var/log, pacotes antigos, core dumps e arquivos de upgrade.",
      "Validar rotação/retenção de logs e exportação para log server/management.",
      "Antes de remover arquivos, confirmar política operacional e janela de mudança."
    ],
    references: [
      {
        label: "Check Point Support Center",
        url: "https://support.checkpoint.com/"
      }
    ]
  },
  connectionTablePressure: {
    title: "Pressão em tabela de conexões / filas CoreXL",
    pattern:
      "Sinais de table full, allocation failure ou drops em fw ctl pstat indicam possível pressão em tabelas internas ou filas de processamento.",
    interpretation:
      "Discussões CheckMates sobre fwFullyUtilizedDrops associam drops a cenários onde tráfego vindo do SND para worker encontra fila/instância cheia; isso pode não aparecer em zdebug drop comum.",
    nextChecks: [
      "Validar fw ctl pstat detalhado e counters de drops/alocação.",
      "Checar fw tab -t connections -s e taxa de novas conexões.",
      "Investigar bursts, varreduras, ataques, timeouts agressivos ou tabela dimensionada abaixo da carga.",
      "Usar fw ctl zdebug + drop com cautela e em janela controlada."
    ],
    references: [
      {
        label: "CheckMates: Unexpected fwFullyUtilizedDrops with low CPU",
        url: "https://community.checkpoint.com/t5/Firewall-and-Security-Management/Unexpected-fwFullyUtilizedDrops-with-low-CPU-how-to-identify-the/td-p/273037"
      }
    ]
  }
};

export function knownIssueContext(issueId) {
  return CHECKPOINT_KNOWLEDGE_BASE[issueId] ?? null;
}

export function attachKnownIssue(diagnostic, issueId) {
  const knownIssue = knownIssueContext(issueId);
  if (!knownIssue) {
    return diagnostic;
  }

  return {
    ...diagnostic,
    knownIssue
  };
}

export function listKnownIssues() {
  return Object.entries(CHECKPOINT_KNOWLEDGE_BASE).map(([id, item]) => ({ id, ...item }));
}
