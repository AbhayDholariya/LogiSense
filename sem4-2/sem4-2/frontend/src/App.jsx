import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { IndianLogin } from "./pages/indian/IndianLogin";
// 🇮🇳 Indian Supply Chain Panel
import { IndianDashboard } from "./pages/indian/IndianDashboard";
import { IndianShipments } from "./pages/indian/IndianShipments";
import { IndianAlerts } from "./pages/indian/IndianAlerts";
import { IndianAnalytics } from "./pages/indian/IndianAnalytics";
import { IndianMapCommand } from "./pages/indian/IndianMapCommand";
// 👤 Customer Supply Chain Panel
import { CustomerLogin } from "./pages/customer/CustomerLogin";
import { CustomerDashboard } from "./pages/customer/CustomerDashboard";
import { SupportDesk } from "./pages/customer/SupportDesk";
import { LandingPage } from "./pages/LandingPage";
import { useThemeStore } from "./store/useThemeStore";
import { useAuthStore } from "./store/useAuthStore";
import { LiveAlertProvider } from "./components/ui/LiveAlertToast";
import { CustomerAlertProvider } from "./components/ui/CustomerAlertToast";

export default function App() {
  const { theme } = useThemeStore();
  const { verifySession, user } = useAuthStore();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Verify session on mount (handles page refresh)
  useEffect(() => {
    verifySession();
  }, []);

  // Customer alert toasts are active only when a customer is logged in
  const isCustomer = user?.panel === "customer";
  // Live alerts (India panel alerts) are active only when an Indian panel user is logged in
  const isIndia = user?.panel === "india";

  return (
    <LiveAlertProvider active={isIndia}>
      <CustomerAlertProvider active={false}>
        <BrowserRouter>
          <Routes>
            {/* ── Public Landing Page ───────────────────────────────────── */}
            <Route path="/" element={<LandingPage />} />

            {/* ── Public login pages ────────────────────────────────────── */}
            <Route path="/india/login" element={<IndianLogin />} />
            <Route path="/customer/login" element={<CustomerLogin />} />

            {/* ── Indian Panel (requires 'india' auth) ──────────────────── */}
            <Route
              element={
                <ProtectedRoute panel="india">
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/india" element={<IndianDashboard />} />
              <Route path="/india/shipments" element={<IndianShipments />} />
              <Route path="/india/alerts" element={<IndianAlerts />} />
              <Route path="/india/analytics" element={<IndianAnalytics />} />
              <Route path="/india/map-command" element={<IndianMapCommand />} />
            </Route>

            {/* ── Customer Panel (requires 'customer' auth) ─────────────── */}
            <Route
              element={
                <ProtectedRoute panel="customer">
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/customer" element={<CustomerDashboard />} />
              <Route path="/customer/support" element={<SupportDesk />} />
            </Route>

            {/* ── Catch-all → India login ───────────────────────────────── */}
            <Route path="*" element={<Navigate to="/india/login" replace />} />
          </Routes>
        </BrowserRouter>
      </CustomerAlertProvider>
    </LiveAlertProvider>
  );
}
