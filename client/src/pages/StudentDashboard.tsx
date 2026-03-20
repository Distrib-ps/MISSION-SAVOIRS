import { useAuth } from "../contexts/AuthContext";

export default function StudentDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-ms-cream">
      {/* Header */}
      <header className="bg-white border-b border-ms-light-gray">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-ms-lavender rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
              M
            </div>
            <span className="text-lg font-bold text-ms-dark">
              Mission Savoirs
            </span>
          </div>
          <div className="flex items-center gap-4">
            {user?.level && (
              <span className="bg-ms-lavender-light text-ms-lavender text-sm font-bold px-3 py-1 rounded-xl">
                {user.level}
              </span>
            )}
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-semibold text-ms-gray bg-ms-cream hover:bg-ms-light-gray rounded-xl transition"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="bg-white rounded-3xl border border-ms-light-gray/50 p-8 mb-8">
          <h1 className="text-3xl font-extrabold text-ms-dark mb-2">
            Salut {user?.firstName} !
          </h1>
          <p className="text-ms-gray text-lg">
            Qu'est-ce que tu veux apprendre aujourd'hui ?
          </p>
        </div>

        {/* Placeholder themes */}
        <h2 className="text-xl font-bold text-ms-dark mb-4">Tes thèmes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-ms-yellow-light rounded-3xl p-7 border border-ms-yellow/30 hover:shadow-md transition-shadow cursor-pointer">
            <div className="w-14 h-14 bg-ms-yellow rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">
              📖
            </div>
            <h3 className="font-bold text-ms-dark text-lg">Français</h3>
            <p className="text-ms-gray text-sm mt-1">Bientôt disponible</p>
          </div>

          <div className="bg-ms-blue-light rounded-3xl p-7 border border-ms-blue/30 hover:shadow-md transition-shadow cursor-pointer">
            <div className="w-14 h-14 bg-ms-blue rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">
              🔢
            </div>
            <h3 className="font-bold text-ms-dark text-lg">Mathématiques</h3>
            <p className="text-ms-gray text-sm mt-1">Bientôt disponible</p>
          </div>

          <div className="bg-ms-green-light rounded-3xl p-7 border border-ms-green/30 hover:shadow-md transition-shadow cursor-pointer">
            <div className="w-14 h-14 bg-ms-green rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">
              🌍
            </div>
            <h3 className="font-bold text-ms-dark text-lg">Découverte</h3>
            <p className="text-ms-gray text-sm mt-1">Bientôt disponible</p>
          </div>
        </div>
      </main>
    </div>
  );
}
