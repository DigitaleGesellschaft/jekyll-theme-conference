/**
 * Program Module - Handles program navigation and tab management
 */
export function createProgramModule() {
  const updateHash = (hash) => {
    const scrollY = document.documentElement.scrollTop;
    window.location.hash = hash;
    document.documentElement.scrollTop = scrollY;
  };

  const init = () => {
    if (!document.getElementById('program-tabs')) return;

    const hash = window.location.hash;
    const tabLinks = document.querySelectorAll('a[data-bs-toggle="tab"]');

    if (hash) {
      const tabTrigger = document.querySelector(`a[data-bs-toggle="tab"][href="${hash}"]`);
      if (tabTrigger) new bootstrap.Tab(tabTrigger).show();
    } else {
      const now = Date.now() / 1000 | 0;
      for (const link of tabLinks) {
        const ts = parseInt(link.dataset.ts, 10);
        if (ts && ts <= now && now < ts + 86400) {
          new bootstrap.Tab(link).show();
          updateHash(link.hash);
          break;
        }
      }
    }

    tabLinks.forEach(link => {
      link.addEventListener('shown.bs.tab', () => updateHash(link.hash));
    });
  };

  return { init };
}
