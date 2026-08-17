// frontend/src/services/indianApi.ts
/**
 * Indian Supply Chain API Service
 * Connects to FastAPI /india/* endpoints
 * Handles all Indian logistics operations
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/";

export const indianApi = axios.create({
  baseURL: BASE_URL,
  timeout: 45000,
  headers: { "Content-Type": "application/json" },
});
  
// Attach auth token (same as global api.ts)
indianApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("sc_auth_token")
    ? (() => {
        try {
          const raw = sessionStorage.getItem("sc_auth_token");
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          return parsed?.state?.token ?? null;
        } catch {
          return null;
        }
      })()
    : null;

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor
indianApi.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err?.message || "";
    if (
      msg.includes("ERR_CONNECTION_REFUSED") ||
      msg.includes("Network Error")
    ) {
      console.warn(
        "[IndianAPI] Backend not running on port 8000. Start: python django_backend/manage.py runserver",
      );
    } else {
      console.error("[IndianAPI] Error:", msg);
    }
    return Promise.reject(err);
  },
);

// ─── Types ─────────────────────────────────────────────────────────────────

// ─── API Functions ─────────────────────────────────────────────────────────

export const IndianApiService = {
  async getShipments() {
    const res = await indianApi.get("/api/india/shipments");
    const data = res.data;
    if (Array.isArray(data)) return data;
    if ("shipments" in data && Array.isArray(data.shipments))
      return data.shipments;
    return [];
  },

  async getShipment(id) {
    const res = await indianApi.get(`/api/india/shipments/${id}`);
    return res.data;
  },

  async getAlerts(hours = 24) {
    const res = await indianApi.get(`/api/india/alerts?hours=${hours}`);
    const data = res.data;
    if (Array.isArray(data)) return data;
    if ("alerts" in data && Array.isArray(data.alerts)) return data.alerts;
    return [];
  },

  async getCascadeEvents(limit = 10) {
    const res = await indianApi.get(`/api/india/cascade-events?limit=${limit}`);
    const data = res.data;
    if (Array.isArray(data)) return data;
    if ("events" in data && Array.isArray(data.events)) return data.events;
    return [];
  },

  async analyzeShipment(shipmentData) {
    const payload = {
      shipment_id: shipmentData.shipment_id || shipmentData.id || "UNKNOWN",
      origin_city: shipmentData.origin_city || "Mumbai",
      origin_state: shipmentData.origin_state || "Maharashtra",
      destination_city: shipmentData.destination_city || "Delhi",
      destination_state: shipmentData.destination_state || "Delhi",
      carrier_company:
        shipmentData.carrier_company || shipmentData.carrier || "Unknown",
      distance_km: shipmentData.distance_km || 500,
      vehicle_type: shipmentData.vehicle_type || "Tata 407",
      vehicle_age_years: shipmentData.vehicle_age_years || 3,
      driver_experience_years: shipmentData.driver_experience_years || 5,
      driver_rest_hours_prior: shipmentData.driver_rest_hours_prior || 8,
      planned_transit_hours: shipmentData.planned_transit_hours || 24,
      weather_condition: shipmentData.weather_condition || "Clear",
      traffic_congestion_level:
        shipmentData.traffic_congestion_level || "Medium",
      road_condition_index: shipmentData.road_condition_index || 7,
      is_monsoon_season: shipmentData.is_monsoon_season || 0,
      is_festival_season: shipmentData.is_festival_season || 0,
      night_driving_flag: shipmentData.night_driving_flag || 0,
      num_toll_plazas: shipmentData.num_toll_plazas || 5,
      num_state_border_crossings: shipmentData.num_state_border_crossings || 1,
      eway_bill_verified: shipmentData.eway_bill_verified || 1,
      origin_wh_congestion_pct: shipmentData.origin_wh_congestion_pct || 50,
      dest_wh_congestion_pct: shipmentData.dest_wh_congestion_pct || 50,
      upstream_shipment_delay_minutes:
        shipmentData.upstream_shipment_delay_minutes || 0,
      vehicle_breakdown_flag: shipmentData.vehicle_breakdown_flag || 0,
      accident_reported_flag: shipmentData.accident_reported_flag || 0,
      gps_route_deviation_km: shipmentData.gps_route_deviation_km || 0,
      cascade_risk_score: shipmentData.cascade_risk_score || 0.3,
      checkpoint_delay_minutes: shipmentData.checkpoint_delay_minutes || 0,
      order_type: shipmentData.order_type || "B2B",
      priority_level: shipmentData.priority_level || "Scheduled-Freight",
      shipment_value_inr: shipmentData.shipment_value_inr || 50000,
      fuel_price_per_litre: shipmentData.fuel_price_per_litre || 100,
      language: "english",
      include_llm: true,
    };
    const res = await indianApi.post("/api/india/analyze", payload);
    return res.data;
  },

  async predictCascade(params) {
    const res = await indianApi.post("/api/india/cascade", {
      trigger_city: params.trigger_city,
      trigger_reason: params.trigger_reason || "warehouse_overload",
      severity: params.severity || 0.7,
      max_depth: params.max_depth || 5,
      affected_shipments: params.affected_shipments || 100,
    });
    return res.data;
  },

  async compareRoutes(shipmentId, routeA, routeB) {
    const res = await indianApi.post("/api/india/compare-routes", {
      shipment_id: shipmentId,
      route_a: routeA,
      route_b: routeB,
      context: {},
    });
    return res.data;
  },

  async rerouteShipment(shipmentId) {
    const res = await indianApi.post(`/api/india/reroute/${shipmentId}`);
    return res.data;
  },

  async getHealth() {
    const res = await indianApi.get("/api/india/health");
    return res.data;
  },

  async triggerTraining(sampleSize) {
    const res = await indianApi.post("/api/india/train", {
      sample_size: sampleSize,
      secret_key: "",
    });
    return res.data;
  },

  /**
   * Trigger a live weather refresh on the backend.
   * Forces the backend to re-fetch OpenWeather data for all active Indian
   * shipment origin cities and update risk scores accordingly.
   */
  async refreshWeather() {
    const res = await indianApi.post("/api/india/weather-refresh");
    return res.data;
  },

  /**
   * Generate AI-based alerts from DB shipments using training data patterns.
   * Returns newly created alert objects.
   */
  async generateAlerts(maxScan = 50) {
    const res = await indianApi.post("/api/india/generate-alerts", {
      max_scan: maxScan,
      force_new: false,
    });
    return res.data;
  },

  /**
   * Add a new shipment manually (admin panel).
   */
  async addShipment(shipmentData) {
    const res = await indianApi.post("/api/india/shipments/add", shipmentData);
    return res.data;
  },
};
