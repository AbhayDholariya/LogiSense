import { useEffect, useState } from "react";
import {
  Package,
  Clock,
  Shield,
  Activity,
  Mail,
  User,
  ArrowRight,
  TrendingUp,
  Search,
  Filter,
  Leaf,
  Compass,
  MapPin,
  Calendar,
  AlertTriangle,
  Navigation,
  CheckCircle2,
} from "lucide-react";
import { TopBar } from "../../components/layout/TopBar";
import { KPICard } from "../../components/ui/KPICard";
import { GlassCard } from "../../components/ui/GlassCard";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { StatusChip } from "../../components/ui/StatusChip";
import { useAuthStore } from "../../store/useAuthStore";
import { useThemeStore } from "../../store/useThemeStore";
import { motion, AnimatePresence } from "framer-motion";

export function CustomerDashboard() {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const [customerShipments, setCustomerShipments] = useState([]);
  const [loadingShipments, setLoadingShipments] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  
  // Search and status filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedShipment, setSelectedShipment] = useState(null);

  // Retrieve support admin contact details
  const admin = user?.adminContact || {
    name: "Vishv Jani (Global Admin)",
    company: "LogiSense Global Ltd.",
    phone: "+91 94285 53109",
    email: "admin.global@logisense.com",
  };

  // Fetch real-time active shipments from Django backend
  useEffect(() => {
    let active = true;

    async function loadShipments() {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "";
        const response = await fetch(`${API_BASE}/api/india/shipments`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (active) {
          // Show every 3rd shipment to simulate this customer's cargo partition
          const matched = data.filter((_, idx) => idx % 3 === 0);
          setCustomerShipments(matched);
          setFetchError(null);
          
          // Select first shipment by default if none is selected
          setSelectedShipment((prev) => {
            if (prev) {
              // Keep selected shipment updated with fresh backend details
              const updated = matched.find((s) => s.id === prev.id);
              return updated || matched[0] || null;
            }
            return matched[0] || null;
          });
        }
      } catch (err) {
        console.error("Failed to fetch shipments from backend:", err);
        if (active) {
          setFetchError(err.message);
        }
      } finally {
        if (active) {
          setLoadingShipments(false);
        }
      }
    }

    loadShipments();
    const interval = setInterval(loadShipments, 10_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Compute stats
  const totalShipments = customerShipments.length;
  const delayedShipments = customerShipments.filter(
    (s) => s.status === "delayed" || s.status === "customs_hold"
  ).length;
  
  const avgRisk = totalShipments
    ? Math.round(
        (customerShipments.reduce((sum, s) => sum + s.risk_score, 0) /
          totalShipments) *
          10
      ) / 10
    : 0;

  const onTimePercentage = totalShipments
    ? Math.round(((totalShipments - delayedShipments) / totalShipments) * 100 * 10) / 10
    : 100;

  // Filtered shipments watchlist
  const filteredShipments = customerShipments.filter((s) => {
    const matchesSearch =
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.carrier_company && s.carrier_company.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "delayed" && (s.status === "delayed" || s.status === "customs_hold")) ||
      (statusFilter === "in_transit" && (s.status === "in_transit" || s.status === "loading")) ||
      s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#020817] text-slate-800 dark:text-white transition-colors duration-200">
      <TopBar
        title="Customer Visibility Tower"
        subtitle={`Welcome back, ${user?.displayName || user?.username || "Valued Customer"} | ${user?.companyName || "Enterprise Cargo"}`}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* designated account manager Hotline */}
        <GlassCard className="p-5 border border-indigo-500/10 dark:border-indigo-500/20 relative overflow-hidden bg-gradient-to-r from-indigo-50/80 via-white/80 to-indigo-50/80 dark:from-[#0c1033] dark:via-[#090b24] dark:to-[#030616] text-slate-800 dark:text-white shadow-lg dark:shadow-none">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5 uppercase tracking-wider">
                <Shield className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                Dedicated Account Manager Hotline
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Direct helpline for instant carrier coordination, customs optimization, and emergency dispatch adjustments.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="p-2.5 bg-white/60 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.05] rounded-xl flex items-center gap-3">
                <div className="h-9 w-9 bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <User className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                    {admin.name}
                  </h4>
                  <p className="text-[9px] text-indigo-600 dark:text-indigo-300 font-bold uppercase tracking-wider">
                    {admin.company}
                  </p>
                </div>
              </div>

              <div className="p-2.5 bg-white/60 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.05] rounded-xl flex flex-col justify-center min-w-[140px]">
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-0.5">
                  Helpline Mobile
                </p>
                <p className="text-xs font-mono font-bold text-slate-850 dark:text-white tracking-wide">
                  {admin.phone}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* KPI metrics row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Cargo Tracked"
            value={totalShipments.toString()}
            subtitle="Active consignments"
            icon={Package}
            color="purple"
            index={0}
          />

          <KPICard
            title="On-Time Delivery Rate"
            value={`${onTimePercentage}%`}
            subtitle="Overall fleet performance"
            icon={TrendingUp}
            color="emerald"
            index={1}
          />

          <KPICard
            title="Average Risk Index"
            value={avgRisk}
            subtitle="Overall transit lane risk"
            icon={Shield}
            color="amber"
            index={2}
          />

          <KPICard
            title="Disrupted Cargo"
            value={delayedShipments.toString()}
            subtitle="Require active routing"
            icon={Clock}
            color="red"
            index={3}
          />
        </div>

        {/* Dashboard Main Grid splits: Watchlist on Left (8 cols), Map/Details on Right (4 cols) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Pane: Shipment Watchlist */}
          <GlassCard className="xl:col-span-8 p-5 border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 shadow-lg dark:shadow-none">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-white/[0.06]">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Active Shipment Watchlist
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  Select a consignment row below to view its live map and milestones track
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                  Live Streaming
                </span>
              </div>
            </div>

            {/* Watchlist Controls (Search & Filter Tabs) */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by ID, city or carrier..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-505 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200 dark:border-white/[0.06]">
                {[
                  { id: "all", label: "All" },
                  { id: "in_transit", label: "In Transit" },
                  { id: "delayed", label: "Delayed" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                      statusFilter === tab.id
                        ? "bg-white dark:bg-white/10 text-indigo-600 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Watchlist Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400">
                    <th className="pb-2.5 font-bold uppercase tracking-wider">Shipment ID</th>
                    <th className="pb-2.5 font-bold uppercase tracking-wider">Route Lane</th>
                    <th className="pb-2.5 font-bold uppercase tracking-wider">Carrier</th>
                    <th className="pb-2.5 font-bold uppercase tracking-wider">Progress</th>
                    <th className="pb-2.5 font-bold uppercase tracking-wider text-center">Status</th>
                    <th className="pb-2.5 font-bold uppercase tracking-wider text-right">Risk Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-white/[0.04]">
                  {loadingShipments && customerShipments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500 dark:text-slate-400 font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          Retrieving real-time logistics data...
                        </div>
                      </td>
                    </tr>
                  ) : fetchError && customerShipments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-red-500 dark:text-red-400 font-medium">
                        ⚠️ Logistics API connection failure: {fetchError}
                      </td>
                    </tr>
                  ) : filteredShipments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500 dark:text-slate-400 font-medium">
                        No active shipments match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredShipments.map((s, idx) => (
                      <motion.tr
                        key={s.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                        onClick={() => setSelectedShipment(s)}
                        className={`hover:bg-slate-100/60 dark:hover:bg-white/[0.02] transition-colors cursor-pointer ${
                          selectedShipment?.id === s.id
                            ? "bg-slate-150/70 dark:bg-white/[0.04] font-semibold"
                            : ""
                        }`}
                      >
                        <td className="py-3 font-mono font-bold text-slate-700 dark:text-slate-350">
                          {s.id}
                        </td>
                        <td className="py-3 text-slate-800 dark:text-white">
                          {s.origin_city} <ArrowRight className="inline-block h-3 w-3 mx-1 text-slate-400" /> {s.destination_city}
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">
                          {s.carrier_company || "Direct Cargo"}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2 w-32">
                            <span className="text-[9px] font-mono text-slate-500 w-8 font-bold">
                              {Math.round(s.progress * 100)}%
                            </span>
                            <div className="flex-1 h-1 bg-slate-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${s.progress * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <StatusChip status={s.status} size="sm" />
                        </td>
                        <td className="py-3 text-right">
                          <RiskBadge level={s.risk_level} score={s.risk_score} size="sm" />
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Right Pane: Map Details */}
          <div className="xl:col-span-4">
            
            {/* project44 Live tracking Tower */}
            <AnimatePresence mode="wait">
              {selectedShipment ? (
                <motion.div
                  key={selectedShipment.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <GlassCard className="p-5 border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-slate-200 dark:border-white/[0.06]">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Live Tracker
                        </h4>
                        <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono flex items-center gap-1.5">
                          <Navigation className="h-3.5 w-3.5 rotate-45 text-indigo-500" />
                          {selectedShipment.id}
                        </h3>
                      </div>
                      <StatusChip status={selectedShipment.status} size="sm" />
                    </div>

                    {/* interactive vector Path Map */}
                    <div className="h-44 bg-slate-100 dark:bg-slate-950/40 border border-slate-200/80 dark:border-white/5 rounded-xl relative overflow-hidden flex items-center justify-center p-3 mb-4">
                      {/* Grid overlay */}
                      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{
                        backgroundImage: "radial-gradient(circle, #4f46e5 1px, transparent 1px)",
                        backgroundSize: "16px 16px"
                      }} />

                      {/* Map Graphics */}
                      <svg className="w-full h-full relative z-10" viewBox="0 0 300 120">
                        {/* Route dotted line */}
                        <line 
                          x1="40" y1="65" x2="260" y2="65" 
                          stroke={theme === "dark" ? "#1e293b" : "#cbd5e1"} 
                          strokeWidth="2.5" 
                          strokeDasharray="4 4" 
                        />
                        {/* Progress covered line */}
                        <line 
                          x1="40" y1="65" 
                          x2={40 + selectedShipment.progress * 220} y2="65" 
                          stroke="#6366f1" 
                          strokeWidth="3.5" 
                        />

                        {/* Origin Terminal Node */}
                        <circle cx="40" cy="65" r="7" fill="#f97316" className="cursor-pointer" />
                        <circle cx="40" cy="65" r="12" fill="#f97316" className="animate-ping opacity-25 pointer-events-none" />
                        <text x="40" y="45" textAnchor="middle" className="text-[9px] font-bold fill-slate-700 dark:fill-slate-350">
                          {selectedShipment.origin_city}
                        </text>

                        {/* Destination Terminal Node */}
                        <circle cx="260" cy="65" r="7" fill="#10b981" className="cursor-pointer" />
                        <text x="260" y="45" textAnchor="middle" className="text-[9px] font-bold fill-slate-700 dark:fill-slate-350">
                          {selectedShipment.destination_city}
                        </text>

                        {/* Active Cargo Icon Indicator */}
                        <g transform={`translate(${40 + selectedShipment.progress * 220}, 65)`}>
                          <circle cx="0" cy="0" r="10" fill="#6366f1" className="animate-ping opacity-35" />
                          <circle cx="0" cy="0" r="6.5" fill="#4f46e5" />
                          {/* Mini Arrow Head */}
                          <polygon points="-3,-3 5,0 -3,3" fill="#ffffff" transform="scale(0.85)" />
                        </g>

                        {/* Middle Congestion node representing PM Gati Shakti Optimizer or checkposts */}
                        {selectedShipment.num_state_border_crossings > 0 && (
                          <g transform="translate(150, 65)">
                            <circle cx="0" cy="0" r="4.5" fill={selectedShipment.status === "customs_hold" ? "#ef4444" : "#94a3b8"} />
                            <text x="0" y="18" textAnchor="middle" className="text-[7.5px] font-bold fill-slate-400 uppercase tracking-widest">Border</text>
                          </g>
                        )}
                      </svg>

                      {/* Map HUD Overlay */}
                      <div className="absolute bottom-2.5 left-3 right-3 flex justify-between text-[9px] text-slate-500 font-mono font-bold">
                        <span className="flex items-center gap-1">
                          <Compass className="h-3 w-3 text-indigo-400 animate-spin-slow" />
                          {selectedShipment.distance_remaining_km?.toFixed(0) || "0"} KM REMAINING
                        </span>
                        <span>SPEED: {selectedShipment.speed_kmh || "50"} KM/H</span>
                      </div>
                    </div>

                    {/* project44-inspired Milestones */}
                    <div className="space-y-3.5 mb-5">
                      <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Transit Milestones Log
                      </h4>
                      <div className="relative pl-6 space-y-4">
                        {/* Timeline bar */}
                        <div className="absolute left-2.5 top-1.5 bottom-1.5 w-0.5 bg-slate-200 dark:bg-white/[0.06]" />

                        {/* Milestone 1: Dispatch */}
                        <div className="relative flex items-start gap-3">
                          <span className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#020817] bg-indigo-500 flex items-center justify-center">
                            <CheckCircle2 className="h-2 w-2 text-white" />
                          </span>
                          <div>
                            <h5 className="text-[11px] font-bold text-slate-800 dark:text-white">Order Booked & Dispatched</h5>
                            <p className="text-[9px] text-slate-500">Gate Out: {selectedShipment.origin_city} hub</p>
                          </div>
                        </div>

                        {/* Milestone 2: Transit Leg */}
                        <div className="relative flex items-start gap-3">
                          <span className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#020817] flex items-center justify-center ${
                            selectedShipment.progress > 0.05 ? "bg-indigo-500" : "bg-slate-250 dark:bg-slate-850"
                          }`}>
                            {selectedShipment.progress > 0.05 && <CheckCircle2 className="h-2 w-2 text-white" />}
                          </span>
                          <div>
                            <h5 className="text-[11px] font-bold text-slate-800 dark:text-white">In Transit</h5>
                            <p className="text-[9px] text-slate-500">Mode: {selectedShipment.transport_mode?.toUpperCase() || "ROAD"} | Carrier: {selectedShipment.carrier_company || "Direct"}</p>
                          </div>
                        </div>

                        {/* Milestone 3: Border Checkpost */}
                        <div className="relative flex items-start gap-3">
                          <span className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#020817] flex items-center justify-center ${
                            selectedShipment.status === "customs_hold"
                              ? "bg-red-500 animate-pulse"
                              : selectedShipment.progress > 0.5
                                ? "bg-indigo-500"
                                : "bg-slate-250 dark:bg-slate-850"
                          }`}>
                            {selectedShipment.progress > 0.5 && selectedShipment.status !== "customs_hold" && <CheckCircle2 className="h-2 w-2 text-white" />}
                          </span>
                          <div>
                            <h5 className="text-[11px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                              Border / Customs Clearance
                              {selectedShipment.status === "customs_hold" && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] bg-red-500/10 text-red-500 border border-red-500/20 font-bold uppercase animate-pulse">
                                  Customs Hold
                                </span>
                              )}
                            </h5>
                            <p className="text-[9px] text-slate-500">
                              {selectedShipment.status === "customs_hold" ? "Awaiting document verification at state border checkpoint" : "Eway Bill verified successfully"}
                            </p>
                          </div>
                        </div>

                        {/* Milestone 4: Arrival */}
                        <div className="relative flex items-start gap-3">
                          <span className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#020817] flex items-center justify-center ${
                            selectedShipment.status === "delivered" || selectedShipment.progress >= 0.99
                              ? "bg-emerald-500"
                              : "bg-slate-250 dark:bg-slate-855"
                          }`}>
                            {(selectedShipment.status === "delivered" || selectedShipment.progress >= 0.99) && <CheckCircle2 className="h-2 w-2 text-white" />}
                          </span>
                          <div>
                            <h5 className="text-[11px] font-bold text-slate-800 dark:text-white">Delivered</h5>
                            <p className="text-[9px] text-slate-500">Destination: {selectedShipment.destination_city} Warehouse</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI lane risk / action section — ONLY shown if shipment is delayed */}
                    {selectedShipment.status === "delayed" && (
                      <div className="p-3.5 bg-red-500/5 dark:bg-red-500/[0.02] rounded-xl border border-red-500/10 dark:border-red-500/20 space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            AI Disruption Warning
                          </span>
                          <RiskBadge level={selectedShipment.risk_level} score={selectedShipment.risk_score} size="xs" />
                        </div>
                        
                        <p className="text-[11px] text-red-600 dark:text-red-400 font-bold leading-normal">
                          Delay Reason: {selectedShipment.disruption_type && selectedShipment.disruption_type !== "none" 
                            ? selectedShipment.disruption_type.toUpperCase().replace('_', ' ') 
                            : "UNSPECIFIED ROUTE CONGESTION"}
                        </p>
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              ) : (
                <GlassCard className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium border border-slate-200/80 dark:border-white/5 flex flex-col items-center justify-center h-full min-h-[300px]">
                  <Activity className="h-10 w-10 text-indigo-400 animate-pulse mb-3" />
                  <p className="text-xs font-bold text-slate-700 dark:text-white uppercase mb-1">Live Tracking Tower</p>
                  <p className="text-[11px] max-w-xs text-slate-500 leading-normal">
                    Select any shipment from the watchlist to display its route mapping, milestone timeline, and AI lane risk factors.
                  </p>
                </GlassCard>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
