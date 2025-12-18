/**
 * Core conference object factory
 */
export function createConference() {
  // Get baseurl from the script tag data
  const scriptTag = document.querySelector('script[data-baseurl]');
  const baseurl = scriptTag ? scriptTag.dataset.baseurl : '';

  let readyResolve;
  const readyPromise = new Promise((resolve) => {
    readyResolve = resolve;
  });

  let _ready = false;

  return {
    config: {
      baseurl: baseurl
    },
    get ready() {
      return _ready;
    },
    set ready(value) {
      _ready = value;
      if (value === true && readyResolve) {
        readyResolve();
      }
    },

    awaitReady: () => {
      // If already ready, resolve immediately
      if (_ready === true) {
        return Promise.resolve();
      }
      // Otherwise return the deferred promise
      return readyPromise;
    }
  };
}

