import { expect, test } from "@playwright/test";
import { ready, track } from "./helpers.js";

const openStream = async (page, time) => {
  await page.goto("");
  await ready(page);
  await page.evaluate((t) => window.conference.live.setTime(t, 0), time);
  await page.locator("nav .live-show a[data-bs-target='#stream-modal']").click();
  await expect(page.locator("#stream-modal")).toBeVisible();
};

test("stream modal shows the current talk with its live links", async ({ page }) => {
  await track(page);
  await openStream(page, "09:10");

  await expect(page.locator("#stream-modal iframe")).toHaveAttribute("src", "https://stream.example.org/a");
  await expect(page.locator("#stream-info-talk")).toHaveText("Opening & Welcome");
  await expect(page.locator("#stream-info-links a")).toHaveText('Q&A "live"');
});

test("names are rendered as text, not markup", async ({ page }) => {
  await track(page);
  await openStream(page, "09:40");
  await page.locator("#stream-modal .modal-footer .btn[data-room='Room <B>']").click();

  await expect(page.locator("#stream-info-talk")).toHaveText('Talk with "quotes" <script>alert(1)</script>');
  await expect(page.locator("#stream-info-speakers")).toContainText('Eve "E" <i>Evil</i>');
  await expect(page.locator("#stream-info-speakers i")).toHaveCount(0);
});

test("stream iframe is not reloaded on periodic updates", async ({ page }) => {
  await track(page);
  await openStream(page, "09:40");
  await page.locator("#stream-modal .modal-footer .btn[data-room='Room <B>']").click();

  const reloads = await page.evaluate(async () => {
    const iframe = document.querySelector("#stream-modal iframe");
    let count = 0;
    new MutationObserver(() => count++).observe(iframe, { attributes: true, attributeFilter: ["src"] });
    window.conference.live.setTime("09:41", 0);
    window.conference.live.setTime("09:42", 0);
    await new Promise((resolve) => setTimeout(resolve, 50));
    return count;
  });
  expect(reloads).toBe(0);
});

test("debug time uses the conference timezone", async ({ page }) => {
  await page.goto("");
  await ready(page);

  const time = await page.evaluate(() => {
    window.conference.live.setTime("00:30", "2026-02-21");
    return window.conference.live.getTime();
  });
  expect(time).toBe("2026-02-21 00:30");
});
