import { expect, test } from "@playwright/test";
import { ready, track } from "./helpers.js";

const openStream = async (page, time, { consent = true } = {}) => {
  await page.goto("");
  await ready(page);
  await page.evaluate((t) => window.conference.live.setTime(t, 0), time);
  await page.locator("nav.d-pwa-none .live-show a[data-bs-target='#stream-modal']").click();
  await expect(page.locator("#stream-modal")).toBeVisible();
  if (consent) {
    await page.locator("#stream-modal").getByRole("button", { name: "Load content" }).click();
  }
};

test("stream is loaded only after consent, which is remembered per host", async ({ page }) => {
  const log = await track(page);
  // Both rooms are live
  await openStream(page, "09:32", { consent: false });

  const iframe = page.locator("#stream-modal iframe");
  await expect(page.locator("#stream-modal [data-embed-host]")).toHaveText("stream.example.org");
  await expect(iframe).not.toHaveAttribute("src", /stream/);
  expect(log.external).toEqual([]);

  await page.locator("#stream-modal").getByRole("button", { name: "Load content" }).click();
  await expect(iframe).toHaveAttribute("src", "https://stream.example.org/a");

  // Same host in another room: no second question
  await page.locator("#stream-modal .modal-footer .btn[data-room='Room <B>']").click();
  await expect(iframe).toHaveAttribute("src", "https://stream.example.org");
  await expect(page.locator("#stream-modal .btn[data-room='Room <B>']")).toHaveAttribute("aria-pressed", "true");

  // Remembered across visits, e.g. in a new tab
  const newPage = await page.context().newPage();
  await track(newPage);
  await openStream(newPage, "09:32", { consent: false });
  await expect(newPage.locator("#stream-modal iframe")).toHaveAttribute("src", "https://stream.example.org/a");
});

test("stream modal shows the current talk with its live links", async ({ page }) => {
  await track(page);
  await openStream(page, "09:10");

  await expect(page.locator("#stream-modal iframe")).toHaveAttribute("src", "https://stream.example.org/a");
  await expect(page.locator("#stream-info-talk")).toHaveText("Opening & Welcome");
  await expect(page.locator("#stream-info-links a")).toHaveText('Q&A "live"');
});

test.describe(() => {
  // Without the service worker answering from its cache
  test.use({ serviceWorkers: "block" });

  test("stream modal loads the talks again after a failed attempt", async ({ page }) => {
    await track(page);
    let offline = true;
    await page.route("**/assets/js/data.json", (route) => (offline ? route.abort() : route.continue()));

    await openStream(page, "09:10", { consent: false });
    await expect(page.locator("#stream-modal [data-embed-consent]")).toBeHidden();
    await page.locator("#stream-modal .btn-close").click();
    offline = false;
    await expect(page.locator("#stream-modal")).toBeHidden();

    await page.locator("nav.d-pwa-none .live-show a[data-bs-target='#stream-modal']").click();
    await expect(page.locator("#stream-modal [data-embed-host]")).toHaveText("stream.example.org");
  });
});

test("names are rendered as text, not markup", async ({ page }) => {
  await track(page);
  await openStream(page, "09:40", { consent: false });
  await page.locator("#stream-modal .modal-footer .btn[data-room='Room <B>']").click();

  await expect(page.locator("#stream-info-talk")).toHaveText('Talk with "quotes" <script>alert(1)</script>');
  await expect(page.locator("#stream-info-speakers")).toContainText('Eve "E" <i>Evil</i>');
  await expect(page.locator("#stream-info-speakers i")).toHaveCount(0);
});

test("stream iframe is not reloaded on periodic updates", async ({ page }) => {
  await track(page);
  await openStream(page, "09:40", { consent: false });
  await page.locator("#stream-modal .modal-footer .btn[data-room='Room <B>']").click();
  await page.locator("#stream-modal").getByRole("button", { name: "Load content" }).click();

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

test("live page shows the room of its address and keeps the chosen one in it", async ({ page }) => {
  const log = await track(page);
  await page.goto("live/?room=Room+%3CB%3E");
  await ready(page);
  await page.evaluate(() => window.conference.live.setTime("09:32", 0));

  // Loaded only after consent, as in the modal
  const iframe = page.locator("#stream iframe");
  await expect(page.locator("#stream [data-embed-host]")).toHaveText("stream.example.org");
  expect(log.external).toEqual([]);
  await page.locator("#stream").getByRole("button", { name: "Load content" }).click();
  await expect(iframe).toHaveAttribute("src", "https://stream.example.org");
  await expect(page.locator("#stream .btn[data-room='Room <B>']")).toHaveAttribute("aria-pressed", "true");

  await page.locator("#stream .btn[data-room='Room A']").click();
  await expect(iframe).toHaveAttribute("src", "https://stream.example.org/a");
  await expect(page).toHaveURL(/\?room=Room\+A$/);

  await page.reload();
  await ready(page);
  await expect(page.locator("#stream .btn[data-room='Room A']")).toHaveAttribute("aria-pressed", "true");
});

test("live page shows the rooms beside the stream and the next talk below it on large screens", async ({ page }) => {
  await track(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("live/");
  await ready(page);
  await page.evaluate(() => window.conference.live.setTime("09:10", 0));
  await expect(page.locator("#stream-info")).toBeVisible();

  const box = (selector) => page.locator(selector).boundingBox();
  const [player, info, rooms] = [await box("#stream .stream-player"), await box("#stream-info"), await box("#stream .stream-rooms")];
  expect(rooms.x).toBeGreaterThanOrEqual(player.x + player.width);
  expect(rooms.y).toBeCloseTo(player.y, 0);
  expect(info.x).toBeCloseTo(player.x, 0);
  expect(info.y).toBeGreaterThanOrEqual(player.y + player.height);
  // The stream fits the screen's height
  expect(player.y + player.height).toBeLessThanOrEqual(800);
  await expect(page.locator("#stream .btn[data-room='Room A']")).toBeVisible();
});

test("live page shows the rooms above the stream on phones, as the modal", async ({ page }) => {
  await track(page);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("live/");
  await ready(page);
  await page.evaluate(() => window.conference.live.setTime("09:10", 0));

  const box = (selector) => page.locator(selector).boundingBox();
  const [rooms, player, info] = [await box("#stream-select"), await box("#stream .stream-player"), await box("#stream-info")];
  expect(player.y).toBeGreaterThanOrEqual(rooms.y + rooms.height);
  expect(info.y).toBeGreaterThanOrEqual(player.y + player.height);

  await page.locator("#stream-select").selectOption({ label: "Room <B>" });
  await expect(page).toHaveURL(/\?room=Room\+%3CB%3E$/);
});

test("live page keeps the rooms at the bottom of the screen on tablets", async ({ page }) => {
  await track(page);
  const rooms = page.locator("#stream .stream-rooms");

  for (const [width, height] of [[800, 1000], [800, 450]]) {
    await page.setViewportSize({ width, height });
    await page.goto("live/");
    await ready(page);
    await page.evaluate(() => window.conference.live.setTime("09:10", 0));

    // Pinned to the bottom, also while the page scrolls (e.g. a short screen), below the next talk
    await expect(page.locator("#stream .btn[data-room='Room A']")).toBeVisible();
    const bar = await rooms.boundingBox();
    expect(bar.y + bar.height).toBeCloseTo(height, 0);
    if (height > 450) {
      const info = await page.locator("#stream-info").boundingBox();
      expect(bar.y).toBeGreaterThanOrEqual(info.y + info.height);
    }
  }
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
