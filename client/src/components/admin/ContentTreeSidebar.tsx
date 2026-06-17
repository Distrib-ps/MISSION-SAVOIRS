import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface TreeQuiz {
  id: number;
  title: string;
  description: string | null;
  timeLimit: number | null;
  order: number;
  subThemeId: number;
  visibility?: "PUBLIC" | "PRIVATE";
  _count: { questions: number };
}

export interface TreeSubTheme {
  id: number;
  name: string;
  description: string | null;
  order: number;
  themeId: number;
  quizzes: TreeQuiz[];
  _count: { quizzes: number };
}

export interface TreeTheme {
  id: number;
  name: string;
  description: string | null;
  emoji: string;
  order: number;
  subThemes: TreeSubTheme[];
  _count: { subThemes: number };
}

export interface Selection {
  themeId: number | null;
  subThemeId: number | null;
  quizId: number | null;
}

interface Props {
  themes: TreeTheme[];
  loading: boolean;
  selection: Selection;
  onSelect: (sel: Selection) => void;
  onReorderThemes: (ids: number[]) => void;
  onReorderSubThemes: (themeId: number, ids: number[]) => void;
  onReorderQuizzes: (subThemeId: number, ids: number[]) => void;
}

/* ---- Helpers ---- */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Return the subset of the tree where at least one node matches `query`. */
function filterTree(themes: TreeTheme[], query: string): TreeTheme[] {
  if (!query.trim()) return themes;
  const q = normalize(query);
  return themes
    .map((theme) => {
      const themeMatch = normalize(theme.name).includes(q);
      const subThemes = theme.subThemes
        .map((st) => {
          const stMatch = normalize(st.name).includes(q);
          const quizzes = st.quizzes.filter((qz) => normalize(qz.title).includes(q));
          if (stMatch || quizzes.length > 0) {
            return { ...st, quizzes: stMatch ? st.quizzes : quizzes };
          }
          return null;
        })
        .filter((s): s is TreeSubTheme => s !== null);
      if (themeMatch || subThemes.length > 0) {
        return { ...theme, subThemes: themeMatch ? theme.subThemes : subThemes };
      }
      return null;
    })
    .filter((t): t is TreeTheme => t !== null);
}

/* ══════════════════════════════════════════════════════════ */

export default function ContentTreeSidebar({
  themes,
  loading,
  selection,
  onSelect,
  onReorderThemes,
  onReorderSubThemes,
  onReorderQuizzes,
}: Props) {
  const [query, setQuery] = useState("");
  const [expandedThemes, setExpandedThemes] = useState<Set<number>>(new Set());
  const [expandedSubThemes, setExpandedSubThemes] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => filterTree(themes, query), [themes, query]);

  /* Auto-expand branches leading to current selection */
  useEffect(() => {
    if (selection.themeId !== null) {
      setExpandedThemes((prev) => new Set(prev).add(selection.themeId!));
    }
    if (selection.subThemeId !== null) {
      setExpandedSubThemes((prev) => new Set(prev).add(selection.subThemeId!));
    }
  }, [selection.themeId, selection.subThemeId]);

  /* Auto-expand all when searching */
  useEffect(() => {
    if (query.trim()) {
      setExpandedThemes(new Set(filtered.map((t) => t.id)));
      setExpandedSubThemes(
        new Set(filtered.flatMap((t) => t.subThemes.map((s) => s.id))),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function toggleTheme(id: number) {
    setExpandedThemes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSubTheme(id: number) {
    setExpandedSubThemes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <aside className="bg-white border border-ms-light-gray/50 rounded-2xl p-3 w-full lg:w-72 shrink-0 max-h-[calc(100vh-10rem)] overflow-y-auto">
      {/* Header with search */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-ms-gray">
            Arborescence
          </h3>
          <button
            onClick={() => onSelect({ themeId: null, subThemeId: null, quizId: null })}
            className={`text-xs font-semibold px-2 py-1 rounded-lg transition ${
              selection.themeId === null
                ? "bg-ms-lavender text-white"
                : "text-ms-gray hover:bg-ms-cream"
            }`}
          >
            Racine
          </button>
        </div>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ms-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-8 pr-7 py-1.5 text-sm border border-ms-light-gray rounded-lg bg-ms-cream/50 focus:outline-none focus:ring-2 focus:ring-ms-lavender/40 focus:border-ms-lavender transition"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-ms-gray hover:text-ms-dark rounded w-6 h-6 flex items-center justify-center"
              aria-label="Effacer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-ms-lavender border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && themes.length === 0 && (
        <p className="text-sm text-ms-gray px-2 py-6 text-center">
          Aucun thème. Commencez par en créer un.
        </p>
      )}

      {!loading && themes.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-ms-gray px-2 py-6 text-center">
          Aucun résultat pour "{query}".
        </p>
      )}

      <ThemesList
        themes={filtered}
        disableDrag={!!query.trim()}
        selection={selection}
        expandedThemes={expandedThemes}
        expandedSubThemes={expandedSubThemes}
        onToggleTheme={toggleTheme}
        onToggleSubTheme={toggleSubTheme}
        onSelect={onSelect}
        onReorderThemes={onReorderThemes}
        onReorderSubThemes={onReorderSubThemes}
        onReorderQuizzes={onReorderQuizzes}
      />
    </aside>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  Sortable themes list                                      */
/* ══════════════════════════════════════════════════════════ */

function ThemesList({
  themes,
  disableDrag,
  selection,
  expandedThemes,
  expandedSubThemes,
  onToggleTheme,
  onToggleSubTheme,
  onSelect,
  onReorderThemes,
  onReorderSubThemes,
  onReorderQuizzes,
}: {
  themes: TreeTheme[];
  disableDrag: boolean;
  selection: Selection;
  expandedThemes: Set<number>;
  expandedSubThemes: Set<number>;
  onToggleTheme: (id: number) => void;
  onToggleSubTheme: (id: number) => void;
  onSelect: (sel: Selection) => void;
  onReorderThemes: (ids: number[]) => void;
  onReorderSubThemes: (themeId: number, ids: number[]) => void;
  onReorderQuizzes: (subThemeId: number, ids: number[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    if (disableDrag) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = themes.map((t) => t.id);
    const oldIdx = ids.indexOf(Number(active.id));
    const newIdx = ids.indexOf(Number(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(ids, oldIdx, newIdx);
    onReorderThemes(reordered);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={themes.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {themes.map((theme) => (
            <SortableTheme
              key={theme.id}
              theme={theme}
              disableDrag={disableDrag}
              expanded={expandedThemes.has(theme.id)}
              expandedSubThemes={expandedSubThemes}
              selection={selection}
              onToggleTheme={onToggleTheme}
              onToggleSubTheme={onToggleSubTheme}
              onSelect={onSelect}
              onReorderSubThemes={onReorderSubThemes}
              onReorderQuizzes={onReorderQuizzes}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableTheme({
  theme,
  disableDrag,
  expanded,
  expandedSubThemes,
  selection,
  onToggleTheme,
  onToggleSubTheme,
  onSelect,
  onReorderSubThemes,
  onReorderQuizzes,
}: {
  theme: TreeTheme;
  disableDrag: boolean;
  expanded: boolean;
  expandedSubThemes: Set<number>;
  selection: Selection;
  onToggleTheme: (id: number) => void;
  onToggleSubTheme: (id: number) => void;
  onSelect: (sel: Selection) => void;
  onReorderSubThemes: (themeId: number, ids: number[]) => void;
  onReorderQuizzes: (subThemeId: number, ids: number[]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: theme.id,
    disabled: disableDrag,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isActive =
    selection.themeId === theme.id &&
    selection.subThemeId === null &&
    selection.quizId === null;

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
      <div
        className={`flex items-center gap-1 rounded-lg px-1 py-1.5 text-sm group ${
          isActive ? "bg-ms-lavender text-white" : "hover:bg-ms-cream"
        }`}
      >
        {!disableDrag && (
          <button
            {...listeners}
            {...attributes}
            className={`shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 ${isActive ? "group-hover:opacity-80" : ""} transition`}
            title="Glisser pour réordonner"
            tabIndex={-1}
          >
            <svg className="w-3 h-4" fill="currentColor" viewBox="0 0 8 14">
              <circle cx="2" cy="2" r="1.2" />
              <circle cx="2" cy="7" r="1.2" />
              <circle cx="2" cy="12" r="1.2" />
              <circle cx="6" cy="2" r="1.2" />
              <circle cx="6" cy="7" r="1.2" />
              <circle cx="6" cy="12" r="1.2" />
            </svg>
          </button>
        )}
        <button
          onClick={() => onToggleTheme(theme.id)}
          className={`shrink-0 w-5 h-5 flex items-center justify-center rounded ${
            isActive ? "hover:bg-white/20" : "hover:bg-ms-light-gray"
          }`}
          aria-label={expanded ? "Replier" : "Déplier"}
        >
          {theme.subThemes.length > 0 && (
            <svg
              className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
        <button
          onClick={() => onSelect({ themeId: theme.id, subThemeId: null, quizId: null })}
          className={`flex-1 min-w-0 flex items-center gap-2 text-left font-semibold ${
            isActive ? "text-white" : "text-ms-dark"
          }`}
        >
          <span className="text-base shrink-0">{theme.emoji}</span>
          <span className="truncate">{theme.name}</span>
          <span
            className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
              isActive ? "bg-white/20" : "bg-ms-cream text-ms-gray"
            }`}
          >
            {theme._count.subThemes}
          </span>
        </button>
      </div>

      {expanded && (
        <SubThemesList
          themeId={theme.id}
          subThemes={theme.subThemes}
          disableDrag={disableDrag}
          expandedSubThemes={expandedSubThemes}
          selection={selection}
          onToggleSubTheme={onToggleSubTheme}
          onSelect={onSelect}
          onReorderSubThemes={onReorderSubThemes}
          onReorderQuizzes={onReorderQuizzes}
        />
      )}
    </div>
  );
}

function SubThemesList({
  themeId,
  subThemes,
  disableDrag,
  expandedSubThemes,
  selection,
  onToggleSubTheme,
  onSelect,
  onReorderSubThemes,
  onReorderQuizzes,
}: {
  themeId: number;
  subThemes: TreeSubTheme[];
  disableDrag: boolean;
  expandedSubThemes: Set<number>;
  selection: Selection;
  onToggleSubTheme: (id: number) => void;
  onSelect: (sel: Selection) => void;
  onReorderSubThemes: (themeId: number, ids: number[]) => void;
  onReorderQuizzes: (subThemeId: number, ids: number[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    if (disableDrag) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = subThemes.map((s) => s.id);
    const oldIdx = ids.indexOf(Number(active.id));
    const newIdx = ids.indexOf(Number(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(ids, oldIdx, newIdx);
    onReorderSubThemes(themeId, reordered);
  }

  return (
    <div className="ml-4 border-l border-ms-light-gray pl-2 space-y-0.5 mt-0.5">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={subThemes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {subThemes.map((st) => (
            <SortableSubTheme
              key={st.id}
              themeId={themeId}
              subTheme={st}
              disableDrag={disableDrag}
              expanded={expandedSubThemes.has(st.id)}
              selection={selection}
              onToggleSubTheme={onToggleSubTheme}
              onSelect={onSelect}
              onReorderQuizzes={onReorderQuizzes}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableSubTheme({
  themeId,
  subTheme,
  disableDrag,
  expanded,
  selection,
  onToggleSubTheme,
  onSelect,
  onReorderQuizzes,
}: {
  themeId: number;
  subTheme: TreeSubTheme;
  disableDrag: boolean;
  expanded: boolean;
  selection: Selection;
  onToggleSubTheme: (id: number) => void;
  onSelect: (sel: Selection) => void;
  onReorderQuizzes: (subThemeId: number, ids: number[]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subTheme.id,
    disabled: disableDrag,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isActive =
    selection.themeId === themeId &&
    selection.subThemeId === subTheme.id &&
    selection.quizId === null;

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
      <div
        className={`flex items-center gap-1 rounded-lg px-1 py-1 text-sm group ${
          isActive ? "bg-ms-lavender text-white" : "hover:bg-ms-cream"
        }`}
      >
        {!disableDrag && (
          <button
            {...listeners}
            {...attributes}
            className={`shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 ${isActive ? "group-hover:opacity-80" : ""} transition`}
            title="Glisser pour réordonner"
            tabIndex={-1}
          >
            <svg className="w-3 h-4" fill="currentColor" viewBox="0 0 8 14">
              <circle cx="2" cy="2" r="1.2" />
              <circle cx="2" cy="7" r="1.2" />
              <circle cx="2" cy="12" r="1.2" />
              <circle cx="6" cy="2" r="1.2" />
              <circle cx="6" cy="7" r="1.2" />
              <circle cx="6" cy="12" r="1.2" />
            </svg>
          </button>
        )}
        <button
          onClick={() => onToggleSubTheme(subTheme.id)}
          className={`shrink-0 w-4 h-4 flex items-center justify-center rounded ${
            isActive ? "hover:bg-white/20" : "hover:bg-ms-light-gray"
          }`}
        >
          {subTheme.quizzes.length > 0 && (
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
        <button
          onClick={() =>
            onSelect({ themeId, subThemeId: subTheme.id, quizId: null })
          }
          className={`flex-1 min-w-0 flex items-center gap-2 text-left font-medium ${
            isActive ? "text-white" : "text-ms-dark"
          }`}
        >
          <span className="truncate">{subTheme.name}</span>
          <span
            className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
              isActive ? "bg-white/20" : "bg-ms-cream text-ms-gray"
            }`}
          >
            {subTheme._count.quizzes}
          </span>
        </button>
      </div>

      {expanded && (
        <QuizzesList
          themeId={themeId}
          subThemeId={subTheme.id}
          quizzes={subTheme.quizzes}
          disableDrag={disableDrag}
          selection={selection}
          onSelect={onSelect}
          onReorderQuizzes={onReorderQuizzes}
        />
      )}
    </div>
  );
}

function QuizzesList({
  themeId,
  subThemeId,
  quizzes,
  disableDrag,
  selection,
  onSelect,
  onReorderQuizzes,
}: {
  themeId: number;
  subThemeId: number;
  quizzes: TreeQuiz[];
  disableDrag: boolean;
  selection: Selection;
  onSelect: (sel: Selection) => void;
  onReorderQuizzes: (subThemeId: number, ids: number[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    if (disableDrag) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = quizzes.map((q) => q.id);
    const oldIdx = ids.indexOf(Number(active.id));
    const newIdx = ids.indexOf(Number(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(ids, oldIdx, newIdx);
    onReorderQuizzes(subThemeId, reordered);
  }

  return (
    <div className="ml-4 border-l border-ms-light-gray pl-2 space-y-0.5 mt-0.5">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={quizzes.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          {quizzes.map((quiz) => (
            <SortableQuiz
              key={quiz.id}
              themeId={themeId}
              subThemeId={subThemeId}
              quiz={quiz}
              disableDrag={disableDrag}
              selection={selection}
              onSelect={onSelect}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableQuiz({
  themeId,
  subThemeId,
  quiz,
  disableDrag,
  selection,
  onSelect,
}: {
  themeId: number;
  subThemeId: number;
  quiz: TreeQuiz;
  disableDrag: boolean;
  selection: Selection;
  onSelect: (sel: Selection) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: quiz.id,
    disabled: disableDrag,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isActive = selection.quizId === quiz.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 rounded-lg px-1 py-1 text-sm group ${
        isActive ? "bg-ms-lavender text-white" : "text-ms-gray hover:bg-ms-cream hover:text-ms-dark"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      {!disableDrag && (
        <button
          {...listeners}
          {...attributes}
          className={`shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 ${isActive ? "group-hover:opacity-80" : ""} transition`}
          title="Glisser pour réordonner"
          tabIndex={-1}
        >
          <svg className="w-3 h-4" fill="currentColor" viewBox="0 0 8 14">
            <circle cx="2" cy="2" r="1.2" />
            <circle cx="2" cy="7" r="1.2" />
            <circle cx="2" cy="12" r="1.2" />
            <circle cx="6" cy="2" r="1.2" />
            <circle cx="6" cy="7" r="1.2" />
            <circle cx="6" cy="12" r="1.2" />
          </svg>
        </button>
      )}
      <button
        onClick={() =>
          onSelect({ themeId, subThemeId, quizId: quiz.id })
        }
        className="flex-1 min-w-0 flex items-center gap-2 text-left"
      >
        <span className="truncate">{quiz.title}</span>
        <span
          className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
            isActive ? "bg-white/20" : "bg-ms-cream text-ms-gray"
          }`}
        >
          {quiz._count.questions}
        </span>
      </button>
    </div>
  );
}
