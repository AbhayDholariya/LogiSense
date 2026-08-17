// components/layout/TopBar.jsx
import { Clock, LogOut, User, Activity, Bell, Plus, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useAuthStore } from "../../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useIndianStore } from "../../store/useIndianStore";
import { AddShipmentModal } from "../indian/AddShipmentModal";
import { DemoRequestsModal } from "../indian/DemoRequestsModal";

export function TopBar({ title, subtitle }) {
  const { user, logout, token } = useAuthStore();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [showDemoInbox, setShowDemoInbox] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const { alerts, kpis, fetchAlerts } = useIndianStore();
  const isIndia = user?.panel === "india";

  const fetchPendingCount = async () => {
    if (!isIndia || !token) return;
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";

      // 1. Fetch demo requests
      let pendingDemos = 0;
      try {
        const resDemos = await fetch(`${API_BASE}/api/admin/demo-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resDemos.ok) {
          const data = await resDemos.json().catch(() => []);
          pendingDemos = Array.isArray(data) ? data.filter((r) => r.status === "pending").length : 0;
        }
      } catch (e) {
        console.error("Failed to fetch pending demos:", e);
      }

      // 2. Fetch support tickets
      let pendingTickets = 0;
      try {
        const resTickets = await fetch(`${API_BASE}/api/admin/tickets`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resTickets.ok) {
          const data = await resTickets.json().catch(() => []);
          pendingTickets = Array.isArray(data) ? data.filter((t) => t.status === "pending").length : 0;
        }
      } catch (e) {
        console.error("Failed to fetch pending tickets:", e);
      }

      setPendingCount(pendingDemos + pendingTickets);
    } catch (e) {
      console.error("Failed to fetch pending counts:", e);
    }
  };

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30_000);
    return () => clearInterval(interval);
  }, [isIndia, token]);

  // New / unread alerts — ones in last 30 min that arrived after page load
  const [seenCount, setSeenCount] = useState(null);
  const [bellAnimate, setBellAnimate] = useState(false);

  const criticalCount = isIndia
    ? alerts.filter((a) => a.severity === "critical").length
    : 0;
  const highCount = isIndia
    ? alerts.filter((a) => a.severity === "high").length
    : 0;
  const totalBadge = criticalCount + highCount;

  // Bell shake when new critical arrives
  useEffect(() => {
    if (seenCount !== null && criticalCount > seenCount) {
      setBellAnimate(true);
      const t = setTimeout(() => setBellAnimate(false), 1200);
      return () => clearTimeout(t);
    }
    setSeenCount(criticalCount);
  }, [criticalCount]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => {
    logout();
    navigate(isIndia ? "/india/login" : "/customer/login", { replace: true });
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-black/5 dark:border-white/[0.06] bg-white/80 dark:bg-navy-900/60 backdrop-blur-xl flex-shrink-0 transition-colors">
        {/* Title */}
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg px-3 py-1.5">
            <Activity className="h-3 w-3 animate-pulse" />
            <span className="hidden sm:inline font-medium">Live</span>
          </div>

          {/* IST clock */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-white/[0.04] border border-black/5 dark:border-white/[0.06] rounded-lg px-3 py-1.5">
            <Clock className="h-3 w-3" />
            <span className="font-mono">
              {time.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}{" "}
              IST
            </span>
          </div>

          {/* Bell notification (India panel only) */}
          {isIndia && (
            <motion.button
              onClick={() => navigate("/india/alerts")}
              whileTap={{ scale: 0.92 }}
              animate={bellAnimate ? {
                rotate: [0, -15, 15, -12, 12, -8, 8, 0],
                transition: { duration: 0.7 }
              } : {}}
              className="relative p-2 rounded-lg bg-black/5 dark:bg-white/[0.04] border border-black/5 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-500/10 transition-all"
              title={`${totalBadge} critical/high alerts`}
            >
              <Bell className="h-4 w-4" />
              <AnimatePresence>
                {totalBadge > 0 && (
                  <motion.span
                    key={totalBadge}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className={clsx(
                      "absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white",
                      criticalCount > 0 ? "bg-red-500 animate-pulse" : "bg-orange-500"
                    )}
                  >
                    {totalBadge > 99 ? "99+" : totalBadge}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}

          {/* Demo Requests Inbox (India panel only) */}
          {isIndia && (
            <motion.button
              onClick={() => setShowDemoInbox(true)}
              whileTap={{ scale: 0.92 }}
              className="relative p-2 rounded-lg bg-black/5 dark:bg-white/[0.04] border border-black/5 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
              title="Demo Requests CRM"
            >
              <Inbox className="h-4 w-4" />
              <AnimatePresence>
                {pendingCount > 0 && (
                  <motion.span
                    key={pendingCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white bg-indigo-500 animate-pulse"
                  >
                    {pendingCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}

          {/* Add Shipment button (India panel only) */}
          {isIndia && (
            <motion.button
              onClick={() => setShowModal(true)}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/25 text-orange-500 dark:text-orange-400 text-xs font-bold transition-all"
              title="Add new shipment to disruption system"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Shipment</span>
            </motion.button>
          )}

          {/* User chip */}
          {user && (
            <div
              className={clsx(
                "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs",
                isIndia
                  ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                  : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
              )}
            >
              <User className="h-3 w-3" />
              <span className="font-bold">{user.username}</span>
              <span className="opacity-60">·</span>
              <span className="opacity-80">{user.role}</span>
            </div>
          )}

          {/* Logout */}
          {user && (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-2 rounded-lg bg-black/5 dark:bg-white/[0.04] border border-black/5 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Add Shipment Modal */}
      <AddShipmentModal isOpen={showModal} onClose={() => setShowModal(false)} />

      {/* Demo Requests Modal */}
      <DemoRequestsModal isOpen={showDemoInbox} onClose={() => { setShowDemoInbox(false); fetchPendingCount(); }} token={token} />
    </>
  );
}
