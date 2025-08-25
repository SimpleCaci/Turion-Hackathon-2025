from flask import Flask, render_template, send_from_directory, request, redirect, url_for
import os
from generate_plots import run_all
from gemnei_summary import generate  # your summary function

app = Flask(__name__)

@app.route("/summary", methods=["POST"])
def get_summary():
    mission = request.form.get("mission", "").strip()
    if not mission:
        return "Mission name required", 400
    try:
        result = generate(mission)
        return result
    except Exception as e:
        return f"Error: {e}", 500

@app.route("/search", methods=["POST"])
def search():
    mission_name = request.form.get("mission_name", "").strip()
    if not mission_name:
        return "Mission not provided", 400
    try:
        run_all(mission_name)
        return redirect(url_for('index'))
    except Exception as e:
        return f"Error: {e}", 500

@app.route("/", methods=["GET"])
def index():
    image_dir = "static/generated"  # match your plot output folder
    if not os.path.exists(image_dir):
        os.makedirs(image_dir)
    files = os.listdir(image_dir)
    images = [f for f in files if f.endswith((".png", ".jpg", ".gif"))]
    return render_template("index.html", images=images)

@app.route("/static/<path:filename>")
def serve_image(filename):
    return send_from_directory("static", filename)

@app.route("/about", methods=["GET"])
def about():
    return render_template("about.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000)
