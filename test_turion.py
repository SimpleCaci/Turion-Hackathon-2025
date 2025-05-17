#API request to NASA Horizons API
import requests
from urllib.parse import quote
from datetime import datetime
import base64
import os
from google import genai
from google.genai import types

input_space = input("Enter a space: ")
center = '500@0' #sun
current_date = datetime.now().strftime('%Y-%m-%d')
start_time = quote("'2013-11-05 09:55'")
stop_time  = quote("'2022-11-26 00:00'")


input_text = "https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND="+input_space+"&OBJ_DATA='YES'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER="+center+"&START_TIME="+start_time+"&STOP_TIME="+stop_time+"&STEP_SIZE='1%20d'"

response = requests.get(input_text)

text_value = response.content.decode('utf-8')[:5000]

def generate():
    client = genai.Client(
        api_key= "test"
    )

    model = "gemini-2.5-flash-preview-04-17"
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text= f"""{text_value} give me a summery on the background of the data and give me it in bullet points but have a bold decripter wth : and then the summery. The summery should include, the name, country, goverment/company, purpose, signifigance. Make sure not to have asterisks in the front and spaces in the front."""),
            ],
        ),
    ]
    generate_content_config = types.GenerateContentConfig(
        response_mime_type="text/plain",
    )

    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        print(chunk.text, end="")


if __name__ == "__main__":
    generate()


