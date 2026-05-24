import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Download,
  GitCompareArrows,
  History,
  Loader2,
  Network,
  Route,
  Server,
  ShieldCheck,
  TerminalSquare,
  XCircle
} from "lucide-react";
import {
  applyRoutingPlan,
  downloadReport,
  downloadTacPackage,
  fetchHistory,
  fetchRun,
  generateTacPackage,
  previewRouting,
  runHealthCheck
} from "./lib/api";

const STATUS_META = {
  healthy: {
    label: "Saudável",
    icon: CheckCircle2,
    card: "border-emerald-400/60 bg-emerald-500/10 text-emerald-100",
    badge: "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/30",
    dot: "bg-emerald-400"
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    card: "border-amber-400/60 bg-amber-500/10 text-amber-100",
    badge: "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/30",
    dot: "bg-amber-400"
  },
  critical: {
    label: "Crítico",
    icon: XCircle,
    card: "border-rose-400/60 bg-rose-500/10 text-rose-100",
    badge: "bg-rose-400/20 text-rose-100 ring-1 ring-rose-300/30",
    dot: "bg-rose-400"
  },
  unknown: {
    label: "Indeterminado",
    icon: Activity,
    card: "border-slate-500/60 bg-slate-500/10 text-slate-100",
    badge: "bg-slate-400/20 text-slate-100 ring-1 ring-slate-300/30",
    dot: "bg-slate-400"
  }
};

const ROUTING_STATUS_META = {
  synced: STATUS_META.healthy,
  different: STATUS_META.warning,
  blocked: STATUS_META.critical
};

const INITIAL_HEALTH_FORM = {
  hostname: "",
  gatewayIp: "",
  port: 22,
  username: "",
  password: "",
  privateKey: "",
  passphrase: ""
};

const INITIAL_ROUTING_FORM = {
  firewalls: [
    { hostname: "", gatewayIp: "", port: 22 },
    { hostname: "", gatewayIp: "", port: 22 }
  ],
  sharedCredentials: {
    port: 22,
    username: "",
    password: "",
    privateKey: "",
    passphrase: ""
  }
};

const INITIAL_TAC_FORM = {
  hostname: "",
  gatewayIp: "",
  port: 22,
  username: "",
  password: "",
  privateKey: "",
  passphrase: ""
};

function statusLabel(status) {
  if (status === "synced") return "Sincronizado";
  if (status === "different") return "Diferenças";
  if (status === "blocked") return "Bloqueado";
  return STATUS_META[status]?.label ?? "Indeterminado";
}

function StatusBadge({ status }) {
  const meta = ROUTING_STATUS_META[status] ?? STATUS_META[status] ?? STATUS_META.unknown;
  const Icon = meta.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.badge}`}>
      <Icon className="h-3.5 w-3.5" />
      {statusLabel(status)}
    </span>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

function inputClassName() {
  return "w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#EE0C5D]/70 focus:bg-white/[0.14] focus:ring-4 focus:ring-[#EE0C5D]/15";
}

function Shell({ children }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#EE0C5D_0%,#41273C_34%,#231F20_100%)] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </main>
  );
}

function Header({ eyebrow = "Firewall Check Point", title, description, right, onBack }) {
  return (
    <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl shadow-black/30 backdrop-blur">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-slate-100 transition hover:border-[#EE0C5D]/45 hover:bg-[#EE0C5D]/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para botões
        </button>
      ) : null}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#EE0C5D]/25 bg-[#EE0C5D]/10 px-4 py-2 text-sm font-semibold text-[#FFD6E5]">
            <Network className="h-4 w-4" />
            {eyebrow}
          </div>
          <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{description}</p>
        </div>
        {right}
      </div>
    </header>
  );
}

function HomePage({ onOpenHealth, onOpenRouting, onOpenTac }) {
  const actions = [
    {
      title: "Avaliar saúde firewall",
      description: "Executa comandos de CPU, memória, interfaces, CoreXL, SecureXL, disco, cluster, logs, hardware e conexões.",
      icon: ShieldCheck,
      action: onOpenHealth,
      cta: "Verificar Saúde do Ambiente"
    },
    {
      title: "Validar roteamento HA",
      description: "Executa show route summary nas duas caixas, identifica active/standby, compara rotas e prepara correção com confirmação.",
      icon: Route,
      action: onOpenRouting,
      cta: "Validar Roteamento das Caixas"
    },
    {
      title: "Gerar Pacote TAC",
      description: "Coleta cpinfo, cpview export, logs e dumps no gateway, compacta em tar.gz e disponibiliza o download para abertura de chamado TAC.",
      icon: Archive,
      action: onOpenTac,
      cta: "Gerar Pacote TAC"
    }
  ];

  return (
    <Shell>
      <Header
        title="NetGuardian"
        description="Escolha uma automação para diagnosticar firewalls Check Point. Cada botão abre uma página secundária com output, diff e ações seguras."
        right={
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-sm text-slate-400">Botões disponíveis</p>
            <p className="mt-2 text-3xl font-black text-[#FFD6E5]">3</p>
          </div>
        }
      />

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              onClick={item.action}
              className="group rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 text-left shadow-2xl shadow-black/20 backdrop-blur transition hover:-translate-y-1 hover:border-[#EE0C5D]/55 hover:bg-[#EE0C5D]/10"
            >
              <div className="mb-6 inline-flex rounded-3xl bg-[#EE0C5D]/10 p-4 text-[#FF9FC4] ring-1 ring-[#EE0C5D]/25">
                <Icon className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-white">{item.title}</h2>
              <p className="mt-3 min-h-20 text-sm leading-6 text-slate-300">{item.description}</p>
              <span className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#EE0C5D] px-5 py-3 text-sm font-black text-slate-950 transition group-hover:bg-[#FF4D8D]">
                {item.cta}
              </span>
            </button>
          );
        })}
      </section>
    </Shell>
  );
}

function SummaryTiles({ report }) {
  const counts = report.sections.reduce(
    (acc, section) => {
      acc[section.status] = (acc[section.status] ?? 0) + 1;
      return acc;
    },
    { healthy: 0, warning: 0, critical: 0, unknown: 0 }
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Object.entries(counts).map(([status, count]) => {
        const meta = STATUS_META[status] ?? STATUS_META.unknown;
        return (
          <div key={status} className={`rounded-3xl border p-5 shadow-2xl shadow-black/10 ${meta.card}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">{meta.label}</span>
              <span className={`h-3 w-3 rounded-full ${meta.dot}`} />
            </div>
            <p className="mt-4 text-4xl font-black tracking-tight">{count}</p>
            <p className="mt-1 text-xs text-slate-400">sessões analisadas</p>
          </div>
        );
      })}
    </div>
  );
}

function Recommendations({ recommendations }) {
  if (!recommendations?.length) {
    return (
      <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm text-emerald-100">
        Nenhuma recomendação crítica foi gerada para esta execução.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#EE0C5D]/25 bg-slate-950/50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[#EE0C5D]" />
        <h2 className="text-lg font-bold text-white">Recomendações automáticas</h2>
      </div>
      <div className="space-y-3">
        {recommendations.map((recommendation, index) => (
          <div key={`${recommendation.section}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold text-[#FFD6E5]">{recommendation.section}</p>
            <p className="mt-1 text-sm text-slate-300">{recommendation.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntelligentDiagnostics({ diagnostics }) {
  if (!diagnostics?.length) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-[#EE0C5D]/30 bg-slate-950/60 p-5 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center gap-2">
        <BrainCircuit className="h-5 w-5 text-[#EE0C5D]" />
        <div>
          <h2 className="text-lg font-bold text-white">Diagnóstico Inteligente</h2>
          <p className="text-sm text-slate-400">Correlação automática entre eventos, métricas e sintomas prováveis.</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {diagnostics.map((item) => {
          const meta = STATUS_META[item.severity] ?? STATUS_META.unknown;
          return (
            <article key={item.id} className={`rounded-3xl border p-5 ${meta.card}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.summary}</p>
                </div>
                <StatusBadge status={item.severity} />
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Interpretação</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{item.interpretation}</p>
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ação sugerida</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{item.recommendation}</p>
              </div>

              {item.evidence?.length ? (
                <div className="mt-4 space-y-2">
                  {item.evidence.map((evidence) => (
                    <p key={evidence} className="rounded-2xl bg-black/20 px-4 py-3 text-sm text-slate-200">
                      {evidence}
                    </p>
                  ))}
                </div>
              ) : null}

              <p className="mt-4 text-xs text-slate-500">Confiança: {item.confidence}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function SectionCard({ section }) {
  const meta = STATUS_META[section.status] ?? STATUS_META.unknown;

  return (
    <article className={`rounded-3xl border p-5 shadow-2xl shadow-black/20 ${meta.card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-white">{section.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{section.summary}</p>
        </div>
        <StatusBadge status={section.status} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {section.metrics.map((item) => (
          <div key={`${section.id}-${item.label}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
            <p className="mt-2 text-lg font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>
      {section.recommendations.length ? (
        <div className="mt-5 space-y-2">
          {section.recommendations.map((item) => (
            <p key={item} className="rounded-2xl bg-black/20 px-4 py-3 text-sm text-slate-200">
              {item}
            </p>
          ))}
        </div>
      ) : null}
      <details className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">Ver saídas brutas dos comandos</summary>
        <div className="mt-4 space-y-4">
          {Object.entries(section.rawOutputs).map(([id, output]) => (
            <div key={id}>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{id}</p>
              <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-300">
                {output || "Sem saída."}
              </pre>
            </div>
          ))}
        </div>
      </details>
    </article>
  );
}

function HistoryPanel({ history, onSelectRun, selectedRunId }) {
  return (
    <aside className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
        <History className="h-5 w-5 text-[#EE0C5D]" />
        <h2 className="text-lg font-bold text-white">Histórico de saúde</h2>
      </div>
      {history.length ? (
        <div className="space-y-3">
          {history.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectRun(item.id)}
              className={`w-full rounded-2xl border p-4 text-left transition hover:border-[#EE0C5D]/55 hover:bg-[#EE0C5D]/10 ${
                selectedRunId === item.id ? "border-[#EE0C5D]/65 bg-[#EE0C5D]/10" : "border-white/10 bg-black/20"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-bold text-white">{item.target.hostname}</p>
                <StatusBadge status={item.overallStatus} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{item.target.gatewayIp}</p>
              <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                {new Date(item.startedAt).toLocaleString("pt-BR")}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">Nenhuma execução registrada ainda.</p>
      )}
    </aside>
  );
}

function HealthPage({ onBack }) {
  const [form, setForm] = useState(INITIAL_HEALTH_FORM);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistoryRun, setLoadingHistoryRun] = useState(false);
  const [error, setError] = useState("");

  const selectedRunId = report?.id;
  const canSubmit = useMemo(
    () => form.hostname.trim() && form.gatewayIp.trim() && form.username.trim() && (form.password || form.privateKey),
    [form]
  );

  async function refreshHistory() {
    setHistory(await fetchHistory());
  }

  useEffect(() => {
    refreshHistory().catch((requestError) => setError(requestError.message));
  }, []);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await runHealthCheck({ ...form, port: Number(form.port) || 22 });
      setReport(result);
      await refreshHistory();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectRun(id) {
    setError("");
    setLoadingHistoryRun(true);

    try {
      setReport(await fetchRun(id));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingHistoryRun(false);
    }
  }

  return (
    <Shell>
      <Header
        onBack={onBack}
        title="Avaliar saúde firewall"
        description="Output do botão de saúde: executa comandos via SSH, organiza os dados em cards e gera recomendações automáticas."
        right={
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-sm text-slate-400">Botão atual</p>
            <p className="mt-2 flex items-center gap-2 text-lg font-bold text-[#FFD6E5]">
              <TerminalSquare className="h-5 w-5" />
              Verificar Saúde do Ambiente
            </p>
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-8">
          <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-[#EE0C5D]/10 p-3 text-[#FF9FC4]">
                <Server className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black">Dados do gateway</h2>
                <p className="text-sm text-slate-400">Informe hostname, IP e credenciais SSH para a execução.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Hostname">
                <input className={inputClassName()} value={form.hostname} onChange={(event) => updateForm("hostname", event.target.value)} required />
              </Field>
              <Field label="IP do gateway">
                <input className={inputClassName()} value={form.gatewayIp} onChange={(event) => updateForm("gatewayIp", event.target.value)} required />
              </Field>
              <Field label="Porta SSH">
                <input className={inputClassName()} type="number" min="1" max="65535" value={form.port} onChange={(event) => updateForm("port", event.target.value)} />
              </Field>
              <Field label="Usuário SSH">
                <input className={inputClassName()} value={form.username} onChange={(event) => updateForm("username", event.target.value)} required />
              </Field>
              <Field label="Senha SSH" hint="Use senha ou chave privada. A senha não é armazenada no histórico.">
                <input className={inputClassName()} type="password" value={form.password} onChange={(event) => updateForm("password", event.target.value)} />
              </Field>
              <Field label="Passphrase da chave">
                <input className={inputClassName()} type="password" value={form.passphrase} onChange={(event) => updateForm("passphrase", event.target.value)} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Chave privada SSH" hint="Opcional. Cole a chave PEM quando não usar senha.">
                  <textarea className={`${inputClassName()} min-h-32 font-mono text-xs`} value={form.privateKey} onChange={(event) => updateForm("privateKey", event.target.value)} />
                </Field>
              </div>
            </div>

            {error ? <div className="mt-5 rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#EE0C5D] px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-[#650C50]/35 transition hover:bg-[#FF4D8D] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Verificar Saúde do Ambiente
              </button>
              {report ? (
                <button
                  type="button"
                  onClick={() => downloadReport(report.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:border-[#EE0C5D]/45 hover:bg-[#EE0C5D]/10"
                >
                  <Download className="h-5 w-5" />
                  Exportar relatório
                </button>
              ) : null}
            </div>
          </form>

          {loading || loadingHistoryRun ? (
            <LoadingCard title="Executando troubleshooting..." subtitle="Coletando comandos e gerando análise inteligente." />
          ) : null}

          {report && !loading && !loadingHistoryRun ? (
            <div className="space-y-6">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-[#FF9FC4]">Resultado</p>
                    <h2 className="mt-2 text-2xl font-black">{report.target.hostname}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {report.target.gatewayIp} • {new Date(report.startedAt).toLocaleString("pt-BR")} • {report.durationMs} ms
                    </p>
                  </div>
                  <StatusBadge status={report.overallStatus} />
                </div>
              </div>
              <SummaryTiles report={report} />
              <IntelligentDiagnostics diagnostics={report.diagnostics} />
              <Recommendations recommendations={report.recommendations} />
              <div className="grid gap-5">
                {report.sections.map((section) => (
                  <SectionCard key={section.id} section={section} />
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <HistoryPanel history={history} onSelectRun={handleSelectRun} selectedRunId={selectedRunId} />
      </div>
    </Shell>
  );
}

function LoadingCard({ title, subtitle }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.06]">
      <div className="text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#EE0C5D]" />
        <p className="mt-4 font-bold text-white">{title}</p>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function RouteList({ title, routes, empty }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <h3 className="font-black text-white">{title}</h3>
      {routes.length ? (
        <div className="mt-4 space-y-2">
          {routes.map((route) => (
            <pre key={route.raw} className="overflow-auto rounded-2xl bg-slate-950 p-3 text-xs leading-5 text-slate-300">
              {route.raw}
            </pre>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400">{empty}</p>
      )}
    </div>
  );
}

function RoutingResult({ preview, confirmation, setConfirmation, applying, applyResult, onApply }) {
  const canApply = preview.correctionPlan.canApply && confirmation === "CONFIRMAR" && preview.status === "different";

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#FF9FC4]">Resultado roteamento</p>
            <h2 className="mt-2 text-2xl font-black">{preview.message}</h2>
            <p className="mt-1 text-sm text-slate-400">Executado em {new Date(preview.startedAt).toLocaleString("pt-BR")} • {preview.durationMs} ms</p>
          </div>
          <StatusBadge status={preview.status} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-200">Caixa ativa</p>
            <p className="mt-2 text-xl font-black">{preview.active.target.hostname}</p>
            <p className="text-sm text-slate-300">{preview.active.target.gatewayIp}</p>
            <p className="mt-3 text-sm text-emerald-100">{preview.active.routeCount} rotas analisadas</p>
          </div>
          <div className="rounded-3xl border border-[#EE0C5D]/25 bg-[#EE0C5D]/10 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-[#FF9FC4]">Caixa standby</p>
            <p className="mt-2 text-xl font-black">{preview.standby.target.hostname}</p>
            <p className="text-sm text-slate-300">{preview.standby.target.gatewayIp}</p>
            <p className="mt-3 text-sm text-[#FFD6E5]">{preview.standby.routeCount} rotas analisadas</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <RouteList title="Rotas da ativa ausentes no standby" routes={preview.diff.missingOnStandby} empty="Nenhuma rota ausente no standby." />
        <RouteList title="Rotas extras no standby" routes={preview.diff.extraOnStandby} empty="Nenhuma rota extra no standby." />
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="mb-5 flex items-center gap-2">
          <GitCompareArrows className="h-5 w-5 text-[#EE0C5D]" />
          <h3 className="text-xl font-black">O que será mudado antes da correção</h3>
        </div>

        {preview.correctionPlan.executableCommands.length ? (
          <div className="space-y-3">
            {preview.correctionPlan.executableCommands.map((item) => (
              <div key={`${item.action}-${item.route}`} className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                <p className="font-semibold text-amber-100">{item.description}</p>
                <code className="mt-2 block overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">clish -c "{item.clishCommand}"</code>
              </div>
            ))}
            <div className="rounded-2xl border border-[#EE0C5D]/25 bg-[#EE0C5D]/10 p-4 text-sm text-[#FFD6E5]">
              Após aplicar as mudanças, o backend executa <code>clish -c "save config"</code>.
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
            Nenhuma mudança automática segura foi gerada. Diferenças não parseáveis devem ser validadas manualmente.
          </p>
        )}

        {preview.correctionPlan.manualChanges.length ? (
          <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4">
            <p className="font-bold text-rose-100">Diferenças que exigem validação manual</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {preview.correctionPlan.manualChanges.map((item) => (
                <li key={item.route}>• {item.route} — {item.reason}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {preview.correctionPlan.canApply && preview.status === "different" ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
            <Field label="Confirmação obrigatória" hint="Digite CONFIRMAR para replicar as rotas estáticas parseadas da ativa para o standby.">
              <input className={inputClassName()} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="CONFIRMAR" />
            </Field>
            <button
              type="button"
              disabled={!canApply || applying}
              onClick={onApply}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-300 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {applying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Route className="h-5 w-5" />}
              Confirmar correção no standby
            </button>
          </div>
        ) : null}

        {applyResult ? (
          <div className="mt-6 rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <p className="font-black text-emerald-100">{applyResult.message}</p>
            <div className="mt-4 space-y-2">
              {applyResult.commandResults.map((item) => (
                <div key={`${item.action}-${item.clishCommand}`} className="rounded-2xl bg-black/20 p-3 text-xs text-slate-300">
                  <p className="font-bold text-white">{item.description}</p>
                  <p className="mt-1">Código: {item.result.code}</p>
                  {item.result.stderr ? <p className="mt-1 text-rose-200">{item.result.stderr}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RoutingPage({ onBack }) {
  const [form, setForm] = useState(INITIAL_ROUTING_FORM);
  const [preview, setPreview] = useState(null);
  const [applyResult, setApplyResult] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    const hasFirewalls = form.firewalls.every((firewall) => firewall.hostname.trim() && firewall.gatewayIp.trim());
    const hasAuth = form.sharedCredentials.username.trim() && (form.sharedCredentials.password || form.sharedCredentials.privateKey);
    return hasFirewalls && hasAuth;
  }, [form]);

  function updateFirewall(index, field, value) {
    setForm((current) => ({
      ...current,
      firewalls: current.firewalls.map((firewall, itemIndex) => (itemIndex === index ? { ...firewall, [field]: value } : firewall))
    }));
  }

  function updateShared(field, value) {
    setForm((current) => ({
      ...current,
      sharedCredentials: { ...current.sharedCredentials, [field]: value }
    }));
  }

  async function handlePreview(event) {
    event.preventDefault();
    setError("");
    setPreview(null);
    setApplyResult(null);
    setConfirmation("");
    setLoading(true);

    try {
      setPreview(
        await previewRouting({
          firewalls: form.firewalls.map((firewall) => ({ ...firewall, port: Number(firewall.port || form.sharedCredentials.port || 22) })),
          sharedCredentials: { ...form.sharedCredentials, port: Number(form.sharedCredentials.port || 22) }
        })
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!preview) return;
    setError("");
    setApplying(true);

    try {
      setApplyResult(await applyRoutingPlan({ previewId: preview.id, confirmation }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Shell>
      <Header
        onBack={onBack}
        title="Validar roteamento das caixas"
        description="Executa cphaprob stat para identificar active/standby, roda show route summary nos dois firewalls, mostra diferenças e pede confirmação antes de replicar rotas estáticas da ativa para o standby."
        right={
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-sm text-slate-400">Comandos base</p>
            <p className="mt-2 text-sm font-bold text-[#FFD6E5]">cphaprob stat</p>
            <p className="text-sm font-bold text-[#FFD6E5]">show route summary</p>
          </div>
        }
      />

      <section className="space-y-8">
        <form onSubmit={handlePreview} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-[#EE0C5D]/10 p-3 text-[#FF9FC4]">
              <Route className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black">Dados das duas caixas</h2>
              <p className="text-sm text-slate-400">Informe os dois membros do cluster. O backend descobre qual está active e qual está standby.</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {form.firewalls.map((firewall, index) => (
              <div key={index} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <h3 className="mb-4 font-black text-white">Firewall {index + 1}</h3>
                <div className="grid gap-4">
                  <Field label="Hostname">
                    <input className={inputClassName()} value={firewall.hostname} onChange={(event) => updateFirewall(index, "hostname", event.target.value)} required />
                  </Field>
                  <Field label="IP do gateway">
                    <input className={inputClassName()} value={firewall.gatewayIp} onChange={(event) => updateFirewall(index, "gatewayIp", event.target.value)} required />
                  </Field>
                  <Field label="Porta SSH">
                    <input className={inputClassName()} type="number" min="1" max="65535" value={firewall.port} onChange={(event) => updateFirewall(index, "port", event.target.value)} />
                  </Field>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5">
            <h3 className="mb-4 font-black text-white">Credenciais SSH compartilhadas</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Usuário SSH">
                <input className={inputClassName()} value={form.sharedCredentials.username} onChange={(event) => updateShared("username", event.target.value)} required />
              </Field>
              <Field label="Porta padrão">
                <input className={inputClassName()} type="number" min="1" max="65535" value={form.sharedCredentials.port} onChange={(event) => updateShared("port", event.target.value)} />
              </Field>
              <Field label="Senha SSH">
                <input className={inputClassName()} type="password" value={form.sharedCredentials.password} onChange={(event) => updateShared("password", event.target.value)} />
              </Field>
              <Field label="Passphrase da chave">
                <input className={inputClassName()} type="password" value={form.sharedCredentials.passphrase} onChange={(event) => updateShared("passphrase", event.target.value)} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Chave privada SSH" hint="Opcional. Use senha ou chave privada.">
                  <textarea className={`${inputClassName()} min-h-32 font-mono text-xs`} value={form.sharedCredentials.privateKey} onChange={(event) => updateShared("privateKey", event.target.value)} />
                </Field>
              </div>
            </div>
          </div>

          {error ? <div className="mt-5 rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#EE0C5D] px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-[#650C50]/35 transition hover:bg-[#FF4D8D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GitCompareArrows className="h-5 w-5" />}
            Validar Roteamento das Caixas
          </button>
        </form>

        {loading ? <LoadingCard title="Validando roteamento..." subtitle="Identificando active/standby, coletando rotas e calculando diferenças." /> : null}

        {preview && !loading ? (
          <RoutingResult
            preview={preview}
            confirmation={confirmation}
            setConfirmation={setConfirmation}
            applying={applying}
            applyResult={applyResult}
            onApply={handleApply}
          />
        ) : null}
      </section>
    </Shell>
  );
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return "N/D";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function TacPackagePage({ onBack }) {
  const [form, setForm] = useState(INITIAL_TAC_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () => form.hostname.trim() && form.gatewayIp.trim() && form.username.trim() && (form.password || form.privateKey),
    [form]
  );

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      setResult(await generateTacPackage({ ...form, port: Number(form.port) || 22 }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <Header
        onBack={onBack}
        title="Gerar Pacote TAC"
        description="Executa cpinfo, cpview export, coleta logs e dumps no firewall, compacta tudo em tar.gz e disponibiliza o download pelo NetGuardian."
        right={
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-sm text-slate-400">Coletas</p>
            <p className="mt-2 text-sm font-bold text-[#FFD6E5]">cpinfo</p>
            <p className="text-sm font-bold text-[#FFD6E5]">cpview export</p>
            <p className="text-sm font-bold text-[#FFD6E5]">logs + dumps + tar.gz</p>
          </div>
        }
      />

      <section className="space-y-8">
        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-[#EE0C5D]/10 p-3 text-[#FF9FC4]">
              <Archive className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black">Dados do gateway</h2>
              <p className="text-sm text-slate-400">Use credenciais com permissão para executar cpinfo, cpview export e ler logs/dumps.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Hostname">
              <input className={inputClassName()} value={form.hostname} onChange={(event) => updateForm("hostname", event.target.value)} required />
            </Field>
            <Field label="IP do gateway">
              <input className={inputClassName()} value={form.gatewayIp} onChange={(event) => updateForm("gatewayIp", event.target.value)} required />
            </Field>
            <Field label="Porta SSH">
              <input className={inputClassName()} type="number" min="1" max="65535" value={form.port} onChange={(event) => updateForm("port", event.target.value)} />
            </Field>
            <Field label="Usuário SSH">
              <input className={inputClassName()} value={form.username} onChange={(event) => updateForm("username", event.target.value)} required />
            </Field>
            <Field label="Senha SSH" hint="Use senha ou chave privada. Credenciais não entram no pacote nem no histórico.">
              <input className={inputClassName()} type="password" value={form.password} onChange={(event) => updateForm("password", event.target.value)} />
            </Field>
            <Field label="Passphrase da chave">
              <input className={inputClassName()} type="password" value={form.passphrase} onChange={(event) => updateForm("passphrase", event.target.value)} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Chave privada SSH" hint="Opcional. Cole a chave PEM quando não usar senha.">
                <textarea className={`${inputClassName()} min-h-32 font-mono text-xs`} value={form.privateKey} onChange={(event) => updateForm("privateKey", event.target.value)} />
              </Field>
            </div>
          </div>

          {error ? <div className="mt-5 rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#EE0C5D] px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-[#650C50]/35 transition hover:bg-[#FF4D8D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Archive className="h-5 w-5" />}
            Gerar Pacote TAC
          </button>
        </form>

        {loading ? <LoadingCard title="Gerando pacote TAC..." subtitle="Executando coletas, compactando tar.gz e baixando o arquivo para o NetGuardian." /> : null}

        {result && !loading ? (
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-[#FF9FC4]">Pacote TAC</p>
                  <h2 className="mt-2 text-2xl font-black">{result.message}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {result.target.hostname} • {result.target.gatewayIp} • {formatBytes(result.sizeBytes)} • {result.durationMs} ms
                  </p>
                </div>
                <StatusBadge status={result.status === "ready" ? "healthy" : result.status === "warning" ? "warning" : "critical"} />
              </div>

              <button
                type="button"
                onClick={() => downloadTacPackage(result.id)}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-200"
              >
                <Download className="h-5 w-5" />
                Baixar {result.fileName}
              </button>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="mb-5 flex items-center gap-2">
                <TerminalSquare className="h-5 w-5 text-[#EE0C5D]" />
                <h3 className="text-xl font-black">Etapas executadas</h3>
              </div>
              <div className="space-y-3">
                {result.steps.map((step) => (
                  <details key={`${step.label}-${step.startedAt}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-slate-200">
                      <span>{step.label}</span>
                      <StatusBadge status={step.ok ? "healthy" : "warning"} />
                    </summary>
                    <code className="mt-3 block overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">{step.command}</code>
                    {step.stdout ? <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">{step.stdout}</pre> : null}
                    {step.stderr ? <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-rose-950/40 p-3 text-xs text-rose-100">{step.stderr}</pre> : null}
                  </details>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </Shell>
  );
}

function App() {
  const [view, setView] = useState("home");

  if (view === "health") {
    return <HealthPage onBack={() => setView("home")} />;
  }

  if (view === "routing") {
    return <RoutingPage onBack={() => setView("home")} />;
  }

  if (view === "tac") {
    return <TacPackagePage onBack={() => setView("home")} />;
  }

  return <HomePage onOpenHealth={() => setView("health")} onOpenRouting={() => setView("routing")} onOpenTac={() => setView("tac")} />;
}

export default App;
