import { useEffect, useRef, useState } from "react";

export interface TourStep {
  /** Sélecteur CSS de l'élément à mettre en avant (absent = étape centrée). */
  selector?: string;
  title: string;
  text: string;
  /** "click" = l'étape avance quand l'utilisateur clique l'élément éclairé. */
  advanceOn?: "click";
}

interface Props {
  steps: TourStep[];
  active: boolean;
  onClose: () => void;
}

/**
 * Visite guidée maison (sans dépendance) : projecteur sur un élément ciblé
 * + bulle explicative. L'élément est attendu (polling) tant qu'il n'apparaît
 * pas (utile pour les formulaires/boutons qui s'affichent après une action).
 * Une étape peut avancer automatiquement quand on clique l'élément éclairé.
 */
export default function GuidedTour({ steps, active, onClose }: Props) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [waiting, setWaiting] = useState(false);
  const lastElRef = useRef<Element | null>(null);

  const step = steps[i];

  useEffect(() => {
    if (active) setI(0);
  }, [active]);

  useEffect(() => {
    if (!active || !step) return;

    const goNext = () => setI((n) => Math.min(steps.length - 1, n + 1));

    const onClick = (e: MouseEvent) => {
      if (step.advanceOn !== "click") return;
      const el = lastElRef.current;
      if (el && el.contains(e.target as Node)) {
        // laisse l'action de l'élément se produire (ouverture de modale, navigation)
        setTimeout(goNext, 350);
      }
    };

    const tick = () => {
      if (!step.selector) {
        setRect(null);
        setWaiting(false);
        lastElRef.current = null;
        return;
      }
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        setRect(null);
        setWaiting(true);
        lastElRef.current = null;
        return;
      }
      if (lastElRef.current !== el) {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        lastElRef.current = el;
      }
      const r = el.getBoundingClientRect();
      setRect(r.width === 0 && r.height === 0 ? null : r);
      setWaiting(r.width === 0 && r.height === 0);
    };

    tick();
    const id = setInterval(tick, 150);
    document.addEventListener("click", onClick, true);
    return () => {
      clearInterval(id);
      document.removeEventListener("click", onClick, true);
    };
  }, [active, i, step, steps.length]);

  if (!active || !step) return null;

  const last = i === steps.length - 1;
  const pad = 6;
  const clickable = step.advanceOn === "click" && !!rect;

  // Position de la bulle : à droite de la cible si possible, sinon en dessous, sinon centrée.
  const tooltipWidth = 320;
  let tooltipStyle: React.CSSProperties;
  if (rect) {
    const spaceRight = window.innerWidth - rect.right;
    const left =
      spaceRight > tooltipWidth + 24
        ? rect.right + 16
        : Math.max(16, Math.min(rect.left, window.innerWidth - tooltipWidth - 16));
    const top = Math.min(Math.max(16, rect.top), window.innerHeight - 240);
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
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Voile + projecteur */}
      {rect ? (
        <>
          <div
            className="fixed rounded-xl transition-all duration-200"
            style={{
              top: rect.top - pad,
              left: rect.left - pad,
              width: rect.width + pad * 2,
              height: rect.height + pad * 2,
              boxShadow: "0 0 0 9999px rgba(15,12,40,0.55)",
              outline: "3px solid #b9a7f7",
            }}
          />
          <div
            className="fixed rounded-xl border-4 border-ms-lavender animate-pulse"
            style={{
              top: rect.top - pad,
              left: rect.left - pad,
              width: rect.width + pad * 2,
              height: rect.height + pad * 2,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-[rgba(15,12,40,0.55)]" />
      )}

      {/* Bulle (cliquable) */}
      <div
        style={tooltipStyle}
        className="bg-white rounded-2xl shadow-xl p-5 border border-ms-light-gray pointer-events-auto"
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

        {clickable && (
          <p className="mt-2 text-sm font-semibold text-ms-lavender">
            👆 Cliquez sur l'élément en surbrillance pour continuer.
          </p>
        )}
        {waiting && (
          <p className="mt-2 text-sm text-ms-gray italic">⏳ En attente de l'écran concerné…</p>
        )}

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
              {clickable ? "Ignorer →" : "Suivant"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
