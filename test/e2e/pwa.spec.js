import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ready, track } from "./helpers.js";

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

// Mark the stored program (as by a previous build), once precached
const markStoredProgram = (page, replace) =>
  page.evaluate(async ([pattern, replacement]) => {
    await navigator.serviceWorker.ready;
    while (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const url = new URL("../../program/", location.href).href;
    for (let i = 0; i < 100 && !(await caches.match(url)); i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const html = (await (await caches.match(url)).text()).replace(new RegExp(pattern, "g"), replacement);
    for (const name of await caches.keys()) {
      await (await caches.open(name)).put(url, new Response(html, { headers: { "Content-Type": "text/html" } }));
    }
  }, replace);

// Without waiting for the network (e.g. a crowded conference Wi-Fi); a toast
// offers the version updated in the background
test("pages show the stored copy at once and offer the update", async ({ page }) => {
  await page.goto("talks/opening_welcome/");
  await markStoredProgram(page, ["</main>", '<p id="stored">Stored</p></main>']);

  await page.goto("program/");
  await expect(page.locator("#stored")).toHaveCount(1);

  const toast = page.locator("#pwa-update-toast");
  await expect(toast).toBeVisible();
  await toast.getByRole("button", { name: "Update" }).click();
  await expect(page.locator("#stored")).toHaveCount(0);
  await expect(toast).toBeHidden();
});

// Pages of each build link the site's files with its build time
test("a rebuild alone offers no update", async ({ page }) => {
  await page.goto("talks/opening_welcome/");
  await markStoredProgram(page, ["\\?t=\\d+", "?t=1"]);

  await page.goto("program/");
  await expect(page.locator('link[href*="main.css?t=1"]')).toHaveCount(1);

  // Wait for the background update to replace the stored copy
  await page.evaluate(async () => {
    while (/\?t=1"/.test(await (await caches.match(location.href)).text())) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  });
  await expect(page.locator("#pwa-update-toast")).toBeHidden();
});

// The page's request starts while the service worker boots
test("service worker preloads navigations", async ({ page }) => {
  await page.goto("");

  const enabled = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    for (let i = 0; i < 100 && !(await registration.navigationPreload.getState()).enabled; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return (await registration.navigationPreload.getState()).enabled;
  });

  expect(enabled).toBe(true);
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

// Install toast on phones and tablets (Chrome's desktop UA otherwise)
const PHONES = {
  ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
};
const OTHER_PLATFORM = { ios: "android", android: "ios" };

for (const [platform, userAgent] of Object.entries(PHONES)) {
  test.describe(`install toast on ${platform}`, () => {
    test.use({ userAgent, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    // Spaced like the sides (Bootstrap's spacing between toasts would add
    // to it, though only one shows at a time)
    test("sits at the bottom of the screen", async ({ page }) => {
      await page.goto("");
      await ready(page);

      const toast = page.locator("#pwa-install-toast");
      await expect(toast).toBeVisible();
      const box = await toast.boundingBox();
      expect(844 - (box.y + box.height)).toBeCloseTo(box.x, 0);
    });

    test("opens the platform's steps", async ({ page }) => {
      await page.goto("");
      await ready(page);

      const toast = page.locator("#pwa-install-toast");
      await expect(toast).toBeVisible();

      await toast.getByRole("button", { name: "Install" }).click();
      const steps = page.getByRole("dialog", { name: "Install the app" });
      await expect(steps).toBeVisible();
      await expect(steps.locator(`[data-pwa-steps="${platform}"]`)).toBeVisible();
      await expect(steps.locator(`[data-pwa-steps="${OTHER_PLATFORM[platform]}"]`)).toBeHidden();

      // Not on top of the steps; not dismissed, so it shows again on the next page
      await expect(toast).toBeHidden();
      await page.reload();
      await ready(page);
      await expect(toast).toBeVisible();
    });

    test("stays closed once dismissed", async ({ page }) => {
      await page.goto("");
      await ready(page);

      await page.locator("#pwa-install-toast").getByRole("button", { name: "Close" }).click();
      await expect(page.locator("#pwa-install-toast")).toBeHidden();

      await page.reload();
      await ready(page);
      await expect(page.locator("#pwa-install-toast")).toBeHidden();
    });

    for (const colorScheme of ["light", "dark"]) {
      test(`toast and steps have no axe violations in ${colorScheme} mode`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto("");
        await ready(page);

        const scan = async (selector) => {
          const { violations } = await new AxeBuilder({ page }).include(selector).analyze();
          return violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(" ")).join(", ")}`);
        };

        // Once faded in: half transparent, its colours would not count
        await expect(page.locator("#pwa-install-toast")).toHaveCSS("opacity", "1");
        expect(await scan("#pwa-install-toast")).toEqual([]);

        // The steps replace the toast
        await page.locator("#pwa-install-toast").getByRole("button", { name: "Install" }).click();
        await expect(page.locator("#pwa-install")).toBeVisible();
        expect(await scan("#pwa-install")).toEqual([]);
      });
    }
  });
}

test.describe("install toast on android with an install prompt", () => {
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

    await page.locator("#pwa-install-toast").getByRole("button", { name: "Install" }).click();
    expect(await page.evaluate(() => window.prompted)).toBe(true);
    await expect(page.locator("#pwa-install")).toBeHidden();

    await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
    await expect(page.locator("#pwa-install-toast")).toBeHidden();
  });

  test("falls back to the steps once the prompt was used", async ({ page }) => {
    await page.goto("");
    await ready(page);
    await offerPrompt(page);

    const install = page.locator("#pwa-install-toast").getByRole("button", { name: "Install" });
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

test("install toast is not shown on desktops", async ({ page }) => {
  await page.goto("");
  await ready(page);

  await expect(page.locator("#pwa-install-toast")).toBeHidden();
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

  test("toasts show above the tab bar", async ({ page }) => {
    await page.goto("talks/");
    await ready(page);
    await page.locator("#pwa-update-toast").evaluate((toast) => window.bootstrap.Toast.getOrCreateInstance(toast).show());
    await expect(page.locator("#pwa-update-toast")).toBeVisible();

    const [toast, tabs] = [await page.locator("#pwa-update-toast").boundingBox(), await page.locator("nav.navbar-pwa").boundingBox()];
    expect(toast.y + toast.height).toBeLessThanOrEqual(tabs.y);
  });

  test("tabs show their icon above the label", async ({ page }) => {
    await page.goto("talks/");
    await ready(page);

    for (const tab of await page.locator("nav.navbar-pwa .nav-link:visible").all()) {
      const [icon, label] = [await tab.locator(".bi").boundingBox(), await tab.locator("span").boundingBox()];
      expect(icon.y + icon.height).toBeLessThanOrEqual(label.y);
    }
  });

  test("Live replaces name_inactive in the tab bar while live and opens the stream", async ({ page }) => {
    await track(page);
    await page.goto("speakers/");
    await ready(page);

    const live = page.locator("nav.navbar-pwa").getByRole("link", { name: "Live" });
    const setTime = (time) => page.evaluate((t) => window.conference.live.setTime(t, 0), time);

    // Outside live: name_inactive in its place, disabled
    await setTime("06:00");
    await expect(live).toBeHidden();
    const inactive = page.locator("nav.navbar-pwa .nav-link.disabled", { hasText: "Offline" });
    await expect(inactive).toBeVisible();
    await expect(inactive).toHaveAttribute("aria-disabled", "true");

    await setTime("09:10");
    await expect(live).toBeVisible();
    await expect(inactive).toBeHidden();
    const [icon, label] = [await live.locator(".live-icon").boundingBox(), await live.locator("span").boundingBox()];
    expect(icon.y + icon.height).toBeLessThanOrEqual(label.y);

    await live.click();
    await expect(page.locator("#stream-modal")).toBeVisible();
  });

  test("tab bar holds four tabs on narrow phones, five from 390 px", async ({ page }) => {
    const setTime = (time) => page.evaluate((t) => window.conference.live.setTime(t, 0), time);
    const tabs = page.locator("nav.navbar-pwa .nav-link:visible span");

    // iPhone mini: Speakers moves into More, outside live and during
    await page.setViewportSize({ width: 375, height: 600 });
    await page.goto("");
    await ready(page);
    await setTime("06:00");
    await expect(tabs).toHaveText(["Program", "Talks", "Offline", "More"]);
    await setTime("09:10");
    await expect(tabs).toHaveText(["Program", "Talks", "Live", "More"]);

    await page.locator("nav.navbar-pwa").getByRole("button", { name: "More" }).click();
    await expect(page.getByRole("dialog", { name: "More" }).getByRole("link")).toHaveText(["Speakers", "Location", "Flyer", "All Times"]);

    await page.setViewportSize({ width: 390, height: 600 });
    await expect(tabs).toHaveText(["Program", "Talks", "Speakers", "Live", "More"]);
  });

  test("More opens a sheet with the remaining entries", async ({ page }) => {
    await page.goto("");
    await ready(page);

    await page.locator("nav.navbar-pwa").getByRole("button", { name: "More" }).click();
    const sheet = page.getByRole("dialog", { name: "More" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link")).toHaveText(["Location", "Flyer", "All Times"]);

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
