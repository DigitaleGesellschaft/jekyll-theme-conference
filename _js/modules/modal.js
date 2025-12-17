/**
 * Modal Module
 * Handles Bootstrap modal popups for links
 */
export function createModalModule() {
  const show = (el, event) => {
    const button = event.relatedTarget;

    const href = button.dataset.href;
    const format = button.dataset.format;
    const title = button.dataset.title;
    const subtitle = button.dataset.subtitle;
    const footer = button.dataset.footer;

    const modal = el;
    const iframe = modal.querySelector('iframe');
    const titleH3 = modal.querySelector('.modal-title h3');
    const titleH5 = modal.querySelector('.modal-title h5');
    const footerEl = modal.querySelector('.modal-footer');
    const footerP = modal.querySelector('.modal-footer p');

    iframe.setAttribute('src', href);

    if (title) {
      if (format === 'html') {
        titleH3.innerHTML = title;
        if (subtitle) {
          titleH5.innerHTML = subtitle;
          titleH5.classList.remove('d-none');
        } else {
          titleH5.textContent = '';
          titleH5.classList.add('d-none');
        }
      } else {
        titleH3.textContent = title;
        if (subtitle) {
          titleH5.textContent = subtitle;
          titleH5.classList.remove('d-none');
        } else {
          titleH5.textContent = '';
          titleH5.classList.add('d-none');
        }
      }
    } else {
      titleH3.textContent = '';
      titleH5.textContent = '';
      titleH5.classList.add('d-none');
    }

    if (footer) {
      footerEl.classList.remove('d-none');
      if (format === 'html') {
        footerP.innerHTML = footer;
      } else {
        footerP.textContent = footer;
      }
    } else {
      footerEl.classList.add('d-none');
    }
  };

  const hide = (el) => {
    const modal = el;

    modal.querySelector('.modal-title h3').textContent = '';
    const titleH5 = modal.querySelector('.modal-title h5');
    titleH5.textContent = '';
    titleH5.classList.add('d-none');
    modal.querySelector('iframe').setAttribute('src', '');
    modal.querySelector('.modal-footer p').innerHTML = '';
  };

  const init = () => {
    const modalEl = document.getElementById('link-modal');
    if (!modalEl) return;

    modalEl.addEventListener('show.bs.modal', function (event) {
      show(this, event);
    });
    modalEl.addEventListener('hide.bs.modal', function () {
      hide(this);
    });
  };

  return {
    init: init
  };
}
