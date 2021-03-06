import re
from unicodedata import normalize


def get_id(title):
    # replace spaces
    new_string = title.replace(' ', '_')

    # replace special characters (:, /, ...)
    new_string = re.sub(r'(?u)[^-\w]', '', new_string)

    # remove URL unsafe characters (ä, ö, ü, é, è, à, ...)
    new_string = normalize(
        'NFKD', new_string).encode('ASCII', 'ignore').decode("utf-8")

    # work only in lower case
    new_string = new_string.lower()

    return new_string
