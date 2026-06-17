import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import DemoButton from "../../components/admin/DemoButton";
import type { TourStep } from "../../components/admin/GuidedTour";
import type { Classe, Level } from "../../types";

const CLASSES_DEMO: TourStep[] = [
  {
    title: "Classes & groupes 🏫",
    text: "Ici vous organisez vos élèves. Une « classe » ou un « groupe » sert à les regrouper et à cibler du contenu.",
  },
  {
    selector: '[data-demo="class-create"]',
    title: "Créer",
    text: "Ce bouton ouvre le formulaire : donnez un nom (ex. CE2-2 ou Groupe lecture) et choisissez le niveau.",
  },
  {
    title: "Multi-appartenance",
    text: "Un même élève peut être dans plusieurs groupes (sa classe + un groupe de besoin, par ex.). Le rattachement se fait depuis la fiche de l'élève (menu Élèves).",
  },
  {
    title: "Cibler un quiz",
    text: "Un quiz « Privé » ne sera visible que par les élèves de vos classes/groupes. Pratique pour différencier.",
  },
];

const LEVELS: Level[] = ["CP", "CE1", "CE2", "CM1", "CM2"];

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Classe | "new" | null>(null);
  const [formName, setFormName] = useState("");
  const [formLevel, setFormLevel] = useState<Level>("CP");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/classes", { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Impossible de charger les classes"))))
      .then((d) => setClasses(d.classes ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() {
    setFormName("");
    setFormLevel("CP");
    setFormError(null);
    setEditing("new");
  }
  function openEdit(c: Classe) {
    setFormName(c.name);
    setFormLevel(c.level);
    setFormError(null);
    setEditing(c);
  }

  async function handleSave() {
    if (!formName.trim()) {
      setFormError("Le nom est requis.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const isNew = editing === "new";
      const res = await fetch(
        isNew ? "/api/admin/classes" : `/api/admin/classes/${(editing as Classe).id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ name: formName.trim(), level: formLevel }),
        }
      );
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

  async function handleDelete(c: Classe) {
    if (!confirm(`Supprimer la classe « ${c.name} » ? Les élèves seront détachés.`)) return;
    const res = await fetch(`/api/admin/classes/${c.id}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) load();
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-ms-dark">Classes & groupes</h1>
          <p className="text-ms-gray">Regroupez les élèves par classe ou groupe et ciblez le contenu.</p>
        </div>
        <div className="flex items-center gap-2">
          <DemoButton steps={CLASSES_DEMO} />
          {editing === null && (
            <button
              data-demo="class-create"
              onClick={openCreate}
              className="bg-ms-lavender text-white font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition shrink-0"
            >
              + Créer une classe / un groupe
            </button>
          )}
        </div>
      </div>

      {editing !== null && (
        <div className="bg-white border border-ms-light-gray rounded-2xl p-5 mb-6">
          <h2 className="text-lg font-bold text-ms-dark mb-4">
            {editing === "new" ? "Nouvelle classe / groupe" : `Modifier « ${(editing as Classe).name} »`}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-ms-gray mb-1">Nom</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="CE2-2 ou Groupe 1"
                className="w-full px-3 py-2 border border-ms-light-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-ms-lavender/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-ms-gray mb-1">Niveau</label>
              <select
                value={formLevel}
                onChange={(e) => setFormLevel(e.target.value as Level)}
                className="w-full px-3 py-2 border border-ms-light-gray rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ms-lavender/40"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
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
        classes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-ms-light-gray/50 p-12 text-center">
            <p className="text-5xl mb-4">🏫</p>
            <p className="text-lg text-ms-gray font-medium">Aucune classe pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {classes.map((c) => (
              <div key={c.id} className="bg-white border border-ms-light-gray rounded-2xl p-4 flex items-center gap-4">
                <span className="bg-ms-blue-light text-ms-dark text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
                  {c.level}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-ms-dark truncate">{c.name}</h3>
                  <p className="text-sm text-ms-gray">
                    {c._count?.students ?? 0} élève{(c._count?.students ?? 0) > 1 ? "s" : ""}
                    {" · "}
                    {c.teacher ? (
                      <>Propriétaire : {c.teacher.firstName} {c.teacher.lastName}</>
                    ) : (
                      <span className="italic">Sans propriétaire</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => openEdit(c)}
                  className="px-3 py-1.5 text-sm font-semibold text-ms-lavender hover:bg-ms-lavender-light rounded-lg transition shrink-0"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(c)}
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
