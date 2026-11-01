import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { EDITIONS_URL } from "./helpers.js";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

test.use({ baseURL: EDITIONS_URL });

test("root forwards to the current edition", async ({ page }) => {
  await page.goto("");

  await expect(page).toHaveURL(`${EDITIONS_URL}2026/`);
});

test("switcher leads to a past edition and back", async ({ page }) => {
  await page.goto("2026/");

  await page.getByRole("button", { name: "Edition: 2026" }).click();
  await page.getByRole("link", { name: "Archive 2025" }).click();
  await expect(page).toHaveURL(`${EDITIONS_URL}2025/`);

  await page.getByRole("button", { name: "Years" }).click();
  await page.getByRole("link", { name: "2026" }).click();
  await expect(page).toHaveURL(`${EDITIONS_URL}2026/`);
});

for (const colorScheme of ["light", "dark"]) {
  test(`past edition has no axe violations in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("2025/program/");
    await page.getByRole("button", { name: "Years" }).click();

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const summary = violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(" ")).join(", ")}`);

    expect(summary).toEqual([]);
  });
}
