import { expect, test } from "@playwright/test";
import { ready, track } from "./helpers.js";

test("dismissed info bar stays hidden after reload", async ({ page }) => {
  await page.goto("");
  await ready(page);

  const bar = page.locator(".alert[data-infobar-id]");
  await bar.getByRole("button", { name: "Close" }).click();
  await expect(bar).toHaveCount(0);

  await page.reload();
  await ready(page);
  await expect(page.locator(".alert[data-infobar-id]")).toBeHidden();
});

test("video link opens in a modal with the talk as title", async ({ page }) => {
  await track(page);
  await page.goto("talks/opening_welcome/");
  await ready(page);

  await page.getByRole("link", { name: "Recording" }).click();

  const modal = page.locator("#link-modal");
  await expect(modal).toBeVisible();
  await expect(modal.locator("#link-modal-label")).toHaveText("Opening & Welcome");

  // Privacy: the video host is contacted only after the click
  await expect(modal.locator("[data-embed-host]")).toHaveText("media.example.org");
  await expect(modal.locator("iframe")).not.toHaveAttribute("src", /media/);
  await modal.getByRole("button", { name: "Load content" }).click();
  await expect(modal.locator("iframe")).toHaveAttribute("src", "https://media.example.org/embed/opening");
});

test("video link with click_to_load: false loads right away", async ({ page }) => {
  await track(page);
  await page.goto("talks/opening_welcome/");
  await ready(page);
  const modal = page.locator("#link-modal");

  // The previous link's consent box does not stay
  await page.getByRole("link", { name: "Recording" }).click();
  await expect(modal.locator("[data-embed-consent]")).toBeVisible();
  await modal.locator(".btn-close").click();
  await expect(modal).toBeHidden();

  await page.getByRole("link", { name: "Interview" }).click();
  await expect(modal.locator("iframe")).toHaveAttribute("src", "https://media.example.org/embed/interview");
  await expect(modal.locator("[data-embed-consent]")).toBeHidden();
});

test("live indication follows the schedule", async ({ page }) => {
  await page.goto("program/");
  await ready(page);

  const live = page.locator(".tab-pane.active td", { hasText: "Opening & Welcome" }).locator(".live-show");
  await page.evaluate(() => window.conference.live.setTime("09:10", 0));
  await expect(live).toBeVisible();

  await page.evaluate(() => window.conference.live.setTime("09:40", 0));
  await expect(live).toBeHidden();
});

test("program shows the current day and switches days via the URL", async ({ page }) => {
  await page.goto("program/#sa");
  await ready(page);

  await expect(page.locator("#tab-sa")).toHaveClass(/active/);
  await expect(page.locator(".tab-pane.active")).toContainText("Second Day");
});

test("stream overview embeds every live room after consent", async ({ page }) => {
  const log = await track(page);
  await page.goto("live/");
  await ready(page);

  const streams = page.locator("iframe[src^='https://stream.example.org']");
  await expect(streams).toHaveCount(0);
  expect(log.external).toEqual([]);

  // Consent counts for the host, i.e. both rooms here
  await page.getByRole("button", { name: "Load content" }).first().click();
  await expect(streams).toHaveCount(1);
  await page.reload();
  await ready(page);
  await expect(streams).toHaveCount(2);
});

test("installed app shows the bottom navigation instead of the top one", async ({ page }) => {
  // iOS flag for "added to home screen", read by the theme's standalone detection
  await page.addInitScript(() => Object.defineProperty(navigator, "standalone", { value: true }));
  await page.goto("");
  await ready(page);

  const bottomNav = page.locator("nav.navbar-pwa");
  await expect(page.locator("header nav.navbar")).toBeHidden();
  await expect(bottomNav).toBeVisible();
  await expect(bottomNav.getByRole("link")).toHaveText(["Program", "Talks", "Speakers", "Location"]);

  // Content is not hidden behind the navigation at the bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const mainBottom = await page.locator("main").evaluate((main) => main.getBoundingClientRect().bottom);
  const navTop = (await bottomNav.boundingBox()).y;
  expect(mainBottom).toBeLessThanOrEqual(navTop);
  expect(navTop + (await bottomNav.boundingBox()).height).toBeLessThanOrEqual(page.viewportSize().height + 1);
});

test("dark mode follows the system preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("");
  await ready(page);

  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-bs-theme", "dark");

  await page.emulateMedia({ colorScheme: "light" });
  await expect(html).toHaveAttribute("data-bs-theme", "light");
});

test("next talk shows a relative time and enables live links once started", async ({ page }) => {
  await track(page);
  await page.goto("");
  await ready(page);

  const time = page.locator("#stream-info-time");
  const link = page.locator("#stream-info-links a");
  const setTime = (t) => page.evaluate((value) => window.conference.live.setTime(value, 0), t);

  // Open the stream while the talk is still upcoming (live link in the navigation)
  await setTime("08:58");
  await page.locator("nav .live-show a[data-bs-target='#stream-modal']").click();
  await expect(time).toHaveText("in 2 minutes");
  await expect(link).toHaveClass(/disabled/);

  await setTime("09:00");
  await expect(time).toHaveText("now");

  await setTime("09:10");
  await expect(time).toHaveText("since 10 minutes");
  await expect(link).not.toHaveClass(/disabled/);
});
