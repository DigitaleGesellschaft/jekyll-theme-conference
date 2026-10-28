import { expect, test } from "@playwright/test";

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
