/**
 * Live Module - Handles live streaming, real-time updates, and conference timing
 *
 * Features:
 * - Time-based visibility for .live-show and .live-hide elements
 * - Relative time display for .live-time elements
 * - Past state styling for .live-past elements
 * - Live streaming modal with room switching and offline detection
 * - Time debugging controls (pause, set, reset)
 */
export function createLiveModule(config) {
  const baseurl = config.baseurl || '';

  // ==========================================================================
  // State
  // ==========================================================================

  const state = {
    data: {},
    lang: null,
    tz: '',
    confStart: 0,
    confEnd: 0,
    streaming: {
      enabled: false,
      pauseMinutes: 60,
      prependMinutes: 5,
      extendMinutes: 5
    },
    frozen: false,
    frozenTime: 0,
    timeOffset: 0,
    updateTimer: null
  };

  // ==========================================================================
  // Time Utilities
  // ==========================================================================

  const UPDATE_INTERVAL = 60;

  const realTime = () => Math.floor(Date.now() / 1000);
  const adjustedTime = () => realTime() - state.timeOffset;
  const now = () => state.frozen ? state.frozenTime : adjustedTime();

  const secondsUntil = (targetTime) => {
    const current = now();
    return (targetTime && targetTime > current)
      ? targetTime - current
      : UPDATE_INTERVAL - (current % UPDATE_INTERVAL);
  };

  const formatRelativeTime = (timestamp) => {
    const { lang } = state;
    if (!lang?.time) return '';

    let diff = now() - timestamp;

    if (diff >= -60 && diff < 0) return lang.time.soon;
    if (diff >= 0 && diff < 60) return lang.time.now;

    const prefix = diff < 0 ? lang.time.in : lang.time.since;
    diff = Math.abs(diff);

    const weeks = Math.floor(diff / 604800);
    const days = Math.floor(diff / 86400);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor(diff / 60);

    if (weeks > 4) return '';
    if (weeks > 1) return `${prefix}${weeks} ${lang.time.weeks}`;
    if (weeks === 1) return `${prefix}1 ${lang.time.week}`;
    if (days > 1) return `${prefix}${days} ${lang.time.days}`;
    if (days === 1) return `${prefix}1 ${lang.time.day}`;
    if (hours > 1) return `${prefix}${hours} ${lang.time.hours}`;
    if (hours === 1) return `${prefix}1 ${lang.time.hour}`;
    if (minutes > 1) return `${prefix}${minutes} ${lang.time.minutes}`;
    return `${prefix}1 ${lang.time.minute}`;
  };

  // ==========================================================================
  // Data Access
  // ==========================================================================

  const loadData = async () => {
    try {
      const response = await fetch(`${baseurl}/assets/js/data.json`);
      state.data = await response.json();
    } catch (error) {
      console.error('Failed to load live data:', error);
    }
  };

  const getRoom = (roomName) => {
    const { rooms } = state.data;
    if (!rooms || !Object.keys(rooms).length) return null;
    return rooms[roomName] || rooms[Object.keys(rooms)[0]];
  };

  const getTalks = (roomName) => {
    const { talks } = state.data;
    if (!talks?.[roomName]) return [];

    const extendSeconds = state.streaming.extendMinutes * 60;
    return talks[roomName].map(talk => ({
      ...talk,
      end: talk.live_links?.length ? talk.end + extendSeconds : talk.end
    }));
  };

  const getNextTalk = (roomName) => {
    const talks = getTalks(roomName);
    const current = now();
    if (!talks.length || current >= talks[talks.length - 1].end) return null;
    return talks.find(talk => current < talk.end) || null;
  };

  const getSpeaker = (name) => state.data.speakers?.[name] || { name };

  const getNextPause = (roomName) => {
    const talks = getTalks(roomName);
    const current = now();
    const pauseThreshold = state.streaming.pauseMinutes * 60;

    if (!talks.length || current >= talks[talks.length - 1].end) return null;

    for (let i = 1; i < talks.length; i++) {
      const gap = talks[i].start - talks[i - 1].end;
      if (current < talks[i].start && gap >= pauseThreshold) {
        return { start: talks[i - 1].end, end: talks[i].start };
      }
    }
    return null;
  };

  // ==========================================================================
  // Live Element Updates
  // ==========================================================================

  const isInTimeRange = (startData, endData) => {
    const current = now();
    const starts = startData.split(',');
    const ends = endData.split(',');
    return starts.some((start, i) => current >= start && current < ends[i]);
  };

  const updateLiveElements = () => {
    const current = now();

    document.querySelectorAll('.live-show').forEach(el => {
      el.classList.toggle('d-none', !isInTimeRange(el.dataset.start, el.dataset.end));
    });

    document.querySelectorAll('.live-hide').forEach(el => {
      el.classList.toggle('d-none', isInTimeRange(el.dataset.start, el.dataset.end));
    });

    document.querySelectorAll('.live-time').forEach(el => {
      if (el.dataset.time) {
        const newText = formatRelativeTime(parseInt(el.dataset.time, 10));
        // Only update if content changed to avoid unnecessary screen reader announcements
        if (el.textContent !== newText) {
          el.textContent = newText;
        }
      }
    });

    document.querySelectorAll('.live-past').forEach(el => {
      const timestamp = parseInt(el.dataset.time, 10);
      if (!timestamp) return;
      const isPast = current >= timestamp;
      if (el.nodeName === 'A' || el.nodeName === 'BUTTON') {
        el.classList.toggle('disabled', !isPast);
      } else {
        el.classList.toggle('text-secondary', !isPast);
      }
    });
  };

  // ==========================================================================
  // Stream Main Window (Placeholder/iFrame)
  // ==========================================================================

  const createStreamPlayer = (modalEl) => {
    const iframe = modalEl.querySelector('iframe');
    const placeholder = modalEl.querySelector('#stream-placeholder');
    const placeholderText = placeholder.querySelector('div');

    // Player state
    let currentUrl = null;
    let pendingUrl = null;
    let isOffline = !navigator.onLine;

    // Display modes
    const showIframe = () => {
      iframe.classList.remove('d-none');
      placeholder.classList.add('d-none');
      placeholder.classList.remove('d-flex');
    };

    const showPlaceholder = () => {
      iframe.classList.add('d-none');
      placeholder.classList.remove('d-none');
      placeholder.classList.add('d-flex');
    };

    // Core display methods
    const displayStream = (url) => {
      if (isOffline) {
        pendingUrl = url;
        const offlineText = state.lang?.offline || 'offline';
        placeholderText.innerHTML = `<i class="bi bi-wifi-off" aria-hidden="true"></i> ${offlineText}`;
        showPlaceholder();
        return;
      }

      pendingUrl = null;
      if (iframe.src !== url) {
        iframe.src = url;
      }
      currentUrl = url;
      showIframe();
    };

    const displayMessage = (message) => {
      pendingUrl = null;
      currentUrl = null;
      iframe.src = '';
      placeholderText.textContent = message;
      showPlaceholder();
    };

    const clear = () => {
      currentUrl = null;
      pendingUrl = null;
      iframe.src = '';
    };

    // Offline handling
    const handleOnline = () => {
      isOffline = false;
      if (pendingUrl) {
        displayStream(pendingUrl);
      }
    };

    const handleOffline = () => {
      isOffline = true;
      if (currentUrl) {
        pendingUrl = currentUrl;
        const offlineText = state.lang?.offline || 'offline';
        placeholderText.innerHTML = `<i class="bi bi-wifi-off" aria-hidden="true"></i> ${offlineText}`;
        showPlaceholder();
      }
    };

    // Register network listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return {
      displayStream,
      displayMessage,
      clear,
      isOffline: () => isOffline
    };
  };

  // ==========================================================================
  // Stream State
  // ==========================================================================

  const getStreamBounds = (roomName) => {
    let talks = getTalks(roomName);

    if (!talks.length) {
      const allTalks = state.data.talks || {};
      let earliest = Infinity, latest = 0;

      for (const rn of Object.keys(allTalks)) {
        const roomTalks = getTalks(rn);
        if (roomTalks.length) {
          earliest = Math.min(earliest, roomTalks[0].start);
          latest = Math.max(latest, roomTalks[roomTalks.length - 1].end);
        }
      }

      if (earliest === Infinity) return { start: 0, end: 0 };
      return { start: earliest, end: latest };
    }

    return {
      start: talks[0].start,
      end: talks[talks.length - 1].end
    };
  };

  /** Determine current stream state for a room */
  const getStreamState = (roomName) => {
    const current = now();
    const bounds = getStreamBounds(roomName);
    const prependSec = state.streaming.prependMinutes * 60;
    const extendSec = state.streaming.extendMinutes * 60;

    // Before stream starts
    if (current < bounds.start - prependSec) {
      return { type: 'pre' };
    }

    // After stream ends
    if (current >= bounds.end + extendSec) {
      return { type: 'post' };
    }

    // Check for pause
    const pause = getNextPause(roomName);
    if (pause && current >= pause.start + extendSec && current <= pause.end - prependSec) {
      return { type: 'pause' };
    }

    // Stream is live
    const room = getRoom(roomName);
    return room?.href ? { type: 'live', url: room.href } : { type: 'unavailable' };
  };

  // ==========================================================================
  // Stream Info Panel (Next Talk)
  // ==========================================================================

  const createStreamInfo = (modalEl) => {
    const container = modalEl.querySelector('#stream-info');
    const timeEl = modalEl.querySelector('#stream-info-time');
    const colorEl = modalEl.querySelector('#stream-info-color');
    const talkEl = modalEl.querySelector('#stream-info-talk');
    const speakersEl = modalEl.querySelector('#stream-info-speakers');
    const linksEl = modalEl.querySelector('#stream-info-links');

    const show = () => container.classList.remove('d-none');
    const hide = () => container.classList.add('d-none');

    const update = (roomName) => {
      const talk = getNextTalk(roomName);
      const current = now();
      const showThreshold = state.streaming.pauseMinutes * 60;

      if (!talk || current < talk.start - showThreshold) {
        hide();
        return;
      }

      // Set timing data
      container.dataset.time = talk.start;
      timeEl.dataset.time = talk.start;

      // Update color
      colorEl.className = colorEl.className.replace(/border-\w+-subtle/g, '');
      colorEl.classList.add(`border-${talk.color}-subtle`);

      // Update talk link
      talkEl.textContent = talk.name;
      talkEl.href = talk.href || '#';
      talkEl.className = talkEl.className.replace(/link-underline-\w+/g, '');
      talkEl.classList.add(`link-underline-${talk.color}`);

      // Update speakers
      speakersEl.innerHTML = talk.speakers.map(name => {
        const speaker = getSpeaker(name);
        return speaker.href
          ? `<a class="text-reset link-underline-${talk.color} link-underline-opacity-0 link-underline-opacity-100-hover" href="${speaker.href}">${speaker.name}</a>`
          : speaker.name;
      }).join(', ');

      // Update live links
      if (talk.live_links?.length) {
        linksEl.innerHTML = talk.live_links
          .filter(link => (link.name || link.icon) && link.href)
          .map(link => {
            const icon = link.icon ? `<i class="bi bi-${link.icon}" aria-hidden="true"></i>&nbsp;` : '';
            return `<a href="${link.href}" class="btn btn-secondary m-1 live-past" data-time="${talk.start}">${icon}${link.name || ''}</a>`;
          })
          .join('');
        linksEl.classList.remove('d-none');
      } else {
        linksEl.classList.add('d-none');
      }

      show();
    };

    return { update, hide };
  };

  // ==========================================================================
  // Stream Room Selector
  // ==========================================================================

  const createRoomSelector = (modalEl, onRoomChange) => {
    const buttons = modalEl.querySelectorAll('.modal-footer .btn[data-room]');
    const select = modalEl.querySelector('#stream-select');

    let currentRoom = null;

    const setActive = (room) => {
      currentRoom = room;

      buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.room === room?.name);
      });

      if (select && room) {
        select.value = room.id;
      }
    };

    const clear = () => {
      currentRoom = null;
      buttons.forEach(btn => btn.classList.remove('active'));
      if (select) select.selectedIndex = -1;
    };

    const getCurrent = () => currentRoom;

    // Event listeners
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const room = getRoom(btn.dataset.room);
        if (room) {
          setActive(room);
          onRoomChange(room);
        }
      });
    });

    if (select) {
      select.addEventListener('change', (e) => {
        e.preventDefault();
        const room = getRoom(select.options[select.selectedIndex].text);
        if (room) {
          setActive(room);
          onRoomChange(room);
        }
      });
    }

    return { setActive, clear, getCurrent };
  };

  // ==========================================================================
  // Stream Modal Controller
  // ==========================================================================

  let streamModal = null;

  const setupStreamModal = () => {
    const modalEl = document.getElementById('stream-modal');
    if (!modalEl) return;

    const player = createStreamPlayer(modalEl);
    const info = createStreamInfo(modalEl);

    const updateRoom = (room) => {
      if (!room) return;

      const streamState = getStreamState(room.name);

      switch (streamState.type) {
        case 'live':
          player.displayStream(streamState.url);
          break;
        case 'pre':
          player.displayMessage(state.lang.pre_stream);
          break;
        case 'post':
          player.displayMessage(state.lang.post_stream);
          break;
        case 'pause':
          player.displayMessage(state.lang.pause_stream);
          break;
        default:
          player.displayMessage(state.lang.post_stream);
      }

      info.update(room.name);
      updateLiveElements(); // Update live-past buttons in info panel
    };

    const roomSelector = createRoomSelector(modalEl, updateRoom);

    // Modal events
    modalEl.addEventListener('show.bs.modal', (e) => {
      const room = getRoom(e.relatedTarget?.dataset.room);
      roomSelector.setActive(room);
      updateRoom(room);
    });

    modalEl.addEventListener('hide.bs.modal', () => {
      player.clear();
      info.hide();
      roomSelector.clear();
    });

    streamModal = {
      isOpen: () => modalEl.classList.contains('show'),
      update: () => {
        const room = roomSelector.getCurrent();
        if (room) updateRoom(room);
      }
    };
  };

  // ==========================================================================
  // Update Loop
  // ==========================================================================

  const update = () => {
    updateLiveElements();
    if (state.streaming.enabled && streamModal?.isOpen()) {
      streamModal.update();
    }
  };

  const startUpdates = () => {
    stopUpdates();
    update();

    const scheduleNext = () => {
      state.updateTimer = setTimeout(() => {
        update();
        scheduleNext();
      }, secondsUntil() * 1000);
    };
    scheduleNext();
  };

  const stopUpdates = () => {
    if (state.updateTimer) {
      clearTimeout(state.updateTimer);
      state.updateTimer = null;
    }
  };

  // ==========================================================================
  // Debug API
  // ==========================================================================

  const pauseTime = () => {
    if (state.frozen) return;
    state.frozenTime = now();
    state.frozen = true;
    stopUpdates();
  };

  const continueTime = () => {
    if (!state.frozen) return;
    state.timeOffset += adjustedTime() - state.frozenTime;
    state.frozen = false;
    startUpdates();
  };

  const resetTime = () => {
    state.timeOffset = 0;
    state.frozen = false;
    startUpdates();
  };

  /** Convert UTC timestamp (seconds) to conference timezone date string */
  const tsToDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const tzOffset = parseTimezoneOffset(state.tz);
    const tzTime = date.getTime() + (date.getTimezoneOffset() * 60000) + (tzOffset * 60000);
    const tzDate = new Date(tzTime);
    return tzDate.toISOString().slice(0, 10); // YYYY-MM-DD
  };

  /** Convert UTC timestamp (seconds) to conference timezone time string */
  const tsToTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const tzOffset = parseTimezoneOffset(state.tz);
    const tzTime = date.getTime() + (date.getTimezoneOffset() * 60000) + (tzOffset * 60000);
    const tzDate = new Date(tzTime);
    const hours = String(tzDate.getHours()).padStart(2, '0');
    const minutes = String(tzDate.getMinutes()).padStart(2, '0');
    return `${tzDate.toISOString().slice(0, 10)} ${hours}:${minutes}`;
  };

  /** Parse timezone offset string (e.g., "+02:00") to minutes */
  const parseTimezoneOffset = (tz) => {
    if (!tz) return 0;
    const match = tz.match(/^([+-])(\d{2}):(\d{2})$/);
    if (!match) return 0;
    const sign = match[1] === '+' ? 1 : -1;
    return sign * (parseInt(match[2], 10) * 60 + parseInt(match[3], 10));
  };

  const setTime = (timeStr, day) => {
    pauseTime();

    const { days } = state.data;
    if (!days?.length) {
      console.error('Conference data not loaded');
      return;
    }

    // Determine which day to use
    let dayData;
    if (Number.isInteger(day)) {
      // 0-based index
      dayData = days[day] || days[0];
    } else if (typeof day === 'string') {
      // Try as date string first (YYYY-MM-DD), then as name
      dayData = days.find(d => d.date === day) || days.find(d => d.name === day) || days[0];
    } else {
      // No day specified: use current day from frozen time in conference timezone
      const currentDate = tsToDate(state.frozenTime);
      dayData = days.find(d => d.date === currentDate) || days[0];
    }

    // Parse time in conference timezone: "YYYY-MM-DDTHH:MM:SS+TZ"
    const [hours, minutes] = timeStr.split(':').map(Number);
    const isoString = `${dayData.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00${state.tz}`;
    const date = new Date(isoString);

    // Store as UTC timestamp in seconds
    state.frozenTime = Math.floor(date.getTime() / 1000);
    update();
  };

  const getTime = () => tsToTime(now());

  // ==========================================================================
  // Initialization
  // ==========================================================================

  const init = (liveConfig, langStrings) => {
    if (!liveConfig?.time) return;

    state.lang = langStrings;
    state.tz = liveConfig.tz || '+00:00';
    state.confStart = liveConfig.time.start;
    state.confEnd = liveConfig.time.end;

    state.streaming = {
      enabled: liveConfig.streaming.enable,
      pauseMinutes: liveConfig.streaming.pause,
      prependMinutes: liveConfig.streaming.prepend,
      extendMinutes: liveConfig.streaming.extend
    };

    loadData();
    startUpdates();

    if (state.streaming.enabled) {
      setupStreamModal();
    }
  };

  // ==========================================================================
  // Public API
  // ==========================================================================

  return {
    init,
    pauseTime,
    continueTime,
    resetTime,
    setTime,
    getTime
  };
}
