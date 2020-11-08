window.conference.live = (function() {
    {%- include partials/get_conf_time.html -%}
    {%- assign time_start = conf_start -%}
    {%- assign time_end = conf_end -%}
    {%- include partials/get_timestamp.html -%}

    let confStart = {{ timestamp_start }};
    let confEnd = {{ timestamp_end }};

    let freezeTime = false;
    let timeFrozen = 0;
    let timeOffset = 0;

    let demo = {{ site.conference.live.demo | default: "false" }};
    let durDemo  = 5*60; // in seconds
    let durPause =   10; // in seconds

    let liveTimer;
    let liveTimerCorr;

    let timeNowReal = function () {
        // Return UNIX timestamp in seconds
        return Math.floor(Date.now() / 1000);
    };

    let timeNowCycle = function() {
        // Cycle time over program for a fixed duration
        let relTime = (Math.floor(Date.now() / 1000) % durDemo - durPause) / (durDemo - 2*durPause);
        let cycleTime = (confEnd - confStart) * relTime + confStart;
        return cycleTime;
    };

    let timeNow = function() {
        if (freezeTime) {
            return timeFrozen;
        }
        else if (demo) {
            return timeNowCycle() - timeOffset;
        }
        else {
            return timeNowReal() - timeOffset;
        }
    };

    let pauseTime = function () {
        timeFrozen = timeNow();
        freezeTime = true;
    };

    let continueTime = function () {
        if (demo) {
            timeOffset = timeNowCycle() - timeFrozen;
        }
        else {
            timeOffset = timeNow() - timeFrozen;
        }
        freezeTime = false;
    };

    let resetTime = function (timeStr) {
        continueTime();
        timeOffset = 0;
    };

    let setTime = function (timeStr) {
        pauseTime();

        let d = new Date(timeNow() * 1000);
        time = timeStr.split(':');
        d.setHours(time[0], time[1]);

        timeFrozen = Math.floor(d.getTime() / 1000);
    };

    let getTime = function () {
        let d = new Date(timeNow() * 1000);
        let h = d.getHours();
        let m = d.getMinutes();

        return h + ":" + (m < 10 ? "0" : "") + m;
    };

    let timeStart = function () {
        let tNow = timeNow();
        if (confStart - 60 > tNow) {
            // Start when conference start (-60s)
            return confStart - 60 - tNow;
        }
        else {
            // Start on the minute
            return (60 - (tNow % 60));
        }
    };

    let updateLiveButtons = function() {
        let tNow = timeNow();
        let liveShow = document.getElementsByClassName('live-show');
        let liveHide = document.getElementsByClassName('live-hide');

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

        if (timeNow() > confEnd && !demo) {
            // Cancel timer after program is over
            clearInterval(liveTimer);
        }
    };

    let startUpdate = function () {
        if(typeof liveTimer !== "undefined") {
            clearInterval(liveTimer);
        }
        updateLiveButtons();

        if (demo) {
            liveTimerCorr = (confEnd - confStart) / (durDemo - 2*durPause);
            liveTimer = setInterval(updateLiveButtons, 100);
        }
        else {
            liveTimerCorr = 1;
            setTimeout(function() {
                liveTimer = setInterval(updateLiveButtons, 60*1000);
                updateLiveButtons();
            }, timeStart() * 1000);
        }
    };

    let toggleDemo = function () {
        demo = !demo;
        timeOffset = 0;
        startUpdate();
    };

    let demoOn = function() {
        return demo;
    };

    {% if site.conference.live.streaming -%}

        let rooms = {
            {%- for r in site.data.program -%}
                {%- assign room = site.rooms | where: 'name', r.room | first -%}
                {%- if room.live -%}

                    {%- assign t = r.talks | first -%}
                    {%- include partials/get_talk_time.html -%}
                    {%- assign time_start = talk_start -%}
                    {%- assign time_end = talk_end -%}
                    {%- include partials/get_timestamp.html -%}

                    {%- assign offset_start = site.conference.live.streaming.start_early | default: 0 -%}
                    {%- assign room_ts_start = offset_start | times: -60 | plus: timestamp_start -%}

                    {%- assign t = r.talks | last -%}
                    {%- include partials/get_talk_time.html -%}
                    {%- assign time_start = talk_start -%}
                    {%- assign time_end = talk_end -%}
                    {%- include partials/get_timestamp.html -%}

                    {%- assign offset_end = site.conference.live.streaming.end_late | default: 0 -%}
                    {%- assign room_ts_end = offset_end | times: 60 | plus: timestamp_end -%}

                    "{{ room.name }}": {
                        "id": {{ forloop.index }},
                        "href": "{{ room.live }}",
                        "start": {{ room_ts_start }},
                        "end": {{ room_ts_end }}
                    },
                {%- endif -%}
            {%- endfor -%}
        };

        let streamModal;
        let streamTimer;

        let preStartStream = function(href, startTime, endTime) {
            streamModal.find('iframe').attr('src', '');
            streamModal.find('iframe').addClass('d-none');
            streamModal.find('#stream-placeholder > div').text('{{ site.data.lang[site.conference.lang].live.pre_stream | default: "Live stream has not started yet." }}');
            streamModal.find('#stream-placeholder').addClass('d-flex');

            if(typeof streamTimer !== "undefined") {
                clearTimeout(streamTimer);
            }
            streamTimer = setTimeout(activeStream, (startTime - timeNow())/liveTimerCorr*1000, href, endTime);
        }

        let activeStream = function(href, endTime) {
            streamModal.find('iframe').attr('src', href);
            streamModal.find('#stream-placeholder').addClass('d-none').removeClass('d-flex');
            streamModal.find('iframe').removeClass('d-none');

            if(typeof streamTimer !== "undefined") {
                clearTimeout(streamTimer);
            }
            streamTimer = setTimeout(postEndStream, (endTime - timeNow())/liveTimerCorr*1000);
        }

        let postEndStream = function() {
            streamModal.find('iframe').attr('src', '');
            streamModal.find('iframe').addClass('d-none');
            streamModal.find('#stream-placeholder > div').text('{{ site.data.lang[site.conference.lang].live.post_stream | default: "Live stream has ended." }}');
            streamModal.find('#stream-placeholder').addClass('d-flex');
        }

        let setStream = function (roomName) {
            if (roomName in rooms) {
                room = rooms[roomName];
            }
            else {
                room = rooms[Object.keys(rooms)[0]];
            }

            streamModal.find('.modal-footer .btn').removeClass('active');
            if (timeNow() < room.start) {
                preStartStream(room.href, room.start, room.end);
            }
            else if (timeNow() > room.end) {
                postEndStream();
            }
            else {
                activeStream(room.href, room.end);
            }
            streamModal.find('#stream-button' + room.id).addClass('active');
        };

        let hideModal = function (event) {
            streamModal.find('iframe').attr('src', '');
            streamModal.find('.modal-footer .btn').removeClass('active');
        };

        let startStream = function() {
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

                let roomName = $(this).data('room')
                setStream(roomName);
            });
        };

    {%- else -%}

        let startStream = function() {};

    {%- endif %}

    let init = function () {
        startUpdate();
        startStream();
    };

    return {
        init: init,

        pauseTime: pauseTime,
        continueTime: continueTime,
        resetTime: resetTime,
        setTime: setTime,
        getTime: getTime,

        toggleDemo: toggleDemo,
        demoOn: demoOn,
        durDemo: durDemo,
        durPause: durPause
    };

})();

window.conference.live.init();
