/**
 * PWA Module - Service worker registration and toasts (install, update)
 *
 * The installed app (standalone) is detected before the first paint by the
 * header's inline script (data-pwa), which switches the navigation via CSS.
 */
export function createPWAModule(conferenceConfig) {
  const INSTALL_DISMISSED_KEY = "pwa_install_dismissed";
  const INSTALL_DISMISS_MS = 30 * 86400 * 1000; // 30 days

  // Message of the service worker (_layouts/sw.js) once a build changed the site
  const SITE_UPDATED = "site-updated";

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

  // Storage may be unavailable (e.g. blocked cookies): the toast then shows again
  const isDismissed = () => {
    try {
      return Date.now() < Number(localStorage.getItem(INSTALL_DISMISSED_KEY));
    } catch {
      return false;
    }
  };

  const saveDismiss = () => {
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now() + INSTALL_DISMISS_MS));
    } catch {
      // Dismissal is then not remembered
    }
  };

  // Bootstrap toast, staying until closed (_includes/pwa_toasts.html)
  const toastOf = (element) => window.bootstrap.Toast.getOrCreateInstance(element, { autohide: false });

  // One toast at a time, e.g. the update replaces the install toast
  const showToast = (element) => {
    document.querySelectorAll(".pwa-toasts .toast.show").forEach((shown) => toastOf(shown).hide());
    toastOf(element).show();
  };

  // Install toast with the steps of the platform
  const initInstall = () => {
    const toast = document.getElementById("pwa-install-toast");
    const platform = detectPlatform();
    if (!toast || !platform || isStandalone() || isDismissed()) {
      return;
    }

    document.querySelectorAll("[data-pwa-steps]").forEach((steps) => {
      steps.hidden = steps.dataset.pwaSteps !== platform;
    });
    showToast(toast);

    toast.querySelector(".btn-close").addEventListener("click", saveDismiss);

    // Not on top of the steps (or the prompt); shows again on the next page
    toast.querySelector("[data-bs-target='#pwa-install']").addEventListener("click", () => toastOf(toast).hide());

    // Chrome (Android) offers its own install prompt once the app is
    // installable: the toast replaces its mini-infobar and opens the prompt
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
    window.addEventListener("appinstalled", () => toastOf(toast).hide());
  };

  // Update toast in the app once the service worker stored a build changing
  // the site (websites show it from the next page on)
  const initUpdate = () => {
    const toast = document.getElementById("pwa-update-toast");
    if (!toast || !isStandalone()) {
      return;
    }

    toast.querySelector("[data-pwa-reload]").addEventListener("click", () => location.reload());
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === SITE_UPDATED) {
        showToast(toast);
      }
    });

    // Deliver messages sent while the page loaded
    navigator.serviceWorker.startMessages();
  };

  // Links to other sites open in the browser instead of within the app
  // (e.g. a talk's slides on another host), which offers no way back
  const initLinks = () => {
    if (!isStandalone()) {
      return;
    }

    document.addEventListener("click", (event) => {
      const link = event.target.closest?.("a[href]");
      if (!link || link.origin === location.origin || !link.protocol.startsWith("http")) {
        return;
      }

      link.target = "_blank";
      link.rel = "noopener";
    });
  };

  const init = (config) => {
    if (!config?.enable) {
      return;
    }

    initInstall();
    initLinks();

    if (!("serviceWorker" in navigator)) {
      console.warn("Service workers are not supported in this browser.");
      return;
    }

    initUpdate();

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
