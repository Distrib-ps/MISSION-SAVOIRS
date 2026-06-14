import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import AdminLayout from "../../components/admin/AdminLayout";
import type { SchoolLevel, StatsOverview, StudentStatRow, StudentStatDetail } from "../../types";

const LEVELS: SchoolLevel[] = ["CP", "CE1", "CE2", "CM1", "CM2"];

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

function pct(n: number): string {
  return `${n}%`;
}

/* ── Carte KPI ── */
function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-ms-light-gray rounded-2xl p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-ms-gray">{label}</p>
      <p className="text-3xl font-extrabold text-ms-dark mt-1">{value}</p>
      {sub && <p className="text-xs text-ms-gray mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Barre horizontale (taux 0-100) ── */
function BarStat({
  label,
  rate,
  count,
  color = "bg-ms-lavender",
}: {
  label: string;
  rate: number;
  count?: number;
  color?: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm text-ms-dark truncate pr-2">{label}</span>
        <span className="text-sm font-bold text-ms-dark whitespace-nowrap">
          {pct(rate)}
          {count !== undefined && <span className="text-xs text-ms-gray font-normal"> · {count}</span>}
        </span>
      </div>
      <div className="h-2.5 bg-ms-cream rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${rate}%` }} />
      </div>
    </div>
  );
}

/* ── Courbe de progression (SVG, scores % dans le temps) ── */
function Sparkline({ rates }: { rates: number[] }) {
  const w = 480;
  const h = 120;
  const pad = 8;
  if (rates.length === 0) return <p className="text-sm text-ms-gray">Aucune donnée.</p>;
  const stepX = rates.length > 1 ? (w - 2 * pad) / (rates.length - 1) : 0;
  const y = (r: number) => h - pad - (r / 100) * (h - 2 * pad);
  const pts = rates.map((r, i) => `${pad + i * stepX},${y(r)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none">
      {[0, 50, 100].map((g) => (
        <line key={g} x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="#eee" strokeWidth={1} />
      ))}
      <polyline fill="none" stroke="#C4ACF4" strokeWidth={2.5} points={pts} strokeLinejoin="round" />
      {rates.map((r, i) => (
        <circle key={i} cx={pad + i * stepX} cy={y(r)} r={3} fill="#C4ACF4" />
      ))}
    </svg>
  );
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stats");
  XLSX.writeFile(wb, filename, { bookType: "csv" });
}

const today = () => new Date().toISOString().slice(0, 10);

export default function StatsPage() {
  const [tab, setTab] = useState<"global" | "student">("global");
  const [level, setLevel] = useState<SchoolLevel | "">("");
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [students, setStudents] = useState<StudentStatRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<StudentStatDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vue globale
  useEffect(() => {
    if (tab !== "global") return;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/stats/overview${level ? `?level=${level}` : ""}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Impossible de charger les statistiques"))))
      .then((d: StatsOverview) => setOverview(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab, level]);

  // Liste élèves (onglet par élève)
  useEffect(() => {
    if (tab !== "student") return;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/stats/students`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Impossible de charger les élèves"))))
      .then((d) => setStudents(d.students ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  // Détail élève
  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      return;
    }
    fetch(`/api/admin/stats/students/${selectedId}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Impossible de charger l'élève"))))
      .then((d: StudentStatDetail) => setDetail(d))
      .catch((e: Error) => setError(e.message));
  }, [selectedId]);

  function exportGlobal() {
    if (!overview) return;
    const rows: (string | number)[][] = [
      ["KPI", "Valeur"],
      ["Élèves", overview.cards.students],
      ["Tentatives", overview.cards.attempts],
      ["Quiz terminés", overview.cards.completed],
      ["Taux de réussite moyen (%)", overview.cards.avgSuccessRate],
      ["Usage des indices (%)", overview.hintUsageRate],
      ["Récupération après erreur (%)", overview.reinjection.recoveryRate],
      [],
      ["Quiz", "Thème", "Tentatives", "Taux de réussite (%)"],
      ...overview.perQuiz.map((q) => [q.title, q.theme, q.attempts, q.successRate]),
      [],
      ["Thème", "Tentatives", "Taux de réussite (%)"],
      ...overview.perTheme.map((t) => [t.name, t.attempts, t.successRate]),
    ];
    downloadCsv(`kpi_global_${level || "tous"}_${today()}.csv`, rows);
  }

  function exportStudent() {
    if (!detail) return;
    const rows: (string | number)[][] = [
      ["Élève", detail.student.name],
      ["Niveau", detail.student.level ?? "—"],
      ["Tentatives", detail.summary.attempts],
      ["Quiz terminés", detail.summary.completed],
      ["Taux de réussite moyen (%)", detail.summary.avgSuccessRate],
      [],
      ["Date", "Quiz", "Score", "Total", "Taux (%)"],
      ...detail.progression.map((p) => [
        new Date(p.date).toLocaleString("fr-FR"),
        p.quizTitle,
        p.score,
        p.total,
        p.rate,
      ]),
    ];
    downloadCsv(`kpi_${detail.student.name.replace(/\s+/g, "_")}_${today()}.csv`, rows);
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold text-ms-dark">KPI &amp; Statistiques</h1>
        <div className="flex gap-2 bg-ms-cream rounded-xl p-1">
          <button
            onClick={() => setTab("global")}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
              tab === "global" ? "bg-white text-ms-dark shadow-sm" : "text-ms-gray"
            }`}
          >
            Vue globale
          </button>
          <button
            onClick={() => setTab("student")}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
              tab === "student" ? "bg-white text-ms-dark shadow-sm" : "text-ms-gray"
            }`}
          >
            Par élève
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-ms-pink-light border border-ms-pink rounded-2xl p-4 mb-6 text-ms-dark font-medium">
          {error}
        </div>
      )}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-ms-lavender border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ══════════ VUE GLOBALE ══════════ */}
      {!loading && tab === "global" && overview && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-ms-gray">Niveau :</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as SchoolLevel | "")}
                className="px-3 py-1.5 border border-ms-light-gray rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/40"
              >
                <option value="">Tous</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={exportGlobal}
              className="text-sm font-semibold text-ms-lavender border border-ms-lavender/40 px-4 py-1.5 rounded-lg hover:bg-ms-lavender-light transition"
            >
              Exporter (CSV)
            </button>
          </div>

          {/* Cartes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Élèves" value={overview.cards.students} />
            <KpiCard label="Tentatives" value={overview.cards.attempts} sub={`${overview.cards.completed} terminées`} />
            <KpiCard label="Réussite moyenne" value={pct(overview.cards.avgSuccessRate)} />
            <KpiCard label="Contenu" value={`${overview.cards.quizzes} quiz`} sub={`${overview.cards.themes} thèmes`} />
          </div>

          {/* Encarts pédagogiques */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-ms-green-light border border-ms-green/30 rounded-2xl p-4">
              <p className="text-sm font-bold text-ms-dark">Réduction des erreurs</p>
              <p className="text-3xl font-extrabold text-ms-dark mt-1">{pct(overview.reinjection.recoveryRate)}</p>
              <p className="text-xs text-ms-gray mt-0.5">
                {overview.reinjection.recovered}/{overview.reinjection.failed} questions ratées puis réussies
              </p>
            </div>
            <div className="bg-ms-yellow-light border border-ms-yellow/30 rounded-2xl p-4">
              <p className="text-sm font-bold text-ms-dark">Usage des indices</p>
              <p className="text-3xl font-extrabold text-ms-dark mt-1">{pct(overview.hintUsageRate)}</p>
              <p className="text-xs text-ms-gray mt-0.5">des réponses ont utilisé un indice</p>
            </div>
          </div>

          {/* Par thème */}
          <div className="bg-white border border-ms-light-gray rounded-2xl p-5">
            <h2 className="font-bold text-ms-dark mb-3">Taux de réussite par thème</h2>
            {overview.perTheme.length === 0 ? (
              <p className="text-sm text-ms-gray">Aucune donnée.</p>
            ) : (
              <div className="space-y-3">
                {overview.perTheme.map((t) => (
                  <BarStat key={t.themeId} label={`${t.emoji} ${t.name}`} rate={t.successRate} count={t.attempts} />
                ))}
              </div>
            )}
          </div>

          {/* Par quiz */}
          <div className="bg-white border border-ms-light-gray rounded-2xl p-5">
            <h2 className="font-bold text-ms-dark mb-3">Taux de réussite par quiz</h2>
            {overview.perQuiz.length === 0 ? (
              <p className="text-sm text-ms-gray">Aucune donnée.</p>
            ) : (
              <div className="space-y-3">
                {overview.perQuiz.map((q) => (
                  <BarStat
                    key={q.quizId}
                    label={`${q.title} · ${q.theme}`}
                    rate={q.successRate}
                    count={q.attempts}
                    color="bg-ms-blue"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Par niveau */}
          <div className="bg-white border border-ms-light-gray rounded-2xl p-5">
            <h2 className="font-bold text-ms-dark mb-3">Réussite par niveau</h2>
            <div className="space-y-3">
              {overview.byLevel.map((l) => (
                <BarStat
                  key={l.level}
                  label={`${l.level} (${l.students} élève${l.students > 1 ? "s" : ""})`}
                  rate={l.successRate}
                  count={l.attempts}
                  color="bg-ms-green"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ PAR ÉLÈVE ══════════ */}
      {!loading && tab === "student" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm font-semibold text-ms-gray">Élève :</label>
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-1.5 border border-ms-light-gray rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/40 min-w-64"
            >
              <option value="">— Sélectionner —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.level ? `(${s.level})` : ""}
                </option>
              ))}
            </select>
            {detail && (
              <button
                onClick={exportStudent}
                className="ml-auto text-sm font-semibold text-ms-lavender border border-ms-lavender/40 px-4 py-1.5 rounded-lg hover:bg-ms-lavender-light transition"
              >
                Exporter (CSV)
              </button>
            )}
          </div>

          {!selectedId && (
            <div className="bg-white border border-ms-light-gray rounded-2xl p-10 text-center text-ms-gray">
              Sélectionne un élève pour voir son détail.
            </div>
          )}

          {detail && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Tentatives" value={detail.summary.attempts} sub={`${detail.summary.completed} terminées`} />
                <KpiCard label="Réussite moyenne" value={pct(detail.summary.avgSuccessRate)} />
                <KpiCard label="Récupération" value={pct(detail.reinjection.recoveryRate)} sub={`${detail.reinjection.recovered}/${detail.reinjection.failed} ratées→réussies`} />
                <KpiCard label="Usage indices" value={pct(detail.hintUsageRate)} />
              </div>

              <div className="bg-white border border-ms-light-gray rounded-2xl p-5">
                <h2 className="font-bold text-ms-dark mb-3">Progression dans le temps</h2>
                <Sparkline rates={detail.progression.map((p) => p.rate)} />
                <p className="text-xs text-ms-gray mt-2">{detail.progression.length} tentative(s) — taux de réussite (%)</p>
              </div>

              <div className="bg-white border border-ms-light-gray rounded-2xl p-5">
                <h2 className="font-bold text-ms-dark mb-3">Réussite par thème</h2>
                {detail.perTheme.length === 0 ? (
                  <p className="text-sm text-ms-gray">Aucune donnée.</p>
                ) : (
                  <div className="space-y-3">
                    {detail.perTheme.map((t) => (
                      <BarStat key={t.themeId} label={`${t.emoji} ${t.name}`} rate={t.successRate} count={t.attempts} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
