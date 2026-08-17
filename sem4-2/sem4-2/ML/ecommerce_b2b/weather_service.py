"""
Live OpenWeather API Service (ML Module)
========================================
Fetches real-time live weather data for Indian cities using OpenWeather API.
Uses os.getenv('OPENWEATHER_API_KEY') to securely access the API key.
"""

import os
import sys
from pathlib import Path

# Import from django_backend if available or replicate helper
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

try:
    from django_backend.api.weather_service import get_live_weather
except ImportError:
    import time
    import json
    import urllib.request
    import urllib.parse
    import logging

    logger = logging.getLogger(__name__)

    _WEATHER_CACHE = {}
    CACHE_TTL_SECONDS = 900

    def get_live_weather(city_name: str = "Mumbai") -> dict:
        clean_city = (city_name or "Mumbai").strip().title()
        now = time.time()

        if clean_city in _WEATHER_CACHE:
            ts, data = _WEATHER_CACHE[clean_city]
            if now - ts < CACHE_TTL_SECONDS:
                return data

        api_key = os.getenv("OPENWEATHER_API_KEY", "").strip()
        if not api_key:
            return _get_fallback_weather(clean_city)

        try:
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
                    humidity = float(main_metrics.get("humidity", 65.0))
                    wind_info = raw_data.get("wind", {})
                    wind_kmh = round(float(wind_info.get("speed", 3.0)) * 3.6, 1)
                    vis_km = round(float(raw_data.get("visibility", 10000)) / 1000.0, 1)

                    c = main_cond.lower()
                    if "thunderstorm" in c or "storm" in c:
                        weather_code = "storm"
                        severity = 8.5
                    elif "rain" in c:
                        weather_code = "rain"
                        severity = 5.0
                    elif "fog" in c or "mist" in c:
                        weather_code = "fog"
                        severity = 4.0
                    elif "cloud" in c:
                        weather_code = "cloudy"
                        severity = 2.0
                    else:
                        weather_code = "clear"
                        severity = 0.5

                    result = {
                        "city": clean_city,
                        "temp_c": temp_c,
                        "humidity": humidity,
                        "wind_speed_kmh": wind_kmh,
                        "visibility_km": vis_km,
                        "weather_condition": main_cond,
                        "weather_description": description.title(),
                        "weather_code": weather_code,
                        "weather_severity": severity,
                        "icon": "🌧️" if "rain" in c else "☀️",
                        "is_live": True
                    }
                    _WEATHER_CACHE[clean_city] = (now, result)
                    return result
        except Exception:
            pass

        return _get_fallback_weather(clean_city)

    def _get_fallback_weather(city_name: str) -> dict:
        return {
            "city": city_name,
            "temp_c": 28.5,
            "humidity": 65.0,
            "wind_speed_kmh": 12.0,
            "visibility_km": 8.5,
            "weather_condition": "Clear",
            "weather_description": "Clear Sky",
            "weather_code": "clear",
            "weather_severity": 1.0,
            "icon": "☀️",
            "is_live": False
        }
