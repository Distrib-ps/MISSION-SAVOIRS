import { useAuth } from "../contexts/AuthContext";

export default function AdminDashboard() {
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
            <span className="text-sm text-ms-gray font-medium">
              {user?.firstName} {user?.lastName}
            </span>
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
        <h1 className="text-3xl font-extrabold text-ms-dark mb-2">
          Tableau de bord
        </h1>
        <p className="text-ms-gray mb-8">
          Gérez vos élèves et vos contenus pédagogiques.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-ms-light-gray/50 p-8 hover:shadow-md transition-shadow cursor-pointer">
            <div className="w-14 h-14 bg-ms-blue-light rounded-2xl flex items-center justify-center text-2xl mb-4">
              👩‍🎓
            </div>
            <h3 className="text-xl font-bold text-ms-dark mb-2">
              Gestion des élèves
            </h3>
            <p className="text-ms-gray">
              Ajouter, modifier et gérer les comptes élèves.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-ms-light-gray/50 p-8 hover:shadow-md transition-shadow cursor-pointer">
            <div className="w-14 h-14 bg-ms-peach-light rounded-2xl flex items-center justify-center text-2xl mb-4">
              📝
            </div>
            <h3 className="text-xl font-bold text-ms-dark mb-2">
              Gestion des contenus
            </h3>
            <p className="text-ms-gray">
              Créer et organiser vos thèmes, quiz et questions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
