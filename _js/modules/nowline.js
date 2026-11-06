/**
 * Now Line Module - Marks the current time in the program table
 *
 * - .program-now[data-end]: line inside .program-table-container, moved
 *   between the rows' tbody tr[data-time] (start of the row) and data-end
 *   (end of the day), hidden outside of it
 *
 * Moves every minute while shown, wakes up at the first row otherwise, and
 * stops after the last day.
 */
const SECONDS_PER_MINUTE = 60;

// Upper bound for a single wait: timers drift, e.g. while the device sleeps
const MAX_SLEEP_SECONDS = 3600;

// Row of the current time and how far into it, e.g. { index: 2, fraction: 0.5 },
// or null outside [times[0], end)
export function linePosition(times, end, now) {
  if (!times.length || now < times[0] || now >= end) {
    return null;
  }

  const index = times.findLastIndex((time) => time <= now);
  const next = times[index + 1] ?? end;
  return { index, fraction: (now - times[index]) / (next - times[index]) };
}

export function createNowLineModule(clock) {
  let lines = [];
  let timer = null;

  // Line behind the labels of the time cells it crosses (.program-now-cell):
  // the sticky, opaque time column covers the line itself
  const paintTimeCells = (entry, top, bottom, color) => {
    entry.painted.forEach((cell) => {
      cell.classList.remove("program-now-cell");
      ["--program-now-top", "--program-now-height", "--program-now-color"].forEach((name) => cell.style.removeProperty(name));
    });
    entry.painted = [];

    entry.rows.forEach((row) => {
      const cell = row.cells[0];
      const box = cell.getBoundingClientRect();
      const from = Math.max(top, box.top) - box.top;
      const to = Math.min(bottom, box.bottom) - box.top;
      if (to <= from) {
        return;
      }
      cell.style.setProperty("--program-now-top", `${from}px`);
      cell.style.setProperty("--program-now-height", `${to - from}px`);
      cell.style.setProperty("--program-now-color", color);
      cell.classList.add("program-now-cell");
      entry.painted.push(cell);
    });
  };

  const place = (entry) => {
    const { line, container, table, rows, times, end } = entry;
    const position = linePosition(times, end, clock.now());

    // Tables in hidden tabs measure 0: placed once shown (ResizeObserver)
    const visible = position !== null && table.offsetHeight > 0;
    line.classList.toggle("d-none", !visible);
    if (!visible) {
      paintTimeCells(entry, 0, 0, "");
      return;
    }

    // Relative to the (horizontally scrolling) container, from the time
    // column to the last room (without the table's outer border spacing)
    const box = container.getBoundingClientRect();
    const row = rows[position.index].getBoundingClientRect();
    const tableBox = table.getBoundingClientRect();
    const spacing = parseFloat(getComputedStyle(table).borderSpacing) || 0;
    line.style.top = `${row.top - box.top + container.scrollTop + row.height * position.fraction}px`;
    line.style.left = `${tableBox.left - box.left + container.scrollLeft + spacing}px`;
    line.style.width = `${tableBox.width - 2 * spacing}px`;

    const lineBox = line.getBoundingClientRect();
    paintTimeCells(entry, lineBox.top, lineBox.bottom, getComputedStyle(line).backgroundColor);
  };

  // Seconds until the line has to move next, or null if it never does
  const secondsUntilChange = () => {
    const current = clock.now();

    const shown = lines.some(({ times, end }) => linePosition(times, end, current) !== null);
    if (shown) {
      return SECONDS_PER_MINUTE - (current % SECONDS_PER_MINUTE);
    }

    const next = Math.min(...lines.map(({ times }) => times[0]).filter((time) => time > current));
    return Number.isFinite(next) ? next - current : null;
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = null;
    if (clock.isFrozen()) {
      return;
    }

    const seconds = secondsUntilChange();
    if (seconds === null) {
      return;
    }
    timer = setTimeout(update, Math.min(seconds, MAX_SLEEP_SECONDS) * 1000);
  };

  const placeAll = () => lines.forEach(place);

  // Move the lines and wait for their next move
  const update = () => {
    placeAll();
    schedule();
  };

  const init = (config) => {
    if (!config) {
      return;
    }

    lines = [...document.querySelectorAll(".program-now")].map((line) => {
      const container = line.closest(".program-table-container");
      const table = container.querySelector(".program-table");
      const rows = [...table.querySelectorAll("tbody tr[data-time]")];
      return { line, container, table, rows, times: rows.map((row) => Number(row.dataset.time)), end: Number(line.dataset.end), painted: [] };
    });
    if (!lines.length) {
      return;
    }

    clock.onChange(update);

    // Timers are throttled in background tabs: catch up when shown again
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        update();
      }
    });

    // Rows change height with the window, fonts, or when a day's tab is shown;
    // the centred table moves with the container's width, keeping its size
    const observer = new ResizeObserver(placeAll);
    lines.forEach(({ container, table }) => {
      observer.observe(container);
      observer.observe(table);
    });

    update();
  };

  return { init, update };
}
