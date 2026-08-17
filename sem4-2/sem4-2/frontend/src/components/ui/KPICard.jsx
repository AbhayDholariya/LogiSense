import { motion } from "framer-motion";
import clsx from "clsx";

const colorMap = {
  cyan: {
    icon: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    glow: "dark:shadow-[0_0_15px_rgba(34,211,238,0.08)]",
    trend: "text-cyan-600 dark:text-cyan-400",
  },
  emerald: {
    icon: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: "dark:shadow-[0_0_15px_rgba(16,185,129,0.08)]",
    trend: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    glow: "dark:shadow-[0_0_15px_rgba(245,158,11,0.08)]",
    trend: "text-amber-600 dark:text-amber-400",
  },
  red: {
    icon: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    glow: "dark:shadow-[0_0_15px_rgba(239,68,68,0.08)]",
    trend: "text-red-600 dark:text-red-400",
  },
  purple: {
    icon: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    glow: "dark:shadow-[0_0_15px_rgba(168,85,247,0.08)]",
    trend: "text-purple-600 dark:text-purple-400",
  },
};

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "cyan",
  index = 0,
}) {
  const c = colorMap[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className={clsx(
        "rounded-xl border p-5 backdrop-blur-md transition-all duration-200",
        "bg-white dark:bg-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.06]",
        "border-slate-200/80 dark:border-white/[0.06]",
        "shadow-sm dark:shadow-none",
        c.glow,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-slate-800 dark:text-white truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div
              className={clsx(
                "flex items-center gap-1 mt-2 text-xs font-bold",
                c.trend,
              )}
            >
              <span>
                {trend.value > 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-slate-500 dark:text-slate-500">
                {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className={clsx("rounded-lg p-2.5 ml-3 flex-shrink-0", c.bg)}>
          <Icon className={clsx("h-5 w-5", c.icon)} />
        </div>
      </div>
    </motion.div>
  );
}
