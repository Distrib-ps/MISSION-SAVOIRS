import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StudentLayout from "../../components/student/StudentLayout";
import type { StudentQuiz } from "../../types";

export default function QuizzesPage() {
  const { themeId, subThemeId } = useParams<{
    themeId: string;
    subThemeId: string;
  }>();
  const navigate = useNavigate();
  const [subThemeName, setSubThemeName] = useState("");
  const [quizzes, setQuizzes] = useState<StudentQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    // Fetch sub-theme name
    fetch(`/api/student/themes/${themeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.subThemes) {
          const st = data.subThemes.find((s: { id: number }) => s.id === Number(subThemeId));
          if (st) setSubThemeName(st.name);
        }
      })
      .catch(() => {});

    // Fetch quizzes
    fetch(
      `/api/student/themes/${themeId}/sub-themes/${subThemeId}/quizzes`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("Impossible de charger les quiz");
        return res.json();
      })
      .then((data) => {
        const arr = Array.isArray(data) ? data : data.quizzes ?? [];
        const mapped: StudentQuiz[] = arr.map((q: Record<string, unknown>) => ({
          ...q,
          totalQuestions: (q._count as { questions: number })?.questions ?? 0,
          bestScore: (q.bestAttempt as { score: number } | null)?.score ?? null,
        }));
        setQuizzes(mapped);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [themeId, subThemeId]);

  const completedCount = quizzes.filter((q) => q.status === "completed").length;

  return (
    <StudentLayout>
      {/* Back button */}
      <button
        onClick={() => navigate(`/themes/${themeId}`)}
        className="flex items-center gap-2 text-ms-gray hover:text-ms-dark font-semibold mb-6 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Retour aux parcours
      </button>

      {/* Title */}
      {subThemeName && (
        <h1 className="text-3xl font-extrabold text-ms-dark mb-2">
          {subThemeName}
        </h1>
      )}

      {/* Progress summary */}
      {!loading && !error && quizzes.length > 0 && (
        <div className="mb-8">
          <p className="text-ms-gray text-lg font-medium mb-3">
            {completedCount}/{quizzes.length} quiz completes
          </p>
          <div className="w-full h-4 bg-ms-light-gray rounded-full overflow-hidden">
            <div
              className="h-full bg-ms-green rounded-full transition-all duration-500"
              style={{
                width: `${(completedCount / quizzes.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-ms-lavender border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-ms-gray text-lg font-medium">Chargement...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-ms-pink-light border border-ms-pink/30 rounded-2xl p-6 text-center">
          <p className="text-ms-dark font-semibold">{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && quizzes.length === 0 && (
        <div className="bg-white rounded-3xl border border-ms-light-gray/50 p-12 text-center">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-lg text-ms-gray font-medium">
            Aucun quiz disponible pour le moment
          </p>
        </div>
      )}

      {/* Quiz list (vertical path) */}
      {!loading && !error && quizzes.length > 0 && (
        <div className="flex flex-col gap-4">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onClick={
                quiz.status === "available"
                  ? () => navigate(`/quiz/${quiz.id}`)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </StudentLayout>
  );
}

/* ── Quiz card component ── */

function QuizCard({
  quiz,
  onClick,
}: {
  quiz: StudentQuiz;
  onClick?: () => void;
}) {
  if (quiz.status === "completed") {
    return (
      <div className="bg-ms-green-light border-2 border-ms-green/40 rounded-3xl p-6 flex items-center gap-5 min-h-[80px]">
        {/* Checkmark icon */}
        <div className="w-14 h-14 bg-ms-green rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
          <svg
            className="w-7 h-7 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-ms-dark text-xl truncate">
            {quiz.title}
          </h3>
          <p className="text-ms-gray text-base mt-1">
            Score : {quiz.bestScore}/{quiz.totalQuestions}
          </p>
        </div>
        <span className="text-ms-green font-bold text-sm shrink-0">
          Termine !
        </span>
      </div>
    );
  }

  if (quiz.status === "locked") {
    return (
      <div className="bg-white border border-ms-light-gray rounded-3xl p-6 flex items-center gap-5 min-h-[80px] opacity-50 cursor-not-allowed">
        {/* Lock icon */}
        <div className="w-14 h-14 bg-ms-light-gray rounded-2xl flex items-center justify-center shrink-0">
          <svg
            className="w-7 h-7 text-ms-gray"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-ms-dark text-xl truncate">
            {quiz.title}
          </h3>
          <p className="text-ms-gray text-base mt-1">
            {quiz.totalQuestions} questions
          </p>
        </div>
        <svg
          className="w-6 h-6 text-ms-gray shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      </div>
    );
  }

  /* available */
  return (
    <button
      onClick={onClick}
      className="bg-ms-lavender-light border-2 border-ms-lavender/30 rounded-3xl p-6 flex items-center gap-5 min-h-[80px] hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer w-full text-left"
    >
      {/* Play icon */}
      <div className="w-14 h-14 bg-ms-lavender rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
        <svg
          className="w-7 h-7 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-extrabold text-ms-dark text-xl truncate">
          {quiz.title}
        </h3>
        <p className="text-ms-gray text-base mt-1">
          {quiz.totalQuestions} questions
        </p>
      </div>
      <svg
        className="w-6 h-6 text-ms-lavender shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  );
}
