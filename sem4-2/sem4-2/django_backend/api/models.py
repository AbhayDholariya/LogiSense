"""
Django ORM Models — LogiSense Supply Chain Intelligence Platform
================================================================
Auth tables:
  AdminUser  → India panel operators  (db_table: admin_users)
  Customer   → Customer panel users   (db_table: customers)

No shared 'users' table. No global admin.
"""

from django.db import models
from django.core.validators import RegexValidator, MinLengthValidator


# ─── Shared validators ────────────────────────────────────────────────────────

username_validator = RegexValidator(
    regex=r'^[a-z0-9_\.]+$',
    message='Username may only contain lowercase letters, digits, underscores, and dots.'
)


# ─── 1. AdminUser (India Panel) ───────────────────────────────────────────────

class AdminUser(models.Model):
    """
    India panel operator account.
    Only users in this table can authenticate to the /india panel.
    Password stored as bcrypt $2b$ hash.
    """
    username        = models.CharField(
        max_length=64, unique=True,
        validators=[MinLengthValidator(3), username_validator]
    )
    email           = models.EmailField(max_length=256, unique=True, null=True, blank=True)
    password_hash   = models.CharField(
        max_length=256,
        validators=[MinLengthValidator(60)],
        help_text='bcrypt $2b$ hash — never store plaintext'
    )
    display_name    = models.CharField(max_length=128, blank=True, default='')
    phone           = models.CharField(max_length=32, blank=True, default='')
    is_active       = models.BooleanField(default=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    last_login      = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'admin_users'
        indexes  = [models.Index(fields=['username'])]

    def __str__(self):
        return f"AdminUser({self.username})"

    def to_dict(self):
        return {
            'id':          self.pk,
            'username':    self.username,
            'email':       self.email,
            'panel':       'india',
            'role':        'operator',
            'displayName': self.display_name,
            'isActive':    self.is_active,
            'createdAt':   self.created_at.isoformat() if self.created_at else None,
            'lastLogin':   self.last_login.isoformat() if self.last_login else None,
        }


# ─── 2. Customer (Customer Panel) ─────────────────────────────────────────────

class Customer(models.Model):
    """
    Customer panel account.
    Only users in this table can authenticate to the /customer panel.
    Password stored as bcrypt $2b$ hash.
    """
    username            = models.CharField(
        max_length=64, unique=True,
        validators=[MinLengthValidator(3), username_validator]
    )
    email               = models.EmailField(max_length=256, unique=True, null=True, blank=True)
    password_hash       = models.CharField(
        max_length=256,
        validators=[MinLengthValidator(60)],
        help_text='bcrypt $2b$ hash — never store plaintext'
    )
    display_name        = models.CharField(max_length=128, blank=True, default='')
    company_name        = models.CharField(max_length=256, blank=True, default='')
    admin_contact_name  = models.CharField(max_length=128, blank=True, default='Jani Ops')
    admin_contact_email = models.CharField(max_length=256, blank=True, default='ops.india@logisense.in')
    admin_contact_phone = models.CharField(max_length=32,  blank=True, default='+91 98982 13090')
    is_active           = models.BooleanField(default=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    last_login          = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'customers'
        indexes  = [
            models.Index(fields=['username']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f"Customer({self.username})"

    def to_dict(self):
        return {
            'id':          self.pk,
            'username':    self.username,
            'email':       self.email,
            'panel':       'customer',
            'role':        'customer',
            'displayName': self.display_name,
            'companyName': self.company_name,
            'adminContact': {
                'name':  self.admin_contact_name,
                'email': self.admin_contact_email,
                'phone': self.admin_contact_phone,
            },
            'isActive':   self.is_active,
            'createdAt':  self.created_at.isoformat() if self.created_at else None,
            'lastLogin':  self.last_login.isoformat() if self.last_login else None,
        }


# ─── 3. Demo Request ─────────────────────────────────────────────────────────

DEMO_STATUS_CHOICES = [
    ('pending',   'Pending'),
    ('accepted',  'Accepted'),
    ('contacted', 'Contacted'),
    ('converted', 'Converted'),
    ('rejected',  'Rejected'),
]

DEMO_ROLE_CHOICES = [
    ('Shipper', 'Shipper (Manufacturer/Retailer)'),
    ('Carrier', 'Carrier (Truckload/Ocean Line)'),
    ('LSP',     'LSP (3PL/Freight Forwarder)'),
]

DEMO_VOLUME_CHOICES = [
    ('< 500',       'Less than 500 loads'),
    ('500 - 5000',  '500 – 5,000 loads'),
    ('> 5000',      'More than 5,000 loads'),
]


class DemoRequest(models.Model):
    """Landing page demo request form submissions."""

    full_name       = models.CharField(max_length=128)
    email           = models.EmailField(max_length=256)
    phone           = models.CharField(max_length=32, blank=True, default='')
    company         = models.CharField(max_length=256, blank=True, default='')
    role            = models.CharField(max_length=64, choices=DEMO_ROLE_CHOICES, default='Shipper')
    volume          = models.CharField(max_length=32, choices=DEMO_VOLUME_CHOICES, default='< 500')
    status          = models.CharField(max_length=32, choices=DEMO_STATUS_CHOICES, default='pending')
    notes           = models.TextField(blank=True, default='')
    created_at      = models.DateTimeField(auto_now_add=True)
    contacted_at    = models.DateTimeField(null=True, blank=True)
    appointment_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'demo_requests'
        ordering = ['-created_at']
        indexes  = [
            models.Index(fields=['email']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.full_name} <{self.email}> [{self.status}]"

    def to_dict(self):
        return {
            'id':           self.pk,
            'fullName':     self.full_name,
            'email':        self.email,
            'phone':        self.phone,
            'company':      self.company,
            'role':         self.role,
            'volume':       self.volume,
            'status':       self.status,
            'notes':        self.notes,
            'createdAt':    self.created_at.isoformat() if self.created_at else None,
            'contactedAt':  self.contacted_at.isoformat() if self.contacted_at else None,
            'appointmentAt': self.appointment_at.isoformat() if self.appointment_at else None,
        }


# ─── 4. Shipment ─────────────────────────────────────────────────────────────

SHIPMENT_STATUS_CHOICES = [
    ('in_transit',    'In Transit'),
    ('delayed',       'Delayed'),
    ('at_warehouse',  'At Warehouse'),
    ('customs_hold',  'Customs Hold'),
    ('loading',       'Loading'),
    ('at_port',       'At Port'),
    ('rerouted',      'Rerouted'),
    ('delivered',     'Delivered'),
]

RISK_LEVEL_CHOICES = [
    ('low',      'Low'),
    ('medium',   'Medium'),
    ('high',     'High'),
    ('critical', 'Critical'),
]

DELAY_SEVERITY_CHOICES = [
    ('low',      'Low'),
    ('medium',   'Medium'),
    ('high',     'High'),
    ('critical', 'Critical'),
]


class Shipment(models.Model):
    """Core shipment record — seeded from supply_chain_1M.csv."""

    id                      = models.CharField(max_length=32, primary_key=True)
    panel                   = models.CharField(max_length=16, default='india')
    origin_city             = models.CharField(max_length=64)
    origin_state            = models.CharField(max_length=64, blank=True, default='')
    destination_city        = models.CharField(max_length=64)
    destination_state       = models.CharField(max_length=64, blank=True, default='')
    transport_mode          = models.CharField(max_length=32, default='road')
    lat                     = models.FloatField(null=True, blank=True)
    lng                     = models.FloatField(null=True, blank=True)
    origin_lat              = models.FloatField(null=True, blank=True)
    origin_lng              = models.FloatField(null=True, blank=True)
    destination_lat         = models.FloatField(null=True, blank=True)
    destination_lng         = models.FloatField(null=True, blank=True)
    carrier_id              = models.CharField(max_length=32, blank=True, default='')
    carrier_company         = models.CharField(max_length=128, blank=True, default='')
    cargo_type              = models.CharField(max_length=64, default='General')
    distance_km             = models.FloatField(default=0)
    distance_covered_km     = models.FloatField(default=0)
    distance_remaining_km   = models.FloatField(default=0)
    progress                = models.FloatField(default=0)
    planned_transit_hours   = models.FloatField(default=24)
    eta_hours               = models.FloatField(default=24)
    speed_kmh               = models.FloatField(default=50)
    status                  = models.CharField(max_length=32, choices=SHIPMENT_STATUS_CHOICES, default='in_transit')
    is_delayed              = models.BooleanField(default=False)
    delay_hours_current     = models.FloatField(default=0)
    delay_duration_minutes  = models.FloatField(default=0)
    delay_severity          = models.CharField(max_length=16, choices=DELAY_SEVERITY_CHOICES, default='low')
    disruption_type         = models.CharField(max_length=64, default='none')
    disruption_flag         = models.SmallIntegerField(default=0)
    risk_score              = models.FloatField(default=20)
    risk_level              = models.CharField(max_length=16, choices=RISK_LEVEL_CHOICES, default='low')
    is_anomaly              = models.BooleanField(default=False)
    delay_probability       = models.FloatField(default=0)
    cascade_risk_score      = models.FloatField(default=0)
    road_closure_flag       = models.SmallIntegerField(default=0)
    strike_event_flag       = models.SmallIntegerField(default=0)
    traffic_incident_flag   = models.SmallIntegerField(default=0)
    customs_hold_flag       = models.SmallIntegerField(default=0)
    holiday_flag            = models.SmallIntegerField(default=0)
    maintenance_flag        = models.SmallIntegerField(default=0)
    temp_breach_flag        = models.SmallIntegerField(default=0)
    border_crossing_flag    = models.SmallIntegerField(default=0)
    night_driving_flag      = models.SmallIntegerField(default=0)
    vehicle_breakdown_flag  = models.SmallIntegerField(default=0)
    accident_reported_flag  = models.SmallIntegerField(default=0)
    alt_route_needed        = models.BooleanField(default=False)
    alternate_routes_avail  = models.SmallIntegerField(default=0)
    weather_code            = models.CharField(max_length=32, default='clear')
    weather_condition       = models.TextField(blank=True, default='')
    wind_speed_kmh          = models.FloatField(default=10)
    visibility_km           = models.FloatField(default=10)
    live_weather            = models.JSONField(default=dict, blank=True)
    segment_congestion_idx  = models.FloatField(default=0)
    port_congestion_idx     = models.FloatField(default=0)
    traffic_congestion_level = models.CharField(max_length=16, default='Low')
    vehicle_type            = models.CharField(max_length=64, default='Tata 407')
    vehicle_age_years       = models.FloatField(default=3)
    driver_experience_years = models.FloatField(default=5)
    driver_rest_hours_prior = models.FloatField(default=8)
    num_toll_plazas             = models.IntegerField(default=0)
    num_state_border_crossings  = models.IntegerField(default=0)
    eway_bill_verified          = models.SmallIntegerField(default=1)
    gps_route_deviation_km      = models.FloatField(default=0)
    checkpoint_delay_minutes    = models.FloatField(default=0)
    origin_wh_congestion_pct    = models.FloatField(default=40)
    dest_wh_congestion_pct      = models.FloatField(default=30)
    upstream_shipment_delay_minutes = models.FloatField(default=0)
    order_type              = models.CharField(max_length=16, default='B2B')
    priority_level          = models.CharField(max_length=32, default='Scheduled-Freight')
    is_monsoon_season       = models.SmallIntegerField(default=0)
    is_festival_season      = models.SmallIntegerField(default=0)
    fuel_price_per_litre    = models.FloatField(default=104)
    shipment_value_inr      = models.FloatField(default=100000)
    value_usd               = models.IntegerField(default=1200)
    route_avg_delay_7d          = models.FloatField(default=0)
    route_disruption_cnt_30d    = models.IntegerField(default=0)
    carrier_on_time_rate        = models.FloatField(default=0.8)
    seasonal_risk_score         = models.FloatField(default=0.3)
    same_lane_delay_ratio       = models.FloatField(default=0.3)
    top_risk_factors        = models.JSONField(default=list, blank=True)
    reroute_options         = models.JSONField(default=list, blank=True)
    recommended_action      = models.CharField(max_length=64, default='no_action')
    created_at              = models.DateTimeField(auto_now_add=True)
    last_updated            = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shipments'
        ordering = ['-risk_score']
        indexes  = [
            models.Index(fields=['status']),
            models.Index(fields=['-risk_score']),
            models.Index(fields=['risk_level']),
            models.Index(fields=['panel']),
            models.Index(fields=['origin_city']),
            models.Index(fields=['destination_city']),
            models.Index(fields=['carrier_id']),
            models.Index(fields=['-last_updated']),
        ]

    ACTIVE_STATUSES = frozenset({
        'in_transit', 'delayed', 'at_warehouse',
        'customs_hold', 'loading', 'at_port'
    })

    def __str__(self):
        return f"{self.id} {self.origin_city}→{self.destination_city} [{self.risk_level}]"

    def to_dict(self):
        return {
            'id': self.id,
            'shipment_id': self.id,
            'panel': self.panel,
            'origin_city': self.origin_city,
            'origin_state': self.origin_state,
            'origin': f"{self.origin_city}, {self.origin_state}",
            'destination_city': self.destination_city,
            'destination_state': self.destination_state,
            'destination': f"{self.destination_city}, {self.destination_state}",
            'lat': self.lat,
            'lng': self.lng,
            'origin_lat': self.origin_lat,
            'origin_lng': self.origin_lng,
            'destination_lat': self.destination_lat,
            'destination_lng': self.destination_lng,
            'carrier_id': self.carrier_id,
            'carrier_company': self.carrier_company,
            'carrier': self.carrier_company,
            'cargo_type': self.cargo_type,
            'transport_mode': self.transport_mode,
            'distance_km': self.distance_km,
            'distance_covered_km': self.distance_covered_km,
            'distance_remaining_km': self.distance_remaining_km,
            'progress': self.progress,
            'planned_transit_hours': self.planned_transit_hours,
            'eta_hours': self.eta_hours,
            'speed_kmh': self.speed_kmh,
            'status': self.status,
            'is_delayed': self.is_delayed,
            'delay_hours_current': self.delay_hours_current,
            'delay_duration_minutes': self.delay_duration_minutes,
            'delay_severity': self.delay_severity,
            'disruption_type': self.disruption_type,
            'disruption_flag': self.disruption_flag,
            'risk_score': self.risk_score,
            'risk_level': self.risk_level,
            'is_anomaly': self.is_anomaly,
            'delay_probability': self.delay_probability,
            'cascade_risk_score': self.cascade_risk_score,
            'road_closure_flag': self.road_closure_flag,
            'strike_event_flag': self.strike_event_flag,
            'traffic_incident_flag': self.traffic_incident_flag,
            'customs_hold_flag': self.customs_hold_flag,
            'holiday_flag': self.holiday_flag,
            'maintenance_flag': self.maintenance_flag,
            'temp_breach_flag': self.temp_breach_flag,
            'border_crossing_flag': self.border_crossing_flag,
            'night_driving_flag': self.night_driving_flag,
            'vehicle_breakdown_flag': self.vehicle_breakdown_flag,
            'accident_reported_flag': self.accident_reported_flag,
            'alt_route_needed': self.alt_route_needed,
            'alternate_routes_avail': self.alternate_routes_avail,
            'weather_code': self.weather_code,
            'weather_condition': self.weather_condition,
            'wind_speed_kmh': self.wind_speed_kmh,
            'visibility_km': self.visibility_km,
            'live_weather': self.live_weather,
            'segment_congestion_idx': self.segment_congestion_idx,
            'port_congestion_idx': self.port_congestion_idx,
            'traffic_congestion_level': self.traffic_congestion_level,
            'vehicle_type': self.vehicle_type,
            'vehicle_age_years': self.vehicle_age_years,
            'driver_experience_years': self.driver_experience_years,
            'driver_rest_hours_prior': self.driver_rest_hours_prior,
            'num_toll_plazas': self.num_toll_plazas,
            'num_state_border_crossings': self.num_state_border_crossings,
            'eway_bill_verified': self.eway_bill_verified,
            'gps_route_deviation_km': self.gps_route_deviation_km,
            'checkpoint_delay_minutes': self.checkpoint_delay_minutes,
            'origin_wh_congestion_pct': self.origin_wh_congestion_pct,
            'dest_wh_congestion_pct': self.dest_wh_congestion_pct,
            'upstream_shipment_delay_minutes': self.upstream_shipment_delay_minutes,
            'order_type': self.order_type,
            'priority_level': self.priority_level,
            'is_monsoon_season': self.is_monsoon_season,
            'is_festival_season': self.is_festival_season,
            'fuel_price_per_litre': self.fuel_price_per_litre,
            'shipment_value_inr': self.shipment_value_inr,
            'value_usd': self.value_usd,
            'route_avg_delay_7d': self.route_avg_delay_7d,
            'route_disruption_cnt_30d': self.route_disruption_cnt_30d,
            'carrier_on_time_rate': self.carrier_on_time_rate,
            'seasonal_risk_score': self.seasonal_risk_score,
            'same_lane_delay_ratio': self.same_lane_delay_ratio,
            'top_risk_factors': self.top_risk_factors,
            'reroute_options': self.reroute_options,
            'recommended_action': self.recommended_action,
            'transit_days': round(self.planned_transit_hours / 24, 1),
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ─── 5. Alert ────────────────────────────────────────────────────────────────

ALERT_SEVERITY_CHOICES = [
    ('low',      'Low'),
    ('medium',   'Medium'),
    ('high',     'High'),
    ('critical', 'Critical'),
]


class Alert(models.Model):
    id              = models.CharField(max_length=32, primary_key=True)
    shipment        = models.ForeignKey(
        Shipment, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='alerts'
    )
    panel           = models.CharField(max_length=16, default='india')
    type            = models.CharField(max_length=64, blank=True, default='')
    severity        = models.CharField(max_length=16, choices=ALERT_SEVERITY_CHOICES, default='medium')
    message         = models.TextField(blank=True, default='')
    risk_score      = models.FloatField(default=0)
    delay_probability = models.FloatField(default=0)
    cascade_risk    = models.FloatField(default=0)
    top_risk_factors = models.JSONField(default=list, blank=True)
    reroute_options  = models.JSONField(default=list, blank=True)
    weather_warning  = models.BooleanField(default=False)
    weather_icon     = models.CharField(max_length=8, blank=True, default='')
    weather_label    = models.CharField(max_length=64, blank=True, default='')
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'alerts'
        ordering = ['-created_at']
        indexes  = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['severity']),
            models.Index(fields=['panel']),
        ]

    def __str__(self):
        return f"{self.id} [{self.severity}] {self.message[:60]}"

    def to_dict(self):
        return {
            'id': self.id,
            'shipment_id': self.shipment_id,
            'panel': self.panel,
            'type': self.type,
            'severity': self.severity,
            'message': self.message,
            'risk_score': self.risk_score,
            'delay_probability': self.delay_probability,
            'cascade_risk': self.cascade_risk,
            'top_risk_factors': self.top_risk_factors,
            'reroute_options': self.reroute_options,
            'alternate_routes': self.reroute_options,
            'weather_warning': self.weather_warning,
            'weather_icon': self.weather_icon,
            'weather_label': self.weather_label,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ─── 6. Cascade Event ────────────────────────────────────────────────────────

class CascadeEvent(models.Model):
    id                          = models.CharField(max_length=32, primary_key=True)
    trigger_city                = models.CharField(max_length=64, blank=True, default='')
    trigger_reason              = models.CharField(max_length=128, blank=True, default='')
    total_affected_nodes        = models.IntegerField(default=0)
    total_affected_shipments    = models.IntegerField(default=0)
    total_financial_impact_inr  = models.BigIntegerField(default=0)
    estimated_recovery_hours    = models.FloatField(default=0)
    cascade_nodes               = models.JSONField(default=list, blank=True)
    recovery_plan               = models.JSONField(default=dict, blank=True)
    propagation_graph           = models.JSONField(default=dict, blank=True)
    created_at                  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cascade_events'
        ordering = ['-created_at']
        indexes  = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['trigger_city']),
        ]

    def __str__(self):
        return f"Cascade({self.id}) {self.trigger_city} — {self.total_affected_nodes} nodes"

    def to_dict(self):
        return {
            'id': self.id,
            'trigger_city': self.trigger_city,
            'trigger_reason': self.trigger_reason,
            'total_affected_nodes': self.total_affected_nodes,
            'total_affected_shipments': self.total_affected_shipments,
            'total_financial_impact_inr': self.total_financial_impact_inr,
            'estimated_recovery_hours': self.estimated_recovery_hours,
            'cascade_nodes': self.cascade_nodes,
            'recovery_plan': self.recovery_plan,
            'propagation_graph': self.propagation_graph,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ─── 7. Refresh Log ──────────────────────────────────────────────────────────

class RefreshLog(models.Model):
    REFRESH_TYPE_CHOICES = [
        ('weather',   'Weather Refresh'),
        ('shipments', 'Shipment Sync'),
        ('alerts',    'Alert Sync'),
    ]

    refresh_type     = models.CharField(max_length=32, choices=REFRESH_TYPE_CHOICES, default='weather')
    cities_refreshed = models.IntegerField(default=0)
    shipments_updated = models.IntegerField(default=0)
    errors           = models.JSONField(default=list, blank=True)
    refreshed_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'refresh_log'
        ordering = ['-refreshed_at']
        indexes  = [models.Index(fields=['-refreshed_at'])]

    def __str__(self):
        return f"RefreshLog({self.refresh_type}) {self.refreshed_at}"


# ─── 8. Support Ticket ────────────────────────────────────────────────────────

class SupportTicket(models.Model):
    STATUS_CHOICES = [
        ('pending',  'Pending'),
        ('resolved', 'Resolved'),
    ]

    customer     = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='support_tickets')
    subject      = models.CharField(max_length=255)
    subject_type = models.CharField(max_length=100, default='General', blank=True)
    message      = models.TextField()
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'support_ticket'
        ordering = ['-created_at']

    def __str__(self):
        return f"SupportTicket({self.id}) — {self.subject} by {self.customer.username}"

    def to_dict(self):
        return {
            'id':               self.id,
            'customer_username': self.customer.username,
            'customer_email':   self.customer.email,
            'customer_company': self.customer.company_name,
            'subject':          self.subject,
            'subject_type':     self.subject_type,
            'message':          self.message,
            'status':           self.status,
            'created_at':       self.created_at.isoformat() if self.created_at else None,
        }
