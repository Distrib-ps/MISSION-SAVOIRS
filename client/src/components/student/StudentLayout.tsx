import { useState, type ReactNode } from "react";
import { useAuth } from "../../contexts/AuthContext";
import AccessibilitySettings from "../AccessibilitySettings";

interface Props {
  children: ReactNode;
}

export default function StudentLayout({ children }: Props) {
  const { user, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen bg-ms-cream">
      {/* Header */}
      <header className="bg-white border-b border-ms-light-gray">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ms-lavender rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
              M
            </div>
            <span className="text-lg font-bold text-ms-dark">
              Mission Savoirs
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-ms-dark">
              {user?.firstName}
            </span>
            {user?.level && (
              <span className="bg-ms-lavender-light text-ms-lavender text-xs font-bold px-3 py-1 rounded-xl">
                {user.level}
              </span>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="ml-1 w-9 h-9 rounded-xl bg-ms-cream hover:bg-ms-light-gray flex items-center justify-center transition"
              title="Réglages d'accessibilité"
              aria-label="Réglages d'accessibilité"
            >
              <svg className="w-5 h-5 text-ms-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={logout}
              className="ml-1 px-4 py-2 text-sm font-semibold text-ms-gray bg-ms-cream hover:bg-ms-light-gray rounded-xl transition"
            >
              Se deconnecter
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {children}
      </main>

      {/* Settings modal */}
      {showSettings && (
        <AccessibilitySettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
