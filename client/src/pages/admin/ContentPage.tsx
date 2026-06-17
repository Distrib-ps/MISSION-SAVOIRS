import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import ContentTreeSidebar, { type Selection, type TreeTheme } from "../../components/admin/ContentTreeSidebar";
import DemoButton from "../../components/admin/DemoButton";
import type { TourStep } from "../../components/admin/GuidedTour";

const CONTENT_DEMO: TourStep[] = [
  {
    title: "Vos contenus 📚",
    text: "Le contenu s'organise en arborescence : Thème → Sous-thème → Quiz → Questions. La colonne de gauche permet de naviguer.",
  },
  {
    title: "Créer l'arborescence",
    text: "Créez d'abord un Thème (ex. Histoire), puis un Sous-thème (ex. La Préhistoire), puis un Quiz à l'intérieur.",
  },
  {
    title: "Ajouter des questions",
    text: "Dans un quiz, ajoutez des questions et choisissez le type : QCM, texte, glisser-déposer, association, classement ou dessin. On peut ajouter un indice et une solution.",
  },
  {
    title: "Public ou privé",
    text: "À la création d'un quiz, choisissez sa visibilité : Public (tous les élèves) ou Privé (seulement vos élèves). Un badge 🔒 signale les quiz privés.",
  },
  {
    title: "Déblocage progressif",
    text: "Côté élève, les quiz se débloquent au fur et à mesure (≈ 70 % de réussite pour passer au suivant). Les questions ratées peuvent revenir automatiquement.",
  },
  {
    title: "Partager",
    text: "L'icône 🔗 sur un quiz permet de le partager en lecture à un collègue, qui le retrouvera dans « Partagés avec moi ».",
  },
];
import type { Theme, SubTheme, Quiz, Question, Answer } from "../../types";
import { useAuth } from "../../contexts/AuthContext";

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

function TypeBadge({ type }: { type: "QCM" | "TEXT" | "DRAG_DROP" | "ASSOCIATION" | "ORDERING" | "DRAWING" }) {
  const map: Record<string, { label: string; bg: string }> = {
    QCM: { label: "QCM", bg: "bg-ms-blue-light" },
    TEXT: { label: "TEXTE", bg: "bg-ms-yellow-light" },
    DRAG_DROP: { label: "DRAG & DROP", bg: "bg-ms-peach-light" },
    ASSOCIATION: { label: "ASSOCIATION", bg: "bg-ms-green-light" },
    ORDERING: { label: "CLASSEMENT", bg: "bg-ms-pink-light" },
    DRAWING: { label: "DESSIN", bg: "bg-ms-lavender-light" },
  };
  const { label, bg } = map[type];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${bg} text-ms-dark`}>
      {label}
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
  const { user: currentUser } = useAuth();
  const isOwnerRole = currentUser?.role === "ADMIN";

  /* ---- Partage (co-accès) ---- */
  const [shareQuiz, setShareQuiz] = useState<Quiz | null>(null);
  const [shareTeachers, setShareTeachers] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
  const [shareSelected, setShareSelected] = useState<Set<number>>(new Set());

  function canShare(q: Quiz): boolean {
    return isOwnerRole || q.createdById === currentUser?.id;
  }

  async function openShare(q: Quiz) {
    setShareQuiz(q);
    setShareSelected(new Set());
    const [t, s] = await Promise.all([
      fetch("/api/admin/users/teachers", { headers: authHeaders() }).then((r) => (r.ok ? r.json() : { teachers: [] })),
      fetch(`/api/admin/quizzes/${q.id}/shares`, { headers: authHeaders() }).then((r) => (r.ok ? r.json() : { teacherIds: [] })),
    ]);
    setShareTeachers(t.teachers ?? []);
    setShareSelected(new Set<number>(s.teacherIds ?? []));
  }

  async function toggleShare(teacherId: number) {
    if (!shareQuiz) return;
    const has = shareSelected.has(teacherId);
    const next = new Set(shareSelected);
    if (has) {
      await fetch(`/api/admin/quizzes/${shareQuiz.id}/shares/${teacherId}`, { method: "DELETE", headers: authHeaders() });
      next.delete(teacherId);
    } else {
      await fetch(`/api/admin/quizzes/${shareQuiz.id}/shares`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ teacherId }),
      });
      next.add(teacherId);
    }
    setShareSelected(next);
  }

  /* ---- Navigation state ---- */
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [selectedSubTheme, setSelectedSubTheme] = useState<SubTheme | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  /* Full content tree (source of truth for sidebar + navigation) */
  const [tree, setTree] = useState<TreeTheme[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  /* Drawings viewer for DRAWING questions */
  const [drawingsModal, setDrawingsModal] = useState<{ questionId: number; questionText: string } | null>(null);
  const [drawingsList, setDrawingsList] = useState<Array<{
    id: number;
    givenAnswer: string;
    submittedAt: string;
    user: { id: number; username: string; firstName: string; lastName: string; level: string | null };
  }>>([]);
  const [drawingsLoading, setDrawingsLoading] = useState(false);

  /* ---- Form state ---- */
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEmoji, setFormEmoji] = useState("📚");
  const [formTimeLimit, setFormTimeLimit] = useState<string>(""); // minutes, empty = no timer
  const [formClassIds, setFormClassIds] = useState<number[]>([]); // ciblage legacy par classe (préservé à l'édition)
  const [formVisibility, setFormVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  /* ---- Question form state ---- */
  const [qType, setQType] = useState<"QCM" | "TEXT" | "DRAG_DROP" | "ASSOCIATION" | "ORDERING" | "DRAWING">("QCM");
  const [qText, setQText] = useState("");
  const [qHint, setQHint] = useState("");
  const [qSolution, setQSolution] = useState("");
  const [qAnswers, setQAnswers] = useState<Answer[]>([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ]);
  const [qTextAnswer, setQTextAnswer] = useState("");
  /* Drag & Drop: list of items, each with its target zone */
  const [qDndItems, setQDndItems] = useState<{ text: string; zone: string }[]>([
    { text: "", zone: "" },
    { text: "", zone: "" },
  ]);
  /* Association: pairs of left↔right */
  const [qAssocPairs, setQAssocPairs] = useState<{ left: string; right: string }[]>([
    { left: "", right: "" },
    { left: "", right: "" },
  ]);
  /* Ordering: ordered list of items */
  const [qOrderItems, setQOrderItems] = useState<{ text: string }[]>([
    { text: "" },
    { text: "" },
  ]);

  /* ================================================================ */
  /*  Data fetching                                                    */
  /* ================================================================ */

  const fetchTree = useCallback(async () => {
    setTreeLoading(true);
    try {
      const res = await fetch("/api/admin/tree", { headers: authHeaders() });
      if (!res.ok) throw new Error("Erreur lors du chargement de l'arborescence");
      const data = await res.json();
      setTree(data.themes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setTreeLoading(false);
    }
  }, []);

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
    fetchTree();
  }, [fetchThemes, fetchTree]);


  /* ---- Handle sidebar selection ---- */
  /* Uses the in-memory tree to set selected entities synchronously (no extra fetch).
   * Only fetches questions (level 4) on demand, since they're not cached in the tree. */
  const handleSidebarSelect = useCallback((sel: Selection) => {
    setError("");
    setSidebarOpen(false);

    /* Root: clear everything */
    if (sel.themeId === null) {
      setSelectedTheme(null);
      setSelectedSubTheme(null);
      setSelectedQuiz(null);
      /* Keep themes[] in sync with tree for edit/delete operations */
      setThemes(tree.map((t) => ({
        id: t.id, name: t.name, description: t.description, emoji: t.emoji, order: t.order,
        _count: { subThemes: t._count.subThemes },
      })));
      return;
    }

    const treeTheme = tree.find((t) => t.id === sel.themeId);
    if (!treeTheme) return;

    const theme: Theme = {
      id: treeTheme.id,
      name: treeTheme.name,
      description: treeTheme.description,
      emoji: treeTheme.emoji,
      order: treeTheme.order,
      _count: { subThemes: treeTheme._count.subThemes },
    };
    setSelectedTheme(theme);
    /* Populate subThemes list for the main area */
    setSubThemes(treeTheme.subThemes.map((st) => ({
      id: st.id, name: st.name, description: st.description, order: st.order, themeId: st.themeId,
      _count: { quizzes: st._count.quizzes },
    })));

    if (sel.subThemeId === null) {
      setSelectedSubTheme(null);
      setSelectedQuiz(null);
      return;
    }

    const treeSubTheme = treeTheme.subThemes.find((st) => st.id === sel.subThemeId);
    if (!treeSubTheme) return;

    const subTheme: SubTheme = {
      id: treeSubTheme.id,
      name: treeSubTheme.name,
      description: treeSubTheme.description,
      order: treeSubTheme.order,
      themeId: treeSubTheme.themeId,
      _count: { quizzes: treeSubTheme._count.quizzes },
    };
    setSelectedSubTheme(subTheme);
    setQuizzes(treeSubTheme.quizzes.map((qz) => ({
      id: qz.id, title: qz.title, description: qz.description, timeLimit: qz.timeLimit,
      order: qz.order, subThemeId: qz.subThemeId, visibility: qz.visibility,
      _count: { questions: qz._count.questions },
    })));

    if (sel.quizId === null) {
      setSelectedQuiz(null);
      return;
    }

    const treeQuiz = treeSubTheme.quizzes.find((qz) => qz.id === sel.quizId);
    if (!treeQuiz) return;

    const quiz: Quiz = {
      id: treeQuiz.id,
      title: treeQuiz.title,
      description: treeQuiz.description,
      timeLimit: treeQuiz.timeLimit,
      order: treeQuiz.order,
      subThemeId: treeQuiz.subThemeId,
      _count: { questions: treeQuiz._count.questions },
    };
    setSelectedQuiz(quiz);
    /* Questions aren't in the tree, fetch them */
    fetchQuestions(quiz.id);
  }, [tree, fetchQuestions]);

  /* Reorder handlers driven from the sidebar drag-and-drop */
  const reorderFromSidebar = useCallback(async (apiBase: string, ids: number[]) => {
    try {
      const res = await fetch(`${apiBase}/reorder`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Erreur lors du réordonnancement");
      await fetchTree();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }, [fetchTree]);

  const handleReorderThemes = useCallback((ids: number[]) => reorderFromSidebar(API_THEMES, ids), [reorderFromSidebar]);
  const handleReorderSubThemes = useCallback((_themeId: number, ids: number[]) => reorderFromSidebar(API_SUB_THEMES, ids), [reorderFromSidebar]);
  const handleReorderQuizzes = useCallback((_subThemeId: number, ids: number[]) => reorderFromSidebar(API_QUIZZES, ids), [reorderFromSidebar]);

  /* Current selection as IDs for sidebar */
  const currentSelection: Selection = {
    themeId: selectedTheme?.id ?? null,
    subThemeId: selectedSubTheme?.id ?? null,
    quizId: selectedQuiz?.id ?? null,
  };

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
      fetchTree();
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
      fetchTree();
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
      fetchTree();
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
    setFormTimeLimit("");
    setFormClassIds([]);
    setFormVisibility("PUBLIC");
    setFormError("");
    setShowQuizModal(true);
  }

  function openQuizEdit(q: Quiz) {
    setEditingQuiz(q);
    setFormName(q.title);
    setFormDescription(q.description ?? "");
    setFormTimeLimit(q.timeLimit ? String(Math.round(q.timeLimit / 60)) : "");
    setFormClassIds(q.classes?.map((c) => c.classId) ?? []);
    setFormVisibility(q.visibility ?? "PUBLIC");
    setFormError("");
    setShowQuizModal(true);
  }

  async function handleQuizSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedSubTheme) return;
    setFormLoading(true);
    setFormError("");

    const minutes = formTimeLimit.trim() ? parseInt(formTimeLimit, 10) : NaN;
    const timeLimitSeconds = !isNaN(minutes) && minutes > 0 ? minutes * 60 : null;

    try {
      if (editingQuiz) {
        const res = await fetch(`${API_QUIZZES}/${editingQuiz.id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ title: formName, description: formDescription || null, timeLimit: timeLimitSeconds, classIds: formClassIds, visibility: formVisibility }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error || "Erreur lors de la modification");
        }
      } else {
        const res = await fetch(API_QUIZZES, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ title: formName, description: formDescription || null, timeLimit: timeLimitSeconds, subThemeId: selectedSubTheme.id, classIds: formClassIds, visibility: formVisibility }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error || "Erreur lors de la creation");
        }
      }
      setShowQuizModal(false);
      await fetchQuizzes(selectedSubTheme.id);
      fetchTree();
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
    setQDndItems([
      { text: "", zone: "" },
      { text: "", zone: "" },
    ]);
    setQAssocPairs([
      { left: "", right: "" },
      { left: "", right: "" },
    ]);
    setQOrderItems([
      { text: "" },
      { text: "" },
    ]);
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
      setQDndItems([{ text: "", zone: "" }, { text: "", zone: "" }]);
    } else if (q.type === "DRAG_DROP") {
      setQAnswers([]);
      setQTextAnswer("");
      setQDndItems(
        q.answers.length > 0
          ? q.answers.map((a) => ({ text: a.text, zone: a.zone ?? "" }))
          : [{ text: "", zone: "" }, { text: "", zone: "" }]
      );
      setQAssocPairs([{ left: "", right: "" }, { left: "", right: "" }]);
      setQOrderItems([{ text: "" }, { text: "" }]);
    } else if (q.type === "ASSOCIATION") {
      setQAnswers([]);
      setQTextAnswer("");
      setQDndItems([{ text: "", zone: "" }, { text: "", zone: "" }]);
      setQAssocPairs(
        q.answers.length > 0
          ? q.answers.map((a) => ({ left: a.text, right: a.zone ?? "" }))
          : [{ left: "", right: "" }, { left: "", right: "" }]
      );
      setQOrderItems([{ text: "" }, { text: "" }]);
    } else if (q.type === "ORDERING") {
      setQAnswers([]);
      setQTextAnswer("");
      setQDndItems([{ text: "", zone: "" }, { text: "", zone: "" }]);
      setQAssocPairs([{ left: "", right: "" }, { left: "", right: "" }]);
      setQOrderItems(
        q.answers.length > 0
          ? [...q.answers].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((a) => ({ text: a.text }))
          : [{ text: "" }, { text: "" }]
      );
    } else {
      setQAnswers([]);
      const correctAnswer = q.answers.find((a) => a.isCorrect);
      setQTextAnswer(correctAnswer?.text ?? "");
      setQDndItems([{ text: "", zone: "" }, { text: "", zone: "" }]);
      setQAssocPairs([{ left: "", right: "" }, { left: "", right: "" }]);
      setQOrderItems([{ text: "" }, { text: "" }]);
    }
    setFormError("");
    setShowQuestionModal(true);
  }

  function addDndItem() {
    setQDndItems((prev) => [...prev, { text: "", zone: "" }]);
  }

  function removeDndItem(index: number) {
    setQDndItems((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  }

  function updateDndItem(index: number, patch: Partial<{ text: string; zone: string }>) {
    setQDndItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  /* ── Association helpers ── */
  function addAssocPair() {
    setQAssocPairs((prev) => [...prev, { left: "", right: "" }]);
  }
  function removeAssocPair(index: number) {
    setQAssocPairs((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  }
  function updateAssocPair(index: number, patch: Partial<{ left: string; right: string }>) {
    setQAssocPairs((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  /* ── Ordering helpers ── */
  function addOrderItem() {
    setQOrderItems((prev) => [...prev, { text: "" }]);
  }
  function removeOrderItem(index: number) {
    setQOrderItems((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  }
  function updateOrderItem(index: number, text: string) {
    setQOrderItems((prev) => prev.map((it, i) => (i === index ? { text } : it)));
  }
  async function openDrawingsModal(q: Question) {
    setDrawingsModal({ questionId: q.id, questionText: q.text });
    setDrawingsList([]);
    setDrawingsLoading(true);
    try {
      const res = await fetch(`${API_QUESTIONS}/${q.id}/drawings`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Impossible de charger les dessins");
      const data = await res.json();
      setDrawingsList(data.drawings ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setDrawingsLoading(false);
    }
  }

  function moveOrderItem(index: number, dir: -1 | 1) {
    setQOrderItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
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
    } else if (qType === "DRAG_DROP") {
      if (qDndItems.some((it) => !it.text.trim() || !it.zone.trim())) {
        setFormError("Chaque element doit avoir un texte et une zone cible");
        setFormLoading(false);
        return;
      }
      const zones = new Set(qDndItems.map((it) => it.zone.trim()));
      if (zones.size < 2) {
        setFormError("Au moins 2 zones distinctes sont requises");
        setFormLoading(false);
        return;
      }
      answers = qDndItems.map((it) => ({ text: it.text.trim(), isCorrect: true, zone: it.zone.trim() }));
    } else if (qType === "ASSOCIATION") {
      if (qAssocPairs.some((p) => !p.left.trim() || !p.right.trim())) {
        setFormError("Chaque paire doit avoir un terme gauche et un terme droit");
        setFormLoading(false);
        return;
      }
      answers = qAssocPairs.map((p) => ({ text: p.left.trim(), isCorrect: true, zone: p.right.trim() }));
    } else if (qType === "ORDERING") {
      if (qOrderItems.some((it) => !it.text.trim())) {
        setFormError("Chaque element doit avoir un texte");
        setFormLoading(false);
        return;
      }
      if (qOrderItems.length < 2) {
        setFormError("Au moins 2 elements sont requis");
        setFormLoading(false);
        return;
      }
      answers = qOrderItems.map((it, i) => ({ text: it.text.trim(), isCorrect: true, order: i }));
    } else if (qType === "DRAWING") {
      // No predefined answers: free-form drawing
      answers = [];
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
      fetchTree();
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
      fetchTree();
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
                  <h3 className="text-base font-bold text-ms-dark group-hover:text-ms-lavender transition flex items-center gap-2">
                    <span className="truncate">{quiz.title}</span>
                    {quiz.visibility === "PRIVATE" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-ms-lavender-light text-ms-lavender whitespace-nowrap">
                        🔒 Privé
                      </span>
                    )}
                  </h3>
                  {quiz.description && (
                    <p className="text-sm text-ms-gray mt-0.5 truncate">{quiz.description}</p>
                  )}
                </div>

                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-ms-peach-light text-ms-dark whitespace-nowrap">
                  {quiz._count?.questions ?? 0} question{(quiz._count?.questions ?? 0) !== 1 ? "s" : ""}
                </span>

                <div className="flex items-center gap-1">
                  {canShare(quiz) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openShare(quiz); }}
                      className="p-2 text-ms-gray hover:text-ms-blue hover:bg-ms-blue-light rounded-xl transition"
                      title="Partager à un autre prof"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                  )}
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
                  {q.type === "DRAWING" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openDrawingsModal(q); }}
                      className="p-2 text-ms-gray hover:text-ms-lavender hover:bg-ms-lavender-light rounded-xl transition"
                      title="Voir les dessins soumis"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  )}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setQType("QCM")}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition border ${
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
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition border ${
                    qType === "TEXT"
                      ? "bg-ms-yellow-light border-ms-yellow text-ms-dark"
                      : "bg-white border-ms-light-gray text-ms-gray hover:bg-ms-cream"
                  }`}
                >
                  Texte
                </button>
                <button
                  type="button"
                  onClick={() => setQType("DRAG_DROP")}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition border ${
                    qType === "DRAG_DROP"
                      ? "bg-ms-peach-light border-ms-peach text-ms-dark"
                      : "bg-white border-ms-light-gray text-ms-gray hover:bg-ms-cream"
                  }`}
                >
                  Drag & Drop
                </button>
                <button
                  type="button"
                  onClick={() => setQType("ASSOCIATION")}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition border ${
                    qType === "ASSOCIATION"
                      ? "bg-ms-green-light border-ms-green text-ms-dark"
                      : "bg-white border-ms-light-gray text-ms-gray hover:bg-ms-cream"
                  }`}
                >
                  Association
                </button>
                <button
                  type="button"
                  onClick={() => setQType("ORDERING")}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition border ${
                    qType === "ORDERING"
                      ? "bg-ms-pink-light border-ms-pink text-ms-dark"
                      : "bg-white border-ms-light-gray text-ms-gray hover:bg-ms-cream"
                  }`}
                >
                  Classement
                </button>
                <button
                  type="button"
                  onClick={() => setQType("DRAWING")}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition border ${
                    qType === "DRAWING"
                      ? "bg-ms-lavender-light border-ms-lavender text-ms-dark"
                      : "bg-white border-ms-light-gray text-ms-gray hover:bg-ms-cream"
                  }`}
                >
                  Dessin
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

            {/* Answer - DRAG_DROP */}
            {qType === "DRAG_DROP" && (
              <div>
                <label className="block text-sm font-semibold text-ms-dark mb-2">
                  Elements et zones cibles
                  <span className="text-ms-gray font-normal ml-1">(chaque element doit etre place dans la bonne zone)</span>
                </label>
                <div className="space-y-2">
                  {qDndItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => updateDndItem(index, { text: e.target.value })}
                        className="flex-1 px-3 py-2 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition"
                        placeholder={`Element ${index + 1}`}
                      />
                      <span className="text-ms-gray text-sm">→</span>
                      <input
                        type="text"
                        value={item.zone}
                        onChange={(e) => updateDndItem(index, { zone: e.target.value })}
                        className="flex-1 px-3 py-2 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition"
                        placeholder="Zone cible"
                      />
                      <button
                        type="button"
                        onClick={() => removeDndItem(index)}
                        disabled={qDndItems.length <= 2}
                        className={`p-1.5 rounded-lg transition ${
                          qDndItems.length <= 2
                            ? "text-ms-light-gray cursor-not-allowed"
                            : "text-ms-gray hover:text-ms-pink hover:bg-ms-pink-light"
                        }`}
                        title="Supprimer cet element"
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
                  onClick={addDndItem}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-ms-cream hover:bg-ms-light-gray text-ms-dark rounded-xl text-sm font-semibold transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter un element
                </button>
                <p className="text-xs text-ms-gray mt-2">
                  Les zones sont derivees automatiquement des valeurs saisies. Au moins 2 zones distinctes sont requises.
                </p>
              </div>
            )}

            {/* Answer - ASSOCIATION */}
            {qType === "ASSOCIATION" && (
              <div>
                <label className="block text-sm font-semibold text-ms-dark mb-2">
                  Paires à associer
                  <span className="text-ms-gray font-normal ml-1">(l'élève relie chaque terme de gauche à celui de droite)</span>
                </label>
                <div className="space-y-2">
                  {qAssocPairs.map((pair, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={pair.left}
                        onChange={(e) => updateAssocPair(index, { left: e.target.value })}
                        className="flex-1 px-3 py-2 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition"
                        placeholder="Terme de gauche"
                      />
                      <span className="text-ms-gray text-sm">↔</span>
                      <input
                        type="text"
                        value={pair.right}
                        onChange={(e) => updateAssocPair(index, { right: e.target.value })}
                        className="flex-1 px-3 py-2 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition"
                        placeholder="Terme de droite"
                      />
                      <button
                        type="button"
                        onClick={() => removeAssocPair(index)}
                        disabled={qAssocPairs.length <= 2}
                        className={`p-1.5 rounded-lg transition ${
                          qAssocPairs.length <= 2
                            ? "text-ms-light-gray cursor-not-allowed"
                            : "text-ms-gray hover:text-ms-pink hover:bg-ms-pink-light"
                        }`}
                        title="Supprimer cette paire"
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
                  onClick={addAssocPair}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-ms-cream hover:bg-ms-light-gray text-ms-dark rounded-xl text-sm font-semibold transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter une paire
                </button>
              </div>
            )}

            {/* Answer - DRAWING (info only) */}
            {qType === "DRAWING" && (
              <div className="bg-ms-lavender-light/50 border border-ms-lavender/40 rounded-2xl p-4 text-sm text-ms-dark">
                <p className="font-bold mb-1">Question à réponse libre (dessin)</p>
                <p className="text-ms-gray">
                  L'élève disposera d'une zone de dessin pour répondre à la consigne. Ces réponses demandent une évaluation manuelle ; elles sont marquées comme complétées automatiquement.
                </p>
              </div>
            )}

            {/* Answer - ORDERING */}
            {qType === "ORDERING" && (
              <div>
                <label className="block text-sm font-semibold text-ms-dark mb-2">
                  Éléments dans l'ordre correct
                  <span className="text-ms-gray font-normal ml-1">(ils seront mélangés pour l'élève)</span>
                </label>
                <div className="space-y-2">
                  {qOrderItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-7 h-7 flex items-center justify-center bg-ms-lavender-light text-ms-lavender text-sm font-extrabold rounded-lg shrink-0">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => updateOrderItem(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition"
                        placeholder={`Élément ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => moveOrderItem(index, -1)}
                        disabled={index === 0}
                        className={`p-1.5 rounded-lg transition ${
                          index === 0
                            ? "text-ms-light-gray cursor-not-allowed"
                            : "text-ms-gray hover:text-ms-lavender hover:bg-ms-lavender-light"
                        }`}
                        title="Monter"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveOrderItem(index, 1)}
                        disabled={index === qOrderItems.length - 1}
                        className={`p-1.5 rounded-lg transition ${
                          index === qOrderItems.length - 1
                            ? "text-ms-light-gray cursor-not-allowed"
                            : "text-ms-gray hover:text-ms-lavender hover:bg-ms-lavender-light"
                        }`}
                        title="Descendre"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeOrderItem(index)}
                        disabled={qOrderItems.length <= 2}
                        className={`p-1.5 rounded-lg transition ${
                          qOrderItems.length <= 2
                            ? "text-ms-light-gray cursor-not-allowed"
                            : "text-ms-gray hover:text-ms-pink hover:bg-ms-pink-light"
                        }`}
                        title="Supprimer"
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
                  onClick={addOrderItem}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-ms-cream hover:bg-ms-light-gray text-ms-dark rounded-xl text-sm font-semibold transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter un élément
                </button>
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
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-xl font-extrabold text-ms-dark">Contenus</h1>
        <DemoButton steps={CONTENT_DEMO} />
      </div>
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Mobile toggle */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="lg:hidden inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white border border-ms-light-gray rounded-xl hover:bg-ms-cream transition self-start"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          {sidebarOpen ? "Masquer l'arborescence" : "Afficher l'arborescence"}
        </button>

        {/* Sidebar */}
        <div className={`${sidebarOpen ? "block" : "hidden"} lg:block`}>
          <ContentTreeSidebar
            themes={tree}
            loading={treeLoading}
            selection={currentSelection}
            onSelect={handleSidebarSelect}
            onReorderThemes={handleReorderThemes}
            onReorderSubThemes={handleReorderSubThemes}
            onReorderQuizzes={handleReorderQuizzes}
          />
        </div>

        {/* Main content area */}
        <div className="flex-1 min-w-0 max-w-4xl">
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

        {showQuizModal && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowQuizModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-extrabold text-ms-dark mb-4">
                {editingQuiz ? "Modifier le quiz" : "Nouveau quiz"}
              </h3>

              {formError && (
                <div className="mb-4 px-4 py-3 bg-ms-pink-light text-ms-dark text-sm rounded-xl font-medium">
                  {formError}
                </div>
              )}

              <form onSubmit={handleQuizSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-ms-dark mb-1">Titre du quiz *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition"
                    placeholder="Titre du quiz"
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
                <div>
                  <label className="block text-sm font-semibold text-ms-dark mb-1">
                    Durée limite (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formTimeLimit}
                    onChange={(e) => setFormTimeLimit(e.target.value)}
                    placeholder="Laisser vide = pas de timer"
                    className="w-full px-4 py-2.5 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition"
                  />
                  <p className="text-xs text-ms-gray mt-1">
                    Si renseigné, l'élève doit terminer avant la fin du temps.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ms-dark mb-1">
                    Visibilité
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { v: "PUBLIC" as const, title: "Public", desc: "Tous les élèves" },
                        { v: "PRIVATE" as const, title: "Privé", desc: "Seulement mes élèves" },
                      ]
                    ).map((opt) => {
                      const active = formVisibility === opt.v;
                      return (
                        <button
                          type="button"
                          key={opt.v}
                          onClick={() => setFormVisibility(opt.v)}
                          className={`text-left px-4 py-2.5 rounded-xl border transition ${
                            active
                              ? "bg-ms-lavender text-white border-ms-lavender"
                              : "bg-white text-ms-dark border-ms-light-gray hover:bg-ms-cream"
                          }`}
                        >
                          <span className="block text-sm font-semibold">{opt.title}</span>
                          <span className={`block text-xs ${active ? "text-white/80" : "text-ms-gray"}`}>
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-ms-gray mt-1">
                    « Privé » : visible uniquement par les élèves de vos classes/groupes.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuizModal(false)}
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

        {renderQuestionModal()}
        {renderDeleteConfirm()}

        {/* ---- Drawings viewer modal ---- */}
        {drawingsModal && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDrawingsModal(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-ms-dark">Dessins soumis</h3>
                  <p className="text-sm text-ms-gray mt-1">{drawingsModal.questionText}</p>
                </div>
                <button
                  onClick={() => setDrawingsModal(null)}
                  className="w-9 h-9 rounded-full bg-ms-cream hover:bg-ms-light-gray flex items-center justify-center transition shrink-0"
                  aria-label="Fermer"
                >
                  <svg className="w-5 h-5 text-ms-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {drawingsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-10 h-10 border-4 border-ms-lavender border-t-transparent rounded-full animate-spin" />
                </div>
              ) : drawingsList.length === 0 ? (
                <div className="text-center py-12 text-ms-gray">
                  <p className="font-semibold">Aucun dessin soumis pour le moment</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {drawingsList.map((d) => (
                    <div key={d.id} className="border border-ms-light-gray rounded-2xl overflow-hidden bg-ms-cream/50">
                      <img
                        src={d.givenAnswer}
                        alt={`Dessin de ${d.user.firstName}`}
                        className="w-full h-48 object-contain bg-white"
                        loading="lazy"
                      />
                      <div className="p-3">
                        <p className="font-bold text-ms-dark text-sm">
                          {d.user.firstName} {d.user.lastName}
                        </p>
                        <p className="text-xs text-ms-gray mt-0.5">
                          {d.user.username}{d.user.level ? ` · ${d.user.level}` : ""}
                        </p>
                        <p className="text-xs text-ms-gray/80 mt-1">
                          {new Date(d.submittedAt).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        </div>

        {/* Modale de partage (co-accès lecture) */}
        {shareQuiz && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShareQuiz(null)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-extrabold text-ms-dark mb-1">Partager « {shareQuiz.title} »</h2>
              <p className="text-sm text-ms-gray mb-4">
                Les profs cochés peuvent <strong>voir</strong> ce quiz et ses statistiques (lecture seule).
              </p>
              {shareTeachers.length === 0 ? (
                <p className="text-sm text-ms-gray">Aucun autre professeur à qui partager.</p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {shareTeachers.map((t) => {
                    const checked = shareSelected.has(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm ${
                          checked ? "bg-ms-blue-light" : "hover:bg-ms-cream"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleShare(t.id)}
                          className="w-4 h-4 rounded accent-ms-blue"
                        />
                        <span className="text-ms-dark">{t.firstName} {t.lastName}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-end mt-5">
                <button
                  onClick={() => setShareQuiz(null)}
                  className="px-5 py-2 text-sm font-semibold bg-ms-lavender text-white rounded-xl hover:opacity-90 transition"
                >
                  Terminé
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
