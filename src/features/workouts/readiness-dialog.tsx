"use client";
import { useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { useApp } from "@/state/app-provider";
import {
  workoutReadinessAdvice,
  type WorkoutReadiness,
} from "@/domain/workout-readiness";
export function ReadinessDialog({
  open,
  onClose,
  onStart,
}: {
  open: boolean;
  onClose: () => void;
  onStart: () => void;
}) {
  const { t } = useApp();
  const [pain, setPain] = useState<WorkoutReadiness["pain"]>("none");
  const [energy, setEnergy] = useState<WorkoutReadiness["energy"]>("good");
  const [sleep, setSleep] = useState<WorkoutReadiness["sleep"]>("good");
  const [review, setReview] = useState(false);
  const advice = workoutReadinessAdvice({ pain, energy, sleep });
  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={t("¿Cómo te sentís hoy?", "How are you feeling today?")}
      description={t(
        "Chequeo opcional antes de entrenar. Las sugerencias dependen de cómo te sentís hoy, no de la fase del ciclo.",
        "Optional pre-workout check. Suggestions depend on how you feel today, not your cycle phase.",
      )}
    >
      {!review ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setReview(true);
          }}
          className="space-y-4"
        >
          <label className="block">
            {t("Dolor o molestias", "Pain or discomfort")}
            <select
              value={pain}
              onChange={(event) =>
                setPain(event.target.value as WorkoutReadiness["pain"])
              }
            >
              <option value="none">{t("Sin molestias", "None")}</option>
              <option value="mild">
                {t("Molestias leves", "Mild discomfort")}
              </option>
              <option value="strong">
                {t("Dolor intenso", "Severe pain")}
              </option>
            </select>
          </label>
          <label className="block">
            {t("Energía", "Energy")}
            <select
              value={energy}
              onChange={(event) =>
                setEnergy(event.target.value as WorkoutReadiness["energy"])
              }
            >
              <option value="good">
                {t("Me siento con energía", "I feel energetic")}
              </option>
              <option value="low">
                {t("Estoy con poca energía", "Low energy")}
              </option>
            </select>
          </label>
          <label className="block">
            {t("Sueño", "Sleep")}
            <select
              value={sleep}
              onChange={(event) =>
                setSleep(event.target.value as WorkoutReadiness["sleep"])
              }
            >
              <option value="good">{t("Dormí bien", "Slept well")}</option>
              <option value="poor">{t("Dormí mal", "Slept poorly")}</option>
            </select>
          </label>
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onStart}>
              {t("Omitir e iniciar", "Skip and start")}
            </Button>
            <Button type="submit">
              {t("Ver recomendación", "View suggestion")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div
            className="rounded-2xl border border-border bg-secondary p-4"
            role="status"
          >
            <strong>
              {advice === "usual"
                ? t(
                    "Podés seguir tu sesión habitual",
                    "Continue your usual session",
                  )
                : advice === "lighter"
                  ? t(
                      "Considerá una sesión más liviana",
                      "Consider a lighter session",
                    )
                  : t("Priorizá tu bienestar", "Prioritize your wellbeing")}
            </strong>
            <p className="mt-2">
              {advice === "usual"
                ? t(
                    "Si el calentamiento se siente bien, seguí tu entrenamiento previsto y ajustá según tus sensaciones.",
                    "If your warm-up feels good, follow your planned workout and adjust based on how you feel.",
                  )
                : advice === "lighter"
                  ? t(
                      "Probá bajar la carga hasta que resulte cómoda, hacer menos series o descansar más entre ellas. Si las molestias aumentan, detené el ejercicio.",
                      "Try a comfortable lighter load, fewer sets or longer rests. Stop exercising if discomfort increases.",
                    )
                  : t(
                      "Con dolor intenso, no fuerces el entrenamiento. Descansá y consultá a un profesional de salud, especialmente si el dolor es nuevo, empeora o te impide tus actividades habituales.",
                      "With severe pain, do not push through training. Rest and seek medical advice, especially if pain is new, worsening or affects daily activities.",
                    )}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {t(
              "La recomendación no modifica tu rutina ni tus pesos guardados. Estas respuestas no se guardan.",
              "This suggestion does not change your routine or saved weights. Your answers are not saved.",
            )}
          </p>
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReview(false)}
            >
              {t("Cambiar respuestas", "Edit answers")}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              {t("Volver al inicio", "Back to home")}
            </Button>
            {advice !== "rest" && (
              <Button type="button" onClick={onStart}>
                {t("Iniciar entrenamiento", "Start workout")}
              </Button>
            )}
          </div>
        </div>
      )}
    </AppDialog>
  );
}
