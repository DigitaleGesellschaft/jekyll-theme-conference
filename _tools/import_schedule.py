import json
import re
import yaml
import argparse
from pathlib import Path
from unicodedata import normalize
from datetime import datetime
import locale
from typing import List, Dict, Any, Optional


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


def escape_markdown(text: str) -> str:
    # escape pipes
    new_text = text.replace("|", "\\|")

    return new_text


def get_room(room_data: Dict[str, Any]) -> Dict[str, str]:
    description = (
        room_data["description"]
        if "description" in room_data and room_data["description"]
        else ""
    ).strip()

    room = {"name": room_data.get("name", ""), "description": description}

    if not description:
        room["hide"] = True

    return room


def get_speaker(speaker_data: Dict[str, Any]) -> Dict[str, str]:
    description = (
        speaker_data["biography"]
        if "biography" in speaker_data and speaker_data["biography"]
        else ""
    ).strip()

    speaker = {
        "name": speaker_data.get("public_name", "Anonymous"),
        "first_name": "",
        "last_name": "",
        "description": description,
    }

    if not description:
        speaker["hide"] = True

    parts = speaker["name"].rsplit(" ", 1)
    if len(parts) > 1:
        speaker["first_name"] = parts[0]
        speaker["last_name"] = parts[1]
    else:
        speaker["last_name"] = parts[0]

    return speaker


def format_talk_description(abstract: str, description: str) -> str:
    abstract = abstract.strip()
    description = description.strip()

    has_abstract = len(abstract.split()) > 1
    has_description = bool(description)

    if has_description and has_abstract:
        return f"{{:.lead}}\n{abstract}\n\n{description}"
    elif has_description:
        return description
    elif has_abstract:
        return abstract
    else:
        return ""


def get_time_end(time_start: str, duration: str) -> str:
    start_h, start_m = map(int, time_start.split(":"))
    duration_h, duration_m = map(int, duration.split(":"))

    total_minutes: int = (start_h * 60 + start_m) + (duration_h * 60 + duration_m)
    end_h: int = (total_minutes // 60) % 24
    end_m: int = total_minutes % 60

    return f"{end_h:02d}:{end_m:02d}"


def parse_frab(data: str) -> Dict[str, List[Dict[str, str]]]:
    content: Dict[str, List[Dict[str, str]]] = {
        "talks": [],
        "speakers": [],
        "rooms": [],
        "program": [],
    }

    # Rooms
    content["rooms"] = [
        get_room(room_data) for room_data in data["schedule"]["conference"]["rooms"]
    ]

    for day in data["schedule"]["conference"]["days"]:
        for room_name, talks in day["rooms"].items():
            talks = sorted(talks, key=lambda t: t["start"])

            for talk in talks:
                # Speakers
                for speaker_data in talk["persons"]:
                    content["speakers"].append(get_speaker(speaker_data))

                # Talks
                new_talk = {
                    "name": talk["title"],
                    "speakers": [s["public_name"] for s in talk["persons"]],
                    "track": talk.get("track", ""),
                    "tags": [],
                    "description": format_talk_description(
                        talk.get("abstract", ""), talk.get("description", "")
                    ),
                }

                if talk.get("type"):
                    new_talk["tags"].append(talk.get("type"))

                #   Add "do not record" indication as tag
                if talk.get("do_not_record"):
                    new_talk["tags"].append("No recording")

                content["talks"].append(new_talk)

                # Program
                time_end: str = get_time_end(talk["start"], talk["duration"])

                content["program"].append(
                    {
                        "name": talk["title"],
                        "date": day["date"],
                        "time_start": talk["start"],
                        "time_end": time_end,
                        "room": room_name,
                    }
                )

    return content


def create_content_files(
    content: List[Dict[str, str]],
    output_dir: Path,
    clean: bool = False,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    if clean:
        for f in output_dir.iterdir():
            if f.is_file() and f.suffix == ".md":
                f.unlink()

    for entry in content:
        file_name = get_id(entry["name"]) + ".md"
        file_path = output_dir / file_name

        body = entry["description"]
        header = {
            key: escape_markdown(value) if isinstance(value, str) else value
            for key, value in entry.items()
            if key != "description"
        }

        with open(file_path, "w", encoding="utf-8") as f:
            f.write("---\n")
            yaml.dump(
                header,
                f,
                encoding="utf-8",
                allow_unicode=True,
                default_flow_style=False,
            )
            f.write("---\n")
            f.write(body)


def create_program_file(
    content: List[Dict[str, str]],
    output_path: Path,
    date_format: Optional[str] = None,
    lc_time: Optional[str] = None,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if lc_time:
        try:
            locale.setlocale(locale.LC_TIME, lc_time)
        except locale.Error:
            print(
                f"Warning: Could not set locale to '{lc_time}'. Day names might not be "
                "localized."
            )

    # Generate program
    program = {"days": []}

    for entry in content:
        # Create new day if needed
        day_entry = None
        for day in program["days"]:
            if day["date"] == entry["date"]:
                day_entry = day
                break

        if day_entry is None:
            new_day: Dict[str, Any]
            if date_format:
                parsed_date = datetime.strptime(entry["date"], date_format)
                new_day = {
                    "name": parsed_date.strftime("%A"),  # Full weekday name
                    "abbr": parsed_date.strftime("%a"),  # Abbreviated weekday name
                    "date": parsed_date.strftime("%Y-%m-%d"),
                    "rooms": [],
                }
            else:
                new_day = {
                    "date": entry["date"],
                    "rooms": [],
                }

            program["days"].append(new_day)
            day_entry = new_day

        # Create new room if needed
        room_entry = None
        for room in day_entry["rooms"]:
            if room["name"] == entry["room"]:
                room_entry = room
                break

        if room_entry is None:
            new_room = {"name": entry["room"], "talks": []}

            day_entry["rooms"].append(new_room)
            room_entry = new_room

        # Add talk to the room
        room_entry["talks"].append(
            {
                "name": entry["name"],
                "time_start": entry["time_start"],
                "time_end": entry["time_end"],
            }
        )

    # Sort program
    program["days"] = sorted(program["days"], key=lambda d: d["date"])

    for day in program["days"]:
        for room in day["rooms"]:
            room["talks"] = sorted(room["talks"], key=lambda t: t["time_start"])

    # Write program to file
    with open(output_path, "w", encoding="utf-8") as f:
        yaml.dump(
            program,
            f,
            encoding="utf-8",
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
        )


def main():
    parser = argparse.ArgumentParser(
        description="Parse Frab schedule JSON and generate content files."
    )
    parser.add_argument(
        "frab_file", type=Path, help="Path to the input Frab JSON file."
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("."),
        help="Base directory for output files (default: current folder)",
    )
    parser.add_argument(
        "--date-format",
        type=str,
        default="%Y-%m-%d",
        help="Python datetime format string for parsing dates in the program. "
        "Defaults to '%%Y-%%m-%%d'. Set to empty string if dates are not parseable.",
    )
    parser.add_argument(
        "--lc-time",
        type=str,
        default=None,
        help="Locale string for formatting day names (e.g., 'en_US.utf8', 'fr_FR.utf8'). "
        "Requires locale to be installed on the system.",
    )

    args = parser.parse_args()

    if not args.frab_file.is_file():
        print(f"Error: Frab file not found at {args.frab_file}")
        return

    try:
        with open(args.frab_file, "r", encoding="utf-8") as frab_file:
            data = json.load(frab_file)
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {args.frab_file}")
        return
    except Exception as e:
        print(f"Error reading Frab file: {e}")
        return

    content = parse_frab(data)

    # Define output directories
    rooms_dir = args.output_dir / "_rooms"
    speakers_dir = args.output_dir / "_speakers"
    talks_dir = args.output_dir / "_talks"
    program_file = args.output_dir / "_data" / "program.yml"

    # Create content files
    print(f"Creating room files in {rooms_dir}...")
    create_content_files(content["rooms"], rooms_dir, True)

    print(f"Creating speaker files in {speakers_dir}...")
    create_content_files(content["speakers"], speakers_dir, True)

    print(f"Creating talk files in {talks_dir}...")
    create_content_files(content["talks"], talks_dir, True)

    # Create program file
    print(f"Creating program file at {program_file}...")
    create_program_file(
        content["program"], program_file, args.date_format, args.lc_time
    )

    print("Frab parsing and file creation complete.")


if __name__ == "__main__":
    main()
