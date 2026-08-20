// pages/IndianLogin.tsx
/**
 * Login page for Indian Supply Chain Panel
 * Access restricted to authorised operators only.
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  Eye,
  EyeOff,
  Lock,
  User,
  AlertCircle,
  Shield,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useThemeStore } from "../../store/useThemeStore";

export function IndianLogin() {
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const { login, loading, error, clearError, user, logout } = useAuthStore();
  const setError = useAuthStore((s) => s.setError);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Already logged in → redirect
  useEffect(() => {
    if (user?.panel === "india") navigate("/india", { replace: true });
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const panel = await login(username, password);
    if (panel === "india") {
      navigate("/india", { replace: true });
    } else {
      logout();
      setError("Invalid credentials. Please check your username and password.");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-200"
      style={{
        background: theme === "dark"
          ? "linear-gradient(135deg, #0a0500 0%, #1a0a00 30%, #0d0d0d 60%, #001a00 100%)"
          : "linear-gradient(135deg, #fff7ed 0%, #fffbeb 30%, #ffffff 60%, #f0fdf4 100%)",
      }}
    >
      {/* Background grid — orange tint */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(251,146,60,0.2) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(251,146,60,0.2) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-green-500/8 rounded-full blur-3xl pointer-events-none" />

      {/* Indian tricolor accent */}
      <div className="absolute top-0 left-0 right-0 h-1 flex">
        <div className="flex-1 bg-orange-500" />
        <div className="flex-1 bg-white/80" />
        <div className="flex-1 bg-green-600" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        {/* Card */}
        <div
          className="backdrop-blur-xl border rounded-2xl p-8 shadow-2xl dark:shadow-none transition-colors duration-200"
          style={{
            background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.85)",
            borderColor: theme === "dark" ? "rgba(251,146,60,0.2)" : "rgba(251,146,60,0.35)",
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{
                background: theme === "dark" ? "rgba(251,146,60,0.15)" : "rgba(251,146,60,0.12)",
                border: theme === "dark" ? "1px solid rgba(251,146,60,0.3)" : "1px solid rgba(251,146,60,0.25)",
              }}
            >
              <span className="text-3xl">🇮🇳</span>
            </motion.div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1 transition-colors">
              Indian Supply Chain Panel
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">
              Logistics Intelligence — India Operations
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Truck className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
              <span className="text-[11px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">
                Operator Access Required
              </span>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 flex items-start gap-2.5 p-3 rounded-xl"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-550" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all"
                  style={{
                    background: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    border: theme === "dark" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "rgba(251,146,60,0.5)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)")
                  }
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-550" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl py-3 pl-10 pr-11 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all"
                  style={{
                    background: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    border: theme === "dark" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "rgba(251,146,60,0.5)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)")
                  }
                />

                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading || !username || !password}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #f97316, #ea580c)",
              }}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Sign In to India Panel
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div
            className="mt-6 pt-6 text-center transition-colors"
            style={{ borderTop: theme === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)" }}
          >
            <Link
              to="/customer/login"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-bold transition-colors"
            >
              👤 Customer Portal Login →
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[10px] text-slate-500 dark:text-slate-600 mt-4 transition-colors">
          Secured with bcrypt + JWT HS256 · Token expires in 8 hours
        </p>
      </motion.div>
    </div>
  );
}
