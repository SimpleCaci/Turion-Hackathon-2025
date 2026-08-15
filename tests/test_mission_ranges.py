import sys
import unittest
from pathlib import Path


PROJECT = Path(__file__).resolve().parents[1] / "Turion-Hackathon-2025"
sys.path.insert(0, str(PROJECT))

from data_class import Data, parse_mission_ranges  # noqa: E402


class MissionRangeTests(unittest.TestCase):
    def test_parses_and_normalizes_jpl_ranges(self):
        raw = """
        Galileo (18-Oct-1989 to 21-Sep-2003)
        Cruise phase (01-Jan-1990 to 02-Feb-1991)
        """
        self.assertEqual(
            parse_mission_ranges(raw),
            [["1989-10-18", "2003-09-21"], ["1990-01-01", "1991-02-02"]],
        )

    def test_ignores_noise_and_removes_duplicates(self):
        raw = "invalid\nProbe (1-Jan-2000 to 2-Feb-2001)\nProbe (1-Jan-2000 to 2-Feb-2001)"
        self.assertEqual(parse_mission_ranges(raw), [["2000-01-01", "2001-02-02"]])

    def test_data_object_replaces_previous_results(self):
        data = Data("probe", "VECTOR", "500@0", "2000-01-01", "2001-01-01")
        data.missions = [["stale", "value"]]
        self.assertEqual(data.grab_missions("Probe (1-Jan-2000 to 2-Feb-2001)"), [["2000-01-01", "2001-02-02"]])


if __name__ == "__main__":
    unittest.main()
