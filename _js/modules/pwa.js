/**
 * PWA Module - Service Worker Registration and PWA Detection
 */
export function createPWAModule(config) {
  const isStandalone = () => {
    // Check if app is running in standalone mode (installed as PWA)
    // This works for both Android and iOS
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true ||
      document.referrer.includes("android-app://")
    );
  };

  const setNavigation = (isStandalone = true) => {

    const pwaNavbar = document.querySelector("nav.navbar-pwa");

    if (isStandalone) {
      if (pwaNavbar) {
        const navbarHeight = pwaNavbar.offsetHeight;
        document.body.style.paddingBottom = `${navbarHeight}px`;

      }
    } else {
      document.body.style.paddingBottom = "0";
    }
  };

  const init = () => {
    // Toggle navigation based on PWA installation status
    setNavigation(isStandalone());

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

  return { init, isStandalone, setNavigation };
}
