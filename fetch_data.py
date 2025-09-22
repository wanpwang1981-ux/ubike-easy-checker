import requests
import json
import os

# Data sources
TAIPEI_URL = "https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json"
NEW_TAIPEI_URL = "https://data.ntpc.gov.tw/api/datasets/010e5b15-3823-4b20-b401-b1cf000550c5/json?size=2000"

def fetch_and_process_data():
    """
    Fetches data from Taipei and New Taipei City YouBike APIs,
    processes it into a unified format, and saves it to stations.json.
    """
    all_stations = []

    # --- Process Taipei Data ---
    try:
        response_taipei = requests.get(TAIPEI_URL)
        response_taipei.raise_for_status()
        data_taipei = response_taipei.json()

        for station in data_taipei:
            # Skip stations that are not in service
            if station.get('act') == '0':
                continue

            # Remove "YouBike2.0_" prefix from station name
            station_name = station.get('sna', '').replace('YouBike2.0_', '')

            all_stations.append({
                "city": "Taipei",
                "sno": station.get('sno'),
                "sna": station_name,
                "sarea": station.get('sarea'),
                "ar": station.get('ar'),
                "lat": float(station.get('latitude', 0)),
                "lng": float(station.get('longitude', 0)),
                "sbi": int(station.get('available_rent_bikes', 0)),
                "bemp": int(station.get('available_return_bikes', 0)),
            })
    except requests.exceptions.RequestException as e:
        print(f"Error fetching Taipei data: {e}")
    except json.JSONDecodeError:
        print("Error decoding Taipei JSON data.")

    # --- Process New Taipei Data ---
    try:
        response_new_taipei = requests.get(NEW_TAIPEI_URL)
        response_new_taipei.raise_for_status()
        data_new_taipei = response_new_taipei.json()

        for station in data_new_taipei:
             # Skip stations that are not in service
            if station.get('act') == '0':
                continue

            all_stations.append({
                "city": "New Taipei",
                "sno": station.get('sno'),
                "sna": station.get('sna'),
                "sarea": station.get('sarea'),
                "ar": station.get('ar'),
                "lat": float(station.get('lat', 0)),
                "lng": float(station.get('lng', 0)),
                "sbi": int(station.get('sbi', 0)),
                "bemp": int(station.get('bemp', 0)),
            })
    except requests.exceptions.RequestException as e:
        print(f"Error fetching New Taipei data: {e}")
    except json.JSONDecodeError:
        print("Error decoding New Taipei JSON data.")

    # --- Save to file ---
    output_path = os.path.join('src', 'stations.json')
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(all_stations, f, ensure_ascii=False, indent=2)
        print(f"Successfully fetched and processed data for {len(all_stations)} stations.")
        print(f"Data saved to {output_path}")
    except IOError as e:
        print(f"Error writing to file {output_path}: {e}")

if __name__ == "__main__":
    fetch_and_process_data()
