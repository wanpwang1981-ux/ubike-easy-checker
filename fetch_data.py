import requests
import json
import os
import argparse
import sys
import re

# --- Constants ---
# Original data sources
TAIPEI_API_URL = "https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json"
NEW_TAIPEI_API_URL = "https://data.ntpc.gov.tw/api/datasets/010e5b15-3823-4b20-b401-b1cf000550c5/json?size=2000"

# TDX data sources
TDX_AUTH_URL = "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token"
TDX_STATION_URL = "https://tdx.transportdata.tw/api/basic/v2/Bike/Station/City"
TDX_AVAILABILITY_URL = "https://tdx.transportdata.tw/api/basic/v2/Bike/Availability/City"

OUTPUT_PATH = os.path.join('src', 'stations.json')

# --- Data Processing Functions ---

def process_taipei_data(data):
    """Processes Taipei City data from the original source into the unified schema."""
    processed = []
    for station in data:
        if station.get('act') == '1':
            processed.append({
                "sno": station.get('sno'), "sna": station.get('sna', '').replace('YouBike2.0_', ''), "sarea": station.get('sarea'),
                "ar": station.get('ar'), "lat": float(station.get('latitude', 0)), "lng": float(station.get('longitude', 0)),
                "city": "Taipei", "sbi": int(station.get('available_rent_bikes', 0)), "bemp": int(station.get('available_return_bikes', 0)),
            })
    return processed

def process_new_taipei_data(data):
    """Processes New Taipei City data from the original source into the unified schema."""
    processed = []
    for station in data:
        if station.get('act') == '1':
            processed.append({
                "sno": station.get('sno'), "sna": station.get('sna', '').replace('YouBike2.0_', ''), "sarea": station.get('sarea'),
                "ar": station.get('ar'), "lat": float(station.get('lat', 0)), "lng": float(station.get('lng', 0)),
                "city": "New Taipei", "sbi": int(station.get('sbi', 0)), "bemp": int(station.get('bemp', 0)),
            })
    return processed

# --- Data Fetching Functions ---

def fetch_original_data():
    """Fetches and processes data from the original city government APIs."""
    all_stations = []
    print("Fetching data from original sources...")
    try:
        response_taipei = requests.get(TAIPEI_API_URL)
        response_taipei.raise_for_status()
        data_taipei = response_taipei.json()
        all_stations.extend(process_taipei_data(data_taipei))
        print(f"Successfully processed {len(data_taipei)} stations from Taipei.")
    except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
        print(f"Could not fetch or process Taipei data: {e}")

    try:
        # Added verify=False as a workaround for SSL certificate verification errors from this specific host.
        response_new_taipei = requests.get(NEW_TAIPEI_API_URL, verify=False)
        response_new_taipei.raise_for_status()
        data_new_taipei = response_new_taipei.json()
        all_stations.extend(process_new_taipei_data(data_new_taipei))
        print(f"Successfully processed {len(data_new_taipei)} stations from New Taipei.")
    except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
        print(f"Could not fetch or process New Taipei data: {e}")

    return all_stations

def get_tdx_access_token(client_id, client_secret):
    """Gets an access token from the TDX authentication endpoint."""
    try:
        response = requests.post(
            TDX_AUTH_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
            },
            headers={"content-type": "application/x-www-form-urlencoded"},
        )
        response.raise_for_status()
        return response.json().get("access_token")
    except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
        print(f"Error getting TDX access token: {e}", file=sys.stderr)
        return None

def fetch_tdx_data(token):
    """
    Fetches and processes data from the TDX APIs by merging static station
    data with dynamic availability data.
    """
    headers = {"authorization": f"Bearer {token}"}
    station_info = {}

    # --- Step 1: Fetch static station information for both cities ---
    print("Fetching TDX station information...")
    for city in ["Taipei", "NewTaipei"]:
        try:
            response = requests.get(f"{TDX_STATION_URL}/{city}", headers=headers)
            response.raise_for_status()
            for station in response.json():
                station_info[station['StationUID']] = station
        except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
            print(f"Could not fetch TDX station data for {city}: {e}", file=sys.stderr)
            return []
    print(f"Successfully fetched info for {len(station_info)} unique stations.")

    # --- Step 2: Fetch dynamic availability information for both cities ---
    print("Fetching TDX station availability...")
    availability_info = {}
    for city in ["Taipei", "NewTaipei"]:
        try:
            response = requests.get(f"{TDX_AVAILABILITY_URL}/{city}", headers=headers)
            response.raise_for_status()
            for station in response.json():
                availability_info[station['StationUID']] = station
        except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
            print(f"Could not fetch TDX availability data for {city}: {e}", file=sys.stderr)
            return []
    print(f"Successfully fetched availability for {len(availability_info)} unique stations.")

    # --- Step 3: Merge the two datasets ---
    print("Merging TDX datasets...")
    all_stations = []
    for uid, availability in availability_info.items():
        if uid in station_info and availability.get('ServiceStatus', 0) == 1:
            station = station_info[uid]

            # Get district, with fallback to parsing the address
            district = station.get('ServiceDistrict', {}).get('Zh_tw')
            address = station.get('StationAddress', {}).get('Zh_tw', '')
            if not district and address:
                match = re.search(r'\S{2,3}區', address)
                if match:
                    district = match.group(0)

            all_stations.append({
                "sno": uid,
                "sna": station.get('StationName', {}).get('Zh_tw', '').replace('YouBike2.0_', ''),
                "sarea": district,
                "ar": address,
                "lat": float(station.get('StationPosition', {}).get('PositionLat', 0)),
                "lng": float(station.get('StationPosition', {}).get('PositionLon', 0)),
                "city": "Taipei" if station.get('AuthorityID') == 'TPE' else "New Taipei",
                "sbi": int(availability.get('AvailableRentBikes', 0)),
                "bemp": int(availability.get('AvailableReturnBikes', 0)),
            })

    return all_stations

def save_data_to_json(all_stations):
    """Saves the combined station data to a JSON file."""
    if not all_stations:
        print("No data was fetched. Aborting file write.")
        return

    try:
        with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
            json.dump(all_stations, f, ensure_ascii=False, indent=2)
        print(f"\nSuccessfully saved a total of {len(all_stations)} stations to {OUTPUT_PATH}")
    except IOError as e:
        print(f"Error writing to file {OUTPUT_PATH}: {e}")

# --- Main Execution ---

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch YouBike station data from different sources.")
    parser.add_argument(
        '--source',
        type=str,
        choices=['original', 'tdx'],
        default='original',
        help="Specify the data source: 'original' for city APIs, 'tdx' for TDX platform."
    )
    args = parser.parse_args()

    stations_data = []
    if args.source == 'tdx':
        client_id = os.environ.get("TDX_CLIENT_ID", "").strip().strip('"').strip("'")
        client_secret = os.environ.get("TDX_CLIENT_SECRET", "").strip().strip('"').strip("'")

        if not client_id or not client_secret:
            print("Error: TDX_CLIENT_ID and TDX_CLIENT_SECRET environment variables must be set.", file=sys.stderr)
            sys.exit(1)

        access_token = get_tdx_access_token(client_id, client_secret)
        if access_token:
            stations_data = fetch_tdx_data(access_token)
    else:
        stations_data = fetch_original_data()

    save_data_to_json(stations_data)
