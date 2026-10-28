/**
 * Core conference object factory
 */
export function createConference() {
  let readyResolve;
  const readyPromise = new Promise((resolve) => {
    readyResolve = resolve;
  });

  let _ready = false;

  return {
    // Filled from the page's inline configuration, e.g. { baseurl: "/conf" }
    config: {},

    get ready() {
      return _ready;
    },
    set ready(value) {
      _ready = value;
      if (value === true) {
        readyResolve();
      }
    },

    awaitReady: () => readyPromise,
  };
}
