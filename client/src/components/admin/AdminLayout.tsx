import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useState, type ReactNode } from "react";
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
    to: "/admin/content",
    label: "Contenus",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    end: false,
  },
];

export default function AdminLayout({ children }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

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
              <span>{item.label}</span>
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
              <p className="text-xs text-ms-gray">Administrateur</p>
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
