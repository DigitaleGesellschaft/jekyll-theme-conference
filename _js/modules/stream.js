/**
 * Stream Module - Live stream modal with room switching
 *
 * Loads the talks (data.json) only once the modal is opened, shows the
 * room's stream or why there is none (not started, paused, ended, offline)
 * and the room's next talk.
 */

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

  // A failed load (e.g. offline) is retried when the modal opens again
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
  // Player: stream or message (e.g. "Live stream has ended.")
  // ==========================================================================

  const createPlayer = (modalEl) => {
    const iframe = modalEl.querySelector("iframe");
    const placeholder = modalEl.querySelector("#stream-placeholder");
    const message = placeholder.querySelector("#stream-modal-desc");
    const offline = placeholder.querySelector("#stream-offline");
    let url = null;

    const showFrame = () => {
      iframe.classList.remove("d-none");
      // Compare with the last URL, not iframe.src: the browser normalizes the
      // latter (e.g. "https://host" -> "https://host/"), causing reloads
      if (iframe.dataset.streamUrl !== url) {
        iframe.dataset.streamUrl = url;
        iframe.src = url;
      }
    };

    // Unload the stream, e.g. when the modal closes
    const clearFrame = () => {
      if (iframe.dataset.streamUrl) {
        delete iframe.dataset.streamUrl;
        iframe.src = "about:blank";
      }
    };

    const showPlaceholder = (content) => {
      for (const el of [message, offline]) {
        el.classList.toggle("d-none", el !== content);
      }
      iframe.classList.add("d-none");
      placeholder.classList.replace("d-none", "d-flex");
    };

    const render = () => {
      if (!url) {
        return;
      }
      if (!navigator.onLine) {
        clearFrame();
        showPlaceholder(offline);
        return;
      }
      placeholder.classList.replace("d-flex", "d-none");
      showFrame();
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
        clearFrame();
        message.textContent = text;
        showPlaceholder(message);
      },
      clear: () => {
        url = null;
        clearFrame();
      },
    };
  };

  // ==========================================================================
  // Next Talk: time, title, speakers and live links of the room's next talk
  // ==========================================================================

  const createInfo = (modalEl) => {
    const container = modalEl.querySelector("#stream-info");
    const timeEl = modalEl.querySelector("#stream-info-time");
    const colorEl = modalEl.querySelector("#stream-info-color");
    const talkEl = modalEl.querySelector("#stream-info-talk");
    const speakersEl = modalEl.querySelector("#stream-info-speakers");
    const linksEl = modalEl.querySelector("#stream-info-links");

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
          if (link.icon) {
            const icon = document.createElement("i");
            icon.className = `bi bi-${link.icon}`;
            icon.setAttribute("aria-hidden", "true");
            button.prepend(icon, " ");
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

  const createRoomSelector = (modalEl, onChange) => {
    const buttons = modalEl.querySelectorAll(".modal-footer .btn[data-room]");
    const select = modalEl.querySelector("#stream-select");
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

    return { setActive, getCurrent: () => current };
  };

  // ==========================================================================
  // Modal
  // ==========================================================================

  const setupModal = (modalEl) => {
    const player = createPlayer(modalEl);
    const info = createInfo(modalEl);
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

    const roomSelector = createRoomSelector(modalEl, updateRoom);

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

    modalEl.addEventListener("show.bs.modal", async (event) => {
      isOpen = true;
      const roomName = event.relatedTarget?.dataset.room;
      await loadData();
      const room = getRoom(roomName);
      if (!room || !isOpen) {
        return;
      }
      roomSelector.setActive(room);
      tick();
    });

    modalEl.addEventListener("hide.bs.modal", () => {
      isOpen = false;
      clearTimeout(timer);
      player.clear();
      info.hide();
      roomSelector.setActive(null);
      live.update();
    });
  };

  const init = (config, langStrings) => {
    const modalEl = document.getElementById("stream-modal");
    if (!config || !modalEl) {
      return;
    }

    Object.assign(settings, config);
    lang = langStrings || {};
    baseurl = conferenceConfig.baseurl || "";
    setupModal(modalEl);
  };

  return { init };
}
