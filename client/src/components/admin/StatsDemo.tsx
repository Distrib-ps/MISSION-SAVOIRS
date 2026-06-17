import { useState } from "react";
import DemoStage, { Spot, type DemoScene } from "./DemoStage";

/* ------------------------------------------------------------------ */
/*  Briques identiques à StatsPage (rendu fidèle, données EN DUR)      */
/* ------------------------------------------------------------------ */

/* couleur de barre selon le taux (identique à StatsPage) */
const rateColor = (r: number) => (r >= 70 ? "#7FD8A6" : r >= 40 ? "#FFD23F" : "#FF9AA2");

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-ms-light-gray rounded-2xl p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-ms-gray">{label}</p>
      <p className="text-3xl font-extrabold text-ms-dark mt-1">{value}</p>
      {sub && <p className="text-xs text-ms-gray mt-0.5">{sub}</p>}
    </div>
  );
}

/* Onglets statiques, markup identique à StatsPage */
function Tabs({ active = "global" }: { active?: "global" | "student" }) {
  return (
    <div className="flex gap-2 bg-ms-cream rounded-xl p-1">
      <span
        className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${
          active === "global" ? "bg-white text-ms-dark shadow-sm" : "text-ms-gray"
        }`}
      >
        Vue globale
      </span>
      <span
        className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${
          active === "student" ? "bg-white text-ms-dark shadow-sm" : "text-ms-gray"
        }`}
      >
        Par élève
      </span>
    </div>
  );
}

/* Bouton « Exporter (CSV) » statique, markup identique à StatsPage */
function ExportButton() {
  return (
    <span className="text-sm font-semibold text-ms-lavender border border-ms-lavender/40 px-4 py-1.5 rounded-lg block w-fit">
      Exporter (CSV)
    </span>
  );
}

/* Graphe en barres HORIZONTALES simulé avec des div (PAS de Recharts) */
function FakeHBarChart({ data }: { data: { label: string; rate: number; attempts: number }[] }) {
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-40 shrink-0 text-xs text-ms-dark truncate text-right">{d.label}</span>
          <div className="flex-1 h-4 bg-ms-cream rounded-full overflow-hidden">
            <div
              className="h-4 rounded-full"
              style={{ width: `${d.rate}%`, background: rateColor(d.rate) }}
            />
          </div>
          <span className="w-24 shrink-0 text-xs text-ms-gray">
            {d.rate}% · {d.attempts} tent.
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Scènes (données 100 % en dur) — rendu fidèle aux écrans réels      */
/* ------------------------------------------------------------------ */

const SCENES: DemoScene[] = [
  {
    caption: (
      <>
        Deux vues sont disponibles : <strong>Vue globale</strong> (vue d'ensemble de toute votre
        classe) et <strong>Par élève</strong>. Les cartes du haut résument l'essentiel.
      </>
    ),
    screen: (
      <>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-extrabold text-ms-dark">KPI &amp; Statistiques</h1>
          <Spot><Tabs active="global" /></Spot>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Élèves" value={24} />
          <KpiCard label="Tentatives" value={312} sub="248 terminées" />
          <KpiCard label="Réussite moyenne" value="78%" />
          <KpiCard label="Contenu" value="18 quiz" sub="5 thèmes" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="bg-ms-green-light border border-ms-green/30 rounded-2xl p-4">
            <p className="text-sm font-bold text-ms-dark">Réduction des erreurs</p>
            <p className="text-3xl font-extrabold text-ms-dark mt-1">64%</p>
            <p className="text-xs text-ms-gray mt-0.5">41/64 questions ratées puis réussies</p>
          </div>
          <div className="bg-ms-yellow-light border border-ms-yellow/30 rounded-2xl p-4">
            <p className="text-sm font-bold text-ms-dark">Usage des indices</p>
            <p className="text-3xl font-extrabold text-ms-dark mt-1">23%</p>
            <p className="text-xs text-ms-gray mt-0.5">des réponses ont utilisé un indice</p>
          </div>
        </div>
      </>
    ),
  },
  {
    caption: (
      <>
        Les <strong>graphiques</strong> montrent la réussite par thème, par quiz et par niveau.
        Repérez d'un coup d'œil les notions à retravailler (barres rouges/jaunes).
      </>
    ),
    screen: (
      <div className="bg-white border border-ms-light-gray rounded-2xl p-5">
        <h2 className="font-bold text-ms-dark mb-3">Réussite par thème</h2>
        <FakeHBarChart
          data={[
            { label: "📚 Histoire", rate: 82, attempts: 96 },
            { label: "🔢 Mathématiques", rate: 54, attempts: 88 },
            { label: "🌍 Géographie", rate: 71, attempts: 60 },
            { label: "🔬 Sciences", rate: 38, attempts: 42 },
          ]}
        />
      </div>
    ),
  },
  {
    caption: (
      <>
        Dans <strong>Par élève</strong>, choisissez un élève pour voir sa progression et ses points
        faibles. <strong>Cliquez un quiz</strong> pour le détail question par question.
      </>
    ),
    screen: (
      <>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-extrabold text-ms-dark">KPI &amp; Statistiques</h1>
          <Tabs active="student" />
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <label className="text-sm font-semibold text-ms-gray">Élève :</label>
          <span className="px-3 py-1.5 border border-ms-light-gray rounded-lg bg-white text-sm text-ms-dark min-w-64 inline-block">
            Lucas Bernard (CM1)
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KpiCard label="Tentatives" value={18} sub="12 terminées" />
          <KpiCard label="Réussite moyenne" value="64%" />
          <KpiCard label="Récupération" value="58%" sub="7/12 ratées→réussies" />
          <KpiCard label="Usage indices" value="31%" />
        </div>
        <div className="bg-white border border-ms-light-gray rounded-2xl p-5 mb-4">
          <h2 className="font-bold text-ms-dark mb-3">Détail quiz par quiz</h2>
          <div className="space-y-2.5">
            <Spot>
              <div className="flex items-center gap-3 bg-white border border-ms-light-gray rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ms-dark truncate">Préhistoire</p>
                  <p className="text-xs text-ms-gray">📚 Histoire · 3 tentatives</p>
                </div>
                <div className="w-28 h-3 bg-ms-cream rounded-full overflow-hidden">
                  <div className="h-3 rounded-full" style={{ width: "82%", background: rateColor(82) }} />
                </div>
                <span className="text-xs font-bold w-10 text-right" style={{ color: rateColor(82) }}>82%</span>
                <span className="inline-block bg-ms-green text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  Terminé
                </span>
              </div>
            </Spot>
            <div className="flex items-center gap-3 bg-white border border-ms-light-gray rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ms-dark truncate">Multiplications</p>
                <p className="text-xs text-ms-gray">🔢 Mathématiques · 4 tentatives</p>
              </div>
              <div className="w-28 h-3 bg-ms-cream rounded-full overflow-hidden">
                <div className="h-3 rounded-full" style={{ width: "41%", background: rateColor(41) }} />
              </div>
              <span className="text-xs font-bold w-10 text-right" style={{ color: rateColor(41) }}>41%</span>
              <span className="inline-block bg-ms-yellow text-white text-xs font-bold px-2 py-0.5 rounded-full">
                En cours
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white border border-ms-light-gray rounded-2xl p-5">
          <h2 className="font-bold text-ms-dark mb-3">Points faibles</h2>
          <ul className="space-y-2">
            <li className="flex items-center gap-3 text-sm">
              <span className="w-9 h-7 shrink-0 flex items-center justify-center bg-ms-pink-light text-ms-pink font-extrabold rounded-lg text-xs">
                ×4
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-ms-dark truncate">Combien font 7 × 8 ?</p>
                <p className="text-xs text-ms-gray truncate">🔢 Table de 7</p>
              </div>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <span className="w-9 h-7 shrink-0 flex items-center justify-center bg-ms-pink-light text-ms-pink font-extrabold rounded-lg text-xs">
                ×2
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-ms-dark truncate">Combien font 7 × 6 ?</p>
                <p className="text-xs text-ms-gray truncate">🔢 Table de 7</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-ms-green">rattrapée</span>
            </li>
          </ul>
        </div>
      </>
    ),
  },
  {
    caption: (
      <>
        Le bouton <strong>Exporter (CSV)</strong> télécharge les chiffres affichés (vue globale ou
        élève). Pratique pour préparer un bilan ou un conseil de classe.
      </>
    ),
    screen: (
      <>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-ms-gray">Niveau :</label>
            <span className="px-3 py-1.5 border border-ms-light-gray rounded-lg bg-white text-sm text-ms-dark inline-block">
              Tous niveaux
            </span>
          </div>
          <Spot><ExportButton /></Spot>
        </div>
        <div className="text-center py-10">
          <div className="text-5xl mb-3">📊</div>
          <p className="font-bold text-ms-dark text-lg">Vous savez suivre vos élèves !</p>
          <p className="text-sm text-ms-gray mt-1">Vue globale → Par élève → Export CSV</p>
        </div>
      </>
    ),
  },
];

export function StatsDemo() {
  const [active, setActive] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setActive(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-ms-lavender border border-ms-lavender/40 rounded-xl hover:bg-ms-lavender-light/50 transition shrink-0"
        title="Voir comment lire les statistiques"
      >
        ▶ Démo
      </button>
      <DemoStage title="Statistiques — pas à pas" scenes={SCENES} active={active} onClose={() => setActive(false)} />
    </>
  );
}

export default StatsDemo;
