/**
 * Jekyll Theme Conference - Main JavaScript Entry Point
 *
 * This file imports all dependencies and modules, then initializes the conference app.
 * Configuration is loaded from /assets/js/config.json at runtime.
 */

// Core libraries
import * as bootstrap from 'bootstrap';
import syncscroll from './lib/syncscroll.js';

// Leaflet and plugins (loaded dynamically when map is enabled)
import L from 'leaflet';
import 'leaflet-easybutton';
import 'leaflet.locatecontrol';
import 'leaflet-providers';

// Make Bootstrap available globally (for Modal, Tab, etc. access)
window.bootstrap = bootstrap;

// Make Leaflet available globally
window.L = L;

// Initialize syncscroll
syncscroll.init();

// Import conference modules
import { createConference } from './core/conference.js';
import { createProgramModule } from './modules/program.js';
import { createMapModule } from './modules/map.js';
import { createModalModule } from './modules/modal.js';
import { createLiveModule } from './modules/live.js';
import { init } from './init.js';

// Initialize the conference object
const conference = createConference();

// Register modules
conference.program = createProgramModule();
conference.modal = createModalModule();
conference.map = createMapModule(L);
conference.live = createLiveModule(conference);

// Expose to global scope
window.conference = conference;

// Start initialization
init(conference);
