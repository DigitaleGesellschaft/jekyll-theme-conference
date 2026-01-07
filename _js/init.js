/**
 * Initialization Module
 * Loads configuration and initializes all conference modules
 */
export function init(conference) {
  return fetch(conference.config.baseurl + "/assets/js/config.json")
    .then((response) => response.json())
    .then((config) => {
      Object.assign(conference.config, config);

      // Initialize each module with its config and lang
      for (const [name, module] of Object.entries(conference)) {
        if (name === "config" || name === "ready" || name === "awaitReady")
          continue;
        if (module?.init) {
          module.init(config[name], config.lang?.[name]);
        }
      }

      conference.ready = true;
      return conference;
    })
    .catch((error) => {
      console.error("Failed to load config:", error);

      conference.ready = true;
      return conference;
    });
}
