import { expect, test } from "@playwright/test";
import { ready, track } from "./helpers.js";

const PAGES = ["", "program/", "talks/", "talks/opening_welcome/", "speakers/", "speakers/ada_lovelace/", "rooms/room_a/", "location/"];

for (const path of PAGES) {
  test(`/${path} loads without errors or third-party requests`, async ({ page }) => {
    const log = await track(page);

    await page.goto(path);
    await ready(page);

    expect(log.errors).toEqual([]);
    expect(log.failed).toEqual([]);
    expect(log.external).toEqual([]);
  });
}

test("one failing module does not stop the others", async ({ page }) => {
  const log = await track(page);

  // Storage blocked (e.g. cookies disabled) and a malformed hash
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } });
  });
  await page.goto('program/#"]');
  await ready(page);

  // The program module (initialised after the info box) built its sticky header
  await expect(page.locator(".tab-pane.active [data-program-sticky]")).toHaveCount(1);
  expect(log.errors).toEqual([]);
});
