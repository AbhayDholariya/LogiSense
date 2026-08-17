// components/charts/IndianRiskChart.tsx
/**
 * Risk distribution chart for Indian supply chain
 */

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";

const RISK_COLORS = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

const STATE_COLORS = [
  "#22d3ee",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#f97316",
  "#06b6d4",
  "#a78bfa",
];

export function IndianRiskChart({ shipments }) {
  const [view, setView] = useState("pie");

  const pieData = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0, critical: 0 };
    shipments.forEach((s) => {
      if (s.risk_level in counts) counts[s.risk_level]++;
    });
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([level, count]) => ({
        name: level.charAt(0).toUpperCase() + level.slice(1),
        value: count,
        color: RISK_COLORS[level],
      }));
  }, [shipments]);

  const stateData = useMemo(() => {
    const stateCounts = {};
    shipments.forEach((s) => {
      const state = s.origin_state || "Unknown";
      if (!stateCounts[state]) stateCounts[state] = { count: 0, totalRisk: 0 };
      stateCounts[state].count++;
      stateCounts[state].totalRisk += s.risk_score;
    });
    return Object.entries(stateCounts)
      .map(([state, d]) => ({
        state: state.length > 12 ? state.substring(0, 10) + ".." : state,
        shipments: d.count,
        avgRisk: Math.round(d.totalRisk / d.count),
      }))
      .sort((a, b) => b.avgRisk - a.avgRisk)
      .slice(0, 7);
  }, [shipments]);

  if (shipments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-400">
        <p className="text-xs">No shipment data</p>
        <p className="text-[10px] mt-1">Start backend to load live data</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-[#0a1628] border border-white/10 rounded-lg p-2 text-xs shadow-lg">
          <p className="text-white font-bold">{payload[0].name}</p>
          <p className="text-slate-300">{payload[0].value} shipments</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* Toggle */}
      <div className="flex gap-1 mb-3">
        {["pie", "state"].map((v) => (
          <motion.button
            key={v}
            onClick={() => setView(v)}
            whileTap={{ scale: 0.95 }}
            className={`flex-1 py-1 px-2 rounded text-[10px] font-bold transition-all ${
              view === v
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "text-slate-500 hover:text-slate-300 bg-white/5"
            }`}
          >
            {v === "pie" ? "Risk Levels" : "By State"}
          </motion.button>
        ))}
      </div>

      {view === "pie" ? (
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => (
                <span
                  style={{
                    fontSize: "10px",
                    color: "#94a3b8",
                    fontWeight: 600,
                  }}
                >
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={stateData}
            margin={{ top: 0, right: 4, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="state"
              tick={{ fill: "#64748b", fontSize: 9, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fill: "#64748b", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
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

            <Bar dataKey="avgRisk" name="Avg Risk" radius={[3, 3, 0, 0]}>
              {stateData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={
                    entry.avgRisk > 60
                      ? "#ef4444"
                      : entry.avgRisk > 40
                        ? "#f59e0b"
                        : "#10b981"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Summary numbers */}
      <div className="grid grid-cols-4 gap-1.5 mt-2">
        {Object.entries(RISK_COLORS).map(([level, color]) => {
          const count = shipments.filter((s) => s.risk_level === level).length;
          return (
            <div
              key={level}
              className="text-center p-1.5 rounded-lg bg-black/5 dark:bg-white/[0.03]"
            >
              <div className="text-sm font-bold" style={{ color }}>
                {count}
              </div>
              <div className="text-[9px] text-slate-500 font-medium capitalize">
                {level}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
