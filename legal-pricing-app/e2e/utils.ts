import { expect, type Page } from "@playwright/test";

/** Строит регулярное выражение для суммы в рублях, устойчивое к неразрывным пробелам Intl.NumberFormat. */
export function rublesRegex(text: string): RegExp {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s");
  return new RegExp(escaped);
}

/**
 * Каждый переход между шагами мастера сначала сохраняет черновик на сервере,
 * поэтому ждём заголовок следующего шага, а не просто факт клика.
 */
export async function goToNextWizardStep(page: Page, nextHeading: string) {
  await page.getByRole("button", { name: /Далее/ }).click();
  await expect(page.getByRole("heading", { name: nextHeading, level: 2 })).toBeVisible();
}
