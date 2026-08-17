// frontend/src/store/useIndianStore.ts
/**
 * Zustand store for Indian Supply Chain panel
 */

import { create } from "zustand";
import { IndianApiService } from "../services/indianApi";

function computeKPIs(shipments, alerts) {
  const total = shipments.length;
  const delayed = shipments.filter(
    (s) => s.is_delayed || s.status === "delayed",
  ).length;
  const avgRisk =
    total > 0 ? shipments.reduce((sum, s) => sum + s.risk_score, 0) / total : 0;
  const onTime = total > 0 ? ((total - delayed) / total) * 100 : 100;
  const critical = alerts.filter((a) => a.severity === "critical").length;
  const totalValue = shipments.reduce(
    (sum, s) => sum + (s.shipment_value_inr || 0),
    0,
  );
  const cascadeNodes = shipments.filter(
    (s) => s.cascade_risk_score > 0.6,
  ).length;
  const anomalies = shipments.filter((s) => s.is_anomaly).length;

  return {
    total_shipments: total,
    delayed_count: delayed,
    avg_risk_score: Math.round(avgRisk * 10) / 10,
    on_time_rate: Math.round(onTime * 10) / 10,
    critical_alerts: critical,
    total_value_inr: Math.round(totalValue),
    cascade_risk_nodes: cascadeNodes,
    anomaly_count: anomalies,
  };
}

export const useIndianStore = create((set, get) => ({
  shipments: [],
  alerts: [],
  cascadeEvents: [],
  health: null,
  selectedShipment: null,
  analysisResult: null,
  kpis: {
    total_shipments: 0,
    delayed_count: 0,
    avg_risk_score: 0,
    on_time_rate: 0,
    critical_alerts: 0,
    total_value_inr: 0,
    cascade_risk_nodes: 0,
    anomaly_count: 0,
  },
  loading: false,
  alertsLoading: false,
  analysisLoading: false,
  cascadeLoading: false,
  error: null,
  activeRerouteResult: null,

  fetchShipments: async () => {
    set({ loading: true, error: null });
    try {
      const shipments = await IndianApiService.getShipments();
      const { alerts } = get();
      set({
        shipments,
        loading: false,
        error: null,
        kpis: computeKPIs(shipments, alerts),
      });
    } catch (err) {
      const msg = String(err);
      const friendlyMsg =
        msg.includes("ERR_CONNECTION_REFUSED") || msg.includes("Network Error")
          ? "Backend offline — run: python django_backend/manage.py runserver"
          : msg.replace("AxiosError: ", "").slice(0, 120);
      set({ loading: false, error: friendlyMsg });
    }
  },

  fetchAlerts: async (hours = 48) => {
    set({ alertsLoading: true });
    try {
      const alerts = await IndianApiService.getAlerts(hours);
      const { shipments } = get();
      set({
        alerts,
        alertsLoading: false,
        kpis: computeKPIs(shipments, alerts),
      });
    } catch {
      set({ alertsLoading: false });
    }
  },

  fetchCascadeEvents: async () => {
    set({ cascadeLoading: true });
    try {
      const events = await IndianApiService.getCascadeEvents(20);
      set({ cascadeEvents: events, cascadeLoading: false });
    } catch {
      set({ cascadeLoading: false });
    }
  },

  fetchHealth: async () => {
    try {
      const health = await IndianApiService.getHealth();
      set({ health });
    } catch {
      // Silently fail
    }
  },

  selectShipment: (shipment) => set({ selectedShipment: shipment }),

  analyzeShipment: async (shipment) => {
    set({ analysisLoading: true });
    try {
      const result = await IndianApiService.analyzeShipment(shipment);
      set({ analysisResult: result, analysisLoading: false });
    } catch (err) {
      set({ analysisLoading: false, error: String(err) });
    }
  },

  clearAnalysis: () => set({ analysisResult: null }),

  rerouteShipment: async (shipmentId) => {
    set({ loading: true });
    try {
      const res = await IndianApiService.rerouteShipment(shipmentId);
      const currentSelected = get().selectedShipment;
      if (currentSelected && currentSelected.id === shipmentId) {
        set({
          selectedShipment: {
            ...currentSelected,
            status: "rerouted",
            is_delayed: false,
            risk_level: "low",
            risk_score: 15.0,
            distance_remaining_km: res.route_details.distance_km,
            planned_transit_hours: res.route_details.planned_transit_hours,
            traffic_congestion_level:
              res.route_details.traffic_congestion_level,
          },
        });
      }
      await get().fetchShipments();
      set({ loading: false });
      return res;
    } catch (err) {
      set({ loading: false, error: String(err) });
      throw err;
    }
  },

  updateShipmentLocally: (id, updates) => {
    const { shipments, alerts } = get();
    const updatedShipments = shipments.map((s) =>
      s.id === id ? { ...s, ...updates } : s,
    );
    set({
      shipments: updatedShipments,
      selectedShipment:
        get().selectedShipment?.id === id
          ? { ...get().selectedShipment, ...updates }
          : get().selectedShipment,
      kpis: computeKPIs(updatedShipments, alerts),
    });
  },

  setActiveRerouteResult: (res) => set({ activeRerouteResult: res }),

  addShipment: async (shipmentData) => {
    set({ loading: true, error: null });
    try {
      const res = await IndianApiService.addShipment(shipmentData);
      // Refresh shipments + alerts after adding
      await get().fetchShipments();
      await get().fetchAlerts(48);
      set({ loading: false });
      return res;
    } catch (err) {
      set({ loading: false, error: String(err) });
      throw err;
    }
  },

  generateAlerts: async () => {
    set({ alertsLoading: true });
    try {
      const res = await IndianApiService.generateAlerts(50);
      // Re-fetch alerts so the store reflects new ones
      await get().fetchAlerts(48);
      return res;
    } catch (err) {
      set({ alertsLoading: false });
      throw err;
    }
  },
}));
