import requests
import json
import os

# --- Configuration ---
TAIPEI_API_URL = "https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json"
NEW_TAIPEI_API_URL = "https://data.ntpc.gov.tw/api/datasets/010e5b15-3823-4b20-b401-b1cf000550c5/json?size=2000"
OUTPUT_PATH = os.path.join("src", "stations.json")

def fetch_data(url, source_name):
    """Fetches data from a given URL and returns the JSON content."""
    try:
        print(f"Fetching data from {source_name}...")
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        print(f"Successfully fetched data from {source_name}.")
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from {source_name}: {e}")
        return None

def standardize_station_data(station):
    """
    Ensures that a station dictionary from any source conforms to a standard format.
    Handles different key names for coordinates from different APIs.
    """
    lat_str = station.get('latitude') or station.get('lat')
    lng_str = station.get('longitude') or station.get('lng')

    lat, lng = 0.0, 0.0
    try:
        if lat_str is not None: lat = float(lat_str)
    except (ValueError, TypeError):
        print(f"Warning: Could not parse latitude for station {station.get('sno')}. Value: {lat_str}")
    try:
        if lng_str is not None: lng = float(lng_str)
    except (ValueError, TypeError):
        print(f"Warning: Could not parse longitude for station {station.get('sno')}. Value: {lng_str}")

    sbi = int(station.get('sbi', 0)) if str(station.get('sbi', 0)).isdigit() else 0
    bemp = int(station.get('bemp', 0)) if str(station.get('bemp', 0)).isdigit() else 0

    return {
        'sno': str(station.get('sno')),
        'sna': str(station.get('sna', '')).replace('YouBike2.0_', ''),
        'sarea': str(station.get('sarea', '')),
        'sbi': sbi,
        'bemp': bemp,
        'lat': lat,
        'lng': lng,
        'act': str(station.get('act', '0')),
        'ar': str(station.get('ar', '')),
        'mday': str(station.get('mday', ''))
    }

def main():
    """Main function to fetch, merge, and save YouBike data."""
    taipei_data = fetch_data(TAIPEI_API_URL, "Taipei City") or []
    new_taipei_data = fetch_data(NEW_TAIPEI_API_URL, "New Taipei City") or []

    if not taipei_data and not new_taipei_data:
        print("Failed to fetch data from all sources. Aborting.")
        return

    all_stations = []
    processed_sno = set()
    combined_data = taipei_data + new_taipei_data

    for station in combined_data:
        sno = station.get('sno')
        if sno and sno not in processed_sno:
            standardized = standardize_station_data(station)
            all_stations.append(standardized)
            processed_sno.add(sno)

    print(f"\nProcessed {len(taipei_data)} stations from Taipei City.")
    print(f"Processed {len(new_taipei_data)} stations from New Taipei City.")
    print(f"Total unique stations: {len(all_stations)}")

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    try:
        with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
            json.dump(all_stations, f, ensure_ascii=False, indent=4)
        print(f"Successfully saved combined data to {OUTPUT_PATH}")
    except IOError as e:
        print(f"Error writing to file {OUTPUT_PATH}: {e}")

if __name__ == "__main__":
    main()
