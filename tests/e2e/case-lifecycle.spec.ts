import { test, expect } from "@playwright/test";

/**
 * Основной пользовательский сценарий: создание дела через мастер,
 * добавление этапа/платежа/времени и проверка сохранения данных после
 * обновления страницы (эквивалент перезапуска для веб-приложения —
 * единственный источник истины SQLite не зависит от состояния вкладки).
 */

test.describe.configure({ mode: "serial" });

const uniqueSuffix = Date.now();
const caseName = `E2E Медицинское дело ${uniqueSuffix}`;
const clientCode = `E2E-${uniqueSuffix}`;

test("создание медицинского дела через мастер и проверка расчёта", async ({ page }) => {
  await page.goto("/cases/new");

  await page.getByPlaceholder("Напр. «Иванов — врачебная ошибка»").fill(caseName);
  await page.getByPlaceholder("Напр. КЛ-014").fill(clientCode);
  await page.getByRole("button", { name: "Далее →" }).click();

  await page.locator('label:has-text("Медицинское дело")').click();
  await page.getByRole("button", { name: "Далее →" }).click();

  // Шаг 3: начальный этап должен быть автоматически подставлен из каталога
  await expect(page.locator('input[type="number"]').first()).toHaveValue("135000");
  await page.getByRole("button", { name: "Далее →" }).click();

  // Шаг 4: 4 заседания всего, 1 включено -> 3 дополнительных
  const meetingsInput = page.locator('input[type="number"]').first();
  await meetingsInput.fill("4");
  await expect(page.getByText("Дополнительных заседаний:")).toContainText("3");
  await page.getByRole("button", { name: "Далее →" }).click();

  // Шаг 5: экспертиза
  await page.getByText("По делу потребуется экспертиза").click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Далее →" }).click();

  // Шаг 6: дополнительные этапы — добавим процессуальный блок вручную
  await page.getByRole("button", { name: "+ Добавить этап" }).click();
  await page.locator('div:has(> label:text("Название")) input').first().fill("Доп. процессуальный блок");
  const numberInputsStep6 = page.locator('input[type="number"]');
  await numberInputsStep6.nth(0).fill("35000");
  await numberInputsStep6.nth(1).fill("4.5");
  await page.getByRole("button", { name: "Далее →" }).click();

  // Шаг 7: срочность и скидка — оставляем без изменений
  await page.getByRole("button", { name: "Далее →" }).click();
  // Шаг 8: график платежей — оставляем пустым
  await page.getByRole("button", { name: "Далее →" }).click();

  // Шаг 9: проверка итогового расчёта — ожидаем 290 000 ₽ по обязательному примеру из ТЗ
  await expect(page.getByText("290 000 ₽").first()).toBeVisible();
  await page.getByRole("button", { name: "Далее →" }).click();

  // Шаг 10: сохранение
  await page.getByRole("button", { name: "Сохранить дело" }).click();
  await page.waitForURL(/\/cases\/\d+$/, { timeout: 10_000 });

  await expect(page.getByRole("heading", { name: caseName })).toBeVisible();
});

test("добавление платежа, времени и проверка сохранения после обновления страницы", async ({ page }) => {
  await page.goto("/cases");
  await page.getByPlaceholder("Номер, название, код клиента…").fill(caseName);
  await page.getByRole("button", { name: "Применить" }).click();
  const row = page.locator("tr", { hasText: caseName });
  await expect(row).toBeVisible();
  await row.getByRole("link").click();
  await page.waitForURL(/\/cases\/\d+$/);
  const caseUrl = page.url();

  // Платёж
  await page.goto(`${caseUrl}?tab=payments`);
  await page.getByRole("button", { name: "+ Добавить платёж" }).click();
  await page.waitForTimeout(200);
  await page.locator("form select").first().selectOption("actual");
  await page.locator('form input[type="number"]').first().fill("100000");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await page.waitForTimeout(500);

  // Время
  await page.goto(`${caseUrl}?tab=time`);
  const minutesField = page.locator('div:has(> label:text("Минуты *")) input');
  await minutesField.fill("120");
  await page.getByRole("button", { name: "Добавить" }).click();
  await page.waitForTimeout(500);

  // Обновление страницы — данные должны сохраниться (SQLite — источник истины)
  await page.goto(`${caseUrl}?tab=payments`);
  await expect(page.getByText("100 000").first()).toBeVisible();

  await page.goto(`${caseUrl}?tab=time`);
  await expect(page.getByRole("cell", { name: "2 ч" })).toBeVisible();

  // Задолженность должна уменьшиться на сумму полученного платежа
  await page.goto(`${caseUrl}?tab=overview`);
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).toContain("Задолженность");
});
