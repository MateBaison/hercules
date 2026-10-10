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
  await page
    .getByRole("button", { name: "Tipo de serie 1 serie 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ayuda sobre tipos de serie" })
    .click();
  await expect(page.getByText(/Usá una carga liviana/)).toBeVisible();
  await page.getByRole("button", { name: /Descendente/ }).click();
  await expect(
    page.getByRole("button", { name: "Tipo de serie 1 serie 1", exact: true }),
  ).toHaveText("D");
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
  await page
    .getByRole("switch", { name: "Descanso entre series", exact: true })
    .check();
  await page.getByLabel("Segundos", { exact: true }).fill("15");
  await page.screenshot({
    path: `artifacts/set-types-${info.project.name}.png`,
    fullPage: true,
  });
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
  await page.getByRole("button", { name: "Muy bien", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Adjuntar fotos", exact: true }),
  ).toBeVisible();
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
  await expect(page.locator(".calendar-workout summary")).toContainText("🤩");
  await expect(page.locator(".calendar-workout summary")).toContainText(
    /Tiempo: (?:\d+ h )?\d+ min/,
  );
  await expect(page.locator(".calendar-workout summary")).toContainText(
    /Volumen: [\d.,\s]+ kg/,
  );
  await page.screenshot({
    path: `artifacts/calendar-summary-${info.project.name}.png`,
    animations: "disabled",
  });
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
  await expect(page.locator('[data-sync-status="synced"]')).toBeAttached();
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
test("personal record highlights appear while logging and remain in the calendar", async ({
  page,
}, info) => {
  if (info.project.name === "mobile")
    await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => {
    const key = "mrgymson-user-11111111-1111-4111-8111-111111111111";
    const snapshot = JSON.parse(localStorage.getItem(key)!);
    const id = snapshot.routines[0].days[0].items[0];
    snapshot.sessions = [
      {
        id: "previous-record",
        date: new Date(Date.now() - 86400000).toISOString(),
        routine: "R",
        day: "D",
        weightUnit: "kg",
        exercises: [{ id, performedSets: [{ kg: 20, reps: 10 }] }],
      },
    ];
    localStorage.setItem(key, JSON.stringify(snapshot));
    const metaKey = key + ":sync-meta-v1";
    const meta = JSON.parse(localStorage.getItem(metaKey)!);
    localStorage.setItem(metaKey, JSON.stringify({ ...meta, pending: true }));
  });
  await page.reload();
  await expect(page.locator('[data-sync-status="synced"]')).toBeAttached();
  await page
    .getByRole("button", { name: "Iniciar entrenamiento", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Rutina principal · Pecho y tríceps/ })
    .click();
  await page.getByLabel("Peso 1 serie 1", { exact: true }).fill("20");
  await page.getByLabel("Repeticiones 1 serie 1", { exact: true }).fill("10");
  await expect(page.locator(".personal-record-row")).toHaveCount(0);
  await page.getByLabel("Repeticiones 1 serie 1", { exact: true }).fill("12");
  await expect(page.locator(".personal-record-row")).toHaveCount(1);
  await expect(page.locator(".personal-record-row")).toContainText(
    "Nuevo récord",
  );
  const fits = await page
    .locator(".set-grid-heading")
    .first()
    .evaluate((element) => {
      const labels = element.querySelectorAll("span");
      return [labels[0], labels[labels.length - 1]].every(
        (label) => label && label.scrollWidth <= label.clientWidth,
      );
    });
  expect(fits).toBe(true);
  await page.screenshot({
    path: `artifacts/record-layout-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Finalizar entrenamiento", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Guardar entrenamiento", exact: true })
    .click();
  await expect(page).toHaveURL(/\/home$/);
  await page.reload();
  const today = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  await page.locator(`[data-calendar-date="${today}"]`).click();
  await page.locator(".calendar-workout summary").click();
  await expect(page.locator(".personal-record-history")).toHaveCount(1);
  await expect(page.locator(".personal-record-history")).toContainText(
    "Nuevo récord",
  );
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
  await expect(page.locator('[data-sync-status="synced"]')).toBeAttached();
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

test("profile birth date and country fields fit without overlap on phones and desktop", async ({
  page,
}, info) => {
  await page.goto("/profile");
  for (const width of [320, 390, 480, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const birth = await page
      .getByLabel("Fecha de nacimiento", { exact: true })
      .boundingBox();
    const country = await page
      .getByLabel("País", { exact: true })
      .boundingBox();
    expect(birth).not.toBeNull();
    expect(country).not.toBeNull();
    expect(
      birth!.y + birth!.height <= country!.y ||
        birth!.x + birth!.width <= country!.x,
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 390)
      await page.screenshot({
        path: `artifacts/profile-spacing-${info.project.name}.png`,
        fullPage: true,
      });
  }
});
test("profile photos can be cropped, cancelled and removed with persisted saves", async ({
  page,
}, info) => {
  await page.goto("/profile");
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 120;
    canvas.height = 80;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 60, 80);
    ctx.fillStyle = "blue";
    ctx.fillRect(60, 0, 60, 80);
    return canvas.toDataURL("image/png").split(",")[1]!;
  });
  const fixture = {
    name: "profile.png",
    mimeType: "image/png",
    buffer: Buffer.from(encoded, "base64"),
  };
  await page.getByLabel("Cambiar foto", { exact: true }).setInputFiles(fixture);
  await expect(
    page.getByRole("dialog", { name: "Recortar y ajustar foto" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Guardar cambios", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Cambiar foto", { exact: true }).setInputFiles(fixture);
  const zoom = page.getByRole("slider", { name: "Zoom de la foto" });
  await zoom.focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowRight");
  await page
    .getByRole("slider", { name: "Posición horizontal de la foto" })
    .focus();
  await page.keyboard.press("End");
  await page.screenshot({
    path: `artifacts/profile-crop-${info.project.name}.png`,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Usar esta foto", exact: true })
    .click();
  const photo = page.getByRole("img", { name: "Foto de perfil", exact: true });
  await expect(photo).toBeVisible();
  const cropped = await photo.evaluate(async (element) => {
    const image = element as HTMLImageElement;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0, 1, 1);
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      pixel: Array.from(ctx.getImageData(0, 0, 1, 1).data),
    };
  });
  expect(cropped.width).toBe(360);
  expect(cropped.height).toBe(360);
  expect(cropped.pixel[2]!).toBeGreaterThan(200);
  expect(cropped.pixel[0]!).toBeLessThan(40);
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.locator('[data-sync-status="synced"]')).toBeAttached();
  await page.reload();
  await expect(photo).toBeVisible();
  expect(
    await page
      .getByRole("button", { name: "Elegir foto", exact: true })
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/profile-photo-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Eliminar foto", exact: true })
    .click();
  await expect(photo).toHaveCount(0);
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.locator('[data-sync-status="synced"]')).toBeAttached();
  await page.reload();
  await expect(photo).toHaveCount(0);
});

test("menstrual calendar is optional and dates persist", async ({
  page,
}, info) => {
  await page.goto("/profile");
  const calendar = page.getByRole("region", { name: "Calendario menstrual" });
  const gender = page.getByRole("combobox", { name: "Género", exact: true });
  await gender.selectOption("hombre");
  await expect(calendar).toHaveCount(0);
  for (const value of ["mujer", "no_binario", "otro"]) {
    await gender.selectOption(value);
    await expect(calendar).toBeVisible();
    await expect(calendar.getByRole("switch")).not.toBeChecked();
  }
  await calendar.getByRole("switch").click();
  const day = calendar.locator(".menstrual-days button:not(:disabled)").first();
  const disclosure = calendar.locator("summary");
  await disclosure.click();
  await expect(day).not.toBeVisible();
  await disclosure.focus();
  await page.keyboard.press("Enter");
  await expect(day).toBeVisible();
  const genderBox = await gender.boundingBox();
  const switchBox = await calendar.getByRole("switch").boundingBox();
  expect(switchBox!.x).toBeGreaterThan(genderBox!.x);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/menstrual-calendar-${info.project.name}.png`,
    fullPage: true,
  });
  const label = await day.getAttribute("aria-label");
  await day.click();
  await expect(day).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.locator('[data-sync-status="synced"]')).toBeAttached();
  await page.reload();
  await expect(calendar.getByRole("switch")).toBeChecked();
  await expect(
    calendar.getByRole("button", { name: label!, exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await calendar.getByRole("switch").click();
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.locator('[data-sync-status="synced"]')).toBeAttached();
  await page.reload();
  await expect(calendar.getByRole("switch")).not.toBeChecked();
  await calendar.getByRole("switch").click();
  await expect(
    calendar.getByRole("button", { name: label!, exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await gender.selectOption("hombre");
  await expect(calendar).toHaveCount(0);
  await gender.selectOption("mujer");
  await expect(
    calendar.getByRole("button", { name: label!, exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("optional menstrual readiness check offers advice before starting", async ({
  page,
}, info) => {
  await page.goto("/profile");
  await page
    .getByRole("combobox", { name: "Género", exact: true })
    .selectOption("mujer");
  await page
    .getByRole("region", { name: "Calendario menstrual" })
    .getByRole("switch")
    .click();
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.locator('[data-sync-status="synced"]')).toBeAttached();
  await page.goto("/home");
  await page
    .getByRole("button", { name: "Iniciar entrenamiento", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Rutina principal · Pecho y tríceps/ })
    .click();
  const dialog = page.getByRole("dialog", { name: "¿Cómo te sentís hoy?" });
  await dialog
    .getByRole("combobox", { name: "Dolor o molestias", exact: true })
    .selectOption("strong");
  await dialog.getByRole("button", { name: "Ver recomendación" }).click();
  await expect(
    dialog.getByText("Priorizá tu bienestar", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Iniciar entrenamiento", exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Cambiar respuestas" }).click();
  await dialog
    .getByRole("combobox", { name: "Dolor o molestias", exact: true })
    .selectOption("none");
  await dialog
    .getByRole("combobox", { name: "Energía", exact: true })
    .selectOption("low");
  await dialog.getByRole("button", { name: "Ver recomendación" }).click();
  await expect(
    dialog.getByText("Considerá una sesión más liviana", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `artifacts/readiness-${info.project.name}.png`,
  });
  await dialog
    .getByRole("button", { name: "Iniciar entrenamiento", exact: true })
    .click();
  await expect(page).toHaveURL(/\/workout$/);
});

test("exercise replacement preserves logged sets and offers a time-based alternative", async ({
  page,
}, info) => {
  await page
    .getByRole("button", { name: "Iniciar entrenamiento", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Rutina principal · Pecho y tríceps/ })
    .click();
  await page.getByLabel("Peso 1 serie 1", { exact: true }).fill("20");
  await page.getByLabel("Repeticiones 1 serie 1", { exact: true }).fill("12");
  await page
    .getByRole("button", { name: "Reemplazar ejercicio", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Reemplazar ejercicio",
    exact: true,
  });
  await dialog.getByLabel("Mostrar todas las zonas", { exact: true }).check();
  await dialog
    .getByRole("combobox", { name: "Ejercicio alternativo", exact: true })
    .selectOption("plancha");
  await expect(
    dialog.getByText("Propuesta inicial: 2 series", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText(/30 segundos/).first()).toBeVisible();
  await page.screenshot({
    path: `artifacts/replacement-${info.project.name}.png`,
  });
  await dialog
    .getByRole("button", { name: "Usar reemplazo", exact: true })
    .click();
  await expect(page.getByLabel("Peso 1 serie 1", { exact: true })).toHaveValue(
    "20",
  );
  await expect(
    page.getByLabel("Segundos 2 serie 1", { exact: true }),
  ).toHaveValue("30");
  await expect(
    page.locator('[data-workout-entry="0"] [data-set-row]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-workout-entry="1"] [data-set-row]'),
  ).toHaveCount(2);
  await page.reload();
  await expect(
    page.getByLabel("Segundos 2 serie 1", { exact: true }),
  ).toHaveValue("30");
});

test("weekly summary can select earlier weeks and return to the current week", async ({
  page,
}) => {
  const dates = await page.evaluate(() => {
    const key = "mrgymson-user-11111111-1111-4111-8111-111111111111";
    const snapshot = JSON.parse(localStorage.getItem(key)!);
    const now = new Date();
    const monday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      12,
    );
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const previous = new Date(monday);
    previous.setDate(previous.getDate() - 7);
    snapshot.sessions = [
      {
        id: "this-week",
        date: now.toISOString(),
        routine: "R",
        day: "D",
        duration: 30,
      },
      {
        id: "last-week",
        date: previous.toISOString(),
        routine: "R",
        day: "D",
        duration: 90,
      },
    ];
    localStorage.setItem(key, JSON.stringify(snapshot));
    const metaKey = key + ":sync-meta-v1";
    const meta = JSON.parse(localStorage.getItem(metaKey)!);
    localStorage.setItem(metaKey, JSON.stringify({ ...meta, pending: true }));
    const keyFor = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { current: keyFor(monday), previous: keyFor(previous) };
  });
  await page.reload();
  await expect(page.locator('[data-sync-status="synced"]')).toBeAttached();
  await page.goto("/progress");
  const summary = page.getByRole("region", {
    name: "Resumen semanal",
    exact: true,
  });
  await expect(summary).toContainText("0 h 30 min");
  await page
    .getByRole("button", { name: "Semana anterior", exact: true })
    .click();
  await expect(summary).toContainText("1 h 30 min");
  await expect(page.getByLabel("Elegir semana", { exact: true })).toHaveValue(
    dates.previous,
  );
  await page
    .getByRole("button", { name: "Semana siguiente", exact: true })
    .click();
  await expect(summary).toContainText("0 h 30 min");
  await page.getByLabel("Elegir semana", { exact: true }).fill(dates.previous);
  await expect(summary).toContainText("1 h 30 min");
  await page
    .getByRole("button", { name: "Semana actual", exact: true })
    .click();
  await expect(page.getByLabel("Elegir semana", { exact: true })).toHaveValue(
    dates.current,
  );
});
test("weekly summary and translated screens fit a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/progress");
  await expect(
    page.getByRole("heading", { name: "Resumen semanal" }),
  ).toBeVisible();
  await expect(page.locator(".weekly-duration-day")).toHaveCount(7);
  await page.screenshot({
    path: "artifacts/weekly-summary-narrow.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/profile");
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Idioma", exact: true })
    .selectOption("en");
  await page
    .getByRole("button", { name: "Guardar configuración", exact: true })
    .click();
  await page.goto("/tools");
  await page.getByRole("button", { name: "Calculators", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Calories", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Calorie calculator", exact: true }),
  ).toBeVisible();
  await page.goto("/home");
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Rutina principal/ })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Supersets", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/workout-narrow-english.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const [language, heading, direction] of [
    ["fr", "Résumé de la semaine", "ltr"],
    ["ar", "ملخص أسبوعي", "rtl"],
  ] as const) {
    await page.goto("/profile");
    await page.locator(".page-heading button").click();
    await page.locator('select[name="language"]').selectOption(language);
    await page.getByRole("dialog").locator('button[type="submit"]').click();
    await page.goto("/progress");
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", direction);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "artifacts/weekly-summary-narrow-arabic.png",
    fullPage: true,
  });
});

test("two browser devices preserve drafts and require a choice for conflicting edits", async ({
  page,
  browser,
}) => {
  await page.goto("/profile");
  const second = await browser.newContext();
  try {
    const other = await second.newPage();
    await other.route("**/*", (route) =>
      new URL(route.request().url()).hostname === "127.0.0.1"
        ? route.continue()
        : route.abort(),
    );
    await login(other);
    await other.goto("http://127.0.0.1:3010/profile");
    await other
      .getByLabel("Nombre", { exact: true })
      .fill("Draft on device two");
    await page
      .getByLabel("Nombre", { exact: true })
      .fill("Saved on device one");
    await page
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click();
    await expect(page.locator('[data-sync-status="synced"]')).toBeAttached();
    await other.bringToFront();
    // Headless Chromium does not reliably emit native window-focus events.
    await other.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(other.getByLabel("Nombre", { exact: true })).toHaveValue(
      "Draft on device two",
    );
    await other
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click();
    await expect(
      other.getByRole("heading", { name: "Elegir copia de tus datos" }),
    ).toBeVisible();
    expect(
      await other.evaluate(
        () =>
          Object.keys(localStorage).filter((key) =>
            /:(cloud|local)-conflict:/.test(key),
          ).length,
      ),
    ).toBe(2);
    await other.getByRole("button", { name: "Usar nube", exact: true }).click();
    await expect(other.getByLabel("Nombre", { exact: true })).toHaveValue(
      "Saved on device one",
    );
    await page.bringToFront();
    await page.getByLabel("Nombre", { exact: true }).fill("New cloud update");
    await page
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click();
    await expect(page.locator('[data-sync-status="synced"]')).toBeAttached();
    await other.bringToFront();
    // Headless Chromium does not reliably emit native window-focus events.
    await other.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(other.getByLabel("Nombre", { exact: true })).toHaveValue(
      "New cloud update",
    );
  } finally {
    await second.close();
  }
});

test("masculine profiles hide menstrual calendar borders and legend with saved dates", async ({
  page,
}) => {
  // Seed a pending offline copy in the isolated account cache; normal reconciliation uploads it.
  await page.evaluate(() => {
    const key = "mrgymson-user-11111111-1111-4111-8111-111111111111";
    const snapshot = JSON.parse(localStorage.getItem(key)!);
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    snapshot.profile.gender = "mujer";
    snapshot.profile.menstrualCalendar = { enabled: true, dates: [date] };
    snapshot.sessions.unshift({
      id: "menstrual-regression-session",
      date: today.toISOString(),
      routine: "Test",
      day: "Test",
      exercises: [],
    });
    localStorage.setItem(key, JSON.stringify(snapshot));
    const metaKey = key + ":sync-meta-v1";
    const meta = JSON.parse(localStorage.getItem(metaKey)!);
    localStorage.setItem(metaKey, JSON.stringify({ ...meta, pending: true }));
  });
  await page.reload();
  await expect(page.locator('[data-sync-status="synced"]')).toBeAttached();
  await expect(page.locator('[data-menstrual-training="true"]')).toHaveCount(1);
  await expect(page.getByText(/Borde violeta:/)).toBeVisible();
  await page.goto("/profile");
  await page
    .getByRole("combobox", { name: "Género", exact: true })
    .selectOption("hombre");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.locator('[data-sync-status="synced"]')).toBeAttached();
  await page.goto("/home");
  await expect(page.locator('[data-menstrual-training="true"]')).toHaveCount(0);
  await expect(page.getByText(/Borde violeta:/)).toHaveCount(0);
  await page
    .getByRole("button", { name: "Iniciar entrenamiento", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Rutina principal · Pecho y tríceps/ })
    .click();
  await expect(page).toHaveURL(/\/workout$/);
  await expect(
    page.getByRole("dialog", { name: "¿Cómo te sentís hoy?" }),
  ).toHaveCount(0);
  await page.goto("/profile");
  await page
    .getByRole("combobox", { name: "Género", exact: true })
    .selectOption("mujer");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.locator('[data-sync-status="synced"]')).toBeAttached();
  await page.goto("/home");
  await expect(page.locator('[data-menstrual-training="true"]')).toHaveCount(1);
});
