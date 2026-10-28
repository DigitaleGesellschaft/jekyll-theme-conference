/**
 * The three style setups (`conference.custom_style`): the right stylesheets
 * are linked and precached, and the Sass sources for "full" compile
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { before, describe, test } from "node:test";
import { compileString } from "sass";
import { BASEURL, FIXTURE_DIR, buildSite } from "./support/build.js";

const STYLES = {
  none: { config: undefined, linked: ["conference.bundle.css", "main.css"] },
  bootstrap: { config: "_config.style-bootstrap.yml", linked: ["bootstrap.min.css", "conference-only.bundle.css", "main.css"] },
  full: { config: "_config.style-full.yml", linked: ["main.css"] },
};
const BUNDLES = ["conference.bundle.css", "conference-only.bundle.css"];

const sites = {};

before(() => {
  for (const [style, { config }] of Object.entries(STYLES)) {
    sites[style] = buildSite(config);
  }
});

for (const [style, { linked }] of Object.entries(STYLES)) {
  describe(`custom_style: ${style}`, () => {
    test("links the matching stylesheets", () => {
      const html = readFileSync(join(sites[style], "index.html"), "utf8");
      const stylesheets = [...html.matchAll(/<link rel="stylesheet" href="[^"]*\/assets\/css\/([^"?]+)/g)].map(([, file]) => file);

      assert.deepEqual(stylesheets, linked);
    });

    test("precaches only the linked bundle", () => {
      const { assets } = JSON.parse(readFileSync(join(sites[style], "assets/js/site.json"), "utf8"));
      const bundles = BUNDLES.filter((file) => assets.includes(`${BASEURL}/assets/css/${file}`));

      assert.deepEqual(bundles, BUNDLES.filter((file) => linked.includes(file)));
    });
  });
}

test("full: theme Sass compiles with the site's Bootstrap variables", () => {
  const { css } = compileString('@use "conference";', {
    loadPaths: [join(FIXTURE_DIR, "_sass"), join(FIXTURE_DIR, "../../_sass")],
    quietDeps: true,
    silenceDeprecations: ["import", "global-builtin", "color-functions", "if-function"],
  });

  assert.match(css, /--bs-primary: #4ea93f/);
  assert.match(css, /\.program-table/);
});
