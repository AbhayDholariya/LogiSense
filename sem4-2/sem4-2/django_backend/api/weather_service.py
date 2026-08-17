"""
Live OpenWeather API Service
============================
Fetches real-time live weather data for Indian cities using OpenWeather API.
Uses os.getenv('OPENWEATHER_API_KEY') to securely access the API key.
Includes 15-minute TTL caching for high performance and zero redundant API calls.
"""

import os
import time
import json
import urllib.request
import urllib.parse
import logging

logger = logging.getLogger(__name__)

# TTL Cache dictionary: { city_name: (timestamp, weather_data_dict) }
_WEATHER_CACHE = {}
CACHE_TTL_SECONDS = 900  # 15 minutes

# Default fallback coordinates / cities in India — covers all cities used in in_memory_store
CITY_COORDS = {
    "Mumbai": (19.0760, 72.8777), "Delhi": (28.6139, 77.2090),
    "Bangalore": (12.9716, 77.5946), "Chennai": (13.0827, 80.2707),
    "Kolkata": (22.5726, 88.3639), "Hyderabad": (17.3850, 78.4867),
    "Pune": (18.5204, 73.8567), "Ahmedabad": (23.0225, 72.5714),
    "Surat": (21.1702, 72.8311), "Jaipur": (26.9124, 75.7873),
    "Lucknow": (26.8467, 80.9462), "Nagpur": (21.1458, 79.0882),
    "Coimbatore": (11.0168, 76.9558), "Chandigarh": (30.7333, 76.7794),
    "Indore": (22.7196, 75.8577), "Bhopal": (23.2599, 77.4126),
    "Patna": (25.5941, 85.1376), "Kochi": (9.9312, 76.2673),
    "Visakhapatnam": (17.6868, 83.2185), "Guwahati": (26.1445, 91.7362),
    "Rajkot": (22.3039, 70.8022), "Vadodara": (22.3072, 73.1812),
    "Nashik": (19.9975, 73.7898), "Varanasi": (25.3176, 82.9739),
    "Agra": (27.1767, 78.0081), "Ludhiana": (30.9010, 75.8573),
    "Amritsar": (31.6340, 74.8723), "Jodhpur": (26.2389, 73.0243),
    "Udaipur": (24.5854, 73.7125), "Kanpur": (26.4499, 80.3319),
    "Vijayawada": (16.5062, 80.6480), "Mysore": (12.2958, 76.6394),
    "Bhavnagar": (21.7645, 72.1519), "Faridabad": (28.4089, 77.3178),
    "Meerut": (28.9845, 77.7064), "Jabalpur": (23.1815, 79.9864),
    "Gwalior": (26.2183, 78.1828), "Raipur": (21.2514, 81.6296),
    "Hubli": (15.3647, 75.1240), "Mangalore": (12.9141, 74.8560),
    "Tirupur": (11.1085, 77.3411), "Madurai": (9.9252, 78.1198),
    "Srinagar": (34.0837, 74.7973), "Ranchi": (23.3441, 85.3096),
    "Bhubaneswar": (20.2961, 85.8245), "Siliguri": (26.7271, 88.3953),
}

def _calculate_severity(main_cond: str, wind_kmh: float, vis_km: float, humidity: float, temp_c: float) -> float:
    """Calculate dynamic weather severity score (0.0 to 10.0) from real-time weather metrics."""
    cond_lower = main_cond.lower()
    base_severity = 1.0
    
    if "thunderstorm" in cond_lower or "squall" in cond_lower or "tornado" in cond_lower:
        base_severity = 9.0
    elif "heavy" in cond_lower or "storm" in cond_lower:
        base_severity = 8.0
    elif "rain" in cond_lower or "drizzle" in cond_lower:
        base_severity = 5.5
    elif "fog" in cond_lower or "mist" in cond_lower or "haze" in cond_lower or "smoke" in cond_lower:
        base_severity = 4.5
    elif "cloud" in cond_lower:
        base_severity = 2.0
    elif "clear" in cond_lower:
        base_severity = 0.5

    # Adjust for high wind (> 35 km/h)
    if wind_kmh > 45:
        base_severity += 2.0
    elif wind_kmh > 25:
        base_severity += 1.0

    # Adjust for low visibility (< 3 km)
    if vis_km < 1.0:
        base_severity += 2.5
    elif vis_km < 3.0:
        base_severity += 1.5

    # Adjust for extreme temperatures
    if temp_c > 42.0 or temp_c < 3.0:
        base_severity += 1.5

    return round(min(max(base_severity, 0.0), 10.0), 1)

def _map_weather_code(main_cond: str) -> str:
    """Map OpenWeather condition to standard code."""
    c = main_cond.lower()
    if "thunderstorm" in c or "storm" in c:
        return "storm"
    if "rain" in c and ("heavy" in c or "extreme" in c):
        return "heavy_rain"
    if "rain" in c or "drizzle" in c:
        return "rain"
    if "fog" in c or "mist" in c or "haze" in c:
        return "fog"
    if "cloud" in c:
        return "cloudy"
    return "clear"

def _map_icon(weather_code: str) -> str:
    icons = {
        "storm": "🌩️",
        "heavy_rain": "⛈️",
        "rain": "🌧️",
        "fog": "🌫️",
        "cloudy": "☁️",
        "clear": "☀️",
    }
    return icons.get(weather_code, "🌦️")

def get_live_weather(city_name: str = "Mumbai") -> dict:
    """
    Fetch live weather for city using OpenWeather API key from environment variable os.getenv('OPENWEATHER_API_KEY').
    Returns dictionary with live weather data.
    """
    clean_city = (city_name or "Mumbai").strip().title()
    now = time.time()

    # Check cache first
    if clean_city in _WEATHER_CACHE:
        ts, data = _WEATHER_CACHE[clean_city]
        if now - ts < CACHE_TTL_SECONDS:
            return data

    api_key = os.getenv("OPENWEATHER_API_KEY", "").strip()
    
    if not api_key:
        logger.warning("[WeatherService] OPENWEATHER_API_KEY environment variable not set.")
        return _get_fallback_weather(clean_city)

    try:
        # Construct OpenWeather API URL
        query = f"{clean_city},IN"
        url = f"https://api.openweathermap.org/data/2.5/weather?q={urllib.parse.quote(query)}&appid={api_key}&units=metric"
        
        req = urllib.request.Request(url, headers={"User-Agent": "LogiSense-SupplyChain/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                raw_data = json.loads(response.read().decode("utf-8"))
                
                weather_arr = raw_data.get("weather", [{}])
                main_cond = weather_arr[0].get("main", "Clear") if weather_arr else "Clear"
                description = weather_arr[0].get("description", "clear sky") if weather_arr else "clear sky"
                
                main_metrics = raw_data.get("main", {})
                temp_c = float(main_metrics.get("temp", 28.0))
                feels_like = float(main_metrics.get("feels_like", temp_c))
                humidity = float(main_metrics.get("humidity", 65.0))
                
                wind_info = raw_data.get("wind", {})
                wind_m_s = float(wind_info.get("speed", 3.0))
                wind_kmh = round(wind_m_s * 3.6, 1)
                
                vis_m = float(raw_data.get("visibility", 10000))
                vis_km = round(vis_m / 1000.0, 1)
                
                weather_code = _map_weather_code(main_cond)
                severity = _calculate_severity(main_cond, wind_kmh, vis_km, humidity, temp_c)
                icon = _map_icon(weather_code)

                result = {
                    "city": clean_city,
                    "temp_c": temp_c,
                    "feels_like": feels_like,
                    "humidity": humidity,
                    "wind_speed_kmh": wind_kmh,
                    "visibility_km": vis_km,
                    "weather_condition": main_cond,
                    "weather_description": description.title(),
                    "weather_code": weather_code,
                    "weather_severity": severity,
                    "icon": icon,
                    "is_live": True,
                    "fetched_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now))
                }
                
                # Update cache
                _WEATHER_CACHE[clean_city] = (now, result)
                return result

    except Exception as e:
        logger.error(f"[WeatherService] Failed to fetch live weather for {clean_city}: {e}")

    return _get_fallback_weather(clean_city)

def _get_fallback_weather(city_name: str) -> dict:
    """Fallback weather response if API is unreachable or key missing."""
    return {
        "city": city_name,
        "temp_c": 28.5,
        "feels_like": 30.0,
        "humidity": 65.0,
        "wind_speed_kmh": 12.0,
        "visibility_km": 8.5,
        "weather_condition": "Clear",
        "weather_description": "Clear Sky",
        "weather_code": "clear",
        "weather_severity": 1.0,
        "icon": "☀️",
        "is_live": False,
        "fetched_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    }
