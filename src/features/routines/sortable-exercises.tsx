"use client";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useApp } from "@/state/app-provider";
import { findExercise } from "@/domain/workouts";
import { ExerciseVisual } from "@/features/exercises/exercise-visual";
import { Button } from "@/components/ui/button";
function SortableItem({
  id,
  exerciseId,
  remove,
}: {
  id: string;
  exerciseId: string;
  remove: () => void;
}) {
  const { snapshot } = useApp(),
    exercise = findExercise(snapshot, exerciseId),
    sort = useSortable({ id });
  return (
    <div
      ref={sort.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sort.transform),
        transition: sort.transition,
        opacity: sort.isDragging ? 0.6 : 1,
      }}
      className="picker-row"
      data-routine-exercise={exerciseId}
    >
      <button
        type="button"
        className="drag-handle"
        aria-label={`Mover ${exercise?.name ?? exerciseId}`}
        {...sort.attributes}
        {...sort.listeners}
      >
        <GripVertical />
      </button>
      {exercise && (
        <div className="picker-thumb">
          <ExerciseVisual exercise={exercise} />
        </div>
      )}
      <span className="min-w-0 flex-1">{exercise?.name ?? exerciseId}</span>
      <Button
        variant="ghost"
        aria-label={`Quitar ${exercise?.name ?? exerciseId}`}
        onClick={remove}
      >
        −
      </Button>
    </div>
  );
}
export function SortableExercises({ rid, did }: { rid: string; did: string }) {
  const { snapshot, change } = useApp(),
    day = snapshot.routines
      .find((routine) => routine.id === rid)
      ?.days.find((day) => day.id === did);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  if (!day) return null;
  const occurrences = new Map<string, number>();
  const ids = day.items.map((id) => {
    const occurrence = occurrences.get(id) ?? 0;
    occurrences.set(id, occurrence + 1);
    return `${rid}|${did}|${id}|${occurrence}`;
  });
  return (
    <DndContext
      sensors={sensors}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;
        const from = ids.indexOf(String(active.id)),
          to = ids.indexOf(String(over.id));
        if (from < 0 || to < 0) return;
        change((draft) => {
          const target = draft.routines
            .find((routine) => routine.id === rid)
            ?.days.find((day) => day.id === did);
          if (target) target.items = arrayMove(target.items, from, to);
        });
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {day.items.map((id, index) => (
          <SortableItem
            key={ids[index]}
            id={ids[index] ?? ""}
            exerciseId={id}
            remove={() =>
              change((draft) => {
                const target = draft.routines
                  .find((routine) => routine.id === rid)
                  ?.days.find((day) => day.id === did);
                if (!target) return;
                target.items.splice(index, 1);
                target.supersets = target.supersets
                  ?.map((group) => group.filter((item) => item !== id))
                  .filter((group) => group.length >= 2);
              })
            }
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
