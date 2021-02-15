// Vertical Scroll Sync
{% include js/syncscroll.js %}

window.conference.program = (function() {
    let updateHash = function (hash) {
        let scrollPosition = $('body').scrollTop() || $('html').scrollTop();
        window.location.hash = hash;
        $('html,body').scrollTop(scrollPosition);
    };

    let init = function () {
        if ($('#day-list')) {
            // Switch to day if page load with hash
            var hash = window.location.hash;
            if (hash) {
                $('#day-list a[href="' + hash + '"]').tab('show');
            }
            // Switch to day if today
            else {
                let d = new Date();
                let dStr = d.getFullYear() +"-"+ (d.getMonth()+1) +"-"+ d.getDate()
                // since a timezone compensation is added when passed as string, today's date has also
                // to be passed as string (as it is done below)
                let today = new Date(dStr);

                $('a[data-toggle="tab"]').each(function () {
                    let d = new Date($(this).data('date'));

                    if (today.getTime() === d.getTime()) {
                        $(this).tab('show');
                        updateHash(this.hash);
                    }
                });
            }

            // Add current selected day as hash to URL while keeping current scrolling position
            $('a[data-toggle="tab"]').on('shown.bs.tab', function () {
                updateHash(this.hash);
            });
        }
    };

    return {
        init: init
    };
})();

window.conference.program.init();
