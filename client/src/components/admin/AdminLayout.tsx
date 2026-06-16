import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useState, useEffect, type ReactNode } from "react";
import AccessibilitySettings from "../AccessibilitySettings";

interface Props {
  children: ReactNode;
}

const navItems = [
  {
    to: "/admin",
    label: "Tableau de bord",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
      </svg>
    ),
    end: true,
  },
  {
    to: "/admin/users",
    label: "Eleves",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    end: false,
  },
  {
    to: "/admin/classes",
    label: "Classes",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-4m-6 0H3m2 0h4m0 0v-4a1 1 0 011-1h2a1 1 0 011 1v4m-4 0h4" />
      </svg>
    ),
    end: false,
  },
  {
    to: "/admin/content",
    label: "Contenus",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    end: false,
  },
  {
    to: "/admin/revisions",
    label: "Révisions",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    end: false,
  },
  {
    to: "/admin/stats",
    label: "Statistiques",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    end: false,
  },
  {
    to: "/admin/shared",
    label: "Partagés avec moi",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
    end: false,
  },
  {
    to: "/admin/drawings",
    label: "Dessins à valider",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h10a2 2 0 012 2v12a4 4 0 01-4 4H7zm0 0a4 4 0 004-4v-1a2 2 0 012-2h4" />
      </svg>
    ),
    end: false,
  },
];

export default function AdminLayout({ children }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [drawingCount, setDrawingCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/drawings/count", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => setDrawingCount(d.count ?? 0))
      .catch(() => setDrawingCount(0));
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-ms-cream flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-ms-light-gray flex flex-col shrink-0 hidden lg:flex">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-ms-light-gray">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-ms-lavender rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
              M
            </div>
            <span className="text-lg font-bold text-ms-dark">
              Mission Savoirs
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
                  isActive
                    ? "bg-ms-lavender text-white shadow-sm"
                    : "text-ms-gray hover:bg-ms-lavender-light hover:text-ms-dark"
                }`
              }
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.to === "/admin/drawings" && drawingCount > 0 && (
                <span className="ml-auto bg-ms-pink text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {drawingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="px-4 py-4 border-t border-ms-light-gray">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-ms-lavender-light rounded-full flex items-center justify-center text-ms-lavender font-bold text-sm">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ms-dark truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-ms-gray">
                {user?.role === "TEACHER" ? "Enseignant" : "Propriétaire"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 rounded-xl bg-ms-cream hover:bg-ms-light-gray flex items-center justify-center transition shrink-0"
              title="Réglages d'accessibilité"
              aria-label="Réglages d'accessibilité"
            >
              <svg className="w-5 h-5 text-ms-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 px-4 py-2 text-sm font-semibold text-ms-gray bg-ms-cream hover:bg-ms-light-gray rounded-xl transition"
            >
              Se deconnecter
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar for mobile */}
        <header className="bg-white border-b border-ms-light-gray lg:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-ms-lavender rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm">
                M
              </div>
              <span className="text-base font-bold text-ms-dark">
                Mission Savoirs
              </span>
            </div>
            <div className="flex items-center gap-2">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? "bg-ms-lavender text-white"
                      : "text-ms-gray hover:bg-ms-lavender-light"
                  }`
                }
              >
                Accueil
              </NavLink>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? "bg-ms-lavender text-white"
                      : "text-ms-gray hover:bg-ms-lavender-light"
                  }`
                }
              >
                Eleves
              </NavLink>
              <NavLink
                to="/admin/content"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? "bg-ms-lavender text-white"
                      : "text-ms-gray hover:bg-ms-lavender-light"
                  }`
                }
              >
                Contenus
              </NavLink>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold text-ms-gray hover:bg-ms-cream rounded-xl transition"
              >
                Quitter
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <AccessibilitySettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
