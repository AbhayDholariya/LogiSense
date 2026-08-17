// components/layout/Sidebar.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Map,
  Bell,
  ChevronLeft,
  ChevronRight,
  Activity,
  Flag,
  Truck,
  AlertCircle,
  TrendingUp,
  Sun,
  Moon,
  LogOut,
  User,
} from "lucide-react";
import clsx from "clsx";
import { useUIStore } from "../../store/useUIStore";
import { useIndianStore } from "../../store/useIndianStore";
import { useThemeStore } from "../../store/useThemeStore";
import { useAuthStore } from "../../store/useAuthStore";

const indianNavItems = [
  { to: "/india", icon: Flag, label: "India Dashboard", exact: true },
  { to: "/india/map-command", icon: Map, label: "Map Command" },
  { to: "/india/shipments", icon: Truck, label: "Current Shipment" },
  { to: "/india/alerts", icon: AlertCircle, label: "Alert Intelligence" },
  { to: "/india/analytics", icon: TrendingUp, label: "Analytics" },
];

const customerNavItems = [
  { to: "/customer", icon: LayoutDashboard, label: "Control Tower", exact: true },
  { to: "/customer/support", icon: Bell, label: "Support Desk" },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { alerts: indianAlerts } = useIndianStore();
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const panel = user?.panel ?? "india";
  const isCustomer = panel === "customer";

  const navItems = isCustomer ? customerNavItems : indianNavItems;
  const criticalCount = isCustomer
    ? 0
    : indianAlerts.filter((a) => a.severity === "critical").length;

  const accentBg = isCustomer ? "bg-indigo-500/20" : "bg-orange-500/20";
  const accentBdr = isCustomer ? "border-indigo-500/30" : "border-orange-500/30";
  const accentText = isCustomer ? "text-indigo-400" : "text-orange-400";
  const activeNav = isCustomer
    ? "bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20"
    : "bg-orange-500/15 text-orange-500 dark:text-orange-400 border border-orange-500/20";

  const handleLogout = () => {
    logout();
    navigate(isCustomer ? "/customer/login" : "/india/login", { replace: true });
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 220 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col h-full bg-white/80 dark:bg-navy-900/80 border-r border-black/5 dark:border-white/[0.06] backdrop-blur-xl overflow-hidden flex-shrink-0 transition-colors"
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-black/5 dark:border-white/[0.06]">
        <div
          className={clsx(
            "flex-shrink-0 h-8 w-8 rounded-lg border flex items-center justify-center",
            accentBg,
            accentBdr,
          )}
        >
          {isCustomer ? (
            <span className="text-lg leading-none">👤</span>
          ) : (
            <span className="text-lg leading-none">🇮🇳</span>
          )}
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <p className="text-sm font-bold text-slate-800 dark:text-white whitespace-nowrap">
                {isCustomer ? "Customer LogiSense" : "भारत LogiSense"}
              </p>
              <p className={clsx("text-[10px] whitespace-nowrap", accentText)}>
                {isCustomer ? "Client Supply Chain" : "India Supply Chain"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── User pill ──────────────────────────────────── */}
      <AnimatePresence>
        {!sidebarCollapsed && user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={clsx(
              "mx-3 mt-3 px-3 py-2 rounded-xl border flex items-center gap-2",
              isCustomer
                ? "bg-indigo-500/8 border-indigo-500/20"
                : "bg-orange-500/8 border-orange-500/20",
            )}
          >
            <div
              className={clsx(
                "h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0",
                accentBg,
              )}
            >
              <User className={clsx("h-3 w-3", accentText)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate">
                {user.username}
              </p>
              <p
                className={clsx("text-[9px] font-medium truncate", accentText)}
              >
                {user.role}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Nav ────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {!sidebarCollapsed && (
          <p
            className={clsx(
              "text-[9px] font-bold uppercase tracking-widest px-2 pt-1 pb-1.5",
              accentText,
            )}
          >
            {isCustomer ? "👤 Customer Panel" : "🇮🇳 India Panel"}
          </p>
        )}

        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 group relative",
                isActive
                  ? activeNav
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.05]",
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative flex-shrink-0">
                  <Icon
                    className={clsx(
                      "h-4 w-4",
                      isActive
                        ? accentText
                        : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white",
                    )}
                  />
                  {label === "Alert Intelligence" && criticalCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </div>
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap overflow-hidden text-xs"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-white dark:bg-navy-800 border border-black/10 dark:border-white/10 rounded text-xs text-slate-800 dark:text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer: theme + live + logout ─────────────── */}
      <div className="px-3 py-3 border-t border-black/5 dark:border-white/[0.06] flex flex-col gap-1.5">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={clsx(
            "flex items-center gap-3 rounded-lg px-2 py-2 text-xs font-medium transition-all",
            "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.05]",
            sidebarCollapsed && "justify-center",
          )}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 flex-shrink-0" />
          ) : (
            <Moon className="h-4 w-4 flex-shrink-0" />
          )}
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Live indicator */}
        <div
          className={clsx(
            "flex items-center gap-2 px-2",
            sidebarCollapsed && "justify-center",
          )}
        >
          <Activity className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-emerald-400 whitespace-nowrap"
              >
                Live Feed Active
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        {user && (
          <button
            onClick={handleLogout}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-2 py-2 text-xs font-medium transition-all",
              "text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/5",
              sidebarCollapsed && "justify-center",
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="whitespace-nowrap"
                >
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
            {sidebarCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-white dark:bg-navy-800 border border-black/10 dark:border-white/10 rounded text-xs text-red-500 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Sign Out
              </div>
            )}
          </button>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white dark:bg-navy-800 border border-black/10 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors z-10"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </motion.aside>
  );
}
