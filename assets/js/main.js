---
---

{% include js/conference.js %}

(function() {
    // Alternative map providers can be found on https://leaflet-extras.github.io/leaflet-providers/preview/
    // The following do match the Bootstrap design not too badly:
    //   - Hydda.Full
    //   - Thunderforest.Neighbourhood
    //   - Esri.WorldTopoMap
    var map_provider = 'OpenStreetMap.Mapnik';

    var home_coord = [47.37808, 8.53935];
    var default_zoom = 17;

    if (document.getElementById('map')) {
        var map = L.map('map').setView(home_coord, default_zoom);

        L.tileLayer.provider(map_provider).addTo(map);

        L.easyButton('far fa-star', function(){
            map.setView(home_coord, default_zoom);
        }).addTo(map);

        L.control.locate().addTo(map);
    }
})();
