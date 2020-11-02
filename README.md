# jekyll-theme-conference

![Screenshot](screenshot.png)

This is a [Jekyll](http://jekyllrb.com) theme based on [Bootstrap 4](http://getbootstrap.com) which can be used to make a simple, responsive website for a one-day conference or workshop with parallel tracks containing:

- program / schedule
- talk and speaker descriptions
- map for directions

All components such as talks, speakers or rooms are represented as collection of files. The schedule is given is defined via a simple structure stored in a [YAML](https://en.wikipedia.org/wiki/YAML) file. There is no need for databases and once generated the website consists only of static files.
The design is easily modifiable and is adapted for mobile uses and printing.

The theme was originally created for the yearly Winterkongress conference of the [Digital Society Switzerland](https://digitale-gesellschaft.ch/). You can see this theme in action here:

- [Demo: Winterkongress](https://digitale-gesellschaft.ch/kongress/)


## Installation

There are three ways to install: As a [Gem-based theme](https://jekyllrb.com/docs/themes/#understanding-gem-based-themes), as a [remote theme](https://github.blog/2017-11-29-use-any-theme-with-github-pages/) (GitHub Pages compatible), or by cloning/forking this repository and reference to it directly.

### Gem-based Method

With Gem-based themes, directories such as the `assets`, `_layouts`, `_includes`, and `_sass` are stored in the theme’s gem, hidden from your immediate view. Yet all of the necessary directories will be read and processed during Jekyll’s build process.

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

4. Copy the internationalization file containing the different language strings for this repository to your Jekyll folder:

   - `_data/lang.yml`

5. Continue with the _Setup_ section further below to customize the theme and add some content for your conference

To update the theme run `bundle update`.

### Remote Theme Method

Remote themes are similar to Gem-based themes, but do not require `Gemfile` changes or whitelisting making them ideal for sites hosted with GitHub Pages.

To install:

1. Create/replace the contents of your `Gemfile` with the following:

   ```ruby
   source "https://rubygems.org"

   gem "github-pages", group: :jekyll_plugins
   ```

2. Add `jekyll-include-cache` to the `plugins` array of your `_config.yml`.

3. Fetch and update bundled gems by running the following [Bundler](http://bundler.io/) command:

   ```bash
   bundle
   ```

4. Add `remote_theme: "DigitaleGesellschaft/jekyll-theme-conference@2.0.0"` to your `_config.yml` file. Remove any other `theme:` or `remote_theme:` entry.

5. Copy the internationalization file containing the different language strings for this repository to your Jekyll folder:

   - `_data/lang.yml`

6. Continue with the _Setup_ section further below to customize the theme and add some content for your conference


## Setup

The different talks, speakers and rooms are stored as a collection of files. Each file contains a small header in form of a YAML block (called [FrontMatter](https://jekyllrb.com/docs/front-matter/)) which is used to store additional information beside a description. Their exact use and meaning is described further below in the section _Content_. Additional configuration options can be found in the section _Configuration_.

The actual schedule defining when and in which room a talk takes place is stored as a [YAML data file](https://jekyllrb.com/docs/datafiles/) under `_data/program.yml`. For further details about it see below in the section _Content_.

In order to be up and running simply use the default content of this repository as an initial base for your new website. After having setup a new Jekyll website copy the following files and folders into the website's folder:

- `_config.example.yml` -> `_config.yml`
- `_data/`
- `_rooms/`
- `_speakers/`
- `_talks/`
- `index.md`
- `location/`
- `program/`
- `speakers/`
- `talks/`

There exists a Python file in this repository, `create_entries.py`, which can be used to import content from a CSV table and generate the different talk, speakers and room files automatically based on it. Just open your terminal and type `python create_entries.py --help` to show the help and get started.

In case you do not want to install the entire Ruby/Jekyll toolchain on your machine you can make use of [GitHub Actions](https://github.com/features/actions), Github's continuous integration platform. This repository contains an example Github Action configuration file which automatically builds the website upon adding a new tag. It then attaches the generated website as package to a release for easy downloading. Simply copy the following file to your repository and adapt it to your needs:

- `workflows.example.yml` -> `.github/workflows.main.yml`


## Configuration

All configurations and customization for this theme are stored under the `conference` property in the `_config.yml` file. You can find an example configuration containing most of the here discussed parameters under `_config.example.yml` in this repository.

### Theme Verification

Upon building the theme runs some basic verification to check if all necessary files and configurations are in place. If it encounters an error it shows so in adding an information bar on all your sites. You can disable this, e.g. in a production environment, by setting `show_errors` to `false` (default: `true`).

Example:

```yaml
conference:
  show_errors: false
```

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

In order to change the URL of the collection, simply edit the `permalink` property and replace the `:collection` tag (which translates to `talks`, `speakers` and `rooms`) with your desired value. Please note that the talk and speaker overview pages should residue in a folder of the same name.

_Note:_ While you might want to change the URLs, the name of the three collections (`talks`, `speakers` and `rooms`) is fixed and cannot be changed.


### Language

In order to adapt the language of the theme set the `lang` property. Make sure you have copied the internationalization file from this repository to `_data/lang.yml`. Currently the following languages are supported:

- English: `en` (Default)
- German: `de`
- French: `fr`
- Portuguese: `pt`

Example:

```yaml
conference:
  lang: en
```

### Navigation Bar

The navigation bar is located at the top and visible on every site. On the right it show the title of the website (`site.title`) followed by the links listed under the `links` property of the `navigation` property. See the _Content_ > _Links_ section below for the available properties per link.

Additionally, a navigation bar link can also have the following properties:

- `menu` containing another list of links. This creates a dropdown menu of multiple sublinks. The sublinks have the same properties as regular links (see the _Content_ > _Links_ section).

Example:

```yaml
conference:
  navigation:
    links:
      - name: Program
        relative_url: /program/
      - name: Previous Editions
        menu:
          - name: 2020 (current)
            disabled: true
          - name: 2019
            relative_url: /2019/
```

Optionally, a logo or link of your organization hosting the conference can be shown on the right side of the navigation bar. It is activate through the `logo` property under the `navigation` property containing

- the text to show (`name`),
- an absolute link address (`url`), and
- optionally a logo to show instead of the text (`img`), whereby the path to the image file relative to the `/assets/images/` folder has to be specified.

Example:

```yaml
conference:
  navigation:
    ...
    logo:
      name: Magic Organisation
      url: 'https://github.com'
```

### Main Landing Page

The main landing page is shown at the root of the website to greet new visitors. In order to show it you need to create a `index.md` file in the root of your website's folder and specify its layout as `layout: main`. The remaining customizations are specified in the `_config.yml` file.

The main page states your site's title (`site.title`) or a logo instead. The logo can be configured through the `logo` property under the `main` property containing:

- a `img` property specifying the path to the image file relative to the `/assets/images/` folder.

Example:

```yaml
conference:
  main:
    logo:
      img: 'main_logo.png'
```

The title/logo on the main page is followed by a description of your site (`site.description`) and the content of your `index.md` file. It ends with an optional list of links in the form of buttons. See the _Content_ > _Links_ section below for the available properties per link.

Example:

```yaml
conference:
  main:
    ...
    links:
      - name: Program
        relative_url: /program/
      - name: Tickets
        disabled: true
        absolute_url: ''
```

### Information Boxes

One or multiple information banners or boxes can be shown at the top of the website just below the navigation bar. They are prominent but dismissable and can inform your visitors about recent changes. They are activate through the `info_bars` property which contains a list for each information banner to show. Each banner consists of

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
- the option to show it on all pages, only the main landing page (`main_only: true`), or all pages except the main landing page (`pages_only: true`).

Example:

```yaml
conference:
  info_bars:
    - title: Sold Out!
      color: primary
      main_only: true
      text: |
        We're truly sorry but we are sold out.

        ---

        Try again next year.
```

### Talk Settings: Main Categories and Icons

Each talk can have one or multiple categories associated via FrontMatter (see the _Individual Pages: Talks_ section below for more details). Some of these categories can be elevated to so called main categories". These are used to color group the talks across the entire website, particularly in the program. In order to do so add the `main_categories` property under the `talks` property. It consists of a list of all main categories. Each main category consists of:

- its name (`name`, must be corresponding to the listed categories in the talk's FrontMatter), and
- a color (`color`) following the Bootstrap color scheme (see below), possible values are:
  - `primary` (your website's main color, normally blue)
  - `secondary` (your website's secondary color, normally grey)
  - `success` (green)
  - `alert` (red)
  - `warning` (yellow)
  - `info` (blue)
  - `light` (white)
  - `dark` (dark grey)

Each talk can have associated links listed at the end of its content. If these links have an icon associated (see _Content_ > _Talks_ below), they are also shown on the talk overview page (e.g. to show in the overview which talk has a video recording and which not). To disable the showing of icon links on the overview page, set the `hide_icons` property to `true` (default: `false`).

Example:

```yaml
conference:
  talks:
    # Talk categories
    main_categories:
      - name: Cat A
        color: info
      - name: Cat B
        color: success
    # Hide icons on talk overview page
    hide_icons: false
```

### Speaker Settings: First name

In the program as well as the speaker's overview the speaker's first name can be abbreviated to its first letter. Of course, you also have the option to not specify a first name for each speaker in the first place. In order to shorten the first name add the `show_firstname: true` setting (default: `false`) to the `speakers` property.

Example:

```yaml
conference:
  speakers:
    show_firstname: false
```

### Location Settings: Hide all and configure map

In case the location of your rooms is obvious (e.g. on a campus) you can decide to disable the location page and links to all the rooms. You still need to create the different rooms as files in the `_rooms/` directory, since they are needed as a reference. But there will not be any link pointing to it (effectively hiding them).
In order to hide all rooms add the `hide: true` setting (default: `false`) to the `location` property.

If your `location` overview file is not located under `/location` you can indicate an alternative path by setting the `url` property (default: `/location`) under the `location` property.

The `location` layout automatically includes an [OpenStreetMap](https://www.openstreetmap.org/) container to point to your venue. If you want to hide it add the `enable: false` setting (default: `true`) to the `map` property under the `location` property. Otherwise, you can define the initial position of the map by setting the default zoom level `default_zoom`, the center coordinates `home_coord`, and the map provider for the tiles `map_provider`. Alternative map providers can be found [here](https://leaflet-extras.github.io/leaflet-providers/preview/).
The map contains small control buttons to zoom in and out, center the map back to the initial position, and show the visitors current location (has to be manually activated and granted by the visitor).

Example:

```yaml
conference:
  location:
    hide: false
    map:
      enable: true
      default_zoom: 17
      home_coord: 47.37808, 8.53935
      map_provider: "OpenStreetMap.Mapnik"
```

The map is based on the JavaScript Library [Leaflet](https://leafletjs.com/) and can be customized by editing the `assets/js/main.js` file, e.g. adding additional layers with markers, text, or shapes to the map. To start, copy simply the file from this repository and make use of the initialized global variable `map` pointing to the Leaflet container.

Example:

```javascript
---
---

{% include js/conference.js %}

(function() {
    if (typeof map !== 'undefined') {
        var main_station = L.marker([47.37785, 8.54035], {
            icon: L.divIcon({
                className: '',
                html: '<span class="fas fa-train"></span> Bahnhof Zürich',
                iconSize: [120, 56]
            })
        }).addTo(map);
    }
})();

```

### Program Settings

The schedule shown as program can be slightly customized:

- The time steps shown with a new line can be adapted with the `time_steps` setting given in minute (default: `15` minutes)
- Besides the full hour the individual time steps can be hidden by setting `show_alltimes: false` (default: `true`)

If your `program` file is not located under `/program` you can indicate an alternative path by setting the `url` property (default: `/program`) under the `program` property.
Example:

```yaml
conference:
  program:
    time_steps: 15 # in minutes
    show_alltimes: true
```

## Content

The different talks, speakers and rooms are stored as a collection of file. Each file contains a small header in form of a YAML block (called [FrontMatter](https://jekyllrb.com/docs/front-matter/)) which is used to store additional information beside a description.
The actual schedule defining when and in which room a talk takes place is stored as a [YAML data file](https://jekyllrb.com/docs/datafiles/).

### Schedule / Program

The schedule of the conference linking the talks with the rooms and indicating when each talk talks place and how long it goes is set in the `_data/program.yml` file. It consists of an array of rooms each consisting of a

- `room` name (must correspond to one of the room identifier), and
- an array of `talks` which also can be empty `[]`.

The order of the room in the file defines the order of the rooms on the website (program and room listings). Each talk in the array consists of

- a `name` (must correspond to one of the talk identifier),
- a starting time `time_start` given as `H:M` ([`strftime`](http://www.strfti.me) formated), and
- an end time `time_end`.

The array should (manually) be ordered by time. Currently talks can only take place on the same day and multi-day conferences are not supported.

Example:

```yaml
- room: Room A
  talks:
    - name: Vim Impetus Placerat Cotidieque Ad
      time_start: '12:00'
      time_end: '12:45'
    - name: Condimentum Vitae Sapien Pellentesque
      time_start: '12:45'
      time_end: '13:30'
- room: Room B
  talks:
    ...
```

### Talks

Each talk is represented by a file in the `_talks/` directory. It must begin with valid [YAML Front Matter](https://jekyllrb.com/docs/frontmatter/) containing

- the talk's `name` (used as identifier),
- one or more existing `speakers` name(s),
- optionally one or more `categories` of which one should be a main category as defined in the site's configuration,
- optionally a list of `links` (see the _Links_ subsection below for the available properties per link; links with icons are treated separately and are also included on the talk overview page), and
- optionally `hide: true` if the talk's page should not be linked to.

### Speakers

Each speaker is represented by a file in the `_speakers/` directory. It must begin with valid [YAML Front Matter](https://jekyllrb.com/docs/frontmatter/) containing

- the speaker's `name` (used as identifier), as well as its
- `first_name`,
- `last_name`,
- optionally a list of `links` (see the _Links_ subsection below for the available properties per link; links with icons are treated separately), and
- optionally `hide: true` if the speaker's page should not be linked to.

### Rooms

Each room is represented by a file in the `_rooms/` directory. It must begin with valid [YAML Front Matter](https://jekyllrb.com/docs/frontmatter/) containing

- the room's `name`, and
- optionally `hide: true` if the room's page should not be linked to.

### Links

Links are used at different location throughout the theme: They can either be used in the configuration file (for the landing page or the navigation bar), or in talks and for speakers. A link can thereby have the following properties:

- the text to show (`name`),
- optionally if it is disabled (`disabled: true`),
- optionally if it should open in a iframe embedded in a popup-like modal in the site it self (`iframe: true`, e.g. for embedding videos thus having a default iframe ratio of 24:11)
- optionally an icon to show (indicating the name of a [FontAwesome](https://fontawesome.com/icons?d=gallery&s=solid&m=free) icon to be shown if supported at the given location)
- the actual link address:
  + given relatively to the site's base address: `relative_url:`,
  + given absolute: `absolute_url:`,
  + pointing to a file uploaded to the `/documents` folder (for talks `/documents/slides`, for speakers `/documents/bio`): `file:`
  + pointing to an external video: `video:`

Using the `file:` indicator, the relative address is automatically set as well as the icon. Using the `video:` indicator, the link is automatically configured to open in an iframe with a corresponding title and the icon is set.

Example:

```yaml
  links:
    - name: Slides
      file: slides.pdf
    - name: Recording
      video: https://media.ccc.de/
```


## Overview Pages

For each of the three collections there exist a dedicated layout giving an overview among all items of the collection. Furthermore, there exists a layout to show the program as a time schedule. Simply create an empty page and associate the corresponding layout with it:

- `talks/index.md` with `layout: talk-overview`
- `speakers/index.md` with `layout: speaker-overview`
- `location/index.md` with `layout: location`
- `program/index.md` with `layout: program`

They can be empty but should contain the `layout` property in the FrontMatter header.

If you choose a different location for the overview pages you must:

- in case of the `talks` and `speaker` overview file, adapt the URL of the two collections as described further above in the section _Collection URLs_, and
- in case of the `location` and `program` file, adapt the corresponding `url` parameter as described further above in the sections _Location Settings_ and _Program Settings_.

### Location / Room Overview

The `location` layout contains a map container (if not disabled, see section _Location Settings_ above) which can be customized. See the section above for further details.

### Additional Pages

Additional static pages can easily be added as files and linked to via navigation bar or main landing page (see above on how to).


## Design

The design is based on the [Bootstrap 4](http://getbootstrap.com) and thus easily expandable. Furthermore, it makes use of the [FontAwesome Icons](fontawesome.com/) across the theme.
Custom Bootstrap themes or simple color schemes such as designed with [Bootstrap Magic](https://pikock.github.io/bootstrap-magic/) can be added in the [main](assets/css/main.scss) SASS stylesheet:

1. Create a new file under `assets/css/main.scss` with the following content (or copy the one of this repository):

   ```scss
   ---
   ---

   $fa-font-path: '{{ site.baseurl }}/assets/webfonts';

   @import 'conference';
   ```

   Do not skip the `$fa-font-path` variable or modify it as otherwise, the FontAwesome icons will not be able to load.

2. Add your Bootstrap variables in front of the `@import 'conference'` line, e.g. currently the primary color is set internally to green (instead of Bootstrap's default blue): `$primary: #074 !default;`
3. Add any additional CSS styles after it.


## License

This project is licensed under the MIT License. You can view [LICENSE.md](LICENSE.md) for more details.

This project redistributes other opensource tools and libraries. You can view [REDISTRIBUTED.md](REDISTRIBUTED.md) for third party licenses.
