window.conference.modal = (() => {

    const show = (el, event) => {
        const button = $(event.relatedTarget);

        const href = button.data('href');
        const format = button.data('format');
        const title = button.data('title');
        const subtitle = button.data('subtitle');
        const footer = button.data('footer');

        const modal = $(el);
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

    const hide = (el) => {
        const modal = $(el);

        modal.find('.modal-title h3').text('');
        modal.find('.modal-title h5').text('').addClass('d-none');
        modal.find('iframe').attr('src', '');
        modal.find('.modal-footer p').html('');
    };

    const init = () => {
        const elSel = '#link-modal';

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
