-- ============================================================
-- LogiSense — NeonDB PostgreSQL Schema  (v2 — clean auth)
-- ============================================================
-- Two separate auth tables:
--   admin_users  → India panel operator (jani)
--   customers    → Customer panel accounts (default: customer)
-- No shared 'users' table. No global admin.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. ADMIN USERS (India Panel) ────────────────────────────────────────────
-- Stores India panel operator accounts.
-- Only entries in this table can access /india panel.
CREATE TABLE IF NOT EXISTS admin_users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(64)  UNIQUE NOT NULL,
    email           VARCHAR(256) UNIQUE,
    password_hash   VARCHAR(256) NOT NULL,              -- bcrypt $2b$ hash
    display_name    VARCHAR(128) NOT NULL DEFAULT '',
    phone           VARCHAR(32)  DEFAULT '',
    is_active       BOOLEAN      DEFAULT TRUE,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    last_login      TIMESTAMPTZ,

    CONSTRAINT admin_username_min_len  CHECK (char_length(username) >= 3),
    CONSTRAINT admin_username_format   CHECK (username ~ '^[a-z0-9_\.]+$'),
    CONSTRAINT admin_password_not_empty CHECK (char_length(password_hash) >= 60)
);

-- Seed India panel operator
-- Password: jani@1309
-- Hash: bcrypt 12 rounds
INSERT INTO admin_users (username, email, password_hash, display_name, phone)
VALUES (
    'jani',
    'ops.india@logisense.in',
    '$2b$12$6OHgzs9bx6hW1KjleMbI3ukRcRY8kodmRW.em.DlV4Z/RBbGURE/O',
    'Jani (India Ops)',
    '+91 98982 13090'
)
ON CONFLICT (username) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        is_active     = TRUE;

CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users (username);


-- ─── 2. CUSTOMERS (Customer Panel) ───────────────────────────────────────────
-- Stores customer accounts. Only entries here can access /customer panel.
-- Default demo customer: customer / customer@2026
CREATE TABLE IF NOT EXISTS customers (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(64)  UNIQUE NOT NULL,
    email           VARCHAR(256) UNIQUE,
    password_hash   VARCHAR(256) NOT NULL,              -- bcrypt $2b$ hash
    display_name    VARCHAR(128) NOT NULL DEFAULT '',
    company_name    VARCHAR(256) DEFAULT '',
    admin_contact_name  VARCHAR(128) DEFAULT 'Jani Ops',  -- which admin handles them
    admin_contact_email VARCHAR(256) DEFAULT 'ops.india@logisense.in',
    admin_contact_phone VARCHAR(32)  DEFAULT '+91 98982 13090',
    is_active       BOOLEAN      DEFAULT TRUE,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    last_login      TIMESTAMPTZ,

    CONSTRAINT customer_username_min_len  CHECK (char_length(username) >= 3),
    CONSTRAINT customer_username_format   CHECK (username ~ '^[a-z0-9_\.]+$'),
    CONSTRAINT customer_email_format      CHECK (email IS NULL OR email ~ '^[^@]+@[^@]+\.[^@]+$'),
    CONSTRAINT customer_password_not_empty CHECK (char_length(password_hash) >= 60)
);

-- Seed default customer
-- Username: customer  Password: customer@2026
-- Hash: bcrypt 12 rounds
INSERT INTO customers (username, email, password_hash, display_name, company_name)
VALUES (
    'customer',
    'customer@logisense.com',
    '$2b$12$ixH.mWBZbKKdbRgVKRhKvunO7jJoaRfm7XYQ207IYcbjH8e4av.72',
    'Demo Customer',
    'Acme Cargo Pvt. Ltd.'
)
ON CONFLICT (username) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        is_active     = TRUE;

CREATE INDEX IF NOT EXISTS idx_customers_username ON customers (username);
CREATE INDEX IF NOT EXISTS idx_customers_email    ON customers (email);


-- ─── 3. DEMO REQUESTS ────────────────────────────────────────────────────────
-- Submitted from the landing page "Request Demo" form.
-- When accepted by admin, a customer account is created.
CREATE TABLE IF NOT EXISTS demo_requests (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(128) NOT NULL,
    email           VARCHAR(256) NOT NULL,
    phone           VARCHAR(32)  DEFAULT '',
    company         VARCHAR(256) DEFAULT '',
    role            VARCHAR(64)  DEFAULT 'Shipper'
                    CHECK (role IN ('Shipper', 'Carrier', 'LSP')),
    volume          VARCHAR(32)  DEFAULT '< 500'
                    CHECK (volume IN ('< 500', '500 - 5000', '> 5000')),
    status          VARCHAR(32)  DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'contacted', 'converted', 'rejected')),
    notes           TEXT         DEFAULT '',
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    contacted_at    TIMESTAMPTZ,
    appointment_at  TIMESTAMPTZ,

    CONSTRAINT demo_email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$')
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_email  ON demo_requests (email);
CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON demo_requests (status);


-- ─── 4. SHIPMENTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipments (
    id                      VARCHAR(32)  PRIMARY KEY,
    panel                   VARCHAR(16)  DEFAULT 'india',
    origin_city             VARCHAR(64)  NOT NULL,
    origin_state            VARCHAR(64)  DEFAULT '',
    destination_city        VARCHAR(64)  NOT NULL,
    destination_state       VARCHAR(64)  DEFAULT '',
    transport_mode          VARCHAR(32)  DEFAULT 'road',
    lat                     DOUBLE PRECISION,
    lng                     DOUBLE PRECISION,
    origin_lat              DOUBLE PRECISION,
    origin_lng              DOUBLE PRECISION,
    destination_lat         DOUBLE PRECISION,
    destination_lng         DOUBLE PRECISION,
    carrier_id              VARCHAR(32)  DEFAULT '',
    carrier_company         VARCHAR(128) DEFAULT '',
    cargo_type              VARCHAR(64)  DEFAULT 'General',
    distance_km             DOUBLE PRECISION DEFAULT 0,
    distance_covered_km     DOUBLE PRECISION DEFAULT 0,
    distance_remaining_km   DOUBLE PRECISION DEFAULT 0,
    progress                DOUBLE PRECISION DEFAULT 0
                            CHECK (progress >= 0 AND progress <= 1),
    planned_transit_hours   DOUBLE PRECISION DEFAULT 24,
    eta_hours               DOUBLE PRECISION DEFAULT 24,
    speed_kmh               DOUBLE PRECISION DEFAULT 50,
    status                  VARCHAR(32)  DEFAULT 'in_transit'
                            CHECK (status IN (
                                'in_transit','delayed','at_warehouse','customs_hold',
                                'loading','at_port','rerouted','delivered'
                            )),
    is_delayed              BOOLEAN      DEFAULT FALSE,
    delay_hours_current     DOUBLE PRECISION DEFAULT 0,
    delay_duration_minutes  DOUBLE PRECISION DEFAULT 0,
    delay_severity          VARCHAR(16)  DEFAULT 'low'
                            CHECK (delay_severity IN ('low','medium','high','critical')),
    disruption_type         VARCHAR(64)  DEFAULT 'none',
    disruption_flag         SMALLINT     DEFAULT 0,
    risk_score              DOUBLE PRECISION DEFAULT 20
                            CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level              VARCHAR(16)  DEFAULT 'low'
                            CHECK (risk_level IN ('low','medium','high','critical')),
    is_anomaly              BOOLEAN      DEFAULT FALSE,
    delay_probability       DOUBLE PRECISION DEFAULT 0
                            CHECK (delay_probability >= 0 AND delay_probability <= 1),
    cascade_risk_score      DOUBLE PRECISION DEFAULT 0,
    road_closure_flag       SMALLINT  DEFAULT 0,
    strike_event_flag       SMALLINT  DEFAULT 0,
    traffic_incident_flag   SMALLINT  DEFAULT 0,
    customs_hold_flag       SMALLINT  DEFAULT 0,
    holiday_flag            SMALLINT  DEFAULT 0,
    maintenance_flag        SMALLINT  DEFAULT 0,
    temp_breach_flag        SMALLINT  DEFAULT 0,
    border_crossing_flag    SMALLINT  DEFAULT 0,
    night_driving_flag      SMALLINT  DEFAULT 0,
    vehicle_breakdown_flag  SMALLINT  DEFAULT 0,
    accident_reported_flag  SMALLINT  DEFAULT 0,
    alt_route_needed        BOOLEAN   DEFAULT FALSE,
    weather_code            VARCHAR(32)  DEFAULT 'clear',
    weather_condition       TEXT         DEFAULT '',
    wind_speed_kmh          DOUBLE PRECISION DEFAULT 10,
    visibility_km           DOUBLE PRECISION DEFAULT 10,
    live_weather            JSONB,
    segment_congestion_idx  DOUBLE PRECISION DEFAULT 0,
    port_congestion_idx     DOUBLE PRECISION DEFAULT 0,
    traffic_congestion_level VARCHAR(16)  DEFAULT 'Low',
    vehicle_type            VARCHAR(64)  DEFAULT 'Tata 407',
    vehicle_age_years       DOUBLE PRECISION DEFAULT 3,
    driver_experience_years DOUBLE PRECISION DEFAULT 5,
    driver_rest_hours_prior DOUBLE PRECISION DEFAULT 8,
    num_toll_plazas             INT      DEFAULT 0,
    num_state_border_crossings  INT      DEFAULT 0,
    eway_bill_verified          SMALLINT DEFAULT 1,
    gps_route_deviation_km      DOUBLE PRECISION DEFAULT 0,
    checkpoint_delay_minutes    DOUBLE PRECISION DEFAULT 0,
    origin_wh_congestion_pct    DOUBLE PRECISION DEFAULT 40,
    dest_wh_congestion_pct      DOUBLE PRECISION DEFAULT 30,
    upstream_shipment_delay_minutes DOUBLE PRECISION DEFAULT 0,
    order_type              VARCHAR(16)  DEFAULT 'B2B',
    priority_level          VARCHAR(32)  DEFAULT 'Scheduled-Freight',
    is_monsoon_season       SMALLINT  DEFAULT 0,
    is_festival_season      SMALLINT  DEFAULT 0,
    fuel_price_per_litre    DOUBLE PRECISION DEFAULT 104,
    shipment_value_inr      DOUBLE PRECISION DEFAULT 100000,
    value_usd               INT          DEFAULT 1200,
    route_avg_delay_7d          DOUBLE PRECISION DEFAULT 0,
    route_disruption_cnt_30d    INT              DEFAULT 0,
    carrier_on_time_rate        DOUBLE PRECISION DEFAULT 0.8,
    seasonal_risk_score         DOUBLE PRECISION DEFAULT 0.3,
    same_lane_delay_ratio       DOUBLE PRECISION DEFAULT 0.3,
    alternate_routes_avail      SMALLINT DEFAULT 0,
    top_risk_factors        JSONB    DEFAULT '[]',
    reroute_options         JSONB    DEFAULT '[]',
    recommended_action      VARCHAR(64) DEFAULT 'no_action',
    created_at              TIMESTAMPTZ  DEFAULT NOW(),
    last_updated            TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_status        ON shipments (status);
CREATE INDEX IF NOT EXISTS idx_shipments_risk_score    ON shipments (risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_risk_level    ON shipments (risk_level);
CREATE INDEX IF NOT EXISTS idx_shipments_panel         ON shipments (panel);
CREATE INDEX IF NOT EXISTS idx_shipments_origin_city   ON shipments (origin_city);
CREATE INDEX IF NOT EXISTS idx_shipments_dest_city     ON shipments (destination_city);
CREATE INDEX IF NOT EXISTS idx_shipments_carrier       ON shipments (carrier_id);
CREATE INDEX IF NOT EXISTS idx_shipments_last_updated  ON shipments (last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_active
    ON shipments (risk_score DESC, last_updated DESC)
    WHERE status IN ('in_transit','delayed','at_warehouse','customs_hold','loading','at_port');
CREATE INDEX IF NOT EXISTS idx_shipments_risk_factors_gin ON shipments USING GIN (top_risk_factors);
CREATE INDEX IF NOT EXISTS idx_shipments_created_brin ON shipments USING BRIN (created_at);


-- ─── 5. ALERTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
    id              VARCHAR(32)  PRIMARY KEY,
    shipment_id     VARCHAR(32)  REFERENCES shipments(id) ON DELETE SET NULL,
    panel           VARCHAR(16)  DEFAULT 'india',
    type            VARCHAR(64)  DEFAULT '',
    severity        VARCHAR(16)  DEFAULT 'medium'
                    CHECK (severity IN ('low','medium','high','critical')),
    message         TEXT         DEFAULT '',
    risk_score      DOUBLE PRECISION DEFAULT 0,
    delay_probability DOUBLE PRECISION DEFAULT 0,
    cascade_risk    DOUBLE PRECISION DEFAULT 0,
    top_risk_factors JSONB  DEFAULT '[]',
    reroute_options  JSONB  DEFAULT '[]',
    weather_warning  BOOLEAN DEFAULT FALSE,
    weather_icon     VARCHAR(8)   DEFAULT '',
    weather_label    VARCHAR(64)  DEFAULT '',
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_created_at   ON alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity     ON alerts (severity);
CREATE INDEX IF NOT EXISTS idx_alerts_shipment_id  ON alerts (shipment_id);
CREATE INDEX IF NOT EXISTS idx_alerts_panel        ON alerts (panel);
CREATE INDEX IF NOT EXISTS idx_alerts_critical
    ON alerts (created_at DESC)
    WHERE severity IN ('critical','high');


-- ─── 6. CASCADE EVENTS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cascade_events (
    id                          VARCHAR(32)  PRIMARY KEY,
    trigger_city                VARCHAR(64)  DEFAULT '',
    trigger_reason              VARCHAR(128) DEFAULT '',
    total_affected_nodes        INT          DEFAULT 0,
    total_affected_shipments    INT          DEFAULT 0,
    total_financial_impact_inr  BIGINT       DEFAULT 0,
    estimated_recovery_hours    DOUBLE PRECISION DEFAULT 0,
    cascade_nodes               JSONB        DEFAULT '[]',
    recovery_plan               JSONB        DEFAULT '{}',
    propagation_graph           JSONB        DEFAULT '{}',
    created_at                  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cascade_events_created ON cascade_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cascade_events_city    ON cascade_events (trigger_city);


-- ─── 7. REFRESH LOG ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_log (
    id                  SERIAL PRIMARY KEY,
    refresh_type        VARCHAR(32)  DEFAULT 'weather',
    cities_refreshed    INT          DEFAULT 0,
    shipments_updated   INT          DEFAULT 0,
    errors              JSONB        DEFAULT '[]',
    refreshed_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_log_at ON refresh_log (refreshed_at DESC);


-- ─── 8. SUPPORT TICKETS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_ticket (
    id          SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subject     VARCHAR(255) NOT NULL,
    message     TEXT         NOT NULL,
    status      VARCHAR(20)  DEFAULT 'pending'
                CHECK (status IN ('pending', 'resolved')),
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_customer ON support_ticket (customer_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_status   ON support_ticket (status);


-- ─── DASHBOARD VIEWS ─────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
    COUNT(*)                                                     AS total_shipments,
    COUNT(*) FILTER (WHERE status = 'delayed')                   AS delayed_count,
    ROUND(AVG(risk_score)::NUMERIC, 1)                           AS avg_risk_score,
    ROUND(
        (COUNT(*) FILTER (WHERE status <> 'delayed')::NUMERIC
         / NULLIF(COUNT(*), 0)) * 100, 1
    )                                                            AS on_time_rate,
    COUNT(*) FILTER (WHERE risk_level = 'critical')              AS critical_shipments,
    ROUND(SUM(shipment_value_inr)::NUMERIC, 0)                   AS total_value_inr,
    COUNT(*) FILTER (WHERE cascade_risk_score > 0.6)             AS cascade_risk_nodes,
    COUNT(*) FILTER (WHERE is_anomaly = TRUE)                    AS anomaly_count
FROM shipments
WHERE status IN ('in_transit','delayed','at_warehouse','customs_hold','loading','at_port');

CREATE OR REPLACE VIEW v_risk_distribution AS
SELECT
    risk_level,
    COUNT(*) AS count,
    ROUND(AVG(risk_score)::NUMERIC, 1) AS avg_score
FROM shipments
WHERE status IN ('in_transit','delayed','at_warehouse','customs_hold','loading','at_port')
GROUP BY risk_level;

-- ─── END OF SCHEMA ───────────────────────────────────────────────────────────
