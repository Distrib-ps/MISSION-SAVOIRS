import { Fragment, useEffect, useState } from "react";
import { downloadCsv } from "../../lib/spreadsheet";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import AdminLayout from "../../components/admin/AdminLayout";
import { StatsDemo } from "../../components/admin/StatsDemo";
import type {
  SchoolLevel,
  StatsOverview,
  StudentStatRow,
  StudentStatDetail,
  QuizQuestionDetail,
} from "../../types";

const LEVELS: SchoolLevel[] = ["CP", "CE1", "CE2", "CM1", "CM2"];

function authHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` };
}
const pct = (n: number) => `${n}%`;
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

/* couleur de barre selon le taux */
const rateColor = (r: number) => (r >= 70 ? "#7FD8A6" : r >= 40 ? "#FFD23F" : "#FF9AA2");

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-ms-light-gray rounded-2xl p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-ms-gray">{label}</p>
      <p className="text-3xl font-extrabold text-ms-dark mt-1">{value}</p>
      {sub && <p className="text-xs text-ms-gray mt-0.5">{sub}</p>}
    </div>
  );
}

/* Graphe en barres horizontales (catégorie en Y) — lisible pour des libellés longs */
function HBarChart({
  data,
  height,
}: {
  data: { label: string; rate: number; attempts: number }[];
  height: number;
}) {
  if (data.length === 0) return <p className="text-sm text-ms-gray">Aucune donnée.</p>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 11 }} />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((v: any, _n: any, p: any) => [`${v}% · ${p?.payload?.attempts ?? 0} tentative(s)`, "Réussite"]) as never}
            cursor={{ fill: "#faf7ff" }}
          />
          <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={18}>
            {data.map((d, i) => (
              <Cell key={i} fill={rateColor(d.rate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


export default function StatsPage() {
  const [tab, setTab] = useState<"global" | "student">("global");
  const [level, setLevel] = useState<SchoolLevel | "">("");
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [students, setStudents] = useState<StudentStatRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<StudentStatDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Détail question-par-question d'un quiz (lazy, par quizId)
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);
  const [qDetails, setQDetails] = useState<Record<number, QuizQuestionDetail[]>>({});

  function toggleQuiz(quizId: number) {
    if (expandedQuiz === quizId) {
      setExpandedQuiz(null);
      return;
    }
    setExpandedQuiz(quizId);
    if (!qDetails[quizId] && selectedId != null) {
      fetch(`/api/admin/stats/students/${selectedId}/quizzes/${quizId}/questions`, { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Détail indisponible"))))
        .then((d) => setQDetails((prev) => ({ ...prev, [quizId]: d.questions ?? [] })))
        .catch(() => setQDetails((prev) => ({ ...prev, [quizId]: [] })));
    }
  }

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

  useEffect(() => {
    setExpandedQuiz(null);
    setQDetails({});
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
    downloadCsv(`kpi_global_${level || "tous"}_${today()}.csv`, [
      ["Indicateur", "Valeur"],
      ["Élèves", overview.cards.students],
      ["Tentatives", overview.cards.attempts],
      ["Quiz terminés", overview.cards.completed],
      ["Taux de réussite moyen (%)", overview.cards.avgSuccessRate],
      ["Usage des indices (%)", overview.hintUsageRate],
      ["Récupération après erreur (%)", overview.reinjection.recoveryRate],
      [],
      ["Quiz", "Thème", "Tentatives", "Taux (%)"],
      ...overview.perQuiz.map((q) => [q.title, q.theme, q.attempts, q.successRate]),
      [],
      ["Thème", "Tentatives", "Taux (%)"],
      ...overview.perTheme.map((t) => [t.name, t.attempts, t.successRate]),
    ]);
  }

  function exportStudent() {
    if (!detail) return;
    downloadCsv(`kpi_${detail.student.name.replace(/\s+/g, "_")}_${today()}.csv`, [
      ["Élève", detail.student.name],
      ["Niveau", detail.student.level ?? "—"],
      ["Tentatives", detail.summary.attempts],
      ["Quiz terminés", detail.summary.completed],
      ["Réussite moyenne (%)", detail.summary.avgSuccessRate],
      [],
      ["Quiz", "Thème", "Tentatives", "Meilleur (%)", "Dernier (%)", "Indices", "Terminé"],
      ...detail.perQuiz.map((q) => [
        q.title, q.theme, q.attempts, q.bestRate, q.lastRate, q.hintCount, q.completed ? "oui" : "non",
      ]),
      [],
      ["Progression — Date", "Quiz", "Score", "Total", "Taux (%)"],
      ...detail.progression.map((p) => [
        new Date(p.date).toLocaleString("fr-FR"), p.quizTitle, p.score, p.total, p.rate,
      ]),
    ]);
  }

  const Tabs = (
    <div data-demo="stats-tabs" className="flex gap-2 bg-ms-cream rounded-xl p-1">
      {(["global", "student"] as const).map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
            tab === t ? "bg-white text-ms-dark shadow-sm" : "text-ms-gray"
          }`}
        >
          {t === "global" ? "Vue globale" : "Par élève"}
        </button>
      ))}
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-ms-dark">Statistiques</h1>
          <StatsDemo />
        </div>
        {Tabs}
      </div>

      {error && (
        <div className="bg-ms-pink-light border border-ms-pink rounded-2xl p-4 mb-6 text-ms-dark font-medium">{error}</div>
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
                <option value="">Tous niveaux</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
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

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Élèves" value={overview.cards.students} />
            <KpiCard label="Tentatives" value={overview.cards.attempts} sub={`${overview.cards.completed} terminées`} />
            <KpiCard label="Réussite moyenne" value={pct(overview.cards.avgSuccessRate)} />
            <KpiCard label="Contenu" value={`${overview.cards.quizzes} quiz`} sub={`${overview.cards.themes} thèmes`} />
          </div>

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

          <div className="bg-white border border-ms-light-gray rounded-2xl p-5">
            <h2 className="font-bold text-ms-dark mb-3">Réussite par thème</h2>
            <HBarChart
              height={Math.max(120, overview.perTheme.length * 44)}
              data={overview.perTheme.map((t) => ({ label: `${t.emoji} ${t.name}`, rate: t.successRate, attempts: t.attempts }))}
            />
          </div>

          <div className="bg-white border border-ms-light-gray rounded-2xl p-5">
            <h2 className="font-bold text-ms-dark mb-3">Réussite par quiz</h2>
            <HBarChart
              height={Math.max(120, overview.perQuiz.length * 40)}
              data={overview.perQuiz.map((q) => ({ label: q.title, rate: q.successRate, attempts: q.attempts }))}
            />
          </div>

          <div className="bg-white border border-ms-light-gray rounded-2xl p-5">
            <h2 className="font-bold text-ms-dark mb-3">Réussite par niveau</h2>
            <HBarChart
              height={LEVELS.length * 40}
              data={overview.byLevel.map((l) => ({
                label: `${l.level} (${l.students})`,
                rate: l.successRate,
                attempts: l.attempts,
              }))}
            />
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

              {/* Courbe de progression */}
              <div className="bg-white border border-ms-light-gray rounded-2xl p-5">
                <h2 className="font-bold text-ms-dark mb-3">Progression dans le temps</h2>
                {detail.progression.length === 0 ? (
                  <p className="text-sm text-ms-gray">Aucune donnée.</p>
                ) : (
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={detail.progression.map((p, i) => ({
                          i: i + 1,
                          rate: p.rate,
                          quiz: p.quizTitle,
                          date: fmtDate(p.date),
                          score: `${p.score}/${p.total}`,
                        }))}
                        margin={{ left: 0, right: 16, top: 8, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                        <Tooltip
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={((v: any) => [`${v}%`, "Réussite"]) as never}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          labelFormatter={((_l: any, p: any) =>
                            p && p[0] ? `${p[0].payload.quiz} — ${p[0].payload.date} (${p[0].payload.score})` : "") as never}
                        />
                        <Line type="monotone" dataKey="rate" stroke="#C4ACF4" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Tableau quiz par quiz */}
              <div className="bg-white border border-ms-light-gray rounded-2xl p-5">
                <h2 className="font-bold text-ms-dark mb-3">Détail quiz par quiz</h2>
                {detail.perQuiz.length === 0 ? (
                  <p className="text-sm text-ms-gray">Aucune tentative.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-ms-gray border-b border-ms-light-gray">
                          <th className="py-2 pr-3 font-semibold">Quiz</th>
                          <th className="py-2 px-3 font-semibold">Thème</th>
                          <th className="py-2 px-3 font-semibold text-center">Tent.</th>
                          <th className="py-2 px-3 font-semibold text-center">Meilleur</th>
                          <th className="py-2 px-3 font-semibold text-center">Dernier</th>
                          <th className="py-2 px-3 font-semibold text-center">Indices</th>
                          <th className="py-2 px-3 font-semibold text-center">Statut</th>
                          <th className="py-2 pl-3 font-semibold text-center">Détail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.perQuiz.map((q) => {
                          const open = expandedQuiz === q.quizId;
                          const qd = qDetails[q.quizId];
                          return (
                            <Fragment key={q.quizId}>
                              <tr className="border-b border-ms-light-gray/50">
                                <td className="py-2 pr-3 font-medium text-ms-dark">{q.title}</td>
                                <td className="py-2 px-3 text-ms-gray">{q.theme}</td>
                                <td className="py-2 px-3 text-center">{q.attempts}</td>
                                <td className="py-2 px-3 text-center font-bold" style={{ color: rateColor(q.bestRate) }}>
                                  {q.bestRate}%
                                </td>
                                <td className="py-2 px-3 text-center">{q.lastRate}%</td>
                                <td className="py-2 px-3 text-center">{q.hintCount}</td>
                                <td className="py-2 px-3 text-center">
                                  {q.completed ? (
                                    <span className="inline-block bg-ms-green text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                      Terminé
                                    </span>
                                  ) : (
                                    <span className="inline-block bg-ms-yellow text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                      En cours
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 pl-3 text-center">
                                  <button
                                    onClick={() => toggleQuiz(q.quizId)}
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-ms-gray hover:bg-ms-lavender-light hover:text-ms-lavender transition"
                                    title="Voir le détail des questions"
                                  >
                                    <svg
                                      className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2.5}
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                              {open && (
                                <tr className="bg-ms-cream/40">
                                  <td colSpan={8} className="p-3">
                                    {!qd ? (
                                      <p className="text-xs text-ms-gray py-2 text-center">Chargement...</p>
                                    ) : qd.length === 0 ? (
                                      <p className="text-xs text-ms-gray py-2 text-center">Aucune réponse enregistrée.</p>
                                    ) : (
                                      <ul className="space-y-1.5">
                                        {qd.map((item) => (
                                          <li
                                            key={item.questionId}
                                            className="flex items-center gap-3 bg-white border border-ms-light-gray rounded-lg px-3 py-2"
                                          >
                                            <span
                                              className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                                item.correct ? "bg-ms-green" : "bg-ms-pink"
                                              }`}
                                            >
                                              {item.correct ? "✓" : "✕"}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-ms-dark truncate">{item.text}</p>
                                              <p className="text-xs text-ms-gray truncate">
                                                Réponse : {item.givenAnswer || "—"}
                                              </p>
                                            </div>
                                            {item.wrongCount > 0 && (
                                              <span className="shrink-0 text-xs text-ms-pink font-semibold">
                                                {item.wrongCount} erreur{item.wrongCount > 1 ? "s" : ""}
                                              </span>
                                            )}
                                            {item.usedHint && (
                                              <span className="shrink-0 text-xs text-ms-gray" title="Indice utilisé">
                                                💡
                                              </span>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Par thème */}
                <div className="bg-white border border-ms-light-gray rounded-2xl p-5">
                  <h2 className="font-bold text-ms-dark mb-3">Réussite par thème</h2>
                  <HBarChart
                    height={Math.max(120, detail.perTheme.length * 44)}
                    data={detail.perTheme.map((t) => ({ label: `${t.emoji} ${t.name}`, rate: t.successRate, attempts: t.attempts }))}
                  />
                </div>

                {/* Points faibles */}
                <div className="bg-white border border-ms-light-gray rounded-2xl p-5">
                  <h2 className="font-bold text-ms-dark mb-3">Points faibles</h2>
                  {detail.weakPoints.length === 0 ? (
                    <p className="text-sm text-ms-gray">Aucune erreur enregistrée 🎉</p>
                  ) : (
                    <ul className="space-y-2">
                      {detail.weakPoints.map((w) => (
                        <li key={w.questionId} className="flex items-center gap-3 text-sm">
                          <span className="w-9 h-7 shrink-0 flex items-center justify-center bg-ms-pink-light text-ms-pink font-extrabold rounded-lg text-xs">
                            ×{w.wrongCount}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-ms-dark truncate">{w.text}</p>
                            <p className="text-xs text-ms-gray truncate">{w.emoji} {w.quiz}</p>
                          </div>
                          {w.recovered && (
                            <span className="shrink-0 text-xs font-semibold text-ms-green" title="Rattrapée depuis">
                              rattrapée
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
