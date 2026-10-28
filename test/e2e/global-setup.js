import { buildSite } from "../support/build.js";

// Build the fixture site before the web server starts serving it
export default function globalSetup() {
  if (!process.env.SKIP_BUILD) {
    buildSite();
  }
}
