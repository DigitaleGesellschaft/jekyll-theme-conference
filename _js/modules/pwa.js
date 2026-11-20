/**
 * PWA Module - Service worker registration and install banner
 *
 * The installed app (standalone) is detected before the first paint by the
 * header's inline script (data-pwa), which switches the navigation via CSS.
 */
export function createPWAModule(conferenceConfig) {
  const BANNER_DISMISSED_KEY = "pwa_banner_dismissed";
  const BANNER_DISMISS_MS = 30 * 86400 * 1000; // 30 days

  const isStandalone = () => document.documentElement.dataset.pwa === "true";

  // Platform of phones and tablets, e.g. "ios" (iPadOS reports a Mac with
  // touch); null on desktops, which offer installing in their address bar
  const detectPlatform = () => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
      return "ios";
    }
    if (/Android/.test(ua)) {
      return "android";
    }
    return null;
  };

  // Storage may be unavailable (e.g. blocked cookies): the banner then shows again
  const isDismissed = () => {
    try {
      return Date.now() < Number(localStorage.getItem(BANNER_DISMISSED_KEY));
    } catch {
      return false;
    }
  };

  const saveDismiss = () => {
    try {
      localStorage.setItem(BANNER_DISMISSED_KEY, String(Date.now() + BANNER_DISMISS_MS));
    } catch {
      // Dismissal is then not remembered
    }
  };

  // Banner (_includes/pwa_banner.html) styled and with steps for the platform
  const initBanner = () => {
    const banner = document.getElementById("pwa-banner");
    const platform = detectPlatform();
    if (!banner || !platform || isStandalone() || isDismissed()) {
      return;
    }

    banner.dataset.platform = platform;
    document.querySelectorAll("[data-pwa-steps]").forEach((steps) => {
      steps.hidden = steps.dataset.pwaSteps !== platform;
    });
    banner.hidden = false;

    banner.querySelector(".pwa-banner-close").addEventListener("click", () => {
      banner.hidden = true;
      saveDismiss();
    });

    // Chrome (Android) offers its own install prompt once the app is
    // installable: the banner replaces its mini-infobar and opens the prompt
    // instead of the steps (each prompt shows only once).
    let installPrompt = null;
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      installPrompt = event;
    });
    document.getElementById("pwa-install").addEventListener("show.bs.offcanvas", (event) => {
      if (!installPrompt) {
        return;
      }

      event.preventDefault();
      installPrompt.prompt();
      installPrompt = null;
    });
    window.addEventListener("appinstalled", () => {
      banner.hidden = true;
    });
  };

  const init = (config) => {
    if (!config?.enable) {
      return;
    }

    initBanner();

    if (!("serviceWorker" in navigator)) {
      console.warn("Service workers are not supported in this browser.");
      return;
    }

    // Once the page loaded: precaching all pages must not delay it
    const register = () =>
      navigator.serviceWorker.register(`${conferenceConfig.baseurl}/sw.js`).catch((error) => {
        console.error("Service worker registration failed: ", error);
      });
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  };

  return { init, isStandalone };
}
