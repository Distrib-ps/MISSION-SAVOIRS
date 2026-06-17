import { useState } from "react";
import DemoStage, { Spot, type DemoScene } from "./DemoStage";

/* ------------------------------------------------------------------ */
/*  Briques fidèles à RevisionsPage (rendu statique, données en dur)   */
/* ------------------------------------------------------------------ */

/** Carte de révision, markup identique à la liste de RevisionsPage. */
function RevisionCard({
  level,
  name,
  detail,
}: {
  level: string;
  name: string;
  detail: string;
}) {
  return (
    <div className="bg-white border border-ms-light-gray rounded-2xl p-4 flex items-center gap-4">
      <span className="bg-ms-lavender text-white text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
        {level}
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-ms-dark truncate">{name}</h3>
        <p className="text-sm text-ms-gray truncate">{detail}</p>
      </div>
      <span className="px-3 py-1.5 text-sm font-semibold text-ms-lavender rounded-lg shrink-0">
        Modifier
      </span>
      <span className="px-3 py-1.5 text-sm font-semibold text-ms-pink rounded-lg shrink-0">
        Supprimer
      </span>
    </div>
  );
}

/** Ligne de question piochable, style proche du QuestionTreePicker. */
function PickRow({
  label,
  quiz,
  checked,
}: {
  label: string;
  quiz: string;
  checked: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 border border-ms-light-gray rounded-lg">
      <span
        className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
          checked
            ? "bg-ms-lavender text-white"
            : "bg-white border border-ms-light-gray text-transparent"
        }`}
      >
        ✓
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ms-dark truncate">{label}</p>
        <p className="text-xs text-ms-gray truncate">{quiz}</p>
      </div>
    </div>
  );
}

function SaveActions() {
  return (
    <div className="flex gap-3 mt-4">
      <span className="bg-ms-lavender text-white font-semibold px-5 py-2 rounded-xl">
        Enregistrer
      </span>
      <span className="border border-ms-light-gray text-ms-dark font-semibold px-5 py-2 rounded-xl">
        Annuler
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Scènes (données en dur) — rendu 100 % fidèle à RevisionsPage       */
/* ------------------------------------------------------------------ */

const SCENES: DemoScene[] = [
  {
    caption: (
      <>
        Une <strong>révision</strong> regroupe des questions piochées dans
        plusieurs quiz, ciblées par niveau. Cliquez sur{" "}
        <strong>+ Créer une révision</strong>.
      </>
    ),
    screen: (
      <>
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-ms-dark">Révisions par niveau</h1>
            <p className="text-ms-gray">
              Des parcours de révision mixant des questions piochées dans plusieurs quiz, ciblés par niveau.
            </p>
          </div>
          <Spot>
            <span className="bg-ms-lavender text-white font-semibold px-4 py-2 rounded-xl shrink-0 inline-block">
              + Créer une révision
            </span>
          </Spot>
        </div>
        <div className="space-y-3">
          <RevisionCard
            level="CM1"
            name="Révision Préhistoire"
            detail="8 questions · Avant l'évaluation · jusqu'au 27/06/2026"
          />
          <RevisionCard
            level="CE2"
            name="Révision de la semaine"
            detail="5 questions · Un peu de maths, un peu de français..."
          />
        </div>
      </>
    ),
  },
  {
    caption: (
      <>
        Donnez un <strong>nom</strong> à la révision, choisissez le{" "}
        <strong>niveau cible</strong> et (au choix) une <strong>date de fin</strong>.
      </>
    ),
    screen: (
      <div>
        <h2 className="text-lg font-bold text-ms-dark mb-4">Nouvelle révision</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase text-ms-gray mb-1">Nom</label>
            <div className="w-full px-3 py-2 border border-ms-light-gray rounded-lg text-sm text-ms-dark">
              Révision Préhistoire
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-ms-gray mb-1">Niveau cible</label>
            <Spot>
              <div className="w-full px-3 py-2 border border-ms-light-gray rounded-lg bg-white text-sm text-ms-dark">
                CM1
              </div>
            </Spot>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase text-ms-gray mb-1">Description (optionnelle)</label>
            <div className="w-full px-3 py-2 border border-ms-light-gray rounded-lg text-sm text-ms-gray">
              Avant l'évaluation
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-ms-gray mb-1">Date de fin (optionnelle)</label>
            <Spot>
              <div className="w-full px-3 py-2 border border-ms-light-gray rounded-lg bg-white text-sm text-ms-dark">
                27/06/2026
              </div>
            </Spot>
          </div>
        </div>
      </div>
    ),
  },
  {
    caption: (
      <>
        Sélectionnez les <strong>questions à inclure</strong>. Vous pouvez piocher
        dans différents quiz.
      </>
    ),
    screen: (
      <div>
        <h2 className="text-lg font-bold text-ms-dark mb-4">Nouvelle révision</h2>
        <label className="block text-xs font-bold uppercase text-ms-gray mb-2">Questions</label>
        <Spot>
          <div className="space-y-2">
            <PickRow label="Quel outil utilisaient les premiers hommes ?" quiz="Histoire · Les premiers hommes" checked />
            <PickRow label="À quoi servait le feu à la Préhistoire ?" quiz="Histoire · Le feu et les outils" checked />
            <PickRow label="Combien font 7 × 8 ?" quiz="Mathématiques · Les tables" checked />
            <PickRow label="Quel est le pluriel de « cheval » ?" quiz="Français · Le pluriel" checked />
            <PickRow label="Que mangeaient les hommes préhistoriques ?" quiz="Histoire · Les premiers hommes" checked={false} />
          </div>
        </Spot>
        <p className="text-xs text-ms-gray mt-2">8 questions sélectionnées dans 3 quiz différents.</p>
        <SaveActions />
      </div>
    ),
  },
  {
    caption: (
      <>
        🎉 <strong>C'est tout !</strong> Tous les élèves du niveau ciblé verront la
        révision dans leur espace, sans action de votre part.
      </>
    ),
    screen: (
      <div className="text-center py-10">
        <div className="text-5xl mb-3">🔁</div>
        <p className="font-bold text-ms-dark text-lg">« Révision Préhistoire » est en ligne !</p>
        <p className="text-sm text-ms-gray mt-1">
          Tous les élèves de <strong>CM1</strong> la verront dans leur espace.
        </p>
        <p className="text-sm text-ms-gray mt-1">
          La date de fin la retirera automatiquement le moment venu.
        </p>
      </div>
    ),
  },
];

export default function RevisionsDemo() {
  const [active, setActive] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setActive(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-ms-lavender border border-ms-lavender/40 rounded-xl hover:bg-ms-lavender-light/50 transition shrink-0"
        title="Voir comment créer une révision"
      >
        ▶ Démo
      </button>
      <DemoStage title="Révisions — pas à pas" scenes={SCENES} active={active} onClose={() => setActive(false)} />
    </>
  );
}
