// pages/IndianDashboard.tsx
/**
 * Indian Supply Chain Command Center
 * AppLayout already triggers the initial fetch via useEffect.
 * This page only subscribes to the store and renders.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Clock,
  Shield,
  Activity,
  IndianRupee,
  MapPin,
  Truck,
  Cpu,
  RefreshCw,
  Zap,
  CloudSun,
  Inbox,
  CheckCircle2,
  XCircle,
  Mail,
  Calendar,
  Building2,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { TopBar } from "../../components/layout/TopBar";
import { GlassCard } from "../../components/ui/GlassCard";
import { KPICard } from "../../components/ui/KPICard";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { StatusChip } from "../../components/ui/StatusChip";
import { IndianShipmentMap } from "../../components/indian/IndianShipmentMap";
import { IndianRiskChart } from "../../components/indian/IndianRiskChart";
import { CascadeVisualization } from "../../components/indian/CascadeVisualization";
import { AIDecisionPanel } from "../../components/indian/AIDecisionPanel";
import { BorderCheckpostOptimizer } from "../../components/indian/BorderCheckpostOptimizer";
import { useIndianStore } from "../../store/useIndianStore";
import { useAuthStore } from "../../store/useAuthStore";
import { IndianApiService } from "../../services/indianApi";

export function IndianDashboard() {
  const {
    shipments,
    alerts,
    kpis,
    health,
    loading,
    error,
    fetchShipments,
    fetchAlerts,
    fetchHealth,
    fetchCascadeEvents,
    selectShipment,
  } = useIndianStore();

  const { token } = useAuthStore();

  const [refreshing, setRefreshing] = useState(false);
  const [weatherRefreshing, setWeatherRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [lastWeatherRefresh, setLastWeatherRefresh] = useState(null);

  const highRiskShipments = [...shipments]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 6);

  const recentAlerts = alerts.slice(0, 8);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchShipments(),
      fetchAlerts(),
      fetchHealth(),
      fetchCascadeEvents(),
    ]);
    setLastRefresh(new Date());
    setRefreshing(false);
  };

  const handleWeatherRefresh = async () => {
    setWeatherRefreshing(true);
    try {
      await IndianApiService.refreshWeather();
      // Re-fetch shipments so the UI picks up updated weather + risk scores
      await fetchShipments();
      setLastWeatherRefresh(new Date());
    } catch (e) {
      console.warn("[Weather Refresh]", e);
    } finally {
      setWeatherRefreshing(false);
    }
  };

  const formatINR = (v) => {
    if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
    if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
    if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}K`;
    return `₹${v}`;
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="🇮🇳 Indian Supply Chain Intelligence"
        subtitle="Real-time road logistics — AI-powered decisions"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                Live Monitoring
              </span>
            </div>
            <span className="text-xs text-slate-500">
              Refreshed {lastRefresh.toLocaleTimeString("en-IN")}
            </span>
            {health && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <Cpu className="h-3 w-3 text-emerald-500" />
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  AI {Object.values(health.models).filter(Boolean).length}/
                  {Object.keys(health.models).length} Models Ready
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {error && (
              <span className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded">
                {error.includes("ERR_CONNECTION_REFUSED")
                  ? "⚠️ Backend offline — run: python django_backend/manage.py runserver"
                  : `⚠️ ${error.slice(0, 60)}`}
              </span>
            )}
            {/* Live Weather Refresh */}
            <motion.button
              onClick={handleWeatherRefresh}
              whileTap={{ scale: 0.95 }}
              disabled={loading || weatherRefreshing}
              title={lastWeatherRefresh ? `Weather last refreshed at ${lastWeatherRefresh.toLocaleTimeString("en-IN")}` : "Fetch live weather for all cities"}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-bold transition-all disabled:opacity-50"
            >
              <CloudSun
                className={`h-3 w-3 ${weatherRefreshing ? "animate-spin" : ""}`}
              />
              {lastWeatherRefresh
                ? `Weather · ${lastWeatherRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                : "Live Weather"}
            </motion.button>
            <motion.button
              onClick={handleRefresh}
              whileTap={{ scale: 0.95 }}
              disabled={loading || refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-500 text-xs font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3 w-3 ${loading || refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </motion.button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          <KPICard
            title="Total Shipments"
            value={kpis.total_shipments.toString()}
            subtitle="Active routes"
            icon={Package}
            color="cyan"
            index={0}
          />
          <KPICard
            title="On-Time Rate"
            value={`${kpis.on_time_rate}%`}
            subtitle="Delivery performance"
            icon={TrendingUp}
            color={kpis.on_time_rate >= 80 ? "emerald" : "amber"}
            index={1}
            trend={{ value: kpis.on_time_rate - 80, label: "vs 80% target" }}
          />
          <KPICard
            title="Avg Risk Score"
            value={kpis.avg_risk_score.toString()}
            subtitle="Fleet-wide"
            icon={Shield}
            color={
              kpis.avg_risk_score > 55
                ? "red"
                : kpis.avg_risk_score > 35
                  ? "amber"
                  : "emerald"
            }
            index={2}
          />
          <KPICard
            title="Delayed"
            value={kpis.delayed_count.toString()}
            subtitle="Behind schedule"
            icon={Clock}
            color="red"
            index={3}
          />
          <KPICard
            title="Critical Alerts"
            value={kpis.critical_alerts.toString()}
            subtitle="Need action"
            icon={AlertTriangle}
            color="red"
            index={4}
          />
          <KPICard
            title="Cargo Value"
            value={formatINR(kpis.total_value_inr)}
            subtitle="In-transit"
            icon={IndianRupee}
            color="purple"
            index={5}
          />
          <KPICard
            title="Cascade Risk"
            value={kpis.cascade_risk_nodes.toString()}
            subtitle="Nodes at risk"
            icon={Zap}
            color="amber"
            index={6}
          />
          <KPICard
            title="Anomalies"
            value={kpis.anomaly_count.toString()}
            subtitle="Unusual patterns"
            icon={Activity}
            color="purple"
            index={7}
          />
        </div>

        {/* Map + Risk chart */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Map — 2 cols */}
          <GlassCard
            className="xl:col-span-2 p-0 overflow-hidden"
            style={{ height: "420px" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  🇮🇳 Live Indian Logistics Map
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                {["low", "medium", "high", "critical"].map((l) => (
                  <span key={l} className="flex items-center gap-1">
                    <span
                      className={`h-2 w-2 rounded-full inline-block ${
                        l === "low"
                          ? "bg-emerald-400"
                          : l === "medium"
                            ? "bg-amber-400"
                            : l === "high"
                              ? "bg-orange-400"
                              : "bg-red-500"
                      }`}
                    />
                    {l.charAt(0).toUpperCase() + l.slice(1)}
                  </span>
                ))}
                <span className="flex items-center gap-1 ml-1 text-emerald-400 font-bold">
                  <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse inline-block" />{" "}
                  Live
                </span>
              </div>
            </div>
            <div style={{ height: "calc(100% - 49px)" }}>
              <IndianShipmentMap />
            </div>
          </GlassCard>

          {/* Risk distribution */}
          <GlassCard className="p-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
              Risk Distribution
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Indian fleet breakdown
            </p>
            <IndianRiskChart shipments={shipments} />
          </GlassCard>
        </div>

        {/* PM Gati Shakti Optimizer */}
        <BorderCheckpostOptimizer />

        {/* Shipments + Alerts + AI */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* High risk */}
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                ⚠️ Highest Risk
              </h3>
              <span className="text-xs text-slate-500">
                {shipments.length} total
              </span>
            </div>
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="h-14 rounded-lg bg-black/5 dark:bg-white/[0.03] animate-pulse"
                    />
                  ))
              ) : highRiskShipments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <Package className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">No data — start FastAPI backend</p>
                </div>
              ) : (
                highRiskShipments.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => selectShipment(s)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-black/5 dark:bg-white/[0.03] hover:bg-black/10 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Truck className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200 truncate">
                          {s.id}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {s.origin_city} → {s.destination_city}
                        </p>
                        <p className="text-[9px] text-slate-400 truncate">
                          {s.carrier_company}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                      <RiskBadge
                        level={s.risk_level}
                        score={s.risk_score}
                        size="sm"
                        pulse={s.risk_level === "critical"}
                      />
                      <StatusChip status={s.status} size="sm" />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Alerts */}
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                🔔 Active Alerts
              </h3>
              <span className="text-xs text-slate-500">
                {recentAlerts.length} alerts
              </span>
            </div>
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {recentAlerts.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-slate-400">
                  <AlertTriangle className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">No alerts in last 48h</p>
                </div>
              ) : (
                recentAlerts.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`p-2.5 rounded-lg border text-xs ${
                      a.severity === "critical"
                        ? "bg-red-500/10 border-red-500/20"
                        : a.severity === "high"
                          ? "bg-amber-500/10 border-amber-500/20"
                          : "bg-black/5 dark:bg-white/[0.03] border-black/5 dark:border-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`font-mono font-bold text-[10px] ${
                          a.severity === "critical"
                            ? "text-red-400"
                            : a.severity === "high"
                              ? "text-amber-400"
                              : "text-slate-400"
                        }`}
                      >
                        {a.shipment_id}
                      </span>
                      <div className="flex items-center gap-1">
                        {/* Weather warning badge */}
                        {!!a.weather_warning && (
                          <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded-full font-bold">
                            {String(a.weather_icon)} Weather
                          </span>
                        )}
                        {/* Alert type badge */}
                        {a.type === "weather_warning" && (
                          <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded-full">
                            🌦️ Weather
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                            a.severity === "critical"
                              ? "bg-red-500/20 text-red-400"
                              : a.severity === "high"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-slate-500/20 text-slate-400"
                          }`}
                        >
                          {a.severity}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">
                      {a.message}
                    </p>
                    {a.top_risk_factors?.[0] && (
                      <p className="text-[9px] mt-1 opacity-60">
                        ⚡ {a.top_risk_factors[0]}
                      </p>
                    )}
                    {/* Reroute options */}
                    {(a.reroute_options?.length ?? 0) > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-white/[0.06]">
                        <p className="text-[9px] text-cyan-400 font-bold mb-0.5">
                          🔀 Reroute Available:
                        </p>
                        {(a.reroute_options || []).slice(0, 2).map((r, ri) => (
                          <div
                            key={ri}
                            className={`text-[9px] ${r.recommended ? "text-emerald-400" : "text-slate-400"}`}
                          >
                            {r.recommended ? "✅" : "•"} {r.name} —{" "}
                            {r.distance_km}km · risk:{r.risk_score}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>

          {/* AI panel */}
          <AIDecisionPanel />
        </div>

        {/* Cascade visualization */}
        <GlassCard className="p-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
            🌊 Cascading Failure Prediction
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Simulate domino-effect disruptions across India logistics network
          </p>
          <CascadeVisualization shipments={shipments} />
        </GlassCard>

      </div>
    </div>
  );
}
