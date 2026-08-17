// components/indian/BorderCheckpostOptimizer.tsx
import { useState, useMemo } from "react";
import { useIndianStore } from "../../store/useIndianStore";
import { GlassCard } from "../ui/GlassCard";
import { motion, AnimatePresence } from "framer-motion";
import {
  Train,
  Truck,
  ShieldCheck,
  IndianRupee,
  MapPin,
  Clock,
  Zap,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

export function BorderCheckpostOptimizer() {
  const { shipments, selectedShipment, selectShipment, updateShipmentLocally } =
    useIndianStore();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filter shipments to show those on road
  const eligibleShipments = useMemo(() => {
    return shipments.filter((s) => !s.cargo_type.includes("Rail DFC"));
  }, [shipments]);

  const activeShipment =
    selectedShipment ||
    (eligibleShipments.length > 0 ? eligibleShipments[0] : null);

  const handleRailSwitch = () => {
    if (!activeShipment) return;
    setLoading(true);
    // Simulate optimization analysis
    setTimeout(() => {
      updateShipmentLocally(activeShipment.id, {
        risk_score: Math.max(10, Math.round(activeShipment.risk_score * 0.4)),
        risk_level: "low",
        is_delayed: false,
        delay_duration_minutes: 0,
        num_state_border_crossings: 0,
        num_toll_plazas: 0,
        cargo_type: `${activeShipment.cargo_type} (Rail DFC)`,
        top_risk_factors: [
          "PM Gati Shakti multi-modal rail corridor bypass active",
        ],
        checkpoint_delay_minutes: 0,
      });
      setLoading(false);
      setSuccessMsg(
        `Shipment ${activeShipment.id} successfully routed to Dedicated Freight Corridor (DFC Rail)!`,
      );
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMsg(null), 5000);
    }, 1200);
  };

  if (shipments.length === 0) {
    return (
      <GlassCard className="p-6 border-slate-800 text-center">
        <Train className="h-10 w-10 text-slate-500 mx-auto mb-2 animate-pulse" />
        <h4 className="text-sm font-bold text-slate-300">
          PM Gati Shakti Optimizer
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          Start backend server to load active shipments for optimization.
        </p>
      </GlassCard>
    );
  }

  const borderDelay =
    activeShipment?.checkpoint_delay_minutes ||
    (activeShipment?.is_delayed ? 90 : 30);
  const tollCost = (activeShipment?.num_toll_plazas || 4) * 1250;
  const isRailOptimized = activeShipment?.cargo_type.includes("Rail DFC");

  return (
    <GlassCard className="p-5 border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between flex-wrap gap-2 mb-4 border-b border-black/5 dark:border-white/5 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Train className="h-4.5 w-4.5 text-orange-400" />
            PM Gati Shakti: Multi-Modal Rail Bypass & Checkpoint Optimizer
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            AI-driven road-to-rail modal shifts to bypass RTO state borders and
            reduce delay exposure.
          </p>
        </div>

        {/* Dropdown Selector */}
        <select
          value={activeShipment?.id || ""}
          onChange={(e) => {
            const found = shipments.find((s) => s.id === e.target.value);
            if (found) selectShipment(found);
          }}
          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1.5 text-slate-850 dark:text-slate-300 focus:outline-none focus:border-orange-500"
        >
          {shipments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id} ({s.origin_city} ➔ {s.destination_city}){" "}
              {s.cargo_type.includes("Rail DFC") ? "• Rail" : ""}
            </option>
          ))}
        </select>
      </div>

      <AnimatePresence mode="wait">
        {activeShipment && (
          <motion.div
            key={activeShipment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Active shipment quick info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-black/20 p-2.5 rounded-lg border border-slate-200/80 dark:border-white/5">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-550" />
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">
                    Corridor
                  </p>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-bold truncate">
                    NH-{activeShipment.num_toll_plazas * 11} Corridor
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-slate-555" />
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">
                    Planned Hours
                  </p>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                    {activeShipment.planned_transit_hours}h Transit
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">
                    Cargo Value
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    ₹
                    {(
                      (activeShipment.shipment_value_inr || 500000) / 100000
                    ).toFixed(1)}{" "}
                    Lakhs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-orange-500" />
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">
                    Status
                  </p>
                  <p className="text-xs text-slate-850 dark:text-slate-200 font-bold truncate">
                    {activeShipment.cargo_type}
                  </p>
                </div>
              </div>
            </div>

            {/* Notification message */}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg flex items-center gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                {successMsg}
              </motion.div>
            )}

            {/* Optimization Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Road Logistics Column */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  isRailOptimized
                    ? "bg-slate-100/50 dark:bg-slate-950/20 border-black/5 dark:border-white/5 opacity-50"
                    : "bg-red-500/5 border-red-500/10"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-red-500 dark:text-red-400 flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" /> Road Freight (NH Highways)
                  </span>
                  {!isRailOptimized && (
                    <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                      Active Route
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">RTO Border Delays:</span>
                    <span className="font-bold text-red-500">
                      {isRailOptimized
                        ? "0 min (Bypassed)"
                        : `${borderDelay} mins`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Border Checkposts:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {isRailOptimized
                        ? 0
                        : activeShipment.num_state_border_crossings}{" "}
                      inter-state
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Toll Plaza Overhead:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      ₹
                      {isRailOptimized ? "0" : tollCost.toLocaleString("en-IN")}{" "}
                      ({activeShipment.num_toll_plazas} Plazas)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Fuel & Carbon Fee:</span>
                    <span className="font-bold text-red-500">
                      {isRailOptimized ? "Low" : "High Congestion"}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-black/5 dark:border-white/5 font-bold">
                    <span className="text-slate-650 dark:text-slate-300">Risk Exposure:</span>
                    <span className="text-red-500">
                      {isRailOptimized
                        ? "15/100"
                        : `${activeShipment.risk_score}/100`}
                    </span>
                  </div>
                </div>
              </div>

              {/* DFC Rail Freight Column */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  isRailOptimized
                    ? "bg-emerald-500/10 border-emerald-500/25 ring-1 ring-emerald-500/15"
                    : "bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/20"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Train className="h-3.5 w-3.5" /> Rail DFC (Dedicated
                    Freight Corridor)
                  </span>
                  {isRailOptimized && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                      Optimized Route Active
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">RTO Border Delays:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      0 min (Bypassed)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Border Checkposts:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      0 checkpoints
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Toll Plaza Cost:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ₹0 (Zero Tolls)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Eco Carbon Impact:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Bypassed (Electric DFC)
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-black/5 dark:border-white/5 font-bold">
                    <span className="text-slate-650 dark:text-slate-300">Risk Exposure:</span>
                    <span className="text-emerald-400">
                      {isRailOptimized
                        ? `${activeShipment.risk_score}/100`
                        : `${Math.max(10, Math.round(activeShipment.risk_score * 0.4))}/100 (Bypassed)`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Shift Action Panel */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <AlertCircle className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                <span>
                  Modal shifts apply PM Gati Shakti railway logistics
                  coordinates to completely bypass highway blockages.
                </span>
              </div>

              {isRailOptimized ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-lg">
                  <ShieldCheck className="h-4 w-4" />
                  Gati Shakti Rail Active
                </div>
              ) : (
                <motion.button
                  onClick={handleRailSwitch}
                  whileTap={{ scale: 0.96 }}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/10 border border-orange-500/20 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />{" "}
                      Analyzing Modal Shift...
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5 animate-pulse" /> Switch to
                      Dedicated Rail Freight (DFC)
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
