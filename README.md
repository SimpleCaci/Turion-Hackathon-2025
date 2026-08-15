# Solar System Missions

Explore spacecraft missions through NASA JPL Horizons data, generated trajectory plots, and optional Gemini-powered mission summaries.

This project earned **3rd place at the Turion Space Hackathon 2025**. It makes real mission data easier to explore: enter a spacecraft or mission identifier, retrieve ephemeris data, visualize its path through the solar system, and read a concise background summary.

> **Status:** hackathon prototype under maintenance. The primary Flask workflow is present, but the full network-dependent experience still needs end-to-end validation against current JPL Horizons and Gemini APIs.

## Highlights

- queries NASA's public JPL Horizons API for mission and planetary vectors
- discovers mission time ranges from returned ephemeris data
- generates dark-theme 3D trajectory plots with Matplotlib
- serves plots and mission search through a Flask interface
- optionally asks Gemini to summarize mission background and significance
- includes a Three.js mission explorer with searchable agency filters, launch sorting, and live dataset summaries

## Demo

The repository contains generated trajectory examples under `Turion-Hackathon-2025/static/`. A current walkthrough GIF and a verified deployment link are still needed.

## Technology

- Python 3.11+
- Flask
- NASA JPL Horizons API and Astroquery
- Matplotlib
- Google Gemini API through `google-genai`
- HTML, CSS, JavaScript, and an experimental Three.js interface

## Architecture

```text
mission search
    |
    +--> JPL Horizons API --> mission dates and vector coordinates
    |                              |
    |                              +--> Matplotlib trajectory image
    |
    +--> Gemini (optional) --> background summary
                                   |
                                   v
                              Flask interface
```

The trajectory workflow is in `Turion-Hackathon-2025/`. The root `backend/` and `frontend/` folders form a separate interactive mission explorer with a searchable mission intelligence sidebar and simplified 3D positions.

## Setup

### 1. Create an environment

```bash
cd Turion-Hackathon-2025
python -m venv .venv
```

Activate it on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Or on macOS/Linux:

```bash
source .venv/bin/activate
```

### 2. Install dependencies

With pip:

```bash
python -m pip install -e .
```

The repository also includes `uv.lock` for reproducible installation with [uv](https://docs.astral.sh/uv/):

```bash
uv sync
```

### 3. Configure Gemini

Trajectory generation uses JPL Horizons and does not require a Gemini key. AI summaries require:

```powershell
$env:GEMINI_API_KEY = "your-key"
```

On macOS/Linux:

```bash
export GEMINI_API_KEY="your-key"
```

Do not commit an API key or `.env` file.

## Run

From the inner project directory:

```bash
python main.py
```

Open [http://localhost:3000](http://localhost:3000), search for a mission, and wait while the application retrieves and plots remote ephemeris data.

### Run the interactive mission explorer

Start its API from the repository root:

```bash
cd backend
python main.py
```

In a second terminal, serve the browser files:

```bash
cd frontend
python -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). The sidebar summarizes the currently visible active missions and supports free-text search, agency filters, and launch-date sorting.

## Validation

Deterministic tests cover mission-range parsing, date normalization, duplicate removal, and parser state reset. They do not make network or Gemini calls:

```bash
python -m unittest discover -s tests -v
```

GitHub Actions runs these tests and compiles the Python modules on every push and pull request. `test_turion.py` remains an exploratory network script and is not part of the deterministic suite.

A complete validation requires network access plus a current JPL Horizons response. Gemini summary validation additionally requires `GEMINI_API_KEY`.

## Security note

An API credential was previously embedded in repository source. The improvement branch removes it from the current tree, but that does **not** erase it from Git history. The credential should be revoked and replaced in Google AI Studio before the summary feature is used again.

## Current limitations

- external API formats and availability can affect mission parsing
- mission identification still relies on JPL-compatible search values
- generated plots are static rather than truly interactive
- some fallback dates and broad exception handling remain from the hackathon
- the Three.js explorer uses simplified mission positioning in several places
- network errors need clearer user-facing states

## Roadmap

- cache remote responses and avoid repeating expensive queries
- validate mission input before generating a plot
- unify the trajectory and Three.js experiences around one API
- add loading, empty, and actionable error states
- capture a short, current demo after end-to-end validation

## License and authorship

Created by [SimpleCaci](https://github.com/SimpleCaci) for the Turion Hackathon 2025 and released under the [MIT License](LICENSE).
