/**
 * Several editions of a conference in one site (`conference.editions`,
 * fixture test/fixture-editions/): 2026 is current, 2025 an archive, both
 * with a speaker "Ada Lovelace" and a room "Main Hall"
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { before, describe, test } from "node:test";
import { BASEURL, EDITIONS_DIR, buildSite } from "./support/build.js";

const EDITIONS = ["2026", "2025"];

// Folder of the speaker overview: 2025 has it elsewhere
const SPEAKERS = { 2026: "speakers", 2025: "people" };

const sites = {};

const read = (site, path) => readFileSync(join(site, path), "utf8");
const readJson = (site, path) => JSON.parse(read(site, path));
const hrefs = (html) => [...html.matchAll(/href="([^"]*)"/g)].map(([, href]) => href);

const htmlFiles = (site, dir = site) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return htmlFiles(site, path);
    }
    return entry.name.endsWith(".html") ? [relative(site, path)] : [];
  });

before(() => {
  sites.main = buildSite(undefined, EDITIONS_DIR);
  sites.current2025 = buildSite("_config.current-2025.yml", EDITIONS_DIR);
  sites.missing = buildSite("_config.missing-edition.yml", EDITIONS_DIR);
  sites.hiddenLocation = buildSite("_config.hidden-location.yml", EDITIONS_DIR);
  sites.outdated = buildSite("_config.outdated.yml", EDITIONS_DIR);
});

describe("editions", () => {
  test("every page lives under its edition, but the root and the page not found", () => {
    const shared = ["index.html", "404.html"];
    const outside = htmlFiles(sites.main).filter((file) => !shared.includes(file) && !EDITIONS.some((id) => file.startsWith(`${id}/`)));

    assert.deepEqual(outside, []);
  });

  test("root forwards to the first edition when none is marked current", () => {
    assert.match(read(sites.main, "index.html"), new RegExp(`http-equiv="refresh" content="0; url=${BASEURL}/2026/"`));
  });

  test("root forwards to the first edition marked current", () => {
    assert.match(read(sites.current2025, "index.html"), new RegExp(`url=${BASEURL}/2025/"`));
  });

  test("builds without errors", () => {
    const failing = htmlFiles(sites.main).filter((file) => read(sites.main, file).includes("alert-danger"));

    assert.deepEqual(failing, []);
  });

  for (const id of EDITIONS) {
    const other = EDITIONS.find((e) => e !== id);

    test(`${id}: program, talks and speakers link only within the edition`, () => {
      for (const page of ["program", "talks", SPEAKERS[id], "speakers/ada_lovelace", "rooms/main_hall"]) {
        const html = read(sites.main, `${id}/${page}/index.html`);
        const foreign = hrefs(html).filter((href) => href.startsWith(`${BASEURL}/${other}/`) && href !== `${BASEURL}/${other}/`);

        assert.deepEqual(foreign, [], page);
      }
    });

    test(`${id}: shared speaker lists the edition's talk`, () => {
      const html = read(sites.main, `${id}/speakers/ada_lovelace/index.html`);

      assert.ok(hrefs(html).includes(`${BASEURL}/${id}/talks/keynote/`));
      assert.match(html, new RegExp(`Keynote ${id}`));
    });

    test(`${id}: navigation and files resolve to the edition`, () => {
      const talk = read(sites.main, `${id}/talks/keynote/index.html`);

      assert.ok(hrefs(talk).includes(`${BASEURL}/${id}/program/`));
      assert.ok(hrefs(talk).includes(`${BASEURL}/${id}/documents/slides/keynote.pdf`));
      assert.match(talk, new RegExp(`class="navbar-brand order-0" href="${BASEURL}/${id}/">Edition Conference ${id}<`));
    });
  }

  test("overview buttons link to the edition's overview pages, wherever they are", () => {
    for (const id of EDITIONS) {
      assert.ok(hrefs(read(sites.main, `${id}/talks/keynote/index.html`)).includes(`${BASEURL}/${id}/talks/`), id);
      assert.ok(hrefs(read(sites.main, `${id}/speakers/ada_lovelace/index.html`)).includes(`${BASEURL}/${id}/${SPEAKERS[id]}/`), id);
    }
  });

  test("rooms follow their order, else the program", () => {
    const rooms = (id) => hrefs(read(sites.main, `${id}/location/index.html`)).filter((href) => href.includes("/rooms/"));

    assert.deepEqual([...new Set(rooms("2025"))], [`${BASEURL}/2025/rooms/main_hall/`, `${BASEURL}/2025/rooms/annex/`]);
  });

  test("a hidden location page is a stand-in that is not indexed", () => {
    const html = read(sites.hiddenLocation, "2025/location/index.html");

    assert.match(html, /<meta name="robots" content="noindex">/);
    assert.match(html, new RegExp(`http-equiv="refresh" content="0; url=${BASEURL}/2025/"`));
    assert.doesNotMatch(read(sites.hiddenLocation, "2025/program/index.html"), /href="[^"]*\/rooms\//);
    assert.doesNotMatch(read(sites.hiddenLocation, "2026/location/index.html"), /noindex/);
  });

  test("warns about unknown icons in the config", () => {
    const html = read(sites.outdated, "2026/index.html");

    assert.match(html, /Unknown icon <code[^>]*>video-slash<\/code>/);
    assert.match(html, /Unknown icon <code[^>]*>file-alt<\/code>/);
  });

  test("service worker skips every edition's documents", () => {
    assert.match(read(sites.main, "sw.js"), /\["\/2026\/documents\/","\/2025\/documents\/"\]/);
  });

  test("inline config names the page's edition", () => {
    const config = (id) => JSON.parse(read(sites.main, `${id}/index.html`).match(/id="conference-config">([\s\S]*?)<\/script>/)[1]);

    assert.equal(config("2026").edition, "2026");
    assert.equal(config("2026").edition_current, true);
    assert.equal(config("2025").edition, "2025");
    assert.equal(config("2025").edition_current, false);
  });

  test("tracks are configurable per edition", () => {
    assert.match(read(sites.main, "2026/talks/keynote/index.html"), /bg-info-subtle/);
    assert.match(read(sites.main, "2025/talks/keynote/index.html"), /bg-warning-subtle/);
  });

  test("an edition replaces settings by sub-setting", () => {
    const current = read(sites.main, "2026/index.html");
    const past = read(sites.main, "2025/index.html");

    assert.match(current, />Speakers</);
    assert.doesNotMatch(past, />Speakers</);
    assert.match(past, />Archived Program</);
    assert.match(past, /Edition Logo/);
  });

  test("switcher lists all editions, by name if given", () => {
    const html = read(sites.main, "2025/index.html");
    const menu = html.match(/id="navbar-dropdown0"[\s\S]*?<div class="dropdown-menu">([\s\S]*?)<\/div>/)[1];

    assert.deepEqual(hrefs(menu), [`${BASEURL}/2026/`, `${BASEURL}/2025/`]);
    assert.match(menu, /aria-current="true">\s*Archive 2025/);
  });

  test("switcher shows the edition at the end of the navbar", () => {
    const html = read(sites.main, "2026/index.html");

    assert.match(html, /<\/ul>\s*<ul class="navbar-nav">\s*<li class="nav-item dropdown">\s*<a [^>]*id="navbar-editions"[^>]*aria-label="Edition: 2026">\s*2026\s*<\/a>/);
    assert.match(html, /id="navbar-editions"[\s\S]*?<div class="dropdown-menu dropdown-menu-end">/);
  });

  test("a link with menu: editions places the switcher, named by navigation.editions.name", () => {
    const html = read(sites.main, "2025/index.html");

    assert.match(html, /<ul class="navbar-nav me-auto">\s*<li class="nav-item dropdown">\s*<a [^>]*id="navbar-dropdown0"[^>]*>\s*Years\s*<\/a>/);
    assert.doesNotMatch(html, /navbar-editions|dropdown-menu-end/);
  });

  test("the link's name wins over navigation.editions.name", () => {
    const html = read(sites.main, "2025/index.html");
    const menu = html.match(/id="main-dropdown0"[\s\S]*?<div class="dropdown-menu">([\s\S]*?)<\/div>/)[1];

    assert.match(html, /id="main-dropdown0"[^>]*>\s*Other Editions\s*<\/a>/);
    assert.deepEqual(hrefs(menu), [`${BASEURL}/2026/`, `${BASEURL}/2025/`]);
  });

  test("installed app shows the switcher only where a link places it", () => {
    const pwaNavbar = (path) => read(sites.main, path).match(/<nav class="navbar[^"]*navbar-pwa[\s\S]*?<\/nav>/)[0];

    assert.doesNotMatch(pwaNavbar("2026/index.html"), /data-bs-toggle="offcanvas"/);
    assert.match(pwaNavbar("2025/index.html"), /data-bs-target="#navbar-pwa-sheet0"[\s\S]*?<span>Years<\/span>/);
    assert.match(read(sites.main, "2025/index.html"), /id="navbar-pwa-sheet0"[\s\S]*?href="\/conf\/2026\/"/);
  });

  test("switcher can be hidden", () => {
    assert.doesNotMatch(read(sites.current2025, "2025/index.html"), /navbar-editions/);
  });

  test("no edition shows an archive notice", () => {
    assert.doesNotMatch(read(sites.main, "2026/index.html"), /alert-secondary/);
    assert.doesNotMatch(read(sites.main, "2025/index.html"), /alert-secondary/);
  });

  test("live features are limited to the current edition", () => {
    assert.match(read(sites.main, "2026/program/index.html"), /id="stream-modal"/);
    assert.match(read(sites.main, "2026/program/index.html"), /class="program-now bg-warning d-none"/);
    assert.doesNotMatch(read(sites.main, "2025/program/index.html"), /id="stream-modal"|live-show|program-now|"nowline"/);
  });

  test("live links lead to the current edition's live page", () => {
    assert.match(read(sites.main, "2026/program/index.html"), /<a\s+class="nav-link"\s+href="\/conf\/2026\/live\/"/);
    assert.match(read(sites.current2025, "2025/program/index.html"), /<a\s+class="nav-link"\s+href="\/conf\/2025\/live\/"/);
  });

  test("past editions' live page shows no stream", () => {
    const live = read(sites.main, "2025/live/index.html");

    assert.doesNotMatch(live, /id="stream"/);
    assert.match(live, /The live stream has ended\./);
  });

  test("install toast is limited to the current edition", () => {
    assert.match(read(sites.main, "2026/program/index.html"), /id="pwa-install-toast"[\s\S]*id="pwa-install"/);
    assert.doesNotMatch(read(sites.main, "2025/program/index.html"), /pwa-install/);
    assert.match(read(sites.main, "2025/program/index.html"), /id="pwa-update-toast"/);
  });

  // iOS adds any page to the home screen: archives link the manifest too,
  // so the app starts at the current edition, not at the archive
  test("app is the same from every edition", () => {
    for (const path of ["2026/program/index.html", "2025/program/index.html"]) {
      assert.match(read(sites.main, path), /rel="manifest"[\s\S]*apple-mobile-web-app-capable/);
    }
  });

  test("data.json, site.json and manifest serve the current edition", () => {
    const data = readJson(sites.main, "assets/js/data.json");
    const { pages } = readJson(sites.main, "assets/js/site.json");
    const manifest = readJson(sites.main, "manifest.json");

    assert.equal(data.talks["Main Hall"][0].name, "Keynote 2026");
    assert.equal(data.speakers["Ada Lovelace"].href, `${BASEURL}/2026/speakers/ada_lovelace/`);
    assert.deepEqual(pages.filter((url) => url.startsWith(`${BASEURL}/2025/`)), []);
    assert.ok(pages.includes(`${BASEURL}/2026/talks/keynote/`));
    assert.equal(manifest.shortcuts[0].url, `${BASEURL}/2026/program/`);
  });

  // Installed apps follow the current edition: same identity and start
  // (the root, forwarding to the current edition) and a name without year
  test("app is the same for every edition", () => {
    const manifest = readJson(sites.main, "manifest.json");
    const manifest2025 = readJson(sites.current2025, "manifest.json");

    for (const m of [manifest, manifest2025]) {
      assert.equal(m.id, `${BASEURL}/`);
      assert.equal(m.start_url, `${BASEURL}/`);
      assert.equal(m.name, "Edition Conference");
    }
    assert.match(read(sites.main, "2026/index.html"), /apple-mobile-web-app-title" content="Edition Conference"/);
  });

  test(".htaccess forwards other addresses to the current edition", () => {
    const htaccess = read(sites.main, ".htaccess");

    // Root page, e.g. / and /index.html -> /2026/
    assert.ok(htaccess.includes(`\nRewriteRule ^(index\\.html)?$ ${BASEURL}/2026/ [R=302,L]\n`));

    // Files as they are, pages with their trailing slash
    assert.match(htaccess, new RegExp(`^RewriteCond %\\{DOCUMENT_ROOT\\}${BASEURL}/2026/\\$1 -f$`, "m"));
    assert.match(htaccess, new RegExp(`^RewriteRule \\^\\(\\.\\*\\)\\$ ${BASEURL}/2026/\\$1 \\[R=302,L\\]$`, "m"));
    assert.match(htaccess, new RegExp(`^RewriteCond %\\{DOCUMENT_ROOT\\}${BASEURL}/2026/\\$1/index\\.html -f$`, "m"));
    assert.match(htaccess, new RegExp(`^RewriteRule \\^\\(\\.\\*\\?\\)/\\?\\$ ${BASEURL}/2026/\\$1/ \\[R=302,L\\]$`, "m"));
    assert.doesNotMatch(htaccess, / -d$/m);
    assert.match(htaccess, new RegExp(`^ErrorDocument 404 ${BASEURL}/404.html$`, "m"));
    const htaccess2025 = read(sites.current2025, ".htaccess");
    assert.match(htaccess2025, new RegExp(`RewriteRule .* ${BASEURL}/2025/\\$1 `));
    assert.ok(htaccess2025.includes(`\nRewriteRule ^(index\\.html)?$ ${BASEURL}/2025/ [R=302,L]\n`));
  });

  test("warns about entries without edition", () => {
    assert.match(read(sites.missing, "2026/index.html"), /Some talks, speakers or rooms have no <code[^>]*>edition<\/code>/);
  });

  test("warns about entries and pages in another edition's folder", () => {
    assert.match(read(sites.missing, "2026/index.html"), /Some talks, speakers or rooms lie in the folder of another edition, e.g. <code[^>]*>_talks\/2025\//);
    assert.match(read(sites.missing, "2025/index.html"), /This page lies in the folder of the edition <code[^>]*>2025<\/code>/);
    assert.doesNotMatch(read(sites.main, "2025/index.html"), /folder of (another|the) edition/);
  });
});
