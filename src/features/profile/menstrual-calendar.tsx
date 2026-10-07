"use client";
import { useState } from "react";
import { Switch } from "@base-ui/react/switch";
import { Button } from "@/components/ui/button";
import { useApp } from "@/state/app-provider";
import { localeFor } from "@/data/translations";

type Value = { enabled?: boolean; dates?: string[] };
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function MenstrualCalendar({
  value,
  onChange,
}: {
  value?: Value;
  onChange: (value: Value) => void;
}) {
  const { t, snapshot } = useApp();
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const dates = value?.dates ?? [];
  const locale = localeFor(snapshot.settings.language);
  const today = dateKey(new Date());
  const offset = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return (
    <section
      className="menstrual-calendar"
      aria-label={t("Calendario menstrual", "Menstrual calendar")}
    >
      <div className="menstrual-calendar-control">
        <strong id="menstrual-calendar-label">
          {t("Calendario menstrual", "Menstrual calendar")}
        </strong>
        <Switch.Root
          render={<button type="button" />}
          className="routine-switch"
          aria-labelledby="menstrual-calendar-label"
          checked={value?.enabled === true}
          onCheckedChange={(enabled) => onChange({ enabled })}
        >
          <Switch.Thumb className="routine-switch-thumb" />
        </Switch.Root>
      </div>
      {value?.enabled && (
        <details className="menstrual-calendar-details" open>
          <summary>{t("Calendario menstrual", "Menstrual calendar")}</summary>
          <div className="space-y-3 pt-3">
            <p className="text-sm text-muted-foreground">
              {t(
                "Marcá los días en los que tuviste sangrado menstrual. Tocá de nuevo para quitar una fecha y guardá los cambios del perfil.",
                "Mark days with menstrual bleeding. Tap again to remove a date, then save your profile changes.",
              )}
            </p>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="secondary"
                aria-label={t("Mes anterior", "Previous month")}
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              >
                ‹
              </Button>
              <strong className="text-center">
                {month.toLocaleDateString(locale, {
                  month: "long",
                  year: "numeric",
                })}
              </strong>
              <Button
                type="button"
                variant="secondary"
                aria-label={t("Mes siguiente", "Next month")}
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              >
                ›
              </Button>
            </div>
            <div className="menstrual-days">
              {Array.from({ length: 7 }, (_, index) => (
                <small key={`weekday-${index}`}>
                  {new Date(2026, 0, 5 + index).toLocaleDateString(locale, {
                    weekday: "short",
                  })}
                </small>
              ))}
              {Array.from({ length: offset }, (_, index) => (
                <span key={`blank-${index}`} />
              ))}
              {Array.from({ length: days }, (_, index) => {
                const date = new Date(
                  month.getFullYear(),
                  month.getMonth(),
                  index + 1,
                );
                const key = dateKey(date);
                const selected = dates.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={key > today}
                    aria-pressed={selected}
                    aria-label={date.toLocaleDateString(locale, {
                      dateStyle: "long",
                    })}
                    onClick={() =>
                      onChange({
                        dates: selected
                          ? dates.filter((day) => day !== key)
                          : [...dates, key].sort(),
                      })
                    }
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              {t(
                "Las fechas quedan en tu cuenta y no se incluyen al compartir rutinas. Desactivar el calendario conserva el registro.",
                "Dates stay in your account and are excluded from shared routines. Turning off the calendar keeps your records.",
              )}
            </p>
            {dates.length > 0 && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (
                    confirm(
                      t(
                        "¿Eliminar todas las fechas registradas? Guardá los cambios para confirmar la eliminación.",
                        "Delete all recorded dates? Save your changes to confirm removal.",
                      ),
                    )
                  )
                    onChange({ dates: [] });
                }}
              >
                {t("Borrar registro menstrual", "Clear menstrual records")}
              </Button>
            )}
          </div>
        </details>
      )}
    </section>
  );
}
