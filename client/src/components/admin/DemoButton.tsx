import { useState } from "react";
import GuidedTour, { type TourStep } from "./GuidedTour";

/**
 * Bouton « Démo » réutilisable : lance une visite guidée propre à une page.
 * Autonome (gère son propre état) — à poser dans l'en-tête de chaque catégorie.
 */
export default function DemoButton({ steps, label = "Démo" }: { steps: TourStep[]; label?: string }) {
  const [active, setActive] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setActive(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-ms-lavender border border-ms-lavender/40 rounded-xl hover:bg-ms-lavender-light/50 transition shrink-0"
        title="Voir comment fonctionne cette page"
      >
        ▶ {label}
      </button>
      <GuidedTour steps={steps} active={active} onClose={() => setActive(false)} />
    </>
  );
}
