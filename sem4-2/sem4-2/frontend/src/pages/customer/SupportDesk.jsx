import { useState } from "react";
import { TopBar } from "../../components/layout/TopBar";
import { GlassCard } from "../../components/ui/GlassCard";
import { useAuthStore } from "../../store/useAuthStore";
import {
  Mail,
  Send,
  CheckCircle,
  HelpCircle,
  User,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function SupportDesk() {
  const { user, token } = useAuthStore();
  const [subject, setSubject] = useState("");
  const [subjectType, setSubjectType] = useState("");
  const [message, setMessage] = useState("");
  const [ticketSent, setTicketSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const admin = user?.adminContact || {
    name: "Vishv Jani (Global Admin)",
    company: "LogiSense Global Ltd.",
    phone: "+91 94285 53109",
    email: "admin.global@logisense.com",
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !subjectType || !message) return;
    setLoading(true);
    setErrorMsg("");

    const API_BASE = import.meta.env.VITE_API_URL || "";

    try {
      const res = await fetch(`${API_BASE}/api/customer/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject, subject_type: subjectType, message }),
      });
      if (res.ok) {
        setLoading(false);
        setTicketSent(true);
        setSubject("");
        setSubjectType("");
        setMessage("");
        setTimeout(() => setTicketSent(false), 5000);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || `Failed to submit ticket (Server error ${res.status}).`);
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#020817] text-slate-800 dark:text-white transition-colors duration-200">
      <TopBar
        title="Support Desk"
        subtitle="Submit queries or contact your designated administrator directly"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Admin Details Card */}
          <GlassCard className="md:col-span-1 p-5 border border-slate-200 dark:border-indigo-500/20 bg-gradient-to-b from-indigo-50/50 to-white/50 dark:from-[#0c0d29] dark:to-[#040516] flex flex-col justify-between relative overflow-hidden text-slate-800 dark:text-white shadow-md dark:shadow-none">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-4 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-4 w-4" />
                Your Support Officer
              </h3>

              <div className="space-y-4">
                {/* Admin Name & Company */}
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest block mb-0.5">
                    Administrator Name
                  </label>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{admin.name}</p>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest block mb-0.5">
                    Company / Branch
                  </label>
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-300">{admin.company}</p>
                </div>

                {/* Mobile Number */}
                <div className="p-3 bg-white/60 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] rounded-lg">
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest block mb-0.5">
                    Admin Mobile Number
                  </label>
                  <p className="text-sm font-mono font-bold text-slate-800 dark:text-white">{admin.phone}</p>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online & Available
                  </p>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest block mb-0.5">
                    Email Address
                  </label>
                  <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{admin.email}</p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Ticket Request Form */}
          <GlassCard className="md:col-span-2 p-5 border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-800 dark:text-white shadow-md dark:shadow-none">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1 uppercase tracking-wider">
              Submit Assistance Ticket
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Write a query or request route optimization assistance. Our administrators will review the request and get in touch with you immediately.
            </p>

            {/* Success toast */}
            <AnimatePresence>
              {ticketSent && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                >
                  <CheckCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-emerald-600 dark:text-emerald-300">Ticket submitted successfully! Admin will respond shortly.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error toast */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{errorMsg}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleTicketSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                    Subject / Topic
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Request Reroute for SHP-4420"
                    required
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                    Subject Type
                  </label>
                  <input
                    type="text"
                    value={subjectType}
                    onChange={(e) => setSubjectType(e.target.value)}
                    placeholder="e.g. Technical, Reroute, General"
                    required
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                  Detailed Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows="5"
                  placeholder="Describe your issue, shipment ID, cargo type, and support required..."
                  required
                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !subject || !subjectType || !message}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:scale-[1.02]"
                >
                  {loading ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Submit Ticket
                    </>
                  )}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>

        {/* FAQs */}
        <GlassCard className="p-5 border border-slate-200 dark:border-white/10 bg-white/75 dark:bg-white/5 shadow-md dark:shadow-none">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            Frequently Asked Questions
          </h3>

          <div className="space-y-4 text-xs">
            <div className="p-3 bg-white/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04] rounded-lg">
              <h4 className="font-bold text-slate-800 dark:text-white mb-1">
                How do I request a route change for my delayed cargo?
              </h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Directly contact your support officer using the mobile number listed in the Support Officer panel above. Provide them with the Shipment ID, and they will calculate a rerouted path with optimized costs and transit times on their control towers.
              </p>
            </div>

            <div className="p-3 bg-white/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04] rounded-lg">
              <h4 className="font-bold text-slate-800 dark:text-white mb-1">
                What does the risk score indicate on my dashboard?
              </h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                The risk score is a composite index (10 to 100) calculated by our AI engine. Higher scores represent increased likelihood of delay due to weather storms, road blockages, port congestions, or strike alerts.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
