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
      leafletPromise = Promise.all([
        import('leaflet'),
        import('leaflet-easybutton'),
        import('leaflet.locatecontrol'),
        import('leaflet-providers')
      ]).then(([L, , locateControl]) => {
        const leaflet = L.default;
        leaflet.control.locate = locateControl.locate;
        window.L = leaflet;
        return leaflet;
      });
    }
    return leafletPromise;
  };

  const init = (config, lang) => {
    if (!config || !document.getElementById('map')) return;

    // Prevent double initialization
    if (map) return;

    mapReadyPromise = new Promise((resolve) => {
      mapReadyResolve = resolve;
    });

    loadLeaflet().then((L) => {
      map = L.map('map').setView(config.home_coord, config.default_zoom);
      L.tileLayer.provider(config.map_provider).addTo(map);

      L.easyButton('bi bi-star', () => {
        map.flyTo(config.home_coord, config.default_zoom);
      }, lang?.focus_conf).addTo(map);

      L.control.locate({
        flyTo: true,
        strings: { title: lang?.focus_me }
      }).addTo(map);

      if (mapReadyResolve) {
        mapReadyResolve(map);
      }
    });
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
