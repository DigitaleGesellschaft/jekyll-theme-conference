window.conference.live = (function() {
    {%- include partials/get_conf_time.html -%}
    {%- assign time_start = conf_start -%}
    {%- assign time_end = conf_end -%}
    {%- include partials/get_timestamp.html -%}

    {%- unless site.conference.live.demo -%}

        let confStart = {{ timestamp_start }};
        let confEnd = {{ timestamp_end }};

        let timer;

        let timeNow = function () {
            // Return UNIX timestamp in seconds
            return Math.floor(Date.now() / 1000);
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

    {%- else -%}

        let durDemo  = 5*60; // in seconds
        let durPause =   10; // in seconds

        let pauseDemo = false;
        let timeFrozen = 0;
        let timeOffset = 0;

        let timeNowCycle = function() {
            // Cycle time over program for a fixed duration
            let relTime = (Math.floor(Date.now() / 1000) % durDemo - durPause) / (durDemo - 2*durPause);
            let altTime = ({{ timestamp_end }} - {{ timestamp_start }}) * relTime + {{ timestamp_start }};
            return altTime;
        };

        let timeNow = function() {
            if (pauseDemo) {
                return timeFrozen;
            }
            else {
                return timeNowCycle() - timeOffset;
            }
        };

        let pauseTime = function () {
            timeFrozen = timeNowCycle();
            pauseDemo = true;
        };

        let continueTime = function () {
            timeOffset = timeNowCycle() - timeFrozen;
            pauseDemo = false;
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

    {%- endunless %}

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

        verifyEnd();
    };

    {%- unless site.conference.live.demo -%}

        let init = function () {
            updateLiveButtons();
            setTimeout(function() {
                timer = setInterval(updateLiveButtons, 60*1000);
                updateLiveButtons();
            }, timeStart() * 1000);
        };

        let verifyEnd = function () {
            if (timeNow() > confEnd) {
                // Cancel timer after program is over
                clearInterval(timer);
            }
        };

        return {
            init: init,
            confStart: confStart,
            confEnd: confEnd
        };

    {%- else -%}

        let init = function () {
            updateLiveButtons();
            setInterval(updateLiveButtons, 100);
        };

        let verifyEnd = function () {};

        return {
            init: init,

            pauseTime: pauseTime,
            continueTime: continueTime,
            setTime: setTime,
            getTime: getTime,

            durDemo: durDemo,
            durPause: durPause
        };

    {%- endunless %}

})();

window.conference.live.init();
