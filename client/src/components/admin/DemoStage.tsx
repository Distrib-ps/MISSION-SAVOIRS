import { useState, type ReactNode } from "react";

export interface DemoScene {
  caption: ReactNode;
  screen: ReactNode;
}

/** Entoure un élément simulé d'un halo animé pour le mettre en avant. */
export function Spot({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="absolute -inset-1.5 rounded-xl ring-4 ring-ms-lavender animate-pulse pointer-events-none" />
      <span className="relative">{children}</span>
    </span>
  );
}

interface Props {
  title: string;
  scenes: DemoScene[];
  active: boolean;
  onClose: () => void;
}

/**
 * Lecteur de démo « fausse page » : déroule une suite de mini-écrans simulés
 * (données en dur) avec une légende. 100 % maîtrisé, aucun écran réel à attendre.
 */
export default function DemoStage({ title, scenes, active, onClose }: Props) {
  const [i, setI] = useState(0);
  if (!active) return null;
  const scene = scenes[i];
  const last = i === scenes.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-[rgba(15,12,40,0.6)] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ms-light-gray">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-ms-dark">{title}</span>
            <span className="text-xs font-bold text-ms-lavender">
              Étape {i + 1} / {scenes.length}
            </span>
          </div>
          <button onClick={onClose} className="text-ms-gray hover:text-ms-dark text-sm">
            Fermer ✕
          </button>
        </div>

        {/* Écran simulé */}
        <div className="p-5 overflow-auto bg-ms-cream/40">
          <div className="rounded-2xl border border-ms-light-gray bg-white p-4 sm:p-5 min-h-[220px]">
            {scene.screen}
          </div>
        </div>

        {/* Légende + navigation */}
        <div className="px-5 py-4 border-t border-ms-light-gray">
          <div className="bg-ms-lavender-light/50 rounded-xl px-4 py-3 text-sm text-ms-dark mb-3">
            {scene.caption}
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setI((n) => Math.max(0, n - 1))}
              disabled={i === 0}
              className="px-4 py-2 text-sm font-semibold text-ms-dark border border-ms-light-gray rounded-xl hover:bg-ms-cream transition disabled:opacity-40"
            >
              Précédent
            </button>
            <div className="flex gap-1.5">
              {scenes.map((_, n) => (
                <span
                  key={n}
                  className={`w-2 h-2 rounded-full ${n === i ? "bg-ms-lavender" : "bg-ms-light-gray"}`}
                />
              ))}
            </div>
            {last ? (
              <button
                onClick={() => {
                  setI(0);
                  onClose();
                }}
                className="px-5 py-2 text-sm font-semibold bg-ms-green text-white rounded-xl hover:opacity-90 transition"
              >
                Terminer 🎉
              </button>
            ) : (
              <button
                onClick={() => setI((n) => Math.min(scenes.length - 1, n + 1))}
                className="px-5 py-2 text-sm font-semibold bg-ms-lavender text-white rounded-xl hover:opacity-90 transition"
              >
                Suivant →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
