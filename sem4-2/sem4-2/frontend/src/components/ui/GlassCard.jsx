import { motion } from "framer-motion";
import clsx from "clsx";

const glowMap = {
  cyan: "hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:border-cyan-500/40",
  red: "hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:border-red-500/40",
  green:
    "hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:border-emerald-500/40",
  amber:
    "hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-amber-500/40",
  none: "",
};

export function GlassCard({
  children,
  className,
  style,
  hover = false,
  glow = "none",
  onClick,
  animate = true,
  ...rest
}) {
  const Comp = animate ? motion.div : "div";
  const animProps = animate
    ? {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      }
    : {};

  return (
    <Comp
      {...animProps}
      {...rest}
      onClick={onClick}
      style={style}
      className={clsx(
        "rounded-xl glass transition-colors duration-300",
        hover && "cursor-pointer hover:bg-black/5 dark:hover:bg-white/[0.07]",
        glow !== "none" && glowMap[glow],
        className,
      )}
    >
      {children}
    </Comp>
  );
}
