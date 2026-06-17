import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";

interface AuditEntry {
  id: number;
  action: string;
  targetType: string | null;
  targetId: number | null;
  detail: string | null;
  createdAt: string;
  actor: string;
}

const ACTION_LABELS: Record<string, string> = {
  USER_DELETE: "Suppression d'un compte",
  USER_BULK_DELETE: "Suppression en masse",
  USERS_IMPORT: "Import d'élèves",
  STUDENT_EXPORT: "Export des données d'un élève",
  STUDENT_STATS_VIEW: "Consultation des stats d'un élève",
  DRAWINGS_VIEW: "Consultation des dessins",
};

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/users/audit/logs", { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Accès refusé"))))
      .then((d) => setLogs(d.logs ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ms-dark">Journal d'accès</h1>
        <p className="text-ms-gray">
          Traçabilité des opérations sensibles sur les données des élèves (RGPD — responsabilité).
        </p>
      </div>

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

      {!loading && !error && (
        logs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-ms-light-gray/50 p-12 text-center">
            <p className="text-lg text-ms-gray font-medium">Aucune entrée pour le moment.</p>
          </div>
        ) : (
          <div className="bg-white border border-ms-light-gray rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ms-light-gray bg-ms-cream/50 text-left text-ms-gray">
                  <th className="px-4 py-3 font-bold">Date</th>
                  <th className="px-4 py-3 font-bold">Action</th>
                  <th className="px-4 py-3 font-bold">Par</th>
                  <th className="px-4 py-3 font-bold">Cible</th>
                  <th className="px-4 py-3 font-bold">Détail</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-ms-light-gray/30">
                    <td className="px-4 py-2.5 text-ms-gray whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-2.5 text-ms-dark font-medium">
                      {ACTION_LABELS[l.action] ?? l.action}
                    </td>
                    <td className="px-4 py-2.5 text-ms-dark">{l.actor}</td>
                    <td className="px-4 py-2.5 text-ms-gray">
                      {l.targetType ? `${l.targetType} #${l.targetId}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-ms-gray">{l.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </AdminLayout>
  );
}
