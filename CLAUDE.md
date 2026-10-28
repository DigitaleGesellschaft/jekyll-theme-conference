# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Jekyll theme distributed as a Ruby gem (`jekyll-theme-conference`). Content (talks, speakers, rooms) lives in the *consuming* site as Jekyll collections; the schedule lives in the consuming site's `_data/program.yml`. This repo has no `_config.yml` and no content, so it cannot be served on its own.

User-facing documentation for every config option is in `README.md`; breaking changes v3→v4 in `UPGRADE_GUIDE.md`. Update both when adding or changing options.

## Commands

```bash
npm install          # once
npm run build        # Vite: build JS/CSS bundles + copy Sass/fonts (required before any Jekyll build)
npm run dev          # Vite dev server
gem build *.gemspec  # package the gem (run npm run build first)
```

Tests build the fixture site `test/fixture/` (edge cases: quotes/markup in names, overnight talks, hidden entries, live, PWA, map) and run in CI (`.github/workflows/test.yml`):

```bash
(cd test/fixture && bundle install)  # once
npm test                             # node:test: generated output (build.test.js), style setups (styles.test.js, extra builds via _config.style-*.yml), unit tests (unit/)
npm run test:e2e                     # Playwright (test/e2e/), serves the build via test/support/serve.js
node --test --test-name-pattern="site.json" test/build.test.js   # single test
npx playwright test test/e2e/map.spec.js                          # single spec; SKIP_BUILD=1 reuses last build
uv run --no-project --with-requirements _tools/requirements.txt python -m unittest discover test/tools
```

Env: `BUNDLE` overrides the bundler command (e.g. `"bundle _2.7.1_"`), `SITE_DIR` the build output dir. Builds run with `TZ=UTC` to prove timestamps depend only on the site's `timezone`.

Releases: push a `v*` tag → `.github/workflows/publish.yml` builds and pushes the gem to RubyGems and creates a GitHub release. Bump the version in both `package.json` and `jekyll-theme-conference.gemspec`.

## Architecture

### Build output is gitignored but shipped in the gem

`npm run build` (see `vite.config.js`) produces files listed in `.gitignore` that the gemspec explicitly globs back in:

- `_js/main.js` → `assets/js/conference.bundle.js` (Leaflet split into a lazy chunk)
- `_css/main.scss` → `assets/css/conference.bundle.css` (with Bootstrap)
- `_css/main-only.scss` → `assets/css/conference-only.bundle.css` (without Bootstrap)
- `copyAssetsPlugin` copies `_css/*.scss` and Bootstrap/Icons/Leaflet sources from `node_modules` into `_sass/` (`main.scss` becomes `_sass/conference.scss`), and icon fonts into `assets/webfonts/`.

Edit sources in `_js/` and `_css/`; never edit `_sass/` or `*.bundle.*`. `_sass/` exists so consumers with `conference.custom_style: "full"` can recompile Bootstrap with their own variables. `custom_style` (`none` / `bootstrap` / `full`) selects which stylesheet `_includes/header.html` links.

### Liquid → JSON → JavaScript

The JS has no build-time knowledge of site data. Three Liquid-rendered JSON endpoints bridge it:

- `assets/js/config.json` (layout `json-config`): per-module settings and translated strings
- `assets/js/data.json` (layout `json-data`): days/rooms/talks for live streaming
- `assets/js/site.json` (layout `json-site`): used by the PWA service worker (`_layouts/sw.js`)

`_js/init.js` fetches `config.json` and calls `module.init(config[name], config.lang[name])` on every module attached to `window.conference`. A new JS module must be attached in `_js/main.js` and, if configurable, get a matching key (and `lang` entry) in `_layouts/json-config.html`. Modules are factories (`createXModule()`) in `_js/modules/`. `assets/js/main.js` is a stub for consumers' own code.

### Liquid includes as functions

Liquid has no functions, so `_includes/get_*.html` act as such: they read variables set by the caller (e.g. `t` for a talk, `d` for a day) and set output variables via `assign` (e.g. `get_talk_time.html` sets `talk_start_hour`, `talk_duration_min`, …). Read an include to learn its implicit inputs/outputs before calling it. `show_*`/`list_*` render markup; `schema_*` emit Schema.org JSON-LD.

Escape content-derived strings (talk/speaker/room/track/tag names) with `| escape` in HTML and `| jsonify` in JSON; in JSON-LD additionally `| replace: "<", "\u003c"` so content cannot close the `<script>`. In JS, build DOM with `textContent`, never `innerHTML` with data from `data.json`.

Settings are read from both `site.conference.*` (`_config.yml`) and page Front Matter (v4 moved main/program settings to Front Matter); `get_*_config.html` includes resolve these.

### Translations

`_data/lang.yml` holds all UI strings for `en`, `de`, `fr`, `pt`, with a `version` key. `_includes/checks.html` warns site owners when their copy's version differs. Bump `version` in both `lang.yml` and `checks.html` when adding/changing keys, and add the key to every language.

### `_tools/`

Not part of the gem. Scripts and workflow templates for consuming sites: `import_schedule.py` (frab/pretalx JSON → collections + `program.yml`), `import_resources.py`, and example GitHub workflows (`build.yml`, `test.yml`, `schedule.yml`).
