// components/indian/AIDecisionPanel.tsx
/**
 * AI Decision Panel for Indian Supply Chain
 * Shows GPT-4o-mini powered analysis and recommendations
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  Loader,
  Zap,
  Shield,
} from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { useIndianStore } from "../../store/useIndianStore";

export function AIDecisionPanel() {
  const {
    selectedShipment,
    analysisResult,
    analysisLoading,
    analyzeShipment,
    clearAnalysis,
  } = useIndianStore();

  const [expanded, setExpanded] = useState(false);

  const handleAnalyze = async () => {
    if (!selectedShipment) return;
    setExpanded(true);
    await analyzeShipment(selectedShipment);
  };

  const decisionColor = (decision) => {
    const d = decision.toUpperCase();
    if (d.includes("REROUTE") || d.includes("CRITICAL") || d.includes("URGENT"))
      return "text-red-400";
    if (d.includes("MONITOR") || d.includes("HIGH")) return "text-amber-400";
    if (d.includes("APPROVE") || d.includes("LOW")) return "text-emerald-400";
    return "text-cyan-400";
  };

  const decisionBg = (decision) => {
    const d = decision.toUpperCase();
    if (d.includes("REROUTE") || d.includes("CRITICAL") || d.includes("URGENT"))
      return "bg-red-500/10 border-red-500/20";
    if (d.includes("MONITOR") || d.includes("HIGH"))
      return "bg-amber-500/10 border-amber-500/20";
    if (d.includes("APPROVE") || d.includes("LOW"))
      return "bg-emerald-500/10 border-emerald-500/20";
    return "bg-cyan-500/10 border-cyan-500/20";
  };

  return (
    <GlassCard className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Cpu className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              🤖 AI Decision Engine
            </h3>
            <p className="text-[10px] text-purple-400 font-medium">
              Groq + Ollama Mistral + XGBoost
            </p>
          </div>
        </div>
        {analysisResult && (
          <button
            onClick={clearAnalysis}
            className="text-[10px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors px-2 py-1 rounded bg-black/5 dark:bg-white/5"
          >
            Clear
          </button>
        )}
      </div>

      {/* No shipment selected */}
      {!selectedShipment && (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <Shield className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-xs text-center">
            Click a shipment on the map or in the list to analyze with AI
          </p>
        </div>
      )}

      {/* Shipment selected — show details */}
      {selectedShipment && (
        <div className="space-y-3">
          {/* Selected shipment info */}
          <div className="p-3 rounded-lg bg-black/5 dark:bg-white/[0.04] border border-black/5 dark:border-white/[0.06]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono font-bold text-cyan-400">
                {selectedShipment.id}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedShipment.risk_level === "critical"
                    ? "bg-red-500/20 text-red-400"
                    : selectedShipment.risk_level === "high"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {selectedShipment.risk_score.toFixed(0)}/100
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {selectedShipment.origin_city} →{" "}
              {selectedShipment.destination_city}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {selectedShipment.carrier_company} · {selectedShipment.cargo_type}
            </p>
            {selectedShipment.is_delayed && (
              <p className="text-[10px] text-amber-400 mt-1">
                ⏰ Delayed by{" "}
                {selectedShipment.delay_duration_minutes?.toFixed(0)} min
              </p>
            )}
          </div>

          {/* Analyze button */}
          {!analysisResult && (
            <motion.button
              onClick={handleAnalyze}
              disabled={analysisLoading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-500/20 text-cyan-400 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {analysisLoading ? (
                <>
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  Analyze with AI (Groq + Mistral + ML)
                </>
              )}
            </motion.button>
          )}

          {/* Analysis Results */}
          <AnimatePresence>
            {analysisResult && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                {/* Risk Score */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded-lg bg-black/5 dark:bg-white/[0.04]">
                    <p
                      className={`text-lg font-bold ${
                        analysisResult.risk_score > 65
                          ? "text-red-400"
                          : analysisResult.risk_score > 40
                            ? "text-amber-400"
                            : "text-emerald-400"
                      }`}
                    >
                      {analysisResult.risk_score.toFixed(0)}
                    </p>
                    <p className="text-[9px] text-slate-500 font-medium">
                      Risk Score
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-black/5 dark:bg-white/[0.04]">
                    <p className="text-lg font-bold text-purple-400">
                      {(analysisResult.delay_probability * 100).toFixed(0)}%
                    </p>
                    <p className="text-[9px] text-slate-500 font-medium">
                      Delay Prob
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-black/5 dark:bg-white/[0.04]">
                    <p
                      className={`text-base font-bold ${analysisResult.is_anomaly ? "text-amber-400" : "text-emerald-400"}`}
                    >
                      {analysisResult.is_anomaly ? "⚠️ Yes" : "✓ No"}
                    </p>
                    <p className="text-[9px] text-slate-500 font-medium">
                      Anomaly
                    </p>
                  </div>
                </div>

                {/* LLM Decision */}
                {analysisResult.llm_decision && (
                  <div
                    className={`p-3 rounded-lg border ${decisionBg(analysisResult.llm_decision.decision)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-xs font-bold ${decisionColor(analysisResult.llm_decision.decision)}`}
                      >
                        🤖 {analysisResult.llm_decision.decision}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {(analysisResult.llm_decision.confidence * 100).toFixed(
                          0,
                        )}
                        % confidence
                      </span>
                    </div>
                    {analysisResult.llm_decision.source && (
                      <p className="text-[9px] text-purple-400/70 mb-1.5 font-mono">
                        via {analysisResult.llm_decision.source}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                      {analysisResult.llm_decision.explanation}
                    </p>

                    {/* Action items toggle */}
                    {analysisResult.llm_decision.action_items.length > 0 && (
                      <>
                        <button
                          onClick={() => setExpanded(!expanded)}
                          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                        >
                          {expanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                          {analysisResult.llm_decision.action_items.length}{" "}
                          action items
                        </button>

                        <AnimatePresence>
                          {expanded && (
                            <motion.ul
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-2 space-y-1 overflow-hidden"
                            >
                              {analysisResult.llm_decision.action_items.map(
                                (item, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 text-[10px] text-slate-500 dark:text-slate-400"
                                  >
                                    <CheckCircle className="h-3 w-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                                    {item}
                                  </li>
                                ),
                              )}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </div>
                )}

                {/* Risk Factors */}
                {analysisResult.top_risk_factors.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold mb-1.5">
                      ⚡ Top Risk Factors
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {analysisResult.top_risk_factors.map((f, i) => (
                        <span
                          key={i}
                          className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 rounded px-1.5 py-0.5 font-medium"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recovery Actions */}
                {analysisResult.recovery_actions &&
                  analysisResult.recovery_actions.length > 0 && (
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold mb-1.5">
                        🛡️ Recovery Plan
                      </p>
                      <div className="space-y-1">
                        {analysisResult.recovery_actions
                          .slice(0, 3)
                          .map((action, i) => (
                            <p
                              key={i}
                              className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5"
                            >
                              <AlertTriangle className="h-2.5 w-2.5 text-amber-400 flex-shrink-0 mt-0.5" />
                              {action}
                            </p>
                          ))}
                      </div>
                    </div>
                  )}

                {/* Re-analyze button */}
                <motion.button
                  onClick={handleAnalyze}
                  disabled={analysisLoading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Zap className="h-3 w-3" />
                  Re-analyze
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </GlassCard>
  );
}
