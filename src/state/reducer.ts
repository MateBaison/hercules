import { readSnapshot } from "@/domain/legacy/read-snapshot";
import { setInputSchema, type Snapshot } from "@/domain/schemas/snapshot";
import { z } from "zod";

export type AppState = {
  snapshot: Snapshot | null;
  loadError: string | null;
  revision: number;
};
export const initialAppState: AppState = {
  snapshot: null,
  loadError: null,
  revision: 0,
};
export type AppAction =
  | { type: "hydrate"; raw: unknown }
  | { type: "toggle-favorite"; id: string }
  | {
      type: "set-workout-input";
      entry: number;
      set: number;
      input: z.infer<typeof setInputSchema>;
    };

export function appReducer(state: AppState, action: AppAction): AppState {
  if (action.type === "hydrate") {
    const result = readSnapshot(action.raw);
    return result.ok
      ? { snapshot: result.snapshot, loadError: null, revision: state.revision }
      : { ...state, loadError: result.issues.join("\n") };
  }
  if (!state.snapshot || state.loadError) return state;
  const snapshot = structuredClone(state.snapshot);
  if (action.type === "toggle-favorite") {
    z.string().min(1).parse(action.id);
    snapshot.favorites = snapshot.favorites.includes(action.id)
      ? snapshot.favorites.filter((id) => id !== action.id)
      : [...snapshot.favorites, action.id];
  } else {
    const input = setInputSchema.parse(action.input);
    const set = snapshot.workout?.entries[action.entry]?.sets[action.set];
    if (!set) throw new Error("Workout set no longer exists");
    set.kg = input.kg;
    if (input.metric === "reps") set.reps = input.reps;
    else set.seconds = input.seconds;
    set.entered =
      input.kg !== null ||
      (input.metric === "reps" ? input.reps !== null : input.seconds !== null);
  }
  return { snapshot, loadError: null, revision: state.revision + 1 };
}
