import { test, expect } from "@playwright/test";

test("C01 Treinador oferece busca integrada e cronômetro acessível", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /entrar|acessar/i }).first().click();
  await page.getByRole("textbox", { name: /Usuário ou e-mail/i }).fill("paulo");
  await page.locator('input[type="password"]').fill(process.env.ROOT_INITIAL_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
  await expect(page.locator("#area-de-estudos")).toBeVisible({ timeout: 20_000 });

  const drawer = page.getByRole("button", { name: "Abrir navegação" });
  if (test.info().project.name === "chromium-mobile") { await expect(drawer).toBeVisible({ timeout: 20_000 }); await drawer.click(); }
  await page.getByRole("button", { name: /Treinador/i }).first().click();

  const search = page.getByRole("region", { name: "Busca geral de estudos" });
  await expect(search).toBeVisible();
  await search.getByRole("searchbox").fill("Português");
  await expect(search.getByRole("status")).toContainText(/resultado/);
  await expect(search.getByRole("listitem").first()).toBeVisible({ timeout: 20_000 });

  const focus = page.getByRole("region", { name: "Modo foco" });
  await focus.getByRole("combobox", { name: "Duração do modo foco" }).selectOption("15");
  await expect(focus.getByRole("timer")).toHaveText("15:00");
  await focus.getByRole("button", { name: "Iniciar foco" }).click();
  await expect(focus.getByRole("button", { name: "Pausar" })).toBeVisible();
  await focus.getByRole("button", { name: "Pausar" }).click();
  await expect(focus.getByRole("button", { name: "Continuar" })).toBeVisible();
  await focus.getByRole("button", { name: "Reiniciar" }).click();
  await expect(focus.getByRole("timer")).toHaveText("15:00");

  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(2);
});
