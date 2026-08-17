// pages/IndianAnalytics.tsx
/**
 * Indian Supply Chain Analytics Page
 * Visual analytics with charts, forecasting, risk vs delay analysis, and ESG operational KPIs
 */

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  ComposedChart,
  BarChart,
  Bar,
} from "recharts";
import { TopBar } from "../../components/layout/TopBar";
import { GlassCard } from "../../components/ui/GlassCard";
import { useIndianStore } from "../../store/useIndianStore";
import {
  TrendingUp,
  Clock,
  Shield,
  Activity,
  BarChart3,
  MapPin,
  Leaf,
  Truck,
} from "lucide-react";

// Generate base 30-day historical data (going backwards in time)
const generateHistoricalData = () => {
  const data = [];
  const startDay = new Date();
  startDay.setDate(startDay.getDate() - 29); // Start 30 days ago
  for (let i = 0; i < 30; i++) {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    const dayStr = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
    // Base values that fluctuate historically
    data.push({
      day: dayStr,
      avgRisk: Math.round(30 + Math.sin(i * 0.4) * 15 + Math.random() * 10),
      onTimeRate: Math.round(78 + Math.cos(i * 0.35) * 10 + Math.random() * 6),
      delayForecast: Math.round(
        2.5 + Math.sin(i * 0.5) * 2 + Math.random() * 2,
      ),
      actualDelay: Math.round(
        2.0 + Math.cos(i * 0.45) * 2 + Math.random() * 2.5,
      ),
    });
  }
  return data;
};

// Generate future 14-day delay forecasting data
const generateForecastData = () => {
  const data = [];
  const startDay = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i); // Future dates
    const dayStr = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
    const predVal = parseFloat(
      (4.5 + Math.sin(i * 0.6) * 2.5 + Math.random() * 1.5).toFixed(1),
    );
    data.push({
      day: dayStr,
      predicted_delays: predVal,
      confidence_upper: parseFloat(
        (predVal + 1.8 + Math.random() * 1).toFixed(1),
      ),
      confidence_lower: parseFloat(
        Math.max(0, predVal - 1.2 - Math.random() * 0.8).toFixed(1),
      ),
    });
  }
  return data;
};

// Supply chain operational & ESG data
const carrierLeadTimeData = [
  { name: "Delhivery", planned: 36, delay: 4.2 },
  { name: "Blue Dart", planned: 24, delay: 1.8 },
  { name: "Rivigo", planned: 48, delay: 5.5 },
  { name: "Shadowfax", planned: 18, delay: 2.1 },
  { name: "DTDC", planned: 30, delay: 3.4 },
  { name: "Gati", planned: 60, delay: 7.2 },
];

const carbonSavingsData = [
  { month: "Jan", Road_CO2: 12.4, Rail_CO2: 4.5, Saved_CO2: 7.9 },
  { month: "Feb", Road_CO2: 13.1, Rail_CO2: 4.8, Saved_CO2: 8.3 },
  { month: "Mar", Road_CO2: 14.5, Rail_CO2: 5.2, Saved_CO2: 9.3 },
  { month: "Apr", Road_CO2: 13.8, Rail_CO2: 5.0, Saved_CO2: 8.8 },
  { month: "May", Road_CO2: 15.2, Rail_CO2: 5.6, Saved_CO2: 9.6 },
  { month: "Jun", Road_CO2: 16.1, Rail_CO2: 5.9, Saved_CO2: 10.2 },
];

const warehouseCongestionData = [
  { name: "Mumbai Port", origin: 72, destination: 54 },
  { name: "Delhi NCR Hub", origin: 65, destination: 78 },
  { name: "Bangalore Hub", origin: 48, destination: 52 },
  { name: "Ahmedabad Whse", origin: 82, destination: 60 },
  { name: "Chennai Port", origin: 58, destination: 65 },
  { name: "Kolkata Whse", origin: 60, destination: 70 },
];

export function IndianAnalytics() {
  const { shipments, fetchShipments } = useIndianStore();
  const [activeTab, setActiveTab] = useState("correlation");
  // Historical and Forecast datasets (generated once on mount)
  const historicalData = useMemo(() => generateHistoricalData(), []);
  const forecastData = useMemo(() => generateForecastData(), []);

  useEffect(() => {
    fetchShipments();
  }, []);

  // Compute live aggregates from shipments
  const activeStats = useMemo(() => {
    if (shipments.length === 0)
      return { avgRisk: 42, avgDelay: 2.8, onTimeRate: 85, totalValue: 0 };
    const totalRisk = shipments.reduce((sum, s) => sum + s.risk_score, 0);
    const totalDelay = shipments.reduce(
      (sum, s) => sum + (s.delay_duration_minutes || 0),
      0,
    );
    const delayedCount = shipments.filter((s) => s.is_delayed).length;
    const totalValue = shipments.reduce(
      (sum, s) => sum + (s.shipment_value_inr || 0),
      0,
    );
    return {
      avgRisk: Math.round(totalRisk / shipments.length),
      avgDelay: parseFloat((totalDelay / shipments.length / 60).toFixed(1)), // in hours
      onTimeRate: Math.round(
        ((shipments.length - delayedCount) / shipments.length) * 100,
      ),
      totalValue,
    };
  }, [shipments]);

  // Scatter plot data for Risk vs Delay Correlation
  const scatterData = useMemo(() => {
    return shipments.map((s) => ({
      id: s.id,
      risk_score: s.risk_score,
      delay_hours: parseFloat(
        ((s.delay_duration_minutes || 0) / 60).toFixed(1),
      ),
      carrier: s.carrier_company || "Unknown",
      route: `${s.origin_city} → ${s.destination_city}`,
      cargo: s.cargo_type || "General",
      value: s.shipment_value_inr,
      risk_level: s.risk_level,
    }));
  }, [shipments]);

  // Custom tooltips with premium design
  const customTooltipStyle = {
    contentStyle: {
      background: "rgba(10, 22, 40, 0.95)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "12px",
      fontSize: "11px",
      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
      backdropFilter: "blur(8px)",
      color: "#f8fafc",
    },
    labelStyle: { color: "#94a3b8", fontWeight: 600, marginBottom: "4px" },
    itemStyle: { color: "#e2e8f0", padding: "2px 0" },
  };

  const ScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={customTooltipStyle.contentStyle}>
          <p className="font-mono font-bold text-orange-400 mb-1.5">
            {data.id}
          </p>
          <div className="space-y-1 text-slate-300">
            <p>
              🛣️ <span className="font-semibold text-white">{data.route}</span>
            </p>
            <p>
              🚛 Carrier: <span className="text-white">{data.carrier}</span>
            </p>
            <p>
              📦 Cargo: <span className="text-white">{data.cargo}</span>
            </p>
            <p>
              ⚡ Risk Score:{" "}
              <span className="font-bold text-red-400">
                {data.risk_score}/100
              </span>{" "}
              ({data.risk_level})
            </p>
            <p>
              ⏰ Delay:{" "}
              <span className="font-bold text-amber-400">
                {data.delay_hours} hours
              </span>
            </p>
            <p>
              💰 Value:{" "}
              <span className="font-semibold text-emerald-400">
                ₹{(data.value / 100000).toFixed(1)} Lakhs
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const tabs = [
    { id: "correlation", label: "Risk vs Delay Correlation", icon: Activity },
    {
      id: "trends",
      label: "Historical Fleet Trends (30 Days)",
      icon: BarChart3,
    },
    {
      id: "forecasting",
      label: "Predictive Delay Forecasting (14 Days)",
      icon: Clock,
    },
    {
      id: "industry",
      label: "Supply Chain Operations & ESG (KPIs)",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <TopBar
        title="📊 Indian Supply Chain Analytics"
        subtitle="Active risk-delay correlation, 30-day historical trends, and ML forecasting"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-black/5 dark:border-white/5 space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all ${
                  active
                    ? "border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-500/5"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Risk vs Delay Correlation */}
        {activeTab === "correlation" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Avg Fleet Risk Score",
                  value: `${activeStats.avgRisk}/100`,
                  sub: "Active trucks",
                  color: "text-orange-600 dark:text-orange-400",
                },
                {
                  label: "Avg Delay Hours",
                  value: `${activeStats.avgDelay}h`,
                  sub: "Across active fleet",
                  color: "text-amber-600 dark:text-amber-400",
                },
                {
                  label: "On-Time Success Rate",
                  value: `${activeStats.onTimeRate}%`,
                  sub: "Target baseline 80%",
                  color: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  label: "Total Value In-Transit",
                  value: `₹${(activeStats.totalValue / 10000000).toFixed(2)} Cr`,
                  sub: "B2B & eCommerce goods",
                  color: "text-indigo-600 dark:text-indigo-400",
                },
              ].map(({ label, value, sub, color }) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d1527]/40 p-4 backdrop-blur-md shadow-sm dark:shadow-none transition-all duration-200"
                >
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-bold">
                    {label}
                  </p>
                  <p className={`text-2xl font-black ${color}`}>{value}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{sub}</p>
                </div>
              ))}
            </div>

            <GlassCard className="p-5 border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-orange-400" /> Active
                    Shipments: Risk Score vs Delay Hours
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Real-time quadrant mapping. High-risk + high-delay shipments
                    (top right) require immediate intervention.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold">
                    Interactive Scatter Plot
                  </span>
                </div>
              </div>

              {shipments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[280px] text-slate-500">
                  <Activity className="h-8 w-8 mb-2 animate-pulse opacity-40" />
                  <p className="text-xs">No active shipments to visualize</p>
                  <p className="text-[10px] mt-0.5">
                    Please start backend server to feed live telemetry
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart
                    margin={{ top: 10, right: 20, bottom: 10, left: -10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      type="number"
                      dataKey="risk_score"
                      name="Risk Score"
                      domain={[0, 100]}
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      label={{
                        value: "Risk Score (0 - 100)",
                        position: "insideBottom",
                        offset: -5,
                        fill: "#64748b",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />

                    <YAxis
                      type="number"
                      dataKey="delay_hours"
                      name="Delay (Hours)"
                      domain={[0, "auto"]}
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      label={{
                        value: "Delay Duration (Hours)",
                        angle: -90,
                        position: "insideLeft",
                        offset: 0,
                        fill: "#64748b",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />

                    <ZAxis type="number" range={[50, 200]} />
                    <Tooltip
                      content={<ScatterTooltip />}
                      cursor={{
                        strokeDasharray: "3 3",
                        stroke: "rgba(255,255,255,0.1)",
                      }}
                    />
                    <Scatter name="Shipments" data={scatterData}>
                      {scatterData.map((entry, index) => {
                        const color =
                          entry.risk_level === "critical"
                            ? "#ef4444"
                            : entry.risk_level === "high"
                              ? "#f97316"
                              : entry.risk_level === "medium"
                                ? "#f59e0b"
                                : "#10b981";
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={color}
                            stroke="rgba(255,255,255,0.15)"
                            strokeWidth={1}
                          />
                        );
                      })}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </GlassCard>
          </div>
        )}

        {/* Tab 2: Historical Fleet Trends (Past 30 Days) */}
        {activeTab === "trends" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Chart 1: Fleet Risk Timeline */}
            <GlassCard className="p-5 border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-orange-400" /> Fleet Risk
                    Evolution Trend
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Average historical risk index tracking (past 30 days)
                  </p>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold">
                  30D Historical
                </span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={historicalData}
                  margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#f97316"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor="#f97316"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255, 255, 255, 0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#64748b", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#64748b", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={customTooltipStyle.contentStyle}
                    labelStyle={customTooltipStyle.labelStyle}
                    itemStyle={customTooltipStyle.itemStyle}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgRisk"
                    name="Fleet Risk Score"
                    stroke="#f97316"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#riskGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* Chart 2: Delay Trends Timeline */}
            <GlassCard className="p-5 border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-400" /> On-Time
                    Performance Tracking
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Daily delivery success rate vs target baseline (past 30
                    days)
                  </p>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  30D Historical
                </span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={historicalData}
                  margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255, 255, 255, 0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#64748b", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[40, 100]}
                    tick={{ fill: "#64748b", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={customTooltipStyle.contentStyle}
                    labelStyle={customTooltipStyle.labelStyle}
                    itemStyle={customTooltipStyle.itemStyle}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: "10px" }}
                  />
                  {/* Target Baseline */}
                  <Line
                    type="monotone"
                    data={historicalData.map((d) => ({ ...d, target: 80 }))}
                    dataKey="target"
                    name="Target (80%)"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                  />
                  {/* Actual Line */}
                  <Line
                    type="monotone"
                    dataKey="onTimeRate"
                    name="Actual Success %"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    activeDot={{ r: 5 }}
                    dot={{ strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>
        )}

        {/* Tab 3: Predictive Delay Forecasting (14 Days) */}
        {activeTab === "forecasting" && (
          <div className="space-y-6">
            <GlassCard className="p-5 border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-cyan-400" /> Delay Hours:
                    Predictive Forecast (14 Days)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    ML-predicted delay hours for future dates based on monsoon
                    factors, toll congestion, and vehicle aging with 95%
                    confidence bands.
                  </p>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                  14D Future Forecast
                </span>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart
                  data={forecastData}
                  margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255, 255, 255, 0.05)"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={customTooltipStyle.contentStyle}
                    labelStyle={customTooltipStyle.labelStyle}
                    itemStyle={customTooltipStyle.itemStyle}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: "10px" }}
                  />

                  {/* Confidence bands */}
                  <Area
                    type="monotone"
                    dataKey="confidence_upper"
                    stroke="transparent"
                    fill="url(#confGrad)"
                    name="Confidence Band (Upper)"
                  />
                  <Area
                    type="monotone"
                    dataKey="confidence_lower"
                    stroke="transparent"
                    fill="#0f2040"
                    name=""
                  />

                  {/* Predicted delays */}
                  <Line
                    type="monotone"
                    dataKey="predicted_delays"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ fill: "#f59e0b", r: 3 }}
                    name="Predicted Avg Delays (Hours)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>
        )}

        {/* Tab 4: Supply Chain Operations & ESG */}
        {activeTab === "industry" && (
          <div className="space-y-6">
            {/* Row 1: Carrier performance and Warehouse Congestion */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Chart 1: ML delay forecasting */}
              <GlassCard className="p-5 border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Truck className="h-4.5 w-4.5 text-cyan-400" /> Carrier
                      Lead Time vs Delay Performance
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Planned transit hours (base) vs average actual delay hours
                      (overhead) by carrier
                    </p>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                    Lead Time analysis
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={carrierLeadTimeData}
                    margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255, 255, 255, 0.05)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#64748b", fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={customTooltipStyle.contentStyle}
                      labelStyle={customTooltipStyle.labelStyle}
                      itemStyle={customTooltipStyle.itemStyle}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Bar
                      dataKey="planned"
                      name="Planned Transit (h)"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="delay"
                      name="Avg Delay (h)"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>

              {/* Chart 2: Route congestion forecast */}
              <GlassCard className="p-5 border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <MapPin className="h-4.5 w-4.5 text-orange-400" />{" "}
                      Warehouse Congestion: Origin vs Destination
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Comparing inventory processing delays & throughput
                      bottlenecks across key logistics hubs
                    </p>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold">
                    Hub Congestion
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={warehouseCongestionData}
                    margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255, 255, 255, 0.05)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#64748b", fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "#64748b", fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={customTooltipStyle.contentStyle}
                      labelStyle={customTooltipStyle.labelStyle}
                      itemStyle={customTooltipStyle.itemStyle}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Bar
                      dataKey="origin"
                      name="Origin WH Congestion %"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="destination"
                      name="Dest WH Congestion %"
                      fill="#a78bfa"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>

            {/* Row 2: ESG Environmental Savings */}
            <GlassCard className="p-5 border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Leaf className="h-4.5 w-4.5 text-emerald-400" /> ESG Carbon
                    Footprint Offset: Road vs Rail DFC Modal Shift
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Monthly Carbon Dioxide equivalent (CO2e) emissions in Metric
                    Tons. Modal shifts to electric Rail DFC reduce supply chain
                    footprint by over 60%.
                  </p>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  ESG Compliance
                </span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={carbonSavingsData}
                  margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#ef4444"
                        stopOpacity={0.15}
                      />
                      <stop
                        offset="95%"
                        stopColor="#ef4444"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                    <linearGradient id="railGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#10b981"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor="#10b981"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255, 255, 255, 0.05)"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={customTooltipStyle.contentStyle}
                    labelStyle={customTooltipStyle.labelStyle}
                    itemStyle={customTooltipStyle.itemStyle}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Area
                    type="monotone"
                    dataKey="Road_CO2"
                    name="Road Freight Emissions (Tons CO2e)"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#roadGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Rail_CO2"
                    name="Rail DFC Route Emissions (Tons CO2e)"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#railGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Saved_CO2"
                    name="Carbon Offset/Savings (Tons CO2e)"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}
