window.conference.modal = (function () {

    let show = function (el, event) {
        let button = $(event.relatedTarget);

        let href = button.data('href');
        let format = button.data('format');
        let title = button.data('title');
        let subtitle = button.data('subtitle');
        let footer = button.data('footer');

        let modal = $(el);
        modal.find('iframe').attr('src', href);

        if (title) {
            if (format == 'html') {
                modal.find('.modal-title h3').html(title);
                if (subtitle) {
                    modal.find('.modal-title h5').html(subtitle).removeClass('d-none');
                }
                else {
                    modal.find('.modal-title h5').text('').addClass('d-none');
                }
            }
            else {
                modal.find('.modal-title h3').text(title);
                if (subtitle) {
                    modal.find('.modal-title h5').text(subtitle).removeClass('d-none');
                }
                else {
                    modal.find('.modal-title h5').text('').addClass('d-none');
                }
            }
        }
        else {
            modal.find('.modal-title h3').text('');
            modal.find('.modal-title h5').text('').addClass('d-none');
        }

        if (footer) {
            modal.find('.modal-footer').removeClass('d-none');
            if (format == 'html') {
                modal.find('.modal-footer p').html(footer);
            }
            else {
                modal.find('.modal-footer p').text(footer);
            }
        }
        else {
            modal.find('.modal-footer').addClass('d-none');
        }
    };

    let hide = function (el) {
        let modal = $(el);

        modal.find('.modal-title h3').text('');
        modal.find('.modal-title h5').text('').addClass('d-none');
        modal.find('iframe').attr('src', '');
        modal.find('.modal-footer p').html('');
    };

    let init = function() {
        let elSel = '#link-modal';

        $(elSel).on('show.bs.modal', function (event) {
            show(this, event);
        });
        $(elSel).on('hide.bs.modal', function () {
            hide(this);
        });
    };

    return {
        init: init
    };

})();

window.conference.modal.init();
