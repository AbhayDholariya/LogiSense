// components/indian/IndianShipmentDetailDrawer.tsx
/**
 * Indian Shipment Detail Drawer
 * Slides in from the right when an Indian shipment is clicked/selected.
 * Displays comprehensive, highly realistic logistics telemetry, telemetry charts,
 * environmental risk conditions, and embeds the AI Decision Panel.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  Truck,
  ShieldAlert,
  Navigation,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  Compass,
  Gauge,
  Tag,
  BadgePercent,
} from "lucide-react";
import { useIndianStore } from "../../store/useIndianStore";
import { AIDecisionPanel } from "./AIDecisionPanel";
import { RiskBadge } from "../ui/RiskBadge";

export function IndianShipmentDetailDrawer({ shipment, onClose }) {
  const {
    selectedShipment,
    selectShipment,
    rerouteShipment,
    activeRerouteResult,
    setActiveRerouteResult,
  } = useIndianStore();
  const [rerouteLoading, setRerouteLoading] = useState(false);

  const s = shipment || selectedShipment;

  // Clear reroute path when selected shipment changes
  useEffect(() => {
    setActiveRerouteResult(null);
  }, [s?.id, setActiveRerouteResult]);

  if (!s) return null;

  // Format currency in Indian Rupees
  const formatINR = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const progressPercent = Math.round((s.progress || 0.5) * 100);
  const remainingKm = Math.round(
    s.distance_remaining_km || (s.distance_km || 0) * (1 - (s.progress || 0)),
  );

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0.9 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0.9 }}
      transition={{ type: "spring", damping: 26, stiffness: 180 }}
      className="absolute right-0 top-0 h-full w-[380px] bg-white/95 dark:bg-slate-950/95 border-l border-slate-200/80 dark:border-white/10 backdrop-blur-xl overflow-y-auto z-[1001] shadow-2xl flex flex-col select-text shipment-detail-drawer"
    >
      {/* Header */}
      <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono font-black text-cyan-400 tracking-wider">
              {s.id}
            </span>
            <RiskBadge
              level={s.risk_level}
              score={s.risk_score}
              size="sm"
              pulse={s.risk_score > 60}
            />
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {s.carrier_company}
          </p>
        </div>
        <button
          onClick={() => onClose ? onClose() : selectShipment(null)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Quick Status / Disruption Warning */}
        {s.is_delayed && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-[11px] font-bold text-red-300">
                Active Delay Flag
              </p>
              <p className="text-[10px] text-red-400/80 mt-0.5">
                Current delay duration is {s.delay_duration_minutes?.toFixed(0)}{" "}
                minutes. Upstream transit congestion or checkpoints affecting
                timeline.
              </p>
            </div>
          </div>
        )}

        {s.is_anomaly && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-amber-300">
                Route Anomaly Triggered
              </p>
              <p className="text-[10px] text-amber-400/80 mt-0.5">
                GPS route deviation ({s.gps_route_deviation_km || 4.2} km) or
                abnormal dwell time detected. High probability of unscheduled
                stop.
              </p>
            </div>
          </div>
        )}

        {/* Automated AI Reroute Section */}
        {(s.is_delayed || s.risk_score > 40) && (
          <div className="bg-[#0f1d36]/70 border border-cyan-500/25 rounded-lg p-3.5 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 border-b border-cyan-500/15 pb-2">
              <span className="text-xs">🔀</span>
              <div>
                <p className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider">
                  AI Automated Reroute Optimization
                </p>
                <p className="text-[9px] text-slate-400">
                  LLM Brain calculates best routing decision
                </p>
              </div>
            </div>

            {!activeRerouteResult ? (
              <button
                onClick={async () => {
                  setRerouteLoading(true);
                  try {
                    const res = await rerouteShipment(s.id);
                    setActiveRerouteResult(res);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setRerouteLoading(false);
                  }
                }}
                disabled={rerouteLoading}
                className="w-full py-2 bg-gradient-to-r from-cyan-600/30 to-purple-600/30 hover:from-cyan-600/40 hover:to-purple-600/40 border border-cyan-500/30 rounded text-[10px] font-black uppercase text-cyan-300 flex items-center justify-center gap-2 transition-all"
              >
                {rerouteLoading ? (
                  <>
                    <span className="h-3 w-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    LLM Brain is calculating savings...
                  </>
                ) : (
                  "Run Automated AI Rerouting"
                )}
              </button>
            ) : (
              <div className="space-y-3.5 text-[10px]">
                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded p-2.5 space-y-2">
                  <p className="font-extrabold text-emerald-400 text-[10px] flex items-center gap-1.5">
                    <span>✓</span> RECOMMENDED ROUTE SELECTION
                  </p>
                  <p className="font-bold text-slate-200 text-[10.5px]">
                    {activeRerouteResult.decision}
                  </p>
                  <p className="text-slate-400 text-[9.5px] leading-relaxed italic whitespace-pre-line">
                    "{activeRerouteResult.explanation}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 bg-slate-900/60 border border-white/5 rounded">
                    <p className="text-[12px] font-black text-emerald-400">
                      ₹
                      {activeRerouteResult.financial_savings_inr?.toLocaleString()}
                    </p>
                    <p className="text-[8.5px] text-slate-500 font-bold uppercase mt-0.5">
                      Financial Savings
                    </p>
                  </div>
                  <div className="p-2 bg-slate-900/60 border border-white/5 rounded">
                    <p className="text-[12px] font-black text-cyan-400">
                      {activeRerouteResult.fuel_savings_litres} L
                    </p>
                    <p className="text-[8.5px] text-slate-500 font-bold uppercase mt-0.5">
                      Fuel Saved
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/50 p-2.5 rounded border border-white/5 space-y-1.5">
                  <p className="text-[9px] text-slate-500 font-bold uppercase">
                    Optimized Path
                  </p>
                  <p className="font-medium text-slate-300 leading-relaxed font-mono text-[9px]">
                    {activeRerouteResult.route_details.path}
                  </p>
                  <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1.5 border-t border-white/5">
                    <span>
                      Traffic:{" "}
                      <strong className="text-cyan-400">
                        {activeRerouteResult.traffic_congestion_level}
                      </strong>
                    </span>
                    <span>
                      Transit:{" "}
                      <strong>
                        {
                          activeRerouteResult.route_details
                            .planned_transit_hours
                        }{" "}
                        hrs
                      </strong>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveRerouteResult(null)}
                  className="w-full text-center py-1 text-[9px] text-slate-500 hover:text-slate-300 transition-colors uppercase font-bold"
                >
                  Reset Rerouting Option
                </button>
              </div>
            )}
          </div>
        )}

        {/* Route Card */}
        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Route Details
            </span>
            <span className="text-[10px] bg-slate-800 text-cyan-400 px-2 py-0.5 rounded font-mono font-bold uppercase">
              {s.order_type}
            </span>
          </div>

          <div className="relative pl-6">
            <div className="absolute left-1.5 top-1.5 bottom-1.5 w-0.5 bg-gradient-to-b from-cyan-400 to-purple-400" />
            <div className="absolute left-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-cyan-400 border border-slate-950" />
            <div className="absolute left-0.5 bottom-0.5 h-2.5 w-2.5 rounded-full bg-purple-400 border border-slate-950" />

            <div className="space-y-4">
              <div>
                <p className="text-[11px] text-slate-100 font-extrabold">
                  {s.origin_city}
                </p>
                <p className="text-[9px] text-slate-400 font-medium">
                  {s.origin_state}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-100 font-extrabold">
                  {s.destination_city}
                </p>
                <p className="text-[9px] text-slate-400 font-medium">
                  {s.destination_state}
                </p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
              <span className="font-semibold text-slate-300">
                {progressPercent}% Completed
              </span>
              <span className="font-mono">
                {remainingKm} km / {Math.round(s.distance_km)} km left
              </span>
            </div>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-400"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1.5">
              <span>
                ETA:{" "}
                {s.eta_hours
                  ? `${s.eta_hours.toFixed(1)} hrs`
                  : "Calculating..."}
              </span>
              <span>Planned: {s.planned_transit_hours} hrs</span>
            </div>
          </div>
        </div>

        {/* Realistic Supply Chain Telemetry */}
        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3.5 space-y-3">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-white/5 pb-2">
            Supply Chain Telemetry
          </p>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Speed
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Gauge className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-[11px] font-extrabold text-slate-200">
                  {s.speed_kmh} km/h
                </span>
              </div>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Vehicle Type
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Truck className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-[11px] font-extrabold text-slate-200">
                  {s.vehicle_type} (Age: {s.vehicle_age_years}y)
                </span>
              </div>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Driver Exp
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <User className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-[11px] font-extrabold text-slate-200">
                  {s.driver_experience_years} Years
                </span>
              </div>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Driver Rest Prior
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-[11px] font-extrabold text-slate-200">
                  {s.driver_rest_hours_prior} hrs
                </span>
              </div>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Toll Plazas Passed
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <BadgePercent className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-[11px] font-extrabold text-slate-200">
                  {s.num_toll_plazas} plazas
                </span>
              </div>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Border Crossings
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Navigation className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-[11px] font-extrabold text-slate-200">
                  {s.num_state_border_crossings} borders
                </span>
              </div>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                E-Way Bill Status
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[11px] font-extrabold text-slate-200">
                  Verified & Active
                </span>
              </div>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                GPS Route Deviation
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Compass className="h-3.5 w-3.5 text-cyan-400" />
                <span
                  className={`text-[11px] font-extrabold ${s.gps_route_deviation_km > 5 ? "text-red-400" : "text-slate-200"}`}
                >
                  {s.gps_route_deviation_km?.toFixed(1) || "0.0"} km
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Environmental Risk Factors */}
        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3.5 space-y-3">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-white/5 pb-2">
            Environmental Risk Context
          </p>

          <div className="grid grid-cols-2 gap-3.5 text-[10px]">
            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Road Weather
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 text-slate-200 font-medium">
                <CloudRain className="h-3.5 w-3.5 text-blue-400" />
                <span>{s.weather_condition}</span>
                {s.live_weather?.is_live === true && (
                  <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.5 rounded font-bold ml-1">
                    LIVE
                  </span>
                )}
                {s.live_weather?.is_live === false && (
                  <span className="text-[8px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0.5 rounded font-bold ml-1">
                    CACHED
                  </span>
                )}
              </div>
              {s.live_weather && (
                <p className="text-[8px] text-slate-500 mt-0.5">
                  💨 {s.live_weather.wind_speed_kmh} km/h · 👁️ {s.live_weather.visibility_km} km · 💧 {s.live_weather.humidity}%
                </p>
              )}
            </div>

            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Traffic Congestion
              </p>
              <span
                className={`inline-block mt-1 font-bold ${
                  s.traffic_congestion_level === "Very High" ||
                  s.traffic_congestion_level === "High"
                    ? "text-red-400"
                    : "text-slate-200"
                }`}
              >
                {s.traffic_congestion_level}
              </span>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Warehouse Congestion
              </p>
              <p className="text-slate-200 font-medium mt-0.5">
                Origin:{" "}
                <span className="font-bold">
                  {s.origin_wh_congestion_pct?.toFixed(0)}%
                </span>{" "}
                | Dest:{" "}
                <span className="font-bold">
                  {s.dest_wh_congestion_pct?.toFixed(0)}%
                </span>
              </p>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Season Factor
              </p>
              <p className="text-slate-200 font-medium mt-0.5">
                {s.is_monsoon_season ? "☔ Monsoon" : ""}{" "}
                {s.is_festival_season ? "🎉 Festival Peak" : ""}
                {!s.is_monsoon_season && !s.is_festival_season
                  ? "✓ Standard Season"
                  : ""}
              </p>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Congestion Index
              </p>
              <span className="text-slate-200 font-mono mt-0.5 font-bold">
                {(s.segment_congestion_idx || 0).toFixed(2)} / 1.00
              </span>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Route Disruption Count
              </p>
              <span className="text-slate-200 mt-0.5 font-bold">
                {s.route_disruption_cnt_30d || 0} incidents (30d)
              </span>
            </div>
          </div>
        </div>

        {/* Cargo & Financials */}
        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3.5 space-y-3">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-white/5 pb-2">
            Financials & Value
          </p>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Cargo Value
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 font-extrabold text-emerald-400 text-sm">
                <span>{formatINR(s.shipment_value_inr)}</span>
              </div>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Cargo Category
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 text-slate-200 font-semibold text-xs">
                <Tag className="h-3 w-3 text-cyan-400" />
                <span>{s.cargo_type}</span>
              </div>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Upstream Delay
              </p>
              <span
                className={`text-xs font-bold ${s.upstream_shipment_delay_minutes > 30 ? "text-red-400" : "text-slate-200"}`}
              >
                {s.upstream_shipment_delay_minutes} mins
              </span>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Local Fuel Price
              </p>
              <span className="text-xs text-slate-200 font-bold">
                ₹{s.fuel_price_per_litre}/L
              </span>
            </div>
          </div>
        </div>

        {/* AI Decision Panel (XGBoost + Isolation Forest + Gemini 2.5 Flash) */}
        <div className="border-t border-white/10 pt-4">
          <AIDecisionPanel />
        </div>
      </div>
    </motion.div>
  );
}
