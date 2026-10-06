import { localeFor } from "@/data/translations";
import type { Snapshot } from "@/domain/schemas/snapshot";
import { findExercise, type Session } from "@/domain/workouts";
export async function workoutPoster(
  snapshot: Snapshot,
  session: Session,
): Promise<Blob> {
  const logo = new Image();
  logo.src = "/assets/hercules-logo-v1.jpg";
  await logo.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo crear la imagen.");
  const gradient = context.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, "#111621");
  gradient.addColorStop(0.55, "#090b10");
  gradient.addColorStop(1, "#321b18");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1920);
  const text = (
    value: string,
    x: number,
    y: number,
    size = 32,
    color = "#f5f7fb",
  ) => {
    context.fillStyle = color;
    context.font = `700 ${size}px system-ui`;
    context.fillText(value, x, y);
  };
  const fit = (
    value: string,
    x: number,
    y: number,
    width: number,
    size = 65,
  ) => {
    let current = size;
    context.font = `700 ${current}px system-ui`;
    while (context.measureText(value).width > width && current > 24) {
      current -= 2;
      context.font = `700 ${current}px system-ui`;
    }
    text(value, x, y, current);
  };
  const panel = (x: number, y: number, width: number, height: number) => {
    context.fillStyle = "#171d28";
    context.beginPath();
    context.roundRect(x, y, width, height, 30);
    context.fill();
  };
  context.drawImage(logo, 76, 74, 96, 96);
  text("HERCULES", 196, 135, 42);
  text("MI ENTRENAMIENTO", 76, 235, 28, "#ff8a4c");
  fit(session.day, 76, 340, 928, 86);
  fit(session.routine, 76, 405, 928, 37);
  text(
    new Date(session.date).toLocaleDateString(
      localeFor(snapshot.settings.language),
      { day: "numeric", month: "long", year: "numeric" },
    ),
    76,
    470,
    29,
    "#a7b0c1",
  );
  const exercises =
      session.exercises?.filter(
        (exercise) => exercise.sets || exercise.performedSets?.length,
      ) ?? [],
    sets = exercises.reduce(
      (sum, exercise) =>
        sum + (exercise.performedSets?.length ?? exercise.sets ?? 0),
      0,
    );
  panel(76, 535, 450, 190);
  panel(554, 535, 450, 190);
  text(String(exercises.length), 108, 627, 76, "#ff8a4c");
  text("EJERCICIOS", 108, 686, 25);
  text(String(sets), 586, 627, 76, "#54d68b");
  text("SERIES REGISTRADAS", 586, 686, 25);
  text("ASÍ ENTRENÉ", 76, 805, 30, "#a7b0c1");
  exercises.slice(0, 8).forEach((exercise, index) => {
    const y = 847 + index * 108;
    panel(76, y, 928, 94);
    text(String(index + 1).padStart(2, "0"), 98, y + 59, 29, "#ff8a4c");
    fit(
      findExercise(snapshot, exercise.id)?.name ?? exercise.id,
      165,
      y + 36,
      805,
      30,
    );
    const best = [...(exercise.performedSets ?? [])].sort(
      (a, b) =>
        (b.kg ?? 0) - (a.kg ?? 0) ||
        (b.reps ?? b.seconds ?? 0) - (a.reps ?? a.seconds ?? 0),
    )[0];
    text(
      `${exercise.performedSets?.length ?? exercise.sets ?? 0} series${best ? ` · ${best.kg ?? 0} ${session.weightUnit ?? "kg"} × ${best.seconds != null ? `${best.seconds} s` : `${best.reps} reps`}` : ""}`,
      165,
      y + 73,
      25,
      "#a7b0c1",
    );
  });
  context.drawImage(logo, 76, 1829, 48, 48);
  text("HERCULES", 136, 1865, 30);
  text("Mi progreso, a mi ritmo.", 340, 1865, 26, "#a7b0c1");
  return await new Promise<Blob>((accept, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? accept(blob) : reject(new Error("No se pudo crear la imagen.")),
      "image/png",
    ),
  );
}
export async function shareWorkoutPoster(
  snapshot: Snapshot,
  session: Session,
): Promise<void> {
  const blob = await workoutPoster(snapshot, session),
    file = new File([blob], "hercules-entrenamiento.png", {
      type: "image/png",
    });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "HERCULES" });
    return;
  }
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
