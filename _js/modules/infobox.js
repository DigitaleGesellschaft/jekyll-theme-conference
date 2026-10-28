/**
 * Info Box Module - Handles dismissal persistence for info bars and modals using localStorage
 */
export function createInfoboxModule() {
  const DEFAULT_DISMISS_MS = 7 * 86400 * 1000; // 7 days

  // Dismissals per type, stored as { id: expiration timestamp (ms) }, e.g.
  // the bar <div data-infobar-id="sold-out" data-infobar-dismiss="86400">
  const createDismissalManager = (type) => {
    const storageKey = `${type}_dismissed`;

    // Storage may be unavailable (e.g. blocked cookies) or hold corrupt data
    const load = () => {
      try {
        return JSON.parse(localStorage.getItem(storageKey)) || {};
      } catch {
        return {};
      }
    };

    const isDismissed = (el) => {
      const id = el.dataset[`${type}Id`];
      return !!id && Date.now() < (load()[id] || 0);
    };

    const saveDismiss = (el) => {
      const id = el.dataset[`${type}Id`];
      const seconds = el.dataset[`${type}Dismiss`];
      if (!id || !seconds) return;

      const dismissed = load();
      dismissed[id] = Date.now() + (parseInt(seconds, 10) * 1000 || DEFAULT_DISMISS_MS);
      try {
        localStorage.setItem(storageKey, JSON.stringify(dismissed));
      } catch {
        // Dismissal is then not remembered
      }
    };

    return { isDismissed, saveDismiss };
  };

  const barManager = createDismissalManager('infobar');
  const modalManager = createDismissalManager('infomodal');

  const init = () => {
    // Info bars
    document.querySelectorAll('.alert[data-infobar-id]').forEach(el => {
      if (barManager.isDismissed(el)) {
        el.style.display = 'none';
        el.classList.remove('show', 'fade');
      }
    });

    document.addEventListener('close.bs.alert', e => barManager.saveDismiss(e.target));

    // Info modals
    document.querySelectorAll('.modal.infomodal').forEach(el => {
      if (modalManager.isDismissed(el)) return;

      new window.bootstrap.Modal(el).show();
      el.addEventListener('hidden.bs.modal', () => modalManager.saveDismiss(el), { once: true });
    });
  };

  return { init };
}
