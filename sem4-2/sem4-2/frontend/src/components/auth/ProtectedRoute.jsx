// components/auth/ProtectedRoute.jsx
/**
 * Route guard — checks authentication and panel access.
 * Valid panels: india | customer
 * Any other panel (e.g. legacy "global") → force logout and redirect.
 */

import { useLocation, Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

const VALID_PANELS = ["india", "customer"];

export function ProtectedRoute({ children, panel }) {
  const { user, token, logout } = useAuthStore();
  const location = useLocation();

  const loginPath = panel === "customer" ? "/customer/login" : "/india/login";

  // Token in storage but user not yet hydrated — show spinner while verifying
  if (token && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#020817] gap-3">
        <div className="h-8 w-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-550 dark:text-slate-400">Verifying session…</p>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Legacy token with unknown/removed panel (e.g. "global") — clear it
  if (!VALID_PANELS.includes(user.panel)) {
    logout();
    return <Navigate to="/india/login" replace />;
  }

  // Logged in but wrong panel
  if (user.panel !== panel) {
    return <Navigate to={loginPath} replace />;
  }

  return <>{children}</>;
}
