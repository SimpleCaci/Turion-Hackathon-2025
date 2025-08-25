#API request to NASA Horizons API
import requests
from urllib.parse import quote
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import os
from data_class import Data

def enhanced_plot_trajectory(coords, planets, mission):
  x_vals = [point[0] for point in coords]
  y_vals = [point[1] for point in coords]
  z_vals = [point[2] for point in coords]

  planet_colors = {
      "Mercury": "#1f77b4",
      "Venus": "#ff7f0e",
      "Earth": "#2ca02c",
      "Mars": "#d62728",
      "Jupiter": "#9467bd",
      "Saturn": "#8c564b",
      "Uranus": "#e377c2",
      "Neptune": "#7f7f7f",
      "Sun": "orange",
      "Start": "green",
      "End": "red"
  }

  os.makedirs("static/generated", exist_ok=True)

  fig = plt.figure(figsize=(12, 9))
  ax = fig.add_subplot(111, projection='3d')
  fig.patch.set_facecolor('#1e1e1e')
  ax.set_facecolor('#1e1e1e')

  ax.plot(x_vals, y_vals, z_vals, color='cyan', linewidth=2, label='Trajectory')
  ax.scatter(0, 0, 0, color=planet_colors["Sun"], s=200, label="Sun")

  for name, pos in planets.items():
    if pos:
      ax.scatter(pos[0], pos[1], pos[2], s=70, color=planet_colors.get(name, 'white'), label=name)

  ax.scatter(x_vals[0], y_vals[0], z_vals[0], color=planet_colors["Start"], s=100, label='Start')
  ax.scatter(x_vals[-1], y_vals[-1], z_vals[-1], color=planet_colors["End"], s=100, label='End')

  ax.set_xlabel('X (km)', color='white')
  ax.set_ylabel('Y (km)', color='white')
  ax.set_zlabel('Z (km)', color='white')
  ax.set_title(f'Trajectory from {mission[0]} to {mission[1]}', color='white', fontsize=14)
  ax.tick_params(colors='white')
  ax.legend(loc='upper left', fontsize=9)

  plt.tight_layout()
  filename = f"static/trajectory_{mission[0]}_to_{mission[1]}.png"
  plt.savefig(filename, dpi=300)
  plt.close()
  print(f"Saved: {filename}")

planet_ids = {
    "Mercury": "199",
    "Venus": "299",
    "Earth": "399",
    "Mars": "499",
    "Jupiter": "599",
    "Saturn": "699",
    "Uranus": "799",
    "Neptune": "899",
}

def get_planet_coords(planet_id, date, center='500@0'):
  stop_time = (datetime.strptime(date, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
  url = (
      f"https://ssd.jpl.nasa.gov/api/horizons.api?"
      f"format=text"
      f"&COMMAND={planet_id}"
      f"&OBJ_DATA=NO"
      f"&MAKE_EPHEM=YES"
      f"&EPHEM_TYPE=VECTORS"
      f"&CENTER={center}"
      f"&START_TIME='{date}'"
      f"&STOP_TIME='{stop_time}'"
      f"&STEP_SIZE='1 d'")

  res = requests.get(url)
  text = res.content.decode('utf-8')

  parsing = False
  for line in text.strip().splitlines():
    if "$$SOE" in line:
      parsing = True
      continue
    if "$$EOE" in line:
      break
    if parsing and "X =" in line and "Y =" in line and "Z =" in line:
      try:
        x = float(line.split("X =")[1].split("Y =")[0].strip())
        y = float(line.split("Y =")[1].split("Z =")[0].strip())
        z = float(line.split("Z =")[1].strip())
        return [x, y, z]
      except:
        continue
  return None

def get_mission_timeframe(mission_name):
  """Query NASA API with broad date range to find mission operational dates"""
  print(f"Discovering operational timeframe for {mission_name}...")
  ephem_type = "VECTOR"
  center = '500@0'
  # Use a broad range to capture most space missions
  broad_start = "1950-01-01"
  broad_stop = "2030-12-31"

  try:
      data_instance = Data(mission_name, ephem_type, center, broad_start, broad_stop)
      raw_data = data_instance.grab_data()
      missions = data_instance.grab_missions(raw_data)

      if not missions:
          print(f"No missions found for {mission_name} in broad timeframe")
          return None, None

      # Find the full operational timeframe across all mission phases
      all_start_dates = [mission[0] for mission in missions]
      all_end_dates = [mission[1] for mission in missions]

      actual_start = min(all_start_dates)
      actual_end = max(all_end_dates)

      print(f"Found {mission_name} operational period: {actual_start} to {actual_end}")
      return actual_start, actual_end

  except Exception as e:
      print(f"Error discovering timeframe for {mission_name}: {e}")
      return None, None


def run_all(input_space):
  print("Running all...")

  # Step 1: Dynamically discover the mission's operational timeframe
  start_time, stop_time = get_mission_timeframe(input_space)

  if not start_time or not stop_time:
      print(f"Could not determine operational dates for   mission: {input_space}")
      start_time = "1989-10-19 01:30"
      stop_time = "2003-09-21 00:00"
  print("Falling back to default Galileo timeframe...")
  
      # Fallback to original hardcoded dates if discovery fails
  # start_time = "1989-10-19 01:30"
  # stop_time = "2003-09-21 00:00"

  ephem_type = "VECTOR"
  center = '500@0'

  data_instance = Data(input_space, ephem_type, center, start_time, stop_time)
  raw_data = data_instance.grab_data()
  print(raw_data)
  missions = data_instance.grab_missions(raw_data)
  print(missions)

  print( f"Found {len(missions)} missions:")
  for mission in missions:
    vector_data = Data(input_space=input_space,
                       ephem_type="VECTOR",
                       center=center,
                       start_time=mission[0],
                       stop_time=mission[1])
    vector_raw_data = vector_data.grab_data()

    coords = []
    for line in vector_raw_data.strip().splitlines():
      if "X =" in line and "Y =" in line and "Z =" in line:
        try:
          x = float(line.split("X =")[1].split("Y =")[0].strip())
          y = float(line.split("Y =")[1].split("Z =")[0].strip())
          z = float(line.split("Z =")[1].strip())
          coords.append([x, y, z])
          print(f"Appended: {x}, {y}, {z}")
        except:
          print(f"Skipping line due to error: {line}")
          continue

    if not coords:
      print(f"No coordinates found for mission {mission}")
      continue

    planet_positions = {}
    for planet_name, planet_id in planet_ids.items():
      pos = get_planet_coords(planet_id, mission[0])
      print(f"Fetched {planet_name} at {mission[0]}:", pos)
      if pos:
        planet_positions[planet_name] = pos

    enhanced_plot_trajectory(coords, planet_positions, mission)
