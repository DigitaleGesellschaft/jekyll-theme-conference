(function() {
    {% include partials/get_conf_time.html %}
    {% assign time_start = conf_start %}
    {% assign time_end = conf_end %}
    {% include partials/get_timestamp.html %}
    let startConf = {{ timestamp_start }};
    let endConf = {{ timestamp_end }};

    let timer;

    {% unless site.conference.live.demo %}
        let timeNow = function() {
            // Return UNIX timestamp in seconds
            return Math.floor(Date.now() / 1000);
        };

        let timeStart = function () {
            let tNow = timeNow();
            if (startConf - 60 > tNow) {
                // Start when conference start (-60s)
                return startConf - 60 - tNow;
            }
            else {
                // Start on the minute
                return (60 - (tNow % 60));
            }
        };
    {% else %}
        let demoDur = 5*60; // in seconds
        let offsetDur = 10; // in seconds

        let timeNow = function() {
            // Cycle time over program for a fixed duration
            let relTime = (Math.floor(Date.now() / 1000) % demoDur - offsetDur) / (demoDur - 2*offsetDur);
            let altTime = ({{ timestamp_end }} - {{ timestamp_start }}) * relTime + {{ timestamp_start }};
            return altTime;
        };
    {% endunless %}

    updateLiveButtons = function() {
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

        if (tNow > endConf) {
            // Cancel timer after program is over
            clearInterval(timer);
        }
    };

    // Initial call
    updateLiveButtons();

    // Set minutely repeated call
    {% unless site.conference.live.demo %}
        setTimeout(function() {
            timer = setInterval(updateLiveButtons, 60*1000);
            updateLiveButtons();
        }, timeStart() * 1000);
    {% else %}
        setInterval(updateLiveButtons, 100);
    {% endunless %}
})();
