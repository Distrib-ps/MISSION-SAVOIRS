import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import type { PendingDrawing } from "../../types";

function authHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` };
}

export default function DrawingsPage() {
  const [drawings, setDrawings] = useState<PendingDrawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/drawings", { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Impossible de charger les dessins"))))
      .then((d) => setDrawings(d.drawings ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function validate(attemptId: number, approve: boolean) {
    setBusy(attemptId);
    try {
      await fetch(`/api/admin/drawings/${attemptId}/validate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ approve }),
      });
      setDrawings((prev) => prev.filter((d) => d.attemptId !== attemptId));
      // met à jour le badge "Dessins à valider" dans la nav
      window.dispatchEvent(new Event("drawings:refresh"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ms-dark">Dessins à valider</h1>
        <p className="text-ms-gray">Les dessins rendus par les élèves sur vos questions, en attente de validation.</p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-ms-lavender border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="bg-ms-pink-light border border-ms-pink/30 rounded-2xl p-4 mb-6 text-ms-dark font-medium">{error}</div>
      )}

      {!loading && !error && drawings.length === 0 && (
        <div className="bg-white rounded-2xl border border-ms-light-gray/50 p-12 text-center">
          <p className="text-5xl mb-4">🎨</p>
          <p className="text-lg text-ms-gray font-medium">Aucun dessin en attente.</p>
        </div>
      )}

      {!loading && !error && drawings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {drawings.map((d) => (
            <div key={d.attemptId} className="bg-white border border-ms-light-gray rounded-2xl p-4">
              <div className="mb-2">
                <p className="font-bold text-ms-dark">{d.questionText}</p>
                <p className="text-xs text-ms-gray">{d.quizTitle} · par {d.student}</p>
              </div>
              <div className="bg-ms-cream rounded-xl p-2 flex justify-center mb-3">
                {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                <img src={d.image} alt="Dessin de l'élève" className="max-h-56 object-contain rounded-lg bg-white" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => validate(d.attemptId, true)}
                  disabled={busy === d.attemptId}
                  className="flex-1 bg-ms-green text-white font-semibold py-2 rounded-xl hover:opacity-90 transition disabled:opacity-50"
                >
                  Valider
                </button>
                <button
                  onClick={() => validate(d.attemptId, false)}
                  disabled={busy === d.attemptId}
                  className="flex-1 bg-ms-pink text-white font-semibold py-2 rounded-xl hover:opacity-90 transition disabled:opacity-50"
                >
                  Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
