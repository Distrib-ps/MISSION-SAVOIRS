import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import confetti from "canvas-confetti";
import StudentLayout from "../../components/student/StudentLayout";
import DragDropAnswers from "../../components/student/DragDropAnswers";
import AssociationAnswers from "../../components/student/AssociationAnswers";
import OrderingAnswers from "../../components/student/OrderingAnswers";
import DrawingCanvas from "../../components/student/DrawingCanvas";
import type { QuizQuestion, QuizSession, AnswerResult, QuizResults } from "../../types";

/* ── Confetti helpers ── */

const MS_COLORS = ["#C4ACF4", "#98E2FD", "#FFB3BA", "#FFDE55", "#B5EAD7", "#F8C291"];

function smallConfettiBurst() {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.55 },
    colors: MS_COLORS,
    ticks: 120,
    gravity: 1.2,
    scalar: 0.9,
  });
}

function bigConfettiBurst() {
  const duration = 2500;
  const end = Date.now() + duration;
  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 75,
      origin: { x: 0, y: 0.7 },
      colors: MS_COLORS,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 75,
      origin: { x: 1, y: 0.7 },
      colors: MS_COLORS,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

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
  const { quizId, revisionId } = useParams<{ quizId?: string; revisionId?: string }>();
  const [searchParams] = useSearchParams();
  const pathId = searchParams.get("pathId");
  const navigate = useNavigate();

  /* Mode révision (jouée depuis une révision) ou quiz classique : même UI, base d'URL différente */
  const isRevision = !!revisionId;
  const basePath = isRevision
    ? `/api/student/revisions/${revisionId}`
    : `/api/student/quizzes/${quizId}`;

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

  /* gamification */
  const [streak, setStreak] = useState(0);
  const [showStreakBadge, setShowStreakBadge] = useState(false);

  /* timer (seconds remaining, null = disabled) */
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);

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
      const res = await fetch(`${basePath}/start`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(pathId ? { pathId: Number(pathId) } : {}),
      });
      if (!res.ok) throw new Error("Impossible de demarrer le quiz");
      const data: QuizSession = await res.json();
      setSession(data);
      setCurrentIdx(0);
      setAttempt(INITIAL_ATTEMPT);
      setTextAnswer("");
      setTimeLeft(data.quiz.timeLimit ?? null);
      setTimedOut(false);
      setStreak(0);
      setShowStreakBadge(false);
      setPhase("playing");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [basePath, pathId]);

  /* ── Submit answer ── */

  const submitAnswer = useCallback(
    async (answer: string, answerId?: number) => {
      if (!session || !currentQuestion || submitting) return;
      setSubmitting(true);

      const isMulti = (currentQuestion.correctCount ?? 1) > 1;
      const usedHint = attempt.usedHint || attempt.hint !== null;

      try {
        const res = await fetch(`${basePath}/answer`, {
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
          smallConfettiBurst();
          setAttempt((prev) => ({
            ...prev,
            attempts: newAttempts,
            feedback: "correct",
            usedHint,
          }));
          /* Streak: first-try correct only */
          if (newAttempts === 1) {
            setStreak((s) => {
              const next = s + 1;
              if (next >= 2) setShowStreakBadge(true);
              return next;
            });
          } else {
            setStreak(0);
          }
          /* Auto-advance after 1.5s */
          setTimeout(() => advanceToNext(), 1500);
        } else if (newAttempts >= 2) {
          /* ❌ 2nd wrong – show solution */
          setStreak(0);
          setShowStreakBadge(false);
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
          setStreak(0);
          setShowStreakBadge(false);
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
    [session, currentQuestion, submitting, attempt, basePath],
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
        `${basePath}/results?attemptId=${session.attemptId}`,
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
  }, [basePath, session]);

  /* ── Restart quiz ── */

  const restart = useCallback(() => {
    setPhase("start");
    setSession(null);
    setResults(null);
    setCurrentIdx(0);
    setAttempt(INITIAL_ATTEMPT);
    setTextAnswer("");
    setTimeLeft(null);
    setTimedOut(false);
    setError(null);
  }, []);

  /* ── Timer tick ── */
  useEffect(() => {
    if (phase !== "playing" || timeLeft === null) return;
    if (timeLeft <= 0) {
      /* Time's up: jump to results */
      setTimedOut(true);
      fetchResults();
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => (t === null ? null : t - 1)), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft, fetchResults]);

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
          streak={streak}
          showStreakBadge={showStreakBadge}
          timeLeft={timeLeft}
          onTextChange={setTextAnswer}
          onSubmitQCM={(answerStr, id) => {
            // answerStr can be "5" for single or "5,8" for multi
            submitAnswer(answerStr.includes(",") ? answerStr : String(id), id);
          }}
          onSubmitText={() => {
            if (textAnswer.trim()) submitAnswer(textAnswer.trim());
          }}
          onSubmitDnd={(mapping) => {
            submitAnswer(JSON.stringify(mapping));
          }}
          onSubmitAssoc={(mapping) => {
            submitAnswer(JSON.stringify(mapping));
          }}
          onSubmitOrder={(orderedIds) => {
            submitAnswer(JSON.stringify(orderedIds));
          }}
          onSubmitDrawing={(base64) => {
            submitAnswer(base64);
          }}
          onAdvance={advanceToNext}
        />
      )}

      {/* ── Phase: RESULTS ── */}
      {phase === "results" && (
        <ResultsScreen
          results={results}
          loading={loading}
          timedOut={timedOut}
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
  streak,
  showStreakBadge,
  timeLeft,
  onTextChange,
  onSubmitQCM,
  onSubmitText,
  onSubmitDnd,
  onSubmitAssoc,
  onSubmitOrder,
  onSubmitDrawing,
  onAdvance,
}: {
  question: QuizQuestion;
  index: number;
  total: number;
  attempt: AttemptState;
  submitting: boolean;
  textAnswer: string;
  streak: number;
  showStreakBadge: boolean;
  timeLeft: number | null;
  onTextChange: (v: string) => void;
  onSubmitQCM: (text: string, id: number) => void;
  onSubmitText: () => void;
  onSubmitDnd: (mapping: Record<number, string>) => void;
  onSubmitAssoc: (mapping: Record<number, string>) => void;
  onSubmitOrder: (orderedIds: number[]) => void;
  onSubmitDrawing: (base64: string) => void;
  onAdvance: () => void;
}) {
  const progressPct = ((index + 1) / total) * 100;
  const isCorrect = attempt.feedback === "correct";
  const isWrong = attempt.feedback === "wrong";

  const timerLow = timeLeft !== null && timeLeft <= 10;
  const mins = timeLeft !== null ? Math.floor(timeLeft / 60) : 0;
  const secs = timeLeft !== null ? timeLeft % 60 : 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Timer */}
      {timeLeft !== null && (
        <div className="mb-4 flex justify-center">
          <div
            className={`rounded-full px-5 py-2 flex items-center gap-2 shadow-sm border-2 font-mono font-extrabold text-lg ${
              timerLow
                ? "bg-ms-pink-light border-ms-pink text-ms-dark animate-pulse"
                : "bg-white border-ms-lavender/30 text-ms-dark"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
          </div>
        </div>
      )}

      {/* Streak badge */}
      {showStreakBadge && streak >= 2 && (
        <div className="mb-4 flex justify-center animate-[bounce_0.6s_ease-out]">
          <div className="bg-ms-yellow border-2 border-ms-yellow/70 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-md">
            <span className="text-lg">&#128293;</span>
            <span className="font-extrabold text-ms-dark text-sm">
              {streak} bonnes reponses d'affilee !
            </span>
          </div>
        </div>
      )}

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
      <div
        key={`q-${question.id}-${attempt.attempts}-${isWrong ? "w" : "n"}`}
        className={`bg-white rounded-3xl border border-ms-light-gray/50 p-8 mb-6 shadow-sm ${isWrong ? "shake" : ""} ${isCorrect ? "pop" : ""}`}
      >
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

          {question.type === "DRAG_DROP" && question.answers && question.zones && (
            <DragDropAnswers
              items={question.answers}
              zones={question.zones}
              submitting={submitting}
              resetKey={attempt.attempts}
              onSubmit={onSubmitDnd}
            />
          )}

          {question.type === "ASSOCIATION" && question.answers && question.rightColumn && (
            <AssociationAnswers
              items={question.answers}
              rightColumn={question.rightColumn}
              submitting={submitting}
              resetKey={attempt.attempts}
              onSubmit={onSubmitAssoc}
            />
          )}

          {question.type === "ORDERING" && question.answers && (
            <OrderingAnswers
              items={question.answers}
              submitting={submitting}
              resetKey={attempt.attempts}
              onSubmit={onSubmitOrder}
            />
          )}

          {question.type === "DRAWING" && (
            <DrawingCanvas
              submitting={submitting}
              resetKey={attempt.attempts}
              onSubmit={onSubmitDrawing}
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
  timedOut,
  onBack,
  onRestart,
}: {
  results: QuizResults | null;
  loading: boolean;
  timedOut: boolean;
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

  return <ResultsContent results={results} timedOut={timedOut} onBack={onBack} onRestart={onRestart} />;
}

function ResultsContent({
  results,
  timedOut,
  onBack,
  onRestart,
}: {
  results: QuizResults;
  timedOut: boolean;
  onBack: () => void;
  onRestart: () => void;
}) {
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

  /* ── Animated score counter ── */
  const [displayedScore, setDisplayedScore] = useState(0);
  const hasTriggeredConfettiRef = useRef(false);

  useEffect(() => {
    const target = results.score;
    if (target === 0) {
      setDisplayedScore(0);
      return;
    }
    const durationMs = 1200;
    const steps = Math.max(target, 10);
    const stepDuration = durationMs / steps;
    let current = 0;
    const id = setInterval(() => {
      current += 1;
      setDisplayedScore(current);
      if (current >= target) clearInterval(id);
    }, stepDuration);
    return () => clearInterval(id);
  }, [results.score]);

  /* ── Big confetti burst for success ── */
  useEffect(() => {
    if (hasTriggeredConfettiRef.current) return;
    if (!timedOut && pct >= 70) {
      hasTriggeredConfettiRef.current = true;
      /* Slight delay so the user sees the emoji first */
      setTimeout(() => bigConfettiBurst(), 300);
    }
  }, [pct, timedOut]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Timeout banner */}
      {timedOut && (
        <div className="bg-ms-pink-light border-2 border-ms-pink/60 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <svg className="w-6 h-6 text-ms-pink shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <p className="font-extrabold text-ms-dark">Temps écoulé !</p>
            <p className="text-sm text-ms-dark/80 mt-0.5">
              Tu n'as pas terminé à temps. Tu peux recommencer pour faire mieux !
            </p>
          </div>
        </div>
      )}

      {/* Score display */}
      <div className="bg-white rounded-3xl border border-ms-light-gray/50 p-8 text-center mb-8 shadow-sm pop">
        <p className="text-6xl mb-4">{timedOut ? "\u23F0" : emoji}</p>
        <p className="text-3xl font-extrabold text-ms-dark mb-2">
          Tu as obtenu {displayedScore}/{results.totalQuestions} !
        </p>
        <p className="text-xl font-bold text-ms-lavender">{timedOut ? "Essaie encore !" : message}</p>
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
