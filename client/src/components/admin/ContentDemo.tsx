import { useState } from "react";
import DemoStage, { Spot, type DemoScene } from "./DemoStage";

/* ------------------------------------------------------------------ */
/*  Icônes & briques identiques à ContentPage (rendu fidèle)           */
/* ------------------------------------------------------------------ */

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}
function DeleteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

/** Colonne de flèches monter/descendre (statique, comme à l'écran). */
function Arrows() {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="p-1 rounded text-ms-light-gray">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </span>
      <span className="p-1 rounded text-ms-gray">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </div>
  );
}

function AddButton({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2 px-5 py-2.5 bg-ms-lavender text-white font-semibold text-sm rounded-xl shadow-sm">
      <PlusIcon />
      {label}
    </span>
  );
}

function RowActions({ share = false }: { share?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {share && (
        <span className="p-2 text-ms-gray">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </span>
      )}
      <span className="p-2 text-ms-gray"><EditIcon /></span>
      <span className="p-2 text-ms-gray"><DeleteIcon /></span>
    </div>
  );
}

/** Carte de liste (thème/sous-thème/quiz), markup identique à ContentPage. */
function Card({
  title,
  desc,
  badge,
  badgeBg,
  privateBadge = false,
  share = false,
}: {
  title: string;
  desc?: string;
  badge: string;
  badgeBg: string;
  privateBadge?: boolean;
  share?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-ms-light-gray/50 p-5">
      <div className="flex items-center gap-4">
        <Arrows />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-ms-dark flex items-center gap-2">
            <span className="truncate">{title}</span>
            {privateBadge && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-ms-lavender-light text-ms-lavender whitespace-nowrap">
                🔒 Privé
              </span>
            )}
          </h3>
          {desc && <p className="text-sm text-ms-gray mt-0.5 truncate">{desc}</p>}
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${badgeBg} text-ms-dark whitespace-nowrap`}>
          {badge}
        </span>
        <RowActions share={share} />
      </div>
    </div>
  );
}

function ModalField({ label, value, spot = false }: { label: string; value: string; spot?: boolean }) {
  const node = (
    <div>
      <label className="block text-sm font-semibold text-ms-dark mb-1">{label}</label>
      <div className="w-full px-4 py-2.5 border border-ms-light-gray rounded-xl text-sm text-ms-dark">
        {value}
      </div>
    </div>
  );
  return spot ? <Spot>{node}</Spot> : node;
}

function ModalActions() {
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      <span className="px-5 py-2.5 text-sm font-semibold bg-white border border-ms-light-gray text-ms-dark rounded-xl">Annuler</span>
      <span className="px-5 py-2.5 text-sm font-semibold bg-ms-lavender text-white rounded-xl">Enregistrer</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Scènes (données en dur) — rendu 100 % fidèle aux écrans réels      */
/* ------------------------------------------------------------------ */

const SCENES: DemoScene[] = [
  {
    caption: <>On commence par créer un <strong>thème</strong> (une grande matière). Cliquez sur <strong>Ajouter un thème</strong>.</>,
    screen: (
      <>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-ms-dark">Gestion des contenus</h1>
            <p className="text-ms-gray mt-1">Organisez vos themes, sous-themes, quiz et questions.</p>
          </div>
          <Spot><AddButton label="Ajouter un theme" /></Spot>
        </div>
        <div className="space-y-3">
          <Card title="Histoire" desc="De la Préhistoire à nos jours" badge="2 sous-themes" badgeBg="bg-ms-blue-light" />
          <Card title="Mathématiques" desc="Nombres et calcul" badge="3 sous-themes" badgeBg="bg-ms-blue-light" />
        </div>
      </>
    ),
  },
  {
    caption: <>Donnez un <strong>nom</strong> au thème (et un emoji si vous voulez), puis enregistrez.</>,
    screen: (
      <div className="max-w-md mx-auto">
        <h3 className="text-lg font-extrabold text-ms-dark mb-4">Nouveau thème</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-ms-dark mb-2">Icône</label>
            <div className="flex flex-wrap gap-2">
              {["📚", "🔢", "🌍", "🎨", "🔬", "🎵"].map((e, n) => (
                <span
                  key={e}
                  className={`w-10 h-10 text-xl rounded-xl flex items-center justify-center ${
                    n === 0 ? "bg-ms-lavender-light border-2 border-ms-lavender" : "bg-ms-cream border border-ms-light-gray"
                  }`}
                >
                  {e}
                </span>
              ))}
            </div>
          </div>
          <ModalField label="Nom du thème *" value="Histoire" spot />
          <div>
            <label className="block text-sm font-semibold text-ms-dark mb-1">Description</label>
            <div className="w-full px-4 py-2.5 border border-ms-light-gray rounded-xl text-sm text-ms-gray">De la Préhistoire à nos jours</div>
          </div>
          <ModalActions />
        </div>
      </div>
    ),
  },
  {
    caption: <>Vous êtes dans le thème. Créez un <strong>sous-thème</strong> (un chapitre).</>,
    screen: (
      <>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-ms-dark">Sous-themes de « Histoire »</h2>
          <Spot><AddButton label="Ajouter un sous-theme" /></Spot>
        </div>
        <div className="space-y-3">
          <Card title="La Préhistoire" desc="Les premiers hommes" badge="2 quizs" badgeBg="bg-ms-green-light" />
          <Card title="L'Antiquité" badge="1 quiz" badgeBg="bg-ms-green-light" />
        </div>
      </>
    ),
  },
  {
    caption: <>Dans le sous-thème, créez un <strong>quiz</strong>.</>,
    screen: (
      <>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-ms-dark">Quiz de « La Préhistoire »</h2>
          <Spot><AddButton label="Ajouter un quiz" /></Spot>
        </div>
        <div className="space-y-3">
          <Card title="Les premiers hommes" badge="5 questions" badgeBg="bg-ms-peach-light" share />
          <Card title="Le feu et les outils" badge="4 questions" badgeBg="bg-ms-peach-light" privateBadge share />
        </div>
      </>
    ),
  },
  {
    caption: <>Choisissez la <strong>visibilité</strong> : <strong>Public</strong> (tous les élèves) ou <strong>Privé</strong> (seulement vos classes).</>,
    screen: (
      <div className="max-w-md mx-auto">
        <h3 className="text-lg font-extrabold text-ms-dark mb-4">Nouveau quiz</h3>
        <div className="space-y-4">
          <ModalField label="Titre du quiz *" value="Les premiers hommes" />
          <div data-demo="visibility">
            <label className="block text-sm font-semibold text-ms-dark mb-1">Visibilité</label>
            <Spot>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-left px-4 py-2.5 rounded-xl border bg-ms-lavender text-white border-ms-lavender block">
                  <span className="block text-sm font-semibold">Public</span>
                  <span className="block text-xs text-white/80">Tous les élèves</span>
                </span>
                <span className="text-left px-4 py-2.5 rounded-xl border bg-white text-ms-dark border-ms-light-gray block">
                  <span className="block text-sm font-semibold">Privé</span>
                  <span className="block text-xs text-ms-gray">Seulement mes élèves</span>
                </span>
              </div>
            </Spot>
            <p className="text-xs text-ms-gray mt-1">« Privé » : visible uniquement par les élèves de vos classes/groupes.</p>
          </div>
          <ModalActions />
        </div>
      </div>
    ),
  },
  {
    caption: <>Ouvrez le quiz, puis ajoutez vos <strong>questions</strong>.</>,
    screen: (
      <>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-ms-dark">Questions de « Les premiers hommes »</h2>
          <Spot><AddButton label="Ajouter une question" /></Spot>
        </div>
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-ms-light-gray/50 p-5">
            <div className="flex items-center gap-4">
              <Arrows />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ms-dark truncate">Quel outil utilisaient les premiers hommes ?</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-ms-blue-light text-ms-dark">QCM</span>
              <span className="text-xs text-ms-gray whitespace-nowrap">3 reponses</span>
              <RowActions />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-ms-light-gray/50 p-5">
            <div className="flex items-center gap-4">
              <Arrows />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ms-dark truncate">Dessine une grotte préhistorique</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-ms-lavender-light text-ms-dark">DESSIN</span>
              <RowActions />
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    caption: <>Choisissez le <strong>type</strong> de question, puis renseignez l'énoncé, les réponses, et (au choix) un indice et une solution.</>,
    screen: (
      <div className="max-w-lg mx-auto">
        <h3 className="text-lg font-extrabold text-ms-dark mb-4">Nouvelle question</h3>
        <div className="space-y-4">
          <Spot>
            <div>
              <label className="block text-sm font-semibold text-ms-dark mb-2">Type de question</label>
              <div className="grid grid-cols-3 gap-2">
                <span className="px-3 py-2.5 rounded-xl text-sm font-semibold border bg-ms-blue-light border-ms-blue text-ms-dark text-center">QCM</span>
                <span className="px-3 py-2.5 rounded-xl text-sm font-semibold border bg-white border-ms-light-gray text-ms-gray text-center">Texte</span>
                <span className="px-3 py-2.5 rounded-xl text-sm font-semibold border bg-white border-ms-light-gray text-ms-gray text-center">Drag & Drop</span>
                <span className="px-3 py-2.5 rounded-xl text-sm font-semibold border bg-white border-ms-light-gray text-ms-gray text-center">Association</span>
                <span className="px-3 py-2.5 rounded-xl text-sm font-semibold border bg-white border-ms-light-gray text-ms-gray text-center">Classement</span>
                <span className="px-3 py-2.5 rounded-xl text-sm font-semibold border bg-white border-ms-light-gray text-ms-gray text-center">Dessin</span>
              </div>
            </div>
          </Spot>
          <div>
            <label className="block text-sm font-semibold text-ms-dark mb-1">Enonce *</label>
            <div className="w-full px-4 py-2.5 border border-ms-light-gray rounded-xl text-sm text-ms-dark">Quel outil utilisaient les premiers hommes ?</div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ms-dark mb-1">Indice</label>
            <div className="w-full px-4 py-2.5 border border-ms-light-gray rounded-xl text-sm text-ms-gray">Il est en pierre taillée…</div>
          </div>
          <ModalActions />
        </div>
      </div>
    ),
  },
  {
    caption: <>🎉 <strong>C'est tout !</strong> Côté élève, les quiz se débloquent au fur et à mesure (≈ 70 % de réussite). L'icône 🔗 sur un quiz permet aussi de le partager à un collègue.</>,
    screen: (
      <div className="text-center py-10">
        <div className="text-5xl mb-3">🎓</div>
        <p className="font-bold text-ms-dark text-lg">Vous savez créer tout votre contenu !</p>
        <p className="text-sm text-ms-gray mt-1">Thème → Sous-thème → Quiz → Questions</p>
      </div>
    ),
  },
];

export default function ContentDemo() {
  const [active, setActive] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setActive(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-ms-lavender border border-ms-lavender/40 rounded-xl hover:bg-ms-lavender-light/50 transition shrink-0"
        title="Voir comment créer du contenu"
      >
        ▶ Démo
      </button>
      <DemoStage title="Créer du contenu — pas à pas" scenes={SCENES} active={active} onClose={() => setActive(false)} />
    </>
  );
}
