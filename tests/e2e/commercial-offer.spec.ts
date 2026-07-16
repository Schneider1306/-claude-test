import { test, expect } from "@playwright/test";

test("коммерческое предложение содержит обязательную формулировку и не содержит внутреннюю контрольную ставку", async ({
  page,
}) => {
  await page.goto("/cases/new");
  const name = `E2E КП ${Date.now()}`;
  await page.getByPlaceholder("Напр. «Иванов — врачебная ошибка»").fill(name);
  await page.getByPlaceholder("Напр. КЛ-014").fill(`E2E-KP-${Date.now()}`);
  await page.getByRole("button", { name: "Далее →" }).click();
  await page.locator('label:has-text("Обычное судебное дело")').click();
  for (let i = 0; i < 8; i++) {
    await page.getByRole("button", { name: "Далее →" }).click();
  }
  await page.getByRole("button", { name: "Сохранить дело" }).click();
  await page.waitForURL(/\/cases\/\d+$/);

  const caseId = page.url().split("/").pop();
  await page.goto(`/cases/${caseId}/offer`);

  await expect(page.getByText("Коммерческое предложение")).toBeVisible();
  await expect(
    page.getByText(
      "Первоначальная стоимость относится только к перечисленному объёму работ.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(page.getByText("Если дополнительный этап не возникает, клиент его не оплачивает.", { exact: false })).toBeVisible();

  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toContain("Контрольная ставка");
  expect(bodyText).not.toContain("личного дохода");
});

test("экспорт дел в CSV отдаёт файл", async ({ request }) => {
  const res = await request.get("/api/export/cases-csv");
  expect(res.ok()).toBeTruthy();
  expect(res.headers()["content-type"]).toContain("text/csv");
});

test("экспорт всех данных в JSON отдаёт валидный JSON", async ({ request }) => {
  const res = await request.get("/api/export/json");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.data).toHaveProperty("cases");
  expect(body.data).toHaveProperty("services");
  expect(body.data).toHaveProperty("settings");
});
