/**
 * Embed Module - Embedded content on pages (e.g. the stream overview),
 * loaded after consent: <iframe data-embed-src="https://…"> preceded by its
 * consent box
 */
import { loadEmbed } from "../core/consent.js";

export function createEmbedModule() {
  const init = () => {
    document.querySelectorAll("iframe[data-embed-src]").forEach((iframe) => {
      const consentEl = iframe.parentElement.querySelector("[data-embed-consent]");
      loadEmbed(iframe, consentEl, iframe.dataset.embedSrc);
    });
  };

  return { init };
}
