import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import type { StatsOverview } from "../types";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<StatsOverview["cards"] | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats/overview", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: StatsOverview | null) => setCards(d?.cards ?? null))
      .catch(() => setCards(null));
  }, []);

  const v = (n: number | undefined) => (n === undefined ? "--" : String(n));

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl lg:text-3xl font-extrabold text-ms-dark mb-2">
          Tableau de bord
        </h1>
        <p className="text-ms-gray mb-8">
          Gerez vos eleves et vos contenus pedagogiques.
        </p>

        {/* Stats cards (placeholder) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-2xl border border-ms-light-gray/50 p-6">
            <div className="w-11 h-11 bg-ms-blue-light rounded-xl flex items-center justify-center text-lg mb-3">
              <svg className="w-6 h-6 text-ms-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-sm text-ms-gray font-medium">Total eleves</p>
            <p className="text-2xl font-extrabold text-ms-dark mt-1">{v(cards?.students)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-ms-light-gray/50 p-6">
            <div className="w-11 h-11 bg-ms-green-light rounded-xl flex items-center justify-center text-lg mb-3">
              <svg className="w-6 h-6 text-ms-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-ms-gray font-medium">Quiz completes</p>
            <p className="text-2xl font-extrabold text-ms-dark mt-1">{v(cards?.completed)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-ms-light-gray/50 p-6">
            <div className="w-11 h-11 bg-ms-peach-light rounded-xl flex items-center justify-center text-lg mb-3">
              <svg className="w-6 h-6 text-ms-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-sm text-ms-gray font-medium">Themes actifs</p>
            <p className="text-2xl font-extrabold text-ms-dark mt-1">{v(cards?.themes)}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <button
            onClick={() => navigate("/admin/users")}
            className="bg-white rounded-2xl border border-ms-light-gray/50 p-7 hover:shadow-md transition-shadow text-left group"
          >
            <div className="w-12 h-12 bg-ms-blue-light rounded-2xl flex items-center justify-center text-xl mb-4 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-ms-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-ms-dark mb-1">
              Gestion des eleves
            </h3>
            <p className="text-sm text-ms-gray">
              Ajouter, modifier et gerer les comptes eleves.
            </p>
          </button>

          <button
            onClick={() => navigate("/admin/content")}
            className="bg-white rounded-2xl border border-ms-light-gray/50 p-7 hover:shadow-md transition-shadow text-left group"
          >
            <div className="w-12 h-12 bg-ms-peach-light rounded-2xl flex items-center justify-center text-xl mb-4 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-ms-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-ms-dark mb-1">
              Gestion des contenus
            </h3>
            <p className="text-sm text-ms-gray">
              Creer et organiser vos themes, quiz et questions.
            </p>
          </button>

          <button
            onClick={() => navigate("/admin/stats")}
            className="bg-white rounded-2xl border border-ms-light-gray/50 p-7 hover:shadow-md transition-shadow text-left group"
          >
            <div className="w-12 h-12 bg-ms-lavender-light rounded-2xl flex items-center justify-center text-xl mb-4 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-ms-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-ms-dark mb-1">
              KPI &amp; Statistiques
            </h3>
            <p className="text-sm text-ms-gray">
              Suivre la progression et les taux de réussite.
            </p>
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
