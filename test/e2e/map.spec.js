import { expect, test } from "@playwright/test";
import { ready, track } from "./helpers.js";

test("map loads third-party tiles only after consent click", async ({ page }) => {
  const log = await track(page);

  await page.goto("location/");
  await ready(page);
  await expect(page.locator("#map .leaflet-container, #map.leaflet-container")).toHaveCount(0);
  expect(log.external).toEqual([]);

  // Map API resolves once the visitor loads the map
  const mapPromise = page.evaluate(() => window.conference.map.getMap().then((map) => !!map));
  await page.getByRole("button", { name: "Load map" }).click();

  expect(await mapPromise).toBe(true);
  await expect(page.locator("#map.leaflet-container")).toHaveCount(1);
  expect(log.external.length).toBeGreaterThan(0);
  expect(log.failed).toEqual([]);
  expect(log.errors).toEqual([]);

  // The lazy chunk must not load the theme a second time (as a module
  // without the page's ?t= query)
  const entryLoads = await page.evaluate(() => performance.getEntriesByType("resource").filter((entry) => entry.name.includes("conference.bundle.js")).length);
  expect(entryLoads).toBe(1);
});
