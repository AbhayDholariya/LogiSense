import clsx from "clsx";

const colorMap = {
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

const dotMap = {
  low: "bg-emerald-400",
  medium: "bg-amber-400",
  high: "bg-orange-400",
  critical: "bg-red-400",
};

const sizeMap = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
  lg: "text-sm px-3 py-1.5",
};

export function RiskBadge({ level, score, size = "md", pulse = false }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-wide",
        colorMap[level] || colorMap.medium,
        sizeMap[size],
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          dotMap[level] || dotMap.medium,
          pulse && level === "critical" && "animate-pulse",
        )}
      />

      {score !== undefined ? `${score.toFixed(0)}` : level}
    </span>
  );
}
