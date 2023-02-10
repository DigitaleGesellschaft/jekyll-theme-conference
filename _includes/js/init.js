const init = () => {
    // Load configuration
    const request = new Request(window.conference.config.baseurl + '/assets/js/config.json');

    fetch(request)
    .then(response =>
        response.json()
    )
    .then(config => {
        // Add configuration to global scope
        window.conference.config = Object.assign(window.conference.config, config);

        // Execute initialization functions
        for (const [name, module] of Object.entries(window.conference)) {
            if (['config','ready','awaitReady'].includes(name)) {
                continue;
            }

            let c;
            if (name in config) {
                c = config[name];
            }
            let l;
            if (name in config.lang) {
                l = config.lang[name];
            }

            module.init(c, l);
        }

    }).then(() => {
        window.conference.ready = true;
    })
    .catch((error) => {
        console.log(error);
    });
};

init();
