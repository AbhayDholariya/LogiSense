// components/ui/CustomerAlertToast.jsx
/**
 * Customer Panel Alert Notification System
 * ==========================================
 * Behaviour:
 *  - App start  : 1 alert shown after 3 seconds (welcome / most urgent)
 *  - Every 2 min: polls GET /api/customer/alerts → shows up to 2 new toasts
 *  - Toasts slide-in from bottom-right, auto-dismiss after 10 seconds
 *  - Max 4 toasts stacked at once
 *  - Customer-friendly language (no technical jargon)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  X,
  Clock,
  AlertTriangle,
  CheckCircle,
  Cloud,
  Shield,
  Truck,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "";
const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes exactly
const MAX_TOASTS = 4;
const TOAST_DURATION_MS = 10000; // 10 seconds

const SEVERITY_STYLES = {
  critical: {
    border:  "border-red-500/50",
    bg:      "bg-gradient-to-br from-red-950/95 to-slate-950/95",
    header:  "bg-red-500/15",
    dot:     "bg-red-500",
    title:   "text-red-300",
    badge:   "bg-red-500/25 text-red-200 border-red-500/30",
    bar:     "bg-red-500",
  },
  high: {
    border:  "border-orange-500/40",
    bg:      "bg-gradient-to-br from-orange-950/95 to-slate-950/95",
    header:  "bg-orange-500/15",
    dot:     "bg-orange-500",
    title:   "text-orange-300",
    badge:   "bg-orange-500/25 text-orange-200 border-orange-500/30",
    bar:     "bg-orange-500",
  },
  medium: {
    border:  "border-amber-500/35",
    bg:      "bg-gradient-to-br from-amber-950/95 to-slate-950/95",
    header:  "bg-amber-500/12",
    dot:     "bg-amber-400",
    title:   "text-amber-300",
    badge:   "bg-amber-500/20 text-amber-200 border-amber-500/25",
    bar:     "bg-amber-400",
  },
  low: {
    border:  "border-indigo-500/30",
    bg:      "bg-gradient-to-br from-indigo-950/95 to-slate-950/95",
    header:  "bg-indigo-500/10",
    dot:     "bg-indigo-400",
    title:   "text-indigo-300",
    badge:   "bg-indigo-500/20 text-indigo-200 border-indigo-500/25",
    bar:     "bg-indigo-400",
  },
};

const TYPE_ICONS = {
  shipment_delayed:  Truck,
  weather_impact:    Cloud,
  customs_hold:      Shield,
  risk_alert:        AlertTriangle,
  shipment_update:   Package,
  shipment_created:  CheckCircle,
};

const TYPE_LABELS = {
  shipment_delayed:  "Delivery Delay",
  weather_impact:    "Weather Alert",
  customs_hold:      "Customs Hold",
  risk_alert:        "Risk Alert",
  shipment_update:   "Shipment Update",
  shipment_created:  "New Shipment",
};

// ─── Individual Toast ─────────────────────────────────────────────────────────

function CustomerToast({ alert, onDismiss }) {
  const sty = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.medium;
  const Icon = TYPE_ICONS[alert.type] || Package;
  const [progress, setProgress] = useState(100);
  const timerRef = useRef(null);

  useEffect(() => {
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / TOAST_DURATION_MS) * 100);
      setProgress(pct);
      if (pct <= 0) {
        clearInterval(timerRef.current);
        onDismiss(alert.id);
      }
    }, 50);
    return () => clearInterval(timerRef.current);
  }, []);

  const timeStr = new Date(alert.created_at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const label = TYPE_LABELS[alert.type] || alert.type?.replace(/_/g, " ");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className={`relative w-[22rem] rounded-2xl border backdrop-blur-xl shadow-2xl overflow-hidden ${sty.border} ${sty.bg}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${sty.header}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${sty.dot} ${alert.severity === "critical" ? "animate-pulse" : ""}`} />
          <Icon className={`h-3.5 w-3.5 ${sty.title}`} />
          <span className={`text-[10px] font-black uppercase tracking-wider ${sty.title}`}>
            {label}
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${sty.badge}`}>
            {alert.severity}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {timeStr}
          </span>
          <button
            onClick={() => onDismiss(alert.id)}
            className="text-slate-500 hover:text-white transition-colors p-0.5 rounded"
            aria-label="Dismiss notification"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 pt-2.5 space-y-2">
        {/* Shipment ID */}
        {alert.shipment_id && (
          <div className="flex items-center gap-1.5">
            <Package className="h-3 w-3 text-slate-400 flex-shrink-0" />
            <span className="font-mono text-[11px] font-bold text-white">
              {alert.shipment_id}
            </span>
          </div>
        )}

        {/* Message */}
        <p className="text-[11.5px] text-slate-300 leading-relaxed line-clamp-4">
          {alert.message}
        </p>

        {/* Metrics row — shown if meaningful */}
        {(alert.risk_score > 0 || alert.delay_probability > 0) && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {alert.risk_score > 0 && (
              <span className={`text-[10px] font-bold ${sty.title}`}>
                Risk: {alert.risk_score?.toFixed(0)}/100
              </span>
            )}
            {alert.delay_probability > 0 && (
              <span className="text-[10px] text-purple-300 font-medium">
                Delay chance: {(alert.delay_probability * 100).toFixed(0)}%
              </span>
            )}
            {alert.weather_warning && (
              <span className="text-[10px] text-sky-300 font-medium">
                {alert.weather_icon} {alert.weather_label}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Progress timer bar */}
      <div className="h-0.5 bg-white/[0.08] w-full">
        <div
          className={`h-full transition-none ${sty.bar}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

async function fetchCustomerAlerts(token) {
  try {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/api/customer/alerts?limit=5`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.alerts || [];
  } catch {
    return [];
  }
}

function getToken() {
  try {
    const raw = sessionStorage.getItem("sc_auth_token");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

export function CustomerAlertProvider({ children, active = false }) {
  const [toasts, setToasts] = useState([]);
  const seenIdsRef = useRef(new Set());
  const mountedRef = useRef(true);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showNewToasts = useCallback((alerts, maxShow = 2) => {
    const unseen = alerts.filter((a) => !seenIdsRef.current.has(a.id));
    if (!unseen.length) return;

    // Mark all as seen immediately
    unseen.forEach((a) => seenIdsRef.current.add(a.id));

    // Sort: critical → high → medium → low, then by newest
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...unseen].sort((a, b) => {
      const pa = priorityOrder[a.severity] ?? 3;
      const pb = priorityOrder[b.severity] ?? 3;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    const toShow = sorted.slice(0, maxShow);
    setToasts((prev) => [...toShow, ...prev].slice(0, MAX_TOASTS));
  }, []);

  // Initial alert on app start (after 3 seconds)
  const showInitialAlert = useCallback(async () => {
    if (!mountedRef.current || !active) return;
    const token = getToken();
    const alerts = await fetchCustomerAlerts(token);
    if (!mountedRef.current) return;
    if (alerts.length > 0) {
      // Show only the single most urgent alert on startup
      showNewToasts(alerts, 1);
    }
  }, [active, showNewToasts]);

  // Recurring 2-minute poll
  const pollAlerts = useCallback(async () => {
    if (!mountedRef.current || !active) return;
    const token = getToken();
    const alerts = await fetchCustomerAlerts(token);
    if (!mountedRef.current) return;
    showNewToasts(alerts, 2);
  }, [active, showNewToasts]);

  useEffect(() => {
    if (!active) return;
    mountedRef.current = true;
    let intervalId = null;

    // Step 1: Show 1 initial alert after 3s
    const initTimer = setTimeout(showInitialAlert, 3000);

    // Step 2: Start 2-minute recurring poll (first one at 2m mark)
    const pollTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      pollAlerts();
      intervalId = setInterval(pollAlerts, POLL_INTERVAL_MS);
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearTimeout(initTimer);
      clearTimeout(pollTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [active, showInitialAlert, pollAlerts]);

  return (
    <>
      {children}
      {/* Toast container — bottom-right, above other UI */}
      <div className="fixed bottom-6 right-6 z-[9998] flex flex-col-reverse gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((alert) => (
            <div key={alert.id} className="pointer-events-auto">
              <CustomerToast alert={alert} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
