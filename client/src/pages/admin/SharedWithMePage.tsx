import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import DemoButton from "../../components/admin/DemoButton";
import type { TourStep } from "../../components/admin/GuidedTour";

const SHARED_DEMO: TourStep[] = [
  {
    title: "Partagés avec moi 🤝",
    text: "Vous trouvez ici les quiz qu'un collègue a choisi de vous partager.",
  },
  {
    title: "Lecture seule",
    text: "Vous pouvez utiliser ces quiz et consulter leurs statistiques, mais pas les modifier (ils appartiennent à leur auteur).",
  },
  {
    title: "Partager les vôtres",
    text: "Pour partager un de vos quiz à un collègue, allez dans « Contenus » et utilisez l'icône de partage 🔗 sur le quiz.",
  },
];
import type { SharedQuizRow } from "../../types";

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

interface SharedDetail {
  id: number;
  title: string;
  description: string | null;
  subTheme?: { name: string; theme?: { name: string; emoji: string } };
  questions: {
    id: number;
    text: string;
    type: string;
    hint: string | null;
    solution: string | null;
    answers: { id: number; text: string; isCorrect: boolean; zone: string | null; order: number }[];
  }[];
}

export default function SharedWithMePage() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<SharedQuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SharedDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/shared-quizzes", { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Impossible de charger les quiz partagés"))))
      .then((d) => setQuizzes(d.quizzes ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function openDetail(id: number) {
    setDetailLoading(true);
    setDetail(null);
    fetch(`/api/admin/shared-quizzes/${id}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Quiz indisponible"))))
      .then((d) => setDetail(d.quiz))
      .catch((e: Error) => setError(e.message))
      .finally(() => setDetailLoading(false));
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-ms-dark">Partagés avec moi</h1>
          <p className="text-ms-gray">Quiz que d'autres professeurs vous ont partagés (lecture seule).</p>
        </div>
        <DemoButton steps={SHARED_DEMO} />
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-ms-lavender border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="bg-ms-pink-light border border-ms-pink/30 rounded-2xl p-4 mb-6 text-ms-dark font-medium">{error}</div>
      )}

      {!loading && !error && quizzes.length === 0 && (
        <div className="bg-white rounded-2xl border border-ms-light-gray/50 p-12 text-center">
          <p className="text-5xl mb-4">🔗</p>
          <p className="text-lg text-ms-gray font-medium">Aucun quiz partagé avec vous pour le moment.</p>
        </div>
      )}

      {!loading && !error && quizzes.length > 0 && (
        <div className="space-y-3">
          {quizzes.map((q) => (
            <div key={q.id} className="bg-white border border-ms-light-gray rounded-2xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-ms-dark truncate">{q.title}</h3>
                <p className="text-sm text-ms-gray truncate">
                  {q.emoji} {q.theme} &gt; {q.subTheme} · {q.totalQuestions} question{q.totalQuestions > 1 ? "s" : ""} · par {q.owner}
                </p>
              </div>
              <button
                onClick={() => openDetail(q.id)}
                className="px-3 py-1.5 text-sm font-semibold text-ms-lavender hover:bg-ms-lavender-light rounded-lg transition shrink-0"
              >
                Voir
              </button>
              <button
                onClick={() => navigate("/admin/stats")}
                className="px-3 py-1.5 text-sm font-semibold text-ms-blue hover:bg-ms-blue-light rounded-lg transition shrink-0"
                title="Les stats de ce quiz apparaissent dans Statistiques"
              >
                Stats
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Détail lecture seule */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {detailLoading && <p className="text-ms-gray text-center py-8">Chargement...</p>}
            {detail && (
              <>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h2 className="text-lg font-extrabold text-ms-dark">{detail.title}</h2>
                  <span className="text-xs bg-ms-cream px-2 py-0.5 rounded-full text-ms-gray shrink-0">lecture seule</span>
                </div>
                <p className="text-sm text-ms-gray mb-4">
                  {detail.subTheme?.theme?.emoji} {detail.subTheme?.theme?.name} &gt; {detail.subTheme?.name}
                </p>
                <div className="space-y-3">
                  {detail.questions.map((qq, i) => (
                    <div key={qq.id} className="border border-ms-light-gray rounded-xl p-3">
                      <p className="font-semibold text-ms-dark">
                        {i + 1}. {qq.text} <span className="text-[10px] uppercase text-ms-gray">{qq.type}</span>
                      </p>
                      {qq.answers.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {qq.answers.map((a) => (
                            <li key={a.id} className={`text-sm ${a.isCorrect ? "text-ms-green font-semibold" : "text-ms-gray"}`}>
                              {a.isCorrect ? "✓" : "•"} {a.text}{a.zone ? ` → ${a.zone}` : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                      {qq.hint && <p className="text-xs text-ms-gray mt-2">💡 Indice : {qq.hint}</p>}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-5">
                  <button
                    onClick={() => setDetail(null)}
                    className="px-5 py-2 text-sm font-semibold bg-ms-lavender text-white rounded-xl hover:opacity-90 transition"
                  >
                    Fermer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
