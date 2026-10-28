/**
 * Modal Module - Handles Bootstrap modal popups for links
 */
export function createModalModule() {
  // Set content as HTML only when the attribute is marked as such (escaped by Liquid)
  const setContent = (el, content, format) => {
    el[format === 'html' ? 'innerHTML' : 'textContent'] = content;
  };

  const show = (modal, event) => {
    const btn = event.relatedTarget;
    const { href, title, titleFormat, subtitle, footer, footerFormat } = btn.dataset;

    modal.querySelector('iframe').src = href;

    const titleH3 = modal.querySelector('.modal-title h3');
    const titleH5 = modal.querySelector('.modal-title h5');
    const footerEl = modal.querySelector('.modal-footer');
    const footerP = modal.querySelector('.modal-footer p');

    if (title) {
      setContent(titleH3, title, titleFormat);
      if (subtitle) {
        setContent(titleH5, subtitle, titleFormat);
        titleH5.classList.remove('d-none');
      } else {
        titleH5.textContent = '';
        titleH5.classList.add('d-none');
      }
    } else {
      titleH3.textContent = '';
      titleH5.textContent = '';
      titleH5.classList.add('d-none');
    }

    if (footer) {
      footerEl.classList.remove('d-none');
      setContent(footerP, footer, footerFormat);
    } else {
      footerEl.classList.add('d-none');
    }
  };

  const hide = (modal) => {
    modal.querySelector('.modal-title h3').textContent = '';
    const titleH5 = modal.querySelector('.modal-title h5');
    titleH5.textContent = '';
    titleH5.classList.add('d-none');
    modal.querySelector('iframe').src = '';
    modal.querySelector('.modal-footer p').textContent = '';
  };

  const init = () => {
    const modalEl = document.getElementById('link-modal');
    if (!modalEl) return;

    modalEl.addEventListener('show.bs.modal', e => show(modalEl, e));
    modalEl.addEventListener('hide.bs.modal', () => hide(modalEl));
  };

  return { init };
}
