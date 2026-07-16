import { test, expect } from "@playwright/test";

test("главная страница показывает ключевые показатели", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Главная" })).toBeVisible();
  await expect(page.getByText("Получено за месяц")).toBeVisible();
  await expect(page.getByText("Задолженность клиентов")).toBeVisible();
  await expect(page.getByText("Прогноз личного дохода")).toBeVisible();
  await expect(page.getByText(/Лимит НПД за \d{4} год/)).toBeVisible();
});

test("настройки: расчётная месячная ёмкость соответствует ТЗ (71,67 ч)", async ({ page }) => {
  await page.goto("/settings?tab=general");
  await expect(page.getByText("Расчётная месячная ёмкость:")).toContainText("71,67 ч");
});

test("контрольная ставка на карточке дела равна 8 200 ₽/ч при настройках по умолчанию", async ({ page }) => {
  await page.goto("/cases/new");
  await page.getByPlaceholder("Напр. «Иванов — врачебная ошибка»").fill(`E2E ставка ${Date.now()}`);
  await page.getByPlaceholder("Напр. КЛ-014").fill(`E2E-RATE-${Date.now()}`);
  await page.getByRole("button", { name: "Далее →" }).click();
  await page.locator('label:has-text("Обычное судебное дело")').click();
  for (let i = 0; i < 8; i++) {
    await page.getByRole("button", { name: "Далее →" }).click();
  }
  await page.getByRole("button", { name: "Сохранить дело" }).click();
  await page.waitForURL(/\/cases\/\d+$/);

  await page.goto(`${page.url()}?tab=economics`);
  await expect(page.getByText("Контрольная ставка")).toBeVisible();
  await expect(page.getByText("8 200 ₽/ч")).toBeVisible();
});

test("справочник услуг доступен и содержит начальный этап медицинского дела", async ({ page }) => {
  await page.goto("/settings?tab=services");
  await expect(page.getByText("Медицинское дело — начальный этап")).toBeVisible();
});

test("раздел данных и резервных копий доступен", async ({ page }) => {
  await page.goto("/settings?tab=data");
  await expect(page.getByText("Резервное копирование")).toBeVisible();
  await expect(page.getByText("Восстановление из резервной копии")).toBeVisible();
});
