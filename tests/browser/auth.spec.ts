import { expect, test } from "@playwright/test";
import { login } from "./login-helper";
test.beforeEach(async ({ page }) => {
  await page.request.get("http://127.0.0.1:54329/__reset");
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});
test("server gates require auth; OTP rejects invalid codes, restores cookies and signs out", async ({
  page,
}) => {
  await page.goto("/library");
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/account/summary")).status()).toBe(401);
  await page.getByLabel("Correo electrónico").fill("test@example.invalid");
  await page.getByRole("button", { name: "Enviar código" }).click();
  await page.getByLabel("Código del correo").fill("000000");
  await page.getByRole("button", { name: "Verificar código" }).click();
  await expect(page.locator("form [role='alert']")).toContainText(
    "no es válido",
  );
  await page.getByLabel("Código del correo").fill("123456");
  await page.getByRole("button", { name: "Verificar código" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/profile");
  await expect(
    page.getByRole("textbox", { name: "Email de contacto", exact: true }),
  ).toBeVisible();
  const response = await page.request.get("/api/account/summary");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Salir de la cuenta" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Salir de la cuenta" }).click();
  await page
    .getByRole("button", { name: "Confirmar cierre de sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login$/);
});
test("new accounts complete onboarding before protected app access", async ({
  page,
}) => {
  await page.request.get("http://127.0.0.1:54329/__reset?new=1");
  await login(page);
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Nombre", { exact: true }).fill("New profile");
  await page.getByRole("button", { name: "Crear perfil y entrar" }).click();
  await expect(page).toHaveURL(/\/home$/);
  const audit: unknown = await (
    await page.request.get("http://127.0.0.1:54329/__audit")
  ).json();
  expect(audit).toEqual({ writes: ["11111111-1111-4111-8111-111111111111"] });
});
test("Google PKCE callback preserves verified session and rejects arbitrary return paths", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continuar con Google" }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect((await page.request.get("/api/account/summary")).status()).toBe(200);
  await page.goto("/auth/callback?code=invalid&next=https://evil.example");
  await expect(page).toHaveURL(/\/(login\?error=callback|home)$/);
});
test("account switches isolate caches and restore each account's own cloud data", async ({
  page,
}) => {
  await login(page);
  await page.goto("/profile");
  const contact = page.getByLabel("Email de contacto", { exact: true });
  await expect(contact).toHaveValue("test@example.invalid");
  await expect(contact).toHaveAttribute("readonly", "");
  await page.getByLabel("Nombre", { exact: true }).fill("First account only");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.locator('[data-sync-status="synced"]')).toBeAttached();
  await page
    .getByRole("button", { name: "Salir de la cuenta", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar cierre de sesión", exact: true })
    .click();
  await login(page, "second@example.invalid");
  await page.goto("/profile");
  await expect(contact).toHaveValue("second@example.invalid");
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(
    "Second",
  );
  await expect(
    page.getByRole("textbox", { name: "Email de contacto", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Salir de la cuenta", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar cierre de sesión", exact: true })
    .click();
  await login(page);
  await page.goto("/profile");
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(
    "First account only",
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem(
            "mrgymson-user-22222222-2222-4222-8222-222222222222",
          ) ?? "{}",
        ).profile.name,
    ),
  ).toBe("Second");
});

test("email entry can return home and discard the pending code", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("test@example.invalid");
  await page
    .getByRole("button", { name: "Enviar código", exact: true })
    .click();
  await expect(page.getByLabel("Código del correo")).toBeVisible();
  await page
    .getByRole("link", { name: "Volver al inicio", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await page
    .getByRole("link", { name: "Crear cuenta o iniciar sesión" })
    .click();
  await expect(page.getByLabel("Correo electrónico")).toBeEditable();
  await expect(page.getByLabel("Código del correo")).toHaveCount(0);
});

test("onboarding has a cancellable sign-out door before saving a profile", async ({
  page,
}) => {
  await page.request.get("http://127.0.0.1:54329/__reset?new=1");
  await login(page);
  await expect(page).toHaveURL(/\/onboarding$/);
  await page
    .getByRole("button", { name: "Salir de la cuenta", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  expect((await page.request.get("/api/account/summary")).status()).toBe(200);
  await page
    .getByRole("button", { name: "Salir de la cuenta", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar cierre de sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/account/summary")).status()).toBe(401);
  const audit = await (
    await page.request.get("http://127.0.0.1:54329/__audit")
  ).json();
  expect(audit.writes).toEqual([]);
});

test("header sign-out preserves unsynced edits and requires a second confirmation", async ({
  page,
}) => {
  await login(page);
  await page.goto("/profile");
  await page.route("**/rest/v1/mrgymson_state*", (route) =>
    ["POST", "PATCH"].includes(route.request().method())
      ? route.abort()
      : route.continue(),
  );
  await page
    .getByLabel("Nombre", { exact: true })
    .fill("Pending local profile");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salir de la cuenta", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar cierre de sesión", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Salir igualmente", exact: true }),
  ).toBeVisible();
  expect((await page.request.get("/api/account/summary")).status()).toBe(200);
  await page
    .getByRole("button", { name: "Salir igualmente", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem(
            "mrgymson-user-11111111-1111-4111-8111-111111111111",
          )!,
        ).profile.name,
    ),
  ).toBe("Pending local profile");
});
