/**
 * Jekyll Theme Conference - Main JavaScript Entry Point
 *
 * Only loads Bootstrap plugins actually used and lazy-loads Leaflet when needed.
 */

// Import Bootstrap (only needed plugins)
import Alert from 'bootstrap/js/dist/alert';
import Button from 'bootstrap/js/dist/button';
import Dropdown from 'bootstrap/js/dist/dropdown';
import Modal from 'bootstrap/js/dist/modal';
import Tab from 'bootstrap/js/dist/tab';

window.bootstrap = { Alert, Button, Dropdown, Modal, Tab };

// Import core module
import { createConference } from './core/conference.js';
import { init } from './init.js';

// Import additional modules
import { createDarkModeModule } from './modules/darkmode.js';
import { createInfoboxModule } from './modules/infobox.js';
import { createLiveModule } from './modules/live.js';
import { createMapModule } from './modules/map.js';
import { createModalModule } from './modules/modal.js';
import { createProgramModule } from './modules/program.js';
import { createPWAModule } from './modules/pwa.js';

// Initialize the conference object and expose it immediately
const conference = createConference();
window.conference = conference;

// Initialize dark mode immediately to avoid flash of wrong theme
const darkmode = createDarkModeModule();
darkmode.init();

conference.darkmode = darkmode;
conference.infobox = createInfoboxModule();
conference.modal = createModalModule();
conference.program = createProgramModule();
conference.live = createLiveModule(conference.config);

// Lazy-load map module only when map element exists
if (document.getElementById('map')) {
  conference.map = createMapModule();
}

// Start initialization
init(conference).then(() => {
  // Initialize PWA module if enabled
  if (conference.config.pwa && conference.config.pwa.enable) {
    conference.pwa = createPWAModule(conference.config);
    conference.pwa.init();
  }
});
