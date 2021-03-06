#!/usr/bin/env python3

import os
import csv
import yaml
import json
from datetime import datetime
from conference import get_id


def escape_markdown(text):
    # escape pipes
    new_text = text.replace('|', '\\|')

    return new_text


def parse_csv(file_path, keep_fields=[]):
    with open(file_path, 'r', encoding='utf-8') as csv_file:
        csv_content = csv.reader(csv_file, delimiter=',', quotechar='"')
        csv_content = list(csv_content)

        # use first row as title
        titles = csv_content.pop(0)

        # convert titles
        titles = list(map(get_id, titles))

        # use rest as data
        content = []
        for row in csv_content:
            entry = {}
            for i, title in enumerate(titles):
                if row[i] and row[i] != 'N/A':
                    if len(keep_fields) > 0 and title not in keep_fields:
                        continue
                    if title not in entry:
                        entry[title] = row[i]
                    elif not isinstance(entry[title], list):
                        entry[title] = [entry[title], row[i]]
                    else:
                        entry[title].append(row[i])
            content.append(entry)

        return content


def parse_frab(file_path):
    with open(file_path, 'r', encoding='utf-8') as frab_file:
        data = json.load(frab_file)

        content = {
            'talks': [],
            'speakers': [],
            'rooms': [],
            'program': []
        }

        for day in data['schedule']['conference']['days']:
            for room, talks in day['rooms'].items():
                if room not in [r['name'] for r in content['rooms']]:
                    content['rooms'].append({
                        'name': room,
                        'description': ''
                        })

                for talk in sorted(talks, key=lambda t: t['start']):

                    for speaker in talk['persons']:
                        speaker_name = speaker['public_name']

                        if speaker_name not in \
                           [s['name'] for s in content['speakers']]:
                            speaker_names = speaker_name.rsplit(' ', 1)
                            content['speakers'].append({
                                'name': speaker_name,
                                'bio': speaker['biography']
                                })

                            # Always provide a last name
                            if len(speaker_names) > 1:
                                content['speakers'][-1]['first_name'] = \
                                    speaker_names[0]
                                content['speakers'][-1]['last_name'] = \
                                    speaker_names[1]
                            else:
                                content['speakers'][-1]['first_name'] = ''
                                content['speakers'][-1]['last_name'] = \
                                    speaker_names[0]

                    abstract = talk['abstract']
                    description = talk['description']

                    # Append abstract to description if contains more than one
                    # word
                    if description != '' and len(abstract.split()) > 1:
                        text = '{{:.lead}}\n{}\n\n{}'.format(
                            talk['abstract'], description)
                    elif description != '':
                        text = description
                    elif len(abstract.split()) > 1:
                        text = abstract
                    else:
                        text = ''

                    content['talks'].append({
                        'name': talk['title'],
                        'speakers':
                            [s['public_name'] for s in talk['persons']],
                        'categories': [talk['track'], talk['type']],
                        'description': text
                        })

                    # Calculate talk end time
                    talk_start = (talk['start']).split(':')
                    talk_duration = (talk['duration']).split(':')

                    talk_end = [0,
                                int(talk_start[0]) + int(talk_duration[0]),
                                int(talk_start[1]) + int(talk_duration[1])]
                    talk_end[1] = (talk_end[1] + talk_end[2] // 60)
                    talk_end[2] %= 60
                    talk_end[0] = (talk_end[0] + talk_end[1] // 24)
                    talk_end[1] %= 24

                    # Indicate if talk is overlapping into next day
                    talk_end = '{:02d}:{:02d}{}'.format(
                        talk_end[1], talk_end[2],
                        ' +{}'.format(talk_end[0]) if talk_end[0] > 0 else '')

                    content['program'].append({
                        'name': talk['title'],
                        'date': day['date'],
                        'time_start': talk['start'],
                        'time_end': talk_end,
                        'room': room
                        })

        return content


def extend_content(content, file_path):
    # read file
    with open(file_path, 'r', encoding='utf-8') as const_file:
        info = yaml.safe_load(const_file)

    # combine dictionaries per name
    for category, entries in info.items():
        if category in content:
            for entry in entries:
                # get index of existing entry in content
                idx = next((idx for idx, item in enumerate(content[category])
                            if item['name'] == entry['name']), None)

                if idx:
                    # extend existing entry
                    for attr_name, attr_val in entry.items():
                        if attr_name != 'name':
                            content[category][idx][attr_name] = attr_val
                else:
                    # add new entry
                    content[category].append(entry)

    return content


default_file_structure = {
    'talks': {
        'folder_name': '_talks',
        'file_name': 'name',
        'file_content': 'description'
    },
    'speakers': {
        'folder_name': '_speakers',
        'file_name': 'name',
        'file_content': 'bio'
    },
    'rooms': {
        'folder_name': '_rooms',
        'file_name': 'name',
        'file_content': 'description'
    }
}
default_file_attrs = {
    'talks': ['name', 'speakers', 'categories'],
    'speakers': ['name', 'first_name', 'last_name'],
    'rooms': ['name']
}


def create_files(content, folder_name, file_name, file_content, clean=False):
    # verify if folder exists, otherwise create it
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)

    # otherwise, delete if requested
    elif clean:
        for root, dirs, files in os.walk(folder_name):
            for f in files:
                os.unlink(os.path.join(root, f))

    for entry in content:
        # create file title
        file = get_id(entry[file_name]) + '.md'
        file_path = os.path.join(folder_name, file)

        # extract main content
        text = None
        if file_content in entry:
            if entry[file_content]:
                # escape markdown text
                text = escape_markdown(entry[file_content])

            # delete entry
            del entry[file_content]

        # if no content add hide variable
        if not text:
            entry['hide'] = True

        # write to file
        with open(file_path, 'w', encoding='utf-8') as f:

            # Write Header
            f.write('---\n')
            yaml.dump(entry, f,
                      encoding='utf-8', allow_unicode=True,
                      default_flow_style=False)
            f.write('---\n')

            # Write Body
            if text:
                f.write(text)


default_program_structure = {
    'file_path': os.path.join('_data', 'program.yml'),
    'date_format': '%Y-%m-%d'
}


def create_program(content, file_path, date_format=None, lc_time=None):
    # verify if folder exists, otherwise create it
    if not os.path.exists(os.path.dirname(file_path)):
        os.makedirs(os.path.dirname(file_path))

    # Get date type from first entry
    if any(c.isalpha() for c in content[0]['date']):
        date_prop = 'name'
        date_format = None
    else:
        date_prop = 'date'

    data = {'days': []}
    for entry in content:
        day_idx = next((idx for idx, d in enumerate(data['days'])
                        if d[date_prop] == entry['date']), None)

        if day_idx is None:
            if date_format:
                if lc_time:
                    import locale
                    locale.setlocale(locale.LC_TIME, lc_time)

                date = datetime.strptime(entry['date'], date_format)
                new_day = {
                    'name': date.strftime('%A'),
                    'abbr': date.strftime('%a'),
                    'date': date.strftime('%Y-%m-%d'),
                    'rooms': []
                }

            else:
                new_day = {
                    date_prop: entry['date'],
                    'rooms': []
                }

            data['days'].append(new_day)
            day_idx = len(data['days'])-1

        room_idx = next((
            idx for idx, d in enumerate(data['days'][day_idx]['rooms'])
            if d['name'] == entry['room']), None)

        if room_idx is None:
            data['days'][day_idx]['rooms'].append({
                'name': entry['room'],
                'talks': []
            })
            room_idx = len(data['days'][day_idx]['rooms'])-1

        data['days'][day_idx]['rooms'][room_idx]['talks'].append({
            'name': entry['name'],
            'time_start': entry['time_start'],
            'time_end': entry['time_end'],
        })

    with open(file_path, 'w', encoding='utf-8') as f:
        yaml.dump(data, f,
                  encoding='utf-8', allow_unicode=True,
                  default_flow_style=False)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description='Generate Markdown and YAML files for Jekyll based on ' +
                    'a CSV table or a JSON file (frab compatible).')
    parser.add_argument('file', metavar='FILE',
                        help='CSV/JSON file to read from')

    default_group = parser.add_argument_group('default options')

    default_group.add_argument('-f', '--frab',
                               action='store_const', const=True,
                               help='Create Markdown files from frab ' +
                                    'compatible schedule (overwrites ' +
                                    'remaining arguments and deletes ' +
                                    'existing files)')

    default_group.add_argument('-t', '--talks',
                               action='store_const', const=True,
                               help='Create Markdown files for talks')
    default_group.add_argument('-s', '--speakers',
                               action='store_const', const=True,
                               help='Create Markdown files for speakers')
    default_group.add_argument('-r', '--rooms',
                               action='store_const', const=True,
                               help='Create Markdown files for rooms')
    default_group.add_argument('-p', '--program',
                               action='store_const', const=True,
                               help='Create YAML data file for program')

    manual_group = parser.add_argument_group('manual options')

    manual_group.add_argument('--create-files',
                              action='store_const', const=True,
                              help='Create Markdown files')
    manual_group.add_argument('--folder-name', type=str,
                              help='Output folder for Markdown files')
    manual_group.add_argument('--file-name', type=str,
                              help='Field name on which output filename for ' +
                                   'Markdown files is based on')
    manual_group.add_argument('--file-attrs', type=str, nargs='+',
                              help='Field names which are added as ' +
                                   'attributes in the header for the ' +
                                   'Markdown files')
    manual_group.add_argument('--file-content', type=str,
                              help='Field name whose content is used as ' +
                                   'main content for the Markdown files')

    add_group = parser.add_argument_group('additional options')

    add_group.add_argument('--file-path', type=str,
                           help='Output file path for YAML data list')
    add_group.add_argument('--data_format', type=str,
                           help='Date format of the date property (strptime ' +
                                'compatible) to translate numeric date into ' +
                                'weekdays automatically')
    add_group.add_argument('--lc-time', type=str,
                           help='Locale for weekday translation (e.g. de_CH)')

    add_group.add_argument('--info', type=str,
                           help='File containing additional arguments to be ' +
                                'added to specific talks/speakers/rooms')
    add_group.add_argument('-c', '--clean',
                           action='store_const', const=True,
                           help='Delete all existing files (removes files ' +
                                'not existing in new dataset)')

    args = parser.parse_args()

    if args.frab:
        content = parse_frab(args.file)
        if args.info:
            content = extend_content(content, args.info)

        create_files(content['talks'], **default_file_structure['talks'],
                     clean=True)
        create_files(content['speakers'], **default_file_structure['speakers'],
                     clean=True)
        create_files(content['rooms'], **default_file_structure['rooms'],
                     clean=True)
        create_program(content['program'], **default_program_structure,
                       lc_time=args.lc_time)

    elif args.talks or args.speakers or args.rooms or args.create_files:
        # get default settings
        if args.talks:
            file_args = default_file_structure['talks']
            file_attrs = default_file_attrs['talks']
        elif args.speakers:
            file_args = default_file_structure['speakers']
            file_attrs = default_file_attrs['speakers']
        elif args.rooms:
            file_args = default_file_structure['rooms']
            file_attrs = default_file_attrs['rooms']
        else:
            file_args = {}
            file_attrs = []

        # overwrite default settings and/or define remaining settings
        if args.folder_name:
            file_args['folder_name'] = args.folder_name
        if args.file_name:
            file_args['file_name'] = args.file_name
        if args.file_attrs:
            file_attrs = args.file_attrs
        if args.file_content:
            file_args['file_content'] = args.file_content

        # delete files if requested
        if args.clean:
            file_args['clean'] = args.clean

        content = parse_csv(args.file, file_attrs + file_args['file_content'])
        if args.info:
            content = extend_content(content, args.info)

        create_files(content, **file_args)

    elif args.program:
        # get default settings
        program_args = default_program_structure

        # overwrite default settings and/or define remaining settings
        if args.file_path:
            file_args['file_path'] = args.file_path
        if args.data_format:
            file_args['data_format'] = args.data_format
        if args.lc_time:
            file_args['lc_time'] = args.lc_times

        content = parse_csv(args.file)
        create_program(content, **program_args)
