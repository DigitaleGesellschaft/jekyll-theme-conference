#!/usr/bin/env python3

import os
import csv
import yaml
import json
import re
from unicodedata import normalize


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

        for room, talks in rooms.items():
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
                    'speakers': [s['public_name'] for s in talk['persons']],
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
        'folder_name': '_location',
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


default_list_structure = {
    'program': {
        'file_path': os.path.join('_data', 'program.yml'),
        'list_sorting': 'room',
        'sublist_name': 'talks',
        'sublist_categories': ['name', 'time_start', 'time_end']
    }
}


def create_list(content, file_path,
                list_sorting, sublist_name, sublist_categories):
    # verify if folder exists, otherwise create it
    if not os.path.exists(os.path.dirname(file_path)):
        os.makedirs(os.path.dirname(file_path))

    # collect all possible entries from content
    list_titles = []
    for entry in content:
        if entry[list_sorting] not in list_titles:
            list_titles.append(entry[list_sorting])

    # create list of dicts
    data = []
    for list_title in list_titles:
        new_entries = []
        for entry in content:
            if entry[list_sorting] == list_title:

                new_entry = {}
                for sublist_category in sublist_categories:
                    new_entry[sublist_category] = \
                        entry[sublist_category]

                new_entries.append(new_entry)

        data.append({
            list_sorting: list_title,
            sublist_name: new_entries})

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

    manual_group.add_argument('--create-list',
                              action='store_const', const=True,
                              help='Create YAML data list')
    manual_group.add_argument('--file-path', type=str,
                              help='Output file path for YAML data list')
    manual_group.add_argument('--list-sorting', type=str,
                              help='Category by which data is sorted and ' +
                                   'split (top level of list)')
    manual_group.add_argument('--sublist-name', type=str,
                              help='Name under which entries are listed')
    manual_group.add_argument('--sublist-categories', type=str, nargs='+',
                              help='Categories which are added to list ' +
                                   'per entry')

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
        create_list(content['program'], **default_list_structure['program'])

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

    elif args.program or args.create_list:
        # get default settings
        if args.program:
            list_args = default_list_structure['program']
        else:
            list_args = {}

        # overwrite default settings and/or define remaining settings
        if args.file_path:
            list_args['file_path'] = args.file_path
        if args.list_sorting:
            list_args['list_sorting'] = args.list_sorting
        if args.sublist_name:
            list_args['sublist_name'] = args.sublist_name
        if args.sublist_categories:
            list_args['sublist_categories'] = args.sublist_categories

        content = parse_csv(args.file)
        create_list(content, **list_args)
