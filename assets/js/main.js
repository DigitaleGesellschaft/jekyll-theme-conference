---
---

{% include js/conference.js %}

(function() {
    var map_provider = "{{ site.conference.location.map.map_provider | default: 'OpenStreetMap.Mapnik' }}";
    var home_coord = [{{ site.conference.location.map.home_coord }}];
    var default_zoom = {{ site.conference.location.map.default_zoom | default: 17 }};

    if (document.getElementById('map')) {
        var map = L.map('map').setView(home_coord, default_zoom);

        L.tileLayer.provider(map_provider).addTo(map);

        L.easyButton('far fa-star', function(){
            map.setView(home_coord, default_zoom);
        }).addTo(map);

        L.control.locate().addTo(map);

        {% for m in site.conference.location.map.markers %}
          var coord = [{{ m.coord }}];
          var icon = L.AwesomeMarkers.icon({
              {%- if m.icon %}
              icon: "{{ m.icon }}",
              prefix: 'fa',
              {%- endif %}
              iconColor: '{{ m.icon_color | default: "white" }}',
              markerColor: '{{ m.marker_color | default: "red" }}'
          });
          var marker = L.marker(coord, {icon: icon}).addTo(map);
          {% if m.description %}
          marker.bindPopup("{{ m.description }}").openPopup();
          {%- endif %}
        {% endfor %}
    }
})();
