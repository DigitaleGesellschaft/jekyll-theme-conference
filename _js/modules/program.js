/**
 * Program Module - Handles program navigation and tab management
 */
const SECONDS_PER_DAY = 86400;

export function createProgramModule() {
  // Replace the hash without scrolling or adding a history entry
  const updateHash = (hash) => {
    history.replaceState(null, '', hash);
  };

  const initStickyHeaders = () => {
    // Height of the visible header; hidden tabs (other days) measure 0
    const visibleHeader = document.querySelector('.tab-pane.active .program-table thead') || document.querySelector('.program-table thead');
    const headerHeight = visibleHeader?.offsetHeight || 0;

    document.querySelectorAll('.program-table-container').forEach(container => {
      const table = container.querySelector('.program-table');
      const originalHeader = table?.querySelector('thead');
      if (!originalHeader) return;

      // Visual copy only: hidden from assistive technology, without duplicate IDs
      const stickyHeader = originalHeader.cloneNode(true);
      stickyHeader.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));

      const stickyTable = document.createElement('table');
      stickyTable.className = table.className;
      stickyTable.appendChild(stickyHeader);

      const stickyWrapper = document.createElement('div');
      stickyWrapper.dataset.programSticky = '';
      stickyWrapper.setAttribute('aria-hidden', 'true');
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

          // A hidden element ignores scrolling: catch up with the table
          stickyWrapper.scrollLeft = container.scrollLeft;

          // Overlay the table instead of pushing it down: the shift would
          // reveal the original header again and the two would flicker
          // (exact height, offsetHeight is rounded to whole pixels)
          stickyWrapper.style.marginBottom = `-${stickyWrapper.getBoundingClientRect().height}px`;
        },
        { threshold: [0], rootMargin: `-${headerHeight}px 0px 0px 0px` }
      ).observe(originalHeader);
    });
  };

  const initTabs = () => {
    const tabsElement = document.getElementById('program-tabs');
    if (!tabsElement) return;

    const tabLinks = [...document.querySelectorAll('a[data-bs-toggle="tab"]')];
    const hash = window.location.hash;

    if (hash) {
      // Compare instead of building a selector from the (untrusted) URL hash
      const tabTrigger = tabLinks.find(link => link.hash === hash);
      if (tabTrigger) new bootstrap.Tab(tabTrigger).show();
    } else {
      // Show the current conference day
      const now = Math.floor(Date.now() / 1000);
      for (const link of tabLinks) {
        const ts = Number(link.dataset.ts);
        if (ts && ts <= now && now < ts + SECONDS_PER_DAY) {
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

  // Arrows in the room headers: on the outermost fully visible rooms if
  // more rooms are scrolled out of view on that side, scroll by one room
  const initRoomArrows = () => {
    document.querySelectorAll('.program-table-container').forEach(container => {
      const timeCell = container.querySelector('thead .program-time');
      const rooms = [...container.querySelectorAll('thead .program-talk')];
      if (!timeCell || !rooms.length) return;

      // Same arrows in the sticky header copy (initStickyHeaders)
      const sticky = container.previousElementSibling?.matches('[data-program-sticky]') ? container.previousElementSibling : null;
      const headers = [container, sticky].filter(Boolean);

      // Visible area: right of the sticky time column (tolerance for fractional pixels)
      const EPSILON = 1;
      const visibleArea = () => ({
        start: timeCell.getBoundingClientRect().right - EPSILON,
        end: container.getBoundingClientRect().right + EPSILON,
      });

      // Indices of the first and last fully visible room, e.g. [1, 1] on a
      // phone after one step; the first partly visible one if none fits
      const visibleRooms = () => {
        const { start, end } = visibleArea();
        const fits = rooms.flatMap((room, i) => {
          const { left, right } = room.getBoundingClientRect();
          return left >= start && right <= end ? [i] : [];
        });
        if (fits.length) return [fits[0], fits[fits.length - 1]];

        const partly = Math.max(0, rooms.findIndex(room => room.getBoundingClientRect().right > start));
        return [partly, partly];
      };

      const update = () => {
        const { start, end } = visibleArea();
        const [first, last] = visibleRooms();
        const hiddenBefore = rooms[0].getBoundingClientRect().left < start;
        const hiddenAfter = rooms[rooms.length - 1].getBoundingClientRect().right > end;

        headers.forEach(header => {
          header.querySelectorAll('thead .program-talk').forEach((room, i) => {
            room.querySelector('.program-arrow-prev').hidden = !(hiddenBefore && i === first);
            room.querySelector('.program-arrow-next').hidden = !(hiddenAfter && i === last);
          });
        });
      };

      // Align the neighbouring room with the time column
      const scrollToRoom = (index) => {
        const room = rooms[Math.min(Math.max(index, 0), rooms.length - 1)];
        const left = room.getBoundingClientRect().left - timeCell.getBoundingClientRect().right;
        container.scrollBy({ left, behavior: 'smooth' });
      };

      headers.forEach(header => {
        header.addEventListener('click', (event) => {
          const arrow = event.target.closest('.program-arrow');
          if (!arrow) return;

          const [first] = visibleRooms();
          scrollToRoom(arrow.classList.contains('program-arrow-prev') ? first - 1 : first + 1);
        });
      });

      container.addEventListener('scroll', update, { passive: true });

      // Also on resize and when a hidden day's tab is shown
      new ResizeObserver(update).observe(container);
    });
  };

  const init = () => {
    initTabs();
    initStickyHeaders();
    initRoomArrows();
  };

  return { init };
}
