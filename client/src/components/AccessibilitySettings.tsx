import { useAccessibility, type FontSize } from "../contexts/AccessibilityContext";

const FONT_SIZES: { value: FontSize; label: string; sample: string }[] = [
  { value: "sm", label: "Petit",      sample: "Aa" },
  { value: "md", label: "Normal",     sample: "Aa" },
  { value: "lg", label: "Grand",      sample: "Aa" },
  { value: "xl", label: "Très grand", sample: "Aa" },
];

export default function AccessibilitySettings({ onClose }: { onClose: () => void }) {
  const { fontSize, setFontSize, highContrast, setHighContrast, reset } = useAccessibility();

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 border border-ms-light-gray/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-ms-dark">
            Réglages d'accessibilité
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-ms-cream hover:bg-ms-light-gray flex items-center justify-center transition"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5 text-ms-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Font size */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-ms-dark mb-3">
            Taille du texte
          </label>
          <div className="grid grid-cols-4 gap-2">
            {FONT_SIZES.map((s, i) => {
              const textSize = ["text-sm", "text-base", "text-lg", "text-xl"][i];
              const active = fontSize === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setFontSize(s.value)}
                  className={`rounded-2xl py-3 px-2 border-2 transition text-center ${
                    active
                      ? "bg-ms-lavender-light border-ms-lavender"
                      : "bg-ms-cream border-ms-light-gray hover:border-ms-lavender"
                  }`}
                >
                  <div className={`font-extrabold text-ms-dark ${textSize}`}>
                    {s.sample}
                  </div>
                  <div className="text-xs font-semibold text-ms-gray mt-0.5">
                    {s.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* High contrast */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-ms-dark mb-3">
            Mode contraste élevé
          </label>
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`w-full rounded-2xl p-4 border-2 transition text-left flex items-center justify-between ${
              highContrast
                ? "bg-ms-lavender-light border-ms-lavender"
                : "bg-ms-cream border-ms-light-gray hover:border-ms-lavender"
            }`}
          >
            <div>
              <div className="font-bold text-ms-dark">
                {highContrast ? "Activé" : "Désactivé"}
              </div>
              <div className="text-xs text-ms-gray mt-0.5">
                Améliore la lisibilité pour les élèves en difficulté
              </div>
            </div>
            <div
              className={`w-12 h-7 rounded-full relative transition-colors ${
                highContrast ? "bg-ms-lavender" : "bg-ms-light-gray"
              }`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                  highContrast ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
        </div>

        {/* Reset button */}
        <button
          onClick={reset}
          className="w-full py-2.5 text-sm font-semibold bg-white border border-ms-light-gray text-ms-gray hover:text-ms-dark hover:border-ms-gray rounded-xl transition"
        >
          Réinitialiser les réglages
        </button>
      </div>
    </div>
  );
}
