import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Inbox,
  RefreshCw,
  Mail,
  Building2,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";

export function DemoRequestsModal({ isOpen, onClose, token }) {
  const [activeTab, setActiveTab] = useState("demos"); // 'demos' | 'tickets'
  const [demos, setDemos] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || "";

  const fetchDemos = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/demo-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json().catch(() => []);
        setDemos(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load demo requests:", e);
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json().catch(() => []);
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load support tickets:", e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    if (activeTab === "demos") {
      await fetchDemos();
    } else {
      await fetchTickets();
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && token) {
      loadData();
    }
  }, [isOpen, activeTab, token]);

  const handleAcceptDemo = async (id) => {
    setActionLoading(`demo-${id}`);
    try {
      const res = await fetch(`${API_BASE}/api/admin/demo-requests/${id}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({ error: `Server error (${res.status} ${res.statusText})` }));
      if (res.ok) {
        const appt = data.demo?.appointmentAt
          ? new Date(data.demo.appointmentAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
          : "";
        setToast({
          type: "success",
          msg: data.emailSent
            ? `✅ Accepted & email sent to ${data.demo?.email || 'user'}${appt ? ` · Appt: ${appt}` : ""}`
            : `✅ Accepted (email status: ${data.emailError || "sent"})`,
        });
        fetchDemos();
      } else {
        setToast({ type: "error", msg: data.error || `Failed to accept (status ${res.status}).` });
      }
    } catch (e) {
      setToast({ type: "error", msg: String(e) });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleRejectDemo = async (id) => {
    setActionLoading(`demo-${id}`);
    try {
      const res = await fetch(`${API_BASE}/api/admin/demo-requests/${id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({ error: `Server error (${res.status} ${res.statusText})` }));
      if (res.ok) {
        setToast({ type: "info", msg: "Request rejected." });
        fetchDemos();
      } else {
        setToast({ type: "error", msg: data.error || `Failed to reject (status ${res.status}).` });
      }
    } catch (e) {
      setToast({ type: "error", msg: String(e) });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleResolveTicket = async (id) => {
    setActionLoading(`ticket-${id}`);
    try {
      const res = await fetch(`${API_BASE}/api/admin/tickets/${id}/resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({ error: `Server error (${res.status} ${res.statusText})` }));
      if (res.ok) {
        setToast({ type: "success", msg: "✅ Support ticket resolved successfully." });
        fetchTickets();
      } else {
        setToast({ type: "error", msg: data.error || `Failed to resolve ticket (status ${res.status}).` });
      }
    } catch (e) {
      setToast({ type: "error", msg: String(e) });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const pendingDemos = demos.filter((r) => r.status === "pending").length;
  const pendingTickets = tickets.filter((t) => t.status === "pending").length;

  const statusColor = (s) => {
    if (s === "pending")  return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    if (s === "accepted" || s === "resolved") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if (s === "rejected") return "bg-red-500/10 text-red-400 border-red-500/20";
    return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-3xl max-h-[85vh] flex flex-col bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-indigo-500/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Inbox className="h-4.5 w-4.5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      Inquiries Control Desk
                      {(pendingDemos + pendingTickets) > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                          {pendingDemos + pendingTickets} NEW
                        </span>
                      )}
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Manage incoming landing page demo requests and customer support tickets
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadData}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Tabs Selector */}
              <div className="flex border-b border-white/[0.06] bg-slate-900/40 px-6 py-2 flex-shrink-0 gap-4">
                <button
                  onClick={() => setActiveTab("demos")}
                  className={`text-xs font-bold py-1.5 px-3 rounded-lg transition-all ${
                    activeTab === "demos"
                      ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Demo Requests {pendingDemos > 0 && <span className="ml-1 text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">{pendingDemos}</span>}
                </button>
                <button
                  onClick={() => setActiveTab("tickets")}
                  className={`text-xs font-bold py-1.5 px-3 rounded-lg transition-all ${
                    activeTab === "tickets"
                      ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Customer Tickets {pendingTickets > 0 && <span className="ml-1 text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">{pendingTickets}</span>}
                </button>
              </div>

              {/* Toast Messages */}
              {toast && (
                <div className={`px-6 py-2.5 text-xs font-semibold border-b ${
                  toast.type === "success" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : toast.type === "error"   ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                }`}>
                  {toast.msg}
                </div>
              )}

              {/* Content Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
                    <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                ) : activeTab === "demos" ? (
                  /* ── TAB: Demos ── */
                  demos.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-semibold">No demo requests yet</p>
                      <p className="text-xs mt-1">Requests from the landing page will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {demos.map((req) => (
                        <motion.div
                          key={req.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-xl border transition-all ${
                            req.status === "pending"
                              ? "bg-amber-500/5 border-amber-500/20 dark:border-amber-500/30"
                              : req.status === "accepted"
                                ? "bg-emerald-500/5 border-emerald-500/10 dark:border-emerald-500/20"
                                : "bg-slate-800/20 border-white/5 opacity-70"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-sm font-bold text-white">{req.fullName}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${statusColor(req.status)}`}>
                                  {req.status}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-400">
                                <span className="flex items-center gap-1.5">
                                  <Mail className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                                  {req.email}
                                </span>
                                {req.company && (
                                  <span className="flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                    {req.company}
                                  </span>
                                )}
                                <span className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                  {req.role} · {req.volume} loads
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                  {req.createdAt
                                    ? new Date(req.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                                    : "—"}
                                </span>
                                {req.appointmentAt && (
                                  <span className="flex items-center gap-1.5 col-span-2 text-emerald-400 font-semibold mt-0.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                                    Appt: {new Date(req.appointmentAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                                  </span>
                                )}
                              </div>
                            </div>

                            {req.status === "pending" && (
                              <div className="flex gap-2 sm:self-center flex-shrink-0">
                                <button
                                  onClick={() => handleAcceptDemo(req.id)}
                                  disabled={actionLoading === `demo-${req.id}`}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold transition-all disabled:opacity-50"
                                >
                                  {actionLoading === `demo-${req.id}` ? (
                                    <div className="h-3.5 w-3.5 border border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                  )}
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleRejectDemo(req.id)}
                                  disabled={actionLoading === `demo-${req.id}`}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold transition-all disabled:opacity-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )
                ) : (
                  /* ── TAB: Tickets ── */
                  tickets.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-semibold">No customer tickets yet</p>
                      <p className="text-xs mt-1">Queries submitted by logged-in customers will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tickets.map((ticket) => (
                        <motion.div
                          key={ticket.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-xl border transition-all ${
                            ticket.status === "pending"
                              ? "bg-amber-500/5 border-amber-500/20 dark:border-amber-500/30"
                              : "bg-slate-800/20 border-white/5 opacity-70"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-sm font-bold text-white">{ticket.subject}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${statusColor(ticket.status)}`}>
                                  {ticket.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed mb-3 bg-black/35 border border-white/5 rounded-lg p-3 whitespace-pre-wrap">
                                {ticket.message}
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-400">
                                <span className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                                  Customer: {ticket.customer_username} {ticket.customer_company ? `(${ticket.customer_company})` : ""}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                  {ticket.customer_email}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                  Submitted: {new Date(ticket.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                                </span>
                              </div>
                            </div>

                            {ticket.status === "pending" && (
                              <div className="flex gap-2 sm:self-center flex-shrink-0">
                                <button
                                  onClick={() => handleResolveTicket(ticket.id)}
                                  disabled={actionLoading === `ticket-${ticket.id}`}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold transition-all disabled:opacity-50"
                                >
                                  {actionLoading === `ticket-${ticket.id}` ? (
                                    <div className="h-3.5 w-3.5 border border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                  )}
                                  Mark Resolved
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
