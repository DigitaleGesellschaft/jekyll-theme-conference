/**
 * Map Module - Handles Leaflet map initialization
 */
export function createMapModule() {
  let map;
  let leafletPromise = null;
  let mapReadyPromise = null;
  let mapReadyResolve = null;

  const loadLeaflet = () => {
    if (!leafletPromise) {
      // Plugins extend the global L when evaluated, so load Leaflet first
      leafletPromise = import('leaflet')
        .then((L) => {
          window.L = L.default;
          return Promise.all([
            import('leaflet-easybutton'),
            import('leaflet.locatecontrol'),
            import('leaflet-providers')
          ]);
        })
        .then(([, locateControl]) => {
          window.L.control.locate = locateControl.locate;
          return window.L;
        });
    }
    return leafletPromise;
  };

  const createMap = (L, config, lang) => {
    map = L.map('map').setView(config.home_coord, config.default_zoom);
    L.tileLayer.provider(config.map_provider).addTo(map);

    L.easyButton('bi bi-star', () => {
      map.flyTo(config.home_coord, config.default_zoom);
    }, lang?.focus_conf).addTo(map);

    L.control.locate({
      flyTo: true,
      strings: { title: lang?.focus_me }
    }).addTo(map);

    mapReadyResolve(map);
  };

  const init = (config, lang) => {
    const mapEl = document.getElementById('map');
    if (!config || !mapEl) return;

    // Prevent double initialization
    if (mapReadyPromise) return;

    mapReadyPromise = new Promise((resolve) => {
      mapReadyResolve = resolve;
    });

    const load = () => loadLeaflet().then((L) => createMap(L, config, lang));

    // Privacy: contact the tile provider only once the visitor asks for the
    // map (consent button is omitted with `click_to_load: false`)
    const loadButton = mapEl.querySelector('[data-map-load]');
    if (!loadButton) {
      load();
      return;
    }

    // Keep the keyboard focus, which the removed button held, on the map
    loadButton.addEventListener('click', () => {
      mapEl.querySelector('.map-consent')?.remove();
      load().then(() => mapEl.focus());
    }, { once: true });
  };

  const getMap = () => {
    if (map) {
      return Promise.resolve(map);
    }
    if (mapReadyPromise) {
      return mapReadyPromise;
    }
    return Promise.resolve(null);
  };

  return { init, getMap };
}
