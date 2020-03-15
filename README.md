# jekyll-conference

This is a [Jekyll](http://jekyllrb.com) template based on [Bootstrap 4](http://getbootstrap.com) which can be used to make a simple website for a one-day conference or workshop containing:

- program / schedule
- talk descriptions
- speaker descriptions
- room descriptions

All components such as talks, speakers or rooms are represented as collection of files. The schedule is given is defined via a simple structure stored in a `yaml` file.
There is no need for databases and once generated the website consists only of static files. The use of JavaScript is optional and is used only for the navigation bar dropdown menus and the program table's sticky header/first column.


## Setup

1. [Install Bundler](https://bundler.io), a [Ruby](https://www.ruby-lang.org/en/downloads/) package manager.
2. Verify you have [Git LFS](https://git-lfs.github.com) installed (used to store documents).
3. Clone this repository and browse into it: `cd jekyll-conference/`
4. Run Bundler to install all build dependencies including [Jekyll](https://jekyllrb.com/docs/installation/): `bundle install --path vendor/bundle` (_Note:_ If you want to use a different path, you need to adapt the `sass: load_paths` settings in your configuration file too.)
5. Build the site with Jekyll: `bundle exec jekyll build`. The generated site will be located in the `_site/` directory (will be overwritten at each new build).
6. Instead of building you can also serve it locally with automated regeneration (does not contain changes on the site's configuration) with: `bundle exec jekyll serve --livereload`


## Configuration

As a general rule all files ending with `.md` are supposed to be modified. Reference between the files is done via their `name` property.
The repository in its current state serves as an example.

The site's configuration is given by the `_config.yaml` file. There one can edit the following arguments:

- the site's `title`,
- a short, general description of the site's content in `description` (optional) and a longer one in `long_description` (optional),
- the site's `url` and `baseurl`,
- `navigation` defines the navigational bar's content and is an array containing the ordered links. Each link consists of
  * the text to show (`name`),
  * a relative (`relative_url`) or absolute link address (`absolute_url`) or another list of links whereby the current link will be transformed to a dropdown menu (`menu`), and
  * optionally if it is disabled (`disabled`).
- `main_links` defines links shown on the main landing page in form of buttons. Each link consists of
  * the text to show (`name`),
  * a relative (`relative_url`) or absolute link address (`absolute_url`), and
  * optionally if it is disabled (`disabled: true`).
- `info_bars` defines optional dismissible boxes below the navigation bar. Consists of
  * a `title` (optional),
  * a `color`, given as a (Bootstrap) class name,
  * the option to show the box only on the main page (`main_only: true`) or the other pages (`pages_only: true`), and
  * a `text` to be shown.
- the conference `main_categories` which is used to sort talks, each main category consists of a `name` and a `color` given as a (Bootstrap) class name
- `time_steps` sets the grid space for the program table in minutes, and
- `show_firstname` indicates if the speakers' first names are generally shown or abbreviated.
- `show_alltimes` indicates if the timestamps for all rows in the program grid should be shown.


## Content

The congress' content is based on the configuration in the configuration file, the schedule in the `program.yml` file and the talks, speakers and rooms descriptions in the corresponding files and folders.
There exists a Python file in the root, `create_entries.py`, which can be used to export content from a CSV table and generate the different files based on it automatically.

### Schedule

The one-day schedule of the conference is defined in the [`data/program.yml`] file. It consists of an array of rooms each consisting of a

- `room` name (must correspond to one of the room identifier), and
- an array of `talks` which also can be empty `[]`.

The order of the room in the file defines the order of the rooms on the website (program and room listings).

Each talk in the array consists of

- a `name` (must correspond to one of the talk identifier),
- a starting time `time_start` given as `H:M` ([`strftime`](http://www.strfti.me) formated), and
- an end time `time_end`.

The array should (manually) be ordered by time.
Currently talks can only take place on the same day and multi-day conferences are not supported.


### Talks

Each talk is represented by file in the `_talks/` directory. It must begin with valid [YAML Front Matter](https://jekyllrb.com/docs/frontmatter/) containing

- the talk's `name` (used as identifier),
- one or more existing `speakers` name(s), and
- optionally one or more `categories` of which one should be a main category as defined in the site's configuration
- optionally a list of `links` whereby each link element must contain a `name` and either an absolute link `href` or a `file` name (of a file stored under `/documents/`)
- optionally `hide: true` if the talk and its description should not be shown

### Speakers

Each speaker is represented by file in the `_speakers/` directory. It must begin with valid [YAML Front Matter](https://jekyllrb.com/docs/frontmatter/) containing

- the speaker's `name` (used as identifier), as well as its
- `first_name`,
- `last_name`, and
- optionally a list of `links` whereby each link element must contain a `name` and either an absolute link `href` or a `file` name (of a file stored under `/documents/`)
- optionally `hide: true` if the speaker and its description should not be shown.

### Rooms

Each room is represented by file in the `_location/` directory (no ending `s`). It must begin with valid [YAML Front Matter](https://jekyllrb.com/docs/frontmatter/) containing

- the room's `name`, and
- optionally `hide: true` if the room and its description should not be shown.

Furthermore, one can edit `location/index.md` to add additional information about the venue's location.
The map shown on the main location page is based on the JavaScript Library [Leaflet](https://leafletjs.com/) and can be customized by editing the `assets/js/map.js` file.

### Additional Pages

Additional static pages can easily be added as `page_name/index.html`. In the repository a `about` and `contact` page are given as example.


## Design

The design is based on the [Bootstrap 4](http://getbootstrap.com). Custom Bootstrap variables such as designed with [Bootstrap Magic](https://pikock.github.io/bootstrap-magic/app/index.html#!/editor) for individual themes can be added in the [main](assets/css/main.scss) SASS stylesheet.

Upon site building Jekyll takes care of prefixing and building Bootstrap from source including some minor modifications into a single stylesheet. While the Bootstrap stylsheet is build from source, the (static) Bootstrap JavaScript files are included in this repository and have their proper licensing terms.


## License

This project is licensed under the MIT License. You can view [LICENSE.md](LICENSE.md) for more details.

This project re-distributes other open-source tools and libraries. You can view [REDISTRIBUTED.md](REDISTRIBUTED.md) for third party licenses.
