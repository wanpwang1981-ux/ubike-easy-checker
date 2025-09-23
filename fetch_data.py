import requests
import json
import os

# --- Constants ---
TAIPEI_API_URL = "https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json"
NEW_TAIPEI_API_URL = "https://data.ntpc.gov.tw/api/datasets/010e5b15-3823-4b20-b401-b1cf000550c5/json?size=2000"
OUTPUT_PATH = os.path.join('src', 'stations.json')

# --- Data Processing Functions ---

def process_taipei_data(data):
    """Processes Taipei City data into the unified schema."""
    processed = []
    for station in data:
        if station.get('act') == '1':  # Only include active stations
            processed.append({
                "sno": station.get('sno'),
                "sna": station.get('sna'),
                "sarea": station.get('sarea'),
                "ar": station.get('ar'),
                "lat": float(station.get('latitude', 0)),
                "lng": float(station.get('longitude', 0)),
                "city": "Taipei",
                "sbi": int(station.get('available_rent_bikes', 0)),
                "bemp": int(station.get('available_return_bikes', 0)),
            })
    return processed

def process_new_taipei_data(data):
    """Processes New Taipei City data into the unified schema."""
    processed = []
    for station in data:
        if station.get('act') == '1':  # Only include active stations
            processed.append({
                "sno": station.get('sno'),
                "sna": station.get('sna'),
                "sarea": station.get('sarea'),
                "ar": station.get('ar'),
                "lat": float(station.get('lat', 0)),
                "lng": float(station.get('lng', 0)),
                "city": "New Taipei",
                "sbi": int(station.get('sbi', 0)),
                "bemp": int(station.get('bemp', 0)),
            })
    return processed

# --- Main Execution ---

def fetch_and_save_data():
    """
    Fetches data from both APIs, processes them, combines them,
    and saves the result to a single JSON file.
    """
    all_stations = []

    # Fetch and process Taipei data
    try:
        response_taipei = requests.get(TAIPEI_API_URL)
        response_taipei.raise_for_status()
        data_taipei = response_taipei.json()
        all_stations.extend(process_taipei_data(data_taipei))
        print(f"Successfully processed {len(data_taipei)} stations from Taipei.")
    except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
        print(f"Could not fetch or process Taipei data: {e}")

    # Fetch and process New Taipei data
    try:
        response_new_taipei = requests.get(NEW_TAIPEI_API_URL)
        response_new_taipei.raise_for_status()
        data_new_taipei = response_new_taipei.json()
        all_stations.extend(process_new_taipei_data(data_new_taipei))
        print(f"Successfully processed {len(data_new_taipei)} stations from New Taipei.")
    except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
        print(f"Could not fetch or process New Taipei data: {e}")

    # Save the combined data
    if not all_stations:
        print("No data was fetched. Aborting file write.")
        return

    try:
        with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
            json.dump(all_stations, f, ensure_ascii=False, indent=2)
        print(f"\nSuccessfully saved a total of {len(all_stations)} stations to {OUTPUT_PATH}")
    except IOError as e:
        print(f"Error writing to file {OUTPUT_PATH}: {e}")

if __name__ == "__main__":
    fetch_and_save_data()
