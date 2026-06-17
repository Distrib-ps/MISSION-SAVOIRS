import { useState } from "react";
import DemoStage, { Spot, type DemoScene } from "./DemoStage";

/* ------------------------------------------------------------------ */
/*  Briques identiques à ClassesPage (rendu fidèle)                    */
/* ------------------------------------------------------------------ */

/** Bouton « + Créer une classe / un groupe », markup identique à ClassesPage. */
function CreateButton() {
  return (
    <span className="bg-ms-lavender text-white font-semibold px-4 py-2 rounded-xl shrink-0 inline-block">
      + Créer une classe / un groupe
    </span>
  );
}

/** Carte de classe/groupe, markup identique à ClassesPage. */
function ClassCard({
  level,
  name,
  students,
  owner,
}: {
  level: string;
  name: string;
  students: number;
  owner: string;
}) {
  return (
    <div className="bg-white border border-ms-light-gray rounded-2xl p-4 flex items-center gap-4">
      <span className="bg-ms-blue-light text-ms-dark text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
        {level}
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-ms-dark truncate">{name}</h3>
        <p className="text-sm text-ms-gray">
          {students} élève{students > 1 ? "s" : ""}
          {" · "}
          Propriétaire : {owner}
        </p>
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

/* ------------------------------------------------------------------ */
/*  Scènes (données en dur) — rendu 100 % fidèle aux écrans réels      */
/* ------------------------------------------------------------------ */

const SCENES: DemoScene[] = [
  {
    caption: (
      <>
        Voici la liste de vos <strong>classes &amp; groupes</strong>. Pour en ajouter, cliquez sur{" "}
        <strong>+ Créer une classe / un groupe</strong>.
      </>
    ),
    screen: (
      <>
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-ms-dark">Classes &amp; groupes</h1>
            <p className="text-ms-gray">Regroupez les élèves par classe ou groupe et ciblez le contenu.</p>
          </div>
          <Spot><CreateButton /></Spot>
        </div>
        <div className="space-y-3">
          <ClassCard level="CE2" name="CE2-2" students={22} owner="Sabrina Letellier" />
          <ClassCard level="CM1" name="Groupe lecture" students={6} owner="Sabrina Letellier" />
        </div>
      </>
    ),
  },
  {
    caption: (
      <>
        Donnez un <strong>nom</strong> (ex. « CE2-2 » ou « Groupe 1 ») et choisissez un{" "}
        <strong>niveau</strong>, puis enregistrez.
      </>
    ),
    screen: (
      <div className="bg-white border border-ms-light-gray rounded-2xl p-5">
        <h2 className="text-lg font-bold text-ms-dark mb-4">Nouvelle classe / groupe</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase text-ms-gray mb-1">Nom</label>
            <Spot>
              <div className="w-full px-3 py-2 border border-ms-light-gray rounded-lg text-ms-gray">
                CE2-2 ou Groupe 1
              </div>
            </Spot>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-ms-gray mb-1">Niveau</label>
            <div className="w-full px-3 py-2 border border-ms-light-gray rounded-lg bg-white text-ms-dark">
              CE2
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <span className="bg-ms-lavender text-white font-semibold px-5 py-2 rounded-xl inline-block">
            Enregistrer
          </span>
          <span className="border border-ms-light-gray text-ms-dark font-semibold px-5 py-2 rounded-xl inline-block">
            Annuler
          </span>
        </div>
      </div>
    ),
  },
  {
    caption: (
      <>
        Un même élève peut appartenir à <strong>plusieurs groupes</strong> (sa classe + un groupe de
        besoin, par ex.). Le rattachement se fait depuis la fiche de l'élève (menu Élèves).
      </>
    ),
    screen: (
      <>
        <h2 className="text-lg font-bold text-ms-dark mb-4">Léa Martin appartient à…</h2>
        <div className="space-y-3">
          <ClassCard level="CE2" name="CE2-2" students={22} owner="Sabrina Letellier" />
          <ClassCard level="CM1" name="Groupe lecture" students={6} owner="Sabrina Letellier" />
        </div>
        <p className="text-sm text-ms-gray mt-4">
          Un quiz <strong>« Privé »</strong> n'est visible que par les élèves de vos classes/groupes :
          pratique pour <strong>cibler</strong> et différencier le contenu.
        </p>
      </>
    ),
  },
  {
    caption: (
      <>
        🎉 <strong>C'est tout !</strong> Créez vos classes et groupes, rattachez vos élèves, puis
        ciblez vos quiz privés selon les groupes.
      </>
    ),
    screen: (
      <div className="text-center py-10">
        <div className="text-5xl mb-3">🏫</div>
        <p className="font-bold text-ms-dark text-lg">Vous savez organiser vos élèves !</p>
        <p className="text-sm text-ms-gray mt-1">Classe / groupe → Élèves → Quiz ciblés</p>
      </div>
    ),
  },
];

export default function ClassesDemo() {
  const [active, setActive] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setActive(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-ms-lavender border border-ms-lavender/40 rounded-xl hover:bg-ms-lavender-light/50 transition shrink-0"
        title="Voir comment organiser vos classes et groupes"
      >
        ▶ Démo
      </button>
      <DemoStage title="Classes & groupes — pas à pas" scenes={SCENES} active={active} onClose={() => setActive(false)} />
    </>
  );
}
