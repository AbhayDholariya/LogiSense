// components/maps/IndianShipmentMap.tsx
/**
 * Indian Supply Chain Live Map
 * Uses OpenStreetMap + Leaflet with proper Indian city coordinates
 * Shows real-time shipment positions with risk-colored markers and rich popup cards
 */

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useIndianStore } from "../../store/useIndianStore";
import { useThemeStore } from "../../store/useThemeStore";

// ─── Indian City Coordinates (Reference) ──────────────────────────────────────
const INDIAN_CITIES = {
  Mumbai: [19.076, 72.8777],
  Delhi: [28.6139, 77.209],
  Bangalore: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707],
  Kolkata: [22.5726, 88.3639],
  Hyderabad: [17.385, 78.4867],
  Pune: [18.5204, 73.8567],
  Ahmedabad: [23.0225, 72.5714],
  Surat: [21.1702, 72.8311],
  Jaipur: [26.9124, 75.7873],
  Lucknow: [26.8467, 80.9462],
  Nagpur: [21.1458, 79.0882],
  Coimbatore: [11.0168, 76.9558],
  Chandigarh: [30.7333, 76.7794],
  Indore: [22.7196, 75.8577],
  Bhopal: [23.2599, 77.4126],
  Patna: [25.5941, 85.1376],
  Bhubaneswar: [20.2961, 85.8245],
  Kochi: [9.9312, 76.2673],
  Guwahati: [26.1445, 91.7362],
  Visakhapatnam: [17.6868, 83.2185],
  Nashik: [19.9975, 73.7898],
  Vadodara: [22.3072, 73.1812],
  Rajkot: [22.3039, 70.8022],
  Varanasi: [25.3176, 82.9739],
  Jodhpur: [26.2389, 73.0243],
  Udaipur: [24.5854, 73.7125],
  Kanpur: [26.4499, 80.3319],
  Agra: [27.1767, 78.0081],
  Vijayawada: [16.5062, 80.648],
  Mysore: [12.2958, 76.6394],
  Solapur: [17.6599, 75.9064],
  Amritsar: [31.634, 74.8723],
  Ludhiana: [30.901, 75.8573],
};

// ─── Haversine Distance (km) ─────────────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Risk Colors ─────────────────────────────────────────────────────────────
const RISK_COLOR = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

// ─── Weather Icons ────────────────────────────────────────────────────────────
const WEATHER_ICON = {
  rain: "🌧️",
  light_rain: "🌦️",
  heavy_rain: "⛈️",
  fog: "🌫️",
  storm: "🌩️",
  snow: "❄️",
  clear: "☀️",
  cloudy: "☁️",
  overcast: "🌥️",
};

// ─── SVG Truck Icon ──────────────────────────────────────────────────────────
function truckIcon(riskLevel, isSelected, isAnomaly, weatherCode) {
  const color = RISK_COLOR[riskLevel] || "#94a3b8";
  const isAlert = riskLevel === "critical" || riskLevel === "high" || isAnomaly;
  const size = isSelected ? 26 : 18;
  const badWeather =
    weatherCode &&
    ["storm", "heavy_rain", "fog", "rain", "snow"].includes(weatherCode);
  const weatherEmoji = badWeather ? WEATHER_ICON[weatherCode] || "⚠️" : "";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size + 20}" height="${size + 24}" viewBox="0 0 ${size + 20} ${size + 24}">
      ${
        isAlert
          ? `
        <circle cx="${(size + 20) / 2}" cy="${(size + 20) / 2}" r="${size / 2 + 5}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.8">
          <animate attributeName="r" from="${size / 2 + 2}" to="${size / 2 + 14}" dur="1.2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" from="0.8" to="0" dur="1.2s" repeatCount="indefinite"/>
        </circle>
      `
          : ""
      }
      ${isSelected ? `<circle cx="${(size + 20) / 2}" cy="${(size + 20) / 2}" r="${size / 2 + 6}" fill="none" stroke="#22d3ee" stroke-width="2.5"/>` : ""}
      <circle cx="${(size + 20) / 2}" cy="${(size + 20) / 2}" r="${size / 2 + 1}" fill="${color}" opacity="0.95"/>
      <text x="${(size + 20) / 2}" y="${(size + 20) / 2 + 5}" text-anchor="middle" font-size="${size / 2}" fill="white" font-family="serif">🚛</text>
      ${
        isAnomaly
          ? `
        <circle cx="${(size + 20) / 2 + size / 2.5}" cy="${(size + 20) / 2 - size / 2.5}" r="4" fill="#fbbf24" stroke="white" stroke-width="1"/>
        <text x="${(size + 20) / 2 + size / 2.5}" y="${(size + 20) / 2 - size / 2.5 + 4}" text-anchor="middle" font-size="5" fill="white" font-weight="bold">!</text>
      `
          : ""
      }
      ${
        badWeather
          ? `
        <text x="${(size + 20) / 2}" y="${size + 22}" text-anchor="middle" font-size="10">${weatherEmoji}</text>
      `
          : ""
      }
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size + 20, size + 24],
    iconAnchor: [(size + 20) / 2, (size + 20) / 2],
  });
}

// ─── City Hub Icon ───────────────────────────────────────────────────────────
function cityIcon(type) {
  const color = type === "origin" ? "#22d3ee" : "#a78bfa";
  const label = type === "origin" ? "O" : "D";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30">
      <path d="M12 0 C5.373 0 0 5.373 0 12 C0 21 12 30 12 30 C12 30 24 21 24 12 C24 5.373 18.627 0 12 0Z"
        fill="${color}" opacity="0.9"/>
      <circle cx="12" cy="12" r="7" fill="rgba(0,0,0,0.35)"/>
      <text x="12" y="16" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="Inter,sans-serif">${label}</text>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [24, 30],
    iconAnchor: [12, 30],
    popupAnchor: [0, -30],
  });
}

// ─── Curved Route Line ───────────────────────────────────────────────────────
function buildCurve(from, to, steps = 50) {
  const curvature = 0.12;
  const midLat = (from[0] + to[0]) / 2 + curvature * Math.abs(to[1] - from[1]);
  const midLng = (from[1] + to[1]) / 2;
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat =
      (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * midLat + t * t * to[0];
    const lng =
      (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * midLng + t * t * to[1];
    points.push(L.latLng(lat, lng));
  }
  return points;
}

// ─── detailed premium popup ──────────────────────────────────────────────────
function buildDetailedPopup(s) {
  const riskColor = RISK_COLOR[s.risk_level] || "#94a3b8";
  const progressPercent = Math.round((s.progress || 0.5) * 100);
  const remainingKm = Math.round(
    (s.distance_km || 600) * (1 - (s.progress || 0.5)),
  );
  // ETA calculation
  const etaHours = (s.planned_transit_hours || 24) * (1 - (s.progress || 0.5));
  const etaStr =
    etaHours > 24
      ? `${(etaHours / 24).toFixed(1)} days`
      : `${etaHours.toFixed(1)} hours`;

  const cargoValLakhs = ((s.shipment_value_inr || 500000) / 100000).toFixed(1);
  const borderCrossings = s.num_state_border_crossings || 1;
  const tollPlazas = s.num_toll_plazas || 4;

  const warningHtml = s.is_delayed
    ? `<div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:6px; padding:6px; font-size:10px; color:#f59e0b; font-weight:700; display:flex; align-items:center; gap:6px; margin-bottom:8px;">
         <span>⏰</span> <span>Delayed by ${s.delay_duration_minutes?.toFixed(0) || "0"} minutes</span>
       </div>`
    : `<div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:6px; padding:6px; font-size:10px; color:#10b981; font-weight:700; display:flex; align-items:center; gap:6px; margin-bottom:8px;">
         <span>✅</span> <span>On Track — Moving smoothly</span>
       </div>`;

  const anomalyWarning = s.is_anomaly
    ? `<div style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); border-radius:6px; padding:6px; font-size:10px; color:#ef4444; font-weight:700; display:flex; align-items:center; gap:6px; margin-bottom:8px;">
         <span>🚨</span> <span>ANOMALY DETECTED: Route Deviation!</span>
       </div>`
    : "";

  const aiRecommendation =
    s.risk_score > 60
      ? `<div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:8px; margin-top:8px;">
         <p style="font-size:9.5px; color:#22d3ee; font-weight:700; margin-bottom:3px; display:flex; align-items:center; gap:4px;">
           <span>🔀</span> AI RECOMMENDATION:
         </p>
         <p style="font-size:9px; color:#f59e0b; line-height:1.3; font-style:italic; margin:0;">
           State border delays expected. Suggest switching to PM Gati Shakti rail freight corridors to save ${Math.round(etaHours * 0.3)} hours & avoid road closure risk.
         </p>
       </div>`
      : "";

  return `
    <div style="background:#081325; color:#f1f5f9; border-radius:12px; padding:12px; font-family:'Inter',sans-serif; width:260px; box-shadow:0 12px 24px rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.08);">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px; margin-bottom:8px;">
        <span style="font-size:11px; font-weight:700; color:#22d3ee; font-family:monospace;">${s.id}</span>
        <span style="font-size:8.5px; font-weight:700; padding:2px 6px; border-radius:4px; background:${riskColor}22; color:${riskColor}; border:1px solid ${riskColor}44; text-transform:uppercase;">
          Risk: ${s.risk_score.toFixed(0)}/100
        </span>
      </div>

      <!-- Route -->
      <div style="font-size:11px; font-weight:700; color:#fff; margin-bottom:8px;">
        <div>${s.origin_city} ➔ ${s.destination_city}</div>
        <div style="font-size:9px; color:#94a3b8; font-weight:normal; margin-top:2px;">
          ${s.origin_state} to ${s.destination_state}
        </div>
      </div>

      <!-- Live values -->
      ${anomalyWarning}
      ${warningHtml}

      <!-- Progress bar -->
      <div style="margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; margin-bottom:3px;">
          <span>${progressPercent}% Traveled</span>
          <span>${remainingKm} km left</span>
        </div>
        <div style="height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
          <div style="height:100%; width:${progressPercent}%; background:${riskColor}; border-radius:2px;"></div>
        </div>
      </div>

      <!-- Metrics grid -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:9.5px; color:#94a3b8; margin-bottom:4px; background:rgba(255,255,255,0.02); padding:6px; border-radius:6px;">
        <div>🚚 Carrier: <span style="color:#fff; font-weight:600;">${s.carrier_company}</span></div>
        <div>📦 Cargo: <span style="color:#fff; font-weight:600;">${s.cargo_type}</span></div>
        <div>💰 Value: <span style="color:#10b981; font-weight:600;">₹${cargoValLakhs} Lakhs</span></div>
        <div>⏱️ ETA: <span style="color:#a78bfa; font-weight:600;">${etaStr}</span></div>
        <div>🛂 Borders: <span style="color:#22d3ee; font-weight:600;">${borderCrossings} Crossing${borderCrossings > 1 ? "s" : ""}</span></div>
        <div>🚥 Tolls: <span style="color:#f59e0b; font-weight:600;">${tollPlazas} Plazas</span></div>
      </div>

      ${aiRecommendation}
    </div>
  `;
}

function parsePathCoords(pathStr, originCity, destCity) {
  const clean = pathStr.replace(/➔|➔|➔|➔|➔|➔|➔|➔|➔|➔|➔|->|➔/g, "->");
  const cities = clean
    .split("->")
    .map((c) =>
      c.replace("Port", "").replace("Link", "").replace("ICD", "").trim(),
    );
  const coords = [];
  const start = INDIAN_CITIES[originCity] || [20.0, 75.0];
  const end = INDIAN_CITIES[destCity] || [22.0, 77.0];

  cities.forEach((cityName, idx) => {
    let matched = false;
    for (const key of Object.keys(INDIAN_CITIES)) {
      if (
        cityName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(cityName.toLowerCase())
      ) {
        coords.push(INDIAN_CITIES[key]);
        matched = true;
        break;
      }
    }
    if (!matched) {
      const progress = idx / (cities.length - 1 || 1);
      const lat = start[0] + (end[0] - start[0]) * progress;
      const lng = start[1] + (end[1] - start[1]) * progress;
      coords.push([lat, lng]);
    }
  });

  return coords;
}

// ─── Layer Manager ───────────────────────────────────────────────────────────
class IndianLayerManager {
  truckMarkers = new Map();
  originMarkers = new Map();
  destMarkers = new Map();
  routeLines = new Map();
  alternateLines = [];

  constructor(map, onSelect) {
    this.map = map;
    this.onSelect = onSelect;
  }

  clearAlternateLines() {
    this.alternateLines.forEach((l) => l.remove());
    this.alternateLines = [];
  }

  update(shipments, selectedId, activeRerouteResult) {
    this.clearAlternateLines();
    const seen = new Set();

    shipments.forEach((s) => {
      seen.add(s.id);
      const isSelected = s.id === selectedId;

      // Robust Coordinates Fallback if city name not found in reference map
      const origCoords = INDIAN_CITIES[s.origin_city] || [
        s.origin_lat,
        s.origin_lng,
      ];
      const destCoords = INDIAN_CITIES[s.destination_city] || [
        s.destination_lat,
        s.destination_lng,
      ];
      const truckPos = [s.lat || s.origin_lat, s.lng || s.origin_lng];

      // ── Truck marker ──────────────────────────────────────────────────
      const icon = truckIcon(
        s.risk_level,
        isSelected,
        s.is_anomaly,
        s.weather_code,
      );
      if (this.truckMarkers.has(s.id)) {
        const m = this.truckMarkers.get(s.id);
        m.setLatLng(truckPos);
        m.setIcon(icon);
      } else {
        const m = L.marker(truckPos, {
          icon,
          zIndexOffset: isSelected ? 1000 : 100,
        })
          .addTo(this.map)
          .on("click", () => this.onSelect(s));
        // Premium detailed popup on click
        m.bindPopup(buildDetailedPopup(s), {
          maxWidth: 300,
          minWidth: 260,
          className: "leaflet-popup-premium",
        });
        this.truckMarkers.set(s.id, m);
      }

      // ── Origin city marker ────────────────────────────────────────────
      if (origCoords && !this.originMarkers.has(s.origin_city)) {
        const m = L.marker(origCoords, {
          icon: cityIcon("origin"),
          zIndexOffset: 50,
        }).addTo(this.map);
        const origCongestion = s.origin_wh_congestion_pct || 45;
        m.bindPopup(
          `<div style="background:#0a1628;color:#22d3ee;border:1px solid rgba(34,211,238,0.3);border-radius:8px;padding:8px 10px;font-family:Inter,sans-serif;font-size:11px;font-weight:700;box-shadow:0 4px 8px rgba(0,0,0,0.3)">
            <p style="margin:0;font-size:12px;color:#fff;">📍 Origin City: ${s.origin_city}</p>
            <p style="margin:4px 0 0 0;font-size:9.5px;color:#94a3b8;font-weight:normal;">Warehouse Congestion: <span style="color:#22d3ee;font-weight:700;">${origCongestion}%</span></p>
          </div>`,
          { className: "leaflet-popup-premium" },
        );
        this.originMarkers.set(s.origin_city, m);
      }

      // ── Destination city marker ───────────────────────────────────────
      if (destCoords && !this.destMarkers.has(s.destination_city)) {
        const m = L.marker(destCoords, {
          icon: cityIcon("destination"),
          zIndexOffset: 50,
        }).addTo(this.map);
        const destCongestion = s.dest_wh_congestion_pct || 40;
        m.bindPopup(
          `<div style="background:#0a1628;color:#a78bfa;border:1px solid rgba(167,139,250,0.3);border-radius:8px;padding:8px 10px;font-family:Inter,sans-serif;font-size:11px;font-weight:700;box-shadow:0 4px 8px rgba(0,0,0,0.3)">
            <p style="margin:0;font-size:12px;color:#fff;">🏁 Destination Hub: ${s.destination_city}</p>
            <p style="margin:4px 0 0 0;font-size:9.5px;color:#94a3b8;font-weight:normal;">Warehouse Congestion: <span style="color:#a78bfa;font-weight:700;">${destCongestion}%</span></p>
          </div>`,
          { className: "leaflet-popup-premium" },
        );
        this.destMarkers.set(s.destination_city, m);
      }

      // ── Route line ────────────────────────────────────────────────────
      if (origCoords && destCoords && !this.routeLines.has(s.id)) {
        const routeColor = RISK_COLOR[s.risk_level];
        // Full route (faded dashed)
        const fullCurve = buildCurve(origCoords, destCoords, 60);
        const fullLine = L.polyline(fullCurve, {
          color: routeColor,
          weight: 1.5,
          opacity: 0.15,
          dashArray: "4 6",
          smoothFactor: 1,
        }).addTo(this.map);

        // Progress line (truck pos to destination)
        const progressCurve = buildCurve(origCoords, truckPos, 30);
        const progressLine = L.polyline(progressCurve, {
          color: routeColor,
          weight: 2.5,
          opacity: 0.65,
          smoothFactor: 1,
        }).addTo(this.map);

        this.routeLines.set(s.id, [fullLine, progressLine]);
      }

      // ── Draw Alternate Route if actively rerouted ────────────────────
      if (
        isSelected &&
        activeRerouteResult &&
        activeRerouteResult.shipment_id === s.id &&
        activeRerouteResult.route_details
      ) {
        try {
          const altCoords = parsePathCoords(
            activeRerouteResult.route_details.path,
            s.origin_city,
            s.destination_city,
          );
          const altLine = L.polyline(altCoords, {
            color: "#10b981",
            weight: 3.5,
            opacity: 0.9,
            dashArray: "5 5",
            smoothFactor: 1,
          }).addTo(this.map);

          altLine.bindTooltip(
            `<div class="font-extrabold text-[9px] text-[#10b981] px-1">🔀 AI RECOMMENDED ALTERNATE ROUTE</div>`,
            {
              permanent: true,
              direction: "center",
              className:
                "leaflet-tooltip-premium border border-emerald-500/30 bg-[#071325]/90 rounded p-1 shadow-lg",
            },
          );

          this.alternateLines.push(altLine);
        } catch (err) {
          console.error("Error drawing alternate route:", err);
        }
      }
    });

    // Cleanup removed shipments
    this.truckMarkers.forEach((m, id) => {
      if (!seen.has(id)) {
        m.remove();
        this.truckMarkers.delete(id);
        this.routeLines.get(id)?.forEach((l) => l.remove());
        this.routeLines.delete(id);
      }
    });
  }

  destroy() {
    this.truckMarkers.forEach((m) => m.remove());
    this.originMarkers.forEach((m) => m.remove());
    this.destMarkers.forEach((m) => m.remove());
    this.routeLines.forEach((ls) => ls.forEach((l) => l.remove()));
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function IndianShipmentMap() {
  const { shipments, selectedShipment, selectShipment, activeRerouteResult } =
    useIndianStore();
  const { theme } = useThemeStore();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const managerRef = useRef(null);
  const tileLayerRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      // Center on India
      center: [22.2, 78.5],
      zoom: 5,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
      doubleClickZoom: true,
      boxZoom: true,
      tap: true,
    });

    // Tile layer
    const tileUrl =
      theme === "dark"
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    tileLayerRef.current = L.tileLayer(tileUrl, {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors © CARTO",
    }).addTo(map);

    // Controls
    L.control.zoom({ position: "topright" }).addTo(map);
    L.control
      .attribution({ position: "bottomright", prefix: false })
      .addAttribution(
        '<span style="font-size:9px;color:#334155">© OpenStreetMap © CARTO</span>',
      )
      .addTo(map);

    mapRef.current = map;
    managerRef.current = new IndianLayerManager(map, selectShipment);

    return () => {
      managerRef.current?.destroy();
      map.remove();
      mapRef.current = null;
      managerRef.current = null;
    };
  }, []);

  // Update markers on data change
  useEffect(() => {
    if (!managerRef.current) return;
    managerRef.current.update(
      shipments,
      selectedShipment?.id ?? null,
      activeRerouteResult,
    );
  }, [shipments, selectedShipment, activeRerouteResult]);

  // Update theme
  useEffect(() => {
    if (tileLayerRef.current) {
      const tileUrl =
        theme === "dark"
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
      tileLayerRef.current.setUrl(tileUrl);
    }
  }, [theme]);

  // Fly to selected shipment
  useEffect(() => {
    if (!mapRef.current || !selectedShipment) return;
    mapRef.current.flyTo(
      [
        selectedShipment.lat || selectedShipment.origin_lat,
        selectedShipment.lng || selectedShipment.origin_lng,
      ],
      7,
      { animate: true, duration: 1.5 },
    );
  }, [selectedShipment?.id]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Truck count overlay */}
      <div className="absolute top-3 left-3 z-[1000] bg-[#0a1628]/88 border border-white/10 rounded-lg px-3 py-1.5 backdrop-blur-md flex items-center gap-2 shadow-lg">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-slate-200 font-bold">
          {shipments.length} active trucks
        </span>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-3 z-[1000] flex items-center gap-2 bg-[#0a1628]/88 border border-white/10 rounded-lg px-3 py-2 backdrop-blur-md shadow-lg">
        <span className="text-[10px] text-slate-400 font-bold mr-1">Risk:</span>
        {[
          { color: "#10b981", label: "Low" },
          { color: "#f59e0b", label: "Med" },
          { color: "#f97316", label: "High" },
          { color: "#ef4444", label: "Crit" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className="h-2 w-2 rounded-full"
              style={{ background: color }}
            />
            <span className="text-[9px] text-slate-400 font-medium">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
