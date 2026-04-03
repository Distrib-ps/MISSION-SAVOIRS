import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StudentLayout from "../../components/student/StudentLayout";
import type { QuizQuestion, QuizSession, AnswerResult, QuizResults } from "../../types";

/* ── Helpers ── */

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

type Phase = "start" | "playing" | "results";

/* answer‑attempt state per question */
interface AttemptState {
  attempts: number;
  usedHint: boolean;
  disabledAnswerIds: number[];        // QCM: answers already tried & wrong
  feedback: null | "correct" | "wrong";
  hint: string | null;
  solution: string | null;
  correctAnswer: string | null;       // revealed after 2nd wrong
  showingSolution: boolean;
}

const INITIAL_ATTEMPT: AttemptState = {
  attempts: 0,
  usedHint: false,
  disabledAnswerIds: [],
  feedback: null,
  hint: null,
  solution: null,
  correctAnswer: null,
  showingSolution: false,
};

/* ══════════════════════════════════════════════════ */

export default function QuizPlayPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  /* high‑level state */
  const [phase, setPhase] = useState<Phase>("start");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* quiz data */
  const [session, setSession] = useState<QuizSession | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [attempt, setAttempt] = useState<AttemptState>(INITIAL_ATTEMPT);
  const [submitting, setSubmitting] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");

  /* results */
  const [results, setResults] = useState<QuizResults | null>(null);

  /* derived */
  const questions: QuizQuestion[] = session?.questions ?? [];
  const currentQuestion: QuizQuestion | undefined = questions[currentIdx];
  const totalQuestions = questions.length;

  /* ── Start quiz ── */

  const startQuiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/quizzes/${quizId}/start`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Impossible de demarrer le quiz");
      const data: QuizSession = await res.json();
      setSession(data);
      setCurrentIdx(0);
      setAttempt(INITIAL_ATTEMPT);
      setTextAnswer("");
      setPhase("playing");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  /* ── Submit answer ── */

  const submitAnswer = useCallback(
    async (answer: string, answerId?: number) => {
      if (!session || !currentQuestion || submitting) return;
      setSubmitting(true);

      const isMulti = (currentQuestion.correctCount ?? 1) > 1;
      const usedHint = attempt.usedHint || attempt.hint !== null;

      try {
        const res = await fetch(`/api/student/quizzes/${quizId}/answer`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            attemptId: session.attemptId,
            questionId: currentQuestion.id,
            answer,
            usedHint,
          }),
        });
        if (!res.ok) throw new Error("Erreur lors de la soumission");
        const result: AnswerResult = await res.json();

        const newAttempts = attempt.attempts + 1;

        if (result.correct) {
          /* ✅ Correct */
          setAttempt((prev) => ({
            ...prev,
            attempts: newAttempts,
            feedback: "correct",
            usedHint,
          }));
          /* Auto-advance after 1.5s */
          setTimeout(() => advanceToNext(), 1500);
        } else if (newAttempts >= 2) {
          /* ❌ 2nd wrong – show solution */
          setAttempt((prev) => ({
            ...prev,
            attempts: newAttempts,
            feedback: "wrong",
            usedHint,
            solution: result.solution ?? null,
            correctAnswer: result.correctAnswer ?? null,
            showingSolution: true,
            disabledAnswerIds: !isMulti && answerId
              ? [...prev.disabledAnswerIds, answerId]
              : prev.disabledAnswerIds,
          }));
        } else {
          /* ❌ 1st wrong – show hint */
          setAttempt((prev) => ({
            ...prev,
            attempts: newAttempts,
            feedback: "wrong",
            usedHint: result.hint ? true : usedHint,
            hint: result.hint ?? null,
            disabledAnswerIds: !isMulti && answerId
              ? [...prev.disabledAnswerIds, answerId]
              : prev.disabledAnswerIds,
          }));
          /* Clear the red flash after 700ms but keep hint */
          setTimeout(() => {
            setAttempt((prev) => ({ ...prev, feedback: null }));
          }, 700);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        setSubmitting(false);
      }
    },
    [session, currentQuestion, submitting, attempt, quizId],
  );

  /* ── Advance to next question or finish ── */

  const advanceToNext = useCallback(() => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= totalQuestions) {
      /* All done → fetch results */
      fetchResults();
    } else {
      setCurrentIdx(nextIdx);
      setAttempt(INITIAL_ATTEMPT);
      setTextAnswer("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, totalQuestions]);

  /* ── Fetch results ── */

  const fetchResults = useCallback(async () => {
    if (!session) return;
    setPhase("results");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/student/quizzes/${quizId}/results?attemptId=${session.attemptId}`,
        { headers: authHeaders() },
      );
      if (!res.ok) throw new Error("Impossible de charger les resultats");
      const data: QuizResults = await res.json();
      setResults(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [quizId, session]);

  /* ── Restart quiz ── */

  const restart = useCallback(() => {
    setPhase("start");
    setSession(null);
    setResults(null);
    setCurrentIdx(0);
    setAttempt(INITIAL_ATTEMPT);
    setTextAnswer("");
    setError(null);
  }, []);

  /* ══════════════════════════════════════════════════ */
  /* Render                                            */
  /* ══════════════════════════════════════════════════ */

  return (
    <StudentLayout>
      {/* ── Error banner ── */}
      {error && (
        <div className="bg-ms-pink-light border border-ms-pink/30 rounded-2xl p-6 text-center mb-6">
          <p className="text-ms-dark font-semibold">{error}</p>
        </div>
      )}

      {/* ── Phase: START ── */}
      {phase === "start" && <StartScreen loading={loading} onStart={startQuiz} />}

      {/* ── Phase: PLAYING ── */}
      {phase === "playing" && currentQuestion && (
        <PlayingScreen
          question={currentQuestion}
          index={currentIdx}
          total={totalQuestions}
          attempt={attempt}
          submitting={submitting}
          textAnswer={textAnswer}
          onTextChange={setTextAnswer}
          onSubmitQCM={(answerStr, id) => {
            // answerStr can be "5" for single or "5,8" for multi
            submitAnswer(answerStr.includes(",") ? answerStr : String(id), id);
          }}
          onSubmitText={() => {
            if (textAnswer.trim()) submitAnswer(textAnswer.trim());
          }}
          onAdvance={advanceToNext}
        />
      )}

      {/* ── Phase: RESULTS ── */}
      {phase === "results" && (
        <ResultsScreen
          results={results}
          loading={loading}
          onBack={() => navigate(-1)}
          onRestart={restart}
        />
      )}
    </StudentLayout>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  START SCREEN                                            */
/* ══════════════════════════════════════════════════════════ */

function StartScreen({
  loading,
  onStart,
}: {
  loading: boolean;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 bg-ms-lavender rounded-3xl flex items-center justify-center mb-8 shadow-md">
        <svg
          className="w-12 h-12 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>

      <h1 className="text-3xl font-extrabold text-ms-dark mb-3">
        Pret a jouer ?
      </h1>
      <p className="text-lg text-ms-gray font-medium mb-10">
        Reponds aux questions et montre ce que tu sais !
      </p>

      <button
        onClick={onStart}
        disabled={loading}
        className="bg-ms-lavender hover:bg-ms-lavender/80 text-white font-extrabold text-2xl px-12 py-5 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center gap-3">
            <span className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
            Chargement...
          </span>
        ) : (
          "Commencer !"
        )}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  PLAYING SCREEN                                          */
/* ══════════════════════════════════════════════════════════ */

function PlayingScreen({
  question,
  index,
  total,
  attempt,
  submitting,
  textAnswer,
  onTextChange,
  onSubmitQCM,
  onSubmitText,
  onAdvance,
}: {
  question: QuizQuestion;
  index: number;
  total: number;
  attempt: AttemptState;
  submitting: boolean;
  textAnswer: string;
  onTextChange: (v: string) => void;
  onSubmitQCM: (text: string, id: number) => void;
  onSubmitText: () => void;
  onAdvance: () => void;
}) {
  const progressPct = ((index + 1) / total) * 100;
  const isCorrect = attempt.feedback === "correct";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-bold text-ms-dark">
            Question {index + 1}/{total}
          </span>
          <span className="text-sm font-semibold text-ms-gray">
            {Math.round(progressPct)}%
          </span>
        </div>
        <div className="w-full h-5 bg-ms-light-gray rounded-full overflow-hidden">
          <div
            className="h-full bg-ms-lavender rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question text */}
      <div className="bg-white rounded-3xl border border-ms-light-gray/50 p-8 mb-6 shadow-sm">
        {question.isReinjected && (
          <span className="inline-flex items-center gap-1 px-3 py-1 mb-3 rounded-full text-xs font-bold bg-ms-yellow-light text-ms-dark">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Révision
          </span>
        )}
        <p className="text-xl font-bold text-ms-dark leading-relaxed">
          {question.text}
        </p>
      </div>

      {/* ── Correct feedback ── */}
      {isCorrect && (
        <div className="bg-ms-green-light border-2 border-ms-green/40 rounded-3xl p-6 mb-6 text-center animate-bounce-once">
          <p className="text-2xl font-extrabold text-ms-dark">
            Bravo ! &#127775;
          </p>
        </div>
      )}

      {/* ── Hint box (1st wrong) ── */}
      {attempt.hint && !attempt.showingSolution && (
        <div className="bg-ms-blue-light border-2 border-ms-blue/30 rounded-3xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">&#128161;</span>
            <div>
              <p className="font-bold text-ms-dark text-lg mb-1">Un indice !</p>
              <p className="text-ms-dark text-base">{attempt.hint}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Solution box (2nd wrong) ── */}
      {attempt.showingSolution && (
        <div className="space-y-4 mb-6">
          {attempt.solution && (
            <div className="bg-ms-yellow-light border-2 border-ms-yellow/40 rounded-3xl p-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">&#128218;</span>
                <div>
                  <p className="font-bold text-ms-dark text-lg mb-1">
                    Explication
                  </p>
                  <p className="text-ms-dark text-base">{attempt.solution}</p>
                </div>
              </div>
            </div>
          )}
          {attempt.correctAnswer && (
            <div className="bg-ms-green-light border-2 border-ms-green/40 rounded-3xl p-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">&#9989;</span>
                <div>
                  <p className="font-bold text-ms-dark text-lg mb-1">
                    La bonne reponse
                  </p>
                  <p className="text-ms-dark text-lg font-semibold">
                    {attempt.correctAnswer}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Answers ── */}
      {!isCorrect && !attempt.showingSolution && (
        <>
          {question.type === "QCM" && question.answers && (
            <QCMAnswers
              answers={question.answers}
              disabledIds={attempt.disabledAnswerIds}
              submitting={submitting}
              isMulti={(question.correctCount ?? 1) > 1}
              correctCount={question.correctCount ?? 1}
              attemptCount={attempt.attempts}
              onSelect={onSubmitQCM}
            />
          )}

          {question.type === "TEXT" && (
            <TextAnswer
              value={textAnswer}
              submitting={submitting}
              onChange={onTextChange}
              onSubmit={onSubmitText}
            />
          )}
        </>
      )}

      {/* ── "Compris !" button after solution shown ── */}
      {attempt.showingSolution && (
        <div className="text-center mt-6">
          <button
            onClick={onAdvance}
            className="bg-ms-lavender hover:bg-ms-lavender/80 text-white font-extrabold text-xl px-10 py-4 rounded-3xl shadow-md hover:shadow-lg transition-all duration-200"
          >
            Compris !
          </button>
        </div>
      )}
    </div>
  );
}

/* ── QCM answer cards ── */

function QCMAnswers({
  answers,
  disabledIds,
  submitting,
  isMulti,
  correctCount,
  attemptCount,
  onSelect,
}: {
  answers: { id: number; text: string }[];
  disabledIds: number[];
  submitting: boolean;
  isMulti: boolean;
  correctCount: number;
  attemptCount: number;
  onSelect: (text: string, id: number) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Reset selection after a wrong attempt
  useEffect(() => {
    setSelectedIds(new Set());
  }, [attemptCount]);

  const colors = [
    "bg-ms-lavender-light border-ms-lavender/30 hover:border-ms-lavender",
    "bg-ms-blue-light border-ms-blue/30 hover:border-ms-blue",
    "bg-ms-peach-light border-ms-peach/30 hover:border-ms-peach",
    "bg-ms-yellow-light border-ms-yellow/40 hover:border-ms-yellow",
    "bg-ms-green-light border-ms-green/30 hover:border-ms-green",
    "bg-ms-pink-light border-ms-pink/30 hover:border-ms-pink",
  ];

  if (!isMulti) {
    // Single select: click = immediate submit
    return (
      <div className="grid gap-4">
        {answers.map((a, i) => {
          const isDisabled = disabledIds.includes(a.id);
          const colorClass = colors[i % colors.length];
          return (
            <button
              key={a.id}
              disabled={submitting || isDisabled}
              onClick={() => onSelect(a.text, a.id)}
              className={`
                min-h-[60px] w-full text-left rounded-2xl border-2 p-5
                font-semibold text-lg text-ms-dark transition-all duration-200
                ${isDisabled
                  ? "bg-ms-light-gray border-ms-light-gray/50 text-ms-gray opacity-50 cursor-not-allowed line-through"
                  : `${colorClass} cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99]`}
                ${submitting && !isDisabled ? "opacity-60 cursor-wait" : ""}
              `}
            >
              {a.text}
            </button>
          );
        })}
      </div>
    );
  }

  // Multi select: checkboxes + validate button
  function toggleId(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < correctCount) {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div>
      <p className="text-ms-gray text-sm font-medium mb-3">
        Sélectionne {correctCount} réponse{correctCount > 1 ? "s" : ""}
      </p>
      <div className="grid gap-4">
        {answers.map((a, i) => {
          const isDisabled = disabledIds.includes(a.id);
          const isSelected = selectedIds.has(a.id);
          const colorClass = colors[i % colors.length];
          return (
            <button
              key={a.id}
              disabled={submitting || isDisabled}
              onClick={() => toggleId(a.id)}
              className={`
                min-h-[60px] w-full text-left rounded-2xl border-2 p-5
                font-semibold text-lg text-ms-dark transition-all duration-200
                ${isDisabled
                  ? "bg-ms-light-gray border-ms-light-gray/50 text-ms-gray opacity-50 cursor-not-allowed line-through"
                  : isSelected
                  ? "bg-ms-lavender/20 border-ms-lavender ring-2 ring-ms-lavender/50 shadow-md"
                  : `${colorClass} cursor-pointer hover:shadow-md hover:scale-[1.01]`}
                ${submitting && !isDisabled ? "opacity-60 cursor-wait" : ""}
              `}
            >
              <span className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-ms-lavender border-ms-lavender text-white" : "border-ms-light-gray bg-white"
                }`}>
                  {isSelected && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {a.text}
              </span>
            </button>
          );
        })}
      </div>
      <button
        disabled={submitting || selectedIds.size !== correctCount}
        onClick={() => {
          const ids = Array.from(selectedIds);
          onSelect(ids.join(","), ids[0]);
        }}
        className="mt-5 w-full py-4 bg-ms-lavender text-white font-bold text-lg rounded-2xl hover:bg-ms-lavender/85 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
      >
        Valider ({selectedIds.size}/{correctCount})
      </button>
    </div>
  );
}

/* ── TEXT answer input ── */

function TextAnswer({
  value,
  submitting,
  onChange,
  onSubmit,
}: {
  value: string;
  submitting: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onSubmit();
        }}
        placeholder="Ecris ta reponse ici..."
        disabled={submitting}
        className="w-full min-h-[60px] rounded-2xl border-2 border-ms-lavender/30 bg-white px-6 py-4 text-lg font-semibold text-ms-dark placeholder:text-ms-gray/50 focus:outline-none focus:border-ms-lavender focus:ring-2 focus:ring-ms-lavender/20 transition-all disabled:opacity-50"
      />
      <button
        onClick={onSubmit}
        disabled={submitting || !value.trim()}
        className="w-full bg-ms-lavender hover:bg-ms-lavender/80 text-white font-extrabold text-xl py-4 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-3">
            <span className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
            Verification...
          </span>
        ) : (
          "Valider"
        )}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  RESULTS SCREEN                                          */
/* ══════════════════════════════════════════════════════════ */

function ResultsScreen({
  results,
  loading,
  onBack,
  onRestart,
}: {
  results: QuizResults | null;
  loading: boolean;
  onBack: () => void;
  onRestart: () => void;
}) {
  if (loading || !results) {
    return (
      <div className="flex justify-center py-16">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-ms-lavender border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ms-gray text-lg font-medium">
            Calcul du score...
          </p>
        </div>
      </div>
    );
  }

  const pct = results.totalQuestions > 0 ? (results.score / results.totalQuestions) * 100 : 0;

  let emoji: string;
  let message: string;
  if (pct >= 90) {
    emoji = "\u2B50"; // star
    message = "Excellent !";
  } else if (pct >= 70) {
    emoji = "\uD83D\uDC4D"; // thumbs up
    message = "Tres bien !";
  } else if (pct >= 50) {
    emoji = "\uD83D\uDE0A"; // slightly smiling face
    message = "Pas mal !";
  } else {
    emoji = "\uD83D\uDCAA"; // muscle
    message = "Continue tes efforts !";
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Score display */}
      <div className="bg-white rounded-3xl border border-ms-light-gray/50 p-8 text-center mb-8 shadow-sm">
        <p className="text-6xl mb-4">{emoji}</p>
        <p className="text-3xl font-extrabold text-ms-dark mb-2">
          Tu as obtenu {results.score}/{results.totalQuestions} !
        </p>
        <p className="text-xl font-bold text-ms-lavender">{message}</p>
      </div>

      {/* Recap list */}
      <div className="space-y-3 mb-8">
        {results.questions.map((q, i) => (
          <div
            key={q.id}
            className={`rounded-2xl border-2 p-5 ${
              q.isCorrect
                ? "bg-ms-green-light border-ms-green/30"
                : "bg-ms-pink-light border-ms-pink/30"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">
                {q.isCorrect ? "\u2705" : "\u274C"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ms-dark text-base">
                  {i + 1}. {q.text}
                </p>
                {!q.isCorrect && (
                  <p className="text-sm text-ms-gray mt-1">
                    Bonne reponse :{" "}
                    <span className="font-semibold text-ms-dark">
                      {q.correctAnswer}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onBack}
          className="flex-1 bg-ms-cream hover:bg-ms-light-gray text-ms-dark font-extrabold text-lg py-4 rounded-2xl border-2 border-ms-light-gray transition-all duration-200"
        >
          Retour aux quiz
        </button>
        <button
          onClick={onRestart}
          className="flex-1 bg-ms-lavender hover:bg-ms-lavender/80 text-white font-extrabold text-lg py-4 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200"
        >
          Recommencer
        </button>
      </div>
    </div>
  );
}
