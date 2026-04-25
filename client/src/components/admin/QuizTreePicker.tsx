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
import type { TreeTheme } from "./ContentTreeSidebar";

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

interface Props {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

/** Two-pane selector: left = searchable tree of themes/subthemes/quizzes with checkboxes,
 * right = the ordered list of selected quizzes (draggable). */
export default function QuizTreePicker({ selectedIds, onChange }: Props) {
  const [tree, setTree] = useState<TreeTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expandedThemes, setExpandedThemes] = useState<Set<number>>(new Set());
  const [expandedSubThemes, setExpandedSubThemes] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/tree", { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Erreur"))))
      .then((data) => setTree(data.themes ?? []))
      .catch(() => setTree([]))
      .finally(() => setLoading(false));
  }, []);

  /* Flatten for quick lookup (selected side) */
  const allQuizzes = useMemo(() => {
    const map = new Map<number, { id: number; title: string; path: string }>();
    for (const theme of tree) {
      for (const st of theme.subThemes) {
        for (const qz of st.quizzes) {
          map.set(qz.id, {
            id: qz.id,
            title: qz.title,
            path: `${theme.emoji} ${theme.name} > ${st.name}`,
          });
        }
      }
    }
    return map;
  }, [tree]);

  const filteredTree = useMemo(() => {
    if (!query.trim()) return tree;
    const q = normalize(query);
    return tree
      .map((t) => {
        const match = normalize(t.name).includes(q);
        const subs = t.subThemes
          .map((st) => {
            const stMatch = normalize(st.name).includes(q);
            const quizzes = st.quizzes.filter((qz) => normalize(qz.title).includes(q));
            if (stMatch || quizzes.length > 0) {
              return { ...st, quizzes: stMatch ? st.quizzes : quizzes };
            }
            return null;
          })
          .filter((s): s is NonNullable<typeof s> => s !== null);
        if (match || subs.length > 0) {
          return { ...t, subThemes: match ? t.subThemes : subs };
        }
        return null;
      })
      .filter((t): t is TreeTheme => t !== null);
  }, [tree, query]);

  useEffect(() => {
    if (query.trim()) {
      setExpandedThemes(new Set(filteredTree.map((t) => t.id)));
      setExpandedSubThemes(new Set(filteredTree.flatMap((t) => t.subThemes.map((s) => s.id))));
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

  function toggleQuiz(quizId: number) {
    if (selectedIds.includes(quizId)) {
      onChange(selectedIds.filter((id) => id !== quizId));
    } else {
      onChange([...selectedIds, quizId]);
    }
  }

  /* ── Sortable selected list ── */

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = selectedIds.indexOf(Number(active.id));
    const newIdx = selectedIds.indexOf(Number(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    onChange(arrayMove(selectedIds, oldIdx, newIdx));
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ── Left: tree with checkboxes ── */}
      <div className="bg-ms-cream/40 border border-ms-light-gray rounded-xl p-3">
        <div className="mb-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un quiz..."
            className="w-full px-3 py-1.5 text-sm border border-ms-light-gray rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ms-lavender/40"
          />
        </div>
        <div className="max-h-72 overflow-y-auto space-y-0.5">
          {loading && (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-ms-lavender border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && filteredTree.length === 0 && (
            <p className="text-xs text-ms-gray text-center py-6">
              {query ? `Aucun résultat pour "${query}"` : "Aucun contenu disponible."}
            </p>
          )}
          {filteredTree.map((theme) => {
            const tExpanded = expandedThemes.has(theme.id);
            return (
              <div key={theme.id}>
                <button
                  type="button"
                  onClick={() => toggleTheme(theme.id)}
                  className="w-full flex items-center gap-1 px-1 py-1 rounded hover:bg-ms-cream text-sm"
                >
                  <svg
                    className={`w-3 h-3 transition-transform ${tExpanded ? "rotate-90" : ""} text-ms-gray`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span>{theme.emoji}</span>
                  <span className="font-semibold text-ms-dark">{theme.name}</span>
                </button>
                {tExpanded && (
                  <div className="ml-4 border-l border-ms-light-gray pl-2 space-y-0.5">
                    {theme.subThemes.map((st) => {
                      const stExpanded = expandedSubThemes.has(st.id);
                      return (
                        <div key={st.id}>
                          <button
                            type="button"
                            onClick={() => toggleSubTheme(st.id)}
                            className="w-full flex items-center gap-1 px-1 py-1 rounded hover:bg-ms-cream text-sm"
                          >
                            <svg
                              className={`w-3 h-3 transition-transform ${stExpanded ? "rotate-90" : ""} text-ms-gray`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-ms-dark">{st.name}</span>
                          </button>
                          {stExpanded && (
                            <div className="ml-4 border-l border-ms-light-gray pl-2 space-y-0.5">
                              {st.quizzes.map((qz) => {
                                const checked = selectedIds.includes(qz.id);
                                return (
                                  <label
                                    key={qz.id}
                                    className={`flex items-center gap-2 px-1 py-1 rounded text-sm cursor-pointer ${
                                      checked ? "bg-ms-lavender-light" : "hover:bg-ms-cream"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleQuiz(qz.id)}
                                      className="w-4 h-4 rounded accent-ms-lavender"
                                    />
                                    <span className="flex-1 truncate">{qz.title}</span>
                                    <span className="text-xs text-ms-gray">
                                      {qz._count.questions} Q
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: selected list (draggable) ── */}
      <div className="bg-white border border-ms-light-gray rounded-xl p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-ms-gray mb-2">
          Quiz sélectionnés ({selectedIds.length})
        </p>
        {selectedIds.length === 0 ? (
          <p className="text-xs text-ms-gray text-center py-8">
            Coche des quiz à gauche pour les ajouter au parcours.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={selectedIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {selectedIds.map((id, idx) => {
                  const info = allQuizzes.get(id);
                  if (!info) return null;
                  return (
                    <SortableRow
                      key={id}
                      id={id}
                      position={idx + 1}
                      title={info.title}
                      path={info.path}
                      onRemove={() => onChange(selectedIds.filter((i) => i !== id))}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function SortableRow({
  id,
  position,
  title,
  path,
  onRemove,
}: {
  id: number;
  position: number;
  title: string;
  path: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 bg-ms-cream/40 border border-ms-light-gray rounded-lg p-2 ${
        isDragging ? "opacity-60 shadow-md" : ""
      }`}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing text-ms-gray hover:text-ms-lavender"
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
      <span className="w-6 h-6 flex items-center justify-center bg-ms-lavender-light text-ms-lavender font-extrabold text-xs rounded-md shrink-0">
        {position}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ms-dark truncate">{title}</p>
        <p className="text-xs text-ms-gray truncate">{path}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-ms-gray hover:text-ms-pink hover:bg-ms-pink-light rounded-lg transition"
        title="Retirer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
