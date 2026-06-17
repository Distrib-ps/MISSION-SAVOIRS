import { useState } from "react";
import DemoStage, { Spot, type DemoScene } from "./DemoStage";

/* ------------------------------------------------------------------ */
/*  Briques identiques à UsersPage (rendu fidèle)                      */
/* ------------------------------------------------------------------ */

function LevelBadge({ level }: { level: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-ms-blue-light text-ms-dark">
      {level}
    </span>
  );
}

function ClassBadge({ name }: { name: string }) {
  return (
    <span className="text-xs text-ms-gray bg-ms-cream px-2 py-0.5 rounded-full">
      {name}
    </span>
  );
}

function RoleBadge() {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-ms-green-light text-ms-dark">
      Eleve
    </span>
  );
}

/** Trio d'icônes d'actions (export / parcours / modifier / supprimer), statique. */
function RowActions() {
  return (
    <div className="flex items-center justify-end gap-1">
      <span className="p-2 text-ms-gray">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </span>
      <span className="p-2 text-ms-gray">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </span>
      <span className="p-2 text-ms-gray">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </span>
      <span className="p-2 text-ms-gray">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </span>
    </div>
  );
}

/** Une ligne du tableau des élèves, markup identique à UsersPage. */
function StudentRow({
  username,
  firstName,
  lastName,
  level,
  classes = [],
  even = true,
}: {
  username: string;
  firstName: string;
  lastName: string;
  level: string;
  classes?: string[];
  even?: boolean;
}) {
  return (
    <tr className={`border-b border-ms-light-gray/50 ${even ? "bg-white" : "bg-ms-cream/40"}`}>
      <td className="pl-4 pr-2 py-3">
        <span className="inline-block w-4 h-4 rounded border border-ms-light-gray bg-white" />
      </td>
      <td className="px-3 py-3 font-mono text-ms-dark font-medium">{username}</td>
      <td className="px-3 py-3 text-ms-dark">{firstName}</td>
      <td className="px-3 py-3 text-ms-dark">{lastName}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <LevelBadge level={level} />
          {classes.map((c) => (
            <ClassBadge key={c} name={c} />
          ))}
        </div>
      </td>
      <td className="px-3 py-3">
        <RoleBadge />
      </td>
      <td className="px-3 py-3 text-right">
        <RowActions />
      </td>
    </tr>
  );
}

function ModalField({ label, value, spot = false }: { label: string; value: string; spot?: boolean }) {
  const node = (
    <div>
      <label className="block text-sm font-semibold text-ms-dark mb-1">{label}</label>
      <div className="w-full px-4 py-2.5 text-sm border border-ms-light-gray rounded-xl bg-ms-cream/50 text-ms-dark">
        {value}
      </div>
    </div>
  );
  return spot ? <Spot>{node}</Spot> : node;
}

/* ------------------------------------------------------------------ */
/*  Scènes (données en dur) — rendu 100 % fidèle aux écrans réels      */
/* ------------------------------------------------------------------ */

const SCENES: DemoScene[] = [
  {
    caption: (
      <>
        Voici la liste des <strong>élèves</strong>. Pour en retrouver un, tapez son nom ou son
        identifiant dans la <strong>barre de recherche</strong>. Les boutons en haut à droite
        servent à <strong>importer</strong> ou <strong>ajouter</strong> un élève.
      </>
    ),
    screen: (
      <>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-ms-dark">Gestion des utilisateurs</h1>
            <p className="text-ms-gray text-sm mt-1">3 utilisateurs au total</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-4 py-2.5 text-sm font-semibold bg-white border border-ms-light-gray text-ms-dark rounded-xl">
              Importer (Excel)
            </span>
            <span className="px-4 py-2.5 text-sm font-semibold bg-ms-lavender text-white rounded-xl shadow-sm">
              + Ajouter un utilisateur
            </span>
          </div>
        </div>

        <Spot>
          <div className="bg-white rounded-2xl border border-ms-light-gray/50 p-4 mb-6 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 px-4 py-2.5 text-sm border border-ms-light-gray rounded-xl bg-ms-cream/50 text-ms-gray/60">
              Rechercher par nom ou identifiant...
            </div>
            <div className="px-4 py-2.5 text-sm border border-ms-light-gray rounded-xl bg-white text-ms-dark">
              Tous les niveaux
            </div>
            <div className="px-4 py-2.5 text-sm border border-ms-light-gray rounded-xl bg-white text-ms-dark">
              Tous les roles
            </div>
          </div>
        </Spot>

        <div className="bg-white rounded-2xl border border-ms-light-gray/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ms-light-gray">
                  <th className="pl-4 pr-2 py-3 text-left">
                    <span className="inline-block w-4 h-4 rounded border border-ms-light-gray bg-white" />
                  </th>
                  {["Identifiant", "Prénom", "Nom", "Niveau", "Rôle"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left font-bold text-ms-gray uppercase text-xs tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-bold text-ms-gray uppercase text-xs tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <StudentRow username="lucasb" firstName="Lucas" lastName="Bernard" level="CM1" classes={["CM1-A", "Géo Sabrina"]} even />
                <StudentRow username="linad" firstName="Lina" lastName="Dupont" level="CE1" even={false} />
                <StudentRow username="adamm" firstName="Adam" lastName="Martin" level="CM2" classes={["CM2-1"]} even />
              </tbody>
            </table>
          </div>
        </div>
      </>
    ),
  },
  {
    caption: (
      <>
        Pour créer un élève, renseignez son <strong>prénom</strong>, son <strong>nom</strong>, son{" "}
        <strong>niveau</strong> et un <strong>mot de passe</strong> (généré automatiquement).
        L'<strong>identifiant</strong> de connexion est calculé pour vous.
      </>
    ),
    screen: (
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-extrabold text-ms-dark mb-5">Ajouter un utilisateur</h2>
        <div className="space-y-4">
          <ModalField label="Prenom" value="Lucas" spot />
          <ModalField label="Nom" value="Bernard" />
          <div className="bg-ms-lavender-light/50 rounded-xl px-4 py-2.5 text-sm">
            <span className="text-ms-gray">Identifiant : </span>
            <span className="font-mono font-bold text-ms-dark">lucasb</span>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ms-dark mb-1">Niveau</label>
            <div className="w-full px-4 py-2.5 text-sm border border-ms-light-gray rounded-xl bg-white text-ms-dark">
              CM1
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ms-dark mb-1">
              Mot de passe
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-2.5 text-sm border border-ms-light-gray rounded-xl bg-ms-cream/50 text-ms-dark font-mono">
                k7m9p
              </div>
              <span className="px-3 py-2.5 text-xs font-semibold bg-ms-cream border border-ms-light-gray text-ms-gray rounded-xl whitespace-nowrap">
                Générer
              </span>
            </div>
            <p className="text-xs text-ms-gray mt-1">5 caractères max</p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <span className="px-5 py-2.5 text-sm font-semibold bg-white border border-ms-light-gray text-ms-dark rounded-xl">Annuler</span>
            <span className="px-5 py-2.5 text-sm font-semibold bg-ms-lavender text-white rounded-xl shadow-sm">Creer</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    caption: (
      <>
        Choisissez la (ou les) <strong>classe(s) et groupe(s)</strong> de l'élève en les cochant.
        Un même élève peut être rattaché à plusieurs groupes.
      </>
    ),
    screen: (
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-extrabold text-ms-dark mb-5">Ajouter un utilisateur</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-ms-dark mb-1">
              Classes &amp; groupes
              <span className="font-normal text-ms-gray ml-1">(un élève peut en cumuler plusieurs)</span>
            </label>
            <Spot>
              <div className="max-h-44 overflow-y-auto border border-ms-light-gray rounded-xl bg-white divide-y divide-ms-light-gray">
                {[
                  { name: "CM1-A", level: "CM1", teacher: "Sabrina Roux", checked: true },
                  { name: "Géo Sabrina", level: "CM1", teacher: "Sabrina Roux", checked: true },
                  { name: "CM2-1", level: "CM2", teacher: "Marc Petit", checked: false },
                  { name: "CE2-2", level: "CE2", teacher: "Julie Blanc", checked: false },
                ].map((c) => (
                  <span
                    key={c.name}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-ms-dark"
                  >
                    <span
                      className={`inline-flex items-center justify-center w-4 h-4 rounded border ${
                        c.checked
                          ? "bg-ms-lavender border-ms-lavender text-white"
                          : "border-ms-light-gray bg-white"
                      }`}
                    >
                      {c.checked ? "✓" : ""}
                    </span>
                    <span>
                      {c.name} <span className="text-ms-gray">({c.level})</span>
                      <span className="text-ms-gray">{" — "}{c.teacher}</span>
                    </span>
                  </span>
                ))}
              </div>
            </Spot>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <span className="px-5 py-2.5 text-sm font-semibold bg-white border border-ms-light-gray text-ms-dark rounded-xl">Annuler</span>
            <span className="px-5 py-2.5 text-sm font-semibold bg-ms-lavender text-white rounded-xl shadow-sm">Creer</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    caption: (
      <>
        Pour créer une classe entière d'un coup, utilisez l'<strong>import Excel</strong>.
        Téléchargez le modèle, remplissez une ligne par élève avec les colonnes{" "}
        <strong>PRENOM</strong>, <strong>NOM</strong>, <strong>NIVEAU</strong> et{" "}
        <strong>CLASSE</strong>.
      </>
    ),
    screen: (
      <div className="max-w-lg mx-auto">
        <h2 className="text-xl font-extrabold text-ms-dark mb-2">Importer des utilisateurs</h2>
        <p className="text-sm text-ms-gray mb-3">
          Un fichier Excel (.xlsx) ou CSV, <span className="font-semibold">une ligne par élève</span>,
          avec ces 4 colonnes :
        </p>
        <Spot>
          <div className="bg-ms-cream rounded-xl p-3 mb-3 overflow-x-auto">
            <table className="text-xs font-mono">
              <thead>
                <tr className="text-ms-gray">
                  <th className="px-3 py-1 text-left">PRENOM</th>
                  <th className="px-3 py-1 text-left">NOM</th>
                  <th className="px-3 py-1 text-left">NIVEAU</th>
                  <th className="px-3 py-1 text-left">CLASSE</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-ms-dark">
                  <td className="px-3 py-1">Lina</td>
                  <td className="px-3 py-1">Dupont</td>
                  <td className="px-3 py-1">CE1</td>
                  <td className="px-3 py-1 text-ms-gray">(vide)</td>
                </tr>
                <tr className="text-ms-dark">
                  <td className="px-3 py-1">Adam</td>
                  <td className="px-3 py-1">Martin</td>
                  <td className="px-3 py-1">CM2</td>
                  <td className="px-3 py-1">CE2-2</td>
                </tr>
                <tr className="text-ms-dark">
                  <td className="px-3 py-1">Lucas</td>
                  <td className="px-3 py-1">Bernard</td>
                  <td className="px-3 py-1">CM1</td>
                  <td className="px-3 py-1">CE2-2 ; Géo Sabrina</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Spot>
        <span className="inline-flex items-center gap-2 mb-5 px-4 py-2 text-sm font-semibold text-ms-lavender border border-ms-lavender/40 rounded-xl">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
          </svg>
          Télécharger un modèle (.xlsx)
        </span>
        <div className="border-2 border-dashed border-ms-light-gray rounded-2xl p-6 text-center">
          <svg className="w-10 h-10 text-ms-gray/40 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-ms-gray">Glissez un fichier ici ou cliquez pour parcourir</p>
          <p className="text-xs text-ms-gray/60 mt-1">.xlsx ou .csv</p>
        </div>
      </div>
    ),
  },
  {
    caption: (
      <>
        Après l'import, un <strong>récapitulatif</strong> affiche les{" "}
        <strong>identifiants et mots de passe</strong> générés. Téléchargez-le pour le distribuer
        aux élèves.
      </>
    ),
    screen: (
      <div className="max-w-lg mx-auto">
        <h2 className="text-xl font-extrabold text-ms-dark mb-2">Importer des utilisateurs</h2>
        <div className="bg-ms-green-light text-ms-dark text-sm rounded-xl px-4 py-3 mb-3">
          <p className="font-semibold">3 utilisateurs créés</p>
        </div>
        <div className="bg-ms-cream/50 rounded-xl border border-ms-light-gray/50 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-ms-light-gray bg-white">
                <th className="px-3 py-2 text-left font-bold text-ms-gray">Prénom</th>
                <th className="px-3 py-2 text-left font-bold text-ms-gray">Nom</th>
                <th className="px-3 py-2 text-left font-bold text-ms-gray">Identifiant</th>
                <th className="px-3 py-2 text-left font-bold text-ms-gray">Mot de passe</th>
              </tr>
            </thead>
            <tbody>
              {[
                { p: "Lina", n: "Dupont", id: "linad", mdp: "r4t8w" },
                { p: "Adam", n: "Martin", id: "adamm", mdp: "h2j5n" },
                { p: "Lucas", n: "Bernard", id: "lucasb", mdp: "k7m9p" },
              ].map((u) => (
                <tr key={u.id} className="border-b border-ms-light-gray/30">
                  <td className="px-3 py-1.5 text-ms-dark">{u.p}</td>
                  <td className="px-3 py-1.5 text-ms-dark">{u.n}</td>
                  <td className="px-3 py-1.5 font-mono font-medium text-ms-dark">{u.id}</td>
                  <td className="px-3 py-1.5 font-mono font-medium text-ms-lavender">{u.mdp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Spot>
          <div className="w-full mt-3 py-3 text-sm font-semibold bg-ms-lavender text-white rounded-xl shadow-sm flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Télécharger la liste des identifiants (.xlsx)
          </div>
        </Spot>
      </div>
    ),
  },
  {
    caption: (
      <>
        🎉 <strong>C'est tout !</strong> Sur la ligne d'un élève, l'icône ✏️ permet de modifier
        (classe, mot de passe), et l'icône 📋 ouvre son <strong>parcours personnalisé</strong> de
        quiz sur mesure.
      </>
    ),
    screen: (
      <div className="text-center py-10">
        <div className="text-5xl mb-3">👧</div>
        <p className="font-bold text-ms-dark text-lg">Vous savez gérer tous vos élèves !</p>
        <p className="text-sm text-ms-gray mt-1">Ajouter → Importer → Classes → Parcours</p>
      </div>
    ),
  },
];

export default function ElevesDemo() {
  const [active, setActive] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setActive(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-ms-lavender border border-ms-lavender/40 rounded-xl hover:bg-ms-lavender-light/50 transition shrink-0"
        title="Voir comment gérer les élèves"
      >
        ▶ Démo
      </button>
      <DemoStage title="Gérer les élèves — pas à pas" scenes={SCENES} active={active} onClose={() => setActive(false)} />
    </>
  );
}
