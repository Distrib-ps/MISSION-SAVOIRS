import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ms-cream overflow-hidden">
      {/* Header */}
      <header className="relative z-10 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ms-lavender rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
              M
            </div>
            <span className="text-xl font-bold text-ms-dark">
              Mission Savoirs
            </span>
          </div>
          <Link
            to="/login"
            className="px-5 py-2.5 bg-ms-lavender text-white font-semibold rounded-2xl hover:bg-ms-lavender/80 transition-all hover:shadow-md"
          >
            Se connecter
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 pt-12 pb-20">
        {/* Background blobs */}
        <div className="blob bg-ms-pink w-72 h-72 -top-10 -left-20" />
        <div className="blob blob-2 bg-ms-blue w-80 h-80 top-20 right-0" />
        <div className="blob blob-3 bg-ms-yellow w-64 h-64 bottom-0 left-1/3" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Decorative icons */}
          <div className="flex justify-center gap-4 mb-8">
            <span className="inline-block bg-ms-yellow-light text-3xl p-3 rounded-2xl shadow-sm rotate-[-6deg]">
              📚
            </span>
            <span className="inline-block bg-ms-pink-light text-3xl p-3 rounded-2xl shadow-sm rotate-[4deg]">
              🧩
            </span>
            <span className="inline-block bg-ms-blue-light text-3xl p-3 rounded-2xl shadow-sm rotate-[-3deg]">
              🌟
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-ms-dark leading-tight mb-6">
            Apprendre en s'amusant,{" "}
            <span className="text-ms-lavender">c'est possible !</span>
          </h1>

          <p className="text-lg md:text-xl text-ms-gray max-w-2xl mx-auto mb-10 leading-relaxed">
            Des quiz amusants et personnalisés pour progresser à ton rythme, du CP au CM2.
            Réponds aux questions, débloque des niveaux et deviens un champion du savoir !
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="px-8 py-4 bg-ms-lavender text-white font-bold text-lg rounded-2xl hover:bg-ms-lavender/85 transition-all hover:shadow-lg hover:-translate-y-0.5 shadow-md"
            >
              Commencer l'aventure
            </Link>
            <a
              href="#fonctionnement"
              className="px-8 py-4 bg-white text-ms-dark font-bold text-lg rounded-2xl border-2 border-ms-light-gray hover:border-ms-lavender hover:text-ms-lavender transition-all"
            >
              Comment ça marche ?
            </a>
          </div>
        </div>
      </section>

      {/* Wave divider */}
      <div className="wave-divider">
        <svg viewBox="0 0 1200 60" preserveAspectRatio="none">
          <path
            d="M0,30 C200,60 400,0 600,30 C800,60 1000,0 1200,30 L1200,60 L0,60 Z"
            fill="white"
          />
        </svg>
      </div>

      {/* Features */}
      <section id="fonctionnement" className="bg-white px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-ms-dark mb-4">
            Comment ça marche ?
          </h2>
          <p className="text-center text-ms-gray mb-12 max-w-xl mx-auto">
            Un parcours simple en 3 étapes pour apprendre sans se prendre la tête.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-ms-blue-light rounded-3xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-ms-blue rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-sm">
                🎯
              </div>
              <h3 className="text-xl font-bold text-ms-dark mb-3">
                Choisis ton thème
              </h3>
              <p className="text-ms-gray leading-relaxed">
                Maths, français, découverte du monde... Choisis ce que tu veux réviser aujourd'hui !
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-ms-pink-light rounded-3xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-ms-pink rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-sm">
                💡
              </div>
              <h3 className="text-xl font-bold text-ms-dark mb-3">
                Réponds aux quiz
              </h3>
              <p className="text-ms-gray leading-relaxed">
                Des questions adaptées à ton niveau. Tu te trompes ? Pas grave, on t'aide avec des indices !
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-ms-green-light rounded-3xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-ms-green rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-sm">
                🏆
              </div>
              <h3 className="text-xl font-bold text-ms-dark mb-3">
                Progresse et débloque
              </h3>
              <p className="text-ms-gray leading-relaxed">
                Gagne des points, débloque de nouveaux niveaux et regarde ta progression grandir !
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats / trust */}
      <section className="bg-white px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-ms-lavender-light rounded-3xl p-10 flex flex-col md:flex-row items-center justify-around gap-8">
            <div className="text-center">
              <div className="text-4xl font-extrabold text-ms-lavender">CP → CM2</div>
              <div className="text-ms-gray mt-1">Tous les niveaux</div>
            </div>
            <div className="w-px h-12 bg-ms-lavender/30 hidden md:block" />
            <div className="text-center">
              <div className="text-4xl font-extrabold text-ms-lavender">Adapté</div>
              <div className="text-ms-gray mt-1">À chaque élève</div>
            </div>
            <div className="w-px h-12 bg-ms-lavender/30 hidden md:block" />
            <div className="text-center">
              <div className="text-4xl font-extrabold text-ms-lavender">Ludique</div>
              <div className="text-ms-gray mt-1">Apprendre en jouant</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative px-6 py-16 overflow-hidden">
        <div className="blob bg-ms-peach w-64 h-64 -top-10 right-10" />
        <div className="blob blob-2 bg-ms-green w-56 h-56 bottom-0 left-10" />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-ms-dark mb-4">
            Prêt à relever le défi ?
          </h2>
          <p className="text-ms-gray text-lg mb-8">
            Connecte-toi avec l'identifiant donné par ton enseignant et&nbsp;commence&nbsp;à&nbsp;apprendre&nbsp;!
          </p>
          <Link
            to="/login"
            className="inline-block px-8 py-4 bg-ms-lavender text-white font-bold text-lg rounded-2xl hover:bg-ms-lavender/85 transition-all hover:shadow-lg hover:-translate-y-0.5 shadow-md"
          >
            Se connecter
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white px-6 py-6 border-t border-ms-light-gray">
        <div className="max-w-5xl mx-auto text-center text-ms-gray text-sm">
          Mission Savoirs — Plateforme pédagogique pour les élèves du primaire
        </div>
      </footer>
    </div>
  );
}
