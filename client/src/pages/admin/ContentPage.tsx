import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import type { Theme, SubTheme, Quiz, Question, Answer } from "../../types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  };
}

const API_THEMES = "/api/admin/themes";
const API_SUB_THEMES = "/api/admin/sub-themes";
const API_QUIZZES = "/api/admin/quizzes";
const API_QUESTIONS = "/api/admin/questions";

/* ------------------------------------------------------------------ */
/*  Type badge                                                         */
/* ------------------------------------------------------------------ */

function TypeBadge({ type }: { type: "QCM" | "TEXT" }) {
  if (type === "QCM") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-ms-blue-light text-ms-dark">
        QCM
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-ms-yellow-light text-ms-dark">
      TEXTE
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Reorder helpers (arrows)                                           */
/* ------------------------------------------------------------------ */

function ArrowUp({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      className={`p-1 rounded transition ${disabled ? "text-ms-light-gray cursor-not-allowed" : "text-ms-gray hover:text-ms-lavender"}`}
      title="Monter"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}

function ArrowDown({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      className={`p-1 rounded transition ${disabled ? "text-ms-light-gray cursor-not-allowed" : "text-ms-gray hover:text-ms-lavender"}`}
      title="Descendre"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function ContentPage() {
  /* ---- Navigation state ---- */
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [selectedSubTheme, setSelectedSubTheme] = useState<SubTheme | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

  /* ---- Data state ---- */
  const [themes, setThemes] = useState<Theme[]>([]);
  const [subThemes, setSubThemes] = useState<SubTheme[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ---- Modal state ---- */
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [showSubThemeModal, setShowSubThemeModal] = useState(false);
  const [editingSubTheme, setEditingSubTheme] = useState<SubTheme | null>(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: string; id: number; label: string } | null>(null);

  /* ---- Form state ---- */
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEmoji, setFormEmoji] = useState("📚");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  /* ---- Question form state ---- */
  const [qType, setQType] = useState<"QCM" | "TEXT">("QCM");
  const [qText, setQText] = useState("");
  const [qHint, setQHint] = useState("");
  const [qSolution, setQSolution] = useState("");
  const [qAnswers, setQAnswers] = useState<Answer[]>([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ]);
  const [qTextAnswer, setQTextAnswer] = useState("");

  /* ================================================================ */
  /*  Data fetching                                                    */
  /* ================================================================ */

  const fetchThemes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_THEMES, { headers: authHeaders() });
      if (!res.ok) throw new Error("Erreur lors du chargement des themes");
      const data = await res.json();
      setThemes(Array.isArray(data) ? data : data.themes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubThemes = useCallback(async (themeId: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_SUB_THEMES}?themeId=${themeId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Erreur lors du chargement des sous-themes");
      const data = await res.json();
      setSubThemes(Array.isArray(data) ? data : data.subThemes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQuizzes = useCallback(async (subThemeId: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_QUIZZES}?subThemeId=${subThemeId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Erreur lors du chargement des quiz");
      const data = await res.json();
      setQuizzes(Array.isArray(data) ? data : data.quizzes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQuestions = useCallback(async (quizId: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_QUESTIONS}?quizId=${quizId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Erreur lors du chargement des questions");
      const data = await res.json();
      setQuestions(Array.isArray(data) ? data : data.questions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---- Initial load ---- */
  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  /* ================================================================ */
  /*  Navigation                                                       */
  /* ================================================================ */

  function navigateToTheme(theme: Theme) {
    setSelectedTheme(theme);
    setSelectedSubTheme(null);
    setSelectedQuiz(null);
    fetchSubThemes(theme.id);
  }

  function navigateToSubTheme(subTheme: SubTheme) {
    setSelectedSubTheme(subTheme);
    setSelectedQuiz(null);
    fetchQuizzes(subTheme.id);
  }

  function navigateToQuiz(quiz: Quiz) {
    setSelectedQuiz(quiz);
    fetchQuestions(quiz.id);
  }

  function navigateBack(level: "root" | "theme" | "subTheme") {
    if (level === "root") {
      setSelectedTheme(null);
      setSelectedSubTheme(null);
      setSelectedQuiz(null);
      fetchThemes();
    } else if (level === "theme") {
      setSelectedSubTheme(null);
      setSelectedQuiz(null);
      if (selectedTheme) fetchSubThemes(selectedTheme.id);
    } else if (level === "subTheme") {
      setSelectedQuiz(null);
      if (selectedSubTheme) fetchQuizzes(selectedSubTheme.id);
    }
  }

  /* ================================================================ */
  /*  Determine current level                                          */
  /* ================================================================ */

  function currentLevel(): 1 | 2 | 3 | 4 {
    if (selectedQuiz) return 4;
    if (selectedSubTheme) return 3;
    if (selectedTheme) return 2;
    return 1;
  }

  /* ================================================================ */
  /*  Reorder                                                          */
  /* ================================================================ */

  async function reorderItems(
    apiBase: string,
    items: { id: number; order: number }[],
    index: number,
    direction: "up" | "down",
    refreshFn: () => void
  ) {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const newOrder = sorted.map((item) => item.id);
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];

    try {
      await fetch(`${apiBase}/reorder`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ ids: newOrder }),
      });
      refreshFn();
    } catch {
      setError("Erreur lors du reordonnancement");
    }
  }

  /* ================================================================ */
  /*  CRUD: Themes                                                     */
  /* ================================================================ */

  function openThemeCreate() {
    setEditingTheme(null);
    setFormName("");
    setFormDescription("");
    setFormEmoji("📚");
    setFormError("");
    setShowThemeModal(true);
  }

  function openThemeEdit(t: Theme) {
    setEditingTheme(t);
    setFormName(t.name);
    setFormDescription(t.description ?? "");
    setFormEmoji(t.emoji ?? "📚");
    setFormError("");
    setShowThemeModal(true);
  }

  async function handleThemeSubmit(e: FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");
    try {
      if (editingTheme) {
        const res = await fetch(`${API_THEMES}/${editingTheme.id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ name: formName, description: formDescription || null, emoji: formEmoji }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error || "Erreur lors de la modification");
        }
      } else {
        const res = await fetch(API_THEMES, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ name: formName, description: formDescription || null, emoji: formEmoji }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error || "Erreur lors de la creation");
        }
      }
      setShowThemeModal(false);
      await fetchThemes();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setFormLoading(false);
    }
  }

  /* ================================================================ */
  /*  CRUD: SubThemes                                                  */
  /* ================================================================ */

  function openSubThemeCreate() {
    setEditingSubTheme(null);
    setFormName("");
    setFormDescription("");
    setFormError("");
    setShowSubThemeModal(true);
  }

  function openSubThemeEdit(st: SubTheme) {
    setEditingSubTheme(st);
    setFormName(st.name);
    setFormDescription(st.description ?? "");
    setFormError("");
    setShowSubThemeModal(true);
  }

  async function handleSubThemeSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedTheme) return;
    setFormLoading(true);
    setFormError("");
    try {
      if (editingSubTheme) {
        const res = await fetch(`${API_SUB_THEMES}/${editingSubTheme.id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ name: formName, description: formDescription || null }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error || "Erreur lors de la modification");
        }
      } else {
        const res = await fetch(API_SUB_THEMES, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ name: formName, description: formDescription || null, themeId: selectedTheme.id }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error || "Erreur lors de la creation");
        }
      }
      setShowSubThemeModal(false);
      await fetchSubThemes(selectedTheme.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setFormLoading(false);
    }
  }

  /* ================================================================ */
  /*  CRUD: Quizzes                                                    */
  /* ================================================================ */

  function openQuizCreate() {
    setEditingQuiz(null);
    setFormName("");
    setFormDescription("");
    setFormError("");
    setShowQuizModal(true);
  }

  function openQuizEdit(q: Quiz) {
    setEditingQuiz(q);
    setFormName(q.title);
    setFormDescription(q.description ?? "");
    setFormError("");
    setShowQuizModal(true);
  }

  async function handleQuizSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedSubTheme) return;
    setFormLoading(true);
    setFormError("");
    try {
      if (editingQuiz) {
        const res = await fetch(`${API_QUIZZES}/${editingQuiz.id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ title: formName, description: formDescription || null }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error || "Erreur lors de la modification");
        }
      } else {
        const res = await fetch(API_QUIZZES, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ title: formName, description: formDescription || null, subThemeId: selectedSubTheme.id }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error || "Erreur lors de la creation");
        }
      }
      setShowQuizModal(false);
      await fetchQuizzes(selectedSubTheme.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setFormLoading(false);
    }
  }

  /* ================================================================ */
  /*  CRUD: Questions                                                  */
  /* ================================================================ */

  function openQuestionCreate() {
    setEditingQuestion(null);
    setQType("QCM");
    setQText("");
    setQHint("");
    setQSolution("");
    setQAnswers([
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ]);
    setQTextAnswer("");
    setFormError("");
    setShowQuestionModal(true);
  }

  function openQuestionEdit(q: Question) {
    setEditingQuestion(q);
    setQType(q.type);
    setQText(q.text);
    setQHint(q.hint ?? "");
    setQSolution(q.solution ?? "");
    if (q.type === "QCM") {
      setQAnswers(
        q.answers.length > 0
          ? q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect, id: a.id }))
          : [{ text: "", isCorrect: true }, { text: "", isCorrect: false }]
      );
      setQTextAnswer("");
    } else {
      setQAnswers([]);
      const correctAnswer = q.answers.find((a) => a.isCorrect);
      setQTextAnswer(correctAnswer?.text ?? "");
    }
    setFormError("");
    setShowQuestionModal(true);
  }

  function addAnswer() {
    setQAnswers((prev) => [...prev, { text: "", isCorrect: false }]);
  }

  function removeAnswer(index: number) {
    setQAnswers((prev) => {
      if (prev.length <= 2) return prev;
      const next = prev.filter((_, i) => i !== index);
      // Ensure at least one correct
      if (!next.some((a) => a.isCorrect) && next.length > 0) {
        next[0].isCorrect = true;
      }
      return next;
    });
  }

  function updateAnswerText(index: number, text: string) {
    setQAnswers((prev) => prev.map((a, i) => (i === index ? { ...a, text } : a)));
  }

  function toggleAnswerCorrect(index: number) {
    setQAnswers((prev) =>
      prev.map((a, i) => (i === index ? { ...a, isCorrect: !a.isCorrect } : a))
    );
  }

  async function handleQuestionSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedQuiz) return;
    setFormLoading(true);
    setFormError("");

    // Validation
    if (!qText.trim()) {
      setFormError("L'enonce est requis");
      setFormLoading(false);
      return;
    }

    let answers: Answer[];
    if (qType === "QCM") {
      if (qAnswers.some((a) => !a.text.trim())) {
        setFormError("Toutes les reponses doivent avoir un texte");
        setFormLoading(false);
        return;
      }
      if (!qAnswers.some((a) => a.isCorrect)) {
        setFormError("Au moins une reponse doit etre correcte");
        setFormLoading(false);
        return;
      }
      answers = qAnswers.map((a) => ({ text: a.text, isCorrect: a.isCorrect }));
    } else {
      if (!qTextAnswer.trim()) {
        setFormError("La reponse correcte est requise");
        setFormLoading(false);
        return;
      }
      answers = [{ text: qTextAnswer, isCorrect: true }];
    }

    try {
      const body = {
        text: qText,
        type: qType,
        hint: qHint || null,
        solution: qSolution || null,
        quizId: selectedQuiz.id,
        answers,
      };

      if (editingQuestion) {
        const res = await fetch(`${API_QUESTIONS}/${editingQuestion.id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error || "Erreur lors de la modification");
        }
      } else {
        const res = await fetch(API_QUESTIONS, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error || "Erreur lors de la creation");
        }
      }
      setShowQuestionModal(false);
      await fetchQuestions(selectedQuiz.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setFormLoading(false);
    }
  }

  /* ================================================================ */
  /*  Delete                                                           */
  /* ================================================================ */

  async function handleDelete() {
    if (!showDeleteConfirm) return;
    const { type, id } = showDeleteConfirm;
    let apiBase = "";
    if (type === "theme") apiBase = API_THEMES;
    else if (type === "subTheme") apiBase = API_SUB_THEMES;
    else if (type === "quiz") apiBase = API_QUIZZES;
    else if (type === "question") apiBase = API_QUESTIONS;

    try {
      const res = await fetch(`${apiBase}/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      setShowDeleteConfirm(null);

      // Refresh appropriate list
      if (type === "theme") await fetchThemes();
      else if (type === "subTheme" && selectedTheme) await fetchSubThemes(selectedTheme.id);
      else if (type === "quiz" && selectedSubTheme) await fetchQuizzes(selectedSubTheme.id);
      else if (type === "question" && selectedQuiz) await fetchQuestions(selectedQuiz.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setShowDeleteConfirm(null);
    }
  }

  /* ================================================================ */
  /*  Breadcrumb                                                       */
  /* ================================================================ */

  function renderBreadcrumb() {
    const items: { label: string; onClick?: () => void }[] = [
      { label: "Contenus", onClick: selectedTheme ? () => navigateBack("root") : undefined },
    ];

    if (selectedTheme) {
      items.push({
        label: selectedTheme.name,
        onClick: selectedSubTheme ? () => navigateBack("theme") : undefined,
      });
    }

    if (selectedSubTheme) {
      items.push({
        label: selectedSubTheme.name,
        onClick: selectedQuiz ? () => navigateBack("subTheme") : undefined,
      });
    }

    if (selectedQuiz) {
      items.push({ label: selectedQuiz.title });
    }

    return (
      <nav className="flex items-center gap-2 text-sm mb-6 flex-wrap">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-ms-gray">&gt;</span>}
            {item.onClick ? (
              <button
                onClick={item.onClick}
                className="text-ms-gray hover:text-ms-lavender transition font-medium"
              >
                {item.label}
              </button>
            ) : (
              <span className="text-ms-dark font-semibold">{item.label}</span>
            )}
          </span>
        ))}
      </nav>
    );
  }

  /* ================================================================ */
  /*  Level 1: Themes                                                  */
  /* ================================================================ */

  function renderThemes() {
    const sorted = [...themes].sort((a, b) => a.order - b.order);
    return (
      <>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-ms-dark">
              Gestion des contenus
            </h1>
            <p className="text-ms-gray mt-1">Organisez vos themes, sous-themes, quiz et questions.</p>
          </div>
          <button
            onClick={openThemeCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-ms-lavender text-white font-semibold text-sm rounded-xl hover:opacity-90 transition shadow-sm"
          >
            <PlusIcon />
            Ajouter un theme
          </button>
        </div>

        {sorted.length === 0 && !loading && (
          <div className="text-center py-16 text-ms-gray">
            <p className="text-lg font-semibold mb-2">Aucun theme</p>
            <p className="text-sm">Commencez par creer votre premier theme.</p>
          </div>
        )}

        <div className="space-y-3">
          {sorted.map((theme, index) => (
            <div
              key={theme.id}
              onClick={() => navigateToTheme(theme)}
              className="bg-white rounded-2xl border border-ms-light-gray/50 p-5 hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-0.5">
                  <ArrowUp
                    disabled={index === 0}
                    onClick={() => reorderItems(API_THEMES, sorted, index, "up", fetchThemes)}
                  />
                  <ArrowDown
                    disabled={index === sorted.length - 1}
                    onClick={() => reorderItems(API_THEMES, sorted, index, "down", fetchThemes)}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-ms-dark group-hover:text-ms-lavender transition">
                    {theme.name}
                  </h3>
                  {theme.description && (
                    <p className="text-sm text-ms-gray mt-0.5 truncate">{theme.description}</p>
                  )}
                </div>

                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-ms-blue-light text-ms-dark whitespace-nowrap">
                  {theme._count?.subThemes ?? 0} sous-theme{(theme._count?.subThemes ?? 0) !== 1 ? "s" : ""}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openThemeEdit(theme); }}
                    className="p-2 text-ms-gray hover:text-ms-lavender hover:bg-ms-lavender-light rounded-xl transition"
                    title="Modifier"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm({ type: "theme", id: theme.id, label: theme.name }); }}
                    className="p-2 text-ms-gray hover:text-ms-pink hover:bg-ms-pink-light rounded-xl transition"
                    title="Supprimer"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  /* ================================================================ */
  /*  Level 2: SubThemes                                               */
  /* ================================================================ */

  function renderSubThemes() {
    const sorted = [...subThemes].sort((a, b) => a.order - b.order);
    return (
      <>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-ms-dark">
            Sous-themes de &laquo; {selectedTheme?.name} &raquo;
          </h2>
          <button
            onClick={openSubThemeCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-ms-lavender text-white font-semibold text-sm rounded-xl hover:opacity-90 transition shadow-sm"
          >
            <PlusIcon />
            Ajouter un sous-theme
          </button>
        </div>

        {sorted.length === 0 && !loading && (
          <div className="text-center py-16 text-ms-gray">
            <p className="text-lg font-semibold mb-2">Aucun sous-theme</p>
            <p className="text-sm">Ajoutez un sous-theme pour commencer.</p>
          </div>
        )}

        <div className="space-y-3">
          {sorted.map((st, index) => (
            <div
              key={st.id}
              onClick={() => navigateToSubTheme(st)}
              className="bg-white rounded-2xl border border-ms-light-gray/50 p-5 hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-0.5">
                  <ArrowUp
                    disabled={index === 0}
                    onClick={() => reorderItems(API_SUB_THEMES, sorted, index, "up", () => selectedTheme && fetchSubThemes(selectedTheme.id))}
                  />
                  <ArrowDown
                    disabled={index === sorted.length - 1}
                    onClick={() => reorderItems(API_SUB_THEMES, sorted, index, "down", () => selectedTheme && fetchSubThemes(selectedTheme.id))}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-ms-dark group-hover:text-ms-lavender transition">
                    {st.name}
                  </h3>
                  {st.description && (
                    <p className="text-sm text-ms-gray mt-0.5 truncate">{st.description}</p>
                  )}
                </div>

                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-ms-green-light text-ms-dark whitespace-nowrap">
                  {st._count?.quizzes ?? 0} quiz{(st._count?.quizzes ?? 0) !== 1 ? "s" : ""}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openSubThemeEdit(st); }}
                    className="p-2 text-ms-gray hover:text-ms-lavender hover:bg-ms-lavender-light rounded-xl transition"
                    title="Modifier"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm({ type: "subTheme", id: st.id, label: st.name }); }}
                    className="p-2 text-ms-gray hover:text-ms-pink hover:bg-ms-pink-light rounded-xl transition"
                    title="Supprimer"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  /* ================================================================ */
  /*  Level 3: Quizzes                                                 */
  /* ================================================================ */

  function renderQuizzes() {
    const sorted = [...quizzes].sort((a, b) => a.order - b.order);
    return (
      <>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-ms-dark">
            Quiz de &laquo; {selectedSubTheme?.name} &raquo;
          </h2>
          <button
            onClick={openQuizCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-ms-lavender text-white font-semibold text-sm rounded-xl hover:opacity-90 transition shadow-sm"
          >
            <PlusIcon />
            Ajouter un quiz
          </button>
        </div>

        {sorted.length === 0 && !loading && (
          <div className="text-center py-16 text-ms-gray">
            <p className="text-lg font-semibold mb-2">Aucun quiz</p>
            <p className="text-sm">Ajoutez un quiz pour commencer.</p>
          </div>
        )}

        <div className="space-y-3">
          {sorted.map((quiz, index) => (
            <div
              key={quiz.id}
              onClick={() => navigateToQuiz(quiz)}
              className="bg-white rounded-2xl border border-ms-light-gray/50 p-5 hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-0.5">
                  <ArrowUp
                    disabled={index === 0}
                    onClick={() => reorderItems(API_QUIZZES, sorted, index, "up", () => selectedSubTheme && fetchQuizzes(selectedSubTheme.id))}
                  />
                  <ArrowDown
                    disabled={index === sorted.length - 1}
                    onClick={() => reorderItems(API_QUIZZES, sorted, index, "down", () => selectedSubTheme && fetchQuizzes(selectedSubTheme.id))}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-ms-dark group-hover:text-ms-lavender transition">
                    {quiz.title}
                  </h3>
                  {quiz.description && (
                    <p className="text-sm text-ms-gray mt-0.5 truncate">{quiz.description}</p>
                  )}
                </div>

                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-ms-peach-light text-ms-dark whitespace-nowrap">
                  {quiz._count?.questions ?? 0} question{(quiz._count?.questions ?? 0) !== 1 ? "s" : ""}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openQuizEdit(quiz); }}
                    className="p-2 text-ms-gray hover:text-ms-lavender hover:bg-ms-lavender-light rounded-xl transition"
                    title="Modifier"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm({ type: "quiz", id: quiz.id, label: quiz.title }); }}
                    className="p-2 text-ms-gray hover:text-ms-pink hover:bg-ms-pink-light rounded-xl transition"
                    title="Supprimer"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  /* ================================================================ */
  /*  Level 4: Questions                                               */
  /* ================================================================ */

  function renderQuestions() {
    const sorted = [...questions].sort((a, b) => a.order - b.order);
    return (
      <>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-ms-dark">
            Questions de &laquo; {selectedQuiz?.title} &raquo;
          </h2>
          <button
            onClick={openQuestionCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-ms-lavender text-white font-semibold text-sm rounded-xl hover:opacity-90 transition shadow-sm"
          >
            <PlusIcon />
            Ajouter une question
          </button>
        </div>

        {sorted.length === 0 && !loading && (
          <div className="text-center py-16 text-ms-gray">
            <p className="text-lg font-semibold mb-2">Aucune question</p>
            <p className="text-sm">Ajoutez une question pour commencer.</p>
          </div>
        )}

        <div className="space-y-3">
          {sorted.map((q, index) => (
            <div
              key={q.id}
              onClick={() => openQuestionEdit(q)}
              className="bg-white rounded-2xl border border-ms-light-gray/50 p-5 hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-0.5">
                  <ArrowUp
                    disabled={index === 0}
                    onClick={() => reorderItems(API_QUESTIONS, sorted, index, "up", () => selectedQuiz && fetchQuestions(selectedQuiz.id))}
                  />
                  <ArrowDown
                    disabled={index === sorted.length - 1}
                    onClick={() => reorderItems(API_QUESTIONS, sorted, index, "down", () => selectedQuiz && fetchQuestions(selectedQuiz.id))}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ms-dark group-hover:text-ms-lavender transition truncate">
                    {q.text}
                  </p>
                </div>

                <TypeBadge type={q.type} />

                {q.type === "QCM" && (
                  <span className="text-xs text-ms-gray whitespace-nowrap">
                    {q.answers.length} reponse{q.answers.length !== 1 ? "s" : ""}
                  </span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openQuestionEdit(q); }}
                    className="p-2 text-ms-gray hover:text-ms-lavender hover:bg-ms-lavender-light rounded-xl transition"
                    title="Modifier"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm({ type: "question", id: q.id, label: q.text }); }}
                    className="p-2 text-ms-gray hover:text-ms-pink hover:bg-ms-pink-light rounded-xl transition"
                    title="Supprimer"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  /* ================================================================ */
  /*  Modal: Theme / SubTheme (shared simple form)                     */
  /* ================================================================ */

  function renderSimpleModal(
    show: boolean,
    onClose: () => void,
    title: string,
    onSubmit: (e: FormEvent) => void,
    nameLabel: string,
  ) {
    if (!show) return null;
    return (
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-extrabold text-ms-dark mb-4">{title}</h3>

          {formError && (
            <div className="mb-4 px-4 py-3 bg-ms-pink-light text-ms-dark text-sm rounded-xl font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ms-dark mb-1">{nameLabel} *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition"
                placeholder={nameLabel}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ms-dark mb-1">Description</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition resize-none"
                placeholder="Description (optionnel)"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-semibold bg-white border border-ms-light-gray text-ms-dark hover:bg-ms-cream rounded-xl transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="px-5 py-2.5 text-sm font-semibold bg-ms-lavender text-white hover:opacity-90 rounded-xl transition disabled:opacity-50"
              >
                {formLoading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  Modal: Question                                                  */
  /* ================================================================ */

  function renderQuestionModal() {
    if (!showQuestionModal) return null;
    const isEdit = !!editingQuestion;

    return (
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setShowQuestionModal(false)}
      >
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-extrabold text-ms-dark mb-4">
            {isEdit ? "Modifier la question" : "Nouvelle question"}
          </h3>

          {formError && (
            <div className="mb-4 px-4 py-3 bg-ms-pink-light text-ms-dark text-sm rounded-xl font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleQuestionSubmit} className="space-y-4">
            {/* Type selector */}
            <div>
              <label className="block text-sm font-semibold text-ms-dark mb-2">Type de question</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setQType("QCM")}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition border ${
                    qType === "QCM"
                      ? "bg-ms-blue-light border-ms-blue text-ms-dark"
                      : "bg-white border-ms-light-gray text-ms-gray hover:bg-ms-cream"
                  }`}
                >
                  QCM
                </button>
                <button
                  type="button"
                  onClick={() => setQType("TEXT")}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition border ${
                    qType === "TEXT"
                      ? "bg-ms-yellow-light border-ms-yellow text-ms-dark"
                      : "bg-white border-ms-light-gray text-ms-gray hover:bg-ms-cream"
                  }`}
                >
                  Texte
                </button>
              </div>
            </div>

            {/* Enonce */}
            <div>
              <label className="block text-sm font-semibold text-ms-dark mb-1">Enonce *</label>
              <textarea
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-2.5 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition resize-none"
                placeholder="Saisissez l'enonce de la question"
              />
            </div>

            {/* Answers - QCM */}
            {qType === "QCM" && (
              <div>
                <label className="block text-sm font-semibold text-ms-dark mb-2">
                  Reponses
                  <span className="text-ms-gray font-normal ml-1">(cochez les reponses correctes)</span>
                </label>
                <div className="space-y-2">
                  {qAnswers.map((answer, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAnswerCorrect(index)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition ${
                          answer.isCorrect
                            ? "bg-ms-green border-ms-green"
                            : "border-ms-light-gray hover:border-ms-gray"
                        }`}
                        title={answer.isCorrect ? "Correcte" : "Incorrecte"}
                      >
                        {answer.isCorrect && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <input
                        type="text"
                        value={answer.text}
                        onChange={(e) => updateAnswerText(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition"
                        placeholder={`Reponse ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeAnswer(index)}
                        disabled={qAnswers.length <= 2}
                        className={`p-1.5 rounded-lg transition ${
                          qAnswers.length <= 2
                            ? "text-ms-light-gray cursor-not-allowed"
                            : "text-ms-gray hover:text-ms-pink hover:bg-ms-pink-light"
                        }`}
                        title="Supprimer cette reponse"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addAnswer}
                  className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-ms-lavender hover:text-ms-dark transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter une reponse
                </button>
              </div>
            )}

            {/* Answer - TEXT */}
            {qType === "TEXT" && (
              <div>
                <label className="block text-sm font-semibold text-ms-dark mb-1">Reponse correcte *</label>
                <input
                  type="text"
                  value={qTextAnswer}
                  onChange={(e) => setQTextAnswer(e.target.value)}
                  className="w-full px-4 py-2.5 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition"
                  placeholder="Saisissez la reponse correcte"
                />
              </div>
            )}

            {/* Hint */}
            <div>
              <label className="block text-sm font-semibold text-ms-dark mb-1">Indice</label>
              <input
                type="text"
                value={qHint}
                onChange={(e) => setQHint(e.target.value)}
                className="w-full px-4 py-2.5 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition"
                placeholder="Indice (optionnel)"
              />
            </div>

            {/* Solution */}
            <div>
              <label className="block text-sm font-semibold text-ms-dark mb-1">Explication / Solution</label>
              <textarea
                value={qSolution}
                onChange={(e) => setQSolution(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition resize-none"
                placeholder="Explication affichee apres la reponse (optionnel)"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQuestionModal(false)}
                className="px-5 py-2.5 text-sm font-semibold bg-white border border-ms-light-gray text-ms-dark hover:bg-ms-cream rounded-xl transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="px-5 py-2.5 text-sm font-semibold bg-ms-lavender text-white hover:opacity-90 rounded-xl transition disabled:opacity-50"
              >
                {formLoading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  Modal: Delete confirmation                                       */
  /* ================================================================ */

  function renderDeleteConfirm() {
    if (!showDeleteConfirm) return null;
    const typeLabels: Record<string, string> = {
      theme: "ce theme",
      subTheme: "ce sous-theme",
      quiz: "ce quiz",
      question: "cette question",
    };
    return (
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setShowDeleteConfirm(null)}
      >
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-14 h-14 bg-ms-pink-light rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-ms-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-lg font-extrabold text-ms-dark mb-2">
            Supprimer {typeLabels[showDeleteConfirm.type] ?? "cet element"} ?
          </h3>
          <p className="text-sm text-ms-gray mb-6">
            Etes-vous sur de vouloir supprimer{" "}
            <span className="font-bold text-ms-dark truncate inline-block max-w-[200px] align-bottom">
              {showDeleteConfirm.label}
            </span>{" "}
            ? Cette action est irreversible.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="px-5 py-2.5 text-sm font-semibold bg-white border border-ms-light-gray text-ms-dark hover:bg-ms-cream rounded-xl transition"
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              className="px-5 py-2.5 text-sm font-semibold bg-ms-pink text-ms-dark hover:opacity-90 rounded-xl transition"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  const level = currentLevel();

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {renderBreadcrumb()}

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-ms-pink-light text-ms-dark text-sm rounded-xl font-medium">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-3 text-ms-gray hover:text-ms-dark font-bold"
            >
              x
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-ms-lavender border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Content by level */}
        {!loading && level === 1 && renderThemes()}
        {!loading && level === 2 && renderSubThemes()}
        {!loading && level === 3 && renderQuizzes()}
        {!loading && level === 4 && renderQuestions()}

        {/* Modals */}
        {showThemeModal && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowThemeModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-extrabold text-ms-dark mb-4">
                {editingTheme ? "Modifier le thème" : "Nouveau thème"}
              </h3>

              {formError && (
                <div className="mb-4 px-4 py-3 bg-ms-pink-light text-ms-dark text-sm rounded-xl font-medium">
                  {formError}
                </div>
              )}

              <form onSubmit={handleThemeSubmit} className="space-y-4">
                {/* Emoji picker */}
                <div>
                  <label className="block text-sm font-semibold text-ms-dark mb-2">Icône</label>
                  <div className="flex flex-wrap gap-2">
                    {["📚", "🔢", "🌍", "🎨", "🔬", "🎵", "🏃", "💡", "📖", "🧩", "🌟", "🎯", "🏆", "💻", "🌿"].map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setFormEmoji(e)}
                        className={`w-10 h-10 text-xl rounded-xl flex items-center justify-center transition ${
                          formEmoji === e
                            ? "bg-ms-lavender-light border-2 border-ms-lavender scale-110"
                            : "bg-ms-cream border border-ms-light-gray hover:border-ms-lavender"
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ms-dark mb-1">Nom du thème *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition"
                    placeholder="Nom du thème"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ms-dark mb-1">Description</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition resize-none"
                    placeholder="Description (optionnel)"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowThemeModal(false)}
                    className="px-5 py-2.5 text-sm font-semibold bg-white border border-ms-light-gray text-ms-dark hover:bg-ms-cream rounded-xl transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-5 py-2.5 text-sm font-semibold bg-ms-lavender text-white hover:opacity-90 rounded-xl transition disabled:opacity-50"
                  >
                    {formLoading ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {renderSimpleModal(
          showSubThemeModal,
          () => setShowSubThemeModal(false),
          editingSubTheme ? "Modifier le sous-theme" : "Nouveau sous-theme",
          handleSubThemeSubmit,
          "Nom du sous-theme",
        )}

        {renderSimpleModal(
          showQuizModal,
          () => setShowQuizModal(false),
          editingQuiz ? "Modifier le quiz" : "Nouveau quiz",
          handleQuizSubmit,
          "Titre du quiz",
        )}

        {renderQuestionModal()}
        {renderDeleteConfirm()}
      </div>
    </AdminLayout>
  );
}
