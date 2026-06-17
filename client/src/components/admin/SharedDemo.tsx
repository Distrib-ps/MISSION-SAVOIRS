import { useState } from "react";
import DemoStage, { Spot, type DemoScene } from "./DemoStage";

/* ------------------------------------------------------------------ */
/*  Briques fidèles à SharedWithMePage / ContentPage (données en dur)  */
/* ------------------------------------------------------------------ */

/** Carte de quiz partagé, markup identique à SharedWithMePage. */
function SharedCard({
  title,
  emoji,
  theme,
  subTheme,
  questions,
  owner,
}: {
  title: string;
  emoji: string;
  theme: string;
  subTheme: string;
  questions: number;
  owner: string;
}) {
  return (
    <div className="bg-white border border-ms-light-gray rounded-2xl p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-ms-dark truncate">{title}</h3>
        <p className="text-sm text-ms-gray truncate">
          {emoji} {theme} &gt; {subTheme} · {questions} question{questions > 1 ? "s" : ""} · par {owner}
        </p>
      </div>
      <span className="px-3 py-1.5 text-sm font-semibold text-ms-lavender rounded-lg shrink-0">Voir</span>
      <span className="px-3 py-1.5 text-sm font-semibold text-ms-blue rounded-lg shrink-0">Stats</span>
    </div>
  );
}

/** Icône de partage 🔗, identique à ContentPage. */
function ShareIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Scènes (données en dur) — rendu 100 % fidèle aux écrans réels      */
/* ------------------------------------------------------------------ */

const SCENES: DemoScene[] = [
  {
    caption: (
      <>
        Vous trouvez ici les quiz qu'un <strong>collègue</strong> a choisi de vous partager. Cliquez sur{" "}
        <strong>Voir</strong> pour consulter un quiz.
      </>
    ),
    screen: (
      <>
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-ms-dark">Partagés avec moi</h1>
          <p className="text-ms-gray">Quiz que d'autres professeurs vous ont partagés (lecture seule).</p>
        </div>
        <div className="space-y-3">
          <Spot>
            <SharedCard
              title="Les volcans"
              emoji="🌍"
              theme="Géographie"
              subTheme="Les paysages"
              questions={6}
              owner="Michel Prof"
            />
          </Spot>
          <SharedCard
            title="Les fractions"
            emoji="🔢"
            theme="Mathématiques"
            subTheme="Nombres et calcul"
            questions={8}
            owner="Sophie Martin"
          />
        </div>
      </>
    ),
  },
  {
    caption: (
      <>
        Vous pouvez <strong>utiliser</strong> ces quiz et consulter leurs <strong>statistiques</strong>, mais pas les
        modifier : ils appartiennent à leur auteur. Le badge <em>« lecture seule »</em> le rappelle.
      </>
    ),
    screen: (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-lg font-extrabold text-ms-dark">Les volcans</h2>
          <Spot>
            <span className="text-xs bg-ms-cream px-2 py-0.5 rounded-full text-ms-gray shrink-0">lecture seule</span>
          </Spot>
        </div>
        <p className="text-sm text-ms-gray mb-4">🌍 Géographie &gt; Les paysages</p>
        <div className="space-y-3">
          <div className="border border-ms-light-gray rounded-xl p-3">
            <p className="font-semibold text-ms-dark">
              1. Qu'est-ce que la lave ? <span className="text-[10px] uppercase text-ms-gray">qcm</span>
            </p>
            <ul className="mt-2 space-y-1">
              <li className="text-sm text-ms-green font-semibold">✓ De la roche en fusion</li>
              <li className="text-sm text-ms-gray">• De l'eau bouillante</li>
              <li className="text-sm text-ms-gray">• De la fumée</li>
            </ul>
            <p className="text-xs text-ms-gray mt-2">💡 Indice : elle sort du cratère…</p>
          </div>
          <div className="border border-ms-light-gray rounded-xl p-3">
            <p className="font-semibold text-ms-dark">
              2. Comment s'appelle le sommet d'un volcan ? <span className="text-[10px] uppercase text-ms-gray">texte</span>
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    caption: (
      <>
        Pour partager <strong>l'un de vos quiz</strong> à un collègue, allez dans <strong>Contenus</strong> et cliquez
        sur l'icône de partage <strong>🔗</strong> sur le quiz, puis cochez les profs concernés.
      </>
    ),
    screen: (
      <>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-ms-dark">Quiz de « Les paysages »</h2>
          <span className="flex items-center gap-2 px-5 py-2.5 bg-ms-lavender text-white font-semibold text-sm rounded-xl shadow-sm">
            Ajouter un quiz
          </span>
        </div>
        <div className="bg-white rounded-2xl border border-ms-light-gray/50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-ms-dark truncate">Les volcans</h3>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-ms-peach-light text-ms-dark whitespace-nowrap">
              6 questions
            </span>
            <div className="flex items-center gap-1">
              <Spot>
                <span className="p-2 text-ms-blue block">
                  <ShareIcon />
                </span>
              </Spot>
              <span className="p-2 text-ms-gray">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 max-w-md mx-auto bg-white rounded-2xl border border-ms-light-gray p-6">
          <h2 className="text-lg font-extrabold text-ms-dark mb-1">Partager « Les volcans »</h2>
          <p className="text-sm text-ms-gray mb-4">
            Les profs cochés peuvent <strong>voir</strong> ce quiz et ses statistiques (lecture seule).
          </p>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-ms-blue-light">
              <input type="checkbox" checked readOnly className="w-4 h-4 rounded accent-ms-blue" />
              <span className="text-ms-dark">Michel Prof</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm">
              <input type="checkbox" readOnly className="w-4 h-4 rounded accent-ms-blue" />
              <span className="text-ms-dark">Sophie Martin</span>
            </label>
          </div>
        </div>
      </>
    ),
  },
];

export default function SharedDemo() {
  const [active, setActive] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setActive(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-ms-lavender border border-ms-lavender/40 rounded-xl hover:bg-ms-lavender-light/50 transition shrink-0"
        title="Voir comment fonctionnent les quiz partagés"
      >
        ▶ Démo
      </button>
      <DemoStage
        title="Partagés avec moi — pas à pas"
        scenes={SCENES}
        active={active}
        onClose={() => setActive(false)}
      />
    </>
  );
}
