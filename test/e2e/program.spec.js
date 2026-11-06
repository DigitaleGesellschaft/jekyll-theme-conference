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

test("line at the current time follows the clock, behind talks", async ({ page }) => {
  await page.goto("program/#fr");
  await ready(page);

  const line = page.locator("#fr .program-now");

  // Line's offset into the row of 10:00 (fifth row), in parts of the row
  const offset = () =>
    line.evaluate((el) => {
      const row = el.parentElement.querySelector("tbody tr:nth-child(5)").getBoundingClientRect();
      const box = el.getBoundingClientRect();
      return (box.top + box.height / 2 - row.top) / row.height;
    });

  // Before the first talk and after the last one (01:00 the next day)
  await page.evaluate(() => window.conference.live.setTime("08:59", 0));
  await expect(line).toBeHidden();
  await page.evaluate(() => window.conference.live.setTime("01:00", 1));
  await expect(line).toBeHidden();

  await page.evaluate(() => window.conference.live.setTime("10:00", 0));
  await expect(line).toBeVisible();
  expect(await offset()).toBeCloseTo(0, 1);

  await page.evaluate(() => window.conference.live.setTime("10:06", 0));
  expect(await offset()).toBeCloseTo(0.4, 1);

  // From the time column to the last room, but behind talks
  const box = await line.boundingBox();
  const headers = page.locator("#fr .program-table-container thead th");
  const first = await headers.first().boundingBox();
  const last = await headers.last().boundingBox();
  expect(box.x).toBeCloseTo(first.x, 0);
  expect(box.x + box.width).toBeCloseTo(last.x + last.width, 0);

  await page.evaluate(() => window.conference.live.setTime("10:30", 0));
  const talk = page.locator("#fr td[rowspan]", { hasText: "quotes" });
  await talk.scrollIntoViewIfNeeded();
  const talkBox = await talk.boundingBox();
  const lineBox = await line.boundingBox();

  // Hit-testable for the check only: on top, it would be found instead of the talk
  await line.evaluate((el) => (el.style.pointerEvents = "auto"));
  const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("td")?.textContent.includes("quotes"), [talkBox.x + talkBox.width / 2, lineBox.y + 1]);
  expect(hit).toBe(true);

  // Time column on top, the line painted into its background (behind the label)
  const timeCell = page.locator("#fr tbody tr").filter({ has: page.locator("th") }).nth(6).locator("th");
  const covering = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("th")?.textContent.trim(), [(await timeCell.boundingBox()).x + 1, lineBox.y + 1]);
  expect(covering).toBe("10:30");
  const stripeTop = await timeCell.evaluate((cell) => cell.getBoundingClientRect().top + parseFloat(getComputedStyle(cell, "::after").top));
  expect(stripeTop).toBeCloseTo(lineBox.y + 1, 1);
  expect(await page.locator("#fr tbody th.program-now-cell").count()).toBe(2);

  // Other day: hidden in the inactive tab, shown on Saturday
  await expect(page.locator("#sa .program-now")).toBeHidden();
  await page.evaluate(() => window.conference.live.setTime("09:20", 1));
  await page.locator("#tab-sa").click();
  await expect(page.locator("#sa .program-now")).toBeVisible();
  await expect(line).toBeHidden();
});

test("line at the current time follows the table when the window is resized", async ({ page }) => {
  await page.goto("program/#fr");
  await ready(page);
  await page.evaluate(() => window.conference.live.setTime("10:00", 0));

  const line = page.locator("#fr .program-now");
  const timeColumn = page.locator("#fr .program-table-container thead th").first();
  await expect(line).toBeVisible();

  // Wider window: the centred table moves without changing its size
  await page.setViewportSize({ width: 1600, height: 800 });
  await expect.poll(async () => (await line.boundingBox()).x - (await timeColumn.boundingBox()).x).toBeCloseTo(0, 0);
});
