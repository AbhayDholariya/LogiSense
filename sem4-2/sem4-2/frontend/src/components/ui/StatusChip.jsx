import clsx from "clsx";

const statusConfig = {
  in_transit: {
    label: "In Transit",
    classes: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  "in-transit": {
    label: "In Transit",
    classes: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  at_port: {
    label: "At Port",
    classes: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  "at-port": {
    label: "At Port",
    classes: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  delayed: {
    label: "Delayed",
    classes: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  customs_hold: {
    label: "Customs Hold",
    classes: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  "on-schedule": {
    label: "On Schedule",
    classes: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  arrived: {
    label: "Arrived",
    classes: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
};

export function StatusChip({ status, size = "md" }) {
  const config = statusConfig[status] || {
    label: status,
    classes: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border font-medium",
        config.classes,
        size === "sm" ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1",
      )}
    >
      {config.label}
    </span>
  );
}
