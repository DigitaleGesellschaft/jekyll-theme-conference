/**
 * Conference clock: the current time (seconds), which can be frozen or
 * shifted for testing, e.g. clock.set(timestamp) shows the site at that time
 */
export function createClock() {
  let frozen = false;
  let frozenTime = 0;
  let offset = 0;
  const listeners = new Set();

  const realTime = () => Math.floor(Date.now() / 1000);
  const now = () => (frozen ? frozenTime : realTime() - offset);
  const notify = () => listeners.forEach((listener) => listener());

  return {
    now,
    isFrozen: () => frozen,

    // Called whenever the time jumps, e.g. to update the page
    onChange: (listener) => listeners.add(listener),

    pause() {
      if (frozen) {
        return;
      }
      frozenTime = now();
      frozen = true;
      notify();
    },

    resume() {
      if (!frozen) {
        return;
      }
      offset = realTime() - frozenTime;
      frozen = false;
      notify();
    },

    reset() {
      offset = 0;
      frozen = false;
      notify();
    },

    set(timestamp) {
      frozenTime = timestamp;
      frozen = true;
      notify();
    },
  };
}
