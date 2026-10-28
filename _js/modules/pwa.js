/**
 * PWA Module - Service worker registration
 *
 * The installed app (standalone) is detected before the first paint by the
 * header's inline script (data-pwa), which switches the navigation via CSS.
 */
export function createPWAModule(conferenceConfig) {
  const isStandalone = () => document.documentElement.dataset.pwa === "true";

  const init = (config) => {
    if (!config?.enable) {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      console.warn("Service workers are not supported in this browser.");
      return;
    }

    navigator.serviceWorker.register(`${conferenceConfig.baseurl}/sw.js`).catch((error) => {
      console.error("Service worker registration failed: ", error);
    });
  };

  return { init, isStandalone };
}
