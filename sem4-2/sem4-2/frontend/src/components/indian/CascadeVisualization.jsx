// components/charts/CascadeVisualization.tsx
/**
 * Cascade failure visualization for Indian supply chain
 * Shows network risk across major Indian cities
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  IndianRupee,
} from "lucide-react";
import { IndianApiService } from "../../services/indianApi";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip,
} from "recharts";

// Major Indian logistics hubs
const LOGISTICS_HUBS = [
  { city: "Mumbai", state: "MH", type: "port" },
  { city: "Delhi", state: "DL", type: "hub" },
  { city: "Bangalore", state: "KA", type: "hub" },
  { city: "Chennai", state: "TN", type: "port" },
  { city: "Kolkata", state: "WB", type: "port" },
  { city: "Hyderabad", state: "TS", type: "hub" },
  { city: "Pune", state: "MH", type: "warehouse" },
  { city: "Ahmedabad", state: "GJ", type: "hub" },
];

const DISRUPTION_REASONS = [
  "warehouse_overload",
  "vehicle_breakdown",
  "road_closure",
  "strike_action",
  "flood",
  "accident",
  "customs_delay",
];

export function CascadeVisualization({ shipments }) {
  const [selectedCity, setSelectedCity] = useState("Mumbai");
  const [severity, setSeverity] = useState(0.7);
  const [reason, setReason] = useState("warehouse_overload");
  const [cascadeResult, setCascadeResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // City risk computed from current shipments
  const cityRisk = useMemo(() => {
    const riskMap = {};

    shipments.forEach((s) => {
      [s.origin_city, s.destination_city].forEach((city) => {
        if (!riskMap[city])
          riskMap[city] = { count: 0, totalRisk: 0, delayed: 0 };
        riskMap[city].count++;
        riskMap[city].totalRisk += s.risk_score;
        if (s.is_delayed) riskMap[city].delayed++;
      });
    });

    return riskMap;
  }, [shipments]);

  const radarData = LOGISTICS_HUBS.map((hub) => {
    const data = cityRisk[hub.city];
    const avgRisk = data
      ? Math.round(data.totalRisk / data.count)
      : Math.floor(Math.random() * 50) + 20;
    const shipCount = data?.count || 0;
    const cascadeRisk =
      shipments
        .filter(
          (s) => s.origin_city === hub.city || s.destination_city === hub.city,
        )
        .reduce((sum, s) => sum + s.cascade_risk_score, 0) / (shipCount || 1);

    return {
      hub: hub.city,
      "Avg Risk": avgRisk,
      "Cascade Risk": Math.round(cascadeRisk * 100),
      Shipments: shipCount,
    };
  });

  const runCascadePrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await IndianApiService.predictCascade({
        trigger_city: selectedCity,
        trigger_reason: reason,
        severity,
        max_depth: 5,
        affected_shipments: Math.max(
          shipments.filter(
            (s) =>
              s.origin_city === selectedCity ||
              s.destination_city === selectedCity,
          ).length,
          50,
        ),
      });
      setCascadeResult(result);
    } catch (err) {
      setError("Backend not running. Start FastAPI server on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (v) => {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    return `₹${(v / 1000).toFixed(0)}K`;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">
            Trigger City
          </label>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-black/5 dark:bg-white/[0.05] border border-black/10 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            {LOGISTICS_HUBS.map((h) => (
              <option key={h.city} value={h.city}>
                {h.city} ({h.state})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">
            Disruption Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="bg-black/5 dark:bg-white/[0.05] border border-black/10 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            {DISRUPTION_REASONS.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">
            Severity: {(severity * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={severity}
            onChange={(e) => setSeverity(parseFloat(e.target.value))}
            className="w-32 accent-cyan-500"
          />
        </div>

        <motion.button
          onClick={runCascadePrediction}
          whileTap={{ scale: 0.95 }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 text-xs font-bold transition-all disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Zap className="h-3 w-3" />
          )}
          Predict Cascade
        </motion.button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Radar Chart */}
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-2">
            Hub Risk Radar
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis
                dataKey="hub"
                tick={{ fill: "#64748b", fontSize: 9, fontWeight: 600 }}
              />

              <Radar
                name="Avg Risk"
                dataKey="Avg Risk"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.15}
                strokeWidth={1.5}
              />

              <Radar
                name="Cascade Risk"
                dataKey="Cascade Risk"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.1}
                strokeWidth={1.5}
              />

              <Tooltip
                contentStyle={{
                  background: "#0a1628",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "10px",
                }}
                labelStyle={{ color: "#f1f5f9", fontWeight: 700 }}
                itemStyle={{ color: "#94a3b8" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Cascade Results */}
        <div>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs mb-3">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {!cascadeResult && !error && (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <Zap className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs">
                Select a city and click "Predict Cascade"
              </p>
              <p className="text-[10px] mt-1 text-center">
                AI will simulate domino-effect disruptions
              </p>
            </div>
          )}

          {cascadeResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-[10px] text-red-400 font-bold mb-1">
                    Affected Nodes
                  </p>
                  <p className="text-xl font-bold text-red-400">
                    {cascadeResult.total_affected_nodes}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] text-amber-400 font-bold mb-1">
                    Affected Shipments
                  </p>
                  <p className="text-xl font-bold text-amber-400">
                    {cascadeResult.total_affected_shipments}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <p className="text-[10px] text-purple-400 font-bold mb-1 flex items-center gap-1">
                    <IndianRupee className="h-3 w-3" /> Financial Impact
                  </p>
                  <p className="text-base font-bold text-purple-400">
                    {formatINR(cascadeResult.total_financial_impact_inr)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-[10px] text-cyan-400 font-bold mb-1 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" /> Recovery Time
                  </p>
                  <p className="text-base font-bold text-cyan-400">
                    {cascadeResult.estimated_recovery_hours.toFixed(0)}h
                  </p>
                </div>
              </div>

              {/* Cascade Nodes */}
              <div>
                <p className="text-[10px] text-slate-500 font-bold mb-2">
                  Cascade Chain (Level → Impact)
                </p>
                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                  {cascadeResult.cascade_nodes?.slice(0, 8).map((node, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs p-1.5 rounded bg-black/5 dark:bg-white/[0.03]"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                            node.cascade_level === 0
                              ? "bg-red-500/20 text-red-400"
                              : node.cascade_level === 1
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-slate-500/20 text-slate-400"
                          }`}
                        >
                          L{node.cascade_level}
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {node.city}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="text-slate-500">
                          {(node.impact_probability * 100).toFixed(0)}%
                        </span>
                        <span className="text-amber-500">
                          {node.estimated_delay_hours.toFixed(0)}h
                        </span>
                        <span className="text-red-400">
                          {node.affected_shipments_count} ships
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recovery Plan */}
              {cascadeResult.recovery_plan &&
                cascadeResult.recovery_plan.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold mb-1">
                      🛡️ Recovery Plan
                    </p>
                    <div className="space-y-1 max-h-[80px] overflow-y-auto">
                      {cascadeResult.recovery_plan
                        .slice(0, 4)
                        .map((action, i) => (
                          <p
                            key={i}
                            className="text-[10px] text-slate-600 dark:text-slate-400 bg-emerald-500/5 border border-emerald-500/10 rounded px-2 py-1"
                          >
                            {action}
                          </p>
                        ))}
                    </div>
                  </div>
                )}

              {/* AI Enrichment */}
              {cascadeResult.llm_recovery && (
                <div className="bg-[#0f1d36]/70 border border-cyan-500/25 rounded-lg p-3 space-y-2.5 mt-2 shadow-inner">
                  <p className="text-[10.5px] font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🧠</span> AI Scenario Loss & Recovery Decision
                  </p>
                  <div className="bg-cyan-500/10 border border-cyan-500/25 rounded p-2 text-slate-200">
                    <p className="font-bold text-[10px] text-slate-300">
                      Proposed Strategy:{" "}
                      <strong className="text-white">
                        {cascadeResult.llm_recovery.decision}
                      </strong>
                    </p>
                    <p className="text-[9.5px] mt-1 text-slate-400 italic leading-relaxed whitespace-pre-line">
                      {cascadeResult.llm_recovery.explanation}
                    </p>
                  </div>
                  <div className="flex justify-between items-center text-[9px] bg-slate-900/60 p-2 rounded border border-white/5">
                    <span className="font-bold text-slate-400">
                      Impact Mitigation:{" "}
                      <strong className="text-emerald-400">
                        {cascadeResult.llm_recovery.estimated_impact}
                      </strong>
                    </span>
                    <span className="font-bold text-slate-400">
                      Confidence:{" "}
                      <strong className="text-purple-400">
                        {(cascadeResult.llm_recovery.confidence * 100).toFixed(
                          0,
                        )}
                        %
                      </strong>
                    </span>
                  </div>
                  {cascadeResult.llm_recovery.action_items && (
                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-500 font-bold uppercase">
                        Operational Steps:
                      </p>
                      {cascadeResult.llm_recovery.action_items
                        .slice(0, 3)
                        .map((item, i) => (
                          <p
                            key={i}
                            className="text-[9px] text-slate-400 bg-black/10 px-2 py-0.5 rounded border border-white/5 font-mono"
                          >
                            {item}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
