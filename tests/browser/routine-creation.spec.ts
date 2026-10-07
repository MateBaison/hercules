import { expect, test } from "@playwright/test";
import { login } from "./login-helper";
test("custom goals, automatic routines, editable days and independent sharing copies", async ({
  page,
}) => {
  await page.request.get("http://127.0.0.1:54329/__reset");
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await login(page);
  await page.getByRole("button", { name: /Nueva$/, exact: false }).click();
  await page
    .getByRole("button", { name: "Rutina personalizada", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Nombre", { exact: true })
    .fill("Custom example");
  await page
    .getByRole("combobox", { name: "Objetivo", exact: true })
    .selectOption("Ganar masa muscular");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  const custom = page.locator(".routine-card").filter({
    has: page.getByRole("button", {
      name: "Renombrar Custom example",
      exact: true,
    }),
  });
  await custom
    .getByRole("button", { name: "Agregar día", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Nombre", { exact: true })
    .fill("Custom day");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(custom.locator(".routine-day summary")).toContainText(
    "Custom day",
  );
  await page.getByRole("button", { name: /Nueva$/, exact: false }).click();
  await page
    .getByRole("button", { name: "Rutina automática", exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("Piernas", { exact: true }).check();
  await page.getByRole("dialog").getByLabel("Gemelos", { exact: true }).check();
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Días por semana", exact: true })
    .selectOption("2");
  await page.getByRole("button", { name: "Crear rutina", exact: true }).click();
  const generated = page.locator(".routine-card").last();
  await expect(generated.locator(".routine-day")).toHaveCount(2);
  await generated
    .getByRole("button", { name: "Compartir rutina", exact: true })
    .click();
  const link = await page
    .getByLabel("Enlace de rutina", { exact: true })
    .inputValue();
  await page.keyboard.press("Escape");
  await page.goto(link);
  await page
    .getByRole("link", { name: "Crear cuenta o iniciar sesión" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Agregar a mis rutinas", exact: true })
    .click();
  await expect(page.locator(".routine-card")).toHaveCount(4);
  const routines = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem(
          "mrgymson-user-11111111-1111-4111-8111-111111111111",
        ) ?? "{}",
      ).routines,
  );
  expect(routines[1].goal).toBe("Ganar masa muscular");
  expect(routines[2].id).not.toBe(routines[3].id);
  expect(routines[2].days[0].id).not.toBe(routines[3].days[0].id);
});

test("routine activation slides, supports keyboard and persists an inactive selection", async ({
  page,
}, info) => {
  await page.request.get("http://127.0.0.1:54329/__reset");
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await login(page);
  const routine = page.locator(".routine-card").first();
  const toggle = routine.getByRole("switch");
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem(
              "mrgymson-user-11111111-1111-4111-8111-111111111111",
            )!,
          ).selected,
      ),
    )
    .toBeNull();
  await page.reload();
  await expect(toggle).not.toBeChecked();
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toBeChecked();
  const add = await routine
    .getByRole("button", { name: "Agregar día", exact: true })
    .boundingBox();
  const days = await routine.locator(".routine-day").last().boundingBox();
  expect(add!.y).toBeGreaterThan(days!.y + days!.height);
  await page.screenshot({
    path: `artifacts/routine-controls-${info.project.name}.png`,
    animations: "disabled",
    fullPage: true,
  });
  page.once("dialog", (dialog) => dialog.dismiss());
  await routine
    .getByRole("button", { name: "Eliminar rutina", exact: true })
    .click();
  await expect(routine).toBeVisible();
});
