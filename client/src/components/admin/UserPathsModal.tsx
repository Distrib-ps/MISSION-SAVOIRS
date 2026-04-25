import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import QuizTreePicker from "./QuizTreePicker";

interface StudentSummary {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
}

interface PathRow {
  id: number;
  name: string;
  description: string | null;
  quizzes: {
    quizId: number;
    order: number;
    quiz: {
      id: number;
      title: string;
      subTheme?: {
        name: string;
        theme?: { name: string; emoji: string };
      };
      _count?: { questions: number };
    };
  }[];
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

export default function UserPathsModal({
  student,
  onClose,
}: {
  student: StudentSummary;
  onClose: () => void;
}) {
  const [paths, setPaths] = useState<PathRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Editor state */
  const [editing, setEditing] = useState<PathRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formQuizIds, setFormQuizIds] = useState<number[]>([]);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchPaths = useCallback(() => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/custom-paths?userId=${student.id}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Erreur"))))
      .then((data) => setPaths(data.paths ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [student.id]);

  useEffect(() => {
    fetchPaths();
  }, [fetchPaths]);

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setFormName("");
    setFormDescription("");
    setFormQuizIds([]);
    setFormError("");
  }

  function openEdit(p: PathRow) {
    setCreating(false);
    setEditing(p);
    setFormName(p.name);
    setFormDescription(p.description ?? "");
    setFormQuizIds([...p.quizzes].sort((a, b) => a.order - b.order).map((q) => q.quizId));
    setFormError("");
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormSaving(true);
    setFormError("");

    if (!formName.trim()) {
      setFormError("Le nom est requis");
      setFormSaving(false);
      return;
    }
    if (formQuizIds.length === 0) {
      setFormError("Sélectionne au moins un quiz");
      setFormSaving(false);
      return;
    }

    try {
      if (editing) {
        const res = await fetch(`/api/admin/custom-paths/${editing.id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({
            name: formName,
            description: formDescription || null,
            quizIds: formQuizIds,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error || "Erreur lors de la modification");
        }
      } else {
        const res = await fetch("/api/admin/custom-paths", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            userId: student.id,
            name: formName,
            description: formDescription || null,
            quizIds: formQuizIds,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error || "Erreur lors de la création");
        }
      }
      closeForm();
      await fetchPaths();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDelete(pathId: number) {
    if (!confirm("Supprimer ce parcours ?")) return;
    try {
      const res = await fetch(`/api/admin/custom-paths/${pathId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      await fetchPaths();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  const showingForm = creating || !!editing;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-extrabold text-ms-dark">
              Parcours personnalisés
            </h2>
            <p className="text-sm text-ms-gray mt-1">
              {student.firstName} {student.lastName} ({student.username})
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-ms-cream hover:bg-ms-light-gray flex items-center justify-center transition shrink-0"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5 text-ms-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-ms-pink-light text-ms-dark text-sm rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* List view */}
        {!showingForm && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-ms-gray">
                {paths.length} parcours
              </p>
              <button
                onClick={openCreate}
                className="px-4 py-2 text-sm font-semibold bg-ms-lavender text-white hover:opacity-90 rounded-xl transition shadow-sm"
              >
                + Créer un parcours
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-ms-lavender border-t-transparent rounded-full animate-spin" />
              </div>
            ) : paths.length === 0 ? (
              <div className="text-center py-12 text-ms-gray">
                <p className="font-semibold">Aucun parcours personnalisé</p>
                <p className="text-sm mt-1">
                  Crée un parcours pour assigner des quiz ciblés à {student.firstName}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {paths.map((p) => (
                  <div
                    key={p.id}
                    className="bg-ms-cream/40 border border-ms-light-gray rounded-2xl p-4 flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-ms-dark">{p.name}</h3>
                      {p.description && (
                        <p className="text-sm text-ms-gray mt-0.5">{p.description}</p>
                      )}
                      <p className="text-xs text-ms-gray mt-2">
                        {p.quizzes.length} quiz : {p.quizzes
                          .slice(0, 3)
                          .map((q) => q.quiz.title)
                          .join(", ")}
                        {p.quizzes.length > 3 ? "..." : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-2 text-ms-gray hover:text-ms-lavender hover:bg-ms-lavender-light rounded-xl transition"
                        title="Modifier"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 text-ms-gray hover:text-ms-pink hover:bg-ms-pink-light rounded-xl transition"
                        title="Supprimer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Form view */}
        {showingForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-extrabold text-ms-dark">
              {editing ? "Modifier le parcours" : "Nouveau parcours"}
            </h3>

            {formError && (
              <div className="px-4 py-3 bg-ms-pink-light text-ms-dark text-sm rounded-xl font-medium">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-ms-dark mb-1">
                Nom du parcours *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition"
                placeholder="Ex: Remise à niveau calcul"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ms-dark mb-1">
                Description
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 border border-ms-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ms-lavender/50 focus:border-ms-lavender transition resize-none"
                placeholder="Objectif du parcours (optionnel)"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ms-dark mb-2">
                Quiz à inclure
              </label>
              <QuizTreePicker selectedIds={formQuizIds} onChange={setFormQuizIds} />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeForm}
                className="px-5 py-2.5 text-sm font-semibold bg-white border border-ms-light-gray text-ms-dark hover:bg-ms-cream rounded-xl transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={formSaving}
                className="px-5 py-2.5 text-sm font-semibold bg-ms-lavender text-white hover:opacity-90 rounded-xl transition disabled:opacity-50"
              >
                {formSaving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
