import { useState } from "react";
import DemoStage, { Spot, type DemoScene } from "./DemoStage";

/* ------------------------------------------------------------------ */
/*  Placeholder de dessin (SVG inline, aucune image réseau)            */
/* ------------------------------------------------------------------ */

/** Faux dessin d'élève : un triangle gribouillé, 100 % inline. */
function DrawingPlaceholder() {
  return (
    <svg
      viewBox="0 0 200 160"
      className="max-h-56 object-contain rounded-lg bg-white w-full"
      role="img"
      aria-label="Dessin de l'élève"
    >
      <rect x="0" y="0" width="200" height="160" fill="#ffffff" />
      <polygon
        points="100,30 160,125 40,125"
        fill="none"
        stroke="#5b4fc4"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M55 140 q45 12 90 0"
        fill="none"
        stroke="#9b94e0"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Carte de dessin en attente — markup identique à DrawingsPage       */
/* ------------------------------------------------------------------ */

function DrawingCard({
  questionText,
  quizTitle,
  student,
  spotActions = false,
}: {
  questionText: string;
  quizTitle: string;
  student: string;
  spotActions?: boolean;
}) {
  const actions = (
    <div className="flex gap-2">
      <span className="flex-1 bg-ms-green text-white font-semibold py-2 rounded-xl text-center block">
        Valider
      </span>
      <span className="flex-1 bg-ms-pink text-white font-semibold py-2 rounded-xl text-center block">
        Refuser
      </span>
    </div>
  );
  return (
    <div className="bg-white border border-ms-light-gray rounded-2xl p-4">
      <div className="mb-2">
        <p className="font-bold text-ms-dark">{questionText}</p>
        <p className="text-xs text-ms-gray">
          {quizTitle} · par {student}
        </p>
      </div>
      <div className="bg-ms-cream rounded-xl p-2 flex justify-center mb-3">
        <DrawingPlaceholder />
      </div>
      {spotActions ? <Spot>{actions}</Spot> : actions}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Scènes (données en dur) — rendu fidèle à l'écran réel              */
/* ------------------------------------------------------------------ */

const SCENES: DemoScene[] = [
  {
    caption: (
      <>
        Quand un élève répond à une question « Dessin », sa réponse arrive ici. Regardez le dessin,
        puis <strong>✅ Valider</strong> (réponse comptée juste) ou <strong>❌ Refuser</strong>{" "}
        (l'élève pourra retenter).
      </>
    ),
    screen: (
      <>
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-ms-dark">Dessins à valider</h1>
          <p className="text-ms-gray">
            Les dessins rendus par les élèves sur vos questions, en attente de validation.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <DrawingCard
            questionText="Dessine un triangle"
            quizTitle="Les formes géométriques"
            student="Lucas Bernard"
            spotActions
          />
          <DrawingCard
            questionText="Dessine une maison"
            quizTitle="Le dessin libre"
            student="Emma Petit"
          />
        </div>
      </>
    ),
  },
  {
    caption: (
      <>
        Le chiffre <strong>rouge</strong> à côté de « Dessins à valider » dans le menu indique le
        nombre de dessins en attente. Dès la validation/refus, l'image est{" "}
        <strong>supprimée</strong> (on ne garde que le résultat) — pensez à corriger assez vite.
        Vous ne voyez que les dessins liés à vos questions.
      </>
    ),
    screen: (
      <div className="max-w-sm mx-auto">
        <p className="text-sm font-semibold text-ms-dark mb-3">Menu d'administration</p>
        <nav className="space-y-1">
          <span className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-ms-gray">
            <span>📚</span> Contenus
          </span>
          <span className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-ms-gray">
            <span>👥</span> Élèves
          </span>
          <Spot>
            <span className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold bg-ms-lavender-light text-ms-lavender">
              <span className="flex items-center gap-3">
                <span>🎨</span> Dessins à valider
              </span>
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold bg-ms-pink text-white">
                2
              </span>
            </span>
          </Spot>
        </nav>
        <div className="bg-ms-cream/60 rounded-xl px-4 py-3 mt-4 text-sm text-ms-dark">
          🔒 Vie privée : après votre décision, le dessin est purgé. Seul « juste / à retenter »
          est conservé.
        </div>
      </div>
    ),
  },
  {
    caption: (
      <>
        🎉 <strong>C'est tout !</strong> Validez ou refusez les dessins de vos élèves, gardez un œil
        sur le badge rouge du menu, et corrigez régulièrement pour respecter leur vie privée.
      </>
    ),
    screen: (
      <div className="text-center py-10">
        <div className="text-5xl mb-3">🖼️</div>
        <p className="font-bold text-ms-dark text-lg">Vous savez valider les dessins !</p>
        <p className="text-sm text-ms-gray mt-1">Regarder → Valider ou Refuser → Image purgée</p>
      </div>
    ),
  },
];

export function DrawingsDemo() {
  const [active, setActive] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setActive(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-ms-lavender border border-ms-lavender/40 rounded-xl hover:bg-ms-lavender-light/50 transition shrink-0"
        title="Voir comment valider les dessins"
      >
        ▶ Démo
      </button>
      <DemoStage
        title="Valider les dessins — pas à pas"
        scenes={SCENES}
        active={active}
        onClose={() => setActive(false)}
      />
    </>
  );
}
