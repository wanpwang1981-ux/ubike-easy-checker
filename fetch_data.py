import requests
import json
import os

# The API endpoint for New Taipei City YouBike data
API_URL = 'https://data.ntpc.gov.tw/api/datasets/010e5b15-3823-4b20-b401-b1cf000550c5/json?size=2000'

# The path to save the data file, inside the 'src' directory
OUTPUT_PATH = os.path.join('src', 'stations.json')

def fetch_and_save_data():
    """
    Fetches YouBike station data from the API and saves it to a local JSON file.
    """
    print(f"Fetching data from {API_URL}...")
    try:
        response = requests.get(API_URL, timeout=30)
        # Raise an exception if the request was unsuccessful
        response.raise_for_status()

        data = response.json()

        # Ensure the 'src' directory exists
        os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

        with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

        print(f"Successfully fetched {len(data)} stations.")
        print(f"Data saved to {OUTPUT_PATH}")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
    except json.JSONDecodeError:
        print("Error: Failed to decode JSON from the response.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    fetch_and_save_data()
