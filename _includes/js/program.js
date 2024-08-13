window.conference.program = (() => {
    const updateHash = (hash) => {
        const scrollPosition = document.documentElement.scrollTop;
        window.location.hash = hash;
        document.documentElement.scrollTop = scrollPosition;
    };

    const init = () => {
        if ($('#day-list')) {
            // Switch to day if page load with hash
            const hash = window.location.hash;
            if (hash) {
                $('#day-list a[href="' + hash + '"]').tab('show');
            }

            // Switch to day if today
            else {
                let today = new Date();
                let localDateString = today.getFullYear() + "-";
                let month = today.getMonth();
                month = month + 1;
                if (month < 10) {
                    localDateString = localDateString + '0';
                }
                localDateString = localDateString + month + "-";
                let dayOfMonth = today.getDate();
                if (dayOfMonth < 10) {
                    localDateString = localDateString + "0";
                }
                localDateString = localDateString + dayOfMonth;

                $('a[data-toggle="tab"]').each(function () {
                    if ($(this).data('date') === localDateString) {
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
