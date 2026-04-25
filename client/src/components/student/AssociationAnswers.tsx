import { useState, useEffect } from "react";

interface Item {
  id: number;
  text: string;
}

interface Props {
  items: Item[];             // left column (id + text)
  rightColumn: string[];     // right column labels (shuffled)
  submitting: boolean;
  resetKey: number;
  onSubmit: (mapping: Record<number, string>) => void;
}

/** Paired color palette to show visually matched pairs. */
const PAIR_COLORS = [
  "bg-ms-lavender-light border-ms-lavender text-ms-dark",
  "bg-ms-blue-light border-ms-blue text-ms-dark",
  "bg-ms-green-light border-ms-green text-ms-dark",
  "bg-ms-pink-light border-ms-pink text-ms-dark",
  "bg-ms-yellow-light border-ms-yellow text-ms-dark",
  "bg-ms-peach-light border-ms-peach text-ms-dark",
];

export default function AssociationAnswers({
  items,
  rightColumn,
  submitting,
  resetKey,
  onSubmit,
}: Props) {
  /* itemId -> right value */
  const [pairs, setPairs] = useState<Record<number, string>>({});
  const [selectedLeftId, setSelectedLeftId] = useState<number | null>(null);

  useEffect(() => {
    setPairs({});
    setSelectedLeftId(null);
  }, [resetKey]);

  /* Map pair → color index (by creation order) */
  const pairOrder: number[] = Object.keys(pairs).map((k) => Number(k));
  function colorForItem(itemId: number): string | null {
    const idx = pairOrder.indexOf(itemId);
    if (idx === -1) return null;
    return PAIR_COLORS[idx % PAIR_COLORS.length];
  }
  function colorForRight(value: string): string | null {
    const itemId = Object.entries(pairs).find(([, v]) => v === value)?.[0];
    if (itemId === undefined) return null;
    return colorForItem(Number(itemId));
  }

  function selectLeft(id: number) {
    /* If already paired, unpair it */
    if (pairs[id] !== undefined) {
      setPairs((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSelectedLeftId(null);
      return;
    }
    setSelectedLeftId(id);
  }

  function selectRight(value: string) {
    /* If right is already used, unpair that item */
    const existingLeftEntry = Object.entries(pairs).find(([, v]) => v === value);
    if (existingLeftEntry) {
      const [existingId] = existingLeftEntry;
      setPairs((prev) => {
        const next = { ...prev };
        delete next[Number(existingId)];
        return next;
      });
      return;
    }
    if (selectedLeftId === null) return;
    setPairs((prev) => ({ ...prev, [selectedLeftId]: value }));
    setSelectedLeftId(null);
  }

  const allPaired = items.every((it) => pairs[it.id] !== undefined);

  function handleValidate() {
    onSubmit(pairs);
  }

  return (
    <div className="space-y-5">
      {/* Info */}
      <p className="text-sm text-ms-gray text-center">
        Clique sur un élément à gauche, puis sur son équivalent à droite.
      </p>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-2">
          {items.map((it) => {
            const color = colorForItem(it.id);
            const selected = selectedLeftId === it.id;
            return (
              <button
                key={it.id}
                type="button"
                disabled={submitting}
                onClick={() => selectLeft(it.id)}
                className={`w-full py-3 px-4 rounded-2xl border-2 font-bold text-ms-dark transition-all text-left ${
                  color
                    ? color + " shadow-sm"
                    : selected
                    ? "bg-white border-ms-lavender ring-4 ring-ms-lavender/40 shadow-md"
                    : "bg-white border-ms-light-gray hover:border-ms-lavender"
                } ${submitting ? "opacity-60 cursor-wait" : ""}`}
              >
                {it.text}
              </button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="space-y-2">
          {rightColumn.map((value) => {
            const color = colorForRight(value);
            const disabled = !color && selectedLeftId === null;
            return (
              <button
                key={value}
                type="button"
                disabled={submitting || disabled}
                onClick={() => selectRight(value)}
                className={`w-full py-3 px-4 rounded-2xl border-2 font-bold text-ms-dark transition-all text-left ${
                  color
                    ? color + " shadow-sm"
                    : "bg-white border-ms-light-gray hover:border-ms-lavender"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${
                  submitting ? "opacity-60 cursor-wait" : ""
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>

      {/* Validate */}
      <button
        type="button"
        disabled={submitting || !allPaired}
        onClick={handleValidate}
        className="w-full py-4 bg-ms-lavender text-white font-bold text-lg rounded-2xl hover:bg-ms-lavender/85 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
      >
        {submitting ? "Vérification..." : `Valider (${Object.keys(pairs).length}/${items.length})`}
      </button>
    </div>
  );
}
