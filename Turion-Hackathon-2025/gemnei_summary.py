import requests
from urllib.parse import quote
from datetime import datetime
from google import genai
from google.genai import types

# Constants
center = '500@0'  # Sun
start_time = quote("'2013-11-05 09:55'")
stop_time = quote("'2022-11-26 00:00'")


def generate(input_space):
    print(f"Generating summary for {input_space}...")
    # Construct the Horizons API URL
    input_text = (f"https://ssd.jpl.nasa.gov/api/horizons.api?"
                  f"format=text"
                  f"&COMMAND={input_space}"
                  f"&OBJ_DATA='YES'"
                  f"&MAKE_EPHEM='YES'"
                  f"&EPHEM_TYPE='OBSERVER'"
                  f"&CENTER={center}"
                  f"&START_TIME={start_time}"
                  f"&STOP_TIME={stop_time}"
                  f"&STEP_SIZE='1%20d'")

    # Fetch data from Horizons API
    response = requests.get(input_text)
    text_value = response.content.decode(
        'utf-8')[:4000]  # Limit size for LLM input

    # Initialize Gemini client
    client = genai.Client(api_key="AIzaSyCDiEKp53KRjGex57UjfRkCxp-cPZMN-o0")
    model = "gemini-2.5-flash-preview-04-17"

    # Prepare prompt content
    prompt = (
        f"Is {text_value} a valid space mission? If so give me a summary on the background of the data and give me it in bullet points "
        "but have a bold descriptor with ':' and then the summary. The summary should include: the name, "
        "country, government/company, purpose, significance. Make sure not to have asterisks or leading spaces. If it is not, write that it is not a valid space mission."
    )

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)],
        )
    ]

    # Generate summary
    generate_content_config = types.GenerateContentConfig(
        response_mime_type="text/plain")
    summary = ""

    for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
    ):
        summary += chunk.text

    return summary
