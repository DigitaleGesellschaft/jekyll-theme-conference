import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "_tools"))

import import_resources  # noqa: E402
import import_schedule  # noqa: E402


def frab(title: str, person: str, room: str, abstract: str) -> dict:
    return {
        "schedule": {
            "conference": {
                "rooms": [{"name": room, "description": ""}],
                "days": [
                    {
                        "date": "2026-02-20",
                        "rooms": {
                            room: [
                                {
                                    "title": title,
                                    "start": "09:00",
                                    "duration": "00:30",
                                    "abstract": abstract,
                                    "description": "",
                                    "track": "Main <b>",
                                    "language": "en",
                                    "persons": [{"public_name": person, "biography": ""}],
                                }
                            ]
                        },
                    }
                ],
            }
        }
    }


class TestImportSchedule(unittest.TestCase):
    def setUp(self) -> None:
        data = frab(
            title="Talk <script>alert(1)</script> & more",
            person="Eve <i>Evil</i>",
            room="Room <B>",
            abstract="Hello <img src=x onerror=alert(1)> see <https://example.org> & 1 < 2",
        )
        self.content = import_schedule.parse_frab(data)

    def test_strips_tags_from_names(self) -> None:
        talk = self.content["talks"][0]

        self.assertEqual(talk["name"], "Talk alert(1) & more")
        self.assertEqual(talk["speakers"], ["Eve Evil"])
        self.assertEqual(talk["track"], "Main")
        self.assertEqual(talk["lang"], "en")
        self.assertEqual(self.content["speakers"][0]["name"], "Eve Evil")
        self.assertEqual(self.content["rooms"][0]["name"], "Room")
        self.assertEqual(self.content["program"][0]["name"], talk["name"])
        self.assertEqual(self.content["program"][0]["room"], "Room")

    def test_neutralises_tags_in_descriptions(self) -> None:
        description = self.content["talks"][0]["description"]

        self.assertNotIn("<img", description)
        self.assertIn("&lt;img", description)
        self.assertIn("<https://example.org>", description)
        self.assertIn("1 < 2", description)


class TestImportScheduleEdition(unittest.TestCase):
    # Import a schedule into a new site folder, e.g. with "--edition", "2025"
    def import_frab(self, *args: str) -> Path:
        output_dir = Path(self.enterContext(tempfile.TemporaryDirectory()))
        (output_dir / "schedule.json").write_text(json.dumps(frab("Talk", "Ada", "Room", "")))

        self.import_frab_into(output_dir, *args)
        return output_dir

    def import_frab_into(self, output_dir: Path, *args: str) -> None:
        frab_file = output_dir / "schedule.json"
        argv = ["import_schedule.py", str(frab_file), "--output-dir", str(output_dir), *args]
        with mock.patch.object(sys, "argv", argv), redirect_stdout(io.StringIO()):
            import_schedule.main()

    def test_writes_single_edition_to_site(self) -> None:
        output_dir = self.import_frab()

        self.assertTrue((output_dir / "_talks" / "talk.md").is_file())
        self.assertTrue((output_dir / "_data" / "program.yml").is_file())

    def test_writes_edition_to_its_folders(self) -> None:
        output_dir = self.import_frab("--edition", "2025")

        self.assertTrue((output_dir / "_talks" / "2025" / "talk.md").is_file())
        self.assertTrue((output_dir / "_speakers" / "2025" / "ada.md").is_file())
        self.assertTrue((output_dir / "_rooms" / "2025" / "room.md").is_file())
        self.assertTrue((output_dir / "_data" / "programs" / "2025.yml").is_file())
        self.assertFalse((output_dir / "_data" / "program.yml").exists())

    def test_creates_missing_edition_pages(self) -> None:
        output_dir = self.import_frab("--edition", "2025")
        program_page = output_dir / "2025" / "program" / "index.md"

        self.assertIn("layout: program", program_page.read_text())
        self.assertIn("layout: talk-overview", (output_dir / "2025" / "talks" / "index.md").read_text())
        self.assertIn("layout: speaker-overview", (output_dir / "2025" / "speakers" / "index.md").read_text())

        # Existing pages are kept
        program_page.write_text("---\nlayout: program\ntitle: Own\n---\n")
        self.import_frab_into(output_dir, "--edition", "2025")
        self.assertIn("title: Own", program_page.read_text())


class TestImportResources(unittest.TestCase):
    def test_allows_document_extensions_only(self) -> None:
        self.assertEqual(import_resources.get_file_ext("/media/slides.PDF"), ".pdf")
        self.assertIsNone(import_resources.get_file_ext("/media/page.html"))
        self.assertIsNone(import_resources.get_file_ext("/media/image.svg"))
        self.assertIsNone(import_resources.get_file_ext("/media/noext"))


if __name__ == "__main__":
    unittest.main()
