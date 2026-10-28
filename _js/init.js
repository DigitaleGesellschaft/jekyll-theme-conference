/**
 * Initialization Module
 * Loads configuration and initializes all conference modules
 */
const NON_MODULES = ["config", "ready", "awaitReady"];

// Initialize each module with its config and lang; a failing module must not
// keep the others from starting. Modules loading data return a promise.
const initModules = (conference, config) => {
  const pending = [];

  for (const [name, module] of Object.entries(conference)) {
    if (NON_MODULES.includes(name) || !module?.init) {
      continue;
    }

    try {
      pending.push(module.init(config[name], config.lang?.[name]));
    } catch (error) {
      console.warn(`Failed to initialize module "${name}":`, error);
    }
  }

  return Promise.allSettled(pending);
};

export function init(conference) {
  return fetch(conference.config.baseurl + "/assets/js/config.json")
    .then((response) => response.json())
    .catch((error) => {
      console.error("Failed to load config:", error);
      return {};
    })
    .then(async (config) => {
      Object.assign(conference.config, config);
      await initModules(conference, config);

      conference.ready = true;
      return conference;
    });
}
