import { expect, test } from "@playwright/test";
import { login } from "./login-helper";
import { readFile } from "node:fs/promises";
test.beforeEach(async ({ page }) => {
  await page.request.get("http://127.0.0.1:54329/__reset");
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await login(page);
});
test("workout autosave, image dialog, rest across navigation, finish and calendar editing", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page
    .getByRole("button", { name: "Iniciar entrenamiento", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Rutina principal · Pecho y tríceps/ })
    .click();
  await expect(page).toHaveURL(/\/workout$/);
  await page.getByLabel("Peso 1 serie 1", { exact: true }).fill("20");
  await page.getByLabel("Repeticiones 1 serie 1", { exact: true }).fill("12");
  await page
    .getByLabel("Nota ejercicio 1", { exact: true })
    .fill("Controlar la bajada");
  await page.screenshot({
    path: `artifacts/workout-${info.project.name}.png`,
    animations: "disabled",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem(
            "mrgymson-user-11111111-1111-4111-8111-111111111111",
          ) ?? "{}",
        ).workout.entries[0].sets[0].reps,
    ),
  ).toBe(12);
  await page
    .getByRole("button", {
      name: "Ampliar Press de banca con barra",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog").locator("img")).toBeVisible();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await page.getByLabel("Descanso entre series", { exact: true }).check();
  await page.getByLabel("Segundos", { exact: true }).fill("15");
  await page
    .getByRole("button", { name: "Iniciar descanso", exact: true })
    .click();
  await page.getByRole("link", { name: "HERCULES — volver al inicio" }).click();
  await expect(page.locator(".active-workout")).toHaveCount(1);
  await page.getByRole("link", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Omitir descanso", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Repeticiones 1 serie 1", { exact: true }),
  ).toHaveValue("12");
  await page
    .getByRole("button", { name: "Finalizar entrenamiento", exact: true })
    .click();
  await expect(page.locator(".training-colors button")).toHaveCount(7);
  await expect(page.locator('input[type="color"]')).toHaveCount(0);
  await page.screenshot({
    path: `artifacts/training-colors-${info.project.name}.png`,
    animations: "disabled",
  });
  await page
    .getByLabel("Comentario del entrenamiento", { exact: true })
    .fill("Buen entrenamiento");
  await page
    .getByRole("button", { name: "Guardar entrenamiento", exact: true })
    .click();
  await expect(page).toHaveURL(/\/home$/);
  const today = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const day = page.locator(`[data-calendar-date="${today}"]`);
  const box = await day.boundingBox();
  expect(Math.abs(box!.width - box!.height)).toBeLessThan(2);
  const darker = await day.evaluate((el) => {
    const dot = el.querySelector("i")!;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    function brightness(css: string) {
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return r! + g! + b!;
    }
    return (
      brightness(getComputedStyle(dot).backgroundColor) <
      brightness(getComputedStyle(el).backgroundColor)
    );
  });
  expect(darker).toBe(true);
  await day.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `artifacts/calendar-colors-${info.project.name}.png`,
    animations: "disabled",
  });
  await page.locator(`[data-calendar-date="${today}"]`).click();
  await page.locator(".calendar-workout summary").click();
  await expect(page.locator(".calendar-workout")).toContainText(
    "20 kg × 12 reps",
  );
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Repeticiones 1 serie 1", { exact: true }).fill("9");
  await page
    .getByRole("group", { name: "Color del calendario", exact: true })
    .getByRole("button", { name: "Azul", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Guardar entrenamiento", exact: true })
    .click();
  await page.locator(".calendar-workout summary").click();
  await expect(page.locator(".calendar-workout")).toContainText(
    "20 kg × 9 reps",
  );
  await page.getByRole("button", { name: "Copiar", exact: true }).click();
  await page.keyboard.press("Escape");
  const another = today.slice(0, 8) + (today.endsWith("01") ? "02" : "01");
  await page.locator(`[data-calendar-date="${another}"]`).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Pegar entrenamientos copiados", exact: true })
    .click();
  await expect(page.locator(".calendar-workout")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-sync-status="synced"]')).toBeVisible();
  await page.reload();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem(
            "mrgymson-user-11111111-1111-4111-8111-111111111111",
          ) ?? "{}",
        ).sessions.length,
    ),
  ).toBe(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Progreso", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Elegí un ejercicio", exact: true })
    .selectOption({ label: "Press de banca con barra" });
  await expect(
    page.getByRole("img", { name: /Repeticiones máximas por serie/ }),
  ).toBeVisible();
  // Check the PNG fallback without opening a real OS sharing dialog in headless Brave.
  await page.evaluate(() =>
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => false,
    }),
  );
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Compartir último entrenamiento",
      exact: true,
    })
    .click();
  const file = await download;
  await file.saveAs(`artifacts/poster-${info.project.name}.png`);
  const png = await readFile(`artifacts/poster-${info.project.name}.png`);
  expect(png.readUInt32BE(16)).toBe(1080);
  expect(png.readUInt32BE(20)).toBe(1920);
});
test("favorites, multiple exercise selection, touch-ready picker and routine reordering", async ({
  page,
}) => {
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Biblioteca", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ver Press de banca con barra", exact: true })
    .click();
  await page.getByRole("button", { name: "Favorito", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Favorito", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await page
    .getByRole("group", { name: "Zonas musculares" })
    .getByRole("button", { name: /Favoritos/ })
    .click();
  await expect(page.locator(".exercise-card")).toHaveCount(1);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Inicio", exact: true })
    .click();
  await page.locator(".routine-day summary").first().click();
  await page
    .getByRole("button", { name: "Agregar ejercicios", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Gemelos", exact: true }).click();
  await page
    .getByLabel("Seleccionar Elevación de gemelos de pie", { exact: true })
    .check();
  await page
    .getByLabel("Seleccionar Elevación de gemelos sentado", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Agregar seleccionados (2)", exact: true })
    .click();
  const rows = page
    .locator(".routine-day")
    .first()
    .locator("[data-routine-exercise]");
  await expect(rows).toHaveCount(5);
  const before = await rows.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-routine-exercise")),
  );
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const handle = rows.first().getByRole("button", { name: /Mover/ });
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(handle).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(
    () =>
      new Promise<void>((done) =>
        requestAnimationFrame(() => requestAnimationFrame(() => done())),
      ),
  );
  await page.keyboard.press("ArrowDown");
  await expect
    .poll(async () =>
      rows
        .first()
        .evaluate(
          (node) => new DOMMatrix(getComputedStyle(node).transform).m42,
        ),
    )
    .not.toBe(0);
  await page.keyboard.press("Space");
  await expect
    .poll(async () =>
      rows.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-routine-exercise")),
      ),
    )
    .not.toEqual(before);
  const firstHandle = rows.first().getByRole("button", { name: /Mover/ });
  await firstHandle.scrollIntoViewIfNeeded();
  const from = await firstHandle.boundingBox(),
    target = await rows.nth(1).boundingBox();
  if (!from || !target) throw new Error("Missing drag targets");
  const order = await rows.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-routine-exercise")),
  );
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await expect(firstHandle).toHaveAttribute("aria-pressed", "true");
  await page.mouse.move(target.x + 30, target.y + target.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect
    .poll(async () =>
      rows.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-routine-exercise")),
      ),
    )
    .not.toEqual(order);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("profile dirty-only saving and units remain account-linked on a second browser context", async ({
  page,
  browser,
}) => {
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Perfil", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Guardar cambios", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Nombre", { exact: true }).fill("Updated profile");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.locator('[data-sync-status="synced"]')).toBeVisible();
  const context = await browser.newContext(),
    other = await context.newPage();
  try {
    await other.route("**/*", (route) =>
      new URL(route.request().url()).hostname === "127.0.0.1"
        ? route.continue()
        : route.abort(),
    );
    await login(other);
    await other.goto("http://127.0.0.1:3010/profile");
    await expect(other.getByLabel("Nombre", { exact: true })).toHaveValue(
      "Updated profile",
    );
  } finally {
    await context.close();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
