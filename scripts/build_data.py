import csv
import json
import requests
from collections import defaultdict
import os

# --- CONFIGURATION ---
# Google Sheets CSV export link
SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTGgQr28giHo9pFs8acJopPPKDE5N9b7BGszbcKcl2n-3uhKA4mpoe4VdkmtzCdF-hqqBZokys-8DYm/pub?output=csv"

# Output path for the generated JSON
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "..", "data.json")

def fetch_ror_data(ror_id):
    """Queries the ROR API v2 to retrieve institution location and details."""
    
    # Extract the raw ROR ID
    clean_id = ror_id.strip().split("/")[-1]
    api_url = f"https://api.ror.org/v2/organizations/{clean_id}"
    
    try:
        response = requests.get(api_url)
        if response.status_code == 200:
            data = response.json()
            
            # Extract primary institution name
            name = "Unknown Institution"
            names_array = data.get("names", [])
            for n in names_array:
                if "ror_display" in n.get("types", []):
                    name = n.get("value", "Unknown Institution")
                    break
            if name == "Unknown Institution" and names_array:
                name = names_array[0].get("value", "Unknown Institution")
                
            # Extract geographical data
            city = "Unknown City"
            lat = 0.0
            lng = 0.0
            country_code = "" 
            
            locations = data.get("locations", [])
            if locations:
                geo = locations[0].get("geonames_details", {})
                city = geo.get("name", "Unknown City")
                lat = geo.get("lat", 0.0)
                lng = geo.get("lng", 0.0)
                country_code = geo.get("country_code", "") 
                
            return {
                "institution": name,
                "city": city,
                "lat": lat,
                "lng": lng,
                "country": country_code 
            }
        else:
            print(f"   ! API returned status {response.status_code} for ID {clean_id}")
    except Exception as e:
        print(f"Error fetching {clean_id}: {e}")
    return None

def main():
    print("1. Fetching data from Google Sheets...")
    response = requests.get(SHEET_CSV_URL)
    response.encoding = 'utf-8'
    lines = response.text.splitlines()
    reader = csv.DictReader(lines)
    
    # Initialize the institution dictionary
    institutions = defaultdict(lambda: {
        "institution": "",
        "city": "",
        "lat": 0.0,
        "lng": 0.0,
        "country": "", 
        "people": []
    })

    print("2. Processing profiles and fetching ROR coordinates...")
    for row in reader:
        ror_id = row.get("ROR_ID", "").strip()
        if not ror_id:
            continue

        # Fetch external API data only for new institutions
        if not institutions[ror_id]["institution"]:
            print(f"   -> Querying API for: {ror_id}")
            ror_data = fetch_ror_data(ror_id)
            if ror_data:
                institutions[ror_id].update(ror_data)
        
        # Assign default photo if missing
        photo = row.get("Photo", "").strip()
        if not photo:
            photo = "default-avatar.jpg"

        # Append profile data to the specific institution
        institutions[ror_id]["people"].append({
            "firstName": row.get("First Name", "").strip(),
            "lastName": row.get("Last Name", "").strip(),
            "role": row.get("Role", "").strip().lower(),
            "year": row.get("Year", "").strip(),
            "linkedin": row.get("LinkedIn", "").strip(),
            "photo": photo,
            "background": row.get("Background", "").strip(),
            "biosketch": row.get("Biosketch", "").strip()
        })

    # Format output data
    final_data = list(institutions.values())

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    print("3. Saving data.json...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(final_data, f, indent=2, ensure_ascii=False)
    
    print(f"Success! Generated map data for {len(final_data)} institutions.")

if __name__ == "__main__":
    main()