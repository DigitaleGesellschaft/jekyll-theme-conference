window.conference.mapConfig = (() => {
    let config;
    let lang;

    let map;

    const setup = (elId) => {
        map = L.map(elId).setView(config.map.home_coord, config.map.default_zoom);

        L.tileLayer.provider(config.map.map_provider).addTo(map);

        L.easyButton('far fa-star', () => {
            map.flyTo(config.map.home_coord, config.map.default_zoom);
        }, lang.location.focus_conf).addTo(map);

        L.control.locate({
            flyTo: true,
            strings: {
                title: lang.location.focus_me
            }
        }).addTo(map);
    };

    const init = (c, l) => {
        config = c;
        lang = l;

        const elId = 'map';

        if (document.getElementById(elId)) {
            setup(elId);
        }
    };

    return {
        init: init
    };
})();
