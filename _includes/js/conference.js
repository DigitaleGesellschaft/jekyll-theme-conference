// Style Framework: Bootstrap
{% include js/jquery-3.5.1.min.js %}
{% include js/popper.min.js %}
{% include js/bootstrap.js %}

// Icons: FontAwesome
//   Imported via CSS and webfonts

// Vertical Scroll Sync: Syncscroll
{% include js/syncscroll.js %}

// Global app variable
window.conference = {};

// Map Display Framework: Leaflet
{% if site.conference.location.hide != true and site.conference.location.map.enable %}
    {% include js/leaflet.js %}
    {% include js/leaflet-easybutton.js %}
    {% include js/leaflet-locatecontrol.js %}
    {% include js/leaflet-providers.js %}

    {% include js/conference-map.js %}
{% endif %}

// Bootstrap Extension: Modals
{% include js/conference-modal.js %}

// Live
{% if site.conference.live %}
    {% include js/conference-live.js %}
{% endif %}
