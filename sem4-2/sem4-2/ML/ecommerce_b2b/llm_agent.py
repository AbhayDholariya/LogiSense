# ML/ecommerce_b2b/llm_agent.py
"""
Indian Supply Chain LLM Agent
==============================
Dual-LLM Architecture:
  - Primary:  Groq API  (llama-3.3-70b-versatile) — fast cloud inference
  - Secondary: Ollama   (mistral)                  — local fallback + reasoning
Both models reason together; Groq drafts the decision, Ollama cross-checks and
refines it, then the best-confidence answer is returned.
API keys are loaded exclusively from environment variables — never hardcoded.
"""

import os
import json
import re
import logging
import requests
from dataclasses import dataclass
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# ─── Config ───────────────────────────────────────────────────────────────────
GROQ_API_KEY   = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL     = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_BASE_URL  = "https://api.groq.com/openai/v1/chat/completions"

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "mistral")

# Timeout in seconds for each provider
GROQ_TIMEOUT   = 30
OLLAMA_TIMEOUT = 60


@dataclass
class LLMDecision:
    """LLM decision output."""
    decision: str
    explanation: str
    action_items: List[str]
    confidence: float
    estimated_impact: str
    source: str = "groq+ollama"   # tracks which backend was used


# ─── Main Agent ───────────────────────────────────────────────────────────────

class IndianSupplyChainLLMAgent:
    """
    Dual-LLM agent: Groq (primary) + Ollama Mistral (secondary).
    Decision flow:
      1. Call Groq for initial structured JSON decision.
      2. Call Ollama Mistral with the same prompt for independent reasoning.
      3. Merge: if both agree on decision → boost confidence.
                if they disagree    → use the higher-confidence answer and flag.
      4. If Groq is unavailable → fall back to Ollama only.
      5. If both unavailable    → rule-based fallback.
    """

    def __init__(self):
        # Keys read from env only — never exposed in logs or responses
        self._groq_key = GROQ_API_KEY
        self._groq_model = GROQ_MODEL
        self._ollama_url = OLLAMA_BASE_URL
        self._ollama_model = OLLAMA_MODEL

        groq_ok = bool(self._groq_key)
        logger.info(
            "[LLM] Initialized — Groq: %s | Ollama: %s (model: %s)",
            "✓ ready" if groq_ok else "✗ no key",
            self._ollama_url,
            self._ollama_model,
        )

    # ─── Public methods ───────────────────────────────────────────────────────

    def explain_risk(
        self,
        shipment_id: str,
        risk_analysis: dict,
        anomaly_result: dict,
        language: str = "hinglish",
        shipment_data: dict = None,
    ) -> LLMDecision:
        """Generate AI explanation for risk analysis using dual-LLM reasoning."""
        prompt = self._build_risk_prompt(
            shipment_id, risk_analysis, anomaly_result, language, shipment_data
        )
        return self._dual_call(prompt, context="risk_explanation")

    def compare_routes(
        self,
        shipment_id: str,
        route_a: dict,
        route_b: dict,
        context: dict = None,
    ) -> LLMDecision:
        """AI-powered route comparison."""
        context = context or {}
        prompt = (
            "You are an Indian logistics expert. Compare these two routes and recommend the best one.\n\n"
            f"SHIPMENT: {shipment_id}\n\n"
            f"ROUTE A:\n{json.dumps(route_a, indent=2)}\n\n"
            f"ROUTE B:\n{json.dumps(route_b, indent=2)}\n\n"
            f"CONTEXT:\n{json.dumps(context, indent=2)}\n\n"
            "Provide your recommendation in JSON format:\n"
            '{"decision": "Route A or Route B", "explanation": "Clear explanation why", '
            '"action_items": ["specific actions"], "confidence": 0.0-1.0, '
            '"estimated_impact": "positive/neutral/negative"}'
        )
        return self._dual_call(prompt, context="route_comparison")

    def prioritize_cargo(self, truck_id: str, cargo_list: List[dict]) -> LLMDecision:
        """Dynamic cargo prioritization."""
        prompt = (
            f"You are an Indian logistics operations manager. Truck ID: {truck_id} "
            "needs to prioritize cargo due to capacity constraints.\n\n"
            f"CARGO LIST:\n{json.dumps(cargo_list, indent=2)}\n\n"
            "Rank from highest to lowest priority considering: urgency, customer importance, "
            "cargo value, perishability, SLA commitments.\n\n"
            "Provide prioritization in JSON format:\n"
            '{"decision": "Priority order: [cargo IDs]", "explanation": "Reasoning", '
            '"action_items": ["actions for each cargo"], "confidence": 0.0-1.0, '
            '"estimated_impact": "description"}'
        )
        return self._dual_call(prompt, context="cargo_priority")

    def generate_recovery(self, cascade_analysis: dict) -> LLMDecision:
        """Generate recovery plan for cascading failure."""
        nodes_list = cascade_analysis.get("cascade_nodes", [])
        nodes_summary = "\n".join(
            f"- {n.get('city')}: Level {n.get('cascade_level')} cascade, "
            f"Delay: {n.get('estimated_delay_hours')}h, "
            f"Affected: {n.get('affected_shipments_count')} shipments, "
            f"Loss: INR {n.get('financial_impact_inr', 0):,.2f}"
            for n in nodes_list
        )
        total_impact = cascade_analysis.get("total_financial_impact_inr", 0)
        prompt = (
            "You are the principal crisis optimizer for an Indian B2B logistics firm. "
            "A cascading failure has triggered.\n\n"
            "CRISIS CONTEXT:\n"
            f"- Trigger City: {cascade_analysis.get('trigger_city')}\n"
            f"- Trigger Reason: {cascade_analysis.get('trigger_reason')}\n"
            f"- Total Affected Nodes: {cascade_analysis.get('total_affected_nodes')}\n"
            f"- Total Affected Shipments: {cascade_analysis.get('total_affected_shipments')}\n"
            f"- Total Financial Impact (INR): INR {total_impact:,.2f}\n"
            f"- Estimated Recovery Time: {cascade_analysis.get('estimated_recovery_hours')} hours\n\n"
            f"CASCADE PROPAGATION LOGS:\n{nodes_summary}\n\n"
            "Calculate the breakdown of losses (vehicle idle cost, driver overtime, "
            "SLA penalties, customer churn risk). Formulate a recovery action plan using "
            "multimodal logistics:\n"
            "1. Reroute via Golden Quadrilateral Expressways (tolls INR 1.8/km) or "
            "PM Gati Shakti Dedicated Freight Corridor (rail, 60% fuel saving, zero tolls).\n"
            "2. Calculate exact covered amount (mitigation savings) in INR.\n"
            "3. Detailed Hinglish explanation with step-by-step calculations.\n\n"
            "Respond in JSON format only:\n"
            '{"decision": "Multimodal recovery strategy name", '
            '"explanation": "Detailed Hinglish analysis with calculations", '
            '"action_items": ["prioritized actions with timeline"], '
            '"confidence": 0.95, '
            '"estimated_impact": "INR X,XX,XXX loss recovered through optimized logistics"}'
        )
        return self._dual_call(prompt, context="cascade_recovery")

    # ─── Dual-LLM orchestration ───────────────────────────────────────────────

    def _dual_call(self, prompt: str, context: str = "general") -> LLMDecision:
        """
        Call Groq + Ollama in parallel (sequential for simplicity/reliability),
        then merge results.  Falls back gracefully if either provider fails.
        """
        groq_result: Optional[LLMDecision] = None
        ollama_result: Optional[LLMDecision] = None

        # 1. Try Groq
        try:
            raw = self._call_groq(prompt)
            if raw:
                groq_result = self._parse_response(raw, source="groq")
                logger.info("[LLM/Groq] Decision: %s | Confidence: %.2f",
                            groq_result.decision, groq_result.confidence)
        except Exception as exc:
            logger.warning("[LLM/Groq] Failed: %s", exc)

        # 2. Try Ollama Mistral
        try:
            raw_ollama = self._call_ollama(prompt)
            if raw_ollama:
                ollama_result = self._parse_response(raw_ollama, source="ollama-mistral")
                logger.info("[LLM/Ollama] Decision: %s | Confidence: %.2f",
                            ollama_result.decision, ollama_result.confidence)
        except Exception as exc:
            logger.warning("[LLM/Ollama] Failed: %s", exc)

        # 3. Merge
        return self._merge_decisions(groq_result, ollama_result, context)

    def _merge_decisions(
        self,
        groq: Optional[LLMDecision],
        ollama: Optional[LLMDecision],
        context: str,
    ) -> LLMDecision:
        """
        Merge two LLM outputs into a single high-confidence decision.
        Rules:
          - Both available + agree  → combine action_items, boost confidence by 10%
          - Both available + disagree → pick higher confidence, note disagreement
          - Only one available       → use that one
          - Neither available        → rule-based fallback
        """
        if groq is None and ollama is None:
            logger.warning("[LLM] Both providers failed — using rule-based fallback")
            return LLMDecision(
                decision="MONITOR",
                explanation=(
                    "AI providers temporarily unavailable. "
                    "Rule-based assessment: standard monitoring recommended."
                ),
                action_items=[
                    "Increase tracking frequency",
                    "Alert operations team",
                    "Review route manually",
                ],
                confidence=0.55,
                estimated_impact="Manual review required",
                source="rule-based",
            )

        if groq is None:
            ollama.source = "ollama-mistral (groq unavailable)"
            return ollama

        if ollama is None:
            groq.source = "groq (ollama unavailable)"
            return groq

        # Both available — compare decisions
        groq_d = groq.decision.upper().strip()
        ollama_d = ollama.decision.upper().strip()

        # Simple agreement check (first word)
        def _first_word(s: str) -> str:
            return s.split()[0] if s.split() else s

        if _first_word(groq_d) == _first_word(ollama_d):
            # Agreement → merge action items, boost confidence
            combined_actions = list(dict.fromkeys(
                groq.action_items + ollama.action_items
            ))[:8]  # deduplicate, keep max 8
            boosted_conf = min(1.0, (groq.confidence + ollama.confidence) / 2 + 0.10)
            return LLMDecision(
                decision=groq.decision,  # use Groq's phrasing (more detailed)
                explanation=(
                    groq.explanation
                    + "\n\n[Ollama Mistral cross-check: "
                    + ollama.explanation[:300]
                    + "]"
                ),
                action_items=combined_actions,
                confidence=round(boosted_conf, 3),
                estimated_impact=groq.estimated_impact or ollama.estimated_impact,
                source="groq+ollama-mistral (consensus)",
            )
        else:
            # Disagreement → pick higher confidence
            primary, secondary = (
                (groq, ollama) if groq.confidence >= ollama.confidence else (ollama, groq)
            )
            return LLMDecision(
                decision=primary.decision,
                explanation=(
                    primary.explanation
                    + f"\n\n[Note: {secondary.source} suggested '{secondary.decision}' "
                    f"(conf {secondary.confidence:.0%}) — primary model's assessment used.]"
                ),
                action_items=primary.action_items,
                confidence=round(primary.confidence * 0.95, 3),  # slight penalty for disagreement
                estimated_impact=primary.estimated_impact,
                source=f"{primary.source} (selected over {secondary.source})",
            )

    # ─── Provider calls ───────────────────────────────────────────────────────

    def _call_groq(self, prompt: str, max_tokens: int = 4096) -> Optional[str]:
        """Call Groq API (OpenAI-compatible endpoint)."""
        if not self._groq_key:
            logger.debug("[LLM/Groq] No API key configured — skipping")
            return None

        headers = {
            "Authorization": f"Bearer {self._groq_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._groq_model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are an expert Indian logistics and supply chain AI assistant. "
                        "Provide clear, actionable insights in JSON format. "
                        "All monetary values in INR. Use Hinglish for explanations."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.3,
            "response_format": {"type": "json_object"},
        }

        response = requests.post(
            GROQ_BASE_URL, headers=headers, json=payload, timeout=GROQ_TIMEOUT
        )
        if response.status_code == 200:
            text = response.json()["choices"][0]["message"]["content"]
            logger.debug("[LLM/Groq] Response preview: %s", repr(text[:120]))
            return text
        else:
            logger.warning(
                "[LLM/Groq] HTTP %s — %s",
                response.status_code,
                response.text[:200],
            )
            return None

    def _call_ollama(self, prompt: str) -> Optional[str]:
        """
        Call local Ollama Mistral via /api/generate endpoint.
        Returns the response text or None if Ollama is not running.
        """
        url = f"{self._ollama_url}/api/generate"
        system_msg = (
            "You are an expert Indian logistics and supply chain AI assistant. "
            "Provide clear, actionable insights strictly in JSON format. "
            "All monetary values in INR. Use Hinglish for explanations. "
            "Output ONLY valid JSON — no markdown fences, no extra text."
        )
        full_prompt = f"{system_msg}\n\nUSER REQUEST:\n{prompt}"

        payload = {
            "model": self._ollama_model,
            "prompt": full_prompt,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.3, "num_predict": 2048},
        }

        response = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        if response.status_code == 200:
            text = response.json().get("response", "")
            logger.debug("[LLM/Ollama] Response preview: %s", repr(text[:120]))
            return text if text else None
        else:
            logger.warning(
                "[LLM/Ollama] HTTP %s — is Ollama running? (%s)",
                response.status_code,
                response.text[:100],
            )
            return None

    # ─── Backward-compat helper (used by reroute endpoint in api.py) ─────────

    def _call_llm(self, prompt: str, max_tokens: int = 4096) -> Optional[str]:
        """
        Backward-compatible single-string call used by reroute endpoint.
        Tries Groq first, then Ollama, returns raw JSON string.
        """
        raw = self._call_groq(prompt, max_tokens=max_tokens)
        if raw:
            return raw
        raw = self._call_ollama(prompt)
        return raw

    # ─── Response parsing ─────────────────────────────────────────────────────

    def _parse_response(self, response: str, source: str = "llm") -> LLMDecision:
        """Parse LLM JSON response into LLMDecision dataclass."""
        try:
            clean = response.strip()
            # Strip markdown code fences if present
            if clean.startswith("```"):
                lines = clean.splitlines()
                lines = lines[1:] if lines[0].startswith("```") else lines
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                clean = "\n".join(lines).strip()

            if "{" in clean:
                start = clean.index("{")
                end = clean.rindex("}") + 1
                json_str = clean[start:end]
                # Remove trailing commas before ] or }
                json_str = re.sub(r",\s*([\]}])", r"\1", json_str)
                data = json.loads(json_str)

                return LLMDecision(
                    decision=data.get("decision", "MONITOR"),
                    explanation=data.get("explanation", clean),
                    action_items=data.get("action_items", []),
                    confidence=float(data.get("confidence", 0.75)),
                    estimated_impact=data.get("estimated_impact", "Unknown"),
                    source=source,
                )
            else:
                # Plain text fallback
                return LLMDecision(
                    decision="MONITOR",
                    explanation=clean,
                    action_items=["Review manually"],
                    confidence=0.55,
                    estimated_impact="Requires manual review",
                    source=source,
                )
        except Exception as exc:
            logger.warning("[LLM/%s] Parse error: %s", source, exc)
            return LLMDecision(
                decision="ERROR",
                explanation=f"Could not parse LLM response: {exc}",
                action_items=["Review manually"],
                confidence=0.3,
                estimated_impact="Unknown",
                source=source,
            )

    # ─── Prompt builder ───────────────────────────────────────────────────────

    def _build_risk_prompt(
        self,
        shipment_id: str,
        risk_analysis: dict,
        anomaly_result: dict,
        language: str,
        shipment_data: dict = None,
    ) -> str:
        """Build enriched prompt for risk explanation with full shipment context."""
        lang_instructions = {
            "hinglish": "Respond in Hinglish (Hindi-English mix) for Indian audience",
            "hindi": "Respond in Hindi (Devanagari script)",
            "english": "Respond in clear English",
        }

        sd = shipment_data or {}
        risk_score = risk_analysis.get("risk_score", sd.get("risk_score", 0))
        risk_level = risk_analysis.get("risk_level", sd.get("risk_level", "unknown"))
        delay_prob = risk_analysis.get("delay_probability", sd.get("delay_probability", 0))

        scenario_context = self._classify_scenario(sd)

        disruption_section = ""
        if sd:
            disruption_section = (
                "\nSHIPMENT LIVE DATA:\n"
                f"- Origin: {sd.get('origin_city', 'Unknown')} ({sd.get('origin_state', '')})"
                f" -> Destination: {sd.get('destination_city', 'Unknown')} ({sd.get('destination_state', '')})\n"
                f"- Cargo Type: {sd.get('cargo_type', 'General')} | Value: INR {sd.get('shipment_value_inr', 0):,.0f}\n"
                f"- Carrier: {sd.get('carrier_company', 'Unknown')} | On-Time Rate: {sd.get('carrier_on_time_rate', 0.8)*100:.0f}%\n"
                f"- Distance Total: {sd.get('distance_km', 0):.1f} km | Remaining: {sd.get('distance_remaining_km', 0):.1f} km\n"
                f"- Progress: {sd.get('progress', 0)*100:.1f}% | Speed: {sd.get('speed_kmh', 40):.0f} km/h\n"
                f"- Weather: {sd.get('weather_condition', 'Clear')} (Code: {sd.get('weather_code', 'clear')})\n"
                f"- Traffic Congestion: {sd.get('traffic_congestion_level', 'Low')} (Index: {sd.get('segment_congestion_idx', 0):.2f})\n"
                f"- Delay: {sd.get('delay_hours_current', 0):.1f} hrs | Severity: {sd.get('delay_severity', 'low')}\n"
                f"- Vehicle Age: {sd.get('vehicle_age_years', 3):.1f} yrs | Fuel Price: INR {sd.get('fuel_price_per_litre', 104):.0f}/L\n"
                "\nDISRUPTION FLAGS (from trained 1M CSV model):\n"
                f"- Road Closure: {'YES' if sd.get('road_closure_flag') else 'NO'}\n"
                f"- Strike Event: {'YES' if sd.get('strike_event_flag') else 'NO'}\n"
                f"- Traffic Incident: {'YES' if sd.get('traffic_incident_flag') else 'NO'}\n"
                f"- Customs Hold: {'YES' if sd.get('customs_hold_flag') else 'NO'}\n"
                f"- Vehicle Maintenance: {'YES' if sd.get('maintenance_flag') else 'NO'}\n"
                f"- Temperature Breach: {'YES' if sd.get('temp_breach_flag') else 'NO'}\n"
                f"- Holiday/Festival: {'YES' if sd.get('holiday_flag') else 'NO'}\n"
                f"- Monsoon Season: {'YES' if sd.get('is_monsoon_season') else 'NO'}\n"
                f"- Disruption Type: {sd.get('disruption_type', 'none')}\n"
                "\nHISTORICAL ROUTE DATA:\n"
                f"- Route Avg Delay (7d): {sd.get('route_avg_delay_7d', 0):.1f} hrs\n"
                f"- Route Disruptions (30d): {sd.get('route_disruption_cnt_30d', 0)}\n"
                f"- Same Lane Delay Ratio: {sd.get('same_lane_delay_ratio', 0.3)*100:.0f}%\n"
                f"- Seasonal Risk Score: {sd.get('seasonal_risk_score', 0.3):.2f}\n"
                f"\nACTIVE SCENARIO: {scenario_context}\n"
            )

        return (
            "You are an Indian logistics AI assistant. Analyze this shipment and provide actionable recommendations.\n\n"
            f"{lang_instructions.get(language, lang_instructions['english'])}\n\n"
            f"SHIPMENT ID: {shipment_id}\n\n"
            "RISK ANALYSIS (from XGBoost ML model):\n"
            f"- Risk Score: {risk_score}/100\n"
            f"- Risk Level: {risk_level}\n"
            f"- Delay Probability: {delay_prob*100 if delay_prob <= 1 else delay_prob:.1f}%\n"
            f"- Top Risk Factors: {risk_analysis.get('top_risk_factors', sd.get('top_risk_factors', []))}\n"
            f"{disruption_section}\n"
            "Based on all the above data, provide a SITUATION-SPECIFIC analysis.\n"
            "Calculate real numbers from the shipment data. Do NOT give generic advice.\n\n"
            "Provide your analysis in JSON format:\n"
            "{\n"
            '  "decision": "Clear decision (APPROVE/MONITOR/REROUTE/DELAY)",\n'
            '  "explanation": "Detailed situation-specific explanation with calculations",\n'
            '  "action_items": ["specific actionable steps based on the scenario"],\n'
            '  "confidence": 0.0-1.0,\n'
            '  "estimated_impact": "expected impact with INR values if action taken"\n'
            "}"
        )

    def _classify_scenario(self, sd: dict) -> str:
        """Classify the disruption scenario for targeted LLM advice."""
        if not sd:
            return "NORMAL_MONITORING"
        scenarios = []
        weather_code = str(sd.get("weather_code", "clear")).lower()
        if weather_code in ("storm", "heavy_rain", "fog", "snow"):
            scenarios.append(f"SEVERE_WEATHER ({weather_code})")
        elif weather_code in ("rain", "light_rain"):
            scenarios.append(f"WEATHER_RISK ({weather_code})")
        if sd.get("road_closure_flag"):
            scenarios.append("ROAD_CLOSURE")
        if sd.get("strike_event_flag"):
            scenarios.append("STRIKE_EVENT")
        if sd.get("traffic_incident_flag"):
            scenarios.append("TRAFFIC_INCIDENT")
        if sd.get("customs_hold_flag"):
            scenarios.append("CUSTOMS_HOLD")
        if sd.get("maintenance_flag") or sd.get("vehicle_breakdown_flag"):
            scenarios.append("VEHICLE_BREAKDOWN")
        if sd.get("temp_breach_flag"):
            scenarios.append("TEMPERATURE_BREACH")
        cong = sd.get("segment_congestion_idx", 0)
        if isinstance(cong, (int, float)) and cong > 0.7:
            scenarios.append(f"HIGH_CONGESTION (idx={cong:.2f})")
        delay_h = sd.get("delay_hours_current", 0)
        if isinstance(delay_h, (int, float)) and delay_h > 4:
            scenarios.append(f"SEVERE_DELAY ({delay_h:.1f}h)")
        elif isinstance(delay_h, (int, float)) and delay_h > 1:
            scenarios.append(f"MODERATE_DELAY ({delay_h:.1f}h)")
        if sd.get("is_monsoon_season"):
            scenarios.append("MONSOON_SEASON")
        if sd.get("is_festival_season") or sd.get("holiday_flag"):
            scenarios.append("FESTIVAL/HOLIDAY")
        carrier_rate = sd.get("carrier_on_time_rate", 0.8)
        if isinstance(carrier_rate, (int, float)) and carrier_rate < 0.6:
            scenarios.append(f"UNRELIABLE_CARRIER (OT={carrier_rate*100:.0f}%)")
        return " + ".join(scenarios) if scenarios else "NORMAL_MONITORING"

    # ─── Rule-based helpers ───────────────────────────────────────────────────

    def _rule_based_priority(self, cargo_list: List[dict]) -> List[dict]:
        """Rule-based cargo prioritization fallback."""
        def priority_score(cargo):
            score = 0.0
            if cargo.get("urgency") == "express":
                score += 100
            elif cargo.get("urgency") == "priority":
                score += 70
            score += min(cargo.get("value_inr", 0) / 1000, 50)
            if cargo.get("perishable", False):
                score += 80
            if cargo.get("sla_breach_risk", 0) > 0.7:
                score += 60
            return score

        return sorted(cargo_list, key=priority_score, reverse=True)

    def customer_support_chat(
        self,
        messages: List[dict],
        shipments: List[dict]
    ) -> str:
        """
        Chat with a customer using their active shipments as context.
        Accepts conversation history (messages) and the list of active shipments.
        Queries Groq first, falls back to Ollama, and then to a simple rule-based fallback.
        """
        system_prompt = (
            "You are LogiSense AI, an intelligent assistant for the LogiSense B2B supply chain platform.\n"
            "Your job is to assist the customer with their active shipments. You should answer their questions "
            "clearly, accurately, and politely in English, Hindi, or Hinglish (based on the language they use).\n\n"
            "Here is the list of active shipments belonging to this customer:\n"
            f"{json.dumps(shipments, indent=2)}\n\n"
            "IMPORTANT RULES:\n"
            "1. ONLY answer questions about shipments that are listed in the context above. If they ask about any other shipment ID, politely say that it is not in their current shipment list.\n"
            "2. Always give accurate status updates, ETAs, and risks based on the shipment records.\n"
            "3. If they ask for advice on delays or weather conditions, use the weather and risk data in the records to explain.\n"
            "4. Keep the responses concise, helpful, and professional."
        )

        # 1. Try Groq
        if self._groq_key:
            try:
                headers = {
                    "Authorization": f"Bearer {self._groq_key}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "model": self._groq_model,
                    "messages": [{"role": "system", "content": system_prompt}] + messages,
                    "max_tokens": 1000,
                    "temperature": 0.5,
                }
                response = requests.post(
                    GROQ_BASE_URL, headers=headers, json=payload, timeout=GROQ_TIMEOUT
                )
                if response.status_code == 200:
                    return response.json()["choices"][0]["message"]["content"]
                else:
                    logger.warning(
                        "[CustomerChat/Groq] Non-200 response: %s - %s",
                        response.status_code,
                        response.text[:200],
                    )
            except Exception as e:
                logger.warning(f"[CustomerChat/Groq] Failed: {e}")

        # 2. Try Ollama Fallback
        try:
            url = f"{self._ollama_url}/api/chat"
            payload = {
                "model": self._ollama_model,
                "messages": [{"role": "system", "content": system_prompt}] + messages,
                "stream": False,
            }
            response = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
            if response.status_code == 200:
                return response.json()["message"]["content"]
        except Exception as e:
            logger.warning(f"[CustomerChat/Ollama] Failed: {e}")

        # 3. Default rule-based fallback
        return (
            "Sorry, our AI chat service is currently offline or undergoing maintenance. "
            "Please contact your support officer (Vishv Jani at +91 94285 53109 or admin.global@logisense.com) "
            "directly for immediate assistance with your shipments."
        )
