window.conference.modal = (function () {

    let show = function (el, event) {
        let button = $(event.relatedTarget);

        let href = button.data('href');
        let header = button.data('header');
        let title = button.data('title');
        let footer = button.data('footer');
        let desc = button.data('desc');

        let modal = $(el);
        modal.find('iframe').attr('src', href);

        if (header) {
            modal.find('.modal-title').html(header);
        }
        else if (title) {
            modal.find('.modal-title').text(title);
        }
        else {
            modal.find('.modal-title').text('');
        }

        if (footer) {
            modal.find('.modal-footer').removeClass('d-none');
            modal.find('.modal-description').html(footer);
        }
        else if (desc) {
            modal.find('.modal-footer').removeClass('d-none');
            modal.find('.modal-description').text(desc);
        }
        else {
            modal.find('.modal-footer').addClass('d-none');
        }
    };

    let hide = function (el, event) {
        let modal = $(el);

        modal.find('.modal-title').text('');
        modal.find('iframe').attr('src', '');
        modal.find('.modal-description').html('');
    };

    let init = function() {
        elSel = '#link-modal';

        $(elSel).on('show.bs.modal', function (event) {
            show(this, event);
        });
        $(elSel).on('hide.bs.modal', function (event) {
            hide(this, event);
        });
    };

    return {
        init: init
    };

})();

window.conference.modal.init();
