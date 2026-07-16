import { test, expect } from "@playwright/test";

/**
 * Экран входа активируется только когда задана переменная окружения
 * APP_PASSWORD (используется при облачном развёртывании). В обычном
 * локальном запуске (без APP_PASSWORD) сайт открывается без пароля —
 * это проверяют остальные тесты в этом наборе. Здесь же — поведение
 * страницы логина как таковой (доступна и не мешает работе прокси).
 */

test("страница входа существует и содержит форму", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Экономика практики" })).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();
});
