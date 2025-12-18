/*
 * Custom JavaScript for your conference website
 *
 * This file is included after the conference.bundle.js and allows you to
 * add custom JavaScript code that can interact with the conference theme.
 *
 * The conference bundle provides the following global objects:
 * - window.conference: Main conference object with modules
 * - window.bootstrap: Bootstrap components
 * - window.L: Leaflet map library (loaded dynamically when map element exists on page)
 *
 * Example: Wait for conference to be ready, then access the map
 *
 * window.conference.awaitReady().then(async () => {
 *     const map = await window.conference.map?.getMap();
 *     if (map) {
 *         // Add custom markers, layers, etc.
 *         L.marker([47.37785, 8.54035]).addTo(map);
 *     }
 * });
 *
 * Add your custom JavaScript code below.
 */
