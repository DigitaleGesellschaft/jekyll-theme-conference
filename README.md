# jekyll-theme-conference

![Screenshot](screenshot.png)

This is a responsive [Jekyll](http://jekyllrb.com) theme based on [Bootstrap 5](http://getbootstrap.com) for conferences. It contains

- multiday program / schedule,
- talk and speaker descriptions,
- maps for directions,
- real-time indications during the conference,
- support for embedded video streaming or recordings
- support for an all offline progressive web app, and
- automatic dark mode support based on system preferences.

All components such as talks, speakers or rooms are represented as collection of files. The schedule is defined via a simple structure stored in a [YAML](https://en.wikipedia.org/wiki/YAML) file. There is no need for databases and once generated the website consists only of static files. A script and workflows are available for easy import, e.g., of [frab](https://github.com/frab/frab/wiki/Manual#introduction) compatible schedules.
The design is easily customizable and is adapted for mobile uses and printing.

The theme was created for the yearly Winterkongress conference of the [Digital Society Switzerland](https://digitale-gesellschaft.ch/). You can see this theme active here:

- [Demo: Winterkongress](https://digitale-gesellschaft.ch/kongress/)


## Table of Contents

- [Installation](#installation)
  - [Gem-based Method](#gem-based-method)
  - [Remote Theme Method](#remote-theme-method)
- [Setup](#setup)
  - [Jump Start](#jump-start)
  - [Automatic Import](#automatic-import)
  - [Automatic Build](#automatic-build)
- [Configuration](#configuration)
  - [Theme Verification](#theme-verification)
  - [Collection URLs](#collection-urls)
  - [Language](#language)
  - [Timezone](#timezone)
  - [Navigation Bar](#navigation-bar)
  - [Meta Data for Search Engines and Link Previews](#meta-data-for-search-engines-and-link-previews)
  - [Main Landing Page](#main-landing-page)
  - [Information Boxes](#information-boxes--modals)
  - [Live Indications & Streaming](#live-indications--streaming)
  - [Progressive Web App (PWA)](#progressive-web-app-pwa)
  - [Talk Settings](#talk-settings)
  - [Speaker Settings](#speaker-settings)
  - [Location Settings](#location-settings)
  - [Program Settings](#program-settings)
- [Content](#content)
  - [Schedule / Program](#schedule--program)
  - [Talks](#talks)
  - [Speakers](#speakers)
  - [Rooms](#rooms)
  - [Links](#links)
- [Overview Pages](#overview-pages)
  - [Location / Room Overview](#location--room-overview)
  - [Live Stream Overview](#live-stream-overview)
  - [Additional Pages](#additional-pages)
- [Design](#design)
- [JavaScript](#javascript)
- [Development](#development)
  - [Jekyll Theme Development](#jekyll-theme-development)
  - [JavaScript Development](#javascript-development)
- [License](#license)

## Installation

There are three ways to install: As a [Gem-based theme](https://jekyllrb.com/docs/themes/#understanding-gem-based-themes), as a [remote theme](https://github.blog/2017-11-29-use-any-theme-with-github-pages/) (GitHub Pages compatible), or by cloning/forking this repository and reference to it directly.

### Gem-based Method

With Gem-based themes, directories such as the `assets`, `_layouts`, and `_includes` are stored in the theme's gem, hidden from your immediate view. Yet all the necessary directories will be read and processed during Jekyll's build process.

This allows for easier installation and updating as you don't have to manage any of the theme files. To install:

1. Add the following to your `Gemfile`:

   ```ruby
   gem "jekyll-theme-conference"
   ```

2. Fetch and update bundled gems by running the following [Bundler](http://bundler.io/) command:

   ```bash
   bundle
   ```

3. Set the `theme` in your project's Jekyll `_config.yml` file:

   ```yaml
   theme: jekyll-theme-conference
   ```

4. Continue with the _Setup_ section further below to customize the theme and add some content for your conference

To update the theme run `bundle update`.

### Remote Theme Method

Remote themes are similar to Gem-based themes, but do not require `Gemfile` changes or whitelisting making them ideal for sites hosted with GitHub Pages.

To install:

1. Create/replace the contents of your `Gemfile` with the following:

   ```ruby
   source "https://rubygems.org"

   gem "github-pages", group: :jekyll_plugins
   gem "jekyll-include-cache", group: :jekyll_plugins
   ```

2. Add `jekyll-include-cache` to the `plugins` array of your `_config.yml`.

3. Fetch and update bundled gems by running the following [Bundler](http://bundler.io/) command:

   ```bash
   bundle
   ```

4. Add `remote_theme: "DigitaleGesellschaft/jekyll-theme-conference@v3.6.3"` to your `_config.yml` file. Remove any other `theme:` or `remote_theme:` entry.

5. Continue with the _Setup_ section further below to customize the theme and add some content for your conference

## Setup

The different talks, speakers and rooms are stored as a collection of files. Each file contains a small header in form of a YAML block (called [FrontMatter](https://jekyllrb.com/docs/front-matter/)) used to store additional information beside a description. Their exact use and meaning is described further below in the section _Content_. Additional configuration options can be found in the section _Configuration_.

The schedule defining when and in which room a talk takes place is stored as a [YAML data file](https://jekyllrb.com/docs/datafiles/) under `_data/program.yml`. For further details about it see below in the section _Content_.

:warning: Please note that the generated website can be large containing many unnecessary whitespaces. It is recommended to minimize the generated output files before uploading them to a server (e.g., with [minify](https://github.com/tdewolff/minify)).

### Automatic Import

In this repository, you'll find the Python file `_tools/import_schedule.py`. This script allows you to import content from a [frab](https://github.com/frab/frab/wiki/Manual#introduction)-compatible JSON file, such as those exported from [pretalx.com](https://pretalx.com/p/about/)."

1. Copy the files `_tools/import_schedule.py` and `_tools/requirements.txt` from this repository

2. Create a virtual environment and activate it

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

3. Install the requirements

   ```bash
   pip install -r _tools/requirements.txt
   ```

4. Execute the script, e.g., to show the help type

   ```bash
   python _tools/import_schedule.py --help
   ```

### Automatic Build

If you prefer not to install the full Ruby/Jekyll toolchain locally, you can leverage [GitHub Actions](https://github.com/features/actions), GitHub's continuous integration platform. This repository includes several example GitHub Actions configuration files in the `_tools/` folder:

- `build.yml`: This workflow automatically builds and optimizes the website whenever a new tag starting with `v` (e.g., `v2020.01.01`) is added. It then attaches the generated website as an archive to a release for easy download. Note that `purgecss.config.js` must also be copied to the project's root for this to work.
- `test.yml`: This workflow automatically attempts to build the website upon a new pull request, making it suitable for use as a status check before merging.
- `schedule.yml`: This workflow automatically generates schedule and content files when a new pull request includes a `schedule.json` file (refer to the 'Automatic Import' section for details). This enables quick content updates from [pretalx.com](https://pretalx.com/p/about/) exports.

To get started, simply copy the desired workflow file to your repository and adapt it to your needs:

- `_tools/build.yml` -> `.github/workflows/build.yml`

Please note that the `Gemfile.lock` of your project must be adapted to include specific versions required by Github's workflow server, i.e., run `bundle lock --add-platform x86_64-linux` to add support for them.


## Configuration

All configurations and customization for this theme are stored under the `conference` property in the `_config.yml` file. You can find an example configuration containing most of the here discussed parameters under `_config.example.yml` in this repository.

### Theme Verification

Upon building, the theme runs some basic verification to check if all necessary files and configurations are in place. If it encounters an error it shows so in adding an information bar on all your sites. You can disable this, e.g., in a production environment, by setting `show_errors` to `false` (default: `true`).

Example:

```yaml
conference:
  show_errors: false
```

:warning: Please be sure to disable this parameter for your production system.

### Collection URLs

The three required collections containing the files for the talks, speakers and rooms have to be specified in the `_config.yml` file. The first block declares them and sets the URL under which they will later be accessed. The second block defines the default layout for each of the collection.

```yaml
collections:
  talks:
    output: true
    permalink: /:collection/:title/
  speakers:
    output: true
    permalink: /:collection/:title/
  rooms:
    output: true
    permalink: /:collection/:title/

defaults:
  - scope:
      path: ""
      type: talks
    values:
      layout: talk
  - scope:
      path: ""
      type: speakers
    values:
      layout: speaker
  - scope:
      path: ""
      type: rooms
    values:
      layout: room
```

To change the URL of the collection, simply edit the `permalink` property and replace the `:collection` tag (which translates to `talks`, `speakers` and `rooms`) with your desired value. Please note that the talk and speaker overview pages should residue in a folder of the same name.

_Note:_ While you might want to change the URLs, the name of the three collections (`talks`, `speakers` and `rooms`) is fixed and cannot be changed.

### Language

To set the theme's language, use the `lang` property. The following languages are supported:

- English: `en` (Default)
- German: `de`
- French: `fr`
- Portuguese: `pt`

Example:

```yaml
conference:
  lang: en
```

To add more languages, copy the internationalization file from this repository to `_data/lang.yml`, modify it, and store it in your own repository at the same path.

### Timezone

Multiple dynamic features such as showing the current day in the program or live indications require correct timing. Define the timezone in which the conference takes place with the `tz` property set to a valid [UTC timezone offset](https://en.wikipedia.org/wiki/List_of_UTC_offsets) in the format `"+/-HH:MM"`:

Example:

```yaml
conference:
  tz: "+02:00"
```

### Navigation Bar

The navigation bar is located at the top and visible on every site. On the right, it shows the title of the website (`site.title`) followed by the links listed under the `links` property of the `navigation` property. See the _Content_ > _Links_ section below for the available properties per link.

Example:

```yaml
conference:
  navigation:
    links:
      - name: Program
        relative_url: /program/
      - live: true
      - name: Previous Editions
        menu:
          - name: 2020 (current)
            disabled: true
          - name: 2019
            relative_url: /2019/
```

Optionally, a logo or link of your organization hosting the conference can be shown on the right side of the navigation bar. It is activated through the `logo` property under the `navigation` property containing

- the text to show (`name`),
- an absolute link address (`url`), and
- optionally a logo to show instead of the text (`img`), whereby the path to the image file relative to the `/assets/images/` folder has to be specified.
- optionally a dark mode logo (`img_dark`), which will be automatically displayed when the user's system is in dark mode. If not specified, the regular `img` will be used in both light and dark modes.

Example:

```yaml
conference:
  navigation:
    ...
    logo:
      name: Magic Organisation
      img: 'logo.svg'  # inside /assets/images/
      img_dark: 'logo-dark.svg'  # optional: dark mode version
      url: 'https://github.com'
```

The navigation bar automatically collapses when the available space is too small (e.g. on a smaller screen). The breakpoints are given by [Bootstrap](https://getbootstrap.com/docs/4.6/layout/overview/#responsive-breakpoints). The default breakpoint is `md` (collapsing if the screen width is smaller than 992px). It can be adapted by setting the `breakpoint` property under the `navigation` property to either `sm`, `md`, `lg`, or `xl`.

### Meta Data for Search Engines and Link Previews

The theme automatically includes the necessary `<meta>` tags to ease link previewing when sharing links based on the [Open Graph protocol](https://ogp.me/) (used by all major social networks and messenger apps) and [Twitter Cards](https://developer.x.com/en/docs/x-for-websites/cards/overview/abouts-cards) (used by X). These tags control how a link is shown when shared via different platform and apps. The theme also includes [Schema.org](https://schema.org/) JSON-LD structured data to help search engines better understand and display the conference and its talks, potentially showing event cards, speaker information, and enhanced search listings.

Both configurations are organized under the `meta` property.

To generate a meaningful description for each of the schemas and links, the preposition for the conference title as given under the `title` property can be defined by using the `preposition` property. For example, if `title` is set to "Conference 2020" the corresponding `preposition` would be "at". The template can then use it to generate descriptions such as "Talk _at_ Conference 2020".

```yaml
title: Conference 2020
preposition: "at"
```

#### Link Previews

Support for link preview is organized under the `link_preview` property part of the `meta` property. It can be disabled by setting `disable` to `true`.

Optionally, an image that is shown as preview for all links can be specified. For sharing via Open Graph an image ratio of 1.91:1 and an ideal size of 1200x630 pixel is recommended. For sharing via Twitter an image ratio of 1.91:1 and a minimal size of 300x157 pixel (better 1200x628 pixel) is recommended. SVG image files are not supported. It is activated through the `img` property under the `link_preview` property containing an image file shown for Open Graph (`open_graph`) and on the Twitter Cards (`twitter`), whereby the path to the image file relative to the `/assets/images/` folder has to be specified.

```yaml
conference:
  meta:
    link_preview:
      disable: false  # Set to true to disable Open Graph and Twitter Card meta tags
      img:
        twitter: "twitter_preview.png"  # inside /assets/images/
        open_graph: "facebook_preview.png"  # inside /assets/images/
```

#### Meta Data for Search Engines

Support for [Schema.org](https://schema.org/) JSON-LD structured data is organized under the `schema_org` property part of the `meta` property. It can be disabled by setting `disable` to `true`. Different schemas are generated depending on the page type, and these schemas are interconnected. The following schemas are generated:
- `ConferenceEvent` (main and program page)
- `Event` (talk pages)
- `Place` (location and room pages)
- `Person` (speaker pages)

Please note that any talk, room, or speaker set to `hide: true` will not be included in the generated schemas or their relations.

Optionally, the following properties can be added under the `schema_org` property to provide further information about the conference:
- Event Status (`event_status`):
  - `scheduled` (default)
  - `cancelled`
  - `postponed`
  - `moved_online`
- Event Attendance Mode (`event_attendance_mode`):
  - `offline` (default)
  - `online`
  - `mixed`
- Organizer hosting the conference (`organizer`) with the following properties
  - `name`
  - `url`
- Call for Participation (`has_participation_offer`) with the following property
  - `url`
- Ticket offer (`tickets`) with the following optional properties
  - `url`
  - `availability`:
    - `in_stock`
    - `pre_order`
    - `sold_out`
    - `limited_availability`
    - `out_of_stock`
    - `online_only`
    - `in_store_only`
  - `price`
  - `currency`: Currency code (ISO 4217, e.g., `"USD"`, `"EUR"`, `"CHF"`)
- Image file path (`img`) relative to the `/assets/images/`

```yaml
conference:
    schema_org:
      disable: false  # Set to true to disable Schema.org JSON-LD structured data
      event_status: "scheduled"  # Options: scheduled, cancelled, postponed, moved_online
      event_attendance_mode: "offline"  # Options: offline, online, mixed
      organizer:  # Organization hosting the conference
        name: "Your Organization Name"  # Organization name
        url: "https://example.com"  # Organization website URL (optional, can use name or url)
      has_participation_offer:  # Call for participation
        url: "https://example.com/register"  # URL for participation offer
      tickets:  # Ticket offer
        url: "https://example.com/tickets"  # URL to purchase tickets
        availability: "in_stock"  # Options: in_stock, pre_order, sold_out, limited_availability, out_of_stock, online_only, in_store_only
        price: "50.00"  # Price as a string (e.g., "50.00")
        priceCurrency: "USD"  # Currency code (ISO 4217, e.g., "USD", "EUR", "CHF")
      img: "conference.png"  # inside /assets/images/
```

### Main Landing Page

The main landing page is shown at the root of the website to greet new visitors. To show it you need to create a `index.md` file in the root of your website's folder and specify its layout as `layout: main`.

The main page states your site's title (`site.title`) or a logo instead. The logo can be configured through the `header` property of the main page's FrontMatter containing

- a `img` property specifying the path to the image file relative to the `/assets/images/` folder.
- optionally a `img_dark` property for a dark mode version of the logo, which will be automatically displayed when the user's system is in dark mode. If not specified, the regular `img` will be used in both light and dark modes.

The title/logo on the main page is followed by a description of your site (`site.description`) and the content of your `index.md` file. It ends with an optional list of link buttons. See the _Content_ > _Links_ section below for the available properties per link.

```yaml
layout: home
header:
  img: "main_logo.png"
  img_dark: "main_logo_dark.png"  # optional: dark mode version
links:
  - name: Program
    relative_url: /program/
  - name: Tickets
    disabled: true
    absolute_url: ''
```

### Information Boxes & Modals

The theme supports two types of information displays: banners at the top of the page (`bars`) and dialog popups (`modals`). Both can be used to inform your visitors about important news and announcements.

One or multiple information banners can be shown at the top of the website just below the navigation bar. They are prominent and can inform your visitors about important news. They are activated through the `info.bars` property, which contains a list for each information banner to show. Each banner consists of

- a title (`title`),
- a color (`color`) following the Bootstrap color scheme (see below), possible values are:
  - `primary` (your website's main color, normally blue)
  - `secondary` (your website's secondary color, normally grey)
  - `success` (green)
  - `alert` (red)
  - `warning` (yellow)
  - `info` (blue)
  - `light` (white)
  - `dark` (dark grey)
- an additional text (`text`, markdown supported),
- the option to show it on all pages, only the main landing page (`main_only: true`), or all pages except the main landing page (`pages_only: true`),
- optionally, the number of days to keep the info bar dismissed after a user closes it (`dismissal_days`, default: `7`). Each info bar can have its own dismissal period. Setting `dismissal_days: 0` will disable dismissibility entirely (no close button will be shown, and the info bar cannot be dismissed).

Information modals appear as modal dialog popups that overlay the page content, dimming the background. They are useful for displaying important announcements that require user attention. Modals are activated through the `info.modals` property, which contains a list for each information modal to show. Each modal consists of

- a title (`title`),
- an additional text (`text`, markdown supported),
- the option to show it on all pages, only the main landing page (`main_only: true`), or all pages except the main landing page (`pages_only: true`),
- optionally, the number of days to keep the info modal dismissed after a user closes it (`dismissal_days`, default: `7`). Each modal can have its own dismissal period. Setting `dismissal_days: 0` will disable dismissibility entirely (cannot be closed).

Modals automatically appear when a page loads. The dismissal state is persisted in the browser's localStorage, so users won't see dismissed modals again until the dismissal period expires.

Example:

```yaml
conference:
  info:
    # Information modals (shown as modal dialogs)
    modals:
      - title: Important Announcement
        main_only: true
        dismissal_days: 7
        text: This is an information modal that appears as a dialog.

    # Information bars (shown as alerts at the top of the page)
    bars:
      - title: Sold Out!
        color: primary
        main_only: true
        dismissal_days: 14
        text: |
          We're truly sorry but we are **sold out**.

          ---

          Try again next year.
      - title: Important Notice
        color: warning
        dismissal_days: 0
        text: |
          This is a non-dismissible information banner that will always be visible.
```

### Live Indications & Streaming

To help users navigating the program during the conference, a _Live_ indication can be shown next to talks, which are currently taking place. A small JavaScript functions keeps the site automatically up-to-date (without the need to refresh) showing the indication as soon as the talk has started and hiding it once it is over (according to the timetable indicated in the `_data/program.yml` file).

This can be further extended if some talks have an associated live stream: Upon clicking one of the live indications a modal will open containing the corresponding embedded live stream. The URL to the live stream has to be set via `live` property in each room (see the _Content_ > _Room_ section below). Instead of opening the modal an external link can also be used.

To activate these functionalities, each day in the `program.yml` file must contain a `date` property (see section _Content_ > _Schedule / Program_ below) and the `live` property has to be set in the configuration file containing

- how long a pause between two consecutive talks has to be for the live indication to pause (`stop`),
- optionally, under the `streaming` property:
  - if streaming should be enabled (`enable`), and if enabled
  - how many minutes the stream goes active before a talk (`prepend`),
  - how many minutes the stream stays active after a talk (`extend`),
  - how long a pause between two consecutive talks has to be for the stream to pause (`pause`), and
  - an external (absolute) link to which the user will be redirected instead of opening the modal (`external`),

```yaml
conference:
  live:
    stop: 240 # in minutes
    streaming:
      enable: true
      pause: 60 # in minutes
      prepend: 5 # in minutes
      extend: 5 # in minutes
```

### Progressive Web App (PWA)

The theme includes built-in support for Progressive Web App (PWA) functionality, allowing your conference website to be installed on users' devices and work offline. PWA functionality is disabled by default. To enable it, multiple manual steps are necessary to add the necessary files:

1. Enable and optionally customize the functionality in your `_config.yml`:
   ```yaml
   conference:
     pwa:
       enable: true

       # Theme color for the PWA (default: Bootstrap primary color, #0d6efd)
       theme_color: "#0d6efd"

       # Background color for the PWA (default: Bootstrap primary color, #ffffff)
       background_color: "#ffffff"

       # PWA icons configuration
       icons:
         - img: "icons/icon-192.png"
           sizes: "192x192"
           type: "image/png"
         - img: "icons/icon-512.png"
           sizes: "512x512"
           type: "image/png"
         - img: "icons/maskable-512.png"
           sizes: "512x512"
           type: "image/png"
           purpose: "maskable"
   ```

   Icons can be configured as an array of objects containing:
     - `img`: Path to the icon file relative to `/assets/images/` (required)
     - `sizes`: Optional, icon size in format `"WIDTHxHEIGHT"` (e.g., `"192x192"`)
     - `type`: Optional, MIME type (e.g., `"image/png"`)
     - `purpose`: Defaults to `"any"`, see [mdn Manifest Reference](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons#purpose) for alternative values

2. Create a manifest file in the root of your project, `manifest.json` with the following content:
   ```yaml
   ---
   layout: manifest
   ---
   ```
3. Create a service worker JavaScript file in the root of your project, `sw.js` with the following content:
   ```yaml
   ---
   layout: sw
   ---
   ```
4. Create specified icon files. It is recommended to have at least icons for the following three settings:
   - `size: "192x192"`
   - `size: "512x512"`
   - `size: "512x512", purpose: "maskable"`

   These icons will be used when users install the app on their devices. You can generate these from a single high-resolution logo using a tool like:
   - [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)

### Talk Settings

Talks can optionally be organized into tracks, where each track groups talks under a common subject. Tracks are visually distinct across the website, especially in the program, by a unique color. Additionally, each talk can have one or more associated tags. Both tracks and tags are linked via the talk's FrontMatter (refer to the _Individual Pages: Talks_ section for more details).

To define available tracks, add the `tracks` property under the `talks` property in the configuration file. This property is a list of tracks, with each track requiring:

- its `name`, which must match the track specified in the talk's FrontMatter.
- a color (`color`) following the Bootstrap color scheme (see below), possible values include:
  - `primary` (your website's main color, normally blue)
  - `secondary` (your website's secondary color, normally grey)
  - `success` (green)
  - `alert` (red)
  - `warning` (yellow)
  - `info` (blue)
  - `light` (white)
  - `dark` (dark grey)

Instead of displaying the tag name, you can replace it with an icon. To define tags with icons, add the `tags` property under the `talks property in your configuration file. Each listed tag requires:

- its `name`, which must match the tag specified in the talk's FrontMatter.
- optionally, an icon to show instead of the tag's name (`icon: ` followed by the [Bootstrap Icons](https://icons.getbootstrap.com/) icon name to show).

Talks can also have associated links displayed at the end of their content. If these links have an icon (see _Content_ > _Talks_ below), they will also appear on the talk overview page (e.g., to indicate which talks have video recordings). To prevent icon links from showing on the overview page, set the `hide_link_icons` property to `true` (default is `false`).

Example:

```yaml
conference:
  talks:
    # Talk tracks
    tracks:
      - name: Track A
        color: info
      - name: Track B
        color: success

    # Talk tags
    tags:
      - name: No recording
        icon: video-slash

    # Hide link icons on talk overview page
    hide_link_icons: false
```

### Speaker Settings

In the program as well as the speaker's overview the speaker's first name can be abbreviated to its first letter if present. To do so, add the `show_firstname: true` setting (default: `false`) to the `speakers` property.

Example:

```yaml
conference:
  speakers:
    show_firstname: false
```

### Location Settings

To help users find your venue, an [OpenStreetMap](https://www.openstreetmap.org/) container displaying a map can be shown on the location page as well as the address of the venue. You can define the initial position of the map by setting the default zoom level `default_zoom`, the center coordinates `home_coord`, and the map provider for the tiles `map_provider`. Alternative map providers can be found [here](https://leaflet-extras.github.io/leaflet-providers/preview/).
The map contains small control buttons to zoom in and out, center the map back to the initial position, and show the visitor's current location (has to be manually activated and granted by the visitor).

Location settings are configured directly in the Front Matter of the location page (the page with `layout: location`). The location page's Front Matter supports the following properties:

- `title`: The title shown in the navigation bar for the location section (defaults to "Location")
- `hide`: Set to `true` to hide the location page and all room links (default: `false`). Hidden rooms still need to exist in the `_rooms/` directory as references.
- `map`: Map configuration object with the following properties:
  - `home_coord`: Center coordinates of the map (e.g., `47.37808, 8.53935`)
  - `default_zoom`: Initial zoom level (e.g., `17`)
  - `map_provider`: Tile provider (default: `"OpenStreetMap.Mapnik"`)
- `postal_address`: Postal address displayed on the location page and used in schema.org structured data. Can contain:
  - `name`: Venue name (e.g., "Zentralwäscherei")
  - `street`: Street address (e.g., "Neue Hard 12")
  - `locality`: City or locality (e.g., "Zurich")
  - `postal_code`: Postal or ZIP code (e.g., "8005")
  - `region`: State, province, or region (e.g., "ZH", "Zurich")
  - `country`: ISO 3166-1 alpha-2 country code (e.g., "CH")

Example location page (`location/index.md`):

```yaml
---
layout: location
title: Conference Venue
hide: false
postal_address:
  name: "Zentralwäscherei"
  street: "Neue Hard 12"
  locality: "Zurich"
  postal_code: "8005"
  region: "ZH"
  country: "CH"
map:
  default_zoom: 17
  home_coord: 47.37808, 8.53935
  map_provider: "OpenStreetMap.Mapnik"
---

Welcome to our conference venue!
```

The map is based on the [Leaflet](https://leafletjs.com/) JavaScript library. The map object can be customized by adding additional layers with markers, text, or shapes. To do so, edit the `assets/js/main.js` file in your project:

1. The conference JavaScript bundle (`conference.bundle.js`) is automatically loaded and provides all necessary libraries
2. Await the initialization of the theme's object using `window.conference.awaitReady()`
3. Fetch the map object and verify it is set (while the JavaScript code is executed on each page, the map object will only exist on the location site)
4. Modify the map.

Following an example for `assets/js/main.js` is given adding a simple marker to the map:

```javascript
window.conference.awaitReady().then(async () => {
    const map = await window.conference.map.getMap();

    if (map) {
        let main_station = L.marker([47.37785, 8.54035], {
            icon: L.divIcon({
                className: '',
                html: '<span class="bi bi-train-front" aria-hidden="true"></span> Main Station',
                iconSize: [120, 56]
            })
        }).addTo(map);
    }
});
```

### Program Settings

Program settings are configured directly in the Front Matter of the program page (the page with `layout: program`). The program page's Front Matter supports the following properties:

- `title`: The title shown on the program page (defaults to "Program")
- `time_steps`: The time interval in minutes for each row in the schedule grid (default: `15`)
- `show_alltimes`: Show time labels for all intervals, not just full hours (default: `false`)

```yaml
---
layout: program
title: Conference Program
time_steps: 15
show_alltimes: true
---
```


## Content

The different talks, speakers and rooms are stored as a collection of files. Each file contains a small header in form of a YAML block (called [FrontMatter](https://jekyllrb.com/docs/front-matter/)) used to store additional information beside a description.
The schedule defining when and in which room a talk takes place is stored as a [YAML data file](https://jekyllrb.com/docs/datafiles/).

### Schedule / Program

The schedule of the conference linking the talks with the rooms and indicating when each talk talks place and how long it goes, is set in the `_data/program.yml` file. It contains a list of days, whereby each day contains a list of rooms, whereby each room contains a list of talks.

Each day consists of

- a list of rooms (`rooms`) in which talks are taking place on that day
- optionally, the day's `name`, e.g., the weekday
- optionally, the short form of the day's name (`abbr`), and
- optionally and only if no live indications are active, a `date` in the format `YYYY-MM-DD`.

Each room consists of

- the room's `name` (must correspond to one of the room identifier), and
- a list of talks (`talks`) which also can be empty `[]`.

The order of the rooms in the list defines the order of the rooms as shown in the schedule on the program page. For the live-streaming or the room overview the order of the rooms is alphabetical but can be adapted via the [main configuration file](https://jekyllrb.com/docs/collections/#sort-by-front-matter-key).

Each talk consists of

- a `name` (must correspond to one of the talk identifier),
- a starting time `time_start` given as `H:M` ([`strftime`](http://www.strfti.me) formated) or `H:M +∆` whereby ∆ is the day offset in relation to the date given for the given day, and
- an end time `time_end`.

The list of talks should (manually) be ordered by time, i.e., the first occurring talk should be listed first.

Example:

```yaml
days:
  - name: Monday
    abbr: Mo
    date: 2020-01-31
    rooms:
      - name: Room A
        talks:
          - name: Vim Impetus Placerat Cotidieque Ad
            time_start: "12:00"
            time_end: "12:45"
          - name: Condimentum Vitae Sapien Pellentesque
            time_start: "12:45"
            time_end: "13:30"

      - name: Room B
        talks:
          - name: Arcu Non Odio
            time_start: "12:00"
            time_end: "13:00"
```

### Talks

Each talk is represented by a file in the `_talks/` directory. It must begin with valid [YAML Front Matter](https://jekyllrb.com/docs/frontmatter/) containing

- the talk's `name` (used as identifier),
- one or more existing `speakers` name(s),
- optionally, a `track` which should match the tracks defined in the site's configuration,
- optionally, a list of `tags`
- optionally, a list of `links` (see the _Links_ subsection below for the available properties):
  - Links with an `icon` are treated separately and are also included on the talk overview page.
  - Links with `live: true` are only shown below the live stream for the given talk in form of buttons.
- optionally, `hide: true` if the talk's page should not be linked to.

Example:

```yaml
---
name: Vim Impetus Placerat Cotidieque Ad
speakers:
  - Tolga Philip
track: Track A
tags:
  - Short
---
```

### Speakers

Each speaker is represented by a file in the `_speakers/` directory. It must begin with valid [YAML Front Matter](https://jekyllrb.com/docs/frontmatter/) containing

- the speaker's `name` (used as identifier), as well as its
- `first_name`,
- `last_name`,
- optionally, a list of `links` (see the _Links_ subsection below for the available properties):
  - Links with an `icon` are treated separately and are also included on the speaker overview page.
- optionally, `hide: true` if the speaker's page should not be linked to.

If the speaker's name consists only out of one word, populate the `last_name` property and leave the `first_name` property empty. The last name is generally used for sorting the speakers.

Example:

```yaml
---
name: Tolga Philip
first_name: Tolga
last_name: Philip
links:
  - name: Profile
    absolute_url: https://github.com
---
```

### Rooms

Each room is represented by a file in the `_rooms/` directory. It must begin with valid [YAML Front Matter](https://jekyllrb.com/docs/frontmatter/) containing

- the room's `name`
- optionally, `hide: true` if the room's page should not be linked to, and
- optionally under the `live` property, a URL pointing to a live stream for the given room during the conference (see the section _Live Indications & Streaming_ above), either:
  - as an `absolute_url`, or
  - a `relative_url`.

Example:

```yaml
---
name: The Room
hide: false
live:
  absolute_url: https://github.com
---
```

### Links

Links are used at different location throughout the theme: They can either be used in the configuration file (for the landing page or the navigation bar), or in talks and for speakers. A link can thereby have the following properties:

- the text to show (`name`),
- the link address:
  - _relative_ to the site's base address: `relative_url:`,
  - as an _absolute_ address: `absolute_url:`,
  - pointing to a _file_ uploaded to the `/documents` folder: `file:`, or
  - pointing to an external _video_: `video:`.
- optionally, if it is disabled (`disabled: true`),
- optionally, if it should open in a iframe embedded in a popup-like modal (`iframe: true`), and
- optionally, an icon to show in front of the title (`icon: ` followed by the [Bootstrap Icons](https://icons.getbootstrap.com/) icon name to show).

Using the `file:` indicator, the

- link address is set to
  - the site's base address followed by `/documents/slides` and the value for _talks_,
  - the site's base address followed by `/documents/bio` and the value for _speakers_, or
  - the site's base address followed by `/documents` and the value for all remaining types.
- the link's `icon:` is set to `file-alt`.

Using the `video:` indicator, the

- link address is set to an absolute address as given by the value.
- the link's `iframe:` attribute is set to `true` top embed the video in a popup-like modal having a default iframe ratio of 24:11.
- the link's `icon:` is set to `video`.

Additionally, a _talk_ link can also have the following property:

- `live: true` whereby the link is only shown below the live stream for the given talk in form of buttons.

Additionally, a _navigation bar_ or _main landing page_ link can also have the following properties:

- `live: true` making the link only visible during the conference and adds a live indication.
  - The link is only shown if `name` is set. If `name` is an empty string, "Live Stream" is shown instead.
  - If `name_inactive` is set, its value is used to be shown as a placeholder text, while the conference is **not** live. If `name_inactive` is an empty string, "Live Stream" is shown instead.
  - If streaming is enabled and any URL property is omitted, a click on the link will open the streaming modal (see section _Live Indications_ above).
- `menu` containing another list of links. This creates a dropdown menu of multiple sublinks, while the URL of the parent link is ignored. The sublinks have the same properties as regular links.

#### Import link files

There exists a Python file in this repository, `_tools/import_resources.py`, which can be used to import resources such as slides and other documents from [pretalx.com](https://pretalx.com/p/about/)) via its API. It automatically downloads all files, stores them and updates the links of the talks concerned.

1. Copy the files `_tools/import_resources.py` and `_tools/requirements.txt` from this repository

2. Create a virtual environment and activate it

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

3. Install the requirements

   ```bash
   pip install -r _tools/requirements.txt
   ```

4. Execute the script, e.g., to show the help type

   ```bash
   python _tools/import_resources.py --help
   ```

## Overview Pages

For each of the three collections there exist a dedicated layout giving an overview among all items of the collection. Furthermore, there exists a layout to show the program as a time schedule. Simply create an empty page and associate the corresponding layout with it:

- `talks/index.md` with `layout: talk-overview`
- `speakers/index.md` with `layout: speaker-overview`
- `location/index.md` with `layout: location`
- `program/index.md` with `layout: program`

They can be empty but should contain the `layout` property in the FrontMatter header.

If you choose a different location for the overview pages you must:

- if of the `talks` and `speaker` overview file, adapt the URL of the two collections as described further above in the section _Collection URLs_, and
- if of the `location` and `program` file, adapt the corresponding `url` parameter as described further above in the sections _Location Settings_ and _Program Settings_.

### Location / Room Overview

The `location` layout can include a map container (if not disabled, see the _Location Settings_ section above) which can be customized (see the _Map_ section above).

### Live Stream Overview

The `stream-overview` layout contains all active streams on a single page (see the section _Live Indications & Streaming_ above).

### Additional Pages

Additional static pages can easily be added as files and linked to via navigation bar or main landing page (see above on how to).

Each of these pages can include a map at its end (e.g., to point to your venue) by adding the `map: true` setting to its Front Matter. See the _Map_ section above for more information.


## Design

The design is based on [Bootstrap 5](http://getbootstrap.com) and is highly customizable. It integrates [Bootstrap Icons](https://icons.getbootstrap.com/) and [Leaflet](https://leafletjs.com/) for mapping. The theme also features automatic dark mode, adapting to user system preferences.

The theme offers three distinct approaches to Bootstrap integration, allowing you to choose the level of customization that suits your needs:

### Pre-compiled Bundle (Default)

This is the default option and requires no setup. As the Bootstrap framework is pre-compiled, direct modifications to its core (e.g., theme colors) are not possible. However, you can add custom styles to `assets/css/main.scss`; these will be loaded last and override existing styles.

```yaml
conference:
  custom_style: "none"  # or omit this line (default)
```

The `assets/css/` directory contains:

- `conference.bundle.css`: Complete bundle containing:
  - Pre-compiled Bootstrap 5 framework
  - Bootstrap Icons
  - Leaflet map styles
  - Conference theme customizations
- `main.scss`: For user-modifiable custom styles.

Including `assets/css/main.scss` in your project is optional. If included, it must begin with a [FrontMatter](https://jekyllrb.com/docs/front-matter/) header for Jekyll recognition:


```scss
---
---

// Custom styles
// ...
```

### Split Bundle (Custom Bootstrap CSS)

Integrate your own Bootstrap file, such as a theme from [Bootswatch](https://bootswatch.com/). Similar to the default option, `assets/css/main.scss` can be used for additional custom styles, which will override previous styles.

```yaml
conference:
  custom_style: "bootstrap"
```

The `assets/css/` directory contains:

- `bootstrap.min.css`: Your custom Bootstrap framework (user-provided).
- `conference-only.bundle.css`: Complete bundle containing:
  - Bootstrap Icons
  - Leaflet map styles
  - Conference theme customizations
- `main.scss`: For additional custom styles.

Including `assets/css/main.scss` in your project is optional. If included, it must begin with a [FrontMatter](https://jekyllrb.com/docs/front-matter/) header for Jekyll recognition:

```scss
---
---

// Custom styles
// ...
```

#### Custom SCSS

Compile your Bootstrap framework by modifying [Bootstrap variables](https://getbootstrap.com/docs/5.3/customize/sass/#variable-defaults). This provides complete control over Bootstrap's SCSS variables, enabling source-level customization.

The theme simplifies this by including all Bootstrap SCSS source files. These are located in the Gem's `_sass` folder and are automatically overlaid with your project's `_sass` folder.

While offering the most flexibility, this setup requires several steps:

1. Configure Jekyll's [SASS compiler](https://jekyllrb.com/docs/assets/#sassscss) in `_config.yml`. Ensure `sass_dir` is either unset (using the default) or points to the `_sass` folder. Output compression is recommended.
    ```yaml
    sass:
        sass_dir: _sass    # or omit this line
        style: compressed
    ```
2. Configure the theme to use the full custom style setup:
     ```yaml
    conference:
      custom_style: "full"
    ```
3. Create `_sass/bootstrap-variables.scss` to override Bootstrap variables.
    ```scss
    // If needed, include Bootstrap functions first
    @use "bootstrap/functions" as *;

    // Override Bootstrap variables
    $green: #4ea93f;
    $primary: $green;
    ```
4. Include the compiled conference bundle, incorporating your Bootstrap modifications, in `assets/css/main.scss`:
    ```scss
    ---
    ---

    @use "conference";

    // Custom styles
    // ...
    ```


## JavaScript

The theme includes a pre-built JavaScript bundle (`assets/js/conference.bundle.js`). This bundle is automatically included in the theme gem, pre-compiled, and minified, requiring no build tools for end users. Please do not modify this file directly.

To add custom JavaScript, edit the `assets/js/main.js file in your project. This file loads after the conference bundle, giving you full access to all theme functionality.

**Available Global Objects:**

- `window.conference`: Main conference object with the following modules:
  - `conference.program`: Program navigation and tab management
  - `conference.map`: Map functionality (if enabled)
  - `conference.modal`: Modal popup handling
  - `conference.live`: Live streaming and real-time updates
  - `conference.awaitReady()`: Promise-based initialization helper
- `window.$` / `window.jQuery`: jQuery library
- `window.L`: Leaflet map library (if map is enabled)

**Example Usage:**

```javascript
// Wait for conference to initialize
window.conference.awaitReady().then(async () => {
    // Access the map (returns a promise)
    const map = await window.conference.map.getMap();
    if (map) {
        // Add custom map markers
        L.marker([47.37785, 8.54035]).addTo(map);
    }

    // Access live data
    const liveData = window.conference.live.getData();

    // Custom program interactions
    // ...
});
```


## Development

### Jekyll Theme Development

If you want to modify this theme and see its changes on an existing project, simply indicate in your `Gemfile` that you want to use the local copy of the theme by adding a `path` indication after the gem instantiation:

```ruby
group :jekyll_plugins do
  gem "jekyll-theme-conference", path: "../[path to your local theme]"
end
```

### JavaScript & CSS Development

The theme's JavaScript and CSS are built using [Vite](https://vitejs.dev/). Source files are located in:

**JavaScript** (`_js/` directory):
```
_js/
├── main.js            # Main entry point
├── init.js            # Initialization module
├── core/
│   └── conference.js  # Core conference object
└── modules/
    ├── program.js     # Program navigation
    ├── map.js         # Map functionality
    ├── modal.js       # Modal popups
    └── live.js        # Live streaming
```

**CSS/SCSS** (`_css/` directory):
```
_css/
├── main.scss                 # Main entry point (with Bootstrap)
├── main-only.scss            # Alternative entry point (without Bootstrap)
├── bootstrap.scss            # Adapted Bootstrap Framework
├── bootstrap-variables.scss  # Placeholder for custom build of Bootstrap Framework
└── theme.scss                # Conference-specific styles
```

The CSS source imports libraries from NPM:
- `bootstrap` - Bootstrap framework
- `bootstrap-icons` - Bootstrap Icons
- `leaflet` and plugins - Map styles

To modify the theme's source code and rebuild:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the bundles:
   ```bash
   npm run build
   ```
   This compiles:
   - `_js/` → `assets/js/conference.bundle.js`
   - `_css/` → `assets/css/conference.bundle.css`
   - Webfonts → `assets/webfonts/`

3. Test your changes locally:
   ```bash
   bundle exec jekyll serve
   ```

## License

This project is licensed under the MIT License. You can view [LICENSE.md](LICENSE.md) for more details.
