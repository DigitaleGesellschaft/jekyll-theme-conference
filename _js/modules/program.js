/**
 * Program Module - Handles program navigation and tab management
 */
export function createProgramModule() {
  const updateHash = (hash) => {
    const scrollY = document.documentElement.scrollTop;
    window.location.hash = hash;
    document.documentElement.scrollTop = scrollY;
  };

  const initTabs = () => {
    const tabsElement = document.getElementById("program-tabs");
    if (!tabsElement) return;

    const tabLinks = document.querySelectorAll('a[data-bs-toggle="tab"]');
    const hash = window.location.hash;

    if (hash) {
      const tabTrigger = document.querySelector(
        `a[data-bs-toggle="tab"][href="${hash}"]`,
      );
      if (tabTrigger) new bootstrap.Tab(tabTrigger).show();
    } else {
      const now = Math.floor(Date.now() / 1000);
      for (const link of tabLinks) {
        const ts = Number(link.dataset.ts);
        if (ts && ts <= now && now < ts + 86400) {
          new bootstrap.Tab(link).show();
          updateHash(link.hash);
          break;
        }
      }
    }

    tabLinks.forEach((link) => {
      link.addEventListener("shown.bs.tab", () => updateHash(link.hash));
    });
  };

  const init = () => {
    initTabs();
  };

  return { init };
}
