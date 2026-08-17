// components/ui/LiveAlertToast.jsx
/**
 * Live Alert Notification System
 * - On first load: fetches existing alerts from GET /api/india/alerts
 *   and shows toasts for the most recent critical/high ones
 * - Polls /api/india/generate-alerts every 30s for newly generated alerts
 * - Shows toast-style "incoming" notifications for new (unseen) alerts
 * - Animated slide-in from right, auto-dismiss after 8s
 * - Stacks up to 5 toasts simultaneously
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  X,
  Zap,
  Cloud,
  Shield,
  Truck,
  Activity,
} from "lucide-react";
import { useIndianStore } from "../../store/useIndianStore";
import { IndianApiService } from "../../services/indianApi";

const SEVERITY_CONFIG = {
  critical: {
    border: "border-red-500/60",
    bg: "bg-red-950/90 dark:bg-red-950/95",
    header: "bg-red-500/20",
    dot: "bg-red-500",
    text: "text-red-300",
    badge: "bg-red-500/30 text-red-200",
    glow: "shadow-red-500/20",
    sound: true,
  },
  high: {
    border: "border-orange-500/50",
    bg: "bg-orange-950/90 dark:bg-orange-950/95",
    header: "bg-orange-500/20",
    dot: "bg-orange-500",
    text: "text-orange-300",
    badge: "bg-orange-500/30 text-orange-200",
    glow: "shadow-orange-500/15",
    sound: false,
  },
  medium: {
    border: "border-amber-500/40",
    bg: "bg-amber-950/90 dark:bg-amber-950/95",
    header: "bg-amber-500/15",
    dot: "bg-amber-500",
    text: "text-amber-300",
    badge: "bg-amber-500/25 text-amber-200",
    glow: "shadow-amber-500/10",
    sound: false,
  },
  low: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-950/90 dark:bg-emerald-950/95",
    header: "bg-emerald-500/10",
    dot: "bg-emerald-500",
    text: "text-emerald-300",
    badge: "bg-emerald-500/20 text-emerald-200",
    glow: "shadow-emerald-500/10",
    sound: false,
  },
};

const TYPE_ICONS = {
  weather_warning: Cloud,
  anomaly_detected: Zap,
  road_closure_detected: Truck,
  vehicle_breakdown: Truck,
  cascade_risk: Activity,
  strike_event: AlertTriangle,
  customs_hold: Shield,
  high_risk_flag: AlertTriangle,
  shipment_created: Shield,
};

function AlertToast({ alert, onDismiss }) {
  const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
  const Icon = TYPE_ICONS[alert.type] || AlertTriangle;
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef(null);
  const DURATION = 8000; // 8 seconds

  useEffect(() => {
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(pct);
      if (pct <= 0) {
        clearInterval(intervalRef.current);
        onDismiss(alert.id);
      }
    }, 50);
    return () => clearInterval(intervalRef.current);
  }, []);

  const timeStr = new Date(alert.created_at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.85 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`relative w-80 rounded-xl border backdrop-blur-xl shadow-2xl overflow-hidden ${cfg.border} ${cfg.bg} ${cfg.glow}`}
      style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.4)` }}
    >
      {/* Header strip */}
      <div className={`flex items-center justify-between px-3 py-2 ${cfg.header}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full animate-pulse ${cfg.dot}`} />
          <Icon className={`h-3.5 w-3.5 ${cfg.text}`} />
          <span className={`text-[10px] font-bold uppercase tracking-widest ${cfg.text}`}>
            {alert.severity} alert
          </span>
          {alert.weather_warning && (
            <span className="text-[10px]">{alert.weather_icon}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-slate-400 font-mono">{timeStr}</span>
          <button
            onClick={() => onDismiss(alert.id)}
            className="text-slate-500 hover:text-white transition-colors p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 pb-3 pt-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="font-mono text-[11px] font-bold text-white">
            {alert.shipment_id}
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${cfg.badge}`}>
            {alert.type?.replace(/_/g, " ")}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
          {alert.message}
        </p>
        {alert.risk_score > 0 && (
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-[10px] font-bold ${cfg.text}`}>
              Risk: {alert.risk_score?.toFixed(0)}/100
            </span>
            {alert.delay_probability > 0 && (
              <span className="text-[10px] text-purple-300">
                Delay: {(alert.delay_probability * 100).toFixed(0)}%
              </span>
            )}
            {alert.cascade_risk > 0 && (
              <span className="text-[10px] text-orange-300">
                Cascade: {(alert.cascade_risk * 100).toFixed(0)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Progress bar (auto-dismiss timer) */}
      <div className="h-0.5 bg-white/10 w-full">
        <div
          className={`h-full transition-none ${cfg.dot}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}

// ─── Main Provider Component ─────────────────────────────────────────────────

const POLL_INTERVAL = 30000; // 30 seconds
const MAX_TOASTS = 5;

export function LiveAlertProvider({ children, active = false }) {
  const [toasts, setToasts] = useState([]);
  const seenIdsRef = useRef(new Set());
  const { fetchAlerts } = useIndianStore();
  const mountedRef = useRef(true);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Clear toasts when provider becomes inactive
  useEffect(() => {
    if (!active) {
      setToasts([]);
    }
  }, [active]);

  /**
   * Show toasts for a list of alerts — only for unseen ones.
   * Prioritises critical → high → medium → low, max `maxShow` per call.
   */
  const showNewToasts = useCallback((alerts, maxShow = 3) => {
    const unseen = alerts.filter((a) => !seenIdsRef.current.has(a.id));
    if (unseen.length === 0) return;

    unseen.forEach((a) => seenIdsRef.current.add(a.id));

    const toShow = [...unseen]
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
      })
      .slice(0, maxShow);

    setToasts((prev) => [...toShow, ...prev].slice(0, MAX_TOASTS));
  }, []);

  /**
   * Initial load — fetch existing alerts and show the most recent
   * critical/high ones so the UI isn't silent on first render.
   */
  const loadExistingAlerts = useCallback(async () => {
    if (!mountedRef.current || !active) return;
    try {
      const existing = await IndianApiService.getAlerts(2); // last 2 hours
      if (!mountedRef.current || !active) return;

      // Only show critical + high on initial load (avoid spamming medium/low)
      const urgent = existing.filter(
        (a) => a.severity === "critical" || a.severity === "high"
      );
      // Sort by newest first, show top 3
      const sorted = [...urgent].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      showNewToasts(sorted, 3);

      // Refresh the store's alerts panel
      fetchAlerts(48);
    } catch {
      // Backend may be starting up — silently ignore
    }
  }, [active, showNewToasts, fetchAlerts]);

  /**
   * Recurring poll — calls generate-alerts which both creates new ones
   * AND returns recent alerts from the last 30 min.
   */
  const pollAlerts = useCallback(async () => {
    if (!mountedRef.current || !active) return;
    try {
      const res = await IndianApiService.generateAlerts(50);
      const incomingAlerts = res.alerts || [];

      if (incomingAlerts.length > 0 && active) {
        showNewToasts(incomingAlerts, 3);
        // Refresh the alerts panel store
        fetchAlerts(48);
      }
    } catch {
      // Silently fail — backend may be starting up
    }
  }, [active, showNewToasts, fetchAlerts]);

  useEffect(() => {
    if (!active) return;
    mountedRef.current = true;
    let intervalId = null;

    // Step 1: Show existing alerts after 3s (give the page time to render)
    const initTimer = setTimeout(loadExistingAlerts, 3000);

    // Step 2: Start recurring generate-alerts poll after 10s
    const pollTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      pollAlerts();
      intervalId = setInterval(pollAlerts, POLL_INTERVAL);
    }, 10000);

    return () => {
      mountedRef.current = false;
      clearTimeout(initTimer);
      clearTimeout(pollTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [active, loadExistingAlerts, pollAlerts]);

  return (
    <>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((alert) => (
            <div key={alert.id} className="pointer-events-auto">
              <AlertToast alert={alert} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
