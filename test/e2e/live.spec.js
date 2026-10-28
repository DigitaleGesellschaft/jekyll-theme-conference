import { expect, test } from "@playwright/test";
import { ready, track } from "./helpers.js";

const openStream = async (page, time, { consent = true } = {}) => {
  await page.goto("");
  await ready(page);
  await page.evaluate((t) => window.conference.live.setTime(t, 0), time);
  await page.locator("nav .live-show a[data-bs-target='#stream-modal']").click();
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

    await page.locator("nav .live-show a[data-bs-target='#stream-modal']").click();
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

test("debug time uses the conference timezone", async ({ page }) => {
  await page.goto("");
  await ready(page);

  const time = await page.evaluate(() => {
    window.conference.live.setTime("00:30", "2026-02-21");
    return window.conference.live.getTime();
  });
  expect(time).toBe("2026-02-21 00:30");
});
