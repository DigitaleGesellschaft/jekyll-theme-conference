/**
 * Modal Module - Shows links (e.g. videos) in a modal, after consent
 */
import { clearEmbed, loadEmbed } from "../core/consent.js";

export function createModalModule() {
  // Set content as HTML only when the attribute is marked as such (escaped by Liquid)
  const setContent = (el, content, format) => {
    el[format === "html" ? "innerHTML" : "textContent"] = content || "";
    el.classList.toggle("d-none", !content);
  };

  const show = (modal, event) => {
    const { href, title, titleFormat, subtitle, footer, footerFormat, clickToLoad } = event.relatedTarget.dataset;
    const titleEl = modal.querySelector("#link-modal-label");
    const iframe = modal.querySelector("iframe");

    setContent(titleEl, title, titleFormat);
    setContent(modal.querySelector("#link-modal-description"), title && subtitle, titleFormat);
    setContent(modal.querySelector(".modal-footer p"), footer, footerFormat);
    modal.querySelector(".modal-footer").classList.toggle("d-none", !footer);

    // Name the frame after its content, e.g. the talk
    iframe.dataset.defaultTitle ??= iframe.title;
    iframe.title = titleEl.textContent.trim() || iframe.dataset.defaultTitle;

    // Links with `click_to_load: false` skip the consent box, which may still
    // show from the previous link
    const consentEl = modal.querySelector("[data-embed-consent]");
    consentEl.classList.add("d-none");
    loadEmbed(iframe, clickToLoad === "false" ? null : consentEl, href);
  };

  const hide = (modal) => {
    clearEmbed(modal.querySelector("iframe"));
  };

  const init = () => {
    // Bootstrap hides a closing modal from assistive technology while it
    // still holds the focus; release it first (Bootstrap returns it to the
    // trigger once hidden)
    document.addEventListener("hide.bs.modal", (e) => {
      if (e.target.contains(document.activeElement)) {
        document.activeElement.blur();
      }
    });

    const modalEl = document.getElementById("link-modal");
    if (!modalEl) {
      return;
    }

    modalEl.addEventListener("show.bs.modal", (e) => show(modalEl, e));
    modalEl.addEventListener("hide.bs.modal", () => hide(modalEl));
  };

  return { init };
}
