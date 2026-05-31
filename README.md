# NetGuardian

Dashboard full-stack para executar troubleshooting de firewalls Check Point via SSH e apresentar os resultados em uma interface moderna.

## Funcionalidades

- Página principal com botões de troubleshooting.
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
- **Diagnóstico Inteligente** na página de saúde, correlacionando eventos para ajudar na interpretação:
  - RX drops + CPU alta = possível saturação.
  - SecureXL OFF + throughput alto = possível gargalo em software.
  - Worker desbalanceado = CoreXL imbalance.
  - Disco cheio = impacto em logging/performance.
- Botão **Validar Roteamento das Caixas** para clusters HA:
  - Executa `cphaprob stat` nas duas caixas para identificar active/standby.
  - Executa `show route summary` via `clish`.
  - Compara rotas da caixa ativa contra standby.
  - Mostra diferenças e o plano do que será alterado.
  - Pede confirmação antes de aplicar correção.
  - Replica automaticamente apenas rotas estáticas parseáveis da ativa para o standby.
- Botão **Gerar Pacote TAC**:
  - Executa `cpinfo`.
  - Executa `cpview export`.
  - Coleta logs.
  - Coleta dumps.
  - Compacta o conteúdo em `.tar.gz`.
  - Disponibiliza download do pacote pelo NetGuardian.

## Stack

- Backend: Node.js, Express, node-ssh, Zod.
- Frontend: React, Vite, Tailwind CSS, lucide-react.
- Identidade visual inspirada na paleta Check Point: Brand Berry `#EE0C5D`, Gravitas Grey `#41273C` e Black `#231F20`.

## Referência para próximos botões

A referência oficial de APIs Check Point informada para futuras integrações foi registrada em [`docs/checkpoint-api-reference.md`](docs/checkpoint-api-reference.md).

As regras acionadas de problemas conhecidos usadas pelo **Diagnóstico Inteligente** foram registradas em [`docs/checkpoint-known-issues.md`](docs/checkpoint-known-issues.md). Elas só aparecem no output quando o sintoma correspondente é identificado nos comandos coletados.

## Como executar

```bash
npm install
npm run dev
```

O frontend roda em `http://localhost:5173` e o backend em `http://localhost:3001`.

## Modo local (recomendado para empresa)

Para publicar a interface na Internet e executar os testes **a partir da máquina do usuário**, use o **NetGuardian Local Agent**.

Fluxo:

```text
Usuário abre a UI (GitHub Pages ou localhost)
        |
        v
UI detecta http://127.0.0.1:3737
        |
        v
Local Agent na máquina do usuário
        |
        v
SSH para firewalls internos
```

Na máquina do analista:

```bash
npm install
npm run agent
```

Isso sobe o agente em:

```text
http://127.0.0.1:3737
```

Para testar UI + agente juntos:

```bash
npm run start:local
```

Ou, em dois terminais separados:

```bash
npm run agent      # terminal 1 — porta 3737
npm run ui         # terminal 2 — porta 5173
```

Depois abra **http://localhost:5173** no navegador.

Se aparecer `ERR_CONNECTION_REFUSED`, a UI não está rodando — execute `npm run start:local` na pasta do projeto.

Com o agente rodando, valide a instalação local:

```bash
npm run test:local
```

A interface mostra um banner verde quando o agente local está conectado. Sem o agente, os botões SSH não funcionam na UI pública.

Observações:

- Credenciais SSH ficam na máquina do usuário.
- O agente escuta apenas em `127.0.0.1`.
- A UI publicada no GitHub Pages pode chamar o agente local via Private Network Access do navegador.

## Publicação no GitHub Pages

O frontend está preparado para publicação pública no GitHub Pages pelo workflow:

```text
.github/workflows/deploy-pages.yml
```

URL pública esperada após o deploy:

```text
https://gustavografael.github.io/gustavografael/
```

O workflow publica automaticamente quando as mudanças estiverem na branch `main`. Se o GitHub Pages ainda não estiver habilitado no repositório, habilite uma vez em:

```text
Settings > Pages > Build and deployment > Source: GitHub Actions
```

Observação importante:

- GitHub Pages hospeda apenas o frontend estático.
- Para uso corporativo, prefira o **Local Agent** (`npm run agent`) na máquina do usuário.
- Alternativamente, os botões SSH podem usar um backend Node.js publicado em Render, Railway, Fly.io, Azure App Service ou Azure Container Apps.
- Quando o backend tiver uma URL pública, configure a variável do repositório `NETGUARDIAN_API_BASE_URL` com a URL base do backend, por exemplo:

```text
https://netguardian-api.exemplo.com
```

Sem essa variável, o frontend tenta usar `/api` no mesmo domínio do GitHub Pages, o que serve apenas para demonstração visual da interface.

## Variáveis de ambiente do backend

Copie `backend/.env.example` para `backend/.env` se quiser ajustar:

```bash
PORT=3001
SSH_CONNECT_TIMEOUT_MS=15000
SSH_COMMAND_TIMEOUT_MS=30000
HISTORY_LIMIT=25
ROUTING_PLAN_TTL_MS=600000
ROUTING_SUMMARY_COMMAND=clish -c "show route summary"
TAC_COMMAND_TIMEOUT_MS=600000
TAC_DOWNLOAD_TIMEOUT_MS=600000
TAC_REMOTE_BASE_DIR=/var/log
TAC_LOG_PATHS=/var/log/messages* /var/log/secure* /var/log/audit* /var/log/dmesg*
TAC_DUMP_PATHS=/var/log/dump /var/log/dump/usermode
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

## Fluxo de validação de roteamento HA

O segundo botão usa duas etapas para evitar mudanças automáticas sem revisão:

1. **Preview**
   - Conecta nas duas caixas informadas.
   - Executa `cphaprob stat` para validar qual membro está `active` e qual está `standby`.
   - Executa `show route summary`.
   - Mostra rotas ausentes no standby, rotas extras no standby e os comandos de correção gerados.

2. **Correção com confirmação**
   - O usuário precisa digitar `CONFIRMAR`.
   - Antes de aplicar, o backend valida novamente que o alvo ainda está como standby.
   - Executa no standby somente comandos Gaia gerados para rotas estáticas parseáveis.
   - Executa `save config` ao final.

Diferenças que não forem parseáveis como rota estática aparecem no output como validação manual, sem execução automática.

## Fluxo de geração de pacote TAC

O terceiro botão cria um pacote de evidências para abertura de chamado TAC:

1. Conecta no gateway via SSH.
2. Cria um diretório temporário em `TAC_REMOTE_BASE_DIR`.
3. Executa `cpinfo`.
4. Executa `cpview export`.
5. Coleta logs configurados em `TAC_LOG_PATHS`.
6. Coleta dumps configurados em `TAC_DUMP_PATHS`.
7. Gera um manifesto simples com data, hostname e lista de arquivos.
8. Compacta tudo em `.tar.gz` no firewall.
9. Baixa o `.tar.gz` para o backend.
10. Remove os temporários remotos.

Os arquivos baixados ficam em `backend/data/tac-packages/`, que é ignorado pelo Git.

## Observações de segurança

- Senhas e chaves privadas são usadas apenas para abrir a sessão SSH da execução atual.
- O histórico armazena alvo, métricas, recomendações e saídas dos comandos, mas não armazena senha nem chave privada.
- Pacotes TAC podem conter dados sensíveis de configuração, logs, IPs, nomes de objetos e dumps. Compartilhe apenas por canais aprovados.
- Garanta que o usuário SSH tenha permissões suficientes para executar os comandos Check Point necessários.
