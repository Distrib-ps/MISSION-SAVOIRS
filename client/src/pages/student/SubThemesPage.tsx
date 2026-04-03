import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StudentLayout from "../../components/student/StudentLayout";
import type { StudentSubTheme } from "../../types";

const CARD_COLORS = [
  { bg: "bg-ms-green-light", border: "border-ms-green/30", icon: "bg-ms-green" },
  { bg: "bg-ms-blue-light", border: "border-ms-blue/30", icon: "bg-ms-blue" },
  { bg: "bg-ms-yellow-light", border: "border-ms-yellow/30", icon: "bg-ms-yellow" },
  { bg: "bg-ms-pink-light", border: "border-ms-pink/30", icon: "bg-ms-pink" },
  { bg: "bg-ms-peach-light", border: "border-ms-peach/30", icon: "bg-ms-peach" },
];

const SUB_EMOJIS = ["🎯", "🧩", "🚀", "🌟", "🎪", "🗺️", "🔑", "🌈"];

export default function SubThemesPage() {
  const { themeId } = useParams<{ themeId: string }>();
  const navigate = useNavigate();
  const [themeName, setThemeName] = useState("");
  const [subThemes, setSubThemes] = useState<StudentSubTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`/api/student/themes/${themeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Impossible de charger les parcours");
        return res.json();
      })
      .then((data: { name: string; subThemes: StudentSubTheme[] }) => {
        setThemeName(data.name);
        setSubThemes(data.subThemes);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [themeId]);

  return (
    <StudentLayout>
      {/* Back button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-ms-gray hover:text-ms-dark font-semibold mb-6 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Retour aux themes
      </button>

      {/* Title */}
      {themeName && (
        <h1 className="text-3xl font-extrabold text-ms-dark mb-6">
          {themeName}
        </h1>
      )}

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

      {/* Empty */}
      {!loading && !error && subThemes.length === 0 && (
        <div className="bg-white rounded-3xl border border-ms-light-gray/50 p-12 text-center">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-lg text-ms-gray font-medium">
            Aucun parcours disponible pour le moment
          </p>
        </div>
      )}

      {/* Sub-themes grid */}
      {!loading && !error && subThemes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {subThemes.map((sub, index) => {
            const color = CARD_COLORS[index % CARD_COLORS.length];
            const emoji = SUB_EMOJIS[index % SUB_EMOJIS.length];
            return (
              <button
                key={sub.id}
                onClick={() =>
                  navigate(`/themes/${themeId}/sub-themes/${sub.id}`)
                }
                className={`${color.bg} border ${color.border} rounded-3xl p-7 min-h-[120px] flex items-center gap-5 text-left hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer w-full`}
              >
                <div
                  className={`${color.icon} w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm shrink-0`}
                >
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-ms-dark text-xl truncate">
                    {sub.name}
                  </h3>
                  <p className="text-ms-gray text-base mt-1">
                    {sub._count.quizzes} quiz
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
