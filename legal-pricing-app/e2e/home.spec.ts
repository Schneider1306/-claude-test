import { test, expect } from "@playwright/test";
import { rublesRegex } from "./utils";

test("главная страница загружается и показывает целевую ставку в настройках", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Главная" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /Новый расчёт/ })).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByText(rublesRegex("8 200 ₽/ч"))).toBeVisible();
  await expect(page.getByText(rublesRegex("582 613 ₽"))).toBeVisible();
});

test("справочник услуг содержит 14 стартовых услуг", async ({ page }) => {
  await page.goto("/services");
  await expect(page.getByText("Консультация", { exact: true })).toBeVisible();
  await expect(page.getByText("Абонентское сопровождение", { exact: true }).first()).toBeVisible();
});
