(function() {
    var home_coord = [47.37808, 8.53935];
    var default_zoom = 17;

    var map = L.map('map').setView(home_coord, default_zoom);

    L.tileLayer.provider('Hydda.Full').addTo(map);

    L.easyButton('fa-star', function(){
        map.setView(home_coord, default_zoom);
    }).addTo(map);

    L.control.locate().addTo(map);
})();
