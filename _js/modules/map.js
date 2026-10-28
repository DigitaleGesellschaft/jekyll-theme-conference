/**
 * Map Module - Handles Leaflet map initialization
 *
 * Leaflet (script and styles) loads only with the map, e.g.
 * <div id="map" data-map-css="…/map.bundle.css?v=…"> with a <template
 * data-map-icon> holding the icon of the "center map" button.
 */
import { grantConsent, hasConsent } from "../core/consent.js";

export function createMapModule() {
  let map;
  let leafletPromise = null;
  let mapReadyPromise = null;
  let mapReadyResolve = null;

  const loadLeaflet = () => {
    if (!leafletPromise) {
      // Plugins extend the global L when evaluated, so load Leaflet first
      leafletPromise = import("leaflet")
        .then((L) => {
          window.L = L.default;
          return Promise.all([import("leaflet-easybutton"), import("leaflet.locatecontrol"), import("leaflet-providers")]);
        })
        .then(([, locateControl]) => {
          window.L.control.locate = locateControl.locate;
          return window.L;
        });
    }
    return leafletPromise;
  };

  // Resolves once loaded (or failed, the map then works unstyled)
  const loadStylesheet = (href) =>
    new Promise((resolve) => {
      if (!href) {
        resolve();
        return;
      }
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = link.onerror = resolve;
      document.head.append(link);
    });

  const createMap = (L, mapEl, config, lang) => {
    map = L.map(mapEl).setView(config.home_coord, config.default_zoom);
    L.tileLayer.provider(config.map_provider).addTo(map);

    const homeIcon = mapEl.querySelector("template[data-map-icon]")?.innerHTML.trim();
    L.easyButton(homeIcon || "&#9733;", () => {
      map.flyTo(config.home_coord, config.default_zoom);
    }, lang?.focus_conf).addTo(map);

    L.control.locate({
      flyTo: true,
      strings: { title: lang?.focus_me },
    }).addTo(map);

    mapReadyResolve(map);
  };

  const init = (config, lang) => {
    const mapEl = document.getElementById("map");
    if (!config || !mapEl) {
      return;
    }

    // Prevent double initialization
    if (mapReadyPromise) {
      return;
    }

    mapReadyPromise = new Promise((resolve) => {
      mapReadyResolve = resolve;
    });

    const load = () =>
      Promise.all([loadLeaflet(), loadStylesheet(mapEl.dataset.mapCss)]).then(([L]) => createMap(L, mapEl, config, lang));

    // Privacy: contact the tile provider only once the visitor asks for the
    // map (consent button is omitted with `click_to_load: false`), e.g.
    // "OpenStreetMap" for "OpenStreetMap.Mapnik" as named in the consent box
    const provider = config.map_provider.split(".")[0];
    const loadButton = mapEl.querySelector("[data-map-load]");
    if (!loadButton || hasConsent(provider)) {
      mapEl.querySelector(".map-consent")?.remove();
      load();
      return;
    }

    // Keep the keyboard focus, which the removed button held, on the map
    loadButton.addEventListener("click", () => {
      grantConsent(provider);
      mapEl.querySelector(".map-consent")?.remove();
      load().then(() => mapEl.focus());
    }, { once: true });
  };

  const getMap = () => {
    if (map) {
      return Promise.resolve(map);
    }
    return mapReadyPromise || Promise.resolve(null);
  };

  return { init, getMap };
}
