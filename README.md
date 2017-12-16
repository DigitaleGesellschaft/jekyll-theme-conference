# jekyll-conference

This is a [Jekyll](http://jekyllrb.com) template based on [Bootstrap 4](http://getbootstrap.com) which can be used to make a simple website for a congress or workshop containing:

- program / schedule
- talk descriptions
- speaker descriptions
- room descriptions

As it is file based the simple addition and modification of files is sufficient to manage the websites and therefore the congress' content such as its schedule. There is no need for databases and once generated the website consists only of static files without any JavaScript.

Two words of warning:

- There wasn't a lot of testing performed on the template in its current state and certain configuration might break the design.
- The code and variable names are all in English, but the example site above contain German as placeholders.


## Setup

1. [Install Bundler](https://bundler.io), a [Ruby](https://www.ruby-lang.org/en/downloads/) package manager.
2. Clone this repository and browse into it: `cd jekyll-conference/`
3. Run Bundler to install all build dependencies including [Jekyll](https://jekyllrb.com/docs/installation/): `bundle install --path vendor/bundle`
4. Build the site with Jekyll: `bundle exec jekyll build`
5. See the generated content in the `_site/` directory (will be overwritten at each new build)
6. Instead of building you can also serve it locally with automated regeneration (does not contain changes on the site's configuration) with: `bundle exec jekyll serve`


## Configuration

As a general rule all files ending with `.md` are supposed to be modified. Reference between the files is done via their `name` property.
The repository in its current state serves as an example.

The site's configuration is given by the `_config.yaml` file. There one can edit the following arguments:

- the site's `title`,
- a short, general description of the site's content in `description` (optional) and a longer one in `long_description` (optional),
- the site's `url` and `baseurl`,
- `navigation` defines the navigational bar's content and is an array containing the ordered links. Each link consists of
  * the text to show (`title`),
  * a relative link address (`relative_url`), and
  * optionally if it should be shown with a dedicated button on the main site (`show_on_start: true` or `show_on_start: Alternative Title`)
- `category_colors` is an array which will automatically used to give each of the talk's category a different color (CSS compatible syntax required), of which the first one is the default for talk's without category, and
- `time_steps` sets the grid space for the program table in minutes


## Content

### Talks

Each talk is represented by file in the `_talks/` directory. It must begin with valid [YAML Front Matter](https://jekyllrb.com/docs/frontmatter/) containing

- the talk's `name`,
- an existing `room` name in which the talk will take place,
- a start and end date/time (`date_start` and `date_start`, valid [`strftime`](http://www.strfti.me) format, only the time is respected for now),
- one or more existing `speakers` name(s), and
- optionally a `category`

### Speakers

Each speaker is represented by file in the `_speakers/` directory. It must begin with valid [YAML Front Matter](https://jekyllrb.com/docs/frontmatter/) containing

- the speaker's `name` in the format `Last Name, First Name` (the comma is used to abbreviate the speaker's first name in the program)

### Rooms

Each room is represented by file in the `_location/` directory (no ending `s`). It must begin with valid [YAML Front Matter](https://jekyllrb.com/docs/frontmatter/) containing

- the room's `name`

Furthermore, one can edit `location/index.md` to add additional information about the venue's location.

### Additional Pages

Additional static pages can easily be added as `page_name/index.html`. In the repository a `about` and `contact` page are given as example.


## Design

The design is based on [Bootstrap 4](http://getbootstrap.com), might therefore look familiar and should support Bootstrap templates. A more or less current version of the Bootstrap stylesheet is contained in the project (and has its proper [licensing](https://github.com/twbs/bootstrap/blob/v4-dev/LICENSE)).
Minor changes were added and can be found in the `_sass/main.scss` stylesheet.
