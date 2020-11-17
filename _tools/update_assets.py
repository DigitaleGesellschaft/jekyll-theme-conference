#!/usr/bin/env python3

import urllib.request
import urllib.error
import json
import re
import zipfile
import os
import shutil


ASSETS = {
    'bootstrap': {
        'repo': 'twbs/bootstrap',
        'files': [
            {
                'src': 'scss',
                'dest': '_sass/bootstrap'
            },
            {
                'src': 'dist/js/bootstrap.min.js',
                'dest': '_includes/js/bootstrap.js'
            }
        ]
    },
    'font-awesome': {
        'repo': 'FortAwesome/Font-Awesome',
        'asset_id': 1,
        'files': [
            {
                'src': 'scss',
                'dest': '_sass/font-awesome'
            },
            {
                'src': 'webfonts',
                'dest': 'assets/webfonts'
            },
        ]
    },
    'leaflet': {
        'repo': 'Leaflet/Leaflet',
        'files': [
            {
                'src': 'dist/leaflet.css',
                'dest': '_sass/leaflet/leaflet.css'
            },
            {
                'src': 'dist/leaflet.js',
                'dest': '_includes/js/leaflet.js'
            }
        ]
    },
    'leaflet-easybutton': {
        'repo': 'CliffCloud/Leaflet.EasyButton',
        'files': [
            {
                'src': 'src/easy-button.css',
                'dest': '_sass/leaflet/leaflet-easybutton.css'
            },
            {
                'src': 'src/easy-button.js',
                'dest': '_includes/js/leaflet-easybutton.js'
            }
        ]
    },
    'leaflet-locatecontrol': {
        'repo': 'domoritz/leaflet-locatecontrol',
        'files': [
            {
                'src': 'dist/L.Control.Locate.min.css',
                'dest': '_sass/leaflet/leaflet-locatecontrol.css'
            },
            {
                'src': 'dist/L.Control.Locate.min.js',
                'dest': '_includes/js/leaflet-locatecontrol.js'
            }
        ]
    },
    'leaflet-providers': {
        'repo': 'leaflet-extras/leaflet-providers',
        'files': [
            {
                'src': 'leaflet-providers.js',
                'dest': '_includes/js/leaflet-providers.js'
            }
        ]
    },
    'syncscroll': {
        'repo': 'asvd/syncscroll',
        'files': [
            {
                'src': 'syncscroll.js',
                'dest': '_includes/js/syncscroll.js'
            }
        ]
    }
}


def get_url(repo_name, asset_id=None):
    release_url = ("https://api.github.com/repos/" + repo_name +
                   "/releases/latest")
    tag_url = ("https://api.github.com/repos/" + repo_name +
               "/tags")

    try:
        # Get latest release
        with urllib.request.urlopen(release_url) as url:
            # Decode Json received via API
            data = json.loads(url.read().decode())

            # Extract version
            version = data['tag_name']

    except urllib.error.HTTPError:
        # If no release available, get latest tag
        with urllib.request.urlopen(tag_url) as url:
            # Decode Json received via API
            data = json.loads(url.read().decode())

            # Filter tags by semantic version numbers
            regex = re.compile(r'v?[0-9]+\.[0-9]+\.[0-9]')
            data = list(filter(lambda tag: re.match(regex, tag['name']), data))

            # Sort by tag name
            data = sorted(data, key=lambda k: k['name'])

            # Return most recent tag
            data = data[-1]

            # Extract version
            version = data['name']

    # Extract URL
    if asset_id or asset_id == 0:
        url = data['assets'][asset_id]['browser_download_url']
    else:
        url = data['zipball_url']

    return (url, version)


def download_unpack(url, dest='tmp'):
    tmp_file = urllib.request.urlretrieve(url)

    with zipfile.ZipFile(tmp_file[0], 'r') as zip_ref:
        # Get possible subfolder name
        files = zip_ref.namelist()
        first_file = os.path.join(dest, files[0])

        # Extract
        zip_ref.extractall(dest)

        if os.path.isdir(first_file):
            return first_file
        else:
            return os.path.dirname(first_file)


def get_assets(asset_names=None):
    if asset_names is None:
        assets = ASSETS
    else:
        if not isinstance(asset_names, list):
            asset_names = [asset_names]

        assets = {}
        for asset_name in asset_names:
            assets[asset_name] = ASSETS[asset_name]

    return assets


def update(asset_names=None):
    assets = get_assets(asset_names)

    for name, asset in assets.items():
        asset_id = None if 'asset_id' not in asset else asset['asset_id']
        url, version = get_url(asset['repo'], asset_id)
        tmp_path = download_unpack(url, 'tmp')

        for f in asset['files']:
            src_path = os.path.join(tmp_path, f['src'])
            dest_path = f['dest']

            # Move each file individually if source is folder
            # (allows to overwrite existing files)
            items = {}
            if os.path.isdir(src_path):
                for path, subdirs, files in os.walk(src_path):
                    for file in files:
                        src_file = os.path.join(path, file)
                        dest_file = src_file.replace(src_path, dest_path)
                        items[src_file] = dest_file
            else:
                items[src_path] = dest_path

            for src_file, dest_file in items.items():
                # Create destination folder if it does not exist
                dest_folder = os.path.dirname(dest_file)
                if not os.path.exists(dest_folder):
                    os.makedirs(dest_folder)

                # Move file
                shutil.move(src_file, dest_file)

        shutil.rmtree(tmp_path)

        print('{} updated to version {}'.format(name, version))


if __name__ == '__main__':
    import sys

    # Print help
    if len(sys.argv) == 2 and ('help' in sys.argv[1] or sys.argv[1] == '-h'):
        print('Updates all project assets\n' +
              '\n' +
              'Fetches the different required dependencies via ' +
              'releases/tags on Github.\n' +
              'Call with no argument to update all dependencies or use at ' +
              'least one of the \nfollowing:')
        for asset in ASSETS:
            print('  - {}'.format(asset))

    # Update assets
    else:
        # Update all
        if len(sys.argv) == 1:
            assets = None

        # Verify all names
        else:
            error = False
            for asset in sys.argv[1:]:
                if asset not in ASSETS:
                    print('No update rule for "{}" specified.'.format(asset))
                    error = True

            if error:
                sys.exit(1)
            else:
                assets = sys.argv[1:]

        update(assets)
