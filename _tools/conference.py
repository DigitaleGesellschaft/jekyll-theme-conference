import re
from unicodedata import normalize


def get_id(string):
    # work only in lower case
    string = string.lower()

    # remove URL unsafe characters (ä, ö, ü, é, è, à, ...)
    string = normalize(
        'NFKD', string).encode('ASCII', 'ignore').decode('utf-8')

    # replace spaces
    string = string.replace(' ', '_')

    # replace dashes
    string = string.replace('-', '_')

    # remove remaining special characters (:, /, ...)
    string = re.sub(r'(?u)[^-\w]', '', string)

    # remove consecutive underscores
    string = re.sub('_+','_', string)

    return string
