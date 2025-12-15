/*
 * Custom JavaScript for your conference website
 *
 * This file is included after the conference.bundle.js and allows you to
 * add custom JavaScript code that can interact with the conference theme.
 *
 * The conference bundle provides the following global objects:
 * - window.conference: Main conference object with modules
 * - window.$ / window.jQuery: jQuery library
 * - window.L: Leaflet map library (if map is enabled)
 *
 * Example: Wait for conference to be ready, then access the map
 *
 * window.conference.awaitReady().then(() => {
 *     const map = window.conference.map.getMap();
 *     if (typeof map !== 'undefined') {
 *         // Add custom markers, layers, etc.
 *         L.marker([47.37785, 8.54035]).addTo(map);
 *     }
 * });
 *
 * Add your custom JavaScript code below.
 */
