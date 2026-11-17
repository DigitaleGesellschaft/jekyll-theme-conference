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
const pathOf = (url) => url.split("?")[0];
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
  for (const file of ["assets/js/data.json", "assets/js/site.json", "manifest.json"]) {
    test(`${file} is valid JSON`, () => {
      assert.doesNotThrow(() => readJson(file));
    });
  }

  test("inline config carries map, live and stream settings", () => {
    const config = JSON.parse(read("index.html").match(/<script type="application\/json" id="conference-config">([\s\S]*?)<\/script>/)[1]);

    assert.equal(config.baseurl, BASEURL);
    assert.equal(config.edition, null);
    assert.equal(config.edition_current, true);
    assert.deepEqual(config.map.home_coord, [47.3744489, 8.5410422]);
    assert.equal(config.live.timezone, "Europe/Zurich");
    assert.deepEqual(config.live.days.map(({ date }) => date), ["2026-02-20", "2026-02-21"]);
    assert.equal(config.stream.prepend, 5);
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

  test("conference and talks carry the configured status and attendance mode", () => {
    for (const file of ["index.html", "talks/opening_welcome/index.html"]) {
      const html = read(file);

      assert.match(html, /"eventStatus": "https:\/\/schema.org\/EventPostponed"/, file);
      assert.match(html, /"eventAttendanceMode": "https:\/\/schema.org\/OnlineEventAttendanceMode"/, file);
    }
  });
});

// Tabs of the app's tab bar, marked if shown only during or outside live,
// e.g. ["Program", "Live (live)", "More"]
const pwaTabs = (html) => {
  const tabBar = html.match(/<nav class="navbar[^"]*navbar-pwa[\s\S]*?<\/nav>/)[0];
  return [...tabBar.matchAll(/<div class="px-2([^"]*)"[\s\S]*?<span>([^<]*)<\/span>/g)].map(([, cls, name]) => {
    if (/live-show/.test(cls)) {
      return `${name} (live)`;
    }
    return /live-hide/.test(cls) ? `${name} (not live)` : name;
  });
};

describe("PWA", () => {
  test(".htaccess keeps its content and forwards nothing without editions", () => {
    const htaccess = read(".htaccess");

    assert.match(htaccess, /ErrorDocument 404/);
    assert.doesNotMatch(htaccess, /Rewrite/);
  });

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

  test("page extends below the system bars, the app pads its bars by their size", () => {
    const html = read("index.html");

    assert.match(html, /<meta name="viewport" content="[^"]*viewport-fit=cover"/);
    assert.doesNotMatch(html.match(/<nav class="navbar[^"]*navbar-pwa[^"]*"/)[0], /\bpb-\d/);
  });

  test("theme colour follows the colour scheme if a dark one is set", () => {
    const html = read("index.html");

    assert.match(html, /<meta name="theme-color" content="#4ea93f" media="\(prefers-color-scheme: light\)" \/>/);
    assert.match(html, /<meta name="theme-color" content="#1f4a19" media="\(prefers-color-scheme: dark\)" \/>/);
  });

  test("app's tab bar holds five tabs at most, one kept for Live", () => {
    const html = read("index.html");
    const tabBar = html.match(/<nav class="navbar[^"]*navbar-pwa[\s\S]*?<\/nav>/)[0];
    const more = html.match(/id="navbar-pwa-more"[\s\S]*?<\/nav>|id="navbar-pwa-more"[\s\S]*$/)[0];

    assert.deepEqual(pwaTabs(html), ["Program", "Talks", "Speakers", "Live (live)", "Offline (not live)", "More"]);
    assert.match(tabBar, /<button[^>]*data-bs-target="#navbar-pwa-more"/);
    assert.doesNotMatch(tabBar, /dropup|dropdown/);
    assert.match(more, /href="\/conf\/location\/"[\s\S]*Location[\s\S]*href="\/conf\/documents\/flyer\.pdf"[\s\S]*Flyer/);
    assert.match(more, /<h3[^>]*>Info<\/h3>[\s\S]*href="\/conf\/variants\/alltimes\/"/);
  });

  test("app's sheets are outside the tab bar, above its stacking context", () => {
    const footer = read("index.html").match(/<footer class="footer-pwa">[\s\S]*?<\/footer>/)[0];

    assert.doesNotMatch(footer, /class="offcanvas /);
    assert.match(read("index.html"), /<\/footer>\s*<div class="offcanvas [^"]*" tabindex="-1" id="navbar-pwa-more"/);
  });

  test("app's tab bar shows Live before More while live, opening the stream", () => {
    const tabBar = read("index.html").match(/<nav class="navbar[^"]*navbar-pwa[\s\S]*?<\/nav>/)[0];
    const live = tabBar.match(/<div class="px-2 live-show d-none[^"]*" data-start="\d[^"]*" data-end="\d[^"]*">[\s\S]*?<\/div>/)?.[0];

    assert.ok(live, "live tab");
    assert.match(live, /data-bs-target="#stream-modal"[\s\S]*class="live-icon[^"]*"[\s\S]*<span>Live<\/span>/);
    assert.doesNotMatch(live, /live-button/);
    assert.ok(tabBar.indexOf("live-show") < tabBar.indexOf('data-bs-target="#navbar-pwa-more"'));
  });

  test("app's tab bar shows name_inactive as a disabled tab outside live", () => {
    const tabBar = read("index.html").match(/<nav class="navbar[^"]*navbar-pwa[\s\S]*?<\/nav>/)[0];
    const inactive = tabBar.match(/<div class="px-2 live-hide[^"]*" data-start="\d[^"]*" data-end="\d[^"]*">[\s\S]*?<\/div>/)?.[0];

    assert.ok(inactive, "inactive tab");
    assert.match(inactive, /<a class="[^"]*\bdisabled\b[^"]*" href="#" tabindex="-1" aria-disabled="true">[\s\S]*class="live-icon[^"]*"[\s\S]*<span>Offline<\/span>/);
  });

  test("app's active tab shows the filled icon where there is one", () => {
    const tab = (path, name) => read(path).match(new RegExp(`<a[^>]*aria-current="page"[^>]*>[\\s\\S]*?<span>${name}</span>`))[0];

    assert.match(tab("talks/index.html", "Talks"), /bi-megaphone-fill/);
    assert.match(tab("program/index.html", "Program"), /bi-calendar4-week"/);
    assert.doesNotMatch(read("talks/index.html").match(/<nav class="navbar[^"]*navbar-pwa[\s\S]*?<\/nav>/)[0], /bi-people-fill/);
  });

  test("app animates page changes unless reduced motion is preferred, keeping its tab bar", () => {
    const css = read("assets/css/conference.bundle.css");

    assert.match(css, /@media \(display-mode: ?standalone\) and \(prefers-reduced-motion: ?no-preference\) ?\{ ?@view-transition ?\{ ?navigation: ?auto;? ?\}/);
    assert.match(css, /\.navbar-pwa ?\{[^}]*view-transition-name: ?pwa-tabs/);
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

  test("site.json lists assets but no documents, redundant or icon fonts, source maps or map files", () => {
    const { assets } = readJson("assets/js/site.json");
    const paths = assets.map(pathOf);

    for (const path of ["/assets/images/icon.png", "/assets/css/main.css", "/assets/css/conference.bundle.css", "/assets/webfonts/legacy.woff"]) {
      assert.ok(paths.includes(BASEURL + path), `missing ${path}`);
    }
    assert.deepEqual(assets.filter((url) => /\/documents\/|bootstrap-icons|\.map$|conference-only|leaflet|map\.bundle/.test(url)), []);
  });

  test("site.json lists theme bundles with their content hash", () => {
    const { assets } = readJson("assets/js/site.json");

    assert.ok(assets.some((url) => /\/assets\/css\/conference\.bundle\.css\?v=[0-9a-f]{10}$/.test(url)));
    assert.ok(assets.some((url) => /\/assets\/js\/conference\.bundle\.js\?v=[0-9a-f]{10}$/.test(url)));
  });

  test("site.json lists chunks under the URLs the bundle imports", () => {
    const { assets } = readJson("assets/js/site.json");
    const chunks = [...read("assets/js/conference.bundle.js").matchAll(/"\.\/([\w-]+\.bundle\.js)"/g)]
      .map(([, file]) => `${BASEURL}/assets/js/${file}`)
      .filter((url) => !url.includes("/leaflet-"));

    assert.ok(chunks.length);
    assert.deepEqual(chunks.filter((url) => !assets.includes(url)), []);
  });

  test("every precached URL exists", () => {
    const { pages, assets } = readJson("assets/js/site.json");
    const missing = [...pages, ...assets].filter((url) => {
      const path = pathOf(url).slice(BASEURL.length);
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

describe("Styling hooks", () => {
  // Elements of a page carrying a class, e.g. ["a", "span"]
  const tagsWith = (path, cls) =>
    [...read(path).matchAll(new RegExp(`<(\\w+)\\s[^>]*class="(?:[^"]* )?${cls}[ "]`, "g"))].map(([, tag]) => tag);

  test("program marks talks, speakers, rooms and tracks", () => {
    const path = "program/index.html";

    assert.ok(tagsWith(path, "talk-title").includes("a"));
    assert.ok(tagsWith(path, "talk-title").includes("span"), "hidden talk");
    assert.ok(tagsWith(path, "talk-speakers").every((tag) => tag === "p"));
    assert.ok(tagsWith(path, "speaker-name").includes("a"));
    assert.ok(tagsWith(path, "speaker-name").includes("span"), "hidden speaker");
    assert.ok(tagsWith(path, "room-name").length > 0);
    assert.ok(tagsWith(path, "track-name").length > 0, "legend");
    assert.ok(tagsWith(path, "talk-tag").length > 0);
  });

  test("talk page marks title, speakers, track, tags and info", () => {
    assert.ok(tagsWith("talks/opening_welcome/index.html", "talk-title").includes("h1"));
    assert.ok(tagsWith("talks/opening_welcome/index.html", "talk-title").includes("h2"), "video modal");
    for (const cls of ["talk-speakers", "speaker-name", "track-name", "talk-info", "talk-time", "room-name", "talk-duration"]) {
      assert.ok(tagsWith("talks/opening_welcome/index.html", cls).length > 0, cls);
    }
    assert.ok(tagsWith("talks/talk_with_quotes/index.html", "talk-tag").length > 0);
  });

  test("speaker, room and overview pages mark their names", () => {
    assert.deepEqual(tagsWith("speakers/ada_lovelace/index.html", "speaker-name"), ["h1"]);
    assert.ok(tagsWith("speakers/index.html", "speaker-name").every((tag) => tag === "li"));
    assert.ok(tagsWith("talks/index.html", "track-name").length > 0);
    assert.ok(tagsWith("talks/index.html", "talk-speakers").length > 0);
    assert.ok(tagsWith("location/index.html", "room-name").length > 0);
  });

  test("talk and speaker pages mark their lists of links", () => {
    const talk = read("talks/opening_welcome/index.html");

    assert.match(talk, /<ul class="links-icon[ "]/);
    assert.match(talk, /<ul class="links-more[ "]/);
    assert.match(read("speakers/ada_lovelace/index.html"), /<ul class="links-icon[ "]/);
    assert.ok(tagsWith("talks/opening_welcome/index.html", "link-item").every((tag) => tag === "a"));
    assert.ok(tagsWith("talks/opening_welcome/index.html", "link-item").length >= 3);
  });

  test("pages leave the font weight of titles and names to the stylesheet", () => {
    for (const path of ["program/index.html", "talks/index.html", "talks/opening_welcome/index.html", "speakers/index.html", "speakers/ada_lovelace/index.html"]) {
      assert.doesNotMatch(read(path), /fw-light/, path);
    }
  });

  test("track labels leave their box to the stylesheet", () => {
    for (const path of ["program/index.html", "talks/index.html", "talks/opening_welcome/index.html"]) {
      const labels = [...read(path).matchAll(/class="track-name([^"]*)"/g)].map(([, cls]) => cls);

      assert.ok(labels.length > 0, path);
      assert.ok(labels.every((cls) => !/\b(badge|border-4|border-start|p-1|fw-normal)\b/.test(cls)), path);
    }
  });

  test("listed talks leave their bar and spacing to the stylesheet", () => {
    for (const path of ["talks/index.html", "speakers/ada_lovelace/index.html", "rooms/room_a/index.html"]) {
      const items = [...read(path).matchAll(/class="talk-item([^"]*)"/g)].map(([, cls]) => cls);

      assert.ok(items.length > 0, path);
      assert.ok(items.every((cls) => !/\b(ps-2|mb-2|border-4|border-start)\b/.test(cls)), path);
    }
    assert.doesNotMatch(read("rooms/room_a/index.html"), /<h3 class="[^"]*\bmt-1\b/);
  });

  test("pages mark listed talks, labels, back links, consent and header", () => {
    assert.ok(tagsWith("talks/index.html", "talk-list").every((tag) => tag === "ul"));
    assert.deepEqual(tagsWith("speakers/ada_lovelace/index.html", "talk-list"), ["table"]);
    assert.ok(tagsWith("rooms/room_a/index.html", "talk-list").every((tag) => tag === "table"));
    assert.ok(tagsWith("rooms/room_a/index.html", "talk-list").length > 0);
    assert.ok(tagsWith("talks/index.html", "talk-item").every((tag) => tag === "li"));
    assert.ok(tagsWith("talks/index.html", "talk-item").length > 0);
    assert.ok(tagsWith("speakers/ada_lovelace/index.html", "talk-item").every((tag) => tag === "div"));
    assert.deepEqual(tagsWith("speakers/ada_lovelace/index.html", "page-label"), ["p"]);
    assert.deepEqual(tagsWith("talks/opening_welcome/index.html", "back-link"), ["a", "a"]);
    assert.deepEqual(tagsWith("speakers/ada_lovelace/index.html", "back-link"), ["a"]);
    assert.ok(tagsWith("location/index.html", "consent-button").every((tag) => tag === "button"));
    assert.ok(tagsWith("location/index.html", "consent-button").length > 0);
    assert.deepEqual(tagsWith("index.html", "home-header"), ["div"]);
  });

  test("icons are spaced by a margin, so that hidden icons leave no space", () => {
    for (const path of ["program/index.html", "talks/opening_welcome/index.html", "speakers/ada_lovelace/index.html"]) {
      assert.doesNotMatch(read(path), /<\/svg>&nbsp;/, path);
    }
  });

  test("home header and video modal carry no classes of other elements", () => {
    assert.doesNotMatch(read("index.html"), /text-body-primary/);
    assert.doesNotMatch(read("talks/opening_welcome/index.html"), /class="[^"]*\bh5\b[^"]*" id="link-modal-description"/);
  });
});

describe("Program options", () => {
  // Time labels of a day (default: the first), e.g. ["09:00", ":30", "10:00", ...]
  const timeLabels = (path, day = 0) => {
    const table = read(path).split("</table>")[day];
    const visible = table.replace(/<span class="visually-hidden">[^<]*<\/span>/g, "");
    return [...visible.matchAll(/<th scope="row"[^>]*>([^<]*)<\/th>/g)].map(([, label]) => label.trim());
  };

  test("default: rows every 15 minutes, labels on full hours, legend", () => {
    const labels = timeLabels("program/index.html");

    // 09:00 - 01:00 (+1 day) in steps of 15 minutes
    assert.equal(labels.length, 64);
    assert.deepEqual(labels.filter(Boolean).slice(0, 3), ["9:00", "10:00", "11:00"]);
    assert.match(read("program/index.html"), /<h2[^>]*>Caption<\/h2>/);
  });

  test("rooms without talks do not extend the day", () => {
    // Saturday: Room C without talks first, Room A 09:00 - 10:45
    const labels = timeLabels("program/index.html", 1);

    assert.deepEqual(labels.filter(Boolean), ["9:00", "10:00"]);
    assert.equal(labels.length, 7);
  });

  test("time_steps start: one row per talk start, hide_legend", () => {
    const html = read("variants/start/index.html");

    assert.deepEqual(timeLabels("variants/start/index.html"), ["9:00", "9:30", "22:00"]);
    assert.doesNotMatch(html, /<h2[^>]*>Caption<\/h2>/);
  });

  test("show_alltimes: labels for all rows", () => {
    const labels = timeLabels("variants/alltimes/index.html");

    assert.deepEqual(labels.slice(0, 4), ["9:00", ":30", "10:00", ":30"]);
  });

  test("talk duration is exact, not rounded to program rows", () => {
    // Second Day: 09:00 - 09:40, i.e. three 15-minute rows
    assert.match(read("talks/second_day/index.html"), /<\/svg>40min/);
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

  test("rows carry their start for the line at the current time", () => {
    const table = read("program/index.html").split("</table>")[0];
    const times = [...table.matchAll(/<tr class="h-100" data-time="(\d+)">/g)].map(([, time]) => Number(time));

    // Friday 09:00 - 01:00 (+1 day), 09:00 Zurich = 08:00 UTC
    assert.equal(times.length, 64);
    assert.equal(times[0], utc(2026, 2, 20, 8));
    assert.equal(times[1], utc(2026, 2, 20, 8, 15));
    assert.equal(times.at(-1), utc(2026, 2, 20, 23, 45));
    assert.match(read("program/index.html"), /<div class="program-now bg-danger d-none" data-end="(\d+)" aria-hidden="true">/);
    assert.equal(Number(read("program/index.html").match(/class="program-now[^"]*" data-end="(\d+)"/)[1]), utc(2026, 2, 21, 0));
  });

  test("time_steps start: rows carry their start, also after midnight", () => {
    const table = read("variants/start/index.html").split("</table>")[0];
    const times = [...table.matchAll(/data-time="(\d+)"/g)].map(([, time]) => Number(time));

    assert.deepEqual(times, [utc(2026, 2, 20, 8), utc(2026, 2, 20, 8, 30), utc(2026, 2, 20, 21)]);
  });

  test("talk pages link to the main program page", () => {
    assert.match(read("talks/opening_welcome/index.html"), /href="\/conf\/program\/"/);
  });
});

describe("Line at the current time disabled", () => {
  let siteOff;

  before(() => {
    siteOff = buildSite("_config.now-line-off.yml");
  });

  test("program has neither the line nor row times", () => {
    const html = readFileSync(join(siteOff, "program/index.html"), "utf8");

    assert.doesNotMatch(html, /program-now|<tr[^>]*data-time|"nowline"/);
    assert.match(html, /live-show/);
  });
});

describe("Room order", () => {
  let siteByName;

  before(() => {
    siteByName = buildSite("_config.rooms-by-name.yml");
  });

  test("rooms follow their order, not the collection's", () => {
    const location = readFileSync(join(siteByName, "location/index.html"), "utf8");
    const rooms = [...location.matchAll(/href="[^"]*\/rooms\/(\w+)\/"/g)].map(([, room]) => room);

    assert.deepEqual([...new Set(rooms)], ["room_a", "room_b", "room_c"]);
  });
});

describe("App's tab bar with Live but without name_inactive", () => {
  let html;

  before(() => {
    html = readFileSync(join(buildSite("_config.pwa-live.yml"), "index.html"), "utf8");
  });

  test("keeps no tab free for Live, making room once live", () => {
    assert.deepEqual(pwaTabs(html), ["Program", "Talks", "Speakers", "Location (not live)", "Info (not live)", "Live (live)", "More (live)"]);
  });

  test("More lists the entries making room only while live", () => {
    const more = html.match(/id="navbar-pwa-more"[\s\S]*$/)[0];

    assert.match(more, /<div class="list-group list-group-flush live-show d-none" data-start="\d[^"]*" data-end="\d[^"]*">\s*<a[^>]*href="\/conf\/location\/"/);
    assert.match(more, /<div class="live-show d-none" data-start="\d[^"]*" data-end="\d[^"]*">\s*<h3[^>]*>Info<\/h3>/);
  });
});

describe("Hidden location page", () => {
  let siteHidden;

  before(() => {
    siteHidden = buildSite("_config.hidden-location.yml");
  });

  test("is a stand-in that is not indexed, without room links", () => {
    const html = readFileSync(join(siteHidden, "location/index.html"), "utf8");

    assert.match(html, /<meta name="robots" content="noindex">/);
    assert.match(html, new RegExp(`http-equiv="refresh" content="0; url=${BASEURL}/"`));
    assert.doesNotMatch(readFileSync(join(siteHidden, "program/index.html"), "utf8"), /href="[^"]*\/rooms\//);
  });
});

describe("Info bar and modal links", () => {
  let html;

  before(() => {
    html = readFileSync(join(buildSite("_config.info-links.yml"), "index.html"), "utf8");
  });

  test("bar shows link buttons in its color", () => {
    const bar = html.match(/<div class="alert alert-warning[\s\S]*?<\/div>\s*<\/div>/)[0];

    assert.match(bar, new RegExp(`<a\\s+class="btn btn-warning[^"]*"\\s+href="${BASEURL}/tickets/"`));
    assert.match(bar, /class="disabled btn btn-warning[^"]*"\s+href="#"\s+aria-disabled="true"/);
  });

  test("modal shows link buttons and menus in its footer instead of the close button", () => {
    const footer = html.match(/<div class="modal-footer">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/)[1];

    assert.match(footer, new RegExp(`<a\\s+class="btn btn-outline-primary[^"]*"\\s+href="${BASEURL}/program/"`));
    assert.match(footer, new RegExp(`id="infomodal1-dropdown1"[\\s\\S]*href="${BASEURL}/talks/"`));
    assert.doesNotMatch(footer, /data-bs-dismiss="modal"/);
  });
});

describe("Markup", () => {
  test("theme checks report no errors", () => {
    assert.doesNotMatch(read("index.html"), /There was an error when generating the site/);
  });

  test("theme checks report outdated icons, map and markup of the page", () => {
    const html = read("outdated/index.html");

    assert.match(html, /Unknown icon <code[^>]*>file-alt<\/code>/);
    assert.match(html, /<code[^>]*>map\.enable<\/code> is no longer supported/);
    assert.match(html, /Font Awesome[^<]*<code[^>]*>fas fa-<\/code>/);
    assert.match(html, /can only be included on pages with <code[^>]*>layout: location<\/code>/);
    assert.doesNotMatch(read("talks/opening_welcome/index.html"), /There was an error when generating the site/);
  });

  test("overview buttons link to the overview pages", () => {
    assert.match(read("talks/opening_welcome/index.html"), /<a href="\/conf\/talks\/" class="back-link btn/);
    assert.match(read("speakers/ada_lovelace/index.html"), /<a href="\/conf\/speakers\/" class="back-link btn/);
  });

  test("home page has no block elements in heading and no nested paragraphs", () => {
    const html = read("index.html");

    assert.doesNotMatch(html, /<h1[^>]*>(?:(?!<\/h1>)[\s\S])*<div/);
    assert.doesNotMatch(html, /<p(?:\s[^>]*)?>\s*<p[\s>]/);
  });

  test("pages do not connect to stream hosts before a stream is opened", () => {
    assert.doesNotMatch(read("index.html"), /rel="preconnect"[^>]*stream\.example\.org/);
  });

  test("location and room pages: room navigation above the title, rooms titled with their name", () => {
    for (const [path, title] of [["location/index.html", "Venue"], ["rooms/room_a/index.html", "Room A"]]) {
      const html = read(path).split("<main")[1];

      assert.deepEqual([...html.matchAll(/<h1[^>]*>([^<]*)<\/h1>/g)].map(([, text]) => text.trim()), [title], path);
      assert.ok(html.indexOf('aria-label="Room navigation"') < html.indexOf("<h1"), path);
      assert.doesNotMatch(html, /page-label/, path);
    }
  });

  test("navigation marks only the current section as active", () => {
    const html = read("program/index.html");
    const activeLinks = [...html.matchAll(/<a\s+class="nav-link active"\s+href="([^"]*)"/g)].map(([, href]) => href);

    assert.deepEqual([...new Set(activeLinks)], ["/conf/program/"]);
  });

  test("navigation marks the location as active on room pages", () => {
    const html = read("rooms/room_a/index.html");
    const activeLinks = [...html.matchAll(/<a\s+class="nav-link active"\s+href="([^"]*)"/g)].map(([, href]) => href);

    assert.deepEqual([...new Set(activeLinks)], ["/conf/location/"]);
  });

  test("file links resolve by their context, not by variables left over on the page", () => {
    const flyerLinks = {};
    for (const file of ["index.html", "program/index.html", "talks/index.html", "talks/opening_welcome/index.html", "speakers/index.html", "speakers/ada_lovelace/index.html", "rooms/room_a/index.html", "location/index.html"]) {
      flyerLinks[file] = [...new Set([...read(file).matchAll(/href="([^"]*flyer\.pdf)"/g)].map(([, href]) => href))];
    }

    // Navigation (top bar and PWA bottom bar)
    for (const [file, hrefs] of Object.entries(flyerLinks)) {
      assert.deepEqual(hrefs, ["/conf/documents/flyer.pdf"], file);
    }
    // Talk slides and speaker documents
    assert.match(read("talks/opening_welcome/index.html"), /href="\/conf\/documents\/slides\/opening\.pdf"/);
    assert.match(read("speakers/ada_lovelace/index.html"), /href="\/conf\/documents\/bio\/ada\.pdf"/);
  });

  test("program table has no interactive grid role", () => {
    assert.doesNotMatch(read("program/index.html"), /role="grid"/);
  });
});

describe("Accessibility", () => {
  // Cell of a talk in the program, e.g. programCell("Opening & Welcome")
  const programCell = (name) => {
    const html = read("program/index.html");
    const end = html.indexOf(name);
    return html.slice(html.lastIndexOf("<td rowspan", end), html.indexOf("</td>", end));
  };

  test("program cells name the time and track, not only by position and colour", () => {
    const cell = programCell("Opening &amp; Welcome");

    assert.match(cell, /<span class="visually-hidden">09:00–09:30, Main<\/span>/);
  });

  test("program cells and legend show the track icon", () => {
    const legend = read("program/index.html").split("Caption</h2>")[1];

    assert.match(programCell("Opening &amp; Welcome"), /program-talk-icon[\s\S]*class="bi bi-star-fill program-track-icon"/);
    assert.match(legend, /class="bi bi-star-fill me-1"[^]*?Main/);
  });

  test("track without icon reserves its space, without icon", () => {
    const cell = programCell("Talk with &quot;quotes&quot;");

    assert.match(cell, /program-talk-icon/);
    assert.doesNotMatch(cell, /program-track-icon/);
  });

  test("program rows name their full time for screen readers", () => {
    for (const path of ["program/index.html", "variants/alltimes/index.html"]) {
      const table = read(path).split("</table>")[0];
      const headers = [...table.matchAll(/<th scope="row"[^>]*>([\s\S]*?)<\/th>/g)].map(([, html]) => html.replace(/<[^>]+>/g, "").trim());

      assert.ok(headers.every((text) => /^\d{1,2}:\d{2}$/.test(text)), `${path}: ${headers.slice(0, 4)}`);
    }
  });

  test("program table has no spacer columns", () => {
    assert.doesNotMatch(read("program/index.html"), /program-space/);
  });

  test("headings do not skip levels", () => {
    for (const file of htmlFiles()) {
      const main = read(file).match(/<main[\s\S]*<\/main>/)?.[0] ?? "";
      const levels = [...main.matchAll(/<h([1-6])[\s>]/g)].map(([, level]) => Number(level));

      levels.forEach((level, i) => assert.ok(i === 0 || level <= levels[i - 1] + 1, `${file}: h${levels[i - 1]} followed by h${level}`));
    }
  });

  test("hidden talks and speakers produce complete pages that are not indexed", () => {
    for (const file of ["talks/hidden_talk/index.html", "speakers/hidden_person/index.html"]) {
      const html = read(file);

      assert.match(html, /<html lang="en">/);
      assert.match(html, /<title>[^<]+<\/title>/);
      assert.match(html, /<meta name="robots" content="noindex">/);
    }
  });

  test("talks in another language are marked as such", () => {
    assert.match(read("talks/late_night/index.html"), /<h1 lang="de"[^>]*>Late Night<\/h1>/);
    assert.match(programCell("Late Night"), /<a lang="de"[^>]*>Late Night<\/a>/);
  });
});

describe("Assets and privacy", () => {
  const html = () => read("talks/opening_welcome/index.html");

  test("theme bundles are versioned by their content hash, the site's files by build time", () => {
    assert.match(html(), /conference\.bundle\.css\?v=[0-9a-f]{10}"/);
    assert.match(html(), /conference\.bundle\.js\?v=[0-9a-f]{10}"/);
    assert.match(html(), /main\.css\?t=\d+"/);
  });

  test("icons are inline SVGs, not an icon font", () => {
    assert.match(html(), /<svg [^>]*class="bi bi-clock me-1" aria-hidden="true" focusable="false"/);
    assert.match(read("talks/talk_with_quotes/index.html"), /class="bi bi-camera-video-off-fill"/);
    for (const file of htmlFiles()) {
      assert.doesNotMatch(read(file), /<i class="bi /, file);
    }
  });

  test("Leaflet styles are loaded with the map only", () => {
    assert.doesNotMatch(html(), /map\.bundle\.css/);
    assert.match(read("location/index.html"), /data-map-css="\/conf\/assets\/css\/map\.bundle\.css\?v=[0-9a-f]{10}"/);
  });

  test("videos and streams are not embedded before consent", () => {
    for (const file of ["talks/opening_welcome/index.html", "live/index.html"]) {
      assert.doesNotMatch(read(file), /<iframe[^>]* src="http/, file);
    }
    assert.match(read("live/index.html"), /data-embed-src="https:\/\/stream\.example\.org\/a"/);
    assert.match(read("live/index.html"), /<a href="https:\/\/stream\.example\.org\/a" rel="noopener" data-embed-host>stream\.example\.org<\/a>/);
    assert.match(read("talks/opening_welcome/index.html"), /data-href="https:\/\/media\.example\.org\/embed\/interview"\s+data-click-to-load="false"/);
  });
});
