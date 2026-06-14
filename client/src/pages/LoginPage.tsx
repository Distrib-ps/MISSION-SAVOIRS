import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const user = await login(username, password);
      if (user.role === "ADMIN" || user.role === "TEACHER") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-ms-cream flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="blob bg-ms-pink w-72 h-72 -top-20 -right-20" />
      <div className="blob blob-2 bg-ms-blue w-80 h-80 -bottom-20 -left-20" />
      <div className="blob blob-3 bg-ms-yellow w-56 h-56 top-1/2 right-1/4" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back to home */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-ms-gray hover:text-ms-lavender transition mb-8 font-medium"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Retour à l'accueil
        </Link>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-ms-lavender rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm">
            M
          </div>
          <span className="text-2xl font-bold text-ms-dark">
            Mission Savoirs
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-lg p-8 border border-ms-light-gray/50">
          <h2 className="text-2xl font-extrabold text-ms-dark mb-2">
            Content de te revoir !
          </h2>
          <p className="text-ms-gray mb-8">
            Entre ton identifiant pour commencer.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-bold text-ms-dark mb-2"
              >
                Identifiant
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex : MichelD"
                required
                autoFocus
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-ms-light-gray bg-ms-cream/50 focus:border-ms-lavender focus:bg-white focus:outline-none transition text-ms-dark placeholder-ms-gray/50 font-medium"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-bold text-ms-dark mb-2"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ton mot de passe"
                required
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-ms-light-gray bg-ms-cream/50 focus:border-ms-lavender focus:bg-white focus:outline-none transition text-ms-dark placeholder-ms-gray/50 font-medium"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-ms-pink-light border border-ms-pink text-ms-dark text-sm rounded-2xl px-4 py-3 text-center font-medium">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-ms-lavender hover:bg-ms-lavender/85 text-white font-bold text-lg rounded-2xl shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isSubmitting ? "Connexion..." : "C'est parti !"}
            </button>
          </form>
        </div>

        {/* Help text */}
        <p className="text-center text-ms-gray text-sm mt-6">
          Tu n'as pas d'identifiant ? Demande à ton enseignant !
        </p>
      </div>
    </div>
  );
}
