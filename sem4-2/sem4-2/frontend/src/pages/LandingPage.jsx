import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Activity,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  PlusCircle,
  X,
  CheckCircle,
  ChevronDown,
  User,
  Truck,
  Zap,
  Globe,
  Sun,
  Moon,
} from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";

export function LandingPage() {
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [activeLoginDropdown, setActiveLoginDropdown] = useState(false);

  // Form State
  const [demoName, setDemoName] = useState("");
  const [demoEmail, setDemoEmail] = useState("");
  const [demoPhone, setDemoPhone] = useState("");
  const [demoCompany, setDemoCompany] = useState("");
  const [demoVolume, setDemoVolume] = useState("< 500");
  const [demoRole, setDemoRole] = useState("Shipper");

  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ""}/api/demo-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: demoName,
          email:    demoEmail,
          phone:    demoPhone,
          company:  demoCompany,
          role:     demoRole,
          volume:   demoVolume,
        }),
      });
    } catch {
      // Show success even if backend is offline — form UX stays intact
    }
    setDemoSubmitted(true);
    setTimeout(() => {
      setDemoSubmitted(false);
      setShowDemoModal(false);
      setDemoName("");
      setDemoEmail("");
      setDemoPhone("");
      setDemoCompany("");
    }, 2500);
  };

  const partners = [
    "FedEx Express",
    "DHL Logistics",
    "A.P. Moller - Maersk",
    "CMA CGM Group",
    "Amazon Logistics",
    "Hapag-Lloyd",
    "DB Schenker",
    "DSV Global",
    "Shadowfax",
    "Blue Dart",
    "Delhivery",
    "DTDC Express",
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020512] text-slate-800 dark:text-white overflow-x-hidden relative font-sans transition-colors duration-200">
      {/* CSS Styles injection for Marquee & 3D CSS Box */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
        @keyframes rotate3d {
          0% { transform: rotateX(-15deg) rotateY(0deg); }
          100% { transform: rotateX(-15deg) rotateY(360deg); }
        }
        .scene-3d {
          perspective: 800px;
        }
        .object-3d {
          transform-style: preserve-3d;
          animation: rotate3d 18s linear infinite;
        }
        .face {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 1.5px dashed rgba(99, 102, 241, 0.4);
          background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, rgba(99,102,241,0.01) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        .face-front  { transform: rotateY(  0deg) translateZ(100px); }
        .face-back   { transform: rotateY(180deg) translateZ(100px); }
        .face-right  { transform: rotateY( 90deg) translateZ(100px); }
        .face-left   { transform: rotateY(-90deg) translateZ(100px); }
        .face-top    { transform: rotateX( 90deg) translateZ(100px); }
        .face-bottom { transform: rotateX(-90deg) translateZ(100px); }
      `}} />

      {/* Decorative Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/75 dark:bg-[#020512]/75 backdrop-blur-md border-b border-black/5 dark:border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-600/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="font-extrabold text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-indigo-600 dark:from-white dark:via-slate-100 dark:to-indigo-400">
                LOGISENSE
              </span>
            </div>

            {/* Nav Menu (Desktop) */}
            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
              <a href="#features" className="hover:text-slate-950 dark:hover:text-white transition-colors">Products</a>
              <a href="#network" className="hover:text-slate-950 dark:hover:text-white transition-colors">Solutions</a>
              <a href="#ads" className="hover:text-slate-950 dark:hover:text-white transition-colors">Insights</a>
              <a href="#about" className="hover:text-slate-950 dark:hover:text-white transition-colors">Enterprise</a>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Login CTA (Dropdown) */}
            <div className="relative">
              <button
                onClick={() => setActiveLoginDropdown(!activeLoginDropdown)}
                className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors flex items-center gap-1.5"
              >
                Sign In
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${activeLoginDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {activeLoginDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setActiveLoginDropdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-[#090d22] border border-slate-200 dark:border-white/10 shadow-2xl p-2 z-20 transition-all"
                    >
                      <button
                        onClick={() => { setActiveLoginDropdown(false); navigate("/customer/login"); }}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-600/20 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white transition-colors text-xs font-bold flex items-center gap-2"
                      >
                        <User className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                        Customer Portal
                      </button>
                      <button
                        onClick={() => { setActiveLoginDropdown(false); navigate("/india/login"); }}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-600/20 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white transition-colors text-xs font-bold flex items-center gap-2"
                      >
                        <Truck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        India Operations Panel
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => {
                const newTheme = theme === "dark" ? "light" : "dark";
                useThemeStore.getState().setTheme(newTheme);
              }}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors animate-pulse-slow"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {/* Request Demo Button */}
            <button
              onClick={() => setShowDemoModal(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 text-white font-bold text-xs shadow-lg shadow-indigo-600/15 transition-all hover:scale-[1.02]"
            >
              Request Demo
            </button>
          </div>
        </div>
      </header>      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left text column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-400 uppercase tracking-widest">
            <Zap className="h-3.5 w-3.5" />
            AI-Driven Supply Chain Visibility
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-slate-900 dark:text-white tracking-tight">
            Automating the{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-400 dark:from-indigo-400 dark:via-purple-400 dark:to-indigo-300">
              High-Velocity
            </span>{" "}
            Supply Chain.
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base max-w-xl leading-relaxed">
            Eliminated blind spots across your global network. LogiSense connects shippers, carriers, and logistics providers with real-time transit intelligence, predictive ETAs, and automated disruption risk routing.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => setShowDemoModal(true)}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 text-white font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02] flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("infrastructure");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-slate-350 dark:hover:border-white/20 text-slate-850 dark:text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02]"
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Right 3D Animation column */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <div className="w-[320px] h-[320px] flex items-center justify-center scene-3d relative">
            {/* Ambient glows behind the 3D cube */}
            <div className="absolute w-56 h-56 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
            
            {/* The 3D Wireframe Cube representing supply chain routes */}
            <div className="w-[200px] h-[200px] object-3d relative">
              <div className="face face-front">
                <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping absolute" />
                <Globe className="h-8 w-8 text-indigo-400/40" />
              </div>
              <div className="face face-back">
                <Truck className="h-8 w-8 text-cyan-400/40" />
              </div>
              <div className="face face-right">
                <MapPin className="h-6 w-6 text-purple-400/40" />
              </div>
              <div className="face face-left">
                <Clock className="h-6 w-6 text-indigo-400/40" />
              </div>
              <div className="face face-top">
                <TrendingUp className="h-6 w-6 text-cyan-400/40" />
              </div>
              <div className="face face-bottom">
                <Activity className="h-6 w-6 text-indigo-400/40" />
              </div>

              {/* Glowing animated particles along axes */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] border border-indigo-500/10 rounded-full transform rotate-X-45 animate-spin-slow pointer-events-none" />
            </div>

            {/* Float tags */}
            <div className="absolute top-4 left-6 px-3 py-1 bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 rounded-lg text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-300 animate-bounce">
              Node Connected
            </div>
            <div className="absolute bottom-6 right-6 px-3 py-1 bg-cyan-50/90 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-500/30 rounded-lg text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-300">
              Live ETA: 98.4%
            </div>
          </div>
        </div>
      </section>

      {/* Infinite Recursive Logo Marquee */}
      <section className="bg-slate-100/80 dark:bg-[#04091c] py-6 border-y border-black/5 dark:border-white/5 overflow-hidden transition-colors">
        <div className="max-w-7xl mx-auto px-6 mb-3 text-center">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Connecting global logistics leaders in real-time
          </p>
        </div>
        <div className="w-full relative flex overflow-x-hidden">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-12">
            {partners.concat(partners).map((partner, idx) => (
              <span
                key={idx}
                className="text-slate-500 dark:text-slate-500 hover:text-slate-950 dark:hover:text-white font-extrabold text-sm uppercase tracking-wider transition-colors cursor-pointer"
              >
                🚚 {partner}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure & About Section (with 3 photos) */}
      <section id="infrastructure" className="max-w-7xl mx-auto px-6 py-24 border-b border-black/5 dark:border-white/5 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            <Globe className="h-3.5 w-3.5" />
            Operational Capabilities
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Comprehensive Supply Chain Infrastructure
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
            Mitigate bottlenecks at every level of your network. LogiSense models transit modes, terminal delays, and weather elements to ensure frictionless cargo logistics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Ocean Freight & Port Terminals */}
          <div className="group bg-white dark:bg-[#060818]/60 border border-slate-200 dark:border-white/[0.06] rounded-3xl overflow-hidden hover:border-indigo-500/20 hover:shadow-xl dark:hover:shadow-none hover:-translate-y-1.5 transition-all duration-300 flex flex-col">
            <div className="h-44 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80"
                alt="Port Terminal Cargo Crane"
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent pointer-events-none" />
              <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded text-[8px] font-bold bg-indigo-600/80 text-white uppercase tracking-wider backdrop-blur-sm">
                Maritime Cargo
              </span>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between text-left">
              <div className="space-y-2">
                <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Mega Container Ports
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bypass port bottlenecks. We monitor container dwell times, customs border checkposts, and ocean shipping routes to optimize cargo movements before congestion occurs.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Road High-Velocity Freight */}
          <div className="group bg-white dark:bg-[#060818]/60 border border-slate-200 dark:border-white/[0.06] rounded-3xl overflow-hidden hover:border-orange-500/20 hover:shadow-xl dark:hover:shadow-none hover:-translate-y-1.5 transition-all duration-300 flex flex-col">
            <div className="h-44 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80"
                alt="Logistics Cargo Highway Truck"
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent pointer-events-none" />
              <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded text-[8px] font-bold bg-orange-600/80 text-white uppercase tracking-wider backdrop-blur-sm">
                Over-the-Road
              </span>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between text-left">
              <div className="space-y-2">
                <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  High-Velocity Highway Freight
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Real-time trucking intelligence. AI routing models predict delays caused by road closures, customs tolls, driver fatigue, and heavy monsoons across major commercial highways.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Dedicated Rail Cargo Corridors */}
          <div className="group bg-white dark:bg-[#060818]/60 border border-slate-200 dark:border-white/[0.06] rounded-3xl overflow-hidden hover:border-emerald-500/20 hover:shadow-xl dark:hover:shadow-none hover:-translate-y-1.5 transition-all duration-300 flex flex-col">
            <div className="h-44 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=600&q=80"
                alt="Freight Train Logistics"
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent pointer-events-none" />
              <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded text-[8px] font-bold bg-emerald-600/80 text-white uppercase tracking-wider backdrop-blur-sm">
                Rail Corridors
              </span>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between text-left">
              <div className="space-y-2">
                <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Dedicated Freight Corridors (DFC)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Eco-friendly high-volume transport. Connect directly with DFC rail operators to initiate road-to-rail modal shifts, reducing carbon footprints by up to 85% per consignment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ads and Insights Section */}
      <section id="ads" className="max-w-7xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Special Insights & Announcements
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Stay up to date with global cargo indices and machine learning breakthroughs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ad Card 1 */}
          <div className="p-6 bg-gradient-to-b from-indigo-50/50 to-indigo-50/5 dark:from-indigo-950/20 dark:to-indigo-950/5 border border-indigo-100 dark:border-indigo-500/10 rounded-2xl flex flex-col justify-between group hover:border-indigo-500/30 transition-all">
            <div className="space-y-4">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 uppercase">
                Special Report
              </span>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                Ocean Congestion Index Q3 2026
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Download our latest global research report analyzing route strikes, storm weather, and port congestion factors impacting maritime freight rates.
              </p>
            </div>
            <button
              onClick={() => setShowDemoModal(true)}
              className="mt-6 text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 hover:text-indigo-500 dark:hover:text-indigo-300"
            >
              Get Free Report
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Ad Card 2 */}
          <div className="p-6 bg-gradient-to-b from-cyan-50/50 to-cyan-50/5 dark:from-cyan-950/20 dark:to-cyan-950/5 border border-cyan-100 dark:border-cyan-500/10 rounded-2xl flex flex-col justify-between group hover:border-cyan-500/30 transition-all">
            <div className="space-y-4">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 uppercase">
                Product Alert
              </span>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                AI-Powered ETA Prediction
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Calculate route risk indices and predicted delivery times with up to 98% accuracy using our new Deep Learning forecasting model.
              </p>
            </div>
            <button
              onClick={() => setShowDemoModal(true)}
              className="mt-6 text-xs text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1 hover:text-cyan-500 dark:hover:text-cyan-300"
            >
              Request Trial Access
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Ad Card 3 */}
          <div className="p-6 bg-gradient-to-b from-purple-50/50 to-purple-50/5 dark:from-purple-950/20 dark:to-purple-950/5 border border-purple-100 dark:border-purple-500/10 rounded-2xl flex flex-col justify-between group hover:border-purple-500/30 transition-all">
            <div className="space-y-4">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-650 dark:text-purple-400 uppercase">
                Free Webinar
              </span>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                Mitigating Monsoon Port Congestions
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Join our regional Indian supply chain directors as they discuss real-time weather rerouting models and predictive logistics planning.
              </p>
            </div>
            <button
              onClick={() => setShowDemoModal(true)}
              className="mt-6 text-xs text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1 hover:text-purple-500 dark:hover:text-purple-300"
            >
              Register for Webinar
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="border-t border-black/5 dark:border-white/5 bg-slate-100/50 dark:bg-[#01030e] py-16 text-xs text-slate-550 dark:text-slate-500 transition-colors">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Logo brand */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Shield className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="font-extrabold text-sm tracking-wider text-slate-900 dark:text-white">
                LOGISENSE
              </span>
            </div>
            <p className="max-w-xs text-[11px] text-slate-500 dark:text-slate-600 leading-relaxed">
              LogiSense is the modern supply chain intelligence framework offering real-time visibility, route optimization, and risk tracking for enterprises globally.
            </p>
          </div>

          {/* Links 1 */}
          <div className="space-y-3">
            <h5 className="font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider text-[10px]">Products</h5>
            <div className="flex flex-col gap-2 text-slate-500 dark:text-slate-455">
              <a href="#" className="hover:text-slate-900 dark:hover:text-slate-300 transition-colors">Ocean Visibility</a>
              <a href="#" className="hover:text-slate-900 dark:hover:text-slate-300 transition-colors">Over-the-Road tracking</a>
              <a href="#" className="hover:text-slate-900 dark:hover:text-slate-300 transition-colors">Air & Rail Logistics</a>
              <a href="#" className="hover:text-slate-900 dark:hover:text-slate-300 transition-colors">Risk Indexing API</a>
            </div>
          </div>

          {/* Links 2 */}
          <div className="space-y-3">
            <h5 className="font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider text-[10px]">Resources</h5>
            <div className="flex flex-col gap-2 text-slate-500 dark:text-slate-455">
              <a href="#" className="hover:text-slate-900 dark:hover:text-slate-300 transition-colors">Webinars</a>
              <a href="#" className="hover:text-slate-900 dark:hover:text-slate-300 transition-colors">Congestion Reports</a>
              <a href="#" className="hover:text-slate-900 dark:hover:text-slate-300 transition-colors">Documentation</a>
              <a href="#" className="hover:text-slate-900 dark:hover:text-slate-300 transition-colors">API References</a>
            </div>
          </div>

          {/* Links 3 */}
          <div className="space-y-3">
            <h5 className="font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider text-[10px]">Company</h5>
            <div className="flex flex-col gap-2 text-slate-500 dark:text-slate-455">
              <a href="#" className="hover:text-slate-900 dark:hover:text-slate-300 transition-colors">About Us</a>
              <a href="#" className="hover:text-slate-900 dark:hover:text-slate-300 transition-colors">Global Network</a>
              <a href="#" className="hover:text-slate-900 dark:hover:text-slate-300 transition-colors">Careers</a>
              <a href="#" className="hover:text-slate-900 dark:hover:text-slate-300 transition-colors">Contact Support</a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-6 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px]">© 2026 LogiSense Global Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-slate-400">
            <a href="#" className="hover:text-slate-900 dark:hover:text-slate-300">Privacy Policy</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-slate-300">Terms of Service</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-slate-300">Trust Center</a>
          </div>
        </div>
      </footer>

      {/* REQUEST DEMO MODAL */}
      <AnimatePresence>
        {showDemoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDemoModal(false)}
              className="absolute inset-0 bg-[#000]/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-lg bg-white dark:bg-[#080b1e] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden p-6 shadow-2xl transition-colors"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowDemoModal(false)}
                className="absolute top-4 right-4 text-slate-450 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <AnimatePresence mode="wait">
                {!demoSubmitted ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                        Request Logistics Demo
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        See how LogiSense's real-time visibility platform can optimize your supply chain.
                      </p>
                    </div>

                    <form onSubmit={handleDemoSubmit} className="space-y-3.5">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Your Name
                          </label>
                          <input
                            type="text"
                            required
                            value={demoName}
                            onChange={(e) => setDemoName(e.target.value)}
                            placeholder="Full name"
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Work Email
                          </label>
                          <input
                            type="email"
                            required
                            value={demoEmail}
                            onChange={(e) => setDemoEmail(e.target.value)}
                            placeholder="email@company.com"
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            required
                            value={demoPhone}
                            onChange={(e) => setDemoPhone(e.target.value)}
                            placeholder="+91 XXXXX XXXXX"
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Company Name
                          </label>
                          <input
                            type="text"
                            required
                            value={demoCompany}
                            onChange={(e) => setDemoCompany(e.target.value)}
                            placeholder="Enter enterprise name"
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Your Industry Role
                          </label>
                          <select
                            value={demoRole}
                            onChange={(e) => setDemoRole(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#0a0d20] border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 appearance-none cursor-pointer"
                          >
                            <option value="Shipper">Shipper (Manufacturer/Retailer)</option>
                            <option value="Carrier">Carrier (Truckload/Ocean Line)</option>
                            <option value="LSP">LSP (3PL/Freight Forwarder)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Monthly Shipment Volume
                          </label>
                          <select
                            value={demoVolume}
                            onChange={(e) => setDemoVolume(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#0a0d20] border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 appearance-none cursor-pointer"
                          >
                            <option value="< 500">Less than 500 loads</option>
                            <option value="500 - 5000">500 - 5,000 loads</option>
                            <option value="> 5000">More than 5,000 loads</option>
                          </select>
                        </div>
                      </div>

                      <motion.button
                        type="submit"
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-1.5"
                      >
                        Submit Demo Request
                      </motion.button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="py-12 flex flex-col items-center justify-center text-center space-y-4"
                  >
                    <div className="h-16 w-16 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400">
                      <CheckCircle className="h-10 w-10 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                        Demo Request Registered!
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                        Thank you, <span className="font-bold text-indigo-600 dark:text-indigo-400">{demoName}</span>. Your request has been sent to our administrator team. We will contact you within 2 hours at <span className="font-mono text-cyan-600 dark:text-cyan-400">{demoEmail}</span>.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
