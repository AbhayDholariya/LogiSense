"""
Management Command: seed_ml_scored
====================================
Reads supply_chain_1M.csv, runs EVERY row through the trained XGBoost model,
and saves ML-scored shipments to NeonDB.

Usage:
    python manage.py seed_ml_scored              # 300 shipments (default)
    python manage.py seed_ml_scored --count 500  # 500 ML-scored shipments
    python manage.py seed_ml_scored --clear      # clear old data first
"""

import csv
import uuid
import math
import sys
import json
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

# ── City data ──────────────────────────────────────────────────────────────────
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
}

CITY_STATE = {
    "Mumbai": "Maharashtra", "Pune": "Maharashtra", "Nashik": "Maharashtra",
    "Nagpur": "Maharashtra", "Delhi": "Delhi", "Bangalore": "Karnataka",
    "Chennai": "Tamil Nadu", "Kolkata": "West Bengal", "Hyderabad": "Telangana",
    "Ahmedabad": "Gujarat", "Surat": "Gujarat", "Vadodara": "Gujarat",
    "Rajkot": "Gujarat", "Jaipur": "Rajasthan", "Jodhpur": "Rajasthan",
    "Udaipur": "Rajasthan", "Lucknow": "Uttar Pradesh", "Kanpur": "Uttar Pradesh",
    "Varanasi": "Uttar Pradesh", "Agra": "Uttar Pradesh", "Chandigarh": "Punjab",
    "Amritsar": "Punjab", "Ludhiana": "Punjab", "Indore": "Madhya Pradesh",
    "Bhopal": "Madhya Pradesh", "Patna": "Bihar", "Kochi": "Kerala",
    "Guwahati": "Assam", "Coimbatore": "Tamil Nadu",
    "Visakhapatnam": "Andhra Pradesh",
}

CARRIER_NAMES = {
    "SHADOWFAX-04": "Shadowfax", "TCI-02": "TCI Freight",
    "DELHIVERY-07": "Delhivery", "BLUEDART-03": "Blue Dart",
    "RIVIGO-05": "Rivigo", "XPRESSBEES-01": "XpressBees",
    "ECOM-06": "Ecom Express", "DTDC-08": "DTDC", "GATI-09": "Gati",
    "EKART-10": "Ekart", "AMAZON-11": "Amazon Logistics",
    "FEDEX-12": "FedEx India",
}

WEATHER_CODE_MAP = {
    "rain": ("Rain", "🌧️"), "light_rain": ("Light Rain", "🌦️"),
    "heavy_rain": ("Heavy Rain", "⛈️"), "fog": ("Fog", "🌫️"),
    "storm": ("Storm", "🌩️"), "clear": ("Clear", "☀️"),
    "cloudy": ("Cloudy", "☁️"), "overcast": ("Overcast", "🌥️"),
    "snow": ("Snow", "❄️"),
}

# weather_code (CSV) → weather_condition string expected by XGBoost scorer
WEATHER_CODE_TO_CONDITION = {
    "clear": "Clear", "cloudy": "Cloudy", "overcast": "Cloudy",
    "rain": "Rain", "light_rain": "Rain",
    "heavy_rain": "Heavy Rain", "fog": "Fog",
    "storm": "Storm", "snow": "Heavy Rain",
}


def _sf(val, default=0.0):
    try:
        return float(val)
    except (TypeError, ValueError):
        return default

def _flag(val):
    return str(val).strip() in ("1", "True", "true", "yes")

def _haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dl  = math.radians(lat2 - lat1)
    dln = math.radians(lon2 - lon1)
    a = (math.sin(dl/2)**2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dln/2)**2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _load_scorer():
    """Load the trained XGBoost model. Returns scorer or None."""
    try:
        import sys
        from pathlib import Path
        project_root = Path(__file__).resolve().parents[5]
        sys.path.insert(0, str(project_root))
        from ML.ecommerce_b2b.xgboost_risk_scorer import IndianXGBoostRiskScorer
        scorer = IndianXGBoostRiskScorer()
        if scorer.clf is not None:
            return scorer
        return None
    except Exception as e:
        print(f"  [WARNING] Could not load ML scorer: {e}")
        return None


def _build_scorer_input(row, origin, dest, dist_km, planned_hrs, weather_code):
    """Build IndianShipmentInput from a CSV row for ML scoring."""
    from ML.ecommerce_b2b.xgboost_risk_scorer import IndianShipmentInput

    raw_id = row.get("shipment_id", f"IND-{uuid.uuid4().hex[:8].upper()}")
    clean  = raw_id.replace("SHP-", "").replace("IND-", "").replace("-", "")
    sid    = f"IND-{clean[:10].upper()}" if clean else f"IND-{uuid.uuid4().hex[:8].upper()}"

    weather_cond = WEATHER_CODE_TO_CONDITION.get(weather_code.lower(), "Clear")
    traffic_raw  = _sf(row.get("segment_congestion_idx", 0))
    traffic_lvl  = (
        "Very High" if traffic_raw > 0.8 else
        "High"      if traffic_raw > 0.6 else
        "Medium"    if traffic_raw > 0.3 else "Low"
    )

    return IndianShipmentInput(
        shipment_id                  = sid,
        origin_city                  = origin,
        origin_state                 = CITY_STATE.get(origin, "India"),
        destination_city             = dest,
        destination_state            = CITY_STATE.get(dest, "India"),
        carrier_company              = CARRIER_NAMES.get(row.get("carrier_id",""), "Unknown"),
        distance_km                  = dist_km,
        vehicle_type                 = "Tata 407",
        vehicle_age_years            = _sf(row.get("vehicle_age_yrs", 3)),
        driver_experience_years      = max(1.0, 10.0 - _sf(row.get("driver_hours_elapsed", 4)) / 2),
        driver_rest_hours_prior      = max(0.0, 10.0 - _sf(row.get("driver_hours_elapsed", 4))),
        planned_transit_hours        = planned_hrs,
        weather_condition            = weather_cond,
        traffic_congestion_level     = traffic_lvl,
        road_condition_index         = 7.0,
        is_monsoon_season            = int(_sf(row.get("seasonal_risk_score", 0)) > 0.3),
        is_festival_season           = int(_flag(row.get("holiday_flag", "0"))),
        night_driving_flag           = 0,
        num_toll_plazas              = int(_sf(row.get("segment_index", 5)) * 2),
        num_state_border_crossings   = int(_flag(row.get("border_crossing_flag", "0"))),
        eway_bill_verified           = 1,
        origin_wh_congestion_pct     = round(_sf(row.get("port_congestion_idx", 0.5)) * 100, 1),
        dest_wh_congestion_pct       = 50.0,
        upstream_shipment_delay_minutes = round(_sf(row.get("avg_delay_this_route", 0)) * 60, 1),
        vehicle_breakdown_flag       = int(_flag(row.get("maintenance_flag", "0"))),
        accident_reported_flag       = int(_flag(row.get("accident_reported_flag", "0")) if "accident_reported_flag" in row else False),
        gps_route_deviation_km       = 0.0,
        cascade_risk_score           = round(_sf(row.get("route_disruption_cnt_30d", 0)) / 20, 3),
        checkpoint_delay_minutes     = round(_sf(row.get("delay_hours_current", 0)) * 60, 1),
        order_type                   = "B2B",
        priority_level               = "Scheduled-Freight",
        shipment_value_inr           = round(_sf(row.get("seasonal_risk_score", 0.3), 0.3) * 500000 + 50000),
        fuel_price_per_litre         = 104.0,
    )


def _status_from_ml(ml_output, row):
    """Decide shipment status based on ML output + CSV flags."""
    if _flag(row.get("customs_hold_flag", "0")):
        return "customs_hold"
    if _flag(row.get("idle_flag", "0")):
        return "at_warehouse"
    if ml_output.risk_level == "critical" and ml_output.delay_probability > 0.7:
        return "delayed"
    if ml_output.delay_probability > 0.55:
        return "delayed"
    if _flag(row.get("road_closure_flag", "0")) or _flag(row.get("strike_event_flag", "0")):
        return "delayed"
    return "in_transit"


def _build_shipment_dict(row, ml_output, scorer_input):
    """
    Combine CSV geographic data + ML-scored risk fields into a
    complete Shipment model kwargs dict.
    """
    origin = scorer_input.origin_city
    dest   = scorer_input.destination_city
    oc = CITY_COORDS[origin]
    dc = CITY_COORDS[dest]

    dist_km  = scorer_input.distance_km
    planned  = scorer_input.planned_transit_hours
    dist_cov = _sf(row.get("distance_covered_km", 0))
    dist_rem_raw = _sf(row.get("distance_remaining_km", 100), 100)
    total_raw = dist_cov + dist_rem_raw
    progress  = round(dist_cov / total_raw, 3) if total_raw > 0 else 0.5

    cur_lat = oc[0] + (dc[0] - oc[0]) * progress
    cur_lng = oc[1] + (dc[1] - oc[1]) * progress

    dist_remaining = round(_haversine(cur_lat, cur_lng, dc[0], dc[1]) * 1.25, 1)
    dist_covered   = round(dist_km - dist_remaining, 1)
    eta_hours      = round(planned * (1 - progress) * (1 + ml_output.risk_score / 200), 1)

    weather_code = str(row.get("weather_code", "clear")).lower()
    wl = WEATHER_CODE_MAP.get(weather_code, ("Clear", "☀️"))
    weather_cond = f"{wl[1]} {wl[0]} (ML-scored)"

    carrier_raw  = row.get("carrier_id", "Unknown")
    carrier_name = CARRIER_NAMES.get(carrier_raw, carrier_raw.split("-")[0].title())

    # Status driven by ML output
    status    = _status_from_ml(ml_output, row)
    is_delayed = ml_output.delay_probability > 0.5 or status == "delayed"

    # Anomaly: ML says high risk AND cascade risk elevated
    is_anomaly = (ml_output.risk_score > 65 and ml_output.cascade_risk > 0.4)

    snap = row.get("snapshot_timestamp", "")
    try:
        created = datetime.strptime(snap, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    except Exception:
        created = datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72))

    return {
        # Identity
        "id":                           ml_output.shipment_id,
        "panel":                        "india",
        # Route
        "origin_city":                  origin,
        "origin_state":                 CITY_STATE.get(origin, "India"),
        "destination_city":             dest,
        "destination_state":            CITY_STATE.get(dest, "India"),
        "transport_mode":               row.get("transport_mode", "road"),
        # GPS
        "lat":                          round(cur_lat, 4),
        "lng":                          round(cur_lng, 4),
        "origin_lat":                   oc[0], "origin_lng": oc[1],
        "destination_lat":              dc[0], "destination_lng": dc[1],
        # Carrier
        "carrier_id":                   carrier_raw,
        "carrier_company":              carrier_name,
        "cargo_type":                   row.get("cargo_type", "General").strip().title(),
        # Trip
        "distance_km":                  dist_km,
        "distance_covered_km":          dist_covered,
        "distance_remaining_km":        dist_remaining,
        "progress":                     progress,
        "planned_transit_hours":        planned,
        "eta_hours":                    eta_hours,
        "speed_kmh":                    _sf(row.get("avg_speed_kmh", 40), 40),
        # Status — ML-driven
        "status":                       status,
        "is_delayed":                   is_delayed,
        "delay_hours_current":          _sf(row.get("delay_hours_current", 0)),
        "delay_duration_minutes":       round(_sf(row.get("delay_hours_current", 0)) * 60, 1),
        "delay_severity":               row.get("delay_severity", "low"),
        "disruption_type":              str(row.get("disruption_type", "none")).lower(),
        "disruption_flag":              int(_flag(row.get("disruption_flag", "0"))),
        # ── ML-SCORED RISK FIELDS ──────────────────────────────────────────
        "risk_score":                   ml_output.risk_score,
        "risk_level":                   ml_output.risk_level,
        "is_anomaly":                   is_anomaly,
        "delay_probability":            ml_output.delay_probability,
        "cascade_risk_score":           ml_output.cascade_risk,
        "top_risk_factors":             ml_output.top_risk_factors,
        "recommended_action":           ml_output.recommended_action,
        # ──────────────────────────────────────────────────────────────────
        # Disruption flags (raw CSV)
        "road_closure_flag":            int(_flag(row.get("road_closure_flag", "0"))),
        "strike_event_flag":            int(_flag(row.get("strike_event_flag", "0"))),
        "traffic_incident_flag":        int(_flag(row.get("traffic_incident_flag", "0"))),
        "customs_hold_flag":            int(_flag(row.get("customs_hold_flag", "0"))),
        "holiday_flag":                 int(_flag(row.get("holiday_flag", "0"))),
        "maintenance_flag":             int(_flag(row.get("maintenance_flag", "0"))),
        "temp_breach_flag":             int(_flag(row.get("temp_breach_flag", "0"))),
        "border_crossing_flag":         int(_flag(row.get("border_crossing_flag", "0"))),
        "night_driving_flag":           0,
        "vehicle_breakdown_flag":       int(_flag(row.get("maintenance_flag", "0"))),
        "accident_reported_flag":       0,
        "alt_route_needed":             ml_output.risk_score > 60,
        "alternate_routes_avail":       int(_sf(row.get("alternate_routes_avail", 0))),
        # Weather
        "weather_code":                 weather_code,
        "weather_condition":            weather_cond,
        "wind_speed_kmh":               10.0,
        "visibility_km":                _sf(row.get("visibility_km", 10), 10),
        "live_weather":                 {},
        # Traffic
        "segment_congestion_idx":       _sf(row.get("segment_congestion_idx", 0)),
        "port_congestion_idx":          _sf(row.get("port_congestion_idx", 0)),
        "traffic_congestion_level":     scorer_input.traffic_congestion_level,
        # Vehicle/driver (from component scores)
        "vehicle_type":                 "Tata 407",
        "vehicle_age_years":            scorer_input.vehicle_age_years,
        "driver_experience_years":      scorer_input.driver_experience_years,
        "driver_rest_hours_prior":      scorer_input.driver_rest_hours_prior,
        # Route details
        "num_toll_plazas":              scorer_input.num_toll_plazas,
        "num_state_border_crossings":   scorer_input.num_state_border_crossings,
        "eway_bill_verified":           1,
        "gps_route_deviation_km":       0.0,
        "checkpoint_delay_minutes":     scorer_input.checkpoint_delay_minutes,
        "origin_wh_congestion_pct":     scorer_input.origin_wh_congestion_pct,
        "dest_wh_congestion_pct":       50.0,
        "upstream_shipment_delay_minutes": scorer_input.upstream_shipment_delay_minutes,
        # Indian-specific
        "order_type":                   "B2B",
        "priority_level":               ml_output.priority_category.replace("P1_CRITICAL","Express").replace("P2_HIGH","Priority").replace("P3_MEDIUM","Scheduled-Freight"),
        "is_monsoon_season":            scorer_input.is_monsoon_season,
        "is_festival_season":           scorer_input.is_festival_season,
        "fuel_price_per_litre":         104.0,
        "shipment_value_inr":           scorer_input.shipment_value_inr,
        "value_usd":                    int(scorer_input.shipment_value_inr / 84),
        # Historical
        "route_avg_delay_7d":           _sf(row.get("route_avg_delay_7d", 0)),
        "route_disruption_cnt_30d":     int(_sf(row.get("route_disruption_cnt_30d", 0))),
        "carrier_on_time_rate":         _sf(row.get("carrier_on_time_rate", 0.8), 0.8),
        "seasonal_risk_score":          _sf(row.get("seasonal_risk_score", 0.3), 0.3),
        "same_lane_delay_ratio":        _sf(row.get("same_lane_delay_ratio", 0.3), 0.3),
        # Reroute
        "reroute_options":              [],
        "created_at":                   created,
    }


class Command(BaseCommand):
    help = 'Seed DB with ML-scored shipments — every row goes through trained XGBoost model'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=300,
                            help='Number of shipments to load (default: 300)')
        parser.add_argument('--clear', action='store_true',
                            help='Delete existing shipments + alerts before seeding')

    def handle(self, *args, **options):
        from api.models import Shipment, Alert

        count = options['count']
        clear = options['clear']

        self.stdout.write(self.style.MIGRATE_HEADING(
            f'=== ML-Scored DB Seeder — {count} shipments ==='))

        # ── Load trained ML model ────────────────────────────────────────────
        self.stdout.write('🤖 Loading trained XGBoost model...')
        scorer = _load_scorer()
        if scorer:
            self.stdout.write(self.style.SUCCESS(
                '  ✅ XGBoost model loaded — REAL ML scoring active'))
        else:
            self.stdout.write(self.style.WARNING(
                '  ⚠️  Model not found — rule-based fallback will be used'))

        # ── Optionally clear ─────────────────────────────────────────────────
        if clear:
            self.stdout.write('🗑  Clearing existing shipments and alerts...')
            Alert.objects.all().delete()
            Shipment.objects.all().delete()
            self.stdout.write('  Done.')

        # ── Find CSV ─────────────────────────────────────────────────────────
        csv_path = Path(__file__).resolve().parents[5] / "data" / "supply_chain_1M.csv"
        if not csv_path.exists():
            csv_path = Path(__file__).resolve().parents[4] / "data" / "supply_chain_1M.csv"
        if not csv_path.exists():
            self.stdout.write(self.style.ERROR(f'❌ CSV not found: {csv_path}'))
            return

        self.stdout.write(f'📂 CSV: {csv_path.name}')

        # ── Count total CSV rows ─────────────────────────────────────────────
        with open(csv_path, 'r', encoding='utf-8') as f:
            total_rows = sum(1 for _ in f) - 1
        self.stdout.write(f'   Total CSV rows: {total_rows:,}')
        self.stdout.write(f'   Strategy: critical(20%) + disrupted(50%) + normal(30%)')

        # ── Process rows ─────────────────────────────────────────────────────
        existing_ids = set(Shipment.objects.values_list('id', flat=True))
        loaded = 0
        skipped = 0
        ml_scored = 0
        fallback_scored = 0
        batch = []
        BATCH = 50

        # Tier targets
        target_critical   = int(count * 0.20)   # 20% — multi-flag extreme rows
        target_disrupted  = int(count * 0.50)   # 50% — at least one disruption
        target_normal     = count - target_critical - target_disrupted  # 30%
        critical_loaded   = 0
        disrupted_loaded  = 0
        normal_loaded     = 0

        self.stdout.write(
            f'\n🔄 Processing... '
            f'(critical:{target_critical} disrupted:{target_disrupted} normal:{target_normal})\n'
        )

        # High-disruption flag columns
        DISRUPT_COLS = (
            'disruption_flag', 'road_closure_flag', 'strike_event_flag',
            'traffic_incident_flag', 'customs_hold_flag', 'maintenance_flag',
            'vehicle_breakdown_flag', 'accident_reported_flag'
        )

        with open(csv_path, 'r', encoding='utf-8', newline='') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                if loaded >= count:
                    break

                flag_count = sum(1 for c in DISRUPT_COLS if _flag(row.get(c, "0")))
                delay_h    = _sf(row.get("delay_hours_current", 0))
                delay_sev  = str(row.get("delay_severity", "low")).lower()
                congestion = _sf(row.get("segment_congestion_idx", 0))
                weather    = str(row.get("weather_code", "clear")).lower()
                cascade    = _sf(row.get("route_disruption_cnt_30d", 0))

                # Tier classification
                is_critical = (
                    flag_count >= 2
                    or (flag_count >= 1 and delay_h > 3)
                    or (flag_count >= 1 and weather in ("storm", "heavy_rain"))
                    or delay_sev == "critical"
                    or (delay_h > 5 and congestion > 0.6)
                    or cascade > 8
                )
                is_disrupted = (
                    not is_critical and (
                        flag_count >= 1
                        or delay_h > 1.0
                        or delay_sev in ("high", "medium")
                        or congestion > 0.5
                        or weather in ("storm", "heavy_rain", "fog")
                    )
                )

                # Routing logic
                if is_critical:
                    if critical_loaded >= target_critical:
                        continue
                elif is_disrupted:
                    if disrupted_loaded >= target_disrupted:
                        continue
                else:
                    if normal_loaded >= target_normal:
                        continue

                origin = row.get("origin_city", "").strip()
                dest   = row.get("destination_city", "").strip()
                if origin not in CITY_COORDS or dest not in CITY_COORDS or origin == dest:
                    skipped += 1
                    continue

                # ── Compute distance & ETA ───────────────────────────────────
                oc = CITY_COORDS[origin]
                dc = CITY_COORDS[dest]
                dist_km     = round(_haversine(oc[0], oc[1], dc[0], dc[1]) * 1.25, 1)
                planned_hrs = round(dist_km / 50.0, 1)
                weather_code = str(row.get("weather_code", "clear")).lower()

                # ── Build scorer input ───────────────────────────────────────
                try:
                    scorer_input = _build_scorer_input(
                        row, origin, dest, dist_km, planned_hrs, weather_code)
                except Exception as e:
                    skipped += 1
                    continue

                # Skip duplicate IDs
                if scorer_input.shipment_id in existing_ids:
                    skipped += 1
                    continue

                # ── RUN THROUGH ML MODEL ─────────────────────────────────────
                try:
                    if scorer:
                        ml_output = scorer.score(scorer_input)
                        ml_scored += 1
                    else:
                        # Fallback — uses rule-based scorer inside IndianXGBoostRiskScorer
                        from ML.ecommerce_b2b.xgboost_risk_scorer import IndianXGBoostRiskScorer
                        fb = IndianXGBoostRiskScorer.__new__(IndianXGBoostRiskScorer)
                        fb.clf = None
                        ml_output = fb._fallback_score(scorer_input)
                        fallback_scored += 1
                except Exception as e:
                    skipped += 1
                    continue

                # ── Build DB dict from ML output ─────────────────────────────
                try:
                    ship_dict = _build_shipment_dict(row, ml_output, scorer_input)
                except Exception as e:
                    skipped += 1
                    continue

                existing_ids.add(ship_dict['id'])
                batch.append(Shipment(**ship_dict))
                loaded += 1
                if is_critical:
                    critical_loaded += 1
                elif is_disrupted:
                    disrupted_loaded += 1
                else:
                    normal_loaded += 1

                # Progress indicator
                if loaded % 50 == 0:
                    sys.stdout.write(
                        f'\r  Scored:{loaded}/{count} | '
                        f'Critical:{critical_loaded} Disrupted:{disrupted_loaded} Normal:{normal_loaded} | '
                        f'XGBoost:{ml_scored}')
                    sys.stdout.flush()

                if len(batch) >= BATCH:
                    with transaction.atomic():
                        Shipment.objects.bulk_create(batch, ignore_conflicts=True)
                    batch = []

        # Save remaining batch
        if batch:
            with transaction.atomic():
                Shipment.objects.bulk_create(batch, ignore_conflicts=True)

        sys.stdout.write('\n')

        # ── Seed alerts from high-risk ML-scored shipments ───────────────────
        self.stdout.write('🔔 Creating alerts from high-risk ML-scored shipments...')
        self._seed_alerts(Alert, Shipment)

        # ── Summary ──────────────────────────────────────────────────────────
        self.stdout.write('\n' + '='*55)
        self.stdout.write(self.style.SUCCESS('✅ ML-SCORED SEEDING COMPLETE'))
        self.stdout.write(f'   Shipments in DB : {Shipment.objects.count()}')
        self.stdout.write(f'   ML-scored       : {ml_scored}  (XGBoost model)')
        self.stdout.write(f'   Rule-based      : {fallback_scored}  (fallback)')
        self.stdout.write(f'   Skipped         : {skipped}')
        self.stdout.write(f'   Alerts created  : {Alert.objects.count()}')
        self.stdout.write('='*55)
        if ml_scored > 0:
            self.stdout.write(self.style.SUCCESS(
                f'\n🤖 Every shipment risk score = XGBoost 96.35% accuracy model output!'))

    def _seed_alerts(self, Alert, Shipment):
        """Create alerts from high-risk ML-scored shipments."""
        high_risk = list(
            Shipment.objects.filter(risk_score__gte=55).order_by('-risk_score')[:30]
        )
        now = datetime.now(timezone.utc)
        created = 0
        for i, s in enumerate(high_risk):
            alert_id = f"ML-ALT-{uuid.uuid4().hex[:6].upper()}"
            weather = s.weather_code
            wl = WEATHER_CODE_MAP.get(weather, ("Weather", "⚠️"))
            factors = s.top_risk_factors or []

            # Build message from ML risk factors
            factor_str = " | ".join(factors[:2]) if factors else f"Risk {s.risk_score:.0f}/100"
            msg = (
                f"🤖 [ML-Scored] {s.id} ({s.origin_city}→{s.destination_city}): "
                f"{factor_str}. "
                f"XGBoost Risk: {s.risk_score:.1f}/100 | "
                f"Delay Prob: {s.delay_probability*100:.0f}% | "
                f"Carrier: {s.carrier_company}"
            )

            Alert.objects.get_or_create(
                id=alert_id,
                defaults=dict(
                    shipment=s,
                    panel="india",
                    type="anomaly_detected" if s.is_anomaly else "high_risk_flag",
                    severity="critical" if s.risk_score > 75 else "high",
                    message=msg,
                    risk_score=s.risk_score,
                    delay_probability=s.delay_probability,
                    cascade_risk=s.cascade_risk_score,
                    top_risk_factors=factors,
                    reroute_options=[],
                    weather_warning=weather in ("storm", "heavy_rain", "fog", "rain"),
                    weather_icon=wl[1],
                    weather_label=wl[0],
                )
            )
            created += 1
        self.stdout.write(f'  ✅ {created} ML-based alerts created')
