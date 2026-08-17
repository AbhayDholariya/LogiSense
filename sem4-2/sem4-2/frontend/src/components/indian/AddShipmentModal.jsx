// components/indian/AddShipmentModal.jsx
/**
 * Add New Shipment Modal — Admin Panel
 * Full form matching the Disruption System's Shipment model fields.
 * Auto-calculates distance, risk score, live weather on backend.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Truck,
  MapPin,
  Package,
  IndianRupee,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { useIndianStore } from "../../store/useIndianStore";

// All 30 supported cities (must match backend _CITY_COORDS)
const INDIAN_CITIES = [
  "Agra", "Ahmedabad", "Amritsar", "Bangalore", "Bhopal",
  "Chandigarh", "Chennai", "Coimbatore", "Delhi", "Guwahati",
  "Hyderabad", "Indore", "Jaipur", "Jodhpur", "Kanpur",
  "Kochi", "Kolkata", "Lucknow", "Ludhiana", "Mumbai",
  "Nagpur", "Nashik", "Patna", "Pune", "Rajkot",
  "Surat", "Udaipur", "Vadodara", "Varanasi", "Visakhapatnam",
];

const CARGO_TYPES = [
  "Electronics", "Pharmaceuticals", "Textiles", "Automotive Parts",
  "FMCG", "Perishables", "Industrial Machinery", "Chemicals",
  "Construction Materials", "Agricultural Produce", "General Cargo",
];

const TRANSPORT_MODES = ["road", "rail", "air", "sea", "multimodal"];

const VEHICLE_TYPES = [
  "Tata 407", "Tata Ace", "Eicher 10.90", "Mahindra Bolero Pickup",
  "Tata LPT 1613", "Ashok Leyland Dost", "Container Truck 20ft",
  "Container Truck 40ft", "Refrigerated Truck", "Tanker",
];

const PRIORITY_LEVELS = ["Express", "Priority", "Scheduled-Freight"];
const ORDER_TYPES = ["B2B", "B2C"];

const CARRIERS = [
  "Delhivery", "Blue Dart", "DTDC", "Gati", "TCI Freight",
  "XpressBees", "Ecom Express", "Ekart", "Shadowfax",
  "Amazon Logistics", "FedEx India", "Rivigo",
];

const DEFAULT_FORM = {
  origin_city: "",
  destination_city: "",
  carrier_company: "",
  cargo_type: "General Cargo",
  transport_mode: "road",
  vehicle_type: "Tata 407",
  vehicle_age_years: 3,
  driver_experience_years: 5,
  driver_rest_hours_prior: 8,
  priority_level: "Scheduled-Freight",
  order_type: "B2B",
  shipment_value_inr: 100000,
  fuel_price_per_litre: 104,
  carrier_on_time_rate: 0.85,
};

function FormField({ label, children, required, hint }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}

function SelectField({ value, onChange, options, placeholder, disabled }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none bg-black/20 dark:bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50 transition-colors pr-7 disabled:opacity-50"
      >
        {placeholder && (
          <option value="" disabled className="bg-slate-900">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-slate-900">
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
    </div>
  );
}

function NumberInput({ value, onChange, min, max, step = 1, disabled }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className="w-full bg-black/20 dark:bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50 transition-colors disabled:opacity-50"
    />
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

export function AddShipmentModal({ isOpen, onClose }) {
  const { addShipment, loading } = useIndianStore();
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [status, setStatus] = useState(null); // null | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState(null);

  const update = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.origin_city || !form.destination_city) {
      setStatus("error");
      setErrorMsg("Origin and destination cities are required.");
      return;
    }
    if (form.origin_city === form.destination_city) {
      setStatus("error");
      setErrorMsg("Origin and destination must be different cities.");
      return;
    }

    setStatus(null);
    setErrorMsg("");

    try {
      const res = await addShipment(form);
      setResult(res);
      setStatus("success");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        String(err);
      setStatus("error");
      setErrorMsg(msg.slice(0, 200));
    }
  };

  const handleClose = () => {
    setForm({ ...DEFAULT_FORM });
    setStatus(null);
    setErrorMsg("");
    setResult(null);
    onClose();
  };

  const destinationOptions = INDIAN_CITIES.filter(
    (c) => c !== form.origin_city
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Header ─────────────────────────────────────── */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-orange-500/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                    <Truck className="h-4.5 w-4.5 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      🇮🇳 Add New Shipment
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Creates shipment in disruption monitoring system with live risk analysis
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* ── Success State ───────────────────────────────── */}
              {status === "success" && result ? (
                <div className="flex-1 overflow-y-auto p-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-4"
                  >
                    <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="h-7 w-7 text-emerald-400" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">
                      Shipment Created!
                    </h3>
                    <p className="text-xs text-slate-400 mb-5">
                      {result.message}
                    </p>

                    {/* Shipment summary */}
                    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-left space-y-3 mb-5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Shipment ID</span>
                        <span className="font-mono text-sm font-bold text-orange-400">
                          {result.shipment?.id}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Route</span>
                        <span className="text-xs text-white font-medium">
                          {result.shipment?.origin_city} → {result.shipment?.destination_city}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Distance</span>
                        <span className="text-xs text-white">{result.shipment?.distance_km} km</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">ETA</span>
                        <span className="text-xs text-white">{result.shipment?.planned_transit_hours}h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Risk Score</span>
                        <span className={`text-xs font-bold ${
                          result.shipment?.risk_level === 'critical' ? 'text-red-400' :
                          result.shipment?.risk_level === 'high' ? 'text-orange-400' :
                          result.shipment?.risk_level === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {result.shipment?.risk_score?.toFixed(0)}/100 [{result.shipment?.risk_level?.toUpperCase()}]
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Weather</span>
                        <span className="text-xs text-white">{result.shipment?.weather_condition}</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setForm({ ...DEFAULT_FORM });
                          setStatus(null);
                          setResult(null);
                        }}
                        className="flex-1 py-2 rounded-lg border border-white/10 text-xs text-slate-300 hover:bg-white/[0.05] transition-colors"
                      >
                        Add Another
                      </button>
                      <button
                        onClick={handleClose}
                        className="flex-1 py-2 rounded-lg bg-orange-500/20 border border-orange-500/30 text-xs text-orange-300 hover:bg-orange-500/30 transition-colors font-bold"
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>
                </div>
              ) : (
                /* ── Form ─────────────────────────────────────── */
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                  <div className="p-6 space-y-5">
                    {/* Error banner */}
                    {status === "error" && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                      >
                        <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300">{errorMsg}</p>
                      </motion.div>
                    )}

                    {/* Section: Route */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-3.5 w-3.5 text-orange-400" />
                        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                          Route
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="Origin City" required>
                          <SelectField
                            value={form.origin_city}
                            onChange={(v) => update("origin_city", v)}
                            options={INDIAN_CITIES}
                            placeholder="Select origin..."
                          />
                        </FormField>
                        <FormField label="Destination City" required>
                          <SelectField
                            value={form.destination_city}
                            onChange={(v) => update("destination_city", v)}
                            options={destinationOptions}
                            placeholder="Select destination..."
                            disabled={!form.origin_city}
                          />
                        </FormField>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                        <span>📏</span>
                        Distance & ETA auto-calculated. Live weather fetched from OpenWeather API.
                      </p>
                    </div>

                    {/* Section: Carrier & Cargo */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                          Carrier & Cargo
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="Carrier Company" required>
                          <SelectField
                            value={form.carrier_company}
                            onChange={(v) => update("carrier_company", v)}
                            options={CARRIERS}
                            placeholder="Select carrier..."
                          />
                        </FormField>
                        <FormField label="Cargo Type">
                          <SelectField
                            value={form.cargo_type}
                            onChange={(v) => update("cargo_type", v)}
                            options={CARGO_TYPES}
                          />
                        </FormField>
                        <FormField label="Transport Mode">
                          <SelectField
                            value={form.transport_mode}
                            onChange={(v) => update("transport_mode", v)}
                            options={TRANSPORT_MODES}
                          />
                        </FormField>
                        <FormField label="Priority Level">
                          <SelectField
                            value={form.priority_level}
                            onChange={(v) => update("priority_level", v)}
                            options={PRIORITY_LEVELS}
                          />
                        </FormField>
                        <FormField label="Order Type">
                          <SelectField
                            value={form.order_type}
                            onChange={(v) => update("order_type", v)}
                            options={ORDER_TYPES}
                          />
                        </FormField>
                      </div>
                    </div>

                    {/* Section: Vehicle & Driver */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Truck className="h-3.5 w-3.5 text-purple-400" />
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                          Vehicle & Driver
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="Vehicle Type">
                          <SelectField
                            value={form.vehicle_type}
                            onChange={(v) => update("vehicle_type", v)}
                            options={VEHICLE_TYPES}
                          />
                        </FormField>
                        <FormField label="Vehicle Age (years)" hint="Older = higher risk score">
                          <NumberInput
                            value={form.vehicle_age_years}
                            onChange={(v) => update("vehicle_age_years", v)}
                            min={0} max={20} step={0.5}
                          />
                        </FormField>
                        <FormField label="Driver Experience (years)" hint="Less experience = higher risk">
                          <NumberInput
                            value={form.driver_experience_years}
                            onChange={(v) => update("driver_experience_years", v)}
                            min={0} max={40} step={0.5}
                          />
                        </FormField>
                        <FormField label="Driver Rest Hours (prior)">
                          <NumberInput
                            value={form.driver_rest_hours_prior}
                            onChange={(v) => update("driver_rest_hours_prior", v)}
                            min={0} max={24} step={0.5}
                          />
                        </FormField>
                      </div>
                    </div>

                    {/* Section: Value & Financials */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <IndianRupee className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          Value & Financials
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="Shipment Value (₹)">
                          <NumberInput
                            value={form.shipment_value_inr}
                            onChange={(v) => update("shipment_value_inr", v)}
                            min={1000} max={50000000} step={1000}
                          />
                        </FormField>
                        <FormField label="Fuel Price (₹/litre)">
                          <NumberInput
                            value={form.fuel_price_per_litre}
                            onChange={(v) => update("fuel_price_per_litre", v)}
                            min={80} max={150} step={0.5}
                          />
                        </FormField>
                        <FormField
                          label="Carrier On-Time Rate (0–1)"
                          hint="0.85 = 85% on-time delivery"
                        >
                          <NumberInput
                            value={form.carrier_on_time_rate}
                            onChange={(v) => update("carrier_on_time_rate", v)}
                            min={0} max={1} step={0.01}
                          />
                        </FormField>
                      </div>
                    </div>

                    {/* Info note */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <span className="text-sm mt-0.5">🤖</span>
                      <div>
                        <p className="text-[11px] text-blue-300 font-bold mb-0.5">
                          AI Risk Analysis Auto-Applied
                        </p>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Backend will auto-calculate: distance (Haversine × 1.3), ETA,
                          live weather from OpenWeather, ML risk score using training
                          data patterns (vehicle age, driver exp, weather severity,
                          carrier rate). An initial alert will be created automatically.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Footer ───────────────────────────────────── */}
                  <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08] flex-shrink-0 bg-white/[0.02]">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 rounded-lg border border-white/10 text-xs text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !form.origin_city || !form.destination_city || !form.carrier_company}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Truck className="h-3.5 w-3.5" />
                          Create Shipment
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
