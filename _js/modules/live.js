/**
 * Live Module - Shows the program's state at the current time
 *
 * - .live-show / .live-hide[data-start][data-end]: visible during / outside
 *   the time ranges, e.g. data-start="1771574400,1771596000"
 * - .live-time[data-time]: relative time, e.g. "in 5 minutes"
 * - .live-past[data-time]: enabled (links, buttons) or highlighted once started
 * - Debug API: setTime("09:30", "2026-02-20"), getTime(), pauseTime(), …
 *
 * Wakes up only at the next change (start or end of a range), or every
 * minute while relative times are shown, and stops after the conference.
 */
import { formatDate, formatTime, toTimestamp } from "../core/time.js";

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;
const SECONDS_PER_WEEK = 604800;
const MAX_WEEKS = 4;

// Upper bound for a single wait: timers drift, e.g. while the device sleeps
const MAX_SLEEP_SECONDS = SECONDS_PER_HOUR;

export function createLiveModule(clock) {
  let timeZone = "";
  let days = [];
  let lang = null;
  let timer = null;

  // Time ranges of an element, e.g. [[1771574400, 1771578000], ...]
  const ranges = (el) => {
    const ends = el.dataset.end.split(",").map(Number);
    return el.dataset.start.split(",").map((start, i) => [Number(start), ends[i]]);
  };

  const isInRange = (el, current) => ranges(el).some(([start, end]) => current >= start && current < end);

  const formatRelativeTime = (timestamp) => {
    if (!lang?.time) {
      return "";
    }

    let diff = clock.now() - timestamp;
    if (diff >= -SECONDS_PER_MINUTE && diff < 0) {
      return lang.time.soon;
    }
    if (diff >= 0 && diff < SECONDS_PER_MINUTE) {
      return lang.time.now;
    }

    const prefix = diff < 0 ? lang.time.in : lang.time.since;
    diff = Math.abs(diff);

    // Largest unit first, e.g. [2, "weeks", "week"]
    const units = [
      [Math.floor(diff / SECONDS_PER_WEEK), lang.time.weeks, lang.time.week],
      [Math.floor(diff / SECONDS_PER_DAY), lang.time.days, lang.time.day],
      [Math.floor(diff / SECONDS_PER_HOUR), lang.time.hours, lang.time.hour],
      [Math.max(1, Math.floor(diff / SECONDS_PER_MINUTE)), lang.time.minutes, lang.time.minute],
    ];
    if (units[0][0] > MAX_WEEKS) {
      return "";
    }

    const [count, plural, singular] = units.find(([value]) => value >= 1);
    return `${prefix}${count} ${count === 1 ? singular : plural}`;
  };

  const updateElements = () => {
    const current = clock.now();

    document.querySelectorAll(".live-show").forEach((el) => {
      el.classList.toggle("d-none", !isInRange(el, current));
    });

    document.querySelectorAll(".live-hide").forEach((el) => {
      el.classList.toggle("d-none", isInRange(el, current));
    });

    document.querySelectorAll(".live-time[data-time]").forEach((el) => {
      const text = el.dataset.time ? formatRelativeTime(Number(el.dataset.time)) : "";
      // Only update if changed to avoid unnecessary screen reader announcements
      if (el.textContent !== text) {
        el.textContent = text;
      }
    });

    document.querySelectorAll(".live-past[data-time]").forEach((el) => {
      const timestamp = Number(el.dataset.time);
      if (!timestamp) {
        return;
      }
      const isPast = current >= timestamp;
      if (el.nodeName === "A" || el.nodeName === "BUTTON") {
        el.classList.toggle("disabled", !isPast);
      } else {
        el.classList.toggle("text-secondary", !isPast);
      }
    });
  };

  // Seconds until the page has to change next, or null if it never does
  const secondsUntilChange = () => {
    const current = clock.now();

    // Relative times change every minute (aligned to the full minute)
    const showsRelativeTime = [...document.querySelectorAll(".live-time[data-time]")].some((el) => el.dataset.time);
    if (showsRelativeTime) {
      return SECONDS_PER_MINUTE - (current % SECONDS_PER_MINUTE);
    }

    const changes = [...document.querySelectorAll(".live-show, .live-hide")].flatMap((el) => ranges(el).flat());
    document.querySelectorAll(".live-past[data-time]").forEach((el) => changes.push(Number(el.dataset.time)));

    const next = Math.min(...changes.filter((time) => time > current));
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

  // Update the page and wait for its next change
  const update = () => {
    updateElements();
    schedule();
  };

  // ==========================================================================
  // Debug API
  // ==========================================================================

  // Wall-clock time of a conference day, e.g. setTime("09:30", "2026-02-20"),
  // setTime("09:30", 0) (first day) or setTime("09:30") (current day)
  const setTime = (timeStr, day) => {
    if (!days.length) {
      console.error("Conference days not configured");
      return;
    }

    let dayData;
    if (Number.isInteger(day)) {
      dayData = days[day];
    } else if (typeof day === "string") {
      dayData = days.find((d) => d.date === day) || days.find((d) => d.name === day);
    } else {
      const currentDate = formatDate(clock.now(), timeZone);
      dayData = days.find((d) => d.date === currentDate);
    }
    dayData ??= days[0];

    clock.set(toTimestamp(dayData.date, timeStr, timeZone));
  };

  const init = (config, langStrings) => {
    if (!config) {
      return;
    }

    timeZone = config.timezone || "";
    days = config.days || [];
    lang = langStrings;

    clock.onChange(update);

    // Timers are throttled in background tabs: catch up when shown again
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        update();
      }
    });

    update();
  };

  return {
    init,
    update,
    formatRelativeTime,
    setTime,
    getTime: () => formatTime(clock.now(), timeZone),
    pauseTime: clock.pause,
    continueTime: clock.resume,
    resetTime: clock.reset,
  };
}
