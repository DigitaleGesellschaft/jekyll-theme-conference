/**
 * Third-party content (videos, streams, map): loaded only after the
 * visitor's consent, remembered per provider for 30 days
 */
const STORAGE_KEY = "conference_embed_consent";
const CONSENT_MS = 30 * 86400 * 1000; // 30 days

// Consents as { provider: expiration timestamp (ms) }, e.g.
// { "www.youtube-nocookie.com": 1767225600000 } (embeds by host, the map by
// its provider name, e.g. "OpenStreetMap")
const loadHosts = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

// Host of an external URL, empty for the site itself
export const embedHost = (url) => {
  try {
    const parsed = new URL(url, location.href);
    return parsed.origin === location.origin ? "" : parsed.host;
  } catch {
    return "";
  }
};

export const hasConsent = (provider) => !provider || Date.now() < (loadHosts()[provider] || 0);

export const grantConsent = (provider) => {
  const hosts = loadHosts();
  hosts[provider] = Date.now() + CONSENT_MS;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hosts));
  } catch {
    // Storage blocked: ask again next time
  }
};

const showFrame = (iframe, url) => {
  iframe.classList.remove("d-none");
  // Compare with the last URL, not iframe.src: the browser normalizes the
  // latter (e.g. "https://host" -> "https://host/"), causing reloads
  if (iframe.dataset.embedUrl !== url) {
    iframe.dataset.embedUrl = url;
    iframe.src = url;
  }
};

/**
 * Show the URL in the iframe, or the consent box asking for it first, e.g.
 * <div data-embed-consent>… <span data-embed-host></span> <button data-embed-load>
 * (no consent box: loaded right away, see `click_to_load`)
 */
export const loadEmbed = (iframe, consentEl, url) => {
  if (!consentEl || hasConsent(embedHost(url))) {
    consentEl?.classList.add("d-none");
    showFrame(iframe, url);
    return;
  }

  clearEmbed(iframe);
  iframe.classList.add("d-none");
  const hostEl = consentEl.querySelector("[data-embed-host]");
  hostEl.textContent = embedHost(url);
  hostEl.href = url;
  consentEl.classList.remove("d-none");

  // Keep the keyboard focus, which the hidden button held, on the content
  consentEl.querySelector("[data-embed-load]").onclick = () => {
    grantConsent(embedHost(url));
    loadEmbed(iframe, consentEl, url);
    iframe.focus();
  };
};

// Unload the content, e.g. stop a video when its modal closes
export const clearEmbed = (iframe) => {
  if (iframe.dataset.embedUrl) {
    delete iframe.dataset.embedUrl;
    iframe.src = "about:blank";
  }
};
