import { EDITIONS_DIR, buildSite } from "../support/build.js";

// Build the fixture sites before the web servers start serving them
export default function globalSetup() {
  if (!process.env.SKIP_BUILD) {
    buildSite();
    buildSite(undefined, EDITIONS_DIR);
  }
}
