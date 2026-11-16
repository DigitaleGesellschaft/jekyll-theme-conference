import { expect, test } from "@playwright/test";
import { ready, track } from "./helpers.js";

test("map loads third-party tiles only after consent click", async ({ page }) => {
  const log = await track(page);

  await page.goto("location/");
  await ready(page);
  await expect(page.locator("#map .leaflet-container, #map.leaflet-container")).toHaveCount(0);
  expect(log.external).toEqual([]);

  // Map API resolves once the visitor loads the map, after the location
  // page's map script (`map.script`) added its marker
  const mapPromise = page.evaluate(() =>
    window.conference.map.getMap().then((map) => {
      let markers = 0;
      map.eachLayer((layer) => (markers += layer instanceof L.CircleMarker));
      return markers;
    }),
  );
  await page.getByRole("button", { name: "Load map" }).click();

  expect(await mapPromise).toBe(1);
  await expect(page.locator("#map.leaflet-container")).toHaveCount(1);
  expect(log.external.length).toBeGreaterThan(0);
  expect(log.failed).toEqual([]);
  expect(log.errors).toEqual([]);

  // The lazy chunk must not load the theme a second time (as a module
  // without the page's ?t= query)
  const entryLoads = await page.evaluate(() => performance.getEntriesByType("resource").filter((entry) => entry.name.includes("conference.bundle.js")).length);
  expect(entryLoads).toBe(1);

  // Consent remembered across visits, e.g. in a new tab
  const newPage = await page.context().newPage();
  await track(newPage);
  await newPage.goto("location/");
  await expect(newPage.locator("#map.leaflet-container")).toHaveCount(1);
  await expect(newPage.locator("#map .map-consent")).toHaveCount(0);
});

test("map labels and areas: centred, sized to their text, in theme colours", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("location/");
  await ready(page);
  await page.getByRole("button", { name: "Load map" }).click();

  // Label: dark text on the light map tiles, also in dark mode
  // (retried until the map's stylesheet loaded)
  const label = page.locator("#map .map-label");
  await expect(label).toHaveCSS("color", "rgb(0, 0, 0)");

  // Centred on its point, on one line (retried until the map settled)
  const offset = () =>
    page.evaluate(async () => {
      const map = await window.conference.map.getMap();
      let marker;
      map.eachLayer((layer) => (marker = layer instanceof L.Marker ? layer : marker));
      const point = map.latLngToContainerPoint(marker.getLatLng());
      const container = map.getContainer().getBoundingClientRect();
      const box = marker.getElement().getBoundingClientRect();
      return Math.max(Math.abs(box.left + box.width / 2 - container.left - point.x), Math.abs(box.top + box.height / 2 - container.top - point.y));
    });
  await expect.poll(offset).toBeLessThan(2);
  expect((await label.boundingBox()).height).toBeLessThan(40);

  // Area in the primary colour
  const primary = await page.evaluate(() => {
    const el = document.body.appendChild(document.createElement("div"));
    el.style.color = "var(--bs-primary)";
    return getComputedStyle(el).color;
  });
  await expect(page.locator("#map path.map-area")).toHaveCSS("stroke", primary);
});
