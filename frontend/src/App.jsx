import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  History,
  Loader2,
  Network,
  Server,
  ShieldCheck,
  TerminalSquare,
  XCircle
} from "lucide-react";
import { downloadReport, fetchHistory, fetchRun, runHealthCheck } from "./lib/api";

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

const INITIAL_FORM = {
  hostname: "",
  gatewayIp: "",
  port: 22,
  username: "",
  password: "",
  privateKey: "",
  passphrase: ""
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.unknown;
  const Icon = meta.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.badge}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
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
  return "w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:bg-white/[0.14] focus:ring-4 focus:ring-cyan-300/10";
}

function SummaryTiles({ report }) {
  if (!report) {
    return null;
  }

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
    <div className="rounded-3xl border border-cyan-300/20 bg-slate-950/50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-cyan-300" />
        <h2 className="text-lg font-bold text-white">Recomendações automáticas</h2>
      </div>
      <div className="space-y-3">
        {recommendations.map((recommendation, index) => (
          <div key={`${recommendation.section}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold text-cyan-100">{recommendation.section}</p>
            <p className="mt-1 text-sm text-slate-300">{recommendation.text}</p>
          </div>
        ))}
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
        <History className="h-5 w-5 text-cyan-300" />
        <h2 className="text-lg font-bold text-white">Histórico de execução</h2>
      </div>
      {history.length ? (
        <div className="space-y-3">
          {history.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectRun(item.id)}
              className={`w-full rounded-2xl border p-4 text-left transition hover:border-cyan-300/50 hover:bg-cyan-300/10 ${
                selectedRunId === item.id ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-black/20"
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

function App() {
  const [form, setForm] = useState(INITIAL_FORM);
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
    const items = await fetchHistory();
    setHistory(items);
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
      const result = await runHealthCheck({
        ...form,
        port: Number(form.port) || 22
      });
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#0e7490_0,#0f172a_35%,#020617_100%)] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                <Network className="h-4 w-4" />
                Firewall Check Point
              </div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
                Dashboard de troubleshooting por botões
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Execute comandos via SSH, organize os dados em cards coloridos e gere recomendações automáticas para saúde do ambiente.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-slate-400">Botão disponível</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-bold text-cyan-100">
                <TerminalSquare className="h-5 w-5" />
                Verificar Saúde do Ambiente
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-8">
            <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-cyan-300/10 p-3 text-cyan-200">
                  <Server className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Dados do gateway</h2>
                  <p className="text-sm text-slate-400">Informe hostname, IP e credenciais SSH para a execução.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Hostname">
                  <input
                    className={inputClassName()}
                    placeholder="fw-gw-prod-01"
                    value={form.hostname}
                    onChange={(event) => updateForm("hostname", event.target.value)}
                    required
                  />
                </Field>
                <Field label="IP do gateway">
                  <input
                    className={inputClassName()}
                    placeholder="10.0.0.10"
                    value={form.gatewayIp}
                    onChange={(event) => updateForm("gatewayIp", event.target.value)}
                    required
                  />
                </Field>
                <Field label="Porta SSH">
                  <input
                    className={inputClassName()}
                    type="number"
                    min="1"
                    max="65535"
                    value={form.port}
                    onChange={(event) => updateForm("port", event.target.value)}
                  />
                </Field>
                <Field label="Usuário SSH">
                  <input
                    className={inputClassName()}
                    placeholder="admin"
                    value={form.username}
                    onChange={(event) => updateForm("username", event.target.value)}
                    required
                  />
                </Field>
                <Field label="Senha SSH" hint="Use senha ou chave privada. A senha não é armazenada no histórico.">
                  <input
                    className={inputClassName()}
                    type="password"
                    value={form.password}
                    onChange={(event) => updateForm("password", event.target.value)}
                    autoComplete="current-password"
                  />
                </Field>
                <Field label="Passphrase da chave">
                  <input
                    className={inputClassName()}
                    type="password"
                    value={form.passphrase}
                    onChange={(event) => updateForm("passphrase", event.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Chave privada SSH" hint="Opcional. Cole a chave PEM quando não usar senha.">
                    <textarea
                      className={`${inputClassName()} min-h-32 font-mono text-xs`}
                      value={form.privateKey}
                      onChange={(event) => updateForm("privateKey", event.target.value)}
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                    />
                  </Field>
                </div>
              </div>

              {error ? (
                <div className="mt-5 rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                  Verificar Saúde do Ambiente
                </button>

                {report ? (
                  <button
                    type="button"
                    onClick={() => downloadReport(report.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
                  >
                    <Download className="h-5 w-5" />
                    Exportar relatório
                  </button>
                ) : null}
              </div>
            </form>

            {loading || loadingHistoryRun ? (
              <div className="flex min-h-64 items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.06]">
                <div className="text-center">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-300" />
                  <p className="mt-4 font-bold text-white">Executando troubleshooting...</p>
                  <p className="mt-1 text-sm text-slate-400">Coletando comandos e gerando análise inteligente.</p>
                </div>
              </div>
            ) : null}

            {report && !loading && !loadingHistoryRun ? (
              <div className="space-y-6">
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Resultado</p>
                      <h2 className="mt-2 text-2xl font-black">{report.target.hostname}</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {report.target.gatewayIp} • {new Date(report.startedAt).toLocaleString("pt-BR")} • {report.durationMs} ms
                      </p>
                    </div>
                    <StatusBadge status={report.overallStatus} />
                  </div>
                </div>

                <SummaryTiles report={report} />
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
      </div>
    </main>
  );
}

export default App;
