/**
 * Initialization Module
 * Loads configuration and initializes all conference modules
 */
export function init(conference) {
  // Load configuration
  const request = new Request(conference.config.baseurl + '/assets/js/config.json');

  fetch(request)
    .then(response => response.json())
    .then(config => {
      // Add configuration to global scope
      conference.config = Object.assign(conference.config, config);

      // Execute initialization functions
      for (const [name, module] of Object.entries(conference)) {
        if (['config', 'ready', 'awaitReady'].includes(name)) {
          continue;
        }

        let c;
        if (name in config) {
          c = config[name];
        }
        let l;
        if (config.lang && name in config.lang) {
          l = config.lang[name];
        }

        if (module && typeof module.init === 'function') {
          module.init(c, l);
        }
      }
    })
    .then(() => {
      conference.ready = true;
    })
    .catch((error) => {
      console.log(error);
    });
}

