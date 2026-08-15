from datetime import datetime
import re
from urllib.parse import urlencode

MISSION_RANGE = re.compile(
    r"\((\d{1,2}-[A-Za-z]{3}-\d{4})\s+to\s+(\d{1,2}-[A-Za-z]{3}-\d{4})\)"
)


def parse_mission_ranges(raw_data):
    """Extract unique JPL mission date ranges in chronological order."""
    ranges = []
    seen = set()
    for start_raw, end_raw in MISSION_RANGE.findall(raw_data or ""):
        start = datetime.strptime(start_raw, "%d-%b-%Y").strftime("%Y-%m-%d")
        end = datetime.strptime(end_raw, "%d-%b-%Y").strftime("%Y-%m-%d")
        item = (start, end)
        if item not in seen:
            seen.add(item)
            ranges.append([start, end])
    return ranges
#outputs the data
class Data:

    def __init__(self, input_space, ephem_type, center, start_time, stop_time):
        self.input_space = input_space
        self.ephem_type = ephem_type
        self.center = center
        self.start_time = start_time
        self.stop_time = stop_time

        self.format = "text"
        self.obj_data = "YES"
        self.make_ephem = "YES"
        self.step_size = "1%20d"
        self.missions = []

    def grab_data(self):
        import requests

        params = {
            "format": self.format,
            "COMMAND": self.input_space,
            "OBJ_DATA": self.obj_data,
            "MAKE_EPHEM": self.make_ephem,
            "EPHEM_TYPE": self.ephem_type,
            "CENTER": self.center,
            "START_TIME": self.start_time,
            "STOP_TIME": self.stop_time,
            "STEP_SIZE": "1 d",
        }
        response = requests.get(
            f"https://ssd.jpl.nasa.gov/api/horizons.api?{urlencode(params)}",
            timeout=30,
        )
        response.raise_for_status()
        return response.text

    def grab_missions(self, raw_data):
        self.missions = parse_mission_ranges(raw_data)
        return self.missions
