import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import StudentLayout from "../components/student/StudentLayout";
import type { StudentTheme, CustomPath } from "../types";

const CARD_COLORS = [
  { bg: "bg-ms-blue-light", border: "border-ms-blue/30", icon: "bg-ms-blue" },
  { bg: "bg-ms-pink-light", border: "border-ms-pink/30", icon: "bg-ms-pink" },
  { bg: "bg-ms-green-light", border: "border-ms-green/30", icon: "bg-ms-green" },
  { bg: "bg-ms-yellow-light", border: "border-ms-yellow/30", icon: "bg-ms-yellow" },
  { bg: "bg-ms-peach-light", border: "border-ms-peach/30", icon: "bg-ms-peach" },
];

const DEFAULT_EMOJIS = ["📚", "🔢", "🌍", "🎨", "🔬", "🎵", "🏃", "💡"];

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [themes, setThemes] = useState<StudentTheme[]>([]);
  const [paths, setPaths] = useState<CustomPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("/api/student/themes", { headers }).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("Impossible de charger les themes")),
      ),
      fetch("/api/student/custom-paths", { headers }).then((r) =>
        r.ok ? r.json() : { paths: [] },
      ),
    ])
      .then(([themesData, pathsData]) => {
        setThemes(themesData as StudentTheme[]);
        setPaths(pathsData.paths ?? []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudentLayout>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-ms-dark mb-1">
          Salut {user?.firstName} !
        </h1>
        <p className="text-lg text-ms-gray">Choisis un theme</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-ms-lavender border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-ms-gray text-lg font-medium">Chargement...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-ms-pink-light border border-ms-pink/30 rounded-2xl p-6 text-center">
          <p className="text-ms-dark font-semibold">{error}</p>
        </div>
      )}

      {/* Custom paths */}
      {!loading && !error && paths.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">&#127775;</span>
            <h2 className="text-xl font-extrabold text-ms-dark">Mes parcours</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paths.map((path) => {
              const done = path.quizzes.filter((q) => q.completed).length;
              const total = path.quizzes.length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <button
                  key={path.id}
                  onClick={() => navigate(`/paths/${path.id}`)}
                  className="bg-gradient-to-br from-ms-lavender-light to-ms-pink-light border-2 border-ms-lavender/40 rounded-3xl p-6 text-left hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-ms-lavender rounded-2xl flex items-center justify-center text-white text-xl shadow-sm shrink-0">
                      &#127919;
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="inline-block bg-ms-lavender text-white text-xs font-bold px-2 py-0.5 rounded-full mb-1">
                        Personnalisé
                      </span>
                      <h3 className="font-extrabold text-ms-dark text-lg truncate">
                        {path.name}
                      </h3>
                      {path.description && (
                        <p className="text-sm text-ms-gray truncate">{path.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ms-lavender rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-ms-dark whitespace-nowrap">
                      {done}/{total}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Themes section title when paths exist */}
      {!loading && !error && paths.length > 0 && themes.length > 0 && (
        <h2 className="text-xl font-extrabold text-ms-dark mb-4">Tous les thèmes</h2>
      )}

      {/* Empty */}
      {!loading && !error && themes.length === 0 && paths.length === 0 && (
        <div className="bg-white rounded-3xl border border-ms-light-gray/50 p-12 text-center">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-lg text-ms-gray font-medium">
            Aucun theme disponible pour le moment
          </p>
        </div>
      )}

      {/* Themes grid */}
      {!loading && !error && themes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {themes.map((theme, index) => {
            const color = CARD_COLORS[index % CARD_COLORS.length];
            const emoji = theme.emoji || DEFAULT_EMOJIS[index % DEFAULT_EMOJIS.length];
            return (
              <button
                key={theme.id}
                onClick={() => navigate(`/themes/${theme.id}`)}
                className={`${color.bg} border ${color.border} rounded-3xl p-7 min-h-[120px] flex items-center gap-5 text-left hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer w-full`}
              >
                <div
                  className={`${color.icon} w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm shrink-0`}
                >
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-ms-dark text-xl truncate">
                    {theme.name}
                  </h3>
                  <p className="text-ms-gray text-base mt-1">
                    {theme._count.subThemes} parcours
                  </p>
                </div>
                <svg
                  className="w-6 h-6 text-ms-gray shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            );
          })}
        </div>
      )}
    </StudentLayout>
  );
}
