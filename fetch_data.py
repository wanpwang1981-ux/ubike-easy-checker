import requests
import json
import os

# API Endpoints
NTPC_API_URL = 'https://data.ntpc.gov.tw/api/datasets/010e5b15-3823-4b20-b401-b1cf000550c5/json?size=2000'
TPE_API_URL = 'https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json'

# Output path
OUTPUT_PATH = os.path.join('src', 'stations.json')

def fetch_and_save_data():
    """
    Fetches YouBike station data from both New Taipei City and Taipei City APIs,
    merges them, and saves to a local JSON file.
    """
    all_stations = []

    # --- Fetch New Taipei City Data ---
    print(f"Fetching data from New Taipei City API...")
    try:
        response_ntpc = requests.get(NTPC_API_URL, timeout=30)
        response_ntpc.raise_for_status()
        ntpc_stations = response_ntpc.json()
        all_stations.extend(ntpc_stations)
        print(f"Successfully fetched {len(ntpc_stations)} stations from New Taipei City.")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching New Taipei City data: {e}")
    except json.JSONDecodeError:
        print("Error: Failed to decode JSON from the New Taipei City response.")

    # --- Fetch Taipei City Data ---
    print(f"Fetching data from Taipei City API...")
    try:
        response_tpe = requests.get(TPE_API_URL, timeout=30)
        response_tpe.raise_for_status()
        tpe_stations = response_tpe.json()
        # The Taipei API data structure is very similar, so no complex transformation is needed.
        # We just add them to the list.
        all_stations.extend(tpe_stations)
        print(f"Successfully fetched {len(tpe_stations)} stations from Taipei City.")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching Taipei City data: {e}")
    except json.JSONDecodeError:
        print("Error: Failed to decode JSON from the Taipei City response.")

    # --- Save Combined Data ---
    if not all_stations:
        print("No data fetched from any source. Aborting save.")
        return

    try:
        # Ensure the 'src' directory exists
        os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

        with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
            json.dump(all_stations, f, ensure_ascii=False, indent=4)

        print(f"Successfully saved a total of {len(all_stations)} stations.")
        print(f"Data saved to {OUTPUT_PATH}")

    except Exception as e:
        print(f"An unexpected error occurred during file save: {e}")

if __name__ == "__main__":
    fetch_and_save_data()
