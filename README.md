# Dashboard de Troubleshooting Firewall Check Point

Aplicação full-stack para executar troubleshooting de firewalls Check Point via SSH e apresentar os resultados em uma dashboard moderna.

## Funcionalidades

- Formulário com hostname, IP do gateway, porta e credenciais SSH.
- Botão **Verificar Saúde do Ambiente**.
- Execução de comandos Check Point/Linux via `node-ssh`.
- Cards por sessão:
  - CPU
  - Memória
  - Load Average
  - Interfaces
  - RX/TX Errors
  - CoreXL
  - SecureXL
  - Disco
  - Cluster
  - Logs críticos
  - Core Dumps
  - Hardware
  - Sessões/conexões
- Cores por severidade: verde saudável, amarelo warning e vermelho crítico.
- Loading spinner durante a execução.
- Histórico local das execuções.
- Exportação do relatório em Markdown.
- Parsing inteligente com recomendações automáticas.

## Stack

- Backend: Node.js, Express, node-ssh, Zod.
- Frontend: React, Vite, Tailwind CSS, lucide-react.

## Referência para próximos botões

A referência oficial de APIs Check Point informada para futuras integrações foi registrada em [`docs/checkpoint-api-reference.md`](docs/checkpoint-api-reference.md).

## Como executar

```bash
npm install
npm run dev
```

O frontend roda em `http://localhost:5173` e o backend em `http://localhost:3001`.

## Variáveis de ambiente do backend

Copie `backend/.env.example` para `backend/.env` se quiser ajustar:

```bash
PORT=3001
SSH_CONNECT_TIMEOUT_MS=15000
SSH_COMMAND_TIMEOUT_MS=30000
HISTORY_LIMIT=25
```

## Comandos executados no firewall

```bash
top -b -n 1 | head -20
free -m
cat /proc/loadavg
mpstat -P ALL 1 3
cpview -s
netstat -i
ifconfig
fw ctl pstat
fw ctl multik stat
fwaccel stat
fw ctl affinity -l -a -v
grep -i "error" /var/log/messages | tail -50
grep -i "fail" /var/log/messages | tail -50
ls -lh /var/log/dump/usermode/
df -h
iostat -xm 1 5
cphaprob stat
cphaprob syncstat
fw tab -t connections -s
cpstat os -f sensors
```

## Observações de segurança

- Senhas e chaves privadas são usadas apenas para abrir a sessão SSH da execução atual.
- O histórico armazena alvo, métricas, recomendações e saídas dos comandos, mas não armazena senha nem chave privada.
- Garanta que o usuário SSH tenha permissões suficientes para executar os comandos Check Point necessários.
