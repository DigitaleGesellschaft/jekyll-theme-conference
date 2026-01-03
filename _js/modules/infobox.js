/**
 * Info Box Module - Handles dismissal persistence for info bars and modals using localStorage
 */
export function createInfoboxModule() {
  const STORAGE_KEYS = {
    bar: 'infobar_dismissed',
    modal: 'infomodal_dismissed'
  };
  const DEFAULT_DISMISS_MS = 7 * 86400 * 1000; // 7 days

  // Generic dismissal manager
  const createDismissalManager = (type) => {
    const storageKey = STORAGE_KEYS[type];
    const idAttr = `data-${type === 'bar' ? 'infobar' : 'infomodal'}-id`;
    const dismissAttr = `data-${type === 'bar' ? 'infobar' : 'infomodal'}-dismiss`;

    const getDismissedDict = () => {
      try {
        const data = localStorage.getItem(storageKey);
        return data ? JSON.parse(data) : {};
      } catch {
        localStorage.removeItem(storageKey);
        return {};
      }
    };

    const saveDismissedDict = (dict) => {
      localStorage.setItem(storageKey, JSON.stringify(dict));
    };

    const getDismissPeriod = (el) => {
      const sec = el.dataset[type === 'bar' ? 'infobarDismiss' : 'infomodalDismiss'];
      return sec ? parseInt(sec, 10) * 1000 : DEFAULT_DISMISS_MS;
    };

    const isDismissed = (el) => {
      const id = el.dataset[type === 'bar' ? 'infobarId' : 'infomodalId'];
      if (!id) return false;

      const dismissedDict = getDismissedDict();
      const expirationTimestamp = dismissedDict[id];
      if (!expirationTimestamp) return false;

      return Date.now() < parseInt(expirationTimestamp, 10);
    };

    const saveDismiss = (id) => {
      const selector = `[${idAttr}="${id}"]`;
      const el = document.querySelector(selector);
      if (!el || !el.hasAttribute(dismissAttr)) return;

      const dismissPeriod = getDismissPeriod(el);
      const dismissedDict = getDismissedDict();
      dismissedDict[id] = Date.now() + dismissPeriod;
      saveDismissedDict(dismissedDict);
    };

    return { isDismissed, saveDismiss };
  };

  const barManager = createDismissalManager('bar');
  const modalManager = createDismissalManager('modal');

  const init = () => {
    // Initialize info bars
    document.querySelectorAll('.alert[data-infobar-id]').forEach(el => {
      if (barManager.isDismissed(el)) {
        el.style.display = 'none';
        el.classList.remove('show', 'fade');
      }
    });

    document.addEventListener('close.bs.alert', e => {
      const id = e.target.dataset?.infobarId;
      if (id && e.target.dataset?.infobarDismiss) {
        barManager.saveDismiss(id);
      }
    });

    // Initialize info modals
    document.querySelectorAll('.modal.infomodal').forEach(el => {
      const id = el.dataset.infomodalId;

      // Skip if dismissed
      if (id && modalManager.isDismissed(el)) return;

      // Show modal
      const modal = new window.bootstrap.Modal(el);
      modal.show();

      // Track dismissal on close
      if (id && el.dataset.infomodalDismiss) {
        el.addEventListener('hidden.bs.modal', () => {
          modalManager.saveDismiss(id);
        }, { once: true });
      }
    });
  };

  return { init };
}
