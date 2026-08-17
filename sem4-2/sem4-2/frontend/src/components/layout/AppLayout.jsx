// components/layout/AppLayout.jsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useEffect } from "react";
import { useIndianStore } from "../../store/useIndianStore";
import { useAuthStore } from "../../store/useAuthStore";
import { IndianApiService } from "../../services/indianApi";
import { CustomerChatbot } from "../ui/CustomerChatbot";

export function AppLayout() {
  const {
    fetchShipments,
    fetchAlerts,
    fetchHealth,
    fetchCascadeEvents,
  } = useIndianStore();
  const { user } = useAuthStore();

  const isIndia = user?.panel === "india";

  useEffect(() => {
    if (!isIndia) return; // customer panel has no polling needs here

    // Initial data load
    fetchShipments();
    fetchAlerts();
    fetchHealth();
    fetchCascadeEvents();

    // Poll shipments + alerts every 15 s (backend embeds live weather each time)
    const pollInterval = setInterval(() => {
      fetchShipments();
      fetchAlerts();
    }, 15_000);

    // Force a live OpenWeather re-fetch on backend every 10 minutes
    // so weather data stays fresh beyond the 15-min API cache window
    const weatherInterval = setInterval(async () => {
      try {
        await IndianApiService.refreshWeather();
      } catch {
        // silently ignore — next regular poll will still return cached weather
      }
    }, 600_000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(weatherInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIndia]);

  const isCustomer = user?.panel === "customer";

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <main className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </div>
      {isCustomer && <CustomerChatbot />}
    </div>
  );
}
