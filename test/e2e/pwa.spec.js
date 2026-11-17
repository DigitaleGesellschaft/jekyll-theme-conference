import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ready } from "./helpers.js";

const OFFLINE_PAGES = ["program/", "talks/opening_welcome/", "speakers/ada_lovelace/", "rooms/room_a/"];

test("pages and stylesheets are available offline", async ({ page, context }) => {
  await page.goto("");

  // Wait until the service worker precached a talk page
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    const url = new URL("talks/opening_welcome/", location.href).href;
    for (let i = 0; i < 100 && !(await caches.match(url)); i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  });
  await context.setOffline(true);

  for (const path of OFFLINE_PAGES) {
    await page.goto(path);
    await expect(page.locator("nav.navbar").first()).toHaveCSS("display", "flex");
  }
});

test("theme bundles are precached with their content hash", async ({ page }) => {
  await page.goto("");

  const keys = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    const [name] = (await caches.keys()).filter((key) => key.startsWith("jekyll-conference-theme-"));
    return (await (await caches.open(name)).keys()).map((request) => request.url);
  });
  expect(keys.some((url) => /conference\.bundle\.css\?v=[0-9a-f]{10}$/.test(url))).toBe(true);
});

test("a new build's versioned assets are not served from an old cache", async ({ page }) => {
  await page.goto("");

  const body = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    while (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Simulate the precached copy of the previous build
    const url = new URL("assets/css/main.css", location.href).href;
    const [name] = (await caches.keys()).filter((key) => key.startsWith("jekyll-conference-theme-"));
    await (await caches.open(name)).put(url, new Response("/* stale */"));

    return (await fetch(`${url}?t=new-build`)).text();
  });
  expect(body).not.toContain("stale");
});

// Install banner on phones and tablets (Chrome's desktop UA otherwise)
const PHONES = {
  ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
};
const OTHER_PLATFORM = { ios: "android", android: "ios" };

for (const [platform, userAgent] of Object.entries(PHONES)) {
  test.describe(`install banner on ${platform}`, () => {
    test.use({ userAgent, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test("opens the platform's steps", async ({ page }) => {
      await page.goto("");
      await ready(page);

      const banner = page.locator("#pwa-banner");
      await expect(banner).toBeVisible();
      await expect(banner).toHaveAttribute("data-platform", platform);

      await banner.getByRole("button", { name: "Install" }).click();
      const steps = page.getByRole("dialog", { name: "Install the app" });
      await expect(steps).toBeVisible();
      await expect(steps.locator(`[data-pwa-steps="${platform}"]`)).toBeVisible();
      await expect(steps.locator(`[data-pwa-steps="${OTHER_PLATFORM[platform]}"]`)).toBeHidden();
    });

    test("stays closed once dismissed", async ({ page }) => {
      await page.goto("");
      await ready(page);

      await page.locator("#pwa-banner").getByRole("button", { name: "Close" }).click();
      await expect(page.locator("#pwa-banner")).toBeHidden();

      await page.reload();
      await ready(page);
      await expect(page.locator("#pwa-banner")).toBeHidden();
    });

    for (const colorScheme of ["light", "dark"]) {
      test(`banner and steps have no axe violations in ${colorScheme} mode`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto("");
        await ready(page);

        await page.locator("#pwa-banner").getByRole("button", { name: "Install" }).click();
        await expect(page.locator("#pwa-install")).toBeVisible();

        const { violations } = await new AxeBuilder({ page }).include("#pwa-banner").include("#pwa-install").analyze();
        expect(violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
      });
    }
  });
}

test.describe("install banner on android with an install prompt", () => {
  test.use({ userAgent: PHONES.android, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  // Chrome offers the prompt once the app is installable
  const offerPrompt = (page) =>
    page.evaluate(() => {
      const event = new Event("beforeinstallprompt", { cancelable: true });
      event.prompt = () => {
        window.prompted = true;
        return Promise.resolve();
      };
      window.dispatchEvent(event);
    });

  test("shows the native prompt instead of the steps", async ({ page }) => {
    await page.goto("");
    await ready(page);
    await offerPrompt(page);

    await page.locator("#pwa-banner").getByRole("button", { name: "Install" }).click();
    expect(await page.evaluate(() => window.prompted)).toBe(true);
    await expect(page.locator("#pwa-install")).toBeHidden();

    await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
    await expect(page.locator("#pwa-banner")).toBeHidden();
  });

  test("falls back to the steps once the prompt was used", async ({ page }) => {
    await page.goto("");
    await ready(page);
    await offerPrompt(page);

    const install = page.locator("#pwa-banner").getByRole("button", { name: "Install" });
    await install.click();
    expect(await page.evaluate(() => window.prompted)).toBe(true);
    await expect(page.locator("#pwa-install")).toBeHidden();

    await install.click();
    await expect(page.locator("#pwa-install")).toBeVisible();
  });
});

test("website overscrolls as usual", async ({ page }) => {
  await page.goto("talks/");
  await ready(page);

  await expect(page.locator("html")).toHaveCSS("overscroll-behavior-y", "auto");
});

test("install banner is not shown on desktops", async ({ page }) => {
  await page.goto("");
  await ready(page);

  await expect(page.locator("#pwa-banner")).toBeHidden();
});

test.describe("installed app", () => {
  test.use({ viewport: { width: 390, height: 600 }, hasTouch: true });

  // iOS flag for "added to home screen", read by the theme's standalone detection
  test.beforeEach(({ page }) => page.addInitScript(() => Object.defineProperty(navigator, "standalone", { value: true })));

  test("page does not overscroll, keeping the tab bar in place", async ({ page }) => {
    await page.goto("talks/");
    await ready(page);

    await expect(page.locator("html")).toHaveCSS("overscroll-behavior-y", "none");
  });

  test("tabs show their icon above the label", async ({ page }) => {
    await page.goto("talks/");
    await ready(page);

    for (const tab of await page.locator("nav.navbar-pwa .nav-link").all()) {
      const [icon, label] = [await tab.locator(".bi").boundingBox(), await tab.locator("span").boundingBox()];
      expect(icon.y + icon.height).toBeLessThanOrEqual(label.y);
    }
  });

  test("More opens a sheet with the remaining entries", async ({ page }) => {
    await page.goto("");
    await ready(page);

    await page.locator("nav.navbar-pwa").getByRole("button", { name: "More" }).click();
    const sheet = page.getByRole("dialog", { name: "More" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link")).toHaveText(["Flyer", "All Times"]);

    await sheet.getByRole("link", { name: "All Times" }).click();
    await expect(page).toHaveURL(/\/conf\/variants\/alltimes\/$/);
  });

  for (const colorScheme of ["light", "dark"]) {
    test(`tab bar and sheet have no axe violations in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("talks/");
      await ready(page);

      await page.locator("nav.navbar-pwa").getByRole("button", { name: "More" }).click();
      await expect(page.locator("#navbar-pwa-more")).toBeVisible();

      const { violations } = await new AxeBuilder({ page }).include(".navbar-pwa").include("#navbar-pwa-more").analyze();
      expect(violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});
