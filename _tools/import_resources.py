import requests
import frontmatter
import os
from pathlib import Path
from conference import get_id


ROOT_URL = 'https://pretalx.com'


def get_token(username, password):
    r = requests.post(
        ROOT_URL + '/api/auth/',
        data={'username': username, 'password': password})
    r.raise_for_status()

    return r.json()['token']


def get_header(token):
    return {'Authorization': 'Token {}'.format(token)}


def get_all_talks(token, event):
    r = requests.get(
        ROOT_URL + '/api/events/{}/talks'.format(event),
        params={'state': 'confirmed'},
        headers=get_header(token))
    r.raise_for_status()

    return r.json()


def get_all_resources(token, event):
    talks = get_all_talks(token, event)

    resources = {}
    for talk in talks['results']:
        if 'resources' in talk and talk['resources']:
            title = get_id(talk['title'])
            resources[title] = talk['resources']

    return resources


def download_file(url, path):
    print('Download "{}"'.format(url))
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        with open(path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)


def download_all_resource(resources, folder='documents/slides/'):
    # Create folder if it does not exist
    Path(folder).mkdir(parents=True, exist_ok=True)

    for talk_id, talk_resources in resources.items():
        for resource_id, resource in enumerate(talk_resources):
            filename = talk_id

            if len(talk_resources) > 1:
                filename += '_' + get_id(resource['description'])

            _, file_ext = os.path.splitext(resource['resource'])
            filename += file_ext

            # Download file
            path = folder + filename
            download_file(ROOT_URL + resource['resource'], path)

            # Add filename
            resources[talk_id][resource_id]['filename'] = filename

    return resources


def update_talk(resources, idx, folder='_talks/', ext='.md'):
    # Read talk
    path = folder + idx + ext
    talk = frontmatter.load(path)

    # Reshuffle resources
    file_links = {}
    for resource in resources:
        file_links[resource['filename']] = resource['description']

    # Delete any existing file link
    if 'links' in talk:
        new_links = []
        for link in talk['links']:
            if 'file' not in link or link['file'] not in file_links:
                new_links.append(link)
        talk['links'] = new_links
    else:
        talk['links'] = []

    # Append new links
    for link_file, link_name in file_links.items():
        talk['links'].append({
            'name': link_name,
            'file': link_file
            })

    # Write talk
    with open(path, 'wb') as f:
        frontmatter.dump(talk, f)


def update_talks(resources, folder='_talks/', ext='.md'):
    for talk_id, talk_resources in resources.items():
        update_talk(talk_resources, talk_id, folder, ext)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description='Import Pretalx resources.')
    parser.add_argument('event', metavar='EVENT',
                        help='Event slug for Pretalx event')

    pretalx_group = parser.add_argument_group('Pretalx options')
    pretalx_group.add_argument('-t', '--token',
                               type=str,
                               help='Pretalx API token (if not present,' +
                                    'will ask for authentication instead)')
    pretalx_group.add_argument('-p', '--pretalx',
                               type=str, default=ROOT_URL,
                               help='Alternative Pretalx instance (default: ' +
                                    '"{}"'.format(ROOT_URL))

    file_group = parser.add_argument_group('File options')
    file_group.add_argument('--file-folder',
                            type=str, default='documents/slides/',
                            help='Folder to save files to (default: ' +
                                 '"documents/slides/"")')
    file_group.add_argument('--talk-folder',
                            type=str, default='_talks/',
                            help='Talk folder location (default: "_talks/"")')
    file_group.add_argument('--talk-ext',
                            type=str, default='.md',
                            help='Talk file extension (default: ".md")')

    args = parser.parse_args()

    # Overwrite global variable
    ROOT_URL = args.pretalx

    if not args.token:
        from getpass import getpass

        print('Authenticate for {}'.format(ROOT_URL))
        try:
            username = input('Username: ')
            password = getpass('Password: ')
        except KeyboardInterrupt:
            exit()

        # Get token
        try:
            token = get_token(username, password)
        except requests.HTTPError:
            print('Authenticate failed!')
            exit()
        else:
            print('API Token: {}'.format(token))
            print()
    else:
        token = args.token

    print('Query all talks...')
    resources = get_all_resources(token, args.event)

    print('\nDownload all resources...')
    resources = download_all_resource(resources, args.file_folder)

    print('\nUpdate talks...')
    update_talks(resources, args.talk_folder, args.talk_ext)

    print('\nDone!')
