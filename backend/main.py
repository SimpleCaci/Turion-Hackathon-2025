from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
from datetime import datetime
from fetch_ephemeris import HorizonsAPI

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize the Horizons API client
horizons_api = HorizonsAPI()

# Load mission data
def load_mission_data():
    try:
        with open('missions.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"missions": [], "celestialObjects": []}

# Routes
@app.route('/api/missions', methods=['GET'])
def get_missions():
    """Return all mission data"""
    mission_data = load_mission_data()
    return jsonify(mission_data['missions'])

@app.route('/api/celestial-objects', methods=['GET'])
def get_celestial_objects():
    """Return all celestial objects data"""
    mission_data = load_mission_data()
    return jsonify(mission_data['celestialObjects'])

@app.route('/api/position/<object_id>', methods=['GET'])
def get_object_position(object_id):
    """Get the current position of an object by its ID"""
    try:
        position_data = horizons_api.get_object_position(object_id)
        if position_data:
            return jsonify({
                "status": "success",
                "object_id": object_id,
                "position": position_data[-1] if position_data else None  # Return the most recent position
            })
        else:
            return jsonify({
                "status": "error", 
                "message": f"Failed to get position for object {object_id}"
            }), 404
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/trajectory/<object_id>', methods=['GET'])
def get_object_trajectory(object_id):
    """Get the trajectory (position history) of an object by its ID"""
    try:
        # Get query parameters
        days = request.args.get('days', default=365, type=int)
        
        # Get trajectory data
        trajectory_data = horizons_api.get_object_trajectory(object_id, days=days)
        
        if trajectory_data:
            return jsonify({
                "status": "success",
                "object_id": object_id,
                "trajectory": trajectory_data
            })
        else:
            return jsonify({
                "status": "error", 
                "message": f"Failed to get trajectory for object {object_id}"
            }), 404
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/active-missions', methods=['GET'])
def get_active_missions():
    """Get position data for all active missions"""
    try:
        missions_data = load_mission_data()
        active_missions = []
        
        for mission in missions_data['missions']:
            if mission.get('status') == 'Active':
                # Get the latest position
                position_data = horizons_api.get_object_position(mission['id'])
                if position_data and len(position_data) > 0:
                    mission_with_position = mission.copy()
                    mission_with_position['current_position'] = position_data[-1]
                    active_missions.append(mission_with_position)
                else:
                    active_missions.append(mission)
        
        return jsonify({
            "status": "success",
            "active_missions": active_missions
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    # Make sure the script can find the missions.json file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Start the Flask app
    app.run(debug=True, port=5000)
