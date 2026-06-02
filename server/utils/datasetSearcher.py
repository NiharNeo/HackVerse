import sys
import json
import csv
import os

def search_query(query_text):
    query_text = query_text.strip().lower()
    
    # Paths
    hotels_file = "/Users/niharchavan/Desktop/Hackverse/hotels.csv"
    index_file = "/Users/niharchavan/Desktop/Hackverse/hotels_index.json"
    destinations_file = "/Users/niharchavan/Desktop/Hackverse/Tourist_Destinations.csv"
    restaurants_file = "/Users/niharchavan/Desktop/Hackverse/Dataset .csv"
    
    results = {
        "hotels": [],
        "attractions": [],
        "restaurants": []
    }
    
    # 1. SEARCH HOTELS (Using the high-performance seeker index)
    if os.path.exists(index_file) and os.path.exists(hotels_file):
        try:
            with open(index_file, "r", encoding="utf-8") as index_f:
                index_data = json.load(index_f)
            
            city_offsets = index_data.get("city_offsets", {})
            country_offsets = index_data.get("country_offsets", {})
            
            # Find matching keys
            offsets = []
            if query_text in city_offsets:
                offsets = city_offsets[query_text]
            elif query_text in country_offsets:
                offsets = country_offsets[query_text]
            else:
                # Fuzzy match
                for city_key in city_offsets:
                    if query_text in city_key or city_key in query_text:
                        offsets = city_offsets[city_key]
                        break
                if not offsets:
                    for country_key in country_offsets:
                        if query_text in country_key or country_key in query_text:
                            offsets = country_offsets[country_key]
                            break
            
            # Retrieve hotel rows
            if offsets:
                with open(hotels_file, "rb") as f:
                    for offset in offsets[:10]: # Limit to 10 hotels
                        f.seek(offset)
                        line = f.readline().decode('utf-8', errors='ignore')
                        # Simple split or csv reader
                        row = list(csv.reader([line]))[0]
                        if len(row) >= 10:
                            results["hotels"].append({
                                "name": row[5].strip(),
                                "rating": row[6].strip(),
                                "address": row[7].strip(),
                                "description": row[9].strip(),
                                "facilities": row[11].strip(),
                                "coordinates": row[12].strip(),
                                "website": row[15].strip() if len(row) > 15 else ""
                            })
        except Exception as e:
            sys.stderr.write(f"Error searching hotels: {e}\n")
            
    # Tokenize the query to support multi-word or comma-separated queries
    query_tokens = [t.strip() for t in query_text.replace(',', ' ').split() if len(t.strip()) > 1]

    # 2. SEARCH TOURIST DESTINATIONS
    if os.path.exists(destinations_file):
        try:
            with open(destinations_file, "r", encoding="utf-8", errors="ignore") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    country = row.get("Country", "").strip().lower()
                    dest_name = row.get("Destination Name", "").strip().lower()
                    continent = row.get("Continent", "").strip().lower()
                    
                    match = False
                    if country and (query_text in country or country in query_text or any(t in country for t in query_tokens)):
                        match = True
                    elif dest_name and (query_text in dest_name or dest_name in query_text or any(t in dest_name for t in query_tokens)):
                        match = True
                    elif continent and (query_text in continent or continent in query_text or any(t in continent for t in query_tokens)):
                        match = True
                        
                    if match:
                        results["attractions"].append({
                            "name": row.get("Destination Name", ""),
                            "country": row.get("Country", ""),
                            "continent": row.get("Continent", ""),
                            "type": row.get("Type", ""),
                            "priceTier": "$$" if float(row.get("Avg Cost (USD/day)", 150)) > 150 else "$",
                            "rating": float(row.get("Avg Rating", 4.5)),
                            "description": f"A highly acclaimed {row.get('Type', 'sightseeing')} destination in {row.get('Country', '')}. Rated {row.get('Avg Rating', '4.5')} stars with over {row.get('Annual Visitors (M)', '2')}M annual visitors."
                        })
                        if len(results["attractions"]) >= 15:
                            break
        except Exception as e:
            sys.stderr.write(f"Error searching attractions: {e}\n")
            
    # 3. SEARCH RESTAURANTS
    if os.path.exists(restaurants_file):
        try:
            with open(restaurants_file, "r", encoding="utf-8", errors="ignore") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    city = row.get("City", "").strip().lower()
                    cuisines = row.get("Cuisines", "").strip().lower()
                    rest_name = row.get("Restaurant Name", "").strip().lower()
                    
                    match = False
                    if city and (query_text in city or city in query_text or any(t in city for t in query_tokens)):
                        match = True
                    elif cuisines and (query_text in cuisines or cuisines in query_text or any(t in cuisines for t in query_tokens)):
                        match = True
                    elif rest_name and (query_text in rest_name or rest_name in query_text or any(t in rest_name for t in query_tokens)):
                        match = True
                        
                    if match:
                        
                        results["restaurants"].append({
                            "name": row.get("Restaurant Name", ""),
                            "city": row.get("City", ""),
                            "address": row.get("Address", ""),
                            "vibe": row.get("Cuisines", "").split(',')[0] if row.get("Cuisines", "") else "Casual Dining",
                            "description": f"Located at {row.get('Address', '')}. Offers highly rated {row.get('Cuisines', 'local')} cuisine. Average cost for two: {row.get('Average Cost for two', '')} {row.get('Currency', '')}.",
                            "rating": float(row.get("Aggregate rating", 4.0)) if row.get("Aggregate rating", "") else 4.0
                        })
                        if len(results["restaurants"]) >= 15:
                            break
        except Exception as e:
            sys.stderr.write(f"Error searching restaurants: {e}\n")
            
    return results

if __name__ == "__main__":
    query = "las vegas"
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        
    res = search_query(query)
    print(json.dumps(res, indent=2))
