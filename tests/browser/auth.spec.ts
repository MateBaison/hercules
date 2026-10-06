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
    page.getByText("test@example.invalid", { exact: true }),
  ).toBeVisible();
  const response = await page.request.get("/api/account/summary");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Cerrar sesión" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
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
  await page.getByLabel("Nombre", { exact: true }).fill("First account only");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.locator('[data-sync-status="synced"]')).toBeVisible();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page, "second@example.invalid");
  await page.goto("/profile");
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(
    "Second",
  );
  await expect(
    page.getByText("second@example.invalid", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
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
