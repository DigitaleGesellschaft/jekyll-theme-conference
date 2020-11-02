var map;

(function() {
    var map_provider = "{{ site.conference.location.map.map_provider | default: 'OpenStreetMap.Mapnik' }}";
    var home_coord = [{{ site.conference.location.map.home_coord }}];
    var default_zoom = {{ site.conference.location.map.default_zoom | default: 17 }};

    if (document.getElementById('map')) {
        map = L.map('map').setView(home_coord, default_zoom);

        L.tileLayer.provider(map_provider).addTo(map);

        L.easyButton('far fa-star', function(){
            map.setView(home_coord, default_zoom);
        }).addTo(map);

        L.control.locate().addTo(map);
    }
})();
