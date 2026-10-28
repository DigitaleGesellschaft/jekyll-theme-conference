/**
 * Initialization Module
 * Reads the configuration (inlined into the page) and initializes all modules
 */

// Settings and translations, e.g. { "live": {...}, "lang": { "live": {...} } }
const readConfig = () => {
  try {
    return JSON.parse(document.getElementById("conference-config")?.textContent || "{}");
  } catch (error) {
    console.error("Failed to read config:", error);
    return {};
  }
};

// Initialize each module with its config and lang; a failing module must not
// keep the others from starting. Modules loading data return a promise.
export async function init(conference, modules) {
  const config = readConfig();
  Object.assign(conference.config, config);

  const pending = Object.entries(modules).map(([name, module]) => {
    try {
      return module.init(config[name], config.lang?.[name]);
    } catch (error) {
      console.warn(`Failed to initialize module "${name}":`, error);
      return null;
    }
  });
  await Promise.allSettled(pending);

  conference.ready = true;
  return conference;
}
