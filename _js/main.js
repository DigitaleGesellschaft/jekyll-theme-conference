/**
 * Jekyll Theme Conference - Main JavaScript Entry Point
 *
 * This file imports all dependencies and modules, then initializes the conference app.
 * Configuration is loaded from /assets/js/config.json at runtime.
 */

// Core libraries
import * as bootstrap from 'bootstrap';

// Leaflet and plugins (loaded dynamically when map is enabled)
import L from 'leaflet';
import 'leaflet-easybutton';
import { locate as locateControl } from 'leaflet.locatecontrol';
import 'leaflet-providers';

// Register locate control with Leaflet
L.control.locate = locateControl;

// Make Bootstrap available globally (for Modal, Tab, etc. access)
window.bootstrap = bootstrap;

// Make Leaflet available globally
window.L = L;

// Import conference modules
import { createConference } from './core/conference.js';
import { createProgramModule } from './modules/program.js';
import { createMapModule } from './modules/map.js';
import { createModalModule } from './modules/modal.js';
import { createLiveModule } from './modules/live.js';
import { createDarkModeModule } from './modules/darkmode.js';
import { createInfoboxModule } from './modules/infobox.js';
import { init } from './init.js';

// Initialize the conference object
const conference = createConference();

// Register modules
conference.program = createProgramModule();
conference.modal = createModalModule();
conference.map = createMapModule(L);
conference.live = createLiveModule(conference);
conference.darkmode = createDarkModeModule();
conference.infobox = createInfoboxModule();

// Initialize dark mode immediately to avoid flash of wrong theme
// This runs before other modules since it doesn't need config
conference.darkmode.init();

// Expose to global scope
window.conference = conference;

// Start initialization
init(conference);
