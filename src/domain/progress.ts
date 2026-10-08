import type { Snapshot } from "./schemas/snapshot";
import { catalogFor } from "./workouts";
export const groups = [
  "Pectorales",
  "Espalda",
  "Hombros",
  "Bíceps",
  "Tríceps",
  "Abdominales",
  "Piernas",
  "Gemelos",
] as const;
export type RecordSet = {
  kg: number;
  value: number;
  metric: "reps" | "seconds";
};
export type History = { date: Date; sets: RecordSet[] };
export function exerciseHistories(snapshot: Snapshot) {
  const histories = new Map<string, History[]>();
  for (const session of [...snapshot.sessions].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date),
  )) {
    const date = new Date(session.date);
    if (!Number.isFinite(date.getTime())) continue;
    for (const exercise of session.exercises ?? []) {
      const sets = (exercise.performedSets ?? []).flatMap(
        (set): RecordSet[] => {
          const metric = Number(set.seconds) > 0 ? "seconds" : "reps",
            value = Number(set[metric]);
          return value > 0
            ? [
                {
                  metric,
                  value,
                  kg:
                    Number(set.kg ?? 0) /
                    (session.weightUnit === "lb" ? 2.20462 : 1),
                },
              ]
            : [];
        },
      );
      if (sets.length)
        histories.set(exercise.id, [
          ...(histories.get(exercise.id) ?? []),
          { date, sets },
        ]);
    }
  }
  return histories;
}
export function improvement(current: History, previous?: History) {
  if (!previous) return null;
  const matches = current.sets.flatMap((after) =>
    previous.sets.flatMap((before) => {
      if (after.metric !== before.metric) return [];
      if (after.value === before.value && after.kg > before.kg + 0.05)
        return [{ kind: "weight", before, after, gain: after.kg - before.kg }];
      if (Math.abs(after.kg - before.kg) < 0.15 && after.value > before.value)
        return [
          { kind: "quantity", before, after, gain: after.value - before.value },
        ];
      return [];
    }),
  );
  return (
    matches.sort(
      (a, b) =>
        Number(b.kind === "weight") - Number(a.kind === "weight") ||
        b.gain - a.gain,
    )[0] ?? null
  );
}
export function comparable(current: History, previous?: History) {
  return (
    !!previous &&
    current.sets.some((set) =>
      previous.sets.some(
        (old) =>
          set.metric === old.metric &&
          (set.value === old.value || Math.abs(set.kg - old.kg) < 0.15),
      ),
    )
  );
}
export function weeklyData(
  snapshot: Snapshot,
  count: number,
  now = new Date(),
) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const catalog = catalogFor(snapshot);
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(monday);
    start.setDate(start.getDate() - (count - 1 - index) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const sessions = snapshot.sessions.filter(
        (session) =>
          new Date(session.date) >= start && new Date(session.date) < end,
      ),
      counts: Record<string, number> = Object.fromEntries(
        groups.map((group) => [group, 0]),
      );
    for (const session of sessions) {
      const totals = session.groupSets;
      if (totals && typeof totals === "object" && !Array.isArray(totals)) {
        for (const group of groups)
          counts[group] =
            (counts[group] ?? 0) +
            Math.max(
              0,
              Number((totals as Record<string, unknown>)[group]) || 0,
            );
      } else
        for (const exercise of session.exercises ?? []) {
          const group =
            exercise.group ||
            catalog.find((item) => item.id === exercise.id)?.group;
          if (group && group in counts)
            counts[group] =
              (counts[group] ?? 0) +
              (exercise.performedSets?.length ?? exercise.sets ?? 0);
        }
    }
    return { start, sessions: sessions.length, groups: counts };
  });
}

// Historical duration is stored in minutes. Unknown durations stay unknown.
export function weeklySummary(snapshot: Snapshot, now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + index);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    const sessions = snapshot.sessions.filter((session) => {
      const instant = new Date(session.date);
      return instant >= date && instant < end;
    });
    const unknown = sessions.filter(
      (session) => session.duration == null,
    ).length;
    return {
      date,
      sessions: sessions.length,
      minutes: sessions.reduce(
        (sum, session) => sum + (session.duration ?? 0),
        0,
      ),
      unknown,
      sets: sessions.reduce((sum, session) => sum + (session.sets ?? 0), 0),
    };
  });
  return {
    start: monday,
    days,
    sessions: days.reduce((sum, day) => sum + day.sessions, 0),
    minutes: days.reduce((sum, day) => sum + day.minutes, 0),
    unknown: days.reduce((sum, day) => sum + day.unknown, 0),
    trainedDays: days.filter((day) => day.sessions > 0).length,
  };
}
