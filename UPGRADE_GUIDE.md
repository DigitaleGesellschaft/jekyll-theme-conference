# Upgrade Guide

This guide covers the essential changes needed to upgrade from v3.x to v4.0. The major update includes **Bootstrap 5 migration** and **configuration restructuring** where many settings moved from `_config.yml` to page Front Matter.

For detailed documentation, see the [README](README.md).

> [!CAUTION]
> This is a major version upgrade. Test thoroughly before deploying to production.


## Quick Overview

**Major Changes:**
- Bootstrap 4 → Bootstrap 5 (CSS classes and JavaScript APIs changed)
- Configuration moved from `_config.yml` to page Front Matter
- New features: PWA support, dark mode, Schema.org structured data

**Action Required:**
- Update theme version
- Move configurations
- Update Bootstrap syntax in custom code

## Critical Breaking Changes

### Bootstrap 5 Upgrade

See the official [Bootstrap migration guide](https://getbootstrap.com/docs/5.3/migration/) for any custom CSS/JavaScript in your layout.

**Action:**
- Review custom CSS/JavaScript for Bootstrap 4 classes and update accordingly.

### Main Landing Page

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

### Information Boxes

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

### Map & Location Configuration

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

> [!WARNING]
> From version 4 onward, only pages with `layout: location` support embedded maps.

### Program Settings

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

### Link Preview

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

### Removed Settings

Remove from `_config.yml` if present:
- `conference.live.demo`
- `conference.speaker.show_firstname`
- `conference.talks.hide_icons`
- `conference.talks.hide_link_icons`

> [!WARNING]
> From version 4 onward, none of these settings are supported anymore.

## Optional New Features

### Progressive Web App (PWA)
Enable support to let the user install your conference website as a standalone app:
```yaml
conference:
  pwa:
    enable: true
    theme_color: "#0d6efd"
```
Create `manifest.json` and `sw.js` with their respective layouts.

### Information Modals
Add modal dialogs in addition to info bars:
```yaml
conference:
  info:
    modals:
      - title: Important Announcement
        text: "Modal content"
```

### Schema.org Structured Data
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

### Dark Mode
Automatic support based on system preferences. Optionally add `img_dark` for logos.
