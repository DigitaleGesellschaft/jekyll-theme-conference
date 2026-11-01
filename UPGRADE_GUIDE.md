# Upgrade Guide

This guide covers the essential changes needed to upgrade between major versions: [v4 to v5](#upgrade-from-v4-to-v5) and [v3 to v4](#upgrade-from-v3-to-v4).

For detailed documentation, see the [README](README.md).


## Upgrade from v4 to v5

### New Checks

With `show_errors`, the theme now also reports leftovers of v3: icons that are no [Bootstrap Icons](https://icons.getbootstrap.com/) (e.g. Font Awesome's `file-alt`, which render nothing), `map.enable` and Font Awesome markup in content (e.g. `<i class="fas fa-video"></i>`).

**Action:**
- Fix the reported leftovers, see [Icons](#icons) and [Map & Location Configuration](#map--location-configuration).


## Upgrade from v3 to v4

The major update includes **Bootstrap 5 migration** and **configuration restructuring** where many settings moved from `_config.yml` to page Front Matter.

> [!CAUTION]
> This is a major version upgrade. Test thoroughly before deploying to production.


### Quick Overview

**Major Changes:**
- Bootstrap 4 → Bootstrap 5 (CSS classes and JavaScript APIs changed)
- Configuration moved from `_config.yml` to page Front Matter
- New features: PWA support, dark mode, Schema.org structured data

**Action Required:**
- Update theme version
- Move configurations
- Update Bootstrap syntax in custom code
- Replace Font Awesome icon names
- Update custom JavaScript and styles

### Critical Breaking Changes

#### Bootstrap 5 Upgrade

See the official [Bootstrap migration guide](https://getbootstrap.com/docs/5.3/migration/) for any custom CSS/JavaScript in your layout.

**Action:**
- Review custom CSS/JavaScript for Bootstrap 4 classes and update accordingly.

#### Main Landing Page

**Change required:**
```yaml
# index.md
layout: home  # was: layout: main

# The following attributes are now defined in the page's Front Matter instead of in _config.yml
header:
  img: "main_logo.png"
  img_dark: "main_logo_dark.png"  # new, optional

links:
  - name: Program
    relative_url: /program/
```

**Action:**
- Move `conference.main` from `_config.yml` to page's Front Matter.

#### Information Boxes

**Rename and restructure:**
```yaml
# _config.yml
conference:
  info:  # was: info_bars
    bars:
      - title: Sold Out!
        color: danger  # was: alert
        dismissal_days: 7  # new, optional, default: 7
        text: "Message here"
```

**Action:**
- Rename `info_bars` → `info.bars`
- Change `color: alert` → `color: danger`

#### Map & Location Configuration

**Move to location page:**
```yaml
# location/index.md
layout: location
title: Conference Venue

# The following attributes are now defined in the page's Front Matter instead of in _config.yml
map:
  default_zoom: 17
  home_coord: 47.37808, 8.53935
  map_provider: "OpenStreetMap.Mapnik"
postal_address:
  name: "Venue Name"
  street: "Street Address"
  locality: "City"
  postal_code: "12345"
  country: "CH"
---
```

**Action:**
- Move `conference.map` and `conference.location` from `_config.yml` to page's Front Matter.
- If you specify an address, add it via dedicated `postal_address` attributes to page's Front Matter.
- `CartoDB.*` map providers now require an API key, which the theme cannot pass; `OpenFireMap` was removed. Switch to another `map_provider`.
- Remove `map.enable`: a location page with `map` shows the map.
- To hide the location and room links (was: `conference.location.hide: true`), create a location page with `hide: true`, even if your site had none.

> [!WARNING]
> From version 4 onward, only pages with `layout: location` support embedded maps.

#### Program Settings

**Move to program page:**
```yaml
# program/index.md
---
layout: program
time_steps: 15
show_alltimes: true
---
```

**Action:**
- Move `conference.program` settings from `_config.yml` to page's Front Matter.

#### Link Preview

**Restructure:**
```yaml
# _config.yml
conference:
  meta:  # new parent
    link_preview:
      disable: false
      img:
        twitter: "twitter_preview.png"
        open_graph: "facebook_preview.png"
```

**Action:**
- Move `link_preview` under `meta.link_preview`.

#### Timezone

The theme now uses Jekyll's `timezone` setting (an IANA name, daylight saving time aware) instead of `conference.tz` (a fixed offset). Without it, times depend on the machine building the site.

```yaml
# _config.yml
timezone: Europe/Zurich  # was: conference.tz: "+01:00"
```

**Action:**
- Replace `conference.tz` (or a top-level `tz`) with `timezone`.

#### Icons
[Font Awesome](https://fontawesome.com/) was replaced by [Bootstrap Icons](https://icons.getbootstrap.com/). Unknown icon names show no icon; from v5 on, `show_errors` reports them.

| Font Awesome (v3) | Bootstrap Icons (v4) |
|-------------------|----------------------|
| `file-alt`        | `file-earmark-text`  |
| `video`           | `camera-video-fill`  |
| `video-slash`     | `camera-video-off-fill` |
| `train`           | `train-front`        |
| `bus`             | `bus-front`          |
| `landmark`, `industry` | `building`      |

The icon font is not loaded either: the theme renders the icons it uses as inline SVGs. If your own content, layouts, or JavaScript use an icon font (e.g. `<i class="bi bi-train-front"></i>`, or `fas fa-train` of v3), add the Bootstrap Icons font to `assets/css/main.scss` (see README, section _Icons_), or use `{% include icon.html name="train-front" %}`. In JavaScript, the include only works in a file with Front Matter, e.g. `assets/js/icons.js`:

```js
---
---
export const TRAIN = '{% include icon.html name="train-front" %}';
```

**Action:**
- Replace Font Awesome names in `icon:` of links and tags (`_config.yml`, talks, speakers) and in your own code.

#### Custom JavaScript

The theme's JavaScript is a bundle of its own now, loaded before `assets/js/main.js` (an ES module).

```javascript
// assets/js/main.js: no Front Matter, no {% include js/conference.js %}
window.conference.awaitReady().then(async () => {
    const map = await window.conference.map.getMap();  // was: getMap() without await
    if (map) {  // was: typeof map !== 'undefined'
        // ...
    }
});
```

**Action:**
- Remove the Front Matter and `{% include js/conference.js %}` from `assets/js/main.js`.
- Await `getMap()`: it returns a promise, resolving once the visitor loaded the map (or with `null` without map).

#### Custom Styles

Bootstrap variables can no longer be set in `assets/css/main.scss` before importing the theme.

```scss
// _sass/bootstrap-variables.scss (was: in assets/css/main.scss)
$green: #4ea93f;
$primary: $green;
```
```scss
// assets/css/main.scss
---
---

@use "conference";  // was: @import "conference";

// Custom styles
```

**Action:**
- Set `conference.custom_style: "full"` and move Bootstrap variables to `_sass/bootstrap-variables.scss` (see README, section _Design_).
- Replace `@import "conference"` with `@use "conference"`, remove `$fa-font-path`.
- Bootstrap's mixins are no longer in scope unprefixed (e.g. `@include media-breakpoint-only(lg)`): replace them with plain media queries, e.g. `@media (min-width: 992px) and (max-width: 1199.98px)`.

#### Removed Settings

Remove from `_config.yml` if present:
- `conference.live.demo`
- `conference.speakers.show_firstname`
- `conference.talks.hide_icons`
- `conference.talks.hide_link_icons`

> [!WARNING]
> From version 4 onward, none of these settings are supported anymore.

### Optional New Features

#### Progressive Web App (PWA)
Enable support to let the user install your conference website as a standalone app:
```yaml
conference:
  pwa:
    enable: true
    theme_color: "#0d6efd"
```
Create `manifest.json` and `sw.js` with their respective layouts.

#### Information Modals
Add modal dialogs in addition to info bars:
```yaml
conference:
  info:
    modals:
      - title: Important Announcement
        text: "Modal content"
```

#### Schema.org Structured Data
Enhanced SEO by adding structured schema.org data:
```yaml
conference:
  meta:
    schema_org:
      event_status: "scheduled"
      organizer:
        name: "Your Organization"
        url: "https://example.com"
```

#### Dark Mode
Automatic support based on system preferences. Optionally add `img_dark` for logos.

#### Privacy: Map, Videos & Streams
The map, embedded videos (links with `video:` or `iframe: true`) and live streams are only loaded once the visitor clicks a button, as their provider receives the visitor's IP address. To load self-hosted content right away, set `click_to_load: false` in the respective place:
```yaml
# location/index.md (Front Matter)
map:
  click_to_load: false
```
```yaml
# _config.yml
conference:
  live:
    streaming:
      click_to_load: false
```
```yaml
# _talks/example.md
links:
  - name: Recording
    video: https://media.example.org/embed/example
    click_to_load: false
```
