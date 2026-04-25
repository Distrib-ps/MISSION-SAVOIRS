import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Item {
  id: number;
  text: string;
}

interface Props {
  items: Item[];
  submitting: boolean;
  resetKey: number;
  onSubmit: (orderedIds: number[]) => void;
}

export default function OrderingAnswers({
  items,
  submitting,
  resetKey,
  onSubmit,
}: Props) {
  const [orderedIds, setOrderedIds] = useState<number[]>(() => items.map((it) => it.id));

  useEffect(() => {
    setOrderedIds(items.map((it) => it.id));
  }, [resetKey, items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = orderedIds.indexOf(Number(active.id));
    const newIdx = orderedIds.indexOf(Number(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    setOrderedIds((prev) => arrayMove(prev, oldIdx, newIdx));
  }

  const itemById = new Map(items.map((it) => [it.id, it]));

  return (
    <div className="space-y-5">
      <p className="text-sm text-ms-gray text-center">
        Réordonne les éléments dans le bon ordre en les glissant.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {orderedIds.map((id, index) => {
              const item = itemById.get(id);
              if (!item) return null;
              return <SortableItem key={id} id={id} position={index + 1} text={item.text} />;
            })}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        disabled={submitting}
        onClick={() => onSubmit(orderedIds)}
        className="w-full py-4 bg-ms-lavender text-white font-bold text-lg rounded-2xl hover:bg-ms-lavender/85 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
      >
        {submitting ? "Vérification..." : "Valider"}
      </button>
    </div>
  );
}

function SortableItem({ id, position, text }: { id: number; position: number; text: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 bg-white border-2 border-ms-light-gray rounded-2xl p-4 ${
        isDragging ? "opacity-60 shadow-lg border-ms-lavender scale-[1.01]" : "hover:border-ms-lavender hover:shadow-sm"
      } transition`}
    >
      <span className="w-9 h-9 rounded-xl bg-ms-lavender-light text-ms-lavender font-extrabold flex items-center justify-center shrink-0">
        {position}
      </span>
      <span className="flex-1 font-bold text-ms-dark">{text}</span>
      <button
        type="button"
        {...listeners}
        {...attributes}
        className="text-ms-gray hover:text-ms-lavender cursor-grab active:cursor-grabbing p-1"
        aria-label="Déplacer"
        title="Maintiens et glisse pour réordonner"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
        </svg>
      </button>
    </div>
  );
}
