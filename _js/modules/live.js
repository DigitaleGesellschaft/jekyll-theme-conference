/**
 * Live Module - Handles live streaming, real-time updates, and conference timing
 */
export function createLiveModule(config) {
  const baseurl = config.baseurl || '';
  let lang, data = {};
  let confStart, confEnd, confDur;
  let stream, streamPause, streamPrepend, streamExtend;
  let freezeTime = false, timeFrozen = 0, timeOffset = 0;
  let liveTimer, streamVideoTimer, streamInfoTimer;
  let streamModalEl;

  const timeNow = () => Math.floor(Date.now() / 1000);
  const timeCont = () => timeNow() - timeOffset;

  const time = () => freezeTime ? timeFrozen : timeCont();
  const timeUnit = () => 60;

  const delayStart = (startTime) => {
    const tNow = time();
    return startTime > tNow ? startTime - tNow : timeUnit() - (tNow % timeUnit());
  };

  const loadData = () => {
    fetch(baseurl + '/assets/js/data.json')
      .then(r => r.json())
      .then(d => { data = d; })
      .catch(e => console.error('Failed to load data:', e));
  };

  const getData = () => data;

  const pauseTime = () => {
    if (!freezeTime) {
      timeFrozen = time();
      freezeTime = true;
      stopUpdate();
    }
  };

  const continueTime = () => {
    if (freezeTime) {
      freezeTime = false;
      timeOffset += time() - timeFrozen;
      startUpdate();
    }
  };

  const resetTime = () => {
    timeOffset = 0;
    freezeTime = false;
    startUpdate();
  };

  const setTime = (newTime, newDay) => {
    pauseTime();
    if (!data.days) return console.error('Data not loaded');

    let dayIdx = 0;
    if (Number.isInteger(newDay)) dayIdx = newDay - 1;
    else if (newDay) dayIdx = data.days.findIndex(o => o.name === newDay);

    const d = new Date(data.days[dayIdx].date);
    const [h, m] = newTime.split(':');
    d.setHours(h, m);
    timeFrozen = Math.floor(d.getTime() / 1000);
    update();
  };

  const getTime = () => {
    const d = new Date(time() * 1000);
    return `${d.toISOString().slice(0, 10)} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getRoom = (roomName) => {
    if (!data.rooms || !Object.keys(data.rooms).length) return null;
    return data.rooms[roomName] || data.rooms[Object.keys(data.rooms)[0]];
  };

  const getAllTalks = () => data.talks && Object.keys(data.talks).length ? data.talks : {};

  const getTalks = (roomName) => {
    const talks = getAllTalks();
    if (!talks[roomName]) return [];
    return talks[roomName].map(t => ({
      ...t,
      end: t.live_links?.length ? t.end + streamExtend * 60 : t.end
    }));
  };

  const getNextTalk = (roomName) => {
    const t = time();
    const talks = getTalks(roomName);
    if (talks.length && t < talks[talks.length - 1].end) {
      return talks.find(talk => t < talk.end) || {};
    }
    return {};
  };

  const getSpeaker = (name) => data.speakers?.[name] || {};

  const getNextPause = (roomName) => {
    const t = time();
    const talks = getTalks(roomName);
    if (!talks.length || t >= talks[talks.length - 1].end) return null;

    for (let i = 1; i < talks.length; i++) {
      if (t < talks[i].start && streamPause * 60 <= talks[i].start - talks[i - 1].end) {
        return { start: talks[i - 1].end, end: talks[i].start };
      }
    }
    return null;
  };

  const updateLive = () => {
    const t = time();

    // Show/hide elements based on time range
    document.querySelectorAll('.live-show').forEach(el => {
      const starts = el.dataset.start.split(',');
      const ends = el.dataset.end.split(',');
      const visible = starts.some((s, i) => t >= s && t < ends[i]);
      el.classList.toggle('d-none', !visible);
    });

    document.querySelectorAll('.live-hide').forEach(el => {
      const starts = el.dataset.start.split(',');
      const ends = el.dataset.end.split(',');
      const hidden = starts.some((s, i) => t >= s && t < ends[i]);
      el.classList.toggle('d-none', hidden);
    });

    // Update time strings
    document.querySelectorAll('.live-time').forEach(el => {
      const ts = el.dataset.time;
      if (!ts) return;
      let rel = t - ts;

      let str;
      if (rel >= -60 && rel < 0) str = lang.time.soon;
      else if (rel >= 0 && rel < 60) str = lang.time.now;
      else {
        str = rel < 0 ? lang.time.in : lang.time.since;
        rel = Math.abs(rel);
        const weeks = Math.floor(rel / 604800);
        const days = Math.floor(rel / 86400);
        const hours = Math.floor(rel / 3600);
        const mins = Math.floor(rel / 60);

        if (weeks > 4) return;
        else if (weeks > 1) str += `${weeks} ${lang.time.weeks}`;
        else if (weeks === 1) str += `1 ${lang.time.week}`;
        else if (days > 1) str += `${days} ${lang.time.days}`;
        else if (days === 1) str += `1 ${lang.time.day}`;
        else if (hours > 1) str += `${hours} ${lang.time.hours}`;
        else if (hours === 1) str += `1 ${lang.time.hour}`;
        else if (mins > 1) str += `${mins} ${lang.time.minutes}`;
        else str += `1 ${lang.time.minute}`;
      }
      el.innerHTML = str;
    });

    // Disable past elements
    document.querySelectorAll('.live-past').forEach(el => {
      const ts = el.dataset.time;
      if (!ts) return;
      const isPast = t - ts < 0;
      if (el.nodeName === 'A' || el.nodeName === 'BUTTON') {
        el.classList.toggle('disabled', isPast);
      } else {
        el.classList.toggle('text-secondary', isPast);
      }
    });

    if (t > confEnd) stopUpdateLive();
  };

  const startUpdateLive = () => {
    stopUpdateLive();
    updateLive();
    setTimeout(() => {
      liveTimer = setInterval(updateLive, timeUnit() * 1000);
      updateLive();
    }, delayStart(confStart) * 1000);
  };

  const stopUpdateLive = () => { if (liveTimer) clearInterval(liveTimer); };

  const setStreamIframeContent = (content) => {
    const iframe = streamModalEl.querySelector('iframe');
    const placeholder = streamModalEl.querySelector('#stream-placeholder');
    iframe.src = '';
    iframe.classList.add('d-none');
    placeholder.querySelector('div').textContent = content;
    placeholder.classList.add('d-flex');
  };

  const setStreamIframeSrc = (href) => {
    const iframe = streamModalEl.querySelector('iframe');
    const placeholder = streamModalEl.querySelector('#stream-placeholder');
    iframe.src = href;
    placeholder.classList.add('d-none');
    placeholder.classList.remove('d-flex');
    iframe.classList.remove('d-none');
  };

  const setStreamVideo = (roomName) => {
    const t = time();
    let talks = getTalks(roomName);
    let roomStart = 0, roomEnd = 0;

    if (talks.length) {
      roomStart = talks[0].start;
      roomEnd = talks[talks.length - 1].end;
    } else {
      for (const rn in getAllTalks()) {
        const rt = getTalks(rn);
        if (rt.length) {
          const rs = rt[0].start, re = rt[rt.length - 1].end;
          if (!roomStart || roomStart > rs) roomStart = rs;
          if (!roomEnd || roomEnd < re) roomEnd = re;
        }
      }
    }

    if (streamVideoTimer) clearInterval(streamVideoTimer);

    const prepend = streamPrepend * 60, extend = streamExtend * 60;

    if (t <= roomStart - prepend) {
      setStreamIframeContent(lang.pre_stream);
      if (!freezeTime) streamVideoTimer = setTimeout(() => setStreamVideo(roomName), delayStart(roomStart - prepend) * 1000);
    } else if (t >= roomEnd + extend) {
      setStreamIframeContent(lang.post_stream);
    } else {
      const pause = getNextPause(roomName);
      if (pause && t >= pause.start + extend && t <= pause.end - prepend) {
        setStreamIframeContent(lang.pause_stream);
        if (!freezeTime) streamVideoTimer = setTimeout(() => setStreamVideo(roomName), delayStart(pause.end - prepend) * 1000);
      } else {
        const room = getRoom(roomName);
        if (room) {
          setStreamIframeSrc(room.href);
          if (!freezeTime) {
            const nextTime = pause ? pause.start + extend : roomEnd + extend;
            streamVideoTimer = setTimeout(() => setStreamVideo(roomName), delayStart(nextTime) * 1000);
          }
        }
      }
    }
  };

  const setStreamInfo = (roomName) => {
    const t = time();
    const talk = getNextTalk(roomName);
    if (streamInfoTimer) clearInterval(streamInfoTimer);

    const info = document.getElementById('stream-info');
    const infoTime = document.getElementById('stream-info-time');
    const infoColor = streamModalEl.querySelector('#stream-info-color');
    const infoTalk = streamModalEl.querySelector('#stream-info-talk');
    const infoSpeakers = streamModalEl.querySelector('#stream-info-speakers');
    const infoLinks = streamModalEl.querySelector('#stream-info-links');

    if (talk.start && t >= talk.start - streamPause * 60) {
      info.dataset.time = talk.start;
      infoTime.dataset.time = talk.start;

      infoColor.className = infoColor.className.replace(/(^|\s)border-\S+-subtle/g, '');
      infoColor.classList.add(`border-${talk.color}-subtle`);

      infoTalk.textContent = talk.name;
      infoTalk.href = talk.href;
      infoTalk.className = infoTalk.className.replace(/(^|\s)link-underline-[a-z]+($|\s)/g, '');
      infoTalk.classList.add(`link-underline-${talk.color}`);

      infoSpeakers.innerHTML = talk.speakers.map(s => {
        const sp = getSpeaker(s);
        return sp.href ? `<a class="text-reset link-underline-${talk.color} link-underline-opacity-0 link-underline-opacity-100-hover" href="${sp.href}">${sp.name}</a>` : (sp.name || s);
      }).join(', ');

      if (talk.live_links?.length) {
        infoLinks.innerHTML = talk.live_links
          .filter(l => (l.name || l.icon) && l.href)
          .map(l => `<a href="${l.href}" class="btn btn-secondary m-1 live-past" data-time="${talk.start}">${l.icon ? `<i class="bi bi-${l.icon}" aria-hidden="true"></i>&nbsp;` : ''}${l.name}</a>`)
          .join('');
        infoLinks.classList.remove('d-none');
      } else {
        infoLinks.classList.add('d-none');
      }

      info.classList.remove('d-none');
      updateLive();
      if (!freezeTime) streamInfoTimer = setTimeout(() => setStreamInfo(roomName), delayStart(talk.end) * 1000);
    } else {
      info.classList.add('d-none');
      if (!freezeTime && talk.start) {
        streamInfoTimer = setTimeout(() => setStreamInfo(roomName), delayStart(talk.start - streamPause * 60) * 1000);
      }
    }
  };

  const setStream = (roomName) => {
    streamModalEl.querySelectorAll('.modal-footer .btn').forEach(b => b.classList.remove('active'));
    const select = streamModalEl.querySelector('#stream-select');
    if (select) select.value = '0';

    const room = getRoom(roomName);
    if (room) {
      setStreamVideo(room.name);
      setStreamInfo(room.name);
      const btn = streamModalEl.querySelector(`#stream-button${room.id}`);
      if (btn) btn.classList.add('active');
      if (select) select.value = room.id;
    }
  };

  const updateStream = () => {
    if (!streamModalEl.classList.contains('show')) return;
    const btn = streamModalEl.querySelector('.modal-footer .btn.active');
    if (btn?.dataset.room) setStream(btn.dataset.room);
  };

  const stopUpdateStream = () => {
    if (streamVideoTimer) clearInterval(streamVideoTimer);
    if (streamInfoTimer) clearInterval(streamInfoTimer);
  };

  const hideModal = () => {
    streamModalEl.querySelector('iframe').src = '';
    streamModalEl.querySelectorAll('.modal-footer .btn').forEach(b => b.classList.remove('active'));
    const select = streamModalEl.querySelector('#stream-select');
    if (select) select.selectedIndex = -1;
  };

  const setupStream = () => {
    streamModalEl = document.getElementById('stream-modal');
    if (!streamModalEl) return;

    streamModalEl.addEventListener('show.bs.modal', e => setStream(e.relatedTarget.dataset.room));
    streamModalEl.addEventListener('hide.bs.modal', hideModal);

    streamModalEl.querySelectorAll('.modal-footer .btn').forEach(btn => {
      btn.addEventListener('click', e => { e.preventDefault(); setStream(btn.dataset.room); });
    });

    const select = streamModalEl.querySelector('#stream-select');
    if (select) {
      select.addEventListener('change', e => { e.preventDefault(); setStream(select.options[select.selectedIndex].text); });
    }
  };

  const update = () => { updateLive(); if (stream) updateStream(); };
  const startUpdate = () => { startUpdateLive(); if (stream) updateStream(); };
  const stopUpdate = () => { stopUpdateLive(); if (stream) stopUpdateStream(); };

  const init = (c, l) => {
    const liveConfig = c;
    lang = l;
    if (!liveConfig?.time) return;

    confStart = liveConfig.time.start;
    confEnd = liveConfig.time.end;
    confDur = confEnd - confStart;

    stream = liveConfig.streaming.enable;
    streamPause = liveConfig.streaming.pause;
    streamPrepend = liveConfig.streaming.prepend;
    streamExtend = liveConfig.streaming.extend;

    loadData();
    startUpdateLive();
    if (stream) setupStream();
  };

  return {
    init,
    getData,
    pauseTime,
    continueTime,
    resetTime,
    setTime,
    getTime
  };
}
