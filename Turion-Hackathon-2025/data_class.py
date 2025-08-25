import requests
from urllib.parse import quote
from datetime import datetime
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import re
from astroquery.jplhorizons import Horizons
from astroquery.exceptions import InvalidQueryError
from google import genai
from google.genai import types 
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
        input_text = (f"https://ssd.jpl.nasa.gov/api/horizons.api?"
                      f"format={self.format}"
                      f"&COMMAND={self.input_space}"
                      f"&OBJ_DATA={self.obj_data}"
                      f"&MAKE_EPHEM={self.make_ephem}"
                      f"&EPHEM_TYPE={self.ephem_type}"
                      f"&CENTER={self.center}"
                      f"&START_TIME='{self.start_time}'"
                      f"&STOP_TIME='{self.stop_time}'"
                      f"&STEP_SIZE='{self.step_size}'")
        response = requests.get(input_text)
        return response.content.decode('utf-8')

    def grab_missions(self, raw_data):
        print("Grabbing missions...")
        # print(raw_data)
        self.missions = []
        for line in raw_data.strip().splitlines():
            if "(" in line and " to " in line and "-" in line and ")" in line:
                try:
                    date_range = line[line.rfind("(")+1 : line.rfind(")")]
                    parts = date_range.split(" to ")
                    if len(parts) != 2:
                        continue
                    start_raw, end_raw = parts
                    start = datetime.strptime(start_raw.strip(), "%d-%b-%Y").strftime("%Y-%m-%d")
                    end = datetime.strptime(end_raw.strip(), "%d-%b-%Y").strftime("%Y-%m-%d")
                    self.missions.append([start, end])
                except Exception as e:
                    print(f"[ERROR] Failed to parse line:\n{line}\nReason: {e}")
        format = re.compile(r"\((d{1,2}-[a-zA-Z]{3}-\d{4})\s+to\s+(\d{1,2}-[a-zA-Z]{3}-\d{4})\)")
        for line in format.finditer(raw_data):
            start = datetime.strptime(line[1], "%d-%b-%Y").strftime("%Y-%m-%d")
            end = datetime.strptime(line[2], "%d-%b-%Y").strftime("%Y-%m-%d %H:%M")
            self.missions.append([start, end])
        return self.missions
