import { expect, test } from "@playwright/test";
import { ready } from "./helpers.js";

test("talk colour fills its whole time slot", async ({ page }) => {
  await page.goto("program/");
  await ready(page);

  const gaps = await page.$$eval(".tab-pane.active td[rowspan]", (cells) =>
    cells
      .map((td) => {
        const colored = td.matches('[class*="-subtle"]') ? td : td.querySelector('[class*="-subtle"]');
        return { talk: td.innerText.split("\n")[0], gap: td.offsetHeight - colored.offsetHeight };
      })
      .filter(({ gap }) => gap > 1),
  );
  expect(gaps).toEqual([]);
});

test("sticky header clone is hidden from assistive technology", async ({ page }) => {
  await page.goto("program/");
  await ready(page);

  const sticky = page.locator(".tab-pane.active [data-program-sticky]");
  await expect(sticky).toHaveAttribute("aria-hidden", "true");
  await expect(sticky.locator("[id]")).toHaveCount(0);
});

test("sticky header does not shift the table while scrolling", async ({ page }) => {
  await page.goto("program/");
  await ready(page);

  // Scroll in small steps past the header and record the table's position
  // and the sticky header's visibility over a few frames per step
  const states = await page.evaluate(async () => {
    const SCROLL_STEP = 3;
    const FRAMES_PER_STEP = 6;
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const pane = document.querySelector(".tab-pane.active");
    const container = pane.querySelector(".program-table-container");
    const sticky = pane.querySelector("[data-program-sticky]");
    const thead = container.querySelector("thead");
    const docTop = (el) => Math.round(el.getBoundingClientRect().top + window.scrollY);

    const tableTop = docTop(container);
    const states = [];
    for (let y = tableTop; y <= tableTop + 2 * thead.offsetHeight; y += SCROLL_STEP) {
      window.scrollTo(0, y);
      const seen = new Set();
      for (let i = 0; i < FRAMES_PER_STEP; i++) {
        await frame();
        seen.add(`${sticky.style.display} ${docTop(container) - tableTop}`);
      }
      states.push(...seen);
    }
    return [...new Set(states)];
  });

  // e.g. ["none 0", "block 0"], never a shifted table or flickering
  expect(states).toEqual(["none 0", "block 0"]);
});

test("sticky header follows a horizontal scroll made while it was hidden", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("program/");
  await ready(page);

  const container = page.locator(".tab-pane.active .program-table-container");
  const sticky = page.locator(".tab-pane.active [data-program-sticky]");
  await container.evaluate((el) => el.scrollTo(el.scrollWidth, 0));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(sticky).toBeVisible();

  const scrollLeft = await container.evaluate((el) => el.scrollLeft);
  await expect.poll(() => sticky.evaluate((el) => el.scrollLeft)).toBe(scrollLeft);
});
