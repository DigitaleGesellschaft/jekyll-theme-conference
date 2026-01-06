/**
 * Program Module - Handles program navigation and tab management
 */
export function createProgramModule() {
  const updateHash = (hash) => {
    const scrollY = document.documentElement.scrollTop;
    window.location.hash = hash;
    document.documentElement.scrollTop = scrollY;
  };

  const initStickyHeaders = () => {
    document.querySelectorAll('.program-table-container').forEach(container => {
      const table = container.querySelector('.program-table');
      const originalHeader = table?.querySelector('thead');
      if (!originalHeader) return;

      const headerHeight = originalHeader.offsetHeight;
      const stickyHeader = originalHeader.cloneNode(true);

      const stickyTable = document.createElement('table');
      stickyTable.className = table.className;
      stickyTable.appendChild(stickyHeader);

      const stickyWrapper = document.createElement('div');
      stickyWrapper.style.cssText = `
        position: sticky;
        top: 0;
        z-index: 930;
        overflow: hidden;
        background-color: var(--bs-body-bg, #fff);
        display: none;
      `;
      stickyWrapper.appendChild(stickyTable);

      const parent = container.parentNode;
      if (!parent) return;
      parent.insertBefore(stickyWrapper, container);

      // Synchronize horizontal scroll
      container.addEventListener('scroll', () => {
        stickyWrapper.scrollLeft = container.scrollLeft;
      });
      stickyWrapper.scrollLeft = container.scrollLeft;

      // Show/hide sticky header based on original header visibility
      new IntersectionObserver(
        ([entry]) => {
          stickyWrapper.style.display = entry.isIntersecting ? 'none' : 'block';
        },
        { threshold: [0], rootMargin: `-${headerHeight}px 0px 0px 0px` }
      ).observe(originalHeader);
    });
  };

  const initTabs = () => {
    const tabsElement = document.getElementById('program-tabs');
    if (!tabsElement) return;

    const tabLinks = document.querySelectorAll('a[data-bs-toggle="tab"]');
    const hash = window.location.hash;

    if (hash) {
      const tabTrigger = document.querySelector(`a[data-bs-toggle="tab"][href="${hash}"]`);
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

    tabLinks.forEach(link => {
      link.addEventListener('shown.bs.tab', () => updateHash(link.hash));
    });
  };

  const init = () => {
    initTabs();
    initStickyHeaders();
  };

  return { init };
}