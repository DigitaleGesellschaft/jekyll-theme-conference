import requests
import frontmatter
from typing import Dict, List, Any
from pathlib import Path
from unicodedata import normalize
from urllib.parse import urljoin
import re


def get_token(base_url: str, username: str, password: str) -> str:
    r = requests.post(
        urljoin(base_url, "/api/auth/"),
        data={"username": username, "password": password},
    )
    r.raise_for_status()
    return r.json()["token"]


def get_header(token: str) -> Dict[str, str]:
    return {"Authorization": f"Token {token}"}


def get_id(string: str) -> str:
    # work only in lower case
    string = string.lower()

    # remove URL unsafe characters (ä, ö, ü, é, è, à, ...)
    string = normalize("NFKD", string).encode("ASCII", "ignore").decode("utf-8")

    # replace spaces
    string = string.replace(" ", "_")

    # replace dashes
    string = string.replace("-", "_")

    # remove remaining special characters (:, /, ...)
    string = re.sub(r"(?u)[^-\w]", "", string)

    # remove consecutive underscores
    string = re.sub("_+", "_", string)

    return string


def get_all_talks(base_url: str, token: str, event: str) -> Dict[str, Any]:
    r = requests.get(
        urljoin(base_url, f"/api/events/{event}/talks"),
        params={"state": "confirmed"},
        headers=get_header(token),
    )
    r.raise_for_status()

    return r.json()


def get_all_resources(
    base_url: str, token: str, event: str
) -> Dict[str, List[Dict[str, str]]]:
    talks = get_all_talks(base_url, token, event)

    resources: Dict[str, List[Dict[str, str]]] = {}
    for talk in talks["results"]:
        if "resources" in talk and talk["resources"]:
            title = get_id(talk["title"])
            resources[title] = talk["resources"]

    return resources


def download_file(url: str, path: Path) -> None:
    print(f'Download "{url}"')
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        with open(path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)


def download_all_resource(
    base_url: str,
    resources: Dict[str, List[Dict[str, str]]],
    folder: Path = Path("documents", "slides"),
) -> Dict[str, List[Dict[str, str]]]:
    # Create folder if it does not exist
    folder.mkdir(parents=True, exist_ok=True)

    for talk_id, talk_resources in resources.items():
        for resource_id, resource in enumerate(talk_resources):
            # Create file name
            filename = talk_id

            if len(talk_resources) > 1:
                filename += "_" + get_id(resource["description"])

            file_ext = Path(resource["resource"]).suffix
            filename += file_ext

            file_path = folder / filename

            # Download file
            full_url = urljoin(base_url, resource["resource"])
            download_file(full_url, file_path)

            # Add filename
            resources[talk_id][resource_id]["filename"] = str(file_path.name)

    return resources


def update_talk(
    resources: List[Dict[str, str]],
    idx: str,
    folder: Path = Path("_talks"),
    ext: str = ".md",
) -> None:
    file = Path(folder) / (idx + ext)
    talk = frontmatter.load(str(file))

    # Reshuffle resources
    file_links = {res["filename"]: res["description"] for res in resources}

    # Delete any existing file link
    if "links" in talk:
        talk["links"] = [
            link
            for link in talk["links"]
            if "file" not in link or link["file"] not in file_links
        ]
    else:
        talk["links"] = []

    # Append new links
    for link_file, link_name in file_links.items():
        talk["links"].append({"name": link_name, "file": link_file})

    # Write talk
    with open(file, "wb") as f:
        frontmatter.dump(talk, f)


def update_talks(
    resources: Dict[str, List[Dict[str, str]]],
    folder: Path = Path("_talks"),
    ext: str = ".md",
) -> None:
    for talk_id, talk_resources in resources.items():
        update_talk(talk_resources, talk_id, folder, ext)


if __name__ == "__main__":
    import argparse
    from getpass import getpass

    parser = argparse.ArgumentParser(description="Import Pretalx resources.")
    parser.add_argument("event", metavar="EVENT", help="Event slug for Pretalx event")

    pretalx_group = parser.add_argument_group("Pretalx options")
    pretalx_group.add_argument(
        "-p",
        "--pretalx",
        type=str,
        default="https://pretalx.com",
        help='Alternative Pretalx instance (default: "https://pretalx.com")',
    )
    pretalx_group.add_argument(
        "-t",
        "--token",
        type=str,
        help="Pretalx API token (if not present, will ask for authentication instead)",
    )

    file_group = parser.add_argument_group("File options")
    file_group.add_argument(
        "--file-folder",
        type=str,
        default="documents/slides/",
        help='Folder to save files to (default: "documents/slides/")',
    )
    file_group.add_argument(
        "--talk-folder",
        type=str,
        default="_talks/",
        help='Talk folder location (default: "_talks/")',
    )
    file_group.add_argument(
        "--talk-ext",
        type=str,
        default=".md",
        help='Talk file extension (default: ".md")',
    )

    args = parser.parse_args()
    base_url = args.pretalx

    if not args.token:
        print(f"Authenticate for {base_url}")
        try:
            username = input("Username: ")
            password = getpass("Password: ")
        except KeyboardInterrupt:
            exit()

        # Get token
        try:
            token = get_token(base_url, username, password)
        except requests.HTTPError:
            print("Authentication failed!")
            exit()
        else:
            print(f"API Token: {token}\n")
    else:
        token = args.token

    print("Query all talks...")
    resources = get_all_resources(base_url, token, args.event)

    print("\nDownload all resources...")
    resources = download_all_resource(base_url, resources, args.file_folder)

    print("\nUpdate talks...")
    update_talks(resources, args.talk_folder, args.talk_ext)

    print("\nDone!")
