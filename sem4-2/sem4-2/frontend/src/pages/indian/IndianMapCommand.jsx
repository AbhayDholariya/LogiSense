// pages/IndianMapCommand.tsx
/**
 * Indian Supply Chain Map Command Center
 * Full-screen Map with floating command control drawers, live alert feeds, and blinkers
 */

import { useEffect, useState, useMemo } from "react";
import { useIndianStore } from "../../store/useIndianStore";
import { IndianShipmentMap } from "../../components/indian/IndianShipmentMap";
import { IndianShipmentDetailDrawer } from "../../components/indian/IndianShipmentDetailDrawer";
import { Bell, Truck, Activity, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RiskBadge } from "../../components/ui/RiskBadge";

export function IndianMapCommand() {
  const {
    shipments,
    alerts,
    kpis,
    loading,
    fetchShipments,
    fetchAlerts,
    selectShipment,
    selectedShipment,
  } = useIndianStore();

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  useEffect(() => {
    fetchShipments();
    fetchAlerts();

    // Auto-refresh data every 20 seconds for live feeds
    const interval = setInterval(() => {
      fetchShipments();
      fetchAlerts();
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const sortedShipments = useMemo(() => {
    return [...shipments].sort((a, b) => b.risk_score - a.risk_score);
  }, [shipments]);

  const recentAlerts = useMemo(() => {
    return alerts.slice(0, 10);
  }, [alerts]);

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white overflow-hidden select-none transition-colors duration-200">
      {/* 1. Full Screen Map */}
      <div className="absolute inset-0 w-full h-full z-0">
        <IndianShipmentMap />
      </div>

      {/* 2. Floating Top Banner Statistics */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-[800px] pointer-events-none">
        <div className="glass bg-white/90 dark:bg-[#081325]/85 border border-slate-200/80 dark:border-white/10 rounded-xl px-5 py-3 shadow-2xl flex items-center justify-between gap-6 pointer-events-auto backdrop-blur-md transition-colors duration-200">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500/20 border border-orange-500/40">
              <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
            </span>
            <div>
              <h2 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                भारत Command tower
              </h2>
              <p className="text-[9px] text-slate-550 dark:text-slate-400">
                Live Supply Chain Operations Map Feed
              </p>
            </div>
          </div>

          <div className="flex gap-4 border-l border-black/10 dark:border-white/10 pl-6">
            <div className="text-center">
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Active Trucks
              </p>
              <p className="text-xs font-black text-cyan-400">
                {kpis.total_shipments}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Delayed
              </p>
              <p className="text-xs font-black text-amber-500">
                {kpis.delayed_count}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Critical
              </p>
              <p className="text-xs font-black text-red-500 animate-pulse">
                {kpis.critical_alerts}
              </p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Value In-Transit
              </p>
              <p className="text-xs font-black text-emerald-400">
                ₹{(kpis.total_value_inr / 10000000).toFixed(1)}Cr
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Collapsible Left Panel — Live Alert Feed */}
      <div
        className={`absolute top-4 bottom-4 left-4 z-[1000] flex transition-all duration-300 ${
          leftOpen ? "w-[320px]" : "w-0"
        }`}
      >
        <AnimatePresence>
          {leftOpen && (
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="flex-1 bg-white/95 dark:bg-[#081325]/85 border border-slate-200/80 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col backdrop-blur-md transition-colors"
            >
              {/* Drawer Header */}
              <div className="flex items-center gap-2 p-3 bg-red-500/5 border-b border-black/5 dark:border-white/5">
                <Bell className="h-4 w-4 text-red-400" />
                <div>
                  <h3 className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Live Disruption Alerts
                  </h3>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400">
                    RTO delays & monsoons
                  </p>
                </div>
              </div>

              {/* Alerts list */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {recentAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                    <Activity className="h-6 w-6 mb-1.5 opacity-30" />
                    <p className="text-[10px]">No active disruptions</p>
                  </div>
                ) : (
                  recentAlerts.map((alert) => {
                    const isCritical = alert.severity === "critical";
                    const isHigh = alert.severity === "high";
                    // Blinking style for map command alert card
                    const borderStyle = isCritical
                      ? "critical-blink"
                      : isHigh
                        ? "high-blink"
                        : "border-white/5";

                    const dotBg = isCritical
                      ? "bg-red-500"
                      : isHigh
                        ? "bg-orange-500"
                        : "bg-amber-400";

                    return (
                      <div
                        key={alert.id}
                        className={`p-2.5 rounded-lg border text-[10px] bg-slate-50 dark:bg-slate-950/40 relative overflow-hidden transition-all ${borderStyle}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-350">
                            {alert.shipment_id}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span
                               className={`h-1.5 w-1.5 rounded-full ${dotBg} ${isCritical || isHigh ? "animate-ping" : ""}`}
                            />
                            <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                              {alert.severity}
                            </span>
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          {alert.message}
                        </p>
                        {alert.risk_score !== undefined && (
                          <div className="mt-1 flex items-center justify-between text-[8px] text-slate-500">
                            <span>
                              Risk Score: {alert.risk_score.toFixed(0)}
                            </span>
                            <span>
                              {new Date(alert.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Button */}
        <button
          onClick={() => setLeftOpen(!leftOpen)}
          className="h-10 w-6 rounded-r-lg bg-white/90 dark:bg-[#081325]/85 border-y border-r border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white pointer-events-auto backdrop-blur-md self-center -ml-0.5 shadow-md transition-colors"
        >
          {leftOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* 4. Collapsible Right Panel — Active Fleet Focus */}
      <div
        className={`absolute top-4 bottom-4 right-4 z-[1000] flex transition-all duration-300 ${
          rightOpen ? "w-[320px]" : "w-0"
        }`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setRightOpen(!rightOpen)}
          className="h-10 w-6 rounded-l-lg bg-white/90 dark:bg-[#081325]/85 border-y border-l border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white pointer-events-auto backdrop-blur-md self-center -mr-0.5 shadow-md z-10 transition-colors"
        >
          {rightOpen ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        <AnimatePresence>
          {rightOpen && (
            <motion.div
              initial={{ x: 280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 280, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="flex-1 bg-white/95 dark:bg-[#081325]/85 border border-slate-200/80 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col backdrop-blur-md transition-colors"
            >
              {/* Drawer Header */}
              <div className="flex items-center gap-2 p-3 bg-cyan-500/5 border-b border-black/5 dark:border-white/5">
                <Truck className="h-4 w-4 text-cyan-400" />
                <div>
                  <h3 className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Active Fleet Tracker
                  </h3>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400">
                    Click truck to fly-focus on map
                  </p>
                </div>
              </div>

              {/* Truck List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {sortedShipments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                    <Truck className="h-6 w-6 mb-1.5 opacity-30 animate-pulse" />
                    <p className="text-[10px]">No active trucks tracked</p>
                  </div>
                ) : (
                  sortedShipments.map((s) => {
                    const isSelected = selectedShipment?.id === s.id;
                    const progress = Math.round((s.progress || 0.5) * 100);
                    return (
                      <div
                        key={s.id}
                        onClick={() => selectShipment(s)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-cyan-500/10 border-cyan-500/40 shadow-md ring-1 ring-cyan-400/20"
                            : "bg-slate-50 dark:bg-slate-950/30 border-slate-200/80 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                            {s.id}
                          </span>
                          <RiskBadge
                            level={s.risk_level}
                            score={s.risk_score}
                            size="sm"
                          />
                        </div>

                        <p className="text-[9.5px] text-slate-400 truncate">
                          {s.origin_city} ➔ {s.destination_city}
                        </p>

                        <div className="mt-1.5 flex items-center justify-between text-[8.5px]">
                          <span className="text-slate-500">
                            {s.carrier_company}
                          </span>
                          <span
                            className={
                              s.is_delayed ? "text-amber-500" : "text-slate-500"
                            }
                          >
                            {s.is_delayed ? "🚨 Delayed" : "✅ On Time"}
                          </span>
                        </div>

                        {/* Miniature Progress Bar */}
                        <div className="mt-1.5 w-full bg-white/5 h-1 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              s.risk_level === "critical"
                                ? "bg-red-500"
                                : s.risk_level === "high"
                                  ? "bg-orange-500"
                                  : s.risk_level === "medium"
                                    ? "bg-amber-400"
                                    : "bg-emerald-400"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 5. Shipment Details Drawer */}
      <AnimatePresence>
        {selectedShipment && (
          <IndianShipmentDetailDrawer
            shipment={selectedShipment}
            onClose={() => selectShipment(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
