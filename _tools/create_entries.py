#!/usr/bin/env python3

import os
import csv
import yaml
import json
import re
from unicodedata import normalize
from datetime import datetime


def transform_title(string):
    # replace spaces
    new_string = string.replace(' ', '_')

    # replace special characters (:, /, ...)
    new_string = re.sub(r'(?u)[^-\w]', '', new_string)

    # remove URL unsafe characters (ä, ö, ü, é, è, à, ...)
    new_string = normalize(
        'NFKD', new_string).encode('ASCII', 'ignore').decode("utf-8")

    # work only in lower case
    new_string = new_string.lower()

    return new_string


def escape_markdown(text):
    # escape pipes
    new_text = text.replace('|', '\|')

    return new_text


def parse_csv(file_path):
    with open(file_path, 'r', encoding='utf-8') as csv_file:
        csv_content = csv.reader(csv_file, delimiter=',', quotechar='"')
        csv_content = list(csv_content)

        # use first row as title
        titles = csv_content.pop(0)

        # convert titles
        titles = list(map(transform_title, titles))

        # use rest as data
        content = []
        for row in csv_content:
            entry = {}
            for i, title in enumerate(titles):
                if row[i] and row[i] != 'N/A':
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
        rooms = data['schedule']['conference']['days'][0]['rooms']

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
                                'first_name': speaker_names[0],
                                'bio': speaker['biography']
                                })

                            if len(speaker_names) > 1:
                                content['speakers'][-1]['last_name'] = \
                                    speaker_names[1]
                            else:
                                content['speakers'][-1]['last_name'] = ''

                    content['talks'].append({
                        'name': talk['title'],
                        'speakers':
                            [s['public_name'] for s in talk['persons']],
                        'categories': [talk['track'], talk['type']],
                        'description': talk['description']
                        })

                    # Calculate talk end time
                    talk_start = (talk['start']).split(':')
                    talk_duration = (talk['duration']).split(':')
                    talk_end = [int(talk_start[0]) + int(talk_duration[0]),
                                int(talk_start[1]) + int(talk_duration[1])]
                    talk_end[0] = (talk_end[0] + talk_end[1] // 60) % 24
                    talk_end[1] = talk_end[1] % 60
                    talk_end = "{}:{:02d}".format(talk_end[0], talk_end[1])

                    content['program'].append({
                        'name': talk['title'],
                        'date': day['date'],
                        'time_start': talk['start'],
                        'time_end': talk_end,
                        'room': room
                        })

        return content


default_file_structure = {
    'talks': {
        'folder_name': '_talks',
        'file_name': 'name',
        'file_vars': ['name', 'speakers', 'categories'],
        'file_content': 'description'
    },
    'speakers': {
        'folder_name': '_speakers',
        'file_name': 'name',
        'file_vars': ['name', 'first_name', 'last_name'],
        'file_content': 'bio'
    },
    'rooms': {
        'folder_name': '_rooms',
        'file_name': 'name',
        'file_vars': ['name'],
        'file_content': 'description'
    }
}


def create_files(content, folder_name, file_name, file_vars, file_content,
                 clean=False):
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
        file = transform_title(entry[file_name]) + '.md'
        file_path = os.path.join(folder_name, file)

        # create arrays of variables to show in header of file
        file_data = {}
        for file_var in file_vars:
            if file_var in entry:
                file_data[file_var] = entry[file_var]

        if file_content in entry and entry[file_content]:
            # escape markdown text
            text = escape_markdown(entry[file_content])
        else:
            # if no content add hide variable
            text = None
            file_data['hide'] = True

        # write to file
        with open(file_path, 'w', encoding='utf-8') as f:

            # Write Header
            f.write('---\n')
            yaml.dump(file_data, f,
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
                        help='CSV file to read from')

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
                              help='Category on which output filename for ' +
                                   'Markdown files is based on')
    manual_group.add_argument('--file-vars', type=str, nargs='+',
                              help='Categories which are added as ' +
                                   'variables in the header for the ' +
                                   'Markdown files')
    manual_group.add_argument('--file-content', type=str,
                              help='Category whose content is used as ' +
                                   'file content for the Markdown files')

    manual_group.add_argument('--file-path', type=str,
                              help='Output file path for YAML data list')
    manual_group.add_argument('--data_format', type=str,
                              help='Date format of the date property ' +
                                   '(strptime compatible) to translate' +
                                   'numeric date into weekdays automatically')
    manual_group.add_argument('--lc-time', type=str,
                              help='Locale for weekday translation (e.g. ' +
                                   'de_CH)')

    manual_group.add_argument('-c', '--clean',
                              action='store_const', const=True,
                              help='Delete all existing files (removes ' +
                                   'files not existing in new dataset)')

    args = parser.parse_args()

    if args.frab:
        content = parse_frab(args.file)
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
        elif args.speakers:
            file_args = default_file_structure['speakers']
        elif args.rooms:
            file_args = default_file_structure['rooms']
        else:
            file_args = {}

        # overwrite default settings and/or define remaining settings
        if args.folder_name:
            file_args['folder_name'] = args.folder_name
        if args.file_name:
            file_args['file_name'] = args.file_name
        if args.file_vars:
            file_args['file_vars'] = args.file_vars
        if args.file_content:
            file_args['file_content'] = args.file_content

        # delete files if requested
        if args.clean:
            file_args['clean'] = args.clean

        content = parse_csv(args.file)
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
