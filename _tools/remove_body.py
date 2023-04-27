# for each yaml file in _talks, remove all text after the second ---
# and save the file back to _talks

import os
import yaml

directory = '_talks'

for filename in os.listdir(directory):
    if filename.endswith(".md"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as file:
            data = file.read()
        if '---' in data:
            index = data.index('---', data.index('---') + 1)
            data = data[:index] + '\n---'
        with open(filepath, 'w') as file:
            file.write(data)