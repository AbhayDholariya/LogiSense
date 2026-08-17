"""
Management Command: seed_db
============================
Usage:
    python manage.py seed_db              # loads 500 shipments + seeds admin users
    python manage.py seed_db --count 200  # loads 200 shipments
    python manage.py seed_db --clear      # clears existing shipments/alerts first
    python manage.py seed_db --users-only # only seeds admin contacts + operator user

This command:
  1. Creates AdminContact rows (vishv, jani)
  2. Creates the 'jani' India operator user (hashed password)
  3. Loads up to --count shipments from supply_chain_1M.csv
  4. Seeds ~20 alerts from high-risk shipments
"""

import csv
import uuid
import math
import random
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

# ─── Import models ────────────────────────────────────────────────────────────
# Models are imported inside handle() to avoid App registry issues
# if this command is run before migrations.


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
    "Guwahati": "Assam", "Coimbatore": "Tamil Nadu", "Visakhapatnam": "Andhra Pradesh",
}

CARRIER_NAMES = {
    "SHADOWFAX-04": "Shadowfax", "TCI-02": "TCI Freight", "DELHIVERY-07": "Delhivery",
    "BLUEDART-03": "Blue Dart", "RIVIGO-05": "Rivigo", "XPRESSBEES-01": "XpressBees",
    "ECOM-06": "Ecom Express", "DTDC-08": "DTDC", "GATI-09": "Gati",
    "EKART-10": "Ekart", "AMAZON-11": "Amazon Logistics", "FEDEX-12": "FedEx India",
}

WEATHER_LABEL = {
    "rain": ("Rain", "🌧️"), "light_rain": ("Light Rain", "🌦️"),
    "heavy_rain": ("Heavy Rain", "⛈️"), "fog": ("Fog", "🌫️"),
    "storm": ("Storm", "🌩️"), "clear": ("Clear", "☀️"),
    "cloudy": ("Cloudy", "☁️"), "overcast": ("Overcast", "🌥️"),
    "snow": ("Snow", "❄️"),
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
    dl = math.radians(lat2 - lat1)
    dln = math.radians(lon2 - lon1)
    a = math.sin(dl/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dln/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _risk_score(row):
    score = 20.0
    weather_risk = {"storm": 40, "heavy_rain": 35, "fog": 25, "snow": 30,
                    "rain": 20, "light_rain": 12, "overcast": 5, "cloudy": 3, "clear": 0}
    score += weather_risk.get(str(row.get("weather_code", "clear")).lower(), 5)
    score += _sf(row.get("segment_congestion_idx", 0)) * 20
    score += _sf(row.get("port_congestion_idx", 0)) * 10
    score += min(_sf(row.get("delay_hours_current", 0)) * 5, 25)
    if _flag(row.get("road_closure_flag", "0")):
        score += 20
    if _flag(row.get("strike_event_flag", "0")):
        score += 18
    if _flag(row.get("traffic_incident_flag", "0")):
        score += 12
    carrier_rate = _sf(row.get("carrier_on_time_rate", 0.8), 0.8)
    score += (1 - carrier_rate) * 20
    return round(min(max(score, 10.0), 100), 1)


def _row_to_shipment_dict(row):
    """Convert a CSV row dict to a Shipment model field dict."""
    raw_id = row.get("shipment_id", f"IND-{uuid.uuid4().hex[:8].upper()}")
    clean_id = raw_id.replace("SHP-", "").replace("IND-", "").replace("-", "")
    sid = f"IND-{clean_id[:10].upper()}" if clean_id else f"IND-{uuid.uuid4().hex[:8].upper()}"

    origin = row.get("origin_city", "Mumbai").strip()
    dest   = row.get("destination_city", "Delhi").strip()

    if origin not in CITY_COORDS or dest not in CITY_COORDS or origin == dest:
        return None

    orig_c = CITY_COORDS[origin]
    dest_c = CITY_COORDS[dest]
    orig_s = CITY_STATE.get(origin, "India")
    dest_s = CITY_STATE.get(dest, "India")

    dist_cov = _sf(row.get("distance_covered_km", 0))
    dist_rem = _sf(row.get("distance_remaining_km", 100), 100)
    total    = dist_cov + dist_rem
    progress = round(dist_cov / total, 3) if total > 0 else 0.5

    total_dist = round(_haversine(orig_c[0], orig_c[1], dest_c[0], dest_c[1]) * 1.25, 1)
    cur_lat = orig_c[0] + (dest_c[0] - orig_c[0]) * progress
    cur_lng = orig_c[1] + (dest_c[1] - orig_c[1]) * progress
    dist_remaining = round(_haversine(cur_lat, cur_lng, dest_c[0], dest_c[1]) * 1.25, 1)
    dist_covered   = round(total_dist - dist_remaining, 1)

    carrier_raw  = row.get("carrier_id", "Unknown")
    carrier_name = CARRIER_NAMES.get(carrier_raw, carrier_raw.split("-")[0].title())

    risk = _risk_score(row)
    risk_level = (
        "critical" if risk >= 75 else
        "high"     if risk >= 50 else
        "medium"   if risk >= 25 else "low"
    )
    delay_h    = _sf(row.get("delay_hours_current", 0))
    is_delayed = delay_h > 1.0 or str(row.get("delay_severity", "low")).lower() in ("high", "critical")
    status     = "delayed" if is_delayed else "in_transit"
    if _flag(row.get("customs_hold_flag", "0")):
        status = "customs_hold"
    if _flag(row.get("idle_flag", "0")):
        status = "at_warehouse"

    disruption = str(row.get("disruption_type", "none")).lower()
    is_anomaly = (
        disruption not in ("none", "no_action", "") and risk > 50
    ) or (risk > 75 and random.random() > 0.5)

    weather_code = str(row.get("weather_code", "clear")).lower()
    wl           = WEATHER_LABEL.get(weather_code, ("Clear", "☀️"))
    weather_cond = f"{wl[1]} {wl[0]} (cached)"

    planned_hrs = round(total_dist / 50, 1) if total_dist > 0 else 24.0
    eta_hours   = round(planned_hrs * (1 - progress) * (1 + risk / 200), 1)

    snap = row.get("snapshot_timestamp", "")
    try:
        created = datetime.strptime(snap, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    except Exception:
        created = datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72))

    risk_factors = []
    if weather_code in ("storm", "heavy_rain", "fog"):
        risk_factors.append(f"{wl[1]} {wl[0]} — reduced visibility")
    if _flag(row.get("road_closure_flag", "0")):
        risk_factors.append("🚧 Road closure on route")
    if _flag(row.get("strike_event_flag", "0")):
        risk_factors.append("🪧 Strike event detected")
    if not risk_factors:
        risk_factors.append("✅ No critical risk factors — standard monitoring")

    return {
        "id":                       sid,
        "panel":                    "india",
        "origin_city":              origin,
        "origin_state":             orig_s,
        "destination_city":         dest,
        "destination_state":        dest_s,
        "transport_mode":           row.get("transport_mode", "road"),
        "lat":                      round(cur_lat, 4),
        "lng":                      round(cur_lng, 4),
        "origin_lat":               orig_c[0],
        "origin_lng":               orig_c[1],
        "destination_lat":          dest_c[0],
        "destination_lng":          dest_c[1],
        "carrier_id":               carrier_raw,
        "carrier_company":          carrier_name,
        "cargo_type":               row.get("cargo_type", "General").strip().title(),
        "distance_km":              total_dist,
        "distance_covered_km":      dist_covered,
        "distance_remaining_km":    dist_remaining,
        "progress":                 progress,
        "planned_transit_hours":    planned_hrs,
        "eta_hours":                eta_hours,
        "speed_kmh":                _sf(row.get("avg_speed_kmh", 40), 40),
        "status":                   status,
        "is_delayed":               is_delayed,
        "delay_hours_current":      delay_h,
        "delay_duration_minutes":   round(delay_h * 60, 1),
        "delay_severity":           row.get("delay_severity", "low"),
        "disruption_type":          disruption,
        "disruption_flag":          int(_flag(row.get("disruption_flag", "0"))),
        "risk_score":               risk,
        "risk_level":               risk_level,
        "is_anomaly":               is_anomaly,
        "delay_probability":        round(min(risk / 100 * 1.1, 1.0), 3),
        "cascade_risk_score":       round(_sf(row.get("route_disruption_cnt_30d", 0)) / 20, 3),
        "road_closure_flag":        int(_flag(row.get("road_closure_flag", "0"))),
        "strike_event_flag":        int(_flag(row.get("strike_event_flag", "0"))),
        "traffic_incident_flag":    int(_flag(row.get("traffic_incident_flag", "0"))),
        "customs_hold_flag":        int(_flag(row.get("customs_hold_flag", "0"))),
        "holiday_flag":             int(_flag(row.get("holiday_flag", "0"))),
        "maintenance_flag":         int(_flag(row.get("maintenance_flag", "0"))),
        "temp_breach_flag":         int(_flag(row.get("temp_breach_flag", "0"))),
        "border_crossing_flag":     int(_flag(row.get("border_crossing_flag", "0"))),
        "night_driving_flag":       0,
        "vehicle_breakdown_flag":   int(_flag(row.get("maintenance_flag", "0"))),
        "accident_reported_flag":   0,
        "alt_route_needed":         _flag(row.get("alt_route_needed", "0")) or risk > 60,
        "alternate_routes_avail":   int(_sf(row.get("alternate_routes_avail", 0))),
        "weather_code":             weather_code,
        "weather_condition":        weather_cond,
        "wind_speed_kmh":           10.0,
        "visibility_km":            _sf(row.get("visibility_km", 10), 10),
        "live_weather":             {},
        "segment_congestion_idx":   _sf(row.get("segment_congestion_idx", 0)),
        "port_congestion_idx":      _sf(row.get("port_congestion_idx", 0)),
        "traffic_congestion_level": (
            "Very High" if _sf(row.get("segment_congestion_idx", 0)) > 0.8 else
            "High"      if _sf(row.get("segment_congestion_idx", 0)) > 0.6 else
            "Medium"    if _sf(row.get("segment_congestion_idx", 0)) > 0.3 else "Low"
        ),
        "vehicle_type":             "Tata 407",
        "vehicle_age_years":        _sf(row.get("vehicle_age_yrs", 3.0), 3.0),
        "driver_experience_years":  max(1.0, 10.0 - _sf(row.get("driver_hours_elapsed", 4.0), 4.0) / 2),
        "driver_rest_hours_prior":  max(0.0, 10.0 - _sf(row.get("driver_hours_elapsed", 4.0), 4.0)),
        "num_toll_plazas":          int(_sf(row.get("segment_index", 5), 5) * 2),
        "num_state_border_crossings": int(_flag(row.get("border_crossing_flag", "0"))),
        "eway_bill_verified":       1,
        "gps_route_deviation_km":   0.0,
        "checkpoint_delay_minutes": round(delay_h * 60, 1),
        "origin_wh_congestion_pct": round(_sf(row.get("port_congestion_idx", 0.5), 0.5) * 100, 1),
        "dest_wh_congestion_pct":   50.0,
        "upstream_shipment_delay_minutes": round(_sf(row.get("avg_delay_this_route", 0)) * 60, 1),
        "order_type":               "B2B",
        "priority_level":           "Priority" if risk > 60 else "Scheduled-Freight",
        "is_monsoon_season":        int(_sf(row.get("seasonal_risk_score", 0)) > 0.3),
        "is_festival_season":       int(_flag(row.get("holiday_flag", "0"))),
        "fuel_price_per_litre":     104.0,
        "shipment_value_inr":       round(_sf(row.get("seasonal_risk_score", 0.3), 0.3) * 500000 + 50000, 0),
        "value_usd":                int(round(_sf(row.get("seasonal_risk_score", 0.3), 0.3) * 6000 + 600, 0)),
        "route_avg_delay_7d":       _sf(row.get("route_avg_delay_7d", 0)),
        "route_disruption_cnt_30d": int(_sf(row.get("route_disruption_cnt_30d", 0))),
        "carrier_on_time_rate":     _sf(row.get("carrier_on_time_rate", 0.8), 0.8),
        "seasonal_risk_score":      _sf(row.get("seasonal_risk_score", 0.3), 0.3),
        "same_lane_delay_ratio":    _sf(row.get("same_lane_delay_ratio", 0.3), 0.3),
        "top_risk_factors":         risk_factors[:4],
        "reroute_options":          [],
        "recommended_action":       row.get("recommended_action", "no_action"),
        "created_at":               created,
    }


class Command(BaseCommand):
    help = 'Seed NeonDB with admin contacts, operator user, and shipments from supply_chain_1M.csv'

    def add_arguments(self, parser):
        parser.add_argument('--count',      type=int, default=500,  help='Number of shipments to load')
        parser.add_argument('--clear',      action='store_true',    help='Clear existing shipments and alerts first')
        parser.add_argument('--users-only', action='store_true',    help='Only seed admin contacts and operator user')

    def handle(self, *args, **options):
        # Import here to ensure app registry is ready
        from api.models import AdminUser, Customer, Shipment, Alert
        from api.auth_utils import hash_password

        count      = options['count']
        clear      = options['clear']
        users_only = options['users_only']

        self.stdout.write(self.style.MIGRATE_HEADING('=== LogiSense Database Seeder ==='))

        # ── 1. Admin Contacts (legacy — kept for backwards compatibility) ─────
        self.stdout.write('[*] Skipping legacy admin_contacts (removed in v2 schema)...')

        # ── 2. India Operator User (jani) ────────────────────────────────────
        self.stdout.write('[*] Seeding India operator user...')
        from api.models import AdminUser
        if not AdminUser.objects.filter(username='jani').exists():
            try:
                pw_hash = hash_password('jani@1309')
                AdminUser.objects.create(
                    username='jani',
                    email='ops.india@logisense.in',
                    password_hash=pw_hash,
                    display_name='Jani (India Ops)',
                    phone='+91 98982 13090',
                    is_active=True,
                )
                self.stdout.write('  [+] Created: admin user "jani" (india panel)')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  [-] Failed to create jani user: {e}'))
        else:
            self.stdout.write('  [>] Already exists: admin user "jani"')

        # ── 3. Default Customer User ──────────────────────────────────────────
        self.stdout.write('[*] Seeding default customer user...')
        from api.models import Customer
        if not Customer.objects.filter(username='customer').exists():
            try:
                pw_hash = hash_password('customer@2026')
                Customer.objects.create(
                    username='customer',
                    email='customer@logisense.com',
                    password_hash=pw_hash,
                    display_name='Demo Customer',
                    company_name='Acme Cargo Pvt. Ltd.',
                    admin_contact_name='Jani Ops',
                    admin_contact_email='ops.india@logisense.in',
                    admin_contact_phone='+91 98982 13090',
                    is_active=True,
                )
                self.stdout.write('  [+] Created: customer "customer" (customer panel)')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  [-] Failed to create customer user: {e}'))
        else:
            self.stdout.write('  [>] Already exists: customer "customer"')

        if users_only:
            self.stdout.write(self.style.SUCCESS('\n[+] Users-only seed complete.'))
            return

        # ── 3. Clear existing data (optional) ────────────────────────────────
        if clear:
            self.stdout.write(self.style.WARNING('[-] Clearing existing shipments and alerts...'))
            Alert.objects.all().delete()
            Shipment.objects.all().delete()
            self.stdout.write('  Done.')

        # ── 4. Load shipments from CSV ────────────────────────────────────────
        csv_path = Path(__file__).resolve().parents[4] / "data" / "supply_chain_1M.csv"
        if not csv_path.exists():
            csv_path = Path(__file__).resolve().parents[3] / "data" / "supply_chain_1M.csv"

        if not csv_path.exists():
            self.stdout.write(self.style.WARNING(
                f'[!] CSV not found at {csv_path}. Skipping shipment seed.'
            ))
        else:
            self.stdout.write(f'[*] Loading shipments from {csv_path.name}...')
            self._load_shipments(csv_path, count, Shipment)

        # ── 5. Seed alerts from high-risk shipments ───────────────────────────
        self.stdout.write('[*] Seeding alerts from high-risk shipments...')
        self._seed_alerts(Alert, Shipment)

        self.stdout.write(self.style.SUCCESS(
            f'\n[+] Seed complete. Shipments: {Shipment.objects.count()} | '
            f'Alerts: {Alert.objects.count()} | '
            f'Admins: {AdminUser.objects.count()} | '
            f'Customers: {Customer.objects.count()}'
        ))

    def _load_shipments(self, csv_path, target_count, Shipment):
        # Count total rows
        with open(csv_path, 'r', encoding='utf-8') as f:
            total = sum(1 for _ in f) - 1

        step = max(1, total // (target_count * 3))
        loaded = 0
        skipped = 0
        batch = []
        BATCH_SIZE = 100

        existing_ids = set(Shipment.objects.values_list('id', flat=True))

        with open(csv_path, 'r', encoding='utf-8', newline='') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                if loaded >= target_count:
                    break
                if i % step != 0:
                    continue

                ship_dict = _row_to_shipment_dict(row)
                if ship_dict is None:
                    skipped += 1
                    continue
                if ship_dict['id'] in existing_ids:
                    skipped += 1
                    continue

                existing_ids.add(ship_dict['id'])
                batch.append(Shipment(**ship_dict))
                loaded += 1

                if len(batch) >= BATCH_SIZE:
                    with transaction.atomic():
                        Shipment.objects.bulk_create(batch, ignore_conflicts=True)
                    sys.stdout.write(f'\r  Progress: {loaded}/{target_count}')
                    sys.stdout.flush()
                    batch = []

        if batch:
            with transaction.atomic():
                Shipment.objects.bulk_create(batch, ignore_conflicts=True)

        self.stdout.write(f'\n  [+] Loaded {loaded} shipments (skipped {skipped})')

    def _seed_alerts(self, Alert, Shipment):
        high_risk = list(
            Shipment.objects.filter(risk_score__gte=55).order_by('-risk_score')[:20]
        )
        random.shuffle(high_risk)
        now = datetime.now(timezone.utc)
        created = 0

        for i, s in enumerate(high_risk):
            alert_id = f"IND-ALT-{uuid.uuid4().hex[:6].upper()}"
            weather = s.weather_code
            wl = WEATHER_LABEL.get(weather, ("Weather", "warning"))
            flags = []
            if s.road_closure_flag:
                flags.append("Road closure")
            if s.strike_event_flag:
                flags.append("Strike event")
            if weather in ("storm", "heavy_rain", "fog"):
                flags.append(f"{wl[0]} weather")
            if s.customs_hold_flag:
                flags.append("Customs hold")
            if not flags:
                flags.append(f"Risk score {s.risk_score:.0f}/100")

            msg = (
                f"Alert {s.id} ({s.origin_city} -> {s.destination_city}): "
                f"{', '.join(flags[:2])}. Carrier: {s.carrier_company} | {s.cargo_type}"
            )

            if not Alert.objects.filter(id=alert_id).exists():
                Alert.objects.create(
                    id=alert_id,
                    shipment=s,
                    panel="india",
                    type="anomaly_detected" if s.is_anomaly else (
                        "weather_warning" if weather in ("storm", "heavy_rain", "fog")
                        else "high_risk_flag"
                    ),
                    severity="critical" if s.risk_score > 75 else "high",
                    message=msg,
                    risk_score=s.risk_score,
                    delay_probability=s.delay_probability,
                    cascade_risk=s.cascade_risk_score,
                    top_risk_factors=s.top_risk_factors,
                    reroute_options=[],
                    weather_warning=weather in ("storm", "heavy_rain", "fog", "rain"),
                    weather_icon=wl[1],
                    weather_label=wl[0],
                )
                created += 1

        self.stdout.write(f'  [+] Created {created} alerts')
