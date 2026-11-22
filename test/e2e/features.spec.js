import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE_DIR } from "../support/build.js";
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

test("following a link in an info modal dismisses it", async ({ page }) => {
  // Landing page of the build with an info modal (_config.info-links.yml)
  const home = readFileSync(join(`${SITE_DIR}-info-links`, "index.html"), "utf8");
  await page.route((url) => url.pathname === "/conf/", (route) => route.fulfill({ contentType: "text/html", body: home }));

  await page.goto("");
  await ready(page);
  const modal = page.locator(".modal.infomodal");
  await modal.getByRole("link", { name: "Program" }).click();
  await page.waitForURL(/\/program\/$/);

  const dismissed = await page.evaluate(() => JSON.parse(localStorage.getItem("infomodal_dismissed")));
  expect(Object.keys(dismissed ?? {})).toEqual(["welcomecheck-out-the-program"]);
});

test("dropdown in an info modal is not clipped by the modal", async ({ page }) => {
  // Landing page of the build with an info modal (_config.info-links.yml)
  const home = readFileSync(join(`${SITE_DIR}-info-links`, "index.html"), "utf8");
  await page.route((url) => url.pathname === "/conf/", (route) => route.fulfill({ contentType: "text/html", body: home }));

  await page.goto("");
  await ready(page);
  const modal = page.locator(".modal.infomodal");
  await modal.getByRole("button", { name: "More" }).click();

  // The menu reaches beyond the modal's edge, yet all its corners are visible
  const item = modal.getByRole("link", { name: "Talks" });
  const corners = await item.evaluate((el) => {
    const { left, right, top, bottom } = el.getBoundingClientRect();
    const points = [[left + 1, top + 1], [right - 1, top + 1], [left + 1, bottom - 1], [right - 1, bottom - 1]];
    return points.map(([x, y]) => el.contains(document.elementFromPoint(x, y)));
  });
  const itemBox = await item.boundingBox();
  const modalBox = await modal.locator(".modal-content").boundingBox();
  expect(itemBox.x + itemBox.width).toBeGreaterThan(modalBox.x + modalBox.width);
  expect(corners).toEqual([true, true, true, true]);
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

test("video and stream modals fill phones and are wide on tablets", async ({ page }) => {
  await track(page);
  // Without the fade, so the dialogs are measured in place
  await page.emulateMedia({ reducedMotion: "reduce" });

  const open = async (width, path, trigger, modalId) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(path);
    await ready(page);
    await page.evaluate(() => window.conference.live.setTime("09:32", 0));
    await page.locator(trigger).first().evaluate((link) => link.click());
    const modal = page.locator(modalId);
    await expect(modal).toBeVisible();
    return {
      content: await modal.locator(".modal-content").boundingBox(),
      body: await modal.locator(".modal-body").boundingBox(),
      // Bottom of the last footer shown, e.g. the rooms (null if none)
      footerBottom: await modal.evaluate((el) => {
        const footers = [...el.querySelectorAll(".modal-footer")].filter((footer) => footer.checkVisibility());
        return footers.at(-1)?.getBoundingClientRect().bottom ?? null;
      }),
    };
  };
  const modals = [
    ["talks/opening_welcome/", "a[data-bs-target='#link-modal']", "#link-modal"],
    ["", "a[data-bs-target='#stream-modal']", "#stream-modal"],
  ];

  for (const [path, trigger, modalId] of modals) {
    // Phone: the whole screen, the video in 16:9 (not stretched to it), the last footer (e.g. rooms) at the bottom
    const phone = await open(375, path, trigger, modalId);
    expect(phone.content).toEqual({ x: 0, y: 0, width: 375, height: 800 });
    expect(phone.body.height).toBeLessThan(phone.body.width * 0.6);
    if (phone.footerBottom !== null) {
      expect(phone.footerBottom).toBeCloseTo(800, 0);
    }

    // Tablet: wider than Bootstrap's 500 px below lg
    const tablet = await open(800, path, trigger, modalId);
    expect(tablet.content.width).toBeGreaterThanOrEqual(700);
  }
});

test("video modal on phones keeps its close buttons in view, also with a long title", async ({ page }) => {
  await track(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const modal = page.locator("#link-modal");
  const footerClose = modal.locator(".modal-footer [data-bs-dismiss='modal']");

  const open = async (width) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("talks/opening_welcome/");
    await ready(page);
    // A title without spaces to wrap at
    await page.getByRole("link", { name: "Recording" }).evaluate((link) => {
      link.dataset.title = 'All Sorted by Machines of Loving Grace?"AI",Cybernetics&Fascism&how to Intervene';
    });
    await page.getByRole("link", { name: "Recording" }).click();
    await expect(modal).toBeVisible();
  };

  // Phone: the title wraps, the close buttons at the top and bottom
  await open(375);
  const close = await modal.locator(".modal-header .btn-close").boundingBox();
  expect(close.x + close.width).toBeLessThanOrEqual(375);
  expect(await modal.locator(".modal-content").evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual(375);
  await expect(footerClose).toBeVisible();
  await footerClose.click();
  await expect(modal).toBeHidden();

  // Tablet: the dialog's close button only
  await open(800);
  await expect(footerClose).toBeHidden();
});

test("stream modal on phones shows the rooms above the stream and a close button at the bottom", async ({ page }) => {
  await track(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const modal = page.locator("#stream-modal");
  const footerClose = modal.locator(".modal-footer [data-bs-dismiss='modal']");

  const open = async (width) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("");
    await ready(page);
    await page.evaluate(() => window.conference.live.setTime("09:32", 0));
    await page.locator("a[data-bs-target='#stream-modal']").first().evaluate((link) => link.click());
    await expect(modal).toBeVisible();
  };

  // Phone: title, rooms, stream; the close button at the bottom
  await open(375);
  const [header, rooms, player] = [
    await modal.locator(".modal-header").boundingBox(),
    await modal.locator(".stream-rooms").boundingBox(),
    await modal.locator(".stream-player").boundingBox(),
  ];
  expect(rooms.y).toBeGreaterThanOrEqual(header.y + header.height);
  expect(player.y).toBeGreaterThanOrEqual(rooms.y + rooms.height);
  const close = await footerClose.boundingBox();
  expect(close.y + close.height).toBeGreaterThan(800 - 2 * close.height);
  await footerClose.click();
  await expect(modal).toBeHidden();

  // Tablet: rooms below the stream, the dialog's close button only
  await open(800);
  expect((await modal.locator(".stream-rooms").boundingBox()).y).toBeGreaterThan((await modal.locator(".stream-player").boundingBox()).y);
  await expect(footerClose).toBeHidden();
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

test("installed app shows the bottom navigation instead of the top one", async ({ page }) => {
  // iOS flag for "added to home screen", read by the theme's standalone detection
  await page.addInitScript(() => Object.defineProperty(navigator, "standalone", { value: true }));
  await page.goto("");
  await ready(page);

  const bottomNav = page.locator("nav.navbar-pwa");
  await expect(page.locator("header nav.navbar")).toBeHidden();
  await expect(bottomNav).toBeVisible();
  await expect(bottomNav.getByRole("link")).toHaveText(["Program", "Talks", "Speakers", "Offline"]);
  await expect(bottomNav.getByRole("button")).toHaveText(["More"]);

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
  await page.locator("nav.d-pwa-none .live-show a[data-bs-target='#stream-modal']").click();
  await expect(time).toHaveText("in 2 minutes");
  await expect(link).toHaveClass(/disabled/);

  await setTime("09:00");
  await expect(time).toHaveText("now");

  await setTime("09:10");
  await expect(time).toHaveText("since 10 minutes");
  await expect(link).not.toHaveClass(/disabled/);
});
