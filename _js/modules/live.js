/**
 * Live Module
 * Handles live streaming, real-time updates, and conference timing
 */
export function createLiveModule(conference) {
  let config;
  let lang;

  let data = {};

  let confStart;
  let confEnd;
  let confDur;

  let stream;
  let streamPause;
  let streamPrepend;
  let streamExtend;

  let demo;
  let demoStart;
  let demoEnd;
  let demoDur;
  let demoPause;

  let freezeTime = false;
  let timeFrozen = 0;
  let timeOffset = 0;

  let liveTimer;
  let streamVideoTimer;
  let streamInfoTimer;

  let streamModalEl;

  const loadData = () => {
    // Load schedule
    const request = new Request(conference.config.baseurl + '/assets/js/data.json');

    fetch(request)
      .then(response => response.json())
      .then(d => {
        data = d;
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const getData = () => {
    // Return data
    return data;
  };

  const mod = (n, m) => {
    // Absolute modulo
    return ((n % m) + m) % m;
  };

  const timeNow = () => {
    // Current timestamp in seconds
    return Math.floor(Date.now() / 1000);
  };

  const timeCont = () => {
    // Continuous time (respecting previous pauses)
    return timeNow() - timeOffset;
  };

  const timeCycle = () => {
    // Cyclic timestamp in seconds
    const actTime = timeNow();
    const relTime = mod(actTime, demoDur + 2 * demoPause) / (demoDur + 2 * demoPause);
    const cycleTime = mod((demoEnd - demoStart) * relTime - timeOffset, (demoEnd - demoStart)) + demoStart;
    return cycleTime;
  };

  const time = () => {
    // Return app time
    if (freezeTime) {
      return timeFrozen;
    } else if (demo) {
      return timeCycle();
    } else {
      return timeCont();
    }
  };

  const pauseTime = () => {
    // Pause app time
    if (!freezeTime) {
      timeFrozen = time();
      freezeTime = true;

      stopUpdate();
    }
  };

  const continueTime = () => {
    // Continue app time
    if (freezeTime) {
      freezeTime = false;
      timeOffset += time() - timeFrozen;
      startUpdate();
    }
  };

  const resetTime = () => {
    // Reset app time
    timeOffset = 0;
    freezeTime = false;

    startUpdate();
  };

  const setTime = (newTime, newDay) => {
    // Set and pause app time
    pauseTime();

    if (!('days' in data)) {
      console.log('Data is not loaded yet!');
      return;
    }

    let dayIdx;
    if (!newDay) {
      dayIdx = 0;
    } else if (Number.isInteger(newDay)) {
      dayIdx = newDay - 1;
    } else if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(newDay)) {
      dayIdx = data.days.find(o => o.name === newDay);
    } else {
      dayIdx = data.days.find(o => o.name === newDay);
    }
    const newDate = data.days[dayIdx].date;

    let d = new Date(newDate);
    newTime = newTime.split(':');
    d.setHours(newTime[0], newTime[1]);

    timeFrozen = Math.floor(d.getTime() / 1000);

    update();
  };

  const getTime = () => {
    // Return app time as string
    const tConvert = time();

    const d = new Date(tConvert * 1000);
    const dStr = d.toISOString().slice(0, 10);
    const h = d.getHours();
    const m = d.getMinutes();

    return dStr + " " + h + ":" + (m < 10 ? "0" : "") + m;
  };

  const timeUnit = () => {
    // App time refresh rate
    if (demo) {
      return 0.1;
    } else {
      return 60;
    }
  };

  const delayStart = (startTime) => {
    // Seconds until given startTime occurs
    const tNow = time();
    const tUnit = timeUnit();

    if (demo) {
      // Convert virtual duration to real duration
      return mod(startTime - tNow, demoEnd - demoStart) / (demoEnd - demoStart) * (demoDur + 2 * demoPause);
    } else {
      if (startTime > tNow) {
        return startTime - tNow;
      } else {
        // Start on the unit
        return (tUnit - (tNow % tUnit));
      }
    }
  };

  const model = {
    set demo(value) {
      demo = value;
      resetTime();
    },
    get demo() {
      return demo;
    }
  };

  const updateLive = () => {
    // Update status all live elements in DOM
    const tNow = time();
    const liveShow = document.getElementsByClassName('live-show');
    const liveHide = document.getElementsByClassName('live-hide');
    const liveTime = document.getElementsByClassName('live-time');
    const livePast = document.getElementsByClassName('live-past');

    // Show elements for a given period
    for (let i = 0; i < liveShow.length; i++) {
      const tStarts = liveShow[i].dataset.start.split(',');
      const tEnds = liveShow[i].dataset.end.split(',');

      for (let k = 0; k < tStarts.length; k++) {
        if (tNow >= tStarts[k] && tNow < tEnds[k]) {
          // Show when active
          liveShow[i].classList.remove('d-none');
          break;
        } else if (!liveShow[i].classList.contains('d-none')) {
          // Hide otherwise
          liveShow[i].classList.add('d-none');
        }
      }
    }

    // Hide elements for a given period
    for (let i = 0; i < liveHide.length; i++) {
      const tStarts = liveHide[i].dataset.start.split(',');
      const tEnds = liveHide[i].dataset.end.split(',');

      for (let k = 0; k < tStarts.length; k++) {
        if (tNow >= tStarts[k] && tNow < tEnds[k]) {
          // Hide when active
          if (!liveHide[i].classList.contains('d-none')) {
            liveHide[i].classList.add('d-none');
            break;
          }
        } else {
          // Show otherwise
          liveHide[i].classList.remove('d-none');
        }
      }
    }

    // Update duration string for given elements
    for (let i = 0; i < liveTime.length; i++) {
      const t = liveTime[i].dataset.time;
      if (typeof t == "undefined") {
        break;
      }
      let tRel = tNow - t;

      let tStr;
      if (tRel >= -60 && tRel < 0) {
        tStr = lang.time.soon;
      } else if (tRel >= 0 && tRel < 60) {
        tStr = lang.time.now;
      } else {
        if (tRel < 0) {
          tStr = lang.time.in;
        } else {
          tStr = lang.time.since;
        }
        tRel = Math.abs(tRel);

        let dWeeks = Math.floor(tRel / (7 * 24 * 60 * 60));
        let dDays = Math.floor(tRel / (24 * 60 * 60));
        let dHours = Math.floor(tRel / (60 * 60));
        let dMins = Math.floor(tRel / (60));
        if (dWeeks > 4) {
          break;
        } else if (dWeeks > 1) {
          tStr += dWeeks + ' ' + lang.time.weeks;
        } else if (dWeeks == 1) {
          tStr += '1 ' + lang.time.week;
        } else if (dDays > 1) {
          tStr += dDays + ' ' + lang.time.days;
        } else if (dDays == 1) {
          tStr += '1 ' + lang.time.day;
        } else if (dHours > 1) {
          tStr += dHours + ' ' + lang.time.hours;
        } else if (dHours == 1) {
          tStr += '1 ' + lang.time.hour;
        } else if (dMins > 1) {
          tStr += dMins + ' ' + lang.time.minutes;
        } else {
          tStr += '1 ' + lang.time.minute;
        }
      }

      liveTime[i].innerHTML = tStr;
    }

    // Disable elements for a given period
    for (let i = 0; i < livePast.length; i++) {
      const t = livePast[i].dataset.time;
      if (typeof t == "undefined") {
        break;
      }
      let tRel = tNow - t;

      if (tRel < 0) {
        if (livePast[i].nodeName == 'A' || livePast[i].nodeName == 'BUTTON') {
          // Disable when in past
          if (!livePast[i].classList.contains('disabled')) {
            livePast[i].classList.add('disabled');
          }
        } else {
          // Grey out when in past
          if (!livePast[i].classList.contains('text-secondary')) {
            livePast[i].classList.add('text-secondary');
          }
        }
      } else {
        // Show normal otherwise
        livePast[i].classList.remove('disabled');
        livePast[i].classList.remove('text-secondary');
      }
    }

    // Cancel timer after program is over
    if (tNow > confEnd && !demo) {
      stopUpdateLive();
    }
  };

  const startUpdateLive = () => {
    // Start update timer to update live elements in DOM
    stopUpdateLive();
    updateLive();

    if (demo) {
      // Immediate start required since delayStart would wait for next wrap around
      liveTimer = setInterval(updateLive, timeUnit() * 1000);
    } else {
      setTimeout(() => {
        liveTimer = setInterval(updateLive, timeUnit() * 1000);
        updateLive();
      }, delayStart(confStart) * 1000);
    }
  };

  const stopUpdateLive = () => {
    // stopUpdate update timer to update live elements in DOM
    if (typeof liveTimer !== "undefined") {
      clearInterval(liveTimer);
    }
  };

  const getRoom = (roomName) => {
    // Verify if data is already loaded and object populated
    if ('rooms' in data && Object.keys(data.rooms).length > 0) {
      // Return room object for given room name
      if (roomName in data.rooms) {
        return data.rooms[roomName];
      } else {
        return data.rooms[Object.keys(data.rooms)[0]];
      }
    } else {
      console.log('Cannot read rooms as data is not loaded yet!');
      return {};
    }
  };

  const getAllTalks = () => {
    if ('talks' in data && Object.keys(data.talks).length > 0) {
      return data.talks;
    } else {
      console.log('Cannot read talks as data is not loaded yet!');
      return {};
    }
  };

  const getTalks = (roomName) => {
    if (roomName in getAllTalks()) {
      return data.talks[roomName].map((talk) => {
        // For talks with live links, add some grace period to the end
        // time in order to prevent that the next talk is announced
        // immediately
        const end = talk.live_links && talk.live_links.length > 0 ?
          talk.end + streamExtend * 60 : talk.end;
        return { ...talk, end };
      });
    } else {
      return [];
    }
  };

  const getNextTalk = (roomName) => {
    // Get talk object for next talk in given room
    const timeNowVal = time();
    const talksHere = getTalks(roomName);

    if (talksHere.length > 0) {
      if (timeNowVal < talksHere[talksHere.length - 1].end) {
        for (let i = 0; i < talksHere.length; i++) {
          if (timeNowVal < talksHere[i].end) {
            return talksHere[i];
          }
        }
      }
    }
    return {};
  };

  const getSpeaker = (speakerName) => {
    if ('speakers' in data && Object.keys(data.speakers).length > 0) {
      if (speakerName in data.speakers) {
        return data.speakers[speakerName];
      }
    }

    console.log('Cannot read speakers as data is not loaded yet!');
    return {};
  };

  const getNextPause = (roomName) => {
    // Get time object for next pause in given room
    const timeNowVal = time();
    const talksHere = getTalks(roomName);

    if (talksHere.length > 0) {
      if (timeNowVal < talksHere[talksHere.length - 1].end) {
        for (let i = 1; i < talksHere.length; i++) {
          if (timeNowVal < talksHere[i].start && streamPause * 60 <= talksHere[i].start - talksHere[i - 1].end) {
            return {
              'start': talksHere[i - 1].end,
              'end': talksHere[i].start,
            };
          }
        }
      }
    }
    return false;
  };

  const setStreamIframeContent = (content) => {
    // Set stream modal iframe to show given text
    const iframe = streamModalEl.querySelector('iframe');
    const placeholder = streamModalEl.querySelector('#stream-placeholder');
    const placeholderDiv = placeholder.querySelector('div');

    iframe.setAttribute('src', '');
    iframe.classList.add('d-none');
    placeholderDiv.textContent = content;
    placeholder.classList.add('d-flex');
  };

  const setStreamIframeSrc = (href) => {
    // Set stream modal iframe to show given URL
    const iframe = streamModalEl.querySelector('iframe');
    const placeholder = streamModalEl.querySelector('#stream-placeholder');

    iframe.setAttribute('src', href);
    placeholder.classList.add('d-none');
    placeholder.classList.remove('d-flex');
    iframe.classList.remove('d-none');
  };

  const setStreamVideo = (roomName) => {
    // Update stream modal iframe:
    // Show stream with start/pause/end message (for given room) and keep updated
    const timeNowVal = time();
    let roomStart, roomEnd;

    let talksHere = getTalks(roomName);
    if (talksHere.length > 0) {
      roomStart = talksHere[0].start;
      roomEnd = talksHere[talksHere.length - 1].end;
    } else {
      // If no program for given room, take overall first and last talk
      roomStart = 0;
      roomEnd = 0;
      for (let roomNameTalk in getAllTalks()) {
        talksHere = getTalks(roomNameTalk);

        if (talksHere.length > 0) {
          const crntRoomStart = talksHere[0].start;
          const crntRoomEnd = talksHere[talksHere.length - 1].end;

          if (roomStart == 0 || roomStart > crntRoomStart) {
            roomStart = crntRoomStart;
          }
          if (roomEnd == 0 || roomEnd < crntRoomEnd) {
            roomEnd = crntRoomEnd;
          }
        }
      }
    }

    if (typeof streamVideoTimer !== "undefined") {
      clearInterval(streamVideoTimer);
    }

    // Conference not yet started
    if (timeNowVal <= roomStart - streamPrepend * 60) {
      setStreamIframeContent(lang.pre_stream);

      if (!freezeTime) {
        streamVideoTimer = setTimeout(setStreamVideo, delayStart(roomStart - streamPrepend * 60) * 1000, roomName);
      }
    }

    // Conference is over
    else if (timeNowVal >= roomEnd + streamExtend * 60) {
      setStreamIframeContent(lang.post_stream);

      if (!freezeTime && demo) {
        streamVideoTimer = setTimeout(setStreamVideo, delayStart(roomEnd - streamPrepend * 60) * 1000, roomName);
      }
    }

    // Conference ongoing
    else {
      const pauseNext = getNextPause(roomName);

      // Currently stream is paused
      if (pauseNext && timeNowVal >= pauseNext.start + streamExtend * 60 && timeNowVal <= pauseNext.end - streamPrepend * 60) {
        setStreamIframeContent(lang.pause_stream);

        if (!freezeTime) {
          streamVideoTimer = setTimeout(setStreamVideo, delayStart(pauseNext.end - streamPrepend * 60) * 1000, roomName);
        }
      }
      // Currently a talk is active
      else {
        const room = getRoom(roomName);
        if (room !== {}) {
          setStreamIframeSrc(room.href);

          if (!freezeTime) {
            if (pauseNext) {
              streamVideoTimer = setTimeout(setStreamVideo, delayStart(pauseNext.start + streamExtend * 60) * 1000, roomName);
            } else {
              streamVideoTimer = setTimeout(setStreamVideo, delayStart(roomEnd + streamExtend * 60) * 1000, roomName);
            }
          }
        }
      }
    }
  };

  const setStreamInfo = (roomName) => {
    // Update stream modal info bar:
    // Show next talk and speaker (for given room) and keep updated
    const timeNowVal = time();
    const talkNext = getNextTalk(roomName);

    if (typeof streamInfoTimer !== "undefined") {
      clearInterval(streamInfoTimer);
    }

    const streamInfo = document.getElementById('stream-info');
    const streamInfoTime = document.getElementById('stream-info-time');
    const streamInfoColor = streamModalEl.querySelector('#stream-info-color');
    const streamInfoTalk = streamModalEl.querySelector('#stream-info-talk');
    const streamInfoSpeakers = streamModalEl.querySelector('#stream-info-speakers');
    const streamInfoLinks = streamModalEl.querySelector('#stream-info-links');

    if (talkNext !== {} && timeNowVal >= talkNext.start - streamPause * 60) {
      streamInfo.dataset.time = talkNext.start;
      streamInfoTime.dataset.time = talkNext.start;

      // Remove existing border-*-subtle classes
      streamInfoColor.className = streamInfoColor.className.replace(
        /(^|\s)border-\S+-subtle/g,
        "",
      );
      streamInfoColor.classList.add("border-" + talkNext.color + "-subtle");

      streamInfoTalk.textContent = talkNext.name;
      streamInfoTalk.setAttribute('href', talkNext.href);

      let speakerStr = '';
      for (let i = 0; i < talkNext.speakers.length; i++) {
        let speaker = getSpeaker(talkNext.speakers[i]);

        if (speaker == {}) {
          speakerStr += talkNext.speakers[i] + ', ';
        } else if (speaker.href == '') {
          speakerStr += speaker.name + ', ';
        } else {
          speakerStr += '<a class="text-reset" href="' + speaker.href + '">' + speaker.name + '</a>, ';
        }
      }
      speakerStr = speakerStr.slice(0, -2);
      streamInfoSpeakers.innerHTML = speakerStr;

      if (talkNext.live_links) {
        let linksStr = '';
        for (let i = 0; i < talkNext.live_links.length; i++) {
          const link = talkNext.live_links[i];

          // Skip empty links
          if ((link.name == '' && !link.icon) || link.href == '') {
            continue;
          }

          linksStr += '<a href="' + link.href + '" class="btn btn-light m-1 live-past" data-time="' + talkNext.start + '">';
          if (link.icon) {
            linksStr += '<i class="bi bi-' + link.icon + '"></i>&nbsp;';
          }
          linksStr += link.name + '</a>';
        }
        streamInfoLinks.innerHTML = linksStr;
        streamInfoLinks.classList.remove('d-none');
      } else {
        streamInfoLinks.classList.add('d-none');
      }

      streamInfo.classList.remove('d-none');

      updateLive();
      if (!freezeTime) {
        streamInfoTimer = setTimeout(setStreamInfo, delayStart(talkNext.end) * 1000, roomName);
      }
    } else {
      streamInfo.classList.add('d-none');

      if (!freezeTime) {
        if (talkNext) {
          streamInfoTimer = setTimeout(setStreamInfo, delayStart(talkNext.start - streamPause * 60) * 1000, roomName);
        } else if (demo) {
          let talksHere = getTalks(roomName);
          if (talksHere.length > 0) {
            streamInfoTimer = setTimeout(setStreamInfo, delayStart(talksHere[0].start - streamPrepend * 60) * 1000, roomName);
          }
        }
      }
    }
  };

  const setStream = (roomName) => {
    // Update stream modal (iframe and info bar) for given room
    streamModalEl.querySelectorAll('.modal-footer .btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const streamSelect = streamModalEl.querySelector('#stream-select');
    if (streamSelect) {
      streamSelect.value = '0';
    }

    // Recover room name in case of empty default
    const room = getRoom(roomName);
    if (room !== {}) {
      roomName = room.name;

      setStreamVideo(roomName);
      setStreamInfo(roomName);

      const activeButton = streamModalEl.querySelector('#stream-button' + room.id);
      if (activeButton) {
        activeButton.classList.add('active');
      }
      if (streamSelect) {
        streamSelect.value = room.id;
      }
    }
  };

  const updateStream = () => {
    // Update stream modal for currently active room button
    if (streamModalEl.classList.contains('show')) {
      let activeButton = streamModalEl.querySelector('.modal-footer .btn.active');
      if (activeButton) {
        let roomName = activeButton.dataset.room;

        if (typeof roomName !== "undefined") {
          setStream(roomName);
        }
      }
    }
  };

  const stopUpdateStream = () => {
    // Stop stream modal update timer
    if (typeof streamVideoTimer !== "undefined") {
      clearInterval(streamVideoTimer);
    }
    if (typeof streamInfoTimer !== "undefined") {
      clearInterval(streamInfoTimer);
    }
  };

  const hideModal = () => {
    // Close stream modal
    streamModalEl.querySelector('iframe').setAttribute('src', '');
    streamModalEl.querySelectorAll('.modal-footer .btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const streamSelect = streamModalEl.querySelector('#stream-select');
    if (streamSelect) {
      streamSelect.selectedIndex = -1;
    }
  };

  const setupStream = () => {
    // Setup events when modal opens/closes
    streamModalEl = document.getElementById('stream-modal');
    if (!streamModalEl) return;

    // configure modal opening buttons
    streamModalEl.addEventListener('show.bs.modal', (event) => {
      let button = event.relatedTarget;
      let roomName = button.dataset.room;
      setStream(roomName);
    });
    streamModalEl.addEventListener('hide.bs.modal', () => {
      hideModal();
    });

    // configure room selection buttons in modal
    streamModalEl.querySelectorAll('.modal-footer .btn').forEach(btn => {
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        let roomName = this.dataset.room;
        setStream(roomName);
      });
    });

    // configure room selection menu in modal
    const streamSelect = streamModalEl.querySelector('#stream-select');
    if (streamSelect) {
      streamSelect.addEventListener('change', function (event) {
        event.preventDefault();
        let roomName = this.options[this.selectedIndex].text;
        setStream(roomName);
      });
    }
  };

  const init = (c, l) => {
    config = c;
    lang = l;

    // Guard: only initialize if config is provided
    if (!config || !config.time) {
      return;
    }

    confStart = config.time.start;
    confEnd = config.time.end;
    confDur = confEnd - confStart;

    demo = config.demo.enable;
    demoDur = config.demo.duration;
    demoPause = config.demo.pause;
    demoStart = confStart - confDur / demoDur * demoPause;
    demoEnd = confEnd + confDur / demoDur * demoPause;

    stream = config.streaming.enable;
    streamPause = config.streaming.pause;
    streamPrepend = config.streaming.prepend;
    streamExtend = config.streaming.extend;

    loadData();
    startUpdateLive();
    if (stream) {
      setupStream();
    }
  };

  const update = () => {
    updateLive();
    if (stream) {
      updateStream();
    }
  };

  const startUpdate = () => {
    startUpdateLive();
    if (stream) {
      updateStream();
    }
  };

  const stopUpdate = () => {
    stopUpdateLive();
    if (stream) {
      stopUpdateStream();
    }
  };

  return {
    init: init,
    getData: getData,

    pauseTime: pauseTime,
    continueTime: continueTime,
    resetTime: resetTime,
    setTime: setTime,
    getTime: getTime,

    demo: model.demo
  };
}
