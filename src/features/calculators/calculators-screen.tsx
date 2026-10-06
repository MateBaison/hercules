"use client";
import { useState } from "react";
import { useApp } from "@/state/app-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const { snapshot } = useApp(),
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
            {label}
          </button>
        ))}
      </div>
      <section className="panel">
        <h2>
          {section === "calories"
            ? "Calculadora de calorías"
            : section === "macros"
              ? "Calculadora de macros"
              : section === "maximum"
                ? "Una repetición máxima"
                : "Estimación de objetivo de peso"}
        </h2>
        <div className="form-grid">
          {(section === "calories" || section === "goal") && (
            <>
              <label>
                Sexo
                <select
                  value={sex}
                  onChange={(event) =>
                    setSex(event.target.value === "female" ? "female" : "male")
                  }
                >
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                </select>
              </label>
              <label>
                Edad
                <Input
                  type="number"
                  value={age}
                  onChange={(event) => setAge(Number(event.target.value))}
                />
              </label>
              <label>
                Peso ({units.weight ?? "kg"})
                <Input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(event) => setWeight(Number(event.target.value))}
                />
              </label>
              <label>
                Altura ({units.height ?? "cm"})
                <Input
                  type="number"
                  step="0.1"
                  value={height}
                  onChange={(event) => setHeight(Number(event.target.value))}
                />
              </label>
              <label>
                Actividad
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
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {section === "goal" && (
                <label>
                  Peso deseado ({units.weight ?? "kg"})
                  <Input
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
                Objetivo diario (kcal)
                <Input
                  type="number"
                  value={calories}
                  onChange={(event) => setCalories(Number(event.target.value))}
                />
              </label>
              <label>
                Comidas por día
                <Input
                  type="number"
                  value={meals}
                  onChange={(event) => setMeals(Number(event.target.value))}
                />
              </label>
              <label>
                Distribución
                <select
                  value={split}
                  onChange={(event) =>
                    setSplit(event.target.value as typeof split)
                  }
                >
                  <option value="balanced">Equilibrada</option>
                  <option value="protein">Alta en proteína</option>
                  <option value="lowerCarb">Menos carbohidratos</option>
                  <option value="keto">Cetogénica</option>
                </select>
              </label>
            </>
          )}
          {section === "maximum" && (
            <>
              <label>
                Peso levantado ({units.weight ?? "kg"})
                <Input
                  type="number"
                  step="0.1"
                  value={load}
                  onChange={(event) => setLoad(Number(event.target.value))}
                />
              </label>
              <label>
                Repeticiones (1–10)
                <Input
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
              label="Bajar de peso"
              value={
                targets.loss < 1200
                  ? "Consultar con un profesional"
                  : `${targets.loss} kcal/día`
              }
            />
            <Result
              color="maintain"
              label="Mantenerse"
              value={`${targets.maintenance} kcal/día`}
            />
            <Result
              color="gain"
              label="Subir de peso"
              value={`${targets.gain} kcal/día`}
            />
          </div>
        )}
        {section === "macros" && macros && (
          <>
            <Result
              color="maintain"
              label="Objetivo diario"
              value={`${calories} kcal`}
            />
            <div className="result-grid">
              <Result
                color="carbs"
                label="Carbohidratos"
                value={`${macros.daily.carbs} g`}
              />
              <Result
                color="protein"
                label="Proteínas"
                value={`${macros.daily.protein} g`}
              />
              <Result
                color="fat"
                label="Grasas"
                value={`${macros.daily.fat} g`}
              />
            </div>
            <div className="result-card">
              <h3>Por comida · {meals} comidas</h3>
              <p>
                {macros.perMeal.calories} kcal · {macros.perMeal.carbs} g
                carbohidratos · {macros.perMeal.protein} g proteínas ·{" "}
                {macros.perMeal.fat} g grasas
              </p>
              <small>
                Reparto equivalente orientativo; no hace falta que todas las
                comidas sean iguales.
              </small>
            </div>
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
                label="Rango orientativo, no una fecha garantizada"
                value={`${goal.fastWeeks}–${goal.slowWeeks} semanas`}
              />
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Peso ({units.weight ?? "kg"})</th>
                      <th>Semanas</th>
                      <th>Ingesta estimada</th>
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
                El rango usa un cambio semanal gradual del peso; no predice
                cuánto será grasa o músculo. La actividad, adherencia, salud y
                retención de líquidos pueden cambiar el resultado.
              </p>
            </>
          ))}
        <p className="mt-5 text-sm text-muted-foreground">
          Estimaciones para adultos, no indicaciones médicas. Hacé ajustes y
          chequeos cada 2–3 semanas según la evolución real. Si tenés una
          condición de salud, embarazo o antecedentes de trastornos
          alimentarios, consultá con un profesional.
        </p>
      </section>
    </>
  );
}
function Result({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className={`result-card result-${color}`}>
      <h3>{label}</h3>
      <strong>{value}</strong>
    </div>
  );
}
