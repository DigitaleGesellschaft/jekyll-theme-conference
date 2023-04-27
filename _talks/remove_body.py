# for each yaml file in _talks, remove all text after the second ---
# and save the file back to _talks

import os
import yaml

directory = '_talks'

for filename in os.listdir(directory):
    if filename.endswith(".yaml"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as file:
            data = yaml.load(file, Loader=yaml.FullLoader)
        # remove all text after the second '---'
        if '---' in data:
            # find the index of the second '---'
            index = data.index('---', data.index('---') + 1)
            # remove all text after the second '---'
            data = data[:index]
        with open(filepath, 'w') as file:
            yaml.dump(data, file)