import { expect, test } from "@playwright/test";
import { login } from "./login-helper";

test.beforeEach(async ({ page }) => {
  // No real user login, cloud writes or unrelated network requests.
  await page.route("**/*", (route) =>
    ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  await page.request.get("http://127.0.0.1:54329/__reset");
  await login(page);
});

test("welcome, all navigation routes, active tab, brand home and reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Bienvenido a HERCULES" }),
  ).toBeVisible();
  expect(
    await page
      .getByRole("link", { name: "Crear cuenta o iniciar sesión" })
      .evaluate((element) => element.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(48);
  await page
    .getByRole("link", { name: "Crear cuenta o iniciar sesión" })
    .click();
  for (const [label, url] of [
    ["Biblioteca", "/library"],
    ["Herramientas", "/tools"],
    ["Progreso", "/progress"],
    ["Perfil", "/profile"],
    ["Inicio", "/home"],
  ]) {
    const link = page
      .getByRole("navigation")
      .getByRole("link", { name: label, exact: true });
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${url}$`));
    await expect(link).toHaveAttribute("aria-current", "page");
    const title = page.locator(".header-section-title");
    await expect(title).toHaveText(label);
    const fits = await page.locator(".app-header").evaluate((header) => {
      const brand = header.querySelector(".brand")!.getBoundingClientRect();
      const title = header
        .querySelector(".header-section-title")!
        .getBoundingClientRect();
      const actions = header
        .querySelector(".header-actions")!
        .getBoundingClientRect();
      return (
        brand.right <= title.left &&
        title.right <= actions.left &&
        Math.abs(
          brand.top + brand.height / 2 - (title.top + title.height / 2),
        ) < 2
      );
    });
    expect(fits).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/workout");
  await page.getByRole("link", { name: "HERCULES — volver al inicio" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.reload();
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.locator(".header-date time")).not.toBeEmpty();
  expect(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
  ).toBe("rgb(9, 11, 16)");
  expect(
    await page.evaluate(() => localStorage.getItem("mrgymson-mobile-v1")),
  ).toBeNull();
  expect(
    await page.evaluate(() =>
      localStorage.getItem(
        "mrgymson-user-11111111-1111-4111-8111-111111111111",
      ),
    ),
  ).not.toBeNull();
  expect(errors).toEqual([]);
});

test("catalog groups, non-floating search, equipment filters, images, modal and keyboard", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/library");
  await expect(page.locator(".exercise-card")).toHaveCount(136);
  await expect(page.locator(".muscle-summary")).toHaveCount(0);
  await page.screenshot({
    path: `artifacts/library-groups-${testInfo.project.name}.png`,
    animations: "disabled",
  });
  for (const group of [
    "Pectorales",
    "Espalda",
    "Hombros",
    "Bíceps",
    "Tríceps",
    "Abdominales",
    "Piernas",
    "Gemelos",
  ]) {
    await page
      .getByRole("group", { name: "Zonas musculares" })
      .getByRole("button", { name: group, exact: true })
      .click();
    await expect(page.locator(".muscle-summary img")).toBeVisible();
    expect(await page.locator(".exercise-card").count()).toBeGreaterThan(0);
    await page.locator(".exercise-card img").evaluateAll(async (images) => {
      for (const image of images) {
        if (!(image instanceof HTMLImageElement))
          throw new Error("Expected image");
        image.loading = "eager";
        await image.decode();
      }
    });
  }
  expect(
    await page
      .locator(".muscle-chips")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  const chips = await page.locator(".muscle-chips button").all();
  for (const chip of chips) {
    const box = await chip.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  await page
    .getByRole("group", { name: "Zonas musculares" })
    .getByRole("button", { name: "Pectorales", exact: true })
    .click();
  await page.locator("summary").click();
  await page
    .getByRole("group", { name: "Equipo", exact: true })
    .getByRole("button", { name: "Mancuernas", exact: true })
    .click();
  await expect(page.locator("details")).not.toHaveAttribute("open");
  expect(await page.locator(".exercise-card").count()).toBeGreaterThan(0);
  await page.getByLabel("Buscar ejercicios").fill("no existe este ejercicio");
  await expect(page.locator(".exercise-card")).toHaveCount(0);
  await page.getByLabel("Buscar ejercicios").fill("");
  await page.locator(".exercise-card").first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const firstTitle = await dialog
    .locator("[data-slot=dialog-title]")
    .innerText();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator("[data-slot=dialog-title]")).not.toHaveText(
    firstTitle,
  );
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.locator("[data-slot=dialog-title]")).toHaveText(
    firstTitle,
  );
  await expect(dialog.getByRole("heading", { name: "Técnica" })).toBeVisible();
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  expect(
    await dialog
      .locator("img")
      .evaluate((image) => getComputedStyle(image).objectFit),
  ).toBe("contain");
  await page.screenshot({
    path: `artifacts/library-dialog-${testInfo.project.name}.png`,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.evaluate(() => scrollTo(0, 400));
  await expect
    .poll(async () =>
      page
        .locator(".library-controls")
        .evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeLessThan(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/library-${testInfo.project.name}.png`,
    animations: "disabled",
  });
  expect(errors).toEqual([]);
});

test("unknown routes return 404 with a working home link", async ({ page }) => {
  const response = await page.goto("/missing-migration-route");
  expect(response?.status()).toBe(404);
  expect(
    (await page.request.get("/migration-baseline/portable.html")).status(),
  ).toBe(404);
  expect(
    (await page.request.get("/src/data/legacy/snapshot.json")).status(),
  ).toBe(404);
  await page.getByRole("link", { name: "Volver al inicio" }).click();
  await expect(page).toHaveURL(/\/home$/);
});
