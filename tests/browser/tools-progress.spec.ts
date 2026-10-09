import { expect, test } from "@playwright/test";
import { login } from "./login-helper";
test.beforeEach(async ({ page }) => {
  await page.request.get("http://127.0.0.1:54329/__reset");
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await login(page);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Herramientas", exact: true })
    .click();
});
test("clocks persist through navigation, combat works and GPS preparation records a route", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(page.getByRole("timer", { name: "Cronómetro" })).not.toHaveText(
    "00:00",
  );
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Inicio", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Herramientas", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pausar", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await page.getByRole("button", { name: "Timer", exact: true }).click();
  await page.getByRole("button", { name: "15seg", exact: true }).click();
  await expect(page.getByRole("timer", { name: "Timer" })).toHaveText("00:15");
  await page.getByRole("button", { name: "Combate", exact: true }).click();
  await page.getByLabel("Rondas", { exact: true }).fill("1");
  await page.getByLabel("Trabajo (seg)", { exact: true }).fill("2");
  await page.getByLabel("Preparación (seg)", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(
    page.getByText("Sesión terminada", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: `artifacts/combat-${info.project.name}.png`,
    fullPage: true,
  });
  // Browser-local GPS simulation: physical device/location permissions are a release check.
  await page.evaluate(() => {
    let active = false;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        watchPosition: (success: (value: unknown) => void) => {
          active = true;
          success({ coords: { latitude: 52, longitude: 13, speed: 0 } });
          window.addEventListener("test-position", () => {
            if (active)
              success({
                coords: { latitude: 52.001, longitude: 13, speed: 0 },
              });
          });
          return 1;
        },
        clearWatch: () => {
          active = false;
        },
      },
    });
  });
  await page.getByRole("button", { name: "Tracking", exact: true }).click();
  await page.getByLabel("Preparación inicial (seg)").fill("1");
  await page.getByRole("button", { name: "Iniciar GPS", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Finalizar", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("test-position")));
  await expect
    .poll(() => page.locator(".route-map polyline").getAttribute("points"))
    .not.toBe("");
  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("four calculators expose colored results and a weight-goal range", async ({
  page,
}, info) => {
  await page.getByRole("button", { name: "Calculadoras", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Sexo", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Objetivo", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Calcular calorías", exact: true })
    .click();
  await expect(page.locator(".result-grid .result-card")).toHaveCount(3);
  for (const color of ["loss", "maintain", "gain"]) {
    if (color !== "loss")
      await page.getByRole("button", { name: "Calorías", exact: true }).click();
    const target = page.locator(`.result-${color}`);
    const amount = (await target.locator("strong").innerText()).match(
      /\d+/,
    )![0]!;
    await target.click();
    await expect(page.getByLabel("Objetivo diario (kcal)")).toHaveValue(amount);
  }
  await page.getByRole("button", { name: "Macros", exact: true }).click();
  await page
    .getByRole("button", { name: "Calcular macros", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Por comida · 3 comidas" }),
  ).toBeVisible();
  await expect(page.locator(".result-protein").first()).toBeVisible();
  await expect(page.locator(".macro-meal-results .result-card")).toHaveCount(4);
  await expect(
    page.locator(".macro-meal-results .result-protein"),
  ).toContainText("g");
  await page.screenshot({
    path: `artifacts/macros-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Una repetición máxima", exact: true })
    .click();
  await page.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.locator(".result-gain")).toContainText("58.3 kg");
  await page
    .getByRole("button", { name: "Objetivo de peso", exact: true })
    .click();
  await page.getByLabel("Peso deseado (kg)", { exact: true }).fill("70");
  await page.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await expect(
    page.getByText("Rango orientativo, no una fecha garantizada"),
  ).toBeVisible();
  await page.screenshot({
    path: `artifacts/calculators-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("progress renders empty-state analytics without removed time totals", async ({
  page,
}, info) => {
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Progreso", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Avances recientes" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Meta semanal (opcional)", exact: true })
    .selectOption("3");
  await page
    .getByRole("combobox", { name: "Período", exact: true })
    .selectOption("8");
  await expect(page.locator("table thead th")).toHaveCount(9);
  await expect(
    page.getByRole("img", { name: /Series por grupo muscular/ }),
  ).toBeVisible();
  await expect(page.getByText("minutos totales", { exact: false })).toHaveCount(
    0,
  );
  await page.screenshot({
    path: `artifacts/progress-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("numeric settings allow clearing and replacing the whole value", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Combate", exact: true }).click();
  const rounds = page.getByLabel("Rondas", { exact: true });
  await rounds.fill("");
  await expect(rounds).toHaveValue("");
  await rounds.fill("3");
  await expect(rounds).toHaveValue("3");
  await page.getByLabel("Trabajo (seg)", { exact: true }).click();
  await expect(rounds).toHaveValue("3");
  await rounds.fill("");
  await page.getByLabel("Trabajo (seg)", { exact: true }).click();
  await expect(rounds).toHaveValue("3");
  await page.getByRole("button", { name: "Tracking", exact: true }).click();
  const prep = page.getByLabel("Preparación inicial (seg)", { exact: true });
  await prep.fill("");
  await expect(prep).toHaveValue("");
  await prep.fill("3");
  await expect(prep).toHaveValue("3");
  await page.getByRole("button", { name: "Calculadoras", exact: true }).click();
  const age = page.getByLabel("Edad", { exact: true });
  await age.fill("");
  await expect(age).toHaveValue("");
  await age.fill("33");
  await expect(age).toHaveValue("33");
});
test("timer plays its end signal once", async ({ page }) => {
  await page.evaluate(() => {
    const counted = window as typeof window & { timerTones: number };
    counted.timerTones = 0;
    const original = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (when?: number) {
      counted.timerTones++;
      original.call(this, when);
    };
  });
  await page.getByRole("button", { name: "Timer", exact: true }).click();
  await page.getByRole("button", { name: "15seg", exact: true }).click();
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(page.getByRole("timer", { name: "Timer" })).toHaveText("00:00", {
    timeout: 20_000,
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as typeof window & { timerTones: number }).timerTones,
      ),
    )
    .toBe(3);
  await page.waitForTimeout(500);
  expect(
    await page.evaluate(
      () => (window as typeof window & { timerTones: number }).timerTones,
    ),
  ).toBe(3);
});

test("timer duration can be edited from the clock", async ({ page }) => {
  await page.getByRole("button", { name: "Timer", exact: true }).click();
  await page.getByRole("button", { name: "Editar tiempo del timer" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Minutos", { exact: true }).fill("2");
  await dialog.getByLabel("Segundos", { exact: true }).fill("45");
  await dialog.getByRole("button", { name: "Guardar tiempo" }).click();
  await expect(page.getByRole("timer", { name: "Timer" })).toHaveText("02:45");
  await page.getByRole("button", { name: "Editar tiempo del timer" }).click();
  await dialog.getByLabel("Minutos", { exact: true }).fill("0");
  await dialog.getByLabel("Segundos", { exact: true }).fill("0");
  await expect(
    dialog.getByRole("button", { name: "Guardar tiempo" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("timer", { name: "Timer" })).toHaveText("02:45");
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(page.getByRole("timer", { name: "Timer" })).not.toHaveText(
    "02:45",
  );
});

test("running clocks request screen wake lock and release it when paused", async ({
  page,
}) => {
  await page.evaluate(() => {
    const state = { requests: 0, releases: 0, deny: false };
    Object.assign(window, { wakeLockTest: state });
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: {
        request: async () => {
          state.requests++;
          if (state.deny)
            throw new DOMException("Battery policy", "NotAllowedError");
          const sentinel = Object.assign(new EventTarget(), {
            released: false,
            release: async () => {
              if (!sentinel.released) {
                sentinel.released = true;
                state.releases++;
                sentinel.dispatchEvent(new Event("release"));
              }
            },
          });
          return sentinel;
        },
      },
    });
  });
  const counts = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            wakeLockTest: { requests: number; releases: number; deny: boolean };
          }
        ).wakeLockTest,
    );
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect.poll(async () => (await counts()).requests).toBe(1);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Inicio", exact: true })
    .click();
  expect((await counts()).releases).toBe(0);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Herramientas", exact: true })
    .click();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await expect.poll(async () => (await counts()).releases).toBe(1);
  await page.evaluate(() => {
    (
      window as unknown as { wakeLockTest: { deny: boolean } }
    ).wakeLockTest.deny = true;
  });
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect.poll(async () => (await counts()).requests).toBe(2);
  await expect(
    page.getByRole("button", { name: "Pausar", exact: true }),
  ).toBeVisible();
});
