window.conference.mapConfig = (function() {

    let map;

    let mapProvider = "{{ site.conference.map.map_provider | default: 'OpenStreetMap.Mapnik' }}";
    let homeCoord = [{{ site.conference.map.home_coord }}];
    let zoomLevel = {{ site.conference.map.default_zoom | default: 17 }};

    let setup = function (elId) {
        map = L.map(elId).setView(homeCoord, zoomLevel);

        L.tileLayer.provider(mapProvider).addTo(map);

        L.easyButton('far fa-star', function(){
            map.flyTo(homeCoord, zoomLevel);
        }, '{{ site.data.lang[site.conference.lang].location.focus_conf | default: "Center map on conference location" }}').addTo(map);

        L.control.locate({
            flyTo: true,
            strings: {
                title: '{{ site.data.lang[site.conference.lang].location.focus_me | default: "Show me where I am" }}'
            }
        }).addTo(map);
    };

    let init = function () {
        let elId = 'map';

        if (document.getElementById(elId)) {
            setup(elId);
            window.conference.map = map;
        }
    };

    return {
        init: init,
        default: {
            mapProvider: mapProvider,
            homeCoord: homeCoord,
            zoomLevel: zoomLevel
        }
    };
})();

window.conference.mapConfig.init();
