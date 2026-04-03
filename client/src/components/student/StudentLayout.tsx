import type { ReactNode } from "react";
import { useAuth } from "../../contexts/AuthContext";

interface Props {
  children: ReactNode;
}

export default function StudentLayout({ children }: Props) {
  const { user, logout } = useAuth();

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
              onClick={logout}
              className="ml-2 px-4 py-2 text-sm font-semibold text-ms-gray bg-ms-cream hover:bg-ms-light-gray rounded-xl transition"
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
    </div>
  );
}
