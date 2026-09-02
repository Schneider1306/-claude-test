import { test, expect } from "@playwright/test";
import { rublesRegex, goToNextWizardStep as goNext } from "./utils";

test("создание расчёта через мастер, сохранение и открытие после обновления страницы", async ({
  page,
}) => {
  await page.goto("/calculations/new");

  await page.fill("#internalName", "E2E — медицинское дело");
  await page.fill("#clientCode", "K-E2E-001");
  await goNext(page, "Тип дела");

  await page.getByText("Медицинское дело", { exact: true }).click();
  await goNext(page, "Выбор этапов");

  await page.getByText("Медицинское дело — начальный этап").click();
  await goNext(page, "Заседания");

  await page.fill("#totalHearings", "4");
  await expect(page.getByText("Дополнительных заседаний: 3.")).toBeVisible();
  await goNext(page, "Экспертиза и блоки");

  const qtyInputs = await page.locator("input[type=number]").all();
  for (const input of qtyInputs) {
    if ((await input.inputValue()) === "0") await input.fill("1");
  }
  await goNext(page, "Плановое время");
  await goNext(page, "Коэффициенты");
  await goNext(page, "Скидка");
  await goNext(page, "Внешние расходы");
  await goNext(page, "Проверка и сохранение");

  await expect(page.getByText(rublesRegex("290 000 ₽")).first()).toBeVisible();

  await page.getByRole("button", { name: /Сохранить расчёт/ }).click();
  await page.waitForURL(/\/calculations\/\d+$/);

  const url = page.url();
  await expect(page.getByText(rublesRegex("290 000 ₽")).first()).toBeVisible();
  await expect(page.getByText(rublesRegex("10 000 ₽/ч"))).toBeVisible();

  // Открываем расчёт в новом изолированном контексте браузера — доказывает,
  // что данные хранятся на сервере (в SQLite), а не в состоянии вкладки.
  const freshContext = await page.context().browser()!.newContext();
  const freshPage = await freshContext.newPage();
  await freshPage.goto(url);
  await expect(freshPage.getByText("E2E — медицинское дело")).toBeVisible();
  await expect(freshPage.getByText(rublesRegex("290 000 ₽")).first()).toBeVisible();
  await freshContext.close();
});

test("дублирование расчёта создаёт независимую копию", async ({ page }) => {
  await page.goto("/calculations");
  const firstRow = page.getByRole("link", { name: /E2E — медицинское дело/ }).first();
  await firstRow.click();

  await page.getByRole("button", { name: /Дублировать/ }).click();
  await page.waitForURL(/\/calculations\/\d+$/);
  await expect(page.getByText("E2E — медицинское дело (копия)")).toBeVisible();
});

test("список сохранённых расчётов ищет по коду клиента", async ({ page }) => {
  await page.goto("/calculations");
  await page.getByPlaceholder(/Поиск/).fill("K-E2E-001");
  await page.getByPlaceholder(/Поиск/).blur();
  await page.waitForURL(/q=/);
  await expect(page.getByText(/K-E2E-001/).first()).toBeVisible();
});
