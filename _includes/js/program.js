window.conference.program = (() => {
    const updateHash = (hash) => {
        const scrollPosition = document.documentElement.scrollTop;
        window.location.hash = hash;
        document.documentElement.scrollTop = scrollPosition;
    };

    const init = () => {
        if ($("#day-list")) {
            // Switch to day if page load with hash
            const hash = window.location.hash;
            if (hash) {
                $('#day-list a[href="' + hash + '"]').tab("show");
            }

            // Switch to day if today
            else {
                const now = new Date();
                const tsNow = Math.floor(now.getTime() / 1000);

                $('a[data-toggle="tab"]').each(function () {
                    const tsMidnight = new Date($(this).data("ts") * 1000);

                    if (tsMidnight <= tsNow < tsMidnight + 24 * 60 * 60) {
                        $(this).tab("show");
                        updateHash(this.hash);
                    }
                });
            }

            // Add current selected day as hash to URL while keeping current scrolling position
            $('a[data-toggle="tab"]').on("shown.bs.tab", function () {
                updateHash(this.hash);
            });
        }
    };

    return {
        init: init,
    };
})();
