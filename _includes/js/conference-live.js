    window.conference.live = (function() {
    {%- include partials/get_conf_time.html -%}
    {%- assign time_start = conf_start -%}
    {%- assign time_end = conf_end -%}
    {%- include partials/get_timestamp.html -%}

    let confStart = {{ timestamp_start }};
    let confEnd = {{ timestamp_end }};
    let confDur = confEnd - confStart;

    let talkAnnounce = 120;  // in minutes

    let freezeTime = false;
    let timeFrozen = 0;
    let timeOffset = 0;

    let demo = {{ site.conference.live.demo | default: "false" }};
    let durDemo  = 5*60; // in seconds
    let durPause =   10; // in seconds

    let demoStart = confStart - confDur/durDemo*durPause;
    let demoEnd = confEnd + confDur/durDemo*durPause;

    let liveTimer;
    let streamTimer;
    let streamInfoTimer;

    let mod = function (n, m) {
        return ((n % m) + m) % m;
    };

    let timeNow = function () {
        return Math.floor(Date.now() / 1000);
    };

    let timeCont = function () {
        return timeNow() - timeOffset;
    };

    let timeCycle = function () {
        let actTime = timeNow();
        let relTime = mod(actTime, durDemo + 2*durPause) / durDemo;
        let cycleTime = mod((demoEnd - demoStart) * relTime - timeOffset, (demoEnd - demoStart)) + demoStart;
        return cycleTime;
    };

    let time = function () {
        if (freezeTime) {
            return timeFrozen;
        }
        else if (demo) {
            return timeCycle();
        }
        else {
            return timeCont();
        }
    };

    let pauseTime = function () {
        if (!freezeTime) {
            timeFrozen = time();
            freezeTime = true;

            stopUpdate();
        }
    };

    let continueTime = function () {
        if (freezeTime) {
            freezeTime = false;
            timeOffset += time() - timeFrozen;
            startUpdate();
        }
    };

    let resetTime = function (timeStr) {
        timeOffset = 0;
        freezeTime = false;

        startUpdate();
    };

    let setTime = function (newTime) {
        pauseTime();

        let d = new Date(confStart * 1000);
        newTime = newTime.split(':');
        d.setHours(newTime[0], newTime[1]);

        timeFrozen = Math.floor(d.getTime() / 1000);

        update();
    };

    let getTime = function (tConvert = time()) {
        let d = new Date(tConvert * 1000);
        let h = d.getHours();
        let m = d.getMinutes();

        return h + ":" + (m < 10 ? "0" : "") + m;
    };

    let timeUnit = function () {
        if (demo) {
            return 0.1;
        }
        else {
            return 60;
        }
    };

    let delayStart = function (startTime) {
        let tNow = time();
        let tUnit = timeUnit();

        if (demo) {
            // Convert virtual duration to real duration
            return mod(startTime - tNow, demoEnd - demoStart) / (demoEnd - demoStart) * (durDemo + 2*durPause);
        }
        else {
            if (startTime > tNow) {
                return startTime - tNow;
            }
            else {
                // Start on the unit
                return (tUnit - (tNow % tUnit));
            }
        }
    };

    let toggleDemo = function () {
        demo = !demo;
        resetTime();
    };

    let demoOn = function () {
        return demo;
    };

    let updateLive = function () {
        let tNow = time();
        let liveShow = document.getElementsByClassName('live-show');
        let liveHide = document.getElementsByClassName('live-hide');
        let liveTime = document.getElementsByClassName('live-time');
        let livePast = document.getElementsByClassName('live-past');

        for (let i = 0; i < liveShow.length; i++) {
            let tStart = liveShow[i].dataset.start;
            let tEnd = liveShow[i].dataset.end;

            if (tNow >= tStart && tNow < tEnd) {
                // Show when active
                liveShow[i].classList.remove('d-none');
            }
            else if (!liveShow[i].classList.contains('d-none')) {
                // Hide otherwise
                liveShow[i].classList.add('d-none');
            }
        }

        for (let i = 0; i < liveHide.length; i++) {
            let tStart = liveHide[i].dataset.start;
            let tEnd = liveHide[i].dataset.end;

            if (tNow >= tStart && tNow < tEnd) {
                // Hide when active
                if (!liveHide[i].classList.contains('d-none')) {
                    liveHide[i].classList.add('d-none');
                }
            }
            else {
                // Show otherwise
                liveHide[i].classList.remove('d-none');
            }
        }

        for (let i = 0; i < liveTime.length; i++) {
            let t = liveTime[i].dataset.time;
            if (typeof t == "undefined") {
                break;
            }
            let tRel = tNow - t;

            let tStr;
            if (tRel >= -60 && tRel < 0) {
                tStr = '{{ site.data.lang[site.conference.lang].live.time.soon | default: "soon" }}';
            }
            else if (tRel >= 0 && tRel < 60) {
                tStr = '{{ site.data.lang[site.conference.lang].live.time.now | default: "now" }}';
            }
            else {
                if (tRel < 0) {
                    tStr = '{{ site.data.lang[site.conference.lang].live.time.in | default: "in" }} ';
                }
                else {
                    tStr = '{{ site.data.lang[site.conference.lang].live.time.since | default: "since" }} ';
                }
                tRel = Math.abs(tRel);

                let dWeeks = Math.floor(tRel / (7*24*60*60));
                let dDays  = Math.floor(tRel / (24*60*60));
                let dHours = Math.floor(tRel / (60*60));
                let dMins  = Math.floor(tRel / (60));
                if (dWeeks > 4) {
                    break;
                }
                else if (dWeeks > 1) {
                    tStr += dWeeks +' {{ site.data.lang[site.conference.lang].live.time.weeks | default: "weeks" }}';
                }
                else if (dWeeks == 1) {
                    tStr += '1 {{ site.data.lang[site.conference.lang].live.time.week | default: "week" }}';
                }
                else if (dDays > 1) {
                    tStr += dDays +' {{ site.data.lang[site.conference.lang].live.time.days | default: "days" }}';
                }
                else if (dDays == 1) {
                    tStr += '1 {{ site.data.lang[site.conference.lang].live.time.day | default: "day" }}';
                }
                else if (dHours > 1) {
                    tStr += dHours +' {{ site.data.lang[site.conference.lang].live.time.hours | default: "hours" }}';
                }
                else if (dHours == 1) {
                    tStr += '1 {{ site.data.lang[site.conference.lang].live.time.hour | default: "hour" }}';
                }
                else if (dMins > 1) {
                    tStr += dMins +' {{ site.data.lang[site.conference.lang].live.time.minutes | default: "minutes" }}';
                }
                else {
                    tStr += '1 {{ site.data.lang[site.conference.lang].live.time.minute | default: "minute" }}';
                }
            }

            liveTime[i].innerHTML = tStr;
        }

        for (let i = 0; i < livePast.length; i++) {
            let t = livePast[i].dataset.time;
            if (typeof t == "undefined") {
                break;
            }
            let tRel = tNow - t;

            if (tRel < 0) {
                // Grey out when in past
                if (!livePast[i].classList.contains('text-secondary')) {
                    livePast[i].classList.add('text-secondary');
                }
            }
            else {
                // Show normal otherwise
                livePast[i].classList.remove('text-secondary');
            }
        }

        if (tNow > confEnd && !demo) {
            // Cancel timer after program is over
            stopUpdateLive();
        }
    };

    let startUpdateLive = function () {
        stopUpdateLive();
        updateLive();

        if (demo) {
            // Immediate start required since delayStart would wait for next wrap around
            liveTimer = setInterval(updateLive, timeUnit() * 1000);
        }
        else {
            setTimeout(function() {
                liveTimer = setInterval(updateLive, timeUnit() * 1000);
                updateLive();
            }, delayStart(confStart) * 1000);
        }
    };

    let stopUpdateLive = function () {
        if (typeof liveTimer !== "undefined") {
            clearInterval(liveTimer);
        }
    };

    {% if site.conference.live.streaming -%}
        {% include js/conference-data.js %}

        let streamModal;

        let getRoom = function (roomName) {
            if (roomName in rooms) {
                return rooms[roomName];
            }
            else {
                return rooms[Object.keys(rooms)[0]];
            }
        };

        let preStartStream = function (roomName) {
            let room = getRoom(roomName);

            streamModal.find('iframe').attr('src', '');
            streamModal.find('iframe').addClass('d-none');
            streamModal.find('#stream-placeholder > div').text('{{ site.data.lang[site.conference.lang].live.pre_stream | default: "Live stream has not started yet." }}');
            streamModal.find('#stream-placeholder').addClass('d-flex');

            if (typeof streamTimer !== "undefined") {
                clearInterval(streamTimer);
            }
            if (!freezeTime) {
                streamTimer = setTimeout(activeStream, delayStart(room.start) * 1000, roomName);
            }
        };

        let activeStream = function (roomName) {
            let room = getRoom(roomName);

            streamModal.find('iframe').attr('src', room.href);
            streamModal.find('#stream-placeholder').addClass('d-none').removeClass('d-flex');
            streamModal.find('iframe').removeClass('d-none');

            if (typeof streamTimer !== "undefined") {
                clearInterval(streamTimer);
            }
            if (!freezeTime) {
                streamTimer = setTimeout(postEndStream, delayStart(room.end) * 1000, roomName);
            }
        };

        let postEndStream = function (roomName) {
            let room = getRoom(roomName);

            streamModal.find('iframe').attr('src', '');
            streamModal.find('iframe').addClass('d-none');
            streamModal.find('#stream-placeholder > div').text('{{ site.data.lang[site.conference.lang].live.post_stream | default: "Live stream has ended." }}');
            streamModal.find('#stream-placeholder').addClass('d-flex');

            if (typeof streamTimer !== "undefined") {
                clearInterval(streamTimer);
            }
            if (!freezeTime && demo) {
                streamTimer = setTimeout(preStartStream, delayStart(demoStart) * 1000, roomName);
            }
        };

        let setStreamInfo = function (roomName) {
            let timeNow = time();
            let talksHere = talks[roomName];
            let talkNow;

            if (typeof streamInfoTimer !== "undefined") {
                clearInterval(streamInfoTimer);
            }

            if (typeof talksHere !== "undefined") {
                if (timeNow < talksHere[talksHere.length-1].end) {
                    for (var i = 0; i < talksHere.length; i++) {
                        if (timeNow < talksHere[i].end && timeNow >= talksHere[i].start - talkAnnounce*60) {
                            talkNow = talksHere[i];
                            break;
                        }
                    }
                }
            }

            if (typeof talkNow !== "undefined") {
                document.getElementById('stream-info').dataset.time = talkNow.start;
                document.getElementById('stream-info-time').dataset.time = talkNow.start;
                updateLive();

                streamModal.find('#stream-info-color').addClass('border-soft-' + talkNow.color);

                streamModal.find('#stream-info-talk').text(talkNow.name).attr('href', talkNow.href);

                let speakerStr = '';
                for (var i = 0; i < talkNow.speakers.length; i++) {
                    let speaker = speakers[talkNow.speakers[i]];
                    if (speaker.href == '') {
                        speakerStr += speaker.name +', '
                    }
                    else {
                        speakerStr += '<a class="text-reset" href="'+ speaker.href +'">'+ speaker.name +'</a>, ';
                    }
                }
                speakerStr = speakerStr.slice(0, -2);
                streamModal.find('#stream-info-speakers').html(speakerStr);

                streamModal.find('#stream-info').removeClass('d-none');

                if (!freezeTime) {
                    streamInfoTimer = setTimeout(setStreamInfo, delayStart(talkNow.end) * 1000, roomName);
                }
            }
            else {
                streamModal.find('#stream-info').addClass('d-none');
            }
        };

        let setStream = function (roomName) {
            streamModal.find('.modal-footer .btn').removeClass('active');
            streamModal.find('#stream-select').selectedIndex = -1;

            let room = getRoom(roomName);
            roomName = room.name;
            let tNow = time();

            if (tNow < room.start) {
                preStartStream(roomName);
            }
            else if (tNow > room.end) {
                postEndStream(roomName);
            }
            else {
                activeStream(roomName);
            }
            setStreamInfo(roomName);

            streamModal.find('#stream-button' + room.id).addClass('active');
            streamModal.find('#stream-select').selectedIndex = room.id;
        };

        let updateStream = function () {
            if (streamModal.hasClass('show')) {
                let activeButton = streamModal.find('.modal-footer .btn.active');
                let roomName = activeButton.data('room');

                if (typeof roomName !== "undefined") {
                    setStream(roomName);
                }
            }
        };

        let stopUpdateStream = function () {
            if (typeof streamTimer !== "undefined") {
                clearInterval(streamTimer);
            }
            if (typeof streamInfoTimer !== "undefined") {
                clearInterval(streamInfoTimer);
            }
        };

        let hideModal = function (event) {
            streamModal.find('iframe').attr('src', '');
            streamModal.find('.modal-footer .btn').removeClass('active');
            streamModal.find('#stream-select').selectedIndex = -1;
        };

        let setupStream = function () {
            streamModal = $('#stream-modal');

            streamModal.on('show.bs.modal', function (event) {
                let button = $(event.relatedTarget);
                let roomName = button.data('room');
                setStream(roomName);
            });
            streamModal.on('hide.bs.modal', function (event) {
                hideModal(event);
            });

            streamModal.find('.modal-footer .btn').on('click', function(event) {
                event.preventDefault();

                let roomName = $(this).data('room');
                setStream(roomName);
            });

            streamModal.find('#stream-select').on('change', function(event) {
                event.preventDefault();

                let roomName = $(this).children('option:selected').text();
                setStream(roomName);
            });
        };

        let setup = function () {
            startUpdateLive();
            setupStream();
        };

        let update = function () {
            updateLive();
            updateStream();
        };

        let startUpdate = function () {
            startUpdateLive();
            updateStream();
        };

        let stopUpdate = function () {
            stopUpdateLive();
            stopUpdateStream();
        };

    {%- else -%}

        let setup = function () {
            startUpdateLive();
        };

        let update = function () {
            updateLive();
        };

        let startUpdate = function () {
            startUpdateLive();
        };

        let stopUpdate = function () {
            stopUpdateLive();
        };

    {%- endif %}

    return {
        init: setup,

        pauseTime: pauseTime,
        continueTime: continueTime,
        resetTime: resetTime,
        setTime: setTime,
        getTime: getTime,

        toggleDemo: toggleDemo,
        demo: demoOn,
        durDemo: durDemo,
        durPause: durPause
    };

})();

window.conference.live.init();
