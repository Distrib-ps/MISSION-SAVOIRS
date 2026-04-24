import { useState, useEffect } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

interface Item {
  id: number;
  text: string;
}

interface Props {
  items: Item[];
  zones: string[];
  submitting: boolean;
  resetKey: number;
  onSubmit: (mapping: Record<number, string>) => void;
}

const POOL_ID = "__pool__";

export default function DragDropAnswers({
  items,
  zones,
  submitting,
  resetKey,
  onSubmit,
}: Props) {
  /* Map item id -> zone label (or POOL_ID when not placed yet) */
  const [placement, setPlacement] = useState<Record<number, string>>(() =>
    Object.fromEntries(items.map((it) => [it.id, POOL_ID])),
  );

  /* Reset when resetKey changes (new attempt) */
  useEffect(() => {
    setPlacement(Object.fromEntries(items.map((it) => [it.id, POOL_ID])));
  }, [resetKey, items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const itemId = Number(e.active.id);
    const zoneId = e.over?.id ? String(e.over.id) : null;
    if (!zoneId) return;
    setPlacement((prev) => ({ ...prev, [itemId]: zoneId }));
  }

  const allPlaced = items.every((it) => placement[it.id] && placement[it.id] !== POOL_ID);

  function handleValidate() {
    /* Build a mapping with zone labels only (exclude pool) */
    const mapping: Record<number, string> = {};
    for (const it of items) {
      const z = placement[it.id];
      if (z && z !== POOL_ID) mapping[it.id] = z;
    }
    onSubmit(mapping);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-5">
        {/* Pool of unplaced items */}
        <PoolZone items={items.filter((it) => placement[it.id] === POOL_ID)} />

        {/* Target zones */}
        <div className="grid gap-4 sm:grid-cols-2">
          {zones.map((zone, i) => {
            const placedItems = items.filter((it) => placement[it.id] === zone);
            const colors = [
              "bg-ms-blue-light border-ms-blue/40",
              "bg-ms-pink-light border-ms-pink/40",
              "bg-ms-green-light border-ms-green/40",
              "bg-ms-yellow-light border-ms-yellow/40",
              "bg-ms-peach-light border-ms-peach/40",
              "bg-ms-lavender-light border-ms-lavender/40",
            ];
            return (
              <DroppableZone
                key={zone}
                zone={zone}
                placedItems={placedItems}
                colorClass={colors[i % colors.length]}
              />
            );
          })}
        </div>

        {/* Validate button */}
        <button
          type="button"
          disabled={submitting || !allPlaced}
          onClick={handleValidate}
          className="w-full py-4 bg-ms-lavender text-white font-bold text-lg rounded-2xl hover:bg-ms-lavender/85 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          {submitting ? "Vérification..." : `Valider (${Object.values(placement).filter((z) => z !== POOL_ID).length}/${items.length})`}
        </button>
      </div>
    </DndContext>
  );
}

/* ── Pool (unplaced items) ── */

function PoolZone({ items }: { items: Item[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: POOL_ID });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border-2 border-dashed p-4 transition ${
        isOver ? "border-ms-lavender bg-ms-lavender-light/60" : "border-ms-light-gray bg-ms-cream/50"
      }`}
    >
      <p className="text-xs font-bold text-ms-gray uppercase tracking-wide mb-2">
        À placer
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-ms-gray italic py-2 text-center">
          Tous les éléments sont placés !
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((it) => (
            <DraggableItem key={it.id} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Droppable target zone ── */

function DroppableZone({
  zone,
  placedItems,
  colorClass,
}: {
  zone: string;
  placedItems: Item[];
  colorClass: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zone });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border-2 p-4 min-h-[120px] transition ${colorClass} ${
        isOver ? "ring-4 ring-ms-lavender/40" : ""
      }`}
    >
      <p className="text-sm font-extrabold text-ms-dark mb-2">{zone}</p>
      <div className="flex flex-wrap gap-2">
        {placedItems.map((it) => (
          <DraggableItem key={it.id} item={it} />
        ))}
      </div>
    </div>
  );
}

/* ── Draggable item ── */

function DraggableItem({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      {...listeners}
      {...attributes}
      className={`px-4 py-2 bg-white border-2 border-ms-light-gray rounded-xl shadow-sm font-bold text-ms-dark cursor-grab active:cursor-grabbing transition ${
        isDragging ? "opacity-60 scale-105 border-ms-lavender shadow-md" : "hover:border-ms-lavender"
      }`}
    >
      {item.text}
    </button>
  );
}
