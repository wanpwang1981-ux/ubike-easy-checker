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
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        print(f"Successfully fetched data from {source_name}.")
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from {source_name}: {e}")
        return None

def standardize_station_data(station, source_name):
    """
    Ensures that a station dictionary from any source conforms to a standard format.
    This is crucial for merging data from different APIs.
    """
    # The two APIs use slightly different but compatible keys.
    # We will standardize to the format used by the Taipei API, as it's cleaner.
    # Example keys: sno, sna, sarea, sbi, bemp, lat, lng, act
    return {
        'sno': str(station.get('sno')),
        'sna': str(station.get('sna', '')).replace('YouBike2.0_', ''), # Clean up station names
        'sarea': str(station.get('sarea', '')),
        'sbi': int(station.get('sbi', 0)),
        'bemp': int(station.get('bemp', 0)),
        'lat': float(station.get('lat', 0.0)),
        'lng': float(station.get('lng', 0.0)),
        'act': str(station.get('act', '0')),
        'ar': str(station.get('ar', '')),
        'mday': str(station.get('mday', ''))
    }

def main():
    """Main function to fetch, merge, and save YouBike data."""
    # Fetch data from both sources
    taipei_data = fetch_data(TAIPEI_API_URL, "Taipei City")
    new_taipei_data = fetch_data(NEW_TAIPEI_API_URL, "New Taipei City")

    if taipei_data is None and new_taipei_data is None:
        print("Failed to fetch data from all sources. Aborting.")
        return

    all_stations = []
    processed_sno = set()

    # Process and standardize Taipei data
    if taipei_data:
        for station in taipei_data:
            if station and station.get('sno') not in processed_sno:
                standardized = standardize_station_data(station, "Taipei")
                all_stations.append(standardized)
                processed_sno.add(standardized['sno'])
        print(f"Processed {len(taipei_data)} stations from Taipei City.")

    # Process and standardize New Taipei data
    if new_taipei_data:
        for station in new_taipei_data:
            # The New Taipei API might have a different structure, let's be safe
            if station and station.get('sno') not in processed_sno:
                standardized = standardize_station_data(station, "New Taipei")
                # Add a prefix to New Taipei station names for clarity in the UI if needed
                # standardized['sna'] = f"[新北] {standardized['sna']}"
                all_stations.append(standardized)
                processed_sno.add(standardized['sno'])
        print(f"Processed {len(new_taipei_data)} stations from New Taipei City.")

    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    # Save the combined data to the output file
    try:
        with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
            json.dump(all_stations, f, ensure_ascii=False, indent=4)
        print(f"Successfully saved {len(all_stations)} combined stations to {OUTPUT_PATH}")
    except IOError as e:
        print(f"Error writing to file {OUTPUT_PATH}: {e}")

if __name__ == "__main__":
    main()
