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

    let timer;

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

        if (timeNow() > confEnd) {
            // Cancel timer after program is over
            clearInterval(timer);
        }
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

    let startUpdate = function () {
        if(typeof timer !== "undefined") {
            clearInterval(timer);
        }
        updateLiveButtons();

        if (demo) {
            timer = setInterval(updateLiveButtons, 100);
        }
        else {
            setTimeout(function() {
                timer = setInterval(updateLiveButtons, 60*1000);
                updateLiveButtons();
            }, timeStart() * 1000);
        }
    };

    let toggleDemo = function () {
        demo = !demo;
        timeOffset = 0;
        startUpdate();
    };

    {% if site.conference.live.streaming -%}

        let rooms = {
            {% for r in site.data.program %}
                {% assign room = site.rooms | where: 'name', r.room | first %}
                {% if room.live %}
                    "{{ room.name }}": {
                        "id": {{ forloop.index }},
                        "href": "{{ room.live }}"
                    },
                {% endif %}
            {% endfor %}
        };

        let switchStream = function (modal, roomName) {
            if (roomName in rooms) {
                room = rooms[roomName];
            }
            else {
                room = rooms[Object.keys(rooms)[0]];
            }

            modal.find('.modal-footer .btn').removeClass('active');
            modal.find('iframe').attr('src', room.href);
            modal.find('#stream-button' + room.id).addClass('active');
        };

        let hideModal = function (el, event) {
            let modal = $(el);

            modal.find('iframe').attr('src', '');
            modal.find('.modal-footer .btn').removeClass('active');
        };

        let initStream = function() {
            elSel = '#stream-modal';

            $(elSel).on('show.bs.modal', function (event) {
                let modal = $(this);
                let button = $(event.relatedTarget);
                let roomName = button.data('room');

                switchStream(modal, roomName);
            });
            $(elSel).on('hide.bs.modal', function (event) {
                hideModal(this, event);
            });

            $(elSel + ' .modal-footer .btn').on('click', function(event) {
                event.preventDefault();

                let modal = $(elSel);
                let roomName = $(this).data('room')

                switchStream(modal, roomName);
            });
        };

    {%- else -%}

        let initStream = function() {};

    {%- endif %}

    let init = function () {
        startUpdate();
        initStream();
    };

    return {
        init: init,

        pauseTime: pauseTime,
        continueTime: continueTime,
        resetTime: resetTime,
        setTime: setTime,
        getTime: getTime,

        toggleDemo: toggleDemo,
        durDemo: durDemo,
        durPause: durPause
    };

})();

window.conference.live.init();
