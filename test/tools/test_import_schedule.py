import sys
import unittest
from pathlib import Path

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


class TestImportResources(unittest.TestCase):
    def test_allows_document_extensions_only(self) -> None:
        self.assertEqual(import_resources.get_file_ext("/media/slides.PDF"), ".pdf")
        self.assertIsNone(import_resources.get_file_ext("/media/page.html"))
        self.assertIsNone(import_resources.get_file_ext("/media/image.svg"))
        self.assertIsNone(import_resources.get_file_ext("/media/noext"))


if __name__ == "__main__":
    unittest.main()
