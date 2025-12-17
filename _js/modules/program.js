/**
 * Program Module
 * Handles program navigation and tab management
 */
export function createProgramModule() {
  const updateHash = (hash) => {
    const scrollPosition = document.documentElement.scrollTop;
    window.location.hash = hash;
    document.documentElement.scrollTop = scrollPosition;
  };

  const init = () => {
    const dayList = document.getElementById('day-list');
    if (!dayList) return;

    const hash = window.location.hash;
    if (hash) {
      const tabTrigger = document.querySelector(`a[data-bs-toggle="tab"][href="${hash}"]`);
      if (tabTrigger) {
        const tab = new bootstrap.Tab(tabTrigger);
        tab.show();
      }
    } else {
      const tsNow = Date.now() / 1000 | 0;
      const tabLinks = document.querySelectorAll('a[data-bs-toggle="tab"]');
      for (const link of tabLinks) {
        const tsMidnight = parseInt(link.dataset.ts, 10);
        if (tsMidnight && tsMidnight <= tsNow && tsNow < tsMidnight + 24 * 60 * 60) {
          const tab = new bootstrap.Tab(link);
          tab.show();
          updateHash(link.hash);
          break;
        }
      }
    }

    // Add current selected day as hash to URL while keeping current scrolling position
    document.querySelectorAll('a[data-bs-toggle="tab"]').forEach(tabLink => {
      tabLink.addEventListener('shown.bs.tab', function () {
        updateHash(this.hash);
      });
    });
  };

  return {
    init: init
  };
}
