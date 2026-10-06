"use client";
import { useState } from "react";
import { ClocksScreen } from "./clocks-screen";
import { CalculatorsScreen } from "@/features/calculators/calculators-screen";
import { useApp } from "@/state/app-provider";
export function ToolsScreen() {
  const [section, setSection] = useState("clocks"),
    { t } = useApp();
  return (
    <>
      <p className="page-description">
        {t(
          "Relojes, tracking y calculadoras.",
          "Clocks, tracking and calculators.",
        )}
      </p>
      <div className="muscle-chips">
        <button
          aria-pressed={section === "clocks"}
          onClick={() => setSection("clocks")}
        >
          {t("Reloj", "Clock")}
        </button>
        <button
          aria-pressed={section === "calculators"}
          onClick={() => setSection("calculators")}
        >
          {t("Calculadoras", "Calculators")}
        </button>
      </div>
      {section === "clocks" ? <ClocksScreen /> : <CalculatorsScreen />}
    </>
  );
}
