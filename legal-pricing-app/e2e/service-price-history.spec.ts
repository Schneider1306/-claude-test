import { test, expect } from "@playwright/test";
import { rublesRegex, goToNextWizardStep as goNext } from "./utils";

test("изменение цены услуги в справочнике не меняет ранее сохранённый расчёт", async ({
  page,
}) => {
  // Создаём расчёт с услугой «Консультация» (9 000 ₽)
  await page.goto("/calculations/new");
  await page.fill("#internalName", "E2E — проверка неизменности цены");
  await page.fill("#clientCode", "K-E2E-PRICE");
  await goNext(page, "Тип дела");
  await goNext(page, "Выбор этапов");

  await page.getByText("Консультация", { exact: true }).click();
  await goNext(page, "Заседания");
  await goNext(page, "Экспертиза и блоки");
  await goNext(page, "Плановое время");
  await goNext(page, "Коэффициенты");
  await goNext(page, "Скидка");
  await goNext(page, "Внешние расходы");
  await goNext(page, "Проверка и сохранение");

  await page.getByRole("button", { name: /Сохранить расчёт/ }).click();
  await page.waitForURL(/\/calculations\/\d+$/);
  const calcUrl = page.url();
  await expect(page.getByText(rublesRegex("9 000 ₽")).first()).toBeVisible();

  // Меняем цену услуги «Консультация» в справочнике
  await page.goto("/services");
  const consultationRow = page.locator("tr", { hasText: "Консультация" }).first();
  await consultationRow.getByRole("button").first().click();
  const priceInput = page.locator("#basePriceRubles");
  await priceInput.fill("15000");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText(rublesRegex("15 000 ₽")).first()).toBeVisible();

  // Старый расчёт остаётся с прежней ценой
  await page.goto(calcUrl);
  await expect(page.getByText(rublesRegex("9 000 ₽")).first()).toBeVisible();
  await expect(page.getByText(rublesRegex("15 000 ₽"))).toHaveCount(0);
});
