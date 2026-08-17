// pages/Indian
// .tsx
/**
 * Indian Shipments Management Page
 * Full list with filters, search, and AI analysis
 */

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Truck,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { TopBar } from "../../components/layout/TopBar";
import { GlassCard } from "../../components/ui/GlassCard";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { StatusChip } from "../../components/ui/StatusChip";
import { useIndianStore } from "../../store/useIndianStore";

export function IndianShipments() {
  const {
    shipments,
    loading,
    fetchShipments,
    selectShipment,
    analyzeShipment,
    analysisLoading,
  } = useIndianStore();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("risk_score");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchShipments();
  }, []);

  const filtered = useMemo(() => {
    let result = [...shipments];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.origin_city.toLowerCase().includes(q) ||
          s.destination_city.toLowerCase().includes(q) ||
          s.carrier_company.toLowerCase().includes(q) ||
          s.cargo_type.toLowerCase().includes(q),
      );
    }

    if (riskFilter !== "all")
      result = result.filter((s) => s.risk_level === riskFilter);
    if (statusFilter !== "all")
      result = result.filter((s) => s.status === statusFilter);

    result.sort((a, b) => {
      const va = a[sortField] || 0;
      const vb = b[sortField] || 0;
      return sortAsc ? va - vb : vb - va;
    });

    return result;
  }, [shipments, search, riskFilter, statusFilter, sortField, sortAsc]);

  const handleSort = (field) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleAnalyze = async (shipment) => {
    selectShipment(shipment);
    await analyzeShipment(shipment);
    setExpandedId(shipment.id);
  };

  const formatINR = (v) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    return `₹${(v / 1000).toFixed(0)}K`;
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="🚚 Indian Shipments"
        subtitle={`${filtered.length} of ${shipments.length} shipments`}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Filters */}
        <GlassCard className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ID, city, carrier, cargo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/5 dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>

            {/* Risk filter */}
            <div className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              {["all", "low", "medium", "high", "critical"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRiskFilter(r)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    riskFilter === r
                      ? r === "all"
                        ? "bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 border border-cyan-500/30"
                        : r === "critical"
                          ? "bg-red-500/20 text-red-650 dark:text-red-400 border border-red-500/30"
                          : r === "high"
                            ? "bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30"
                            : r === "medium"
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 bg-black/5 dark:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10"
                  }`}
                >
                  {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-black/5 dark:bg-white/[0.05] border border-black/10 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-white focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="in_transit">In Transit</option>
              <option value="delayed">Delayed</option>
              <option value="at_warehouse">At Warehouse</option>
              <option value="loading">Loading</option>
            </select>
          </div>
        </GlassCard>

        {/* Sort Controls */}
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span>Sort by:</span>
          {[
            ["risk_score", "Risk"],
            ["distance_km", "Distance"],
            ["shipment_value_inr", "Value"],
            ["delay_duration_minutes", "Delay"],
          ].map(([field, label]) => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
                sortField === field
                  ? "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border border-cyan-500/25"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 bg-black/5 dark:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10"
              }`}
            >
              {label}
              {sortField === field &&
                (sortAsc ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                ))}
            </button>
          ))}
        </div>

        {/* Shipments Table */}
        <div className="space-y-2">
          {loading ? (
            Array(6)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-black/5 dark:bg-white/[0.03] animate-pulse"
                />
              ))
          ) : filtered.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Truck className="h-12 w-12 mx-auto mb-3 text-slate-400 opacity-40" />
              <p className="text-sm text-slate-400">No shipments found</p>
              <p className="text-xs text-slate-500 mt-1">
                Try adjusting filters or start the backend server
              </p>
            </GlassCard>
          ) : (
            filtered.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <GlassCard
                  className={`p-3 cursor-pointer hover:bg-black/10 dark:hover:bg-white/[0.06] transition-all ${
                    expandedId === s.id ? "ring-1 ring-cyan-500/30" : ""
                  }`}
                  onClick={() =>
                    setExpandedId(expandedId === s.id ? null : s.id)
                  }
                >
                  {/* Main row */}
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-black/5 dark:bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                      <Truck className="h-4 w-4 text-slate-400" />
                    </div>

                    <div className="flex-1 grid grid-cols-5 gap-3 items-center min-w-0">
                      {/* ID + Route */}
                      <div className="col-span-2 min-w-0">
                        <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 truncate">
                          {s.id}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {s.origin_city}, {s.origin_state} →{" "}
                          {s.destination_city}, {s.destination_state}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {s.carrier_company} · {s.cargo_type}
                        </p>
                      </div>

                      {/* Distance + Value */}
                      <div className="hidden md:block">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {s.distance_km?.toFixed(0)} km
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatINR(s.shipment_value_inr)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {s.vehicle_type}
                        </p>
                      </div>

                      {/* Status + Delay */}
                      <div>
                        <StatusChip status={s.status} size="sm" />
                        {s.is_delayed && (
                          <p className="text-[10px] text-amber-400 mt-1">
                            ⏰ +{s.delay_duration_minutes?.toFixed(0)}m
                          </p>
                        )}
                      </div>

                      {/* Risk */}
                      <div className="flex flex-col items-end gap-1">
                        <RiskBadge
                          level={s.risk_level}
                          score={s.risk_score}
                          size="sm"
                          pulse={s.risk_level === "critical"}
                        />
                        <p className="text-[10px] text-slate-500">
                          {(s.delay_probability * 100).toFixed(0)}% delay
                        </p>
                      </div>
                    </div>

                    {/* Analyze button */}
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyze(s);
                      }}
                      whileTap={{ scale: 0.95 }}
                      disabled={analysisLoading}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold transition-all flex-shrink-0"
                    >
                      <Zap className="h-3 w-3" />
                      AI
                    </motion.button>
                  </div>

                  {/* Expanded details */}
                  {expandedId === s.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="mt-3 pt-3 border-t border-black/5 dark:border-white/[0.06]"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          {
                            label: "Weather",
                            value: s.weather_condition || s.weather_condition,
                          },
                          {
                            label: "Traffic",
                            value: s.traffic_congestion_level,
                          },
                          {
                            label: "Driver Rest",
                            value: `${s.driver_rest_hours_prior}h`,
                          },
                          {
                            label: "Vehicle Age",
                            value: `${s.vehicle_age_years}y`,
                          },
                          {
                            label: "Toll Plazas",
                            value: s.num_toll_plazas?.toString(),
                          },
                          {
                            label: "Border Cross",
                            value: s.num_state_border_crossings?.toString(),
                          },
                          {
                            label: "Origin WH %",
                            value: `${s.origin_wh_congestion_pct}%`,
                          },
                          {
                            label: "Cascade Risk",
                            value: `${(s.cascade_risk_score * 100).toFixed(0)}%`,
                          },
                        ].map(({ label, value }) => (
                          <div
                            key={label}
                            className="bg-black/5 dark:bg-white/[0.03] rounded-lg p-2"
                          >
                            <p className="text-[9px] text-slate-500 font-bold">
                              {label}
                            </p>
                            <p className="text-xs text-slate-700 dark:text-slate-200 font-bold">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Warning flags row */}
                      {s.road_closure_flag ||
                      s.strike_event_flag ||
                      s.customs_hold_flag ||
                      s.traffic_incident_flag ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.road_closure_flag ? (
                            <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/20 rounded px-2 py-0.5">
                              🚧 Road Closure
                            </span>
                          ) : null}
                          {s.strike_event_flag ? (
                            <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded px-2 py-0.5">
                              🪧 Strike Event
                            </span>
                          ) : null}
                          {s.customs_hold_flag ? (
                            <span className="text-[9px] bg-purple-500/15 text-purple-400 border border-purple-500/20 rounded px-2 py-0.5">
                              🛃 Customs Hold
                            </span>
                          ) : null}
                          {s.traffic_incident_flag ? (
                            <span className="text-[9px] bg-orange-500/15 text-orange-400 border border-orange-500/20 rounded px-2 py-0.5">
                              🚨 Traffic Incident
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {s.top_risk_factors && s.top_risk_factors.length > 0 && (
                        <div className="col-span-4 bg-red-500/5 border border-red-500/10 rounded-lg p-2 mt-2">
                          <p className="text-[9px] text-red-400 font-bold mb-1">
                            ⚡ Risk Factors
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {s.top_risk_factors.map((f, i) => (
                              <span
                                key={i}
                                className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/15 rounded px-1.5 py-0.5"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reroute Options */}
                      {(s.reroute_options?.length ?? 0) > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/[0.06]">
                          <p className="text-[9px] text-cyan-400 font-bold mb-1.5">
                            🔀 Reroute Options (AI Recommended)
                          </p>
                          <div className="space-y-1">
                            {(s.reroute_options || []).map((r, ri) => (
                              <div
                                key={ri}
                                className={`flex items-center justify-between text-[9px] p-2 rounded-lg ${r.recommended ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-white/[0.03] border border-white/[0.06]"}`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span>
                                    {r.recommended ? "✅" : `${ri + 1}.`}
                                  </span>
                                  <div>
                                    <p
                                      className={`font-bold ${r.recommended ? "text-emerald-400" : "text-slate-300"}`}
                                    >
                                      {r.name}
                                    </p>
                                    <p className="text-slate-500">{r.reason}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0 ml-2 text-slate-400">
                                  <span>{r.distance_km} km</span>
                                  <span>{r.transit_hours}h transit</span>
                                  <span>₹{r.toll_cost_inr} toll</span>
                                  <span
                                    className={`font-bold ${r.risk_score > 50 ? "text-red-400" : "text-emerald-400"}`}
                                  >
                                    Risk: {r.risk_score}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </GlassCard>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
