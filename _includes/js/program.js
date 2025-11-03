window.conference.program = (() => {
    const updateHash = (hash) => {
        const scrollPosition = document.documentElement.scrollTop;
        window.location.hash = hash;
        document.documentElement.scrollTop = scrollPosition;
    };

    const init = () => {
        const $dayList = $('#day-list');
        if (!$dayList.length) return;

        const hash = window.location.hash;
        if (hash) {
            $(`a[data-toggle="tab"][href="${hash}"]`).tab('show');
        } else {
            const tsNow = Date.now() / 1000 | 0;
            $('a[data-toggle="tab"]').each(function () {
                const tsMidnight = $(this).data("ts");
                if (tsMidnight && tsMidnight <= tsNow && tsNow < tsMidnight + 24 * 60 * 60) {
                    $(this).tab('show');
                    updateHash(this.hash);
                    return false;
                }
            });
        }

        // Add current selected day as hash to URL while keeping current scrolling position
        $('a[data-toggle="tab"]').on('shown.bs.tab', function () {
            updateHash(this.hash);
        });
    };

    return {
        init: init,
    };
})();
