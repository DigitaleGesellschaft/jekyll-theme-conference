/**
 * PWA Module - Service Worker Registration
 */
export function createPWAModule(config) {
  const init = () => {
    // Check if service workers are supported
    if (!("serviceWorker" in navigator)) {
      console.warn("Service workers are not supported in this browser.");
      return;
    }

    // Register the service worker
    const swPath = `${config.baseurl}/sw.js`;

    navigator.serviceWorker
      .register(swPath)
      .then((registration) => {
        console.log("Service worker registration successful: ", registration);

        // Check for updates periodically
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          console.log("New service worker found, installing...");

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              console.log("New service worker installed. Refresh to update.");
            }
          });
        });
      })
      .catch((error) => {
        console.error("Service worker registration failed: ", error);
      });
  };

  return { init };
}
