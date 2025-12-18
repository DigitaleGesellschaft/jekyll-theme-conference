/**
 * Info Bar Module - Handles dismissal persistence using localStorage
 */
export function createInfoBarModule() {
  const STORAGE_KEY = 'infobar_dismissed';
  const DEFAULT_DISMISS_MS = 7 * 86400 * 1000; // 7 days

  const getDismissPeriod = (el) => {
    const sec = el.dataset.infobarDismiss;
    return sec ? parseInt(sec, 10) * 1000 : DEFAULT_DISMISS_MS;
  };

  const getDismissedDict = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return {};
    }
  };

  const saveDismissedDict = (dict) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dict));
  };

  const isDismissed = (el) => {
    const id = el.dataset.infobarId;
    if (!id) return false;

    const dismissedDict = getDismissedDict();
    const expirationTimestamp = dismissedDict[id];

    if (!expirationTimestamp) return false;

    // Check if current time is before expiration timestamp
    return Date.now() < parseInt(expirationTimestamp, 10);
  };

  const saveDismiss = (id) => {
    // Find the element to get its dismiss period
    const el = document.querySelector(`[data-infobar-id="${id}"]`);
    if (!el || !el.dataset.infobarDismiss) return;

    const dismissPeriod = getDismissPeriod(el);
    const expirationTimestamp = Date.now() + dismissPeriod;

    const dismissedDict = getDismissedDict();
    dismissedDict[id] = expirationTimestamp;
    saveDismissedDict(dismissedDict);
  };

  const init = () => {
    // Hide previously dismissed info bars
    document.querySelectorAll('.alert[data-infobar-id]').forEach(el => {
      if (isDismissed(el)) {
        el.style.display = 'none';
        el.classList.remove('show', 'fade');
      }
    });

    // Store dismissal on close (only for dismissible infobars)
    document.addEventListener('close.bs.alert', e => {
      const id = e.target.dataset?.infobarId;
      if (id && e.target.dataset?.infobarDismiss) {
        saveDismiss(id);
      }
    });
  };

  return { init };
}
