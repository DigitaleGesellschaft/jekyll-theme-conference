/**
 * Stream Module - Live stream modal and page with room switching
 *
 * Loads the talks (data.json) only once the modal is opened or the live
 * page (layout `live`) shown, shows the room's stream (after consent, see
 * core/consent.js) or why there is none (not started, paused, ended,
 * offline) and the room's next talk. The installed app opens the live page
 * instead of the modal, so its tab bar stays.
 */
import { clearEmbed, loadEmbed } from "../core/consent.js";

const SECONDS_PER_MINUTE = 60;

export function createStreamModule(clock, live, conferenceConfig) {
  const settings = { pause: 60, prepend: 5, extend: 5 };
  let lang = {};
  let baseurl = "";
  let dataPromise = null;
  let data = {};

  // ==========================================================================
  // Data Access
  // ==========================================================================

  // A failed load (e.g. offline) is retried when the stream opens again
  const loadData = () => {
    dataPromise ??= fetch(`${baseurl}/assets/js/data.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`${response.status}`);
        }
        return response.json();
      })
      .then((json) => {
        data = json;
      })
      .catch((error) => {
        console.error("Failed to load live data:", error);
        dataPromise = null;
      });
    return dataPromise;
  };

  // Room by name, falling back to the first room with a stream
  const getRoom = (roomName) => {
    const rooms = data.rooms || {};
    return rooms[roomName] || Object.values(rooms)[0] || null;
  };

  // Talks of a room, ending later if they have live links (e.g. Q&A)
  const getTalks = (roomName) =>
    (data.talks?.[roomName] || []).map((talk) => ({
      ...talk,
      end: talk.live_links?.length ? talk.end + settings.extend * SECONDS_PER_MINUTE : talk.end,
    }));

  const getNextTalk = (roomName) => getTalks(roomName).find((talk) => clock.now() < talk.end) || null;

  const getNextPause = (roomName) => {
    const talks = getTalks(roomName);
    const current = clock.now();
    const pauseThreshold = settings.pause * SECONDS_PER_MINUTE;

    for (let i = 1; i < talks.length; i++) {
      const gap = talks[i].start - talks[i - 1].end;
      if (current < talks[i].start && gap >= pauseThreshold) {
        return { start: talks[i - 1].end, end: talks[i].start };
      }
    }
    return null;
  };

  // First and last talk of the room, or of all rooms if it has none
  const getStreamBounds = (roomName) => {
    let talks = getTalks(roomName);
    if (!talks.length) {
      talks = Object.keys(data.talks || {}).flatMap(getTalks);
    }
    if (!talks.length) {
      return { start: 0, end: 0 };
    }
    return {
      start: Math.min(...talks.map((talk) => talk.start)),
      end: Math.max(...talks.map((talk) => talk.end)),
    };
  };

  // Stream state of a room, e.g. { type: "live", url: "https://…" } or { type: "pause" }
  const getStreamState = (roomName) => {
    const current = clock.now();
    const bounds = getStreamBounds(roomName);
    const prependSec = settings.prepend * SECONDS_PER_MINUTE;
    const extendSec = settings.extend * SECONDS_PER_MINUTE;

    if (current < bounds.start - prependSec) {
      return { type: "pre" };
    }
    if (current >= bounds.end + extendSec) {
      return { type: "post" };
    }

    const pause = getNextPause(roomName);
    if (pause && current >= pause.start + extendSec && current <= pause.end - prependSec) {
      return { type: "pause" };
    }

    const room = getRoom(roomName);
    return room?.href ? { type: "live", url: room.href } : { type: "post" };
  };

  // ==========================================================================
  // Player: stream, consent box or message (e.g. "The live stream has ended.")
  // ==========================================================================

  const createPlayer = (streamEl) => {
    const iframe = streamEl.querySelector("iframe");
    const placeholder = streamEl.querySelector("#stream-placeholder");
    const message = placeholder.querySelector("#stream-modal-desc");
    const offline = placeholder.querySelector("#stream-offline");
    const consent = streamEl.querySelector("[data-embed-consent]");
    let url = null;

    const showPlaceholder = (content) => {
      for (const el of [message, offline]) {
        el.classList.toggle("d-none", el !== content);
      }
      consent?.classList.add("d-none");
      iframe.classList.add("d-none");
      placeholder.classList.replace("d-none", "d-flex");
    };

    const render = () => {
      if (!url) {
        return;
      }
      if (!navigator.onLine) {
        clearEmbed(iframe);
        showPlaceholder(offline);
        return;
      }
      placeholder.classList.replace("d-flex", "d-none");
      loadEmbed(iframe, consent, url);
    };

    window.addEventListener("online", render);
    window.addEventListener("offline", render);

    return {
      showStream: (streamUrl) => {
        url = streamUrl;
        render();
      },
      showMessage: (text) => {
        url = null;
        clearEmbed(iframe);
        message.textContent = text;
        showPlaceholder(message);
      },
      clear: () => {
        url = null;
        clearEmbed(iframe);
      },
    };
  };

  // ==========================================================================
  // Next Talk: time, title, speakers and live links of the room's next talk
  // ==========================================================================

  const createInfo = (streamEl) => {
    const container = streamEl.querySelector("#stream-info");
    const timeEl = streamEl.querySelector("#stream-info-time");
    const colorEl = streamEl.querySelector("#stream-info-color");
    const talkEl = streamEl.querySelector("#stream-info-talk");
    const speakersEl = streamEl.querySelector("#stream-info-speakers");
    const linksEl = streamEl.querySelector("#stream-info-links");
    const icons = streamEl.querySelector("#stream-icons");

    // Track colour classes, e.g. "border-info-subtle" or "link-underline-info"
    const setColor = (el, pattern, colorClass) => {
      el.classList.remove(...[...el.classList].filter((name) => pattern.test(name)));
      el.classList.add(colorClass);
    };

    const createLink = (href, text, className) => {
      const link = document.createElement("a");
      link.href = href;
      link.className = className;
      link.textContent = text;
      return link;
    };

    const renderSpeakers = (talk) => {
      const speakers = talk.speakers.map((name) => {
        const speaker = data.speakers?.[name] || { name };
        const linkClass = `text-reset link-underline-${talk.color} link-underline-opacity-0 link-underline-opacity-100-hover`;
        return speaker.href ? createLink(speaker.href, speaker.name, linkClass) : document.createTextNode(speaker.name);
      });
      speakersEl.replaceChildren(...speakers.flatMap((speaker, i) => (i ? [", ", speaker] : [speaker])));
    };

    // Buttons, enabled once the talk started, e.g. [icon] Q&A
    const renderLinks = (talk) => {
      const links = (talk.live_links || [])
        .filter((link) => (link.name || link.icon) && link.href)
        .map((link) => {
          const button = createLink(link.href, link.name || "", "btn btn-secondary m-1 live-past");
          button.dataset.time = talk.start;
          const icon = link.icon && icons?.content.querySelector(`[data-icon="${CSS.escape(link.icon)}"]`);
          if (icon) {
            button.prepend(icon.cloneNode(true), " ");
          }
          return button;
        });
      linksEl.replaceChildren(...links);
      linksEl.classList.toggle("d-none", !links.length);
    };

    const hide = () => {
      container.classList.add("d-none");
      timeEl.dataset.time = "";
    };

    const update = (roomName) => {
      const talk = getNextTalk(roomName);
      if (!talk || clock.now() < talk.start - settings.pause * SECONDS_PER_MINUTE) {
        hide();
        return;
      }

      timeEl.dataset.time = talk.start;
      setColor(colorEl, /^border-[a-z]+-subtle$/, `border-${talk.color}-subtle`);

      talkEl.textContent = talk.name;
      talkEl.href = talk.href || "#";
      setColor(talkEl, /^link-underline-[a-z]+$/, `link-underline-${talk.color}`);

      renderSpeakers(talk);
      renderLinks(talk);
      container.classList.remove("d-none");
    };

    return { update, hide };
  };

  // ==========================================================================
  // Room Selector: buttons (wide screens) or select (narrow screens)
  // ==========================================================================

  const createRoomSelector = (streamEl, onChange) => {
    const buttons = streamEl.querySelectorAll(".stream-rooms .btn[data-room]");
    const select = streamEl.querySelector("#stream-select");
    let current = null;

    const setActive = (room) => {
      current = room;
      buttons.forEach((btn) => {
        const active = btn.dataset.room === room?.name;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-pressed", active);
      });
      if (select) {
        select.value = room ? room.id : "";
      }
    };

    const choose = (roomName) => {
      const room = getRoom(roomName);
      if (room) {
        setActive(room);
        onChange(room);
      }
    };

    buttons.forEach((btn) => btn.addEventListener("click", () => choose(btn.dataset.room)));
    select?.addEventListener("change", () => choose(select.options[select.selectedIndex].text));

    return { setActive, choose, getCurrent: () => current };
  };

  // ==========================================================================
  // Stream: player, next talk and rooms, in the modal or on the live page
  // ==========================================================================

  const setupStream = (streamEl, onRoomChange) => {
    const player = createPlayer(streamEl);
    const info = createInfo(streamEl);
    let timer = null;

    const updateRoom = (room) => {
      const state = getStreamState(room.name);
      if (state.type === "live") {
        player.showStream(state.url);
      } else {
        player.showMessage(lang[`${state.type}_stream`]);
      }

      info.update(room.name);
      live.update();
    };

    const roomSelector = createRoomSelector(streamEl, (room) => {
      updateRoom(room);
      onRoomChange?.(room);
    });

    // Own flag: Bootstrap marks the modal as shown only after its transition
    let isOpen = false;

    // Follow the schedule while open, every full minute
    const tick = () => {
      const room = roomSelector.getCurrent();
      if (room) {
        updateRoom(room);
      }
      clearTimeout(timer);
      if (!clock.isFrozen()) {
        timer = setTimeout(tick, (SECONDS_PER_MINUTE - (clock.now() % SECONDS_PER_MINUTE)) * 1000);
      }
    };

    clock.onChange(() => isOpen && tick());

    const open = async (roomName) => {
      isOpen = true;
      await loadData();
      const room = getRoom(roomName);
      if (!room || !isOpen) {
        return;
      }
      roomSelector.setActive(room);
      tick();
    };

    const close = () => {
      isOpen = false;
      clearTimeout(timer);
      player.clear();
      info.hide();
      roomSelector.setActive(null);
      live.update();
    };

    return { open, close, choose: roomSelector.choose };
  };

  const setupModal = (modalEl) => {
    const stream = setupStream(modalEl);
    modalEl.addEventListener("show.bs.modal", (event) => stream.open(event.relatedTarget?.dataset.room));
    modalEl.addEventListener("hide.bs.modal", stream.close);
  };

  // Room from and in the address, e.g. /live/?room=Room+A, so reloading and
  // going back keep it. Links to the stream switch to their room in place,
  // e.g. a talk's live indication; without one (e.g. the Live tab) they
  // keep the room
  const setupPage = (pageEl) => {
    const setUrlRoom = (room) => {
      const url = new URL(location.href);
      url.searchParams.set("room", room.name);
      history.replaceState(history.state, "", url);
    };
    const stream = setupStream(pageEl, setUrlRoom);

    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[data-room]");
      if (!link || link.pathname !== location.pathname) {
        return;
      }
      event.preventDefault();
      const roomName = new URL(link.href).searchParams.get("room");
      if (roomName) {
        stream.choose(roomName);
      }
    });

    stream.open(new URLSearchParams(location.search).get("room"));
  };

  // App: links to the stream open the live page instead of the modal
  const linkToPage = () => {
    document.querySelectorAll("a[data-bs-target='#stream-modal']:not([href='#'])").forEach((link) => {
      link.removeAttribute("data-bs-toggle");
      link.removeAttribute("aria-haspopup");
    });
  };

  const init = (config, langStrings) => {
    const modalEl = document.getElementById("stream-modal");
    const pageEl = document.getElementById("stream");
    if (!config || !(modalEl || pageEl)) {
      return;
    }

    Object.assign(settings, config);
    lang = langStrings || {};
    baseurl = conferenceConfig.baseurl || "";

    if (pageEl) {
      setupPage(pageEl);
      return;
    }
    if (document.documentElement.dataset.pwa === "true") {
      linkToPage();
    }
    setupModal(modalEl);
  };

  return { init };
}
