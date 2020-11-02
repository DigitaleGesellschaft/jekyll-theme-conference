(function() {
    $('#link-modal').on('show.bs.modal', function (event) {
        var button = $(event.relatedTarget);

        var href = button.data('href');
        var header = button.data('header');
        var title = button.data('title');
        var footer = button.data('footer');
        var desc = button.data('desc');

        var modal = $(this);
        modal.find('iframe').attr('src', href);

        if (header) {
            modal.find('.modal-title').html(header);
        }
        else if (title) {
            modal.find('.modal-title').text(title);
        }
        else {
            modal.find('.modal-title').text('')
        }

        if (footer) {
            modal.find('.modal-footer').removeClass('d-none')
            modal.find('.modal-description').html(footer);
        }
        else if (desc) {
            modal.find('.modal-footer').removeClass('d-none')
            modal.find('.modal-description').text(desc);
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
})();
