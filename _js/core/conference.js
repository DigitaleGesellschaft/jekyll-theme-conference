/**
 * Core conference object factory
 * Creates the main conference object with config and ready state management
 */
export function createConference() {
  // Get baseurl from the script tag data attribute or fallback to empty
  const scriptTag = document.querySelector('script[data-baseurl]');
  const baseurl = scriptTag ? scriptTag.dataset.baseurl : '';

  return {
    config: {
      baseurl: baseurl
    },

    ready: false,

    awaitReady: () => {
      const poll = (resolve) => {
        if (window.conference.ready === true) {
          resolve();
        } else {
          setTimeout(() => poll(resolve), 500);
        }
      };
      return new Promise(poll);
    }
  };
}

