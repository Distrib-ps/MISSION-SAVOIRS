import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StudentLayout from "../../components/student/StudentLayout";
import type { CustomPath } from "../../types";

export default function CustomPathPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const [path, setPath] = useState<CustomPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`/api/student/custom-paths/${pathId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Impossible de charger le parcours");
        return res.json();
      })
      .then((data) => setPath(data.path))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [pathId]);

  const completedCount = path?.quizzes.filter((q) => q.completed).length ?? 0;
  const totalCount = path?.quizzes.length ?? 0;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <StudentLayout>
      {/* Back */}
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-ms-gray hover:text-ms-dark font-semibold mb-6 transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Retour au tableau de bord
      </button>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-ms-lavender border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-ms-gray text-lg font-medium">Chargement...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-ms-pink-light border border-ms-pink/30 rounded-2xl p-6 text-center">
          <p className="text-ms-dark font-semibold">{error}</p>
        </div>
      )}

      {!loading && path && (
        <>
          {/* Header */}
          <div className="bg-gradient-to-br from-ms-lavender-light to-ms-pink-light border-2 border-ms-lavender/30 rounded-3xl p-6 mb-6">
            <span className="inline-block bg-ms-lavender text-white text-xs font-bold px-2 py-0.5 rounded-full mb-2">
              Parcours personnalisé
            </span>
            <h1 className="text-2xl font-extrabold text-ms-dark mb-1">
              {path.name}
            </h1>
            {path.description && (
              <p className="text-ms-gray mb-4">{path.description}</p>
            )}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1 h-3 bg-white/70 rounded-full overflow-hidden">
                <div
                  className="h-full bg-ms-lavender rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-sm font-bold text-ms-dark whitespace-nowrap">
                {completedCount}/{totalCount} quiz
              </span>
            </div>
          </div>

          {/* Quizzes */}
          <div className="space-y-3">
            {path.quizzes.map((quiz, i) => {
              const isCompleted = quiz.completed;
              return (
                <button
                  key={quiz.id}
                  onClick={() => navigate(`/quiz/${quiz.id}?pathId=${pathId}`)}
                  className={`w-full text-left rounded-3xl border-2 p-5 flex items-center gap-4 min-h-[80px] transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${
                    isCompleted
                      ? "bg-ms-green-light border-ms-green/40"
                      : "bg-white border-ms-light-gray hover:border-ms-lavender"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm font-extrabold text-white text-lg ${
                      isCompleted ? "bg-ms-green" : "bg-ms-lavender"
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ms-dark truncate">{quiz.title}</h3>
                    <p className="text-sm text-ms-gray mt-0.5">
                      {isCompleted
                        ? `Terminé : ${quiz.bestScore}/${quiz.totalQuestions}`
                        : `${quiz.totalQuestions} questions`}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-ms-gray shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        </>
      )}
    </StudentLayout>
  );
}
