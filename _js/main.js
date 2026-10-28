/**
 * Jekyll Theme Conference - Main JavaScript Entry Point
 *
 * Only loads Bootstrap plugins actually used and lazy-loads Leaflet when needed.
 */

// Import Bootstrap (only needed plugins)
import Alert from "bootstrap/js/dist/alert";
import Collapse from "bootstrap/js/dist/collapse";
import Dropdown from "bootstrap/js/dist/dropdown";
import Modal from "bootstrap/js/dist/modal";
import Tab from "bootstrap/js/dist/tab";

window.bootstrap = { Alert, Collapse, Dropdown, Modal, Tab };

// Import core
import { createClock } from "./core/clock.js";
import { createConference } from "./core/conference.js";
import { init } from "./init.js";

// Import modules
import { createDarkModeModule } from "./modules/darkmode.js";
import { createEmbedModule } from "./modules/embed.js";
import { createInfoboxModule } from "./modules/infobox.js";
import { createLiveModule } from "./modules/live.js";
import { createMapModule } from "./modules/map.js";
import { createModalModule } from "./modules/modal.js";
import { createProgramModule } from "./modules/program.js";
import { createPWAModule } from "./modules/pwa.js";
import { createStreamModule } from "./modules/stream.js";

// Initialize the conference object and expose it immediately
const conference = createConference();
window.conference = conference;

// Modules by config key (see _includes/conference_config.json), initialized in this order
const clock = createClock();
const live = createLiveModule(clock);
const modules = {
  darkmode: createDarkModeModule(),
  infobox: createInfoboxModule(),
  modal: createModalModule(),
  embed: createEmbedModule(),
  program: createProgramModule(),
  live,
  stream: createStreamModule(clock, live, conference.config),
  map: createMapModule(),
  pwa: createPWAModule(conference.config),
};
Object.assign(conference, modules);

init(conference, modules);
