// Style Framework: Bootstrap
{% include js/jquery-3.2.1.slim.min.js %}
{% include js/popper.min.js %}
{% include js/bootstrap.js %}

// Icons: FontAwesome
//   Imported via CSS and webfonts

// Vertical Scroll Sync: Syncscroll
{% include js/syncscroll.js %}

// Map Display Framework: Leaflet
{% include js/leaflet.js %}
{% include js/leaflet-easybutton.js %}
{% include js/leaflet-locatecontrol.js %}
{% include js/leaflet-providers.js %}

// Bootstrap Extension: Modals
$('#link-modal').on('show.bs.modal', function (event) {
  var button = $(event.relatedTarget);

  var title = button.data('title');
  var href = button.data('href');
  var desc = button.data('desc');

  var modal = $(this);
  modal.find('.modal-title').text(title);
  modal.find('iframe').attr('src', href);

  if (desc) {
    modal.find('.modal-footer').removeClass('d-none')
    modal.find('.modal-description').html(desc);
  }
  else {
    modal.find('.modal-footer').addClass('d-none')
  }
});
$('#link-modal').on('hide.bs.modal', function (event) {
  var modal = $(this);
  modal.find('.modal-title').text('');
  modal.find('iframe').attr('src', '');
  modal.find('.modal-description').html('');
});
