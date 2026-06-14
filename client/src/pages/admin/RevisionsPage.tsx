import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import QuestionTreePicker from "../../components/admin/QuestionTreePicker";
import type { AdminRevision, SchoolLevel } from "../../types";

const LEVELS: SchoolLevel[] = ["CP", "CE1", "CE2", "CM1", "CM2"];

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

export default function RevisionsPage() {
  const [revisions, setRevisions] = useState<AdminRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form state (null = liste ; "new" = création ; sinon édition d'une révision)
  const [editing, setEditing] = useState<AdminRevision | "new" | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLevel, setFormLevel] = useState<SchoolLevel>("CP");
  const [formQuestionIds, setFormQuestionIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/revisions", { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Impossible de charger les révisions"))))
      .then((d) => setRevisions(d.revisions ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setFormName("");
    setFormDescription("");
    setFormLevel("CP");
    setFormQuestionIds([]);
    setFormError(null);
    setEditing("new");
  }

  function openEdit(r: AdminRevision) {
    setFormName(r.name);
    setFormDescription(r.description ?? "");
    setFormLevel(r.targetLevel);
    setFormQuestionIds(r.questions.map((q) => q.question.id));
    setFormError(null);
    setEditing(r);
  }

  async function handleSave() {
    if (!formName.trim()) {
      setFormError("Le nom est requis.");
      return;
    }
    if (formQuestionIds.length === 0) {
      setFormError("Sélectionne au moins une question.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        targetLevel: formLevel,
        questionIds: formQuestionIds,
      };
      const isNew = editing === "new";
      const url = isNew ? "/api/admin/revisions" : `/api/admin/revisions/${(editing as AdminRevision).id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Échec de l'enregistrement");
      }
      setEditing(null);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(r: AdminRevision) {
    if (!confirm(`Supprimer la révision « ${r.name} » ?`)) return;
    const res = await fetch(`/api/admin/revisions/${r.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) load();
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ms-dark">Révisions par niveau</h1>
          <p className="text-ms-gray">
            Des parcours de révision mixant des questions piochées dans plusieurs quiz, ciblés par niveau.
          </p>
        </div>
        {editing === null && (
          <button
            onClick={openCreate}
            className="bg-ms-lavender text-white font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition shrink-0"
          >
            + Créer une révision
          </button>
        )}
      </div>

      {/* ── Formulaire (création / édition) ── */}
      {editing !== null && (
        <div className="bg-white border border-ms-light-gray rounded-2xl p-5 mb-6">
          <h2 className="text-lg font-bold text-ms-dark mb-4">
            {editing === "new" ? "Nouvelle révision" : `Modifier « ${(editing as AdminRevision).name} »`}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-ms-gray mb-1">Nom</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Révision de la semaine"
                className="w-full px-3 py-2 border border-ms-light-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-ms-lavender/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-ms-gray mb-1">Niveau cible</label>
              <select
                value={formLevel}
                onChange={(e) => setFormLevel(e.target.value as SchoolLevel)}
                className="w-full px-3 py-2 border border-ms-light-gray rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ms-lavender/40"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold uppercase text-ms-gray mb-1">Description (optionnelle)</label>
            <input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Un peu de maths, un peu de français..."
              className="w-full px-3 py-2 border border-ms-light-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-ms-lavender/40"
            />
          </div>

          <label className="block text-xs font-bold uppercase text-ms-gray mb-2">Questions</label>
          <QuestionTreePicker selectedIds={formQuestionIds} onChange={setFormQuestionIds} />

          {formError && <p className="text-sm text-ms-pink font-semibold mt-3">{formError}</p>}

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-ms-lavender text-white font-semibold px-5 py-2 rounded-xl hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="border border-ms-light-gray text-ms-dark font-semibold px-5 py-2 rounded-xl hover:bg-ms-cream transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Liste ── */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-12 h-12 border-4 border-ms-lavender border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="bg-ms-pink-light border border-ms-pink/30 rounded-2xl p-6 text-center">
          <p className="text-ms-dark font-semibold">{error}</p>
        </div>
      )}

      {!loading && !error && editing === null && (
        revisions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-ms-light-gray/50 p-12 text-center">
            <p className="text-5xl mb-4">⭐</p>
            <p className="text-lg text-ms-gray font-medium">Aucune révision pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {revisions.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-ms-light-gray rounded-2xl p-4 flex items-center gap-4"
              >
                <span className="bg-ms-lavender text-white text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
                  {r.targetLevel}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-ms-dark truncate">{r.name}</h3>
                  <p className="text-sm text-ms-gray truncate">
                    {r.questions.length} question{r.questions.length > 1 ? "s" : ""}
                    {r.description ? ` · ${r.description}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => openEdit(r)}
                  className="px-3 py-1.5 text-sm font-semibold text-ms-lavender hover:bg-ms-lavender-light rounded-lg transition shrink-0"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(r)}
                  className="px-3 py-1.5 text-sm font-semibold text-ms-pink hover:bg-ms-pink-light rounded-lg transition shrink-0"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </AdminLayout>
  );
}
