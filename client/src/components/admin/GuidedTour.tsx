import { useCallback, useEffect, useState } from "react";

export interface TourStep {
  /** Sélecteur CSS de l'élément à mettre en avant (absent = étape centrée). */
  selector?: string;
  title: string;
  text: string;
}

interface Props {
  steps: TourStep[];
  active: boolean;
  onClose: () => void;
}

/**
 * Visite guidée maison (sans dépendance) : projecteur sur un élément ciblé
 * + bulle explicative. Si la cible est absente (ex. menu masqué sur mobile),
 * l'étape s'affiche centrée.
 */
export default function GuidedTour({ steps, active, onClose }: Props) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = steps[i];

  const measure = useCallback(() => {
    if (!step?.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const r = el.getBoundingClientRect();
    setRect(r.width === 0 && r.height === 0 ? null : r);
  }, [step]);

  useEffect(() => {
    if (active) setI(0);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    // petit délai pour laisser le scroll se faire avant de mesurer
    const t = setTimeout(measure, 60);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, measure]);

  if (!active || !step) return null;

  const last = i === steps.length - 1;
  const pad = 6;

  // Position de la bulle : à droite de la cible (menu), sinon centrée.
  const tooltipWidth = 320;
  let tooltipStyle: React.CSSProperties;
  if (rect) {
    const spaceRight = window.innerWidth - rect.right;
    const left =
      spaceRight > tooltipWidth + 24
        ? rect.right + 16
        : Math.max(16, rect.left + rect.width / 2 - tooltipWidth / 2);
    const top = Math.min(Math.max(16, rect.top), window.innerHeight - 220);
    tooltipStyle = { position: "fixed", top, left, width: tooltipWidth };
  } else {
    tooltipStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: tooltipWidth,
    };
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Voile + projecteur */}
      {rect ? (
        <div
          className="fixed rounded-xl pointer-events-none transition-all duration-200"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(15,12,40,0.55)",
            outline: "3px solid #b9a7f7",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[rgba(15,12,40,0.55)]" />
      )}

      {/* Bulle */}
      <div
        style={tooltipStyle}
        className="bg-white rounded-2xl shadow-xl p-5 border border-ms-light-gray"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-ms-lavender">
            Étape {i + 1} / {steps.length}
          </span>
          <button
            onClick={onClose}
            className="text-ms-gray hover:text-ms-dark text-sm"
            title="Fermer la visite"
          >
            Passer ✕
          </button>
        </div>
        <h3 className="text-lg font-extrabold text-ms-dark mb-1">{step.title}</h3>
        <p className="text-sm text-ms-gray leading-relaxed">{step.text}</p>

        <div className="flex items-center justify-between gap-2 mt-4">
          <button
            onClick={() => setI((n) => Math.max(0, n - 1))}
            disabled={i === 0}
            className="px-4 py-2 text-sm font-semibold text-ms-dark border border-ms-light-gray rounded-xl hover:bg-ms-cream transition disabled:opacity-40"
          >
            Précédent
          </button>
          {last ? (
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold bg-ms-green text-white rounded-xl hover:opacity-90 transition"
            >
              Terminer 🎉
            </button>
          ) : (
            <button
              onClick={() => setI((n) => Math.min(steps.length - 1, n + 1))}
              className="px-5 py-2 text-sm font-semibold bg-ms-lavender text-white rounded-xl hover:opacity-90 transition"
            >
              Suivant
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
