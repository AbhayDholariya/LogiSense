// pages/IndianAlerts.jsx
/**
 * Indian Supply Chain Alerts Page
 * Real-time alerts with severity filtering + AI alert generation
 */

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  Clock,
  RefreshCw,
  Shield,
  Zap,
  Cpu,
} from "lucide-react";
import { TopBar } from "../../components/layout/TopBar";
import { GlassCard } from "../../components/ui/GlassCard";
import { useIndianStore } from "../../store/useIndianStore";

const SEVERITY_CONFIG = {
  critical: {
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    dot: "bg-red-500",
    icon: "🔴",
  },
  high: {
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    dot: "bg-orange-500",
    icon: "🟠",
  },
  medium: {
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    dot: "bg-amber-500",
    icon: "🟡",
  },
  low: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    dot: "bg-emerald-500",
    icon: "🟢",
  },
};

// Auto-refresh interval for alerts (15 seconds)
const AUTO_REFRESH_MS = 15000;

export function IndianAlerts() {
  const { alerts, alertsLoading, fetchAlerts, fetchShipments, generateAlerts } =
    useIndianStore();
  const [severityFilter, setSeverityFilter] = useState("all");
  const [hours, setHours] = useState(48);
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [generateResult, setGenerateResult] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchAlerts(hours);
    fetchShipments();
  }, [hours]);

  // Auto-refresh alerts every 15s (live feel)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchAlerts(hours);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [hours]);

  const handleGenerateAlerts = async () => {
    setGenerating(true);
    setGenerateResult(null);
    try {
      const res = await generateAlerts();
      setLastGenerated(new Date());
      setGenerateResult(res);
    } catch {
      // silently fail
    } finally {
      setGenerating(false);
    }
  };

  const filtered = alerts.filter((a) =>
    severityFilter === "all" ? true : a.severity === severityFilter,
  );

  const counts = {
    critical: alerts.filter((a) => a.severity === "critical").length,
    high: alerts.filter((a) => a.severity === "high").length,
    medium: alerts.filter((a) => a.severity === "medium").length,
    low: alerts.filter((a) => a.severity === "low").length,
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="🔔 Indian Alert Intelligence"
        subtitle={`${filtered.length} alerts in last ${hours}h · auto-refresh every 15s`}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Summary KPIs */}
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(counts).map(([severity, count]) => {
            const cfg = SEVERITY_CONFIG[severity];
            return (
              <GlassCard
                key={severity}
                className={`p-4 cursor-pointer border ${
                  severityFilter === severity ? cfg.bg : "border-transparent"
                } transition-all`}
                onClick={() =>
                  setSeverityFilter(
                    severityFilter === severity ? "all" : severity,
                  )
                }
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`h-2 w-2 rounded-full ${cfg.dot} ${
                      severity === "critical" ? "animate-pulse" : ""
                    }`}
                  />
                  <span className={`text-xs font-bold ${cfg.color} capitalize`}>
                    {severity}
                  </span>
                </div>
                <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
                <p className="text-[10px] text-slate-500 font-medium">alerts</p>
              </GlassCard>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            {["all", "critical", "high", "medium", "low"].map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  severityFilter === s
                    ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 bg-black/5 dark:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="bg-black/5 dark:bg-white/[0.05] border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-white focus:outline-none"
            >
              <option value={12}>Last 12h</option>
              <option value={24}>Last 24h</option>
              <option value={48}>Last 48h</option>
              <option value={168}>Last week</option>
            </select>

            {/* AI Generate Alerts button */}
            <button
              onClick={handleGenerateAlerts}
              disabled={generating || alertsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 text-xs font-bold transition-all disabled:opacity-50"
              title="Use AI to scan shipments and generate new alerts based on training data patterns"
            >
              {generating ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Cpu className="h-3 w-3" />
              )}
              {generating ? "Scanning..." : "AI Generate"}
            </button>

            <button
              onClick={() => fetchAlerts(hours)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-xs font-bold transition-all"
            >
              <RefreshCw
                className={`h-3 w-3 ${alertsLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* AI Generate result banner */}
        {generateResult && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20"
          >
            <Cpu className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-purple-300">
                AI Alert Generation Complete
              </p>
              <p className="text-[10px] text-slate-400">
                Scanned {generateResult.scanned} shipments →{" "}
                <span className="text-purple-300 font-bold">
                  {generateResult.created} new alerts
                </span>{" "}
                created using training data patterns
                {lastGenerated &&
                  ` · ${lastGenerated.toLocaleTimeString("en-IN")}`}
              </p>
            </div>
          </motion.div>
        )}

        {/* Auto-refresh indicator */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Auto-refreshing every 15s</span>
          {alertsLoading && (
            <RefreshCw className="h-3 w-3 text-slate-400 animate-spin ml-1" />
          )}
        </div>

        {/* Alert Cards */}
        <div className="space-y-3">
          {alertsLoading && filtered.length === 0 ? (
            Array(4)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl bg-black/5 dark:bg-white/[0.03] animate-pulse"
                />
              ))
          ) : filtered.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-3 text-slate-400 opacity-30" />
              <p className="text-sm text-slate-400">No alerts in this period</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                System is monitoring all shipments
              </p>
              <button
                onClick={handleGenerateAlerts}
                disabled={generating}
                className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-purple-500/15 border border-purple-500/25 text-purple-400 text-xs font-bold transition-all hover:bg-purple-500/25"
              >
                <Cpu className="h-3.5 w-3.5" />
                Generate AI Alerts Now
              </button>
            </GlassCard>
          ) : (
            filtered.map((alert, i) => {
              const cfg =
                SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
              const blinkClass =
                alert.severity === "critical"
                  ? "critical-blink"
                  : alert.severity === "high"
                    ? "high-blink"
                    : "";
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.5) }}
                >
                  <GlassCard
                    className={`p-4 border ${cfg.bg} ${blinkClass} transition-all`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Severity Icon */}
                        <div
                          className={`flex-shrink-0 h-8 w-8 rounded-lg ${cfg.bg} border flex items-center justify-center`}
                        >
                          {alert.severity === "critical" ? (
                            <AlertTriangle className={`h-4 w-4 ${cfg.color}`} />
                          ) : alert.type === "anomaly_detected" ? (
                            <Zap className={`h-4 w-4 ${cfg.color}`} />
                          ) : (
                            <Shield className={`h-4 w-4 ${cfg.color}`} />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                              {alert.shipment_id}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${cfg.bg} ${cfg.color} border`}
                            >
                              {alert.severity}
                            </span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-white/5 rounded px-1.5 py-0.5">
                              {alert.type?.replace(/_/g, " ")}
                            </span>
                            {!!alert.weather_warning && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                {String(alert.weather_icon)}{" "}
                                {String(alert.weather_label)}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {alert.message}
                          </p>

                          {/* Metrics row */}
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold ${
                                alert.risk_score > 70
                                  ? "text-red-400"
                                  : alert.risk_score > 40
                                    ? "text-amber-400"
                                    : "text-emerald-400"
                              }`}
                            >
                              Risk: {alert.risk_score?.toFixed(0) || "?"}/100
                            </span>
                            {alert.delay_probability > 0 && (
                              <span className="text-[10px] text-purple-400 font-medium">
                                Delay:{" "}
                                {(alert.delay_probability * 100).toFixed(0)}%
                              </span>
                            )}
                            {alert.cascade_risk > 0 && (
                              <span className="text-[10px] text-orange-400 font-medium">
                                Cascade:{" "}
                                {(alert.cascade_risk * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>

                          {/* Risk factors */}
                          {alert.top_risk_factors?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {alert.top_risk_factors.slice(0, 3).map((f, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] bg-black/10 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 rounded px-1.5 py-0.5"
                                >
                                  ⚡ {f}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Reroute options */}
                          {(alert.reroute_options?.length ?? 0) > 0 && (
                            <div className="mt-3 pt-2 border-t border-white/[0.06]">
                              <p className="text-[9px] text-cyan-400 font-bold mb-1.5">
                                🔀 Available Reroute Options:
                              </p>
                              <div className="space-y-1">
                                {alert.reroute_options.map((r, ri) => (
                                  <div
                                    key={ri}
                                    className={`flex items-center justify-between text-[9px] p-1.5 rounded-lg ${
                                      r.recommended
                                        ? "bg-emerald-500/10 border border-emerald-500/20"
                                        : "bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span>{r.recommended ? "✅" : `${ri + 1}.`}</span>
                                      <span
                                        className={`font-bold ${
                                          r.recommended
                                            ? "text-emerald-500 dark:text-emerald-400"
                                            : "text-slate-700 dark:text-slate-300"
                                        }`}
                                      >
                                        {r.name}
                                      </span>
                                      <span className="text-slate-500">
                                        — {r.reason}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2 text-slate-400">
                                      <span>{r.distance_km} km</span>
                                      <span>{r.transit_hours}h</span>
                                      <span
                                        className={
                                          r.risk_score > 50
                                            ? "text-red-400"
                                            : "text-emerald-400"
                                        }
                                      >
                                        risk:{r.risk_score}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1 flex-shrink-0 text-[10px] text-slate-500">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.created_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
