import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ready, track } from "./helpers.js";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const PAGES = ["", "program/", "variants/alltimes/", "talks/", "talks/opening_welcome/", "speakers/", "speakers/ada_lovelace/", "rooms/room_a/", "location/"];
const MIN_TARGET_PX = 24;

for (const colorScheme of ["light", "dark"]) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    for (const path of PAGES) {
      test(`/${path} has no axe violations`, async ({ page }) => {
        await page.goto(path);

        const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        const summary = violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(" ")).join(", ")}`);

        expect(summary).toEqual([]);
      });
    }
  });
}

test("speaker overview links are large enough to tap", async ({ page }) => {
  await page.goto("speakers/");

  for (const box of await page.locator("main li a").evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height))) {
    expect(box).toBeGreaterThanOrEqual(MIN_TARGET_PX);
  }
});

test("loading the map keeps the keyboard focus on the map", async ({ page }) => {
  await track(page);
  await page.goto("location/");
  await ready(page);

  await page.getByRole("button", { name: "Load map" }).press("Enter");
  await expect(page.locator("#map.leaflet-container")).toBeFocused();
});

test("video modal names its frame after the talk and releases focus on close", async ({ page }) => {
  const warnings = [];
  page.on("console", (msg) => msg.text().includes("aria-hidden") && warnings.push(msg.text()));
  await track(page);
  await page.goto("talks/opening_welcome/");
  await ready(page);

  const trigger = page.getByRole("link", { name: "Recording" });
  await trigger.press("Enter");
  const modal = page.locator("#link-modal");
  await expect(modal).toBeVisible();
  await expect(modal.locator("iframe")).toHaveAttribute("title", "Opening & Welcome");

  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(warnings).toEqual([]);
});
