import clsx from "clsx";

export function LoadingSpinner({ size = "md", className }) {
  const sizeMap = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" };
  return (
    <div
      className={clsx(
        "animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400",
        sizeMap[size],
        className,
      )}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-slate-400">Loading intelligence data...</p>
      </div>
    </div>
  );
}
