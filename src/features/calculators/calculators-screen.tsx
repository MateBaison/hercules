"use client";
import { useState } from "react";
import { useApp } from "@/state/app-provider";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  calorieMetrics,
  calorieTargets,
  macroMetrics,
  oneRepMax,
  weightGoal,
  type CalorieInput,
  type WeightGoalResult,
} from "@/domain/calculations/calculators";

export function CalculatorsScreen() {
  const { snapshot, t } = useApp(),
    profile = snapshot.profile,
    units = snapshot.settings;
  const [section, setSection] = useState("calories"),
    [error, setError] = useState("");
  const [sex, setSex] = useState<"male" | "female">(
    profile.gender === "female" || profile.gender === "mujer"
      ? "female"
      : "male",
  );
  const [age, setAge] = useState(
    profile.birth
      ? Math.max(
          18,
          Math.floor((Date.now() - Date.parse(profile.birth)) / 31557600000),
        )
      : 30,
  );
  const [weight, setWeight] = useState(Number(profile.weight) || 75),
    [height, setHeight] = useState(
      Number(profile.height) || (units.height === "ft" ? 5.7 : 175),
    ),
    [activity, setActivity] = useState<CalorieInput["activity"]>(1.55);
  const [calories, setCalories] = useState(2200),
    [meals, setMeals] = useState(3),
    [split, setSplit] = useState<"balanced" | "protein" | "lowerCarb" | "keto">(
      "balanced",
    );
  const [load, setLoad] = useState(50),
    [reps, setReps] = useState(5),
    [target, setTarget] = useState(weight);
  const [targets, setTargets] = useState<ReturnType<
      typeof calorieTargets
    > | null>(null),
    [macros, setMacros] = useState<ReturnType<typeof macroMetrics> | null>(
      null,
    ),
    [maximum, setMaximum] = useState<number | null>(null),
    [goal, setGoal] = useState<WeightGoalResult | null>(null);
  const useCaloriesForMacros = (value: number) => {
    setCalories(value);
    setMacros(null);
    setError("");
    setSection("macros");
  };
  const input = (): CalorieInput => ({
    formula: sex,
    age,
    weightKg: weight / (units.weight === "lb" ? 2.20462 : 1),
    heightCm: height * (units.height === "ft" ? 30.48 : 1),
    activity,
  });
  const calculate = () => {
    try {
      setError("");
      if (section === "calories") {
        const result = calorieTargets(calorieMetrics(input()).maintenance);
        setTargets(result);
        setCalories(result.maintenance);
      } else if (section === "macros")
        setMacros(macroMetrics({ calories, meals, split }));
      else if (section === "maximum")
        setMaximum(oneRepMax({ weight: load, reps }));
      else
        setGoal(
          weightGoal({
            ...input(),
            targetKg: target / (units.weight === "lb" ? 2.20462 : 1),
          }),
        );
    } catch {
      setError(
        "Revisá los valores: edad 18–100, peso 25–400 kg, altura 100–250 cm; macros 1000–6000 kcal y 1–8 comidas; 1RM 1–10 repeticiones.",
      );
    }
  };
  return (
    <>
      <div className="muscle-chips">
        {[
          ["calories", "Calorías"],
          ["macros", "Macros"],
          ["maximum", "Una repetición máxima"],
          ["goal", "Objetivo de peso"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={section === key}
            onClick={() => {
              setSection(key!);
              setError("");
            }}
          >
            {t(String(label), String(label))}
          </button>
        ))}
      </div>
      <section className="panel">
        <h2>
          {section === "calories"
            ? t("Calculadora de calorías", "Calorie calculator")
            : section === "macros"
              ? t("Calculadora de macros", "Macro calculator")
              : section === "maximum"
                ? t("Una repetición máxima", "One-rep max")
                : t("Estimación de objetivo de peso", "Weight goal estimate")}
        </h2>
        <div className="form-grid">
          {(section === "calories" || section === "goal") && (
            <>
              <label>
                {t("Sexo", "Sex")}
                <select
                  value={sex}
                  onChange={(event) =>
                    setSex(event.target.value === "female" ? "female" : "male")
                  }
                >
                  <option value="male">{t("Masculino", "Male")}</option>
                  <option value="female">{t("Femenino", "Female")}</option>
                </select>
              </label>
              <label>
                {t("Edad", "Age")}
                <NumericInput
                  type="number"
                  value={age}
                  onChange={(event) => setAge(Number(event.target.value))}
                />
              </label>
              <label>
                {t("Peso (", "Weight (")}
                {units.weight ?? "kg"})
                <NumericInput
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(event) => setWeight(Number(event.target.value))}
                />
              </label>
              <label>
                {t("Altura (", "Height (")}
                {units.height ?? "cm"})
                <NumericInput
                  type="number"
                  step="0.1"
                  value={height}
                  onChange={(event) => setHeight(Number(event.target.value))}
                />
              </label>
              <label>
                {t("Actividad", "Activity")}
                <select
                  value={activity}
                  onChange={(event) =>
                    setActivity(
                      Number(event.target.value) as CalorieInput["activity"],
                    )
                  }
                >
                  {[
                    [1.2, "Sedentaria"],
                    [1.375, "Ligera"],
                    [1.55, "Moderada"],
                    [1.725, "Alta"],
                    [1.9, "Muy alta"],
                  ].map(([value, label]) => (
                    <option key={value} value={value}>
                      {t(String(label), String(label))}
                    </option>
                  ))}
                </select>
              </label>
              {section === "goal" && (
                <label>
                  {t("Peso deseado (", "Target weight (")}
                  {units.weight ?? "kg"})
                  <NumericInput
                    type="number"
                    step="0.1"
                    value={target}
                    onChange={(event) => setTarget(Number(event.target.value))}
                  />
                </label>
              )}
            </>
          )}
          {section === "macros" && (
            <>
              <label>
                {t("Objetivo diario (kcal)", "Daily target (kcal)")}
                <NumericInput
                  type="number"
                  value={calories}
                  onChange={(event) => setCalories(Number(event.target.value))}
                />
              </label>
              <label>
                {t("Comidas por día", "Meals per day")}
                <NumericInput
                  type="number"
                  value={meals}
                  onChange={(event) => setMeals(Number(event.target.value))}
                />
              </label>
              <label>
                {t("Distribución", "Distribution")}
                <select
                  value={split}
                  onChange={(event) =>
                    setSplit(event.target.value as typeof split)
                  }
                >
                  <option value="balanced">
                    {t("Equilibrada", "Balanced")}
                  </option>
                  <option value="protein">
                    {t("Alta en proteína", "High protein")}
                  </option>
                  <option value="lowerCarb">
                    {t("Menos carbohidratos", "Lower carbohydrate")}
                  </option>
                  <option value="keto">{t("Cetogénica", "Ketogenic")}</option>
                </select>
              </label>
            </>
          )}
          {section === "maximum" && (
            <>
              <label>
                {t("Peso levantado (", "Lifted weight (")}
                {units.weight ?? "kg"})
                <NumericInput
                  type="number"
                  step="0.1"
                  value={load}
                  onChange={(event) => setLoad(Number(event.target.value))}
                />
              </label>
              <label>
                {t("Repeticiones (1–10)", "Repetitions (1–10)")}
                <NumericInput
                  type="number"
                  value={reps}
                  onChange={(event) => setReps(Number(event.target.value))}
                />
              </label>
            </>
          )}
        </div>
        <Button className="mt-5" onClick={calculate}>
          {section === "calories"
            ? "Calcular calorías"
            : section === "macros"
              ? "Calcular macros"
              : "Calcular"}
        </Button>
        {error && (
          <p role="alert" className="mt-4">
            {error}
          </p>
        )}
        {section === "calories" && targets && (
          <div className="result-grid">
            <Result
              color="loss"
              label={t("Bajar de peso", "Lose weight")}
              onSelect={
                targets.loss >= 1200
                  ? () => useCaloriesForMacros(targets.loss)
                  : undefined
              }
              value={
                targets.loss < 1200
                  ? "Consultar con un profesional"
                  : `${targets.loss} kcal/día`
              }
            />
            <Result
              color="maintain"
              label={t("Mantenerse", "Maintain weight")}
              onSelect={() => useCaloriesForMacros(targets.maintenance)}
              value={`${targets.maintenance} kcal/día`}
            />
            <Result
              color="gain"
              label={t("Subir de peso", "Gain weight")}
              onSelect={() => useCaloriesForMacros(targets.gain)}
              value={`${targets.gain} kcal/día`}
            />
          </div>
        )}
        {section === "macros" && macros && (
          <>
            <Result
              color="daily"
              label={t("Objetivo diario", "Daily target")}
              value={`${calories} kcal`}
            />
            <div className="result-grid">
              <Result
                color="carbs"
                label={t("Carbohidratos", "Carbohydrates")}
                value={`${macros.daily.carbs} g`}
              />
              <Result
                color="protein"
                label={t("Proteínas", "Protein")}
                value={`${macros.daily.protein} g`}
              />
              <Result
                color="fat"
                label={t("Grasas", "Fat")}
                value={`${macros.daily.fat} g`}
              />
            </div>
            <section
              className="macro-meal-results"
              aria-labelledby="macro-meal-title"
            >
              <h3 id="macro-meal-title">
                {t("Por comida ·", "Per meal ·")} {meals}{" "}
                {t("comidas", "meals")}
              </h3>
              <Result
                color="daily"
                label={t("Calorías por comida", "Calories per meal")}
                value={`${macros.perMeal.calories} kcal`}
              />
              <div className="result-grid">
                <Result
                  color="carbs"
                  label={t(
                    "Carbohidratos por comida",
                    "Carbohydrates per meal",
                  )}
                  value={`${macros.perMeal.carbs} g`}
                />
                <Result
                  color="protein"
                  label={t("Proteínas por comida", "Protein per meal")}
                  value={`${macros.perMeal.protein} g`}
                />
                <Result
                  color="fat"
                  label={t("Grasas por comida", "Fat per meal")}
                  value={`${macros.perMeal.fat} g`}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Reparto equivalente orientativo; no hace falta que todas las comidas sean iguales.",
                  "Approximate equal portions; meals do not all need to be the same.",
                )}
              </p>
            </section>
          </>
        )}
        {section === "maximum" && maximum !== null && (
          <Result
            color="gain"
            label="1RM estimado · fórmula de Epley"
            value={`${maximum.toFixed(1)} ${units.weight ?? "kg"}`}
          />
        )}
        {section === "goal" &&
          goal &&
          (goal.kind === "message" ? (
            <p className="mt-5" role="status">
              {goal.reason === "already-at-target"
                ? "Ya estás en el peso elegido."
                : "Esta estimación no es adecuada para esos datos. Consultá con un profesional antes de reducir la ingesta."}
            </p>
          ) : (
            <>
              <Result
                color="maintain"
                label={t(
                  "Rango orientativo, no una fecha garantizada",
                  "Estimated range, not a guaranteed date",
                )}
                value={`${goal.fastWeeks}–${goal.slowWeeks} semanas`}
              />
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>
                        {t("Peso (", "Weight (")}
                        {units.weight ?? "kg"})
                      </th>
                      <th>{t("Semanas", "Weeks")}</th>
                      <th>{t("Ingesta estimada", "Estimated intake")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goal.milestones.map((milestone, index) => (
                      <tr key={index}>
                        <td>
                          {(
                            milestone.kg * (units.weight === "lb" ? 2.20462 : 1)
                          ).toFixed(1)}
                        </td>
                        <td>
                          {milestone.fastWeeks}–{milestone.slowWeeks}
                        </td>
                        <td>
                          {milestone.calories < 1200
                            ? "Consultar"
                            : `${milestone.calories} kcal/día`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                {t(
                  "El rango usa un cambio semanal gradual del peso; no predice cuánto será grasa o músculo. La actividad, adherencia, salud y retención de líquidos pueden cambiar el resultado.",
                  "The range uses gradual weekly weight change; it does not predict how much will be fat or muscle. Activity, adherence, health and water retention can affect the result.",
                )}
              </p>
            </>
          ))}
        <p className="mt-5 text-sm text-muted-foreground">
          {t(
            "Estimaciones para adultos, no indicaciones médicas. Hacé ajustes y chequeos cada 2–3 semanas según la evolución real. Si tenés una condición de salud, embarazo o antecedentes de trastornos alimentarios, consultá con un profesional.",
            "Estimates for adults, not medical prescriptions. Review and adjust every 2–3 weeks based on actual changes. Consult a professional if you have a health condition, are pregnant or have a history of eating disorders.",
          )}
        </p>
      </section>
    </>
  );
}
function Result({
  color,
  label,
  value,
  onSelect,
}: {
  color: string;
  label: string;
  value: string;
  onSelect?: () => void;
}) {
  const { t } = useApp();
  const translatedLabel = t(label, label);
  if (onSelect)
    return (
      <button
        type="button"
        className={`result-card result-${color} result-action`}
        onClick={onSelect}
        aria-label={`${translatedLabel}: ${value}. ${t("Usar en macros", "Use for macros")}`}
      >
        <h3>{translatedLabel}</h3>
        <strong>{value}</strong>
        <small className="mt-2 block">
          {t("Usar en macros →", "Use for macros →")}
        </small>
      </button>
    );
  return (
    <div className={`result-card result-${color}`}>
      <h3>{translatedLabel}</h3>
      <strong>{value}</strong>
    </div>
  );
}
