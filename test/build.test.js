/**
 * Assertions on the generated fixture site (JSON endpoints, structured data,
 * PWA resources, timestamps, escaping and markup)
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { before, describe, test } from "node:test";
import { BASEURL, buildSite } from "./support/build.js";

let site;

const read = (path) => readFileSync(join(site, path), "utf8");
const readJson = (path) => JSON.parse(read(path));

const htmlFiles = (dir = site) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return htmlFiles(path);
    }
    return entry.name.endsWith(".html") ? [relative(site, path)] : [];
  });

// Epoch seconds of a UTC date (month is 1-based)
const utc = (year, month, day, hour, min = 0) => Date.UTC(year, month - 1, day, hour, min) / 1000;

before(() => {
  site = buildSite();
});

describe("JSON endpoints", () => {
  for (const file of ["assets/js/config.json", "assets/js/data.json", "assets/js/site.json", "manifest.json"]) {
    test(`${file} is valid JSON`, () => {
      assert.doesNotThrow(() => readJson(file));
    });
  }

  test("config.json carries map and live settings", () => {
    const config = readJson("assets/js/config.json");

    assert.deepEqual(config.map.home_coord, [47.3744489, 8.5410422]);
    assert.equal(config.live.timezone, "Europe/Zurich");
  });

  test("data.json keeps names with quotes and markup intact", () => {
    const data = readJson("assets/js/data.json");

    assert.equal(data.speakers["Eve <i>Evil</i>"].name, 'Eve "E" <i>Evil</i>');
    assert.ok(data.rooms["Room <B>"]);
    assert.equal(data.talks["Room <B>"][0].name, 'Talk with "quotes" <script>alert(1)</script>');
  });

  test("data.json lists only live links of a talk", () => {
    const opening = readJson("assets/js/data.json").talks["Room A"][0];

    assert.deepEqual(opening.live_links, [{ name: 'Q&A "live"', href: "https://chat.example.org/?a=1&b=2" }]);
  });
});

describe("Timestamps use the site timezone (Europe/Zurich), not the build machine's", () => {
  test("talk start and overnight end in data.json", () => {
    const [opening, lateNight] = readJson("assets/js/data.json").talks["Room A"];

    assert.equal(opening.start, utc(2026, 2, 20, 8));
    assert.equal(lateNight.end, utc(2026, 2, 21, 0));
  });

  test("program day tab starts at local midnight", () => {
    const match = read("program/index.html").match(/data-ts="(\d+)"/);

    assert.equal(Number(match[1]), utc(2026, 2, 19, 23));
  });

  test("JSON-LD talk dates carry the offset", () => {
    const ld = read("talks/opening_welcome/index.html");

    assert.match(ld, /"startDate":\s*"2026-02-20T09:00:00\+01:00"/);
  });
});

describe("Structured data", () => {
  test("every JSON-LD block is valid JSON", () => {
    const failures = [];

    for (const file of htmlFiles()) {
      const blocks = read(file).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
      for (const [, block] of blocks) {
        try {
          JSON.parse(block);
        } catch (error) {
          failures.push(`${file}: ${error.message}`);
        }
      }
    }
    assert.deepEqual(failures, []);
  });
});

describe("PWA", () => {
  test("manifest has icons and shortcuts and does not lock orientation", () => {
    const manifest = readJson("manifest.json");

    assert.equal(manifest.icons.length, 1);
    assert.ok(manifest.shortcuts.length > 0);
    assert.equal(manifest.orientation, undefined);
  });

  test("status bar style is a valid keyword", () => {
    const match = read("index.html").match(/apple-mobile-web-app-status-bar-style" content="([^"]*)"/);

    assert.ok(["default", "black", "black-translucent"].includes(match[1]));
  });

  test("site.json lists all visible pages", () => {
    const { pages } = readJson("assets/js/site.json");

    for (const path of ["/", "/program/", "/talks/", "/talks/opening_welcome/", "/speakers/ada_lovelace/", "/rooms/room_a/"]) {
      assert.ok(pages.includes(BASEURL + path), `missing ${path}`);
    }
    for (const path of ["/talks/hidden_talk/", "/speakers/hidden_person/", "/sw.js"]) {
      assert.ok(!pages.includes(BASEURL + path), `unexpected ${path}`);
    }
  });

  test("site.json lists assets but no documents, redundant fonts or source maps", () => {
    const { assets } = readJson("assets/js/site.json");

    for (const path of ["/assets/images/icon.png", "/assets/css/main.css", "/assets/css/conference.bundle.css", "/assets/webfonts/bootstrap-icons.woff2", "/assets/webfonts/legacy.woff"]) {
      assert.ok(assets.includes(BASEURL + path), `missing ${path}`);
    }
    assert.deepEqual(assets.filter((url) => /\/documents\/|bootstrap-icons\.woff$|\.map$|conference-only/.test(url)), []);
  });

  test("every precached URL exists", () => {
    const { pages, assets } = readJson("assets/js/site.json");
    const missing = [...pages, ...assets].filter((url) => {
      const path = url.slice(BASEURL.length);
      return !existsSync(join(site, path)) && !existsSync(join(site, path, "index.html"));
    });

    assert.deepEqual(missing, []);
  });
});

describe("Escaping of user content", () => {
  test("names and titles never appear as raw markup", () => {
    const leaks = [];

    for (const file of htmlFiles()) {
      // Ignore JSON-LD, where jsonify keeps the raw string
      const html = read(file).replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
      for (const raw of ["<script>alert(1)</script>", "<i>Evil</i>", "Room <B>"]) {
        if (html.includes(raw)) {
          leaks.push(`${file}: ${raw}`);
        }
      }
    }
    assert.deepEqual(leaks, []);
  });
});

describe("Program options", () => {
  // Time labels of the first day, e.g. ["09:00", ":30", "10:00", ...]
  const timeLabels = (path) => {
    const table = read(path).split("</table>")[0];
    return [...table.matchAll(/<th scope="row"[^>]*>([^<]*)<\/th>/g)].map(([, label]) => label.trim());
  };

  test("default: rows every 15 minutes, labels on full hours, legend", () => {
    const labels = timeLabels("program/index.html");

    // 09:00 - 01:00 (+1 day) in steps of 15 minutes
    assert.equal(labels.length, 64);
    assert.deepEqual(labels.filter(Boolean).slice(0, 3), ["9:00", "10:00", "11:00"]);
    assert.match(read("program/index.html"), /<h5[^>]*>Caption<\/h5>/);
  });

  test("time_steps start: one row per talk start, hide_legend", () => {
    const html = read("variants/start/index.html");

    assert.deepEqual(timeLabels("variants/start/index.html"), ["9:00", "9:30", "22:00"]);
    assert.doesNotMatch(html, /<h5[^>]*>Caption<\/h5>/);
  });

  test("show_alltimes: labels for all rows", () => {
    const labels = timeLabels("variants/alltimes/index.html");

    assert.deepEqual(labels.slice(0, 4), ["9:00", ":30", "10:00", ":30"]);
  });

  test("talk duration is exact, not rounded to program rows", () => {
    // Second Day: 09:00 - 09:40, i.e. three 15-minute rows
    assert.match(read("talks/second_day/index.html"), /&nbsp;40min/);
  });

  test("talk without track does not inherit the previous talk's colour", () => {
    const html = read("program/index.html");
    const cell = html.slice(html.lastIndexOf("<td rowspan", html.indexOf("Hidden Talk")), html.indexOf("Hidden Talk"));

    assert.doesNotMatch(cell, /bg-info-subtle/);
  });

  test("a talk ending between rows fills the started row", () => {
    // Second Day: 09:00 - 09:40, i.e. three 15-minute rows
    const html = read("program/index.html");
    const cell = html.slice(html.lastIndexOf("<td rowspan", html.indexOf("Second Day")), html.indexOf("Second Day"));

    assert.match(cell, /rowspan="3"/);
  });

  test("a program page uses its own time steps", () => {
    // Second Day: 09:00 - 09:40, i.e. two 30-minute rows
    const html = read("variants/alltimes/index.html");
    const cell = html.slice(html.lastIndexOf("<td rowspan", html.indexOf("Second Day")), html.indexOf("Second Day"));

    assert.match(cell, /rowspan="2"/);
  });

  test("talk pages link to the main program page", () => {
    assert.match(read("talks/opening_welcome/index.html"), /href="\/conf\/program\/"/);
  });
});

describe("Markup", () => {
  test("theme checks report no errors", () => {
    assert.doesNotMatch(read("index.html"), /There was an error when generating the site/);
  });

  test("home page has no block elements in heading and no nested paragraphs", () => {
    const html = read("index.html");

    assert.doesNotMatch(html, /<h1[^>]*>(?:(?!<\/h1>)[\s\S])*<div/);
    assert.doesNotMatch(html, /<p(?:\s[^>]*)?>\s*<p[\s>]/);
  });

  test("pages do not connect to stream hosts before a stream is opened", () => {
    assert.doesNotMatch(read("index.html"), /rel="preconnect"[^>]*stream\.example\.org/);
  });

  test("navigation marks only the current section as active", () => {
    const html = read("program/index.html");
    const activeLinks = [...html.matchAll(/<a\s+class="nav-link active"\s+href="([^"]*)"/g)].map(([, href]) => href);

    assert.deepEqual([...new Set(activeLinks)], ["/conf/program/"]);
  });

  test("program table has no interactive grid role", () => {
    assert.doesNotMatch(read("program/index.html"), /role="grid"/);
  });
});
