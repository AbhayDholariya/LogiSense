# ML/indian_xgboost_risk_scorer.py
"""
Indian Supply Chain XGBoost Risk Scorer
Uses trained XGBoost model for risk prediction
"""

import pickle
from pathlib import Path
from dataclasses import dataclass
from typing import Optional
import numpy as np
import pandas as pd


@dataclass
class IndianShipmentInput:
    """Input for Indian shipment risk scoring"""
    shipment_id: str
    origin_city: str
    origin_state: str
    destination_city: str
    destination_state: str
    carrier_company: str
    distance_km: float
    vehicle_type: str = "Tata 407"
    vehicle_age_years: float = 3.0
    driver_experience_years: float = 5.0
    driver_rest_hours_prior: float = 8.0
    planned_transit_hours: float = 24.0
    weather_condition: str = "Clear"
    traffic_congestion_level: str = "Medium"
    road_condition_index: float = 7.0
    is_monsoon_season: int = 0
    is_festival_season: int = 0
    night_driving_flag: int = 0
    num_toll_plazas: int = 5
    num_state_border_crossings: int = 1
    eway_bill_verified: int = 1
    origin_wh_congestion_pct: float = 50.0
    dest_wh_congestion_pct: float = 50.0
    upstream_shipment_delay_minutes: float = 0.0
    vehicle_breakdown_flag: int = 0
    accident_reported_flag: int = 0
    gps_route_deviation_km: float = 0.0
    cascade_risk_score: float = 0.3
    checkpoint_delay_minutes: float = 0.0
    order_type: str = "B2B"
    priority_level: str = "Scheduled-Freight"
    shipment_value_inr: float = 50000.0
    fuel_price_per_litre: float = 100.0


@dataclass
class IndianRiskOutput:
    """Output from risk scoring"""
    shipment_id: str
    risk_score: float  # 0-100
    risk_level: str  # low / medium / high / critical
    delay_probability: float  # 0-1
    predicted_delay_minutes: float
    cascade_risk: float
    component_scores: dict
    top_risk_factors: list[str]
    recommended_action: str
    priority_category: str
    recovery_actions: list[str]


class IndianXGBoostRiskScorer:
    """
    XGBoost-based risk scorer for Indian supply chain
    """
    
    def __init__(self, models_dir: str = None):
        if models_dir is None:
            models_dir = Path(__file__).parent.parent / "models" / "indian_supply_chain"
        self.models_dir = Path(models_dir)
        
        self.clf = None          # Classification model
        self.reg = None          # Regression model (for delay prediction)
        self.preprocessor = None
        self.scaler = None
        self.feature_names: list = []
        
        self._load_models()
    
    def _load_models(self):
        """Load trained models — tries multiple filename patterns"""
        try:
            # Load best classifier (check all known filenames)
            clf_paths = [
                self.models_dir / "xgboost_depth10_classifier.pkl",
                self.models_dir / "xgboost_tuned_params_classifier.pkl",
                self.models_dir / "xgboost_classifier.pkl",
                self.models_dir / "random_forest_classifier.pkl",
            ]

            for path in clf_paths:
                if path.exists():
                    with open(path, 'rb') as f:
                        self.clf = pickle.load(f)
                    print(f"[IndianRiskScorer] Loaded classifier: {path.name}")
                    break

            # Load scaler
            scaler_path = self.models_dir / "scaler.pkl"
            if scaler_path.exists():
                with open(scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)
                print(f"[IndianRiskScorer] Loaded scaler")

            # Load feature list
            feat_path = self.models_dir / "feature_cols.json"
            if feat_path.exists():
                import json
                with open(feat_path) as f:
                    self.feature_names = json.load(f)
                print(f"[IndianRiskScorer] Loaded {len(self.feature_names)} feature names")

            # Load preprocessor (older format)
            prep_path = self.models_dir / "preprocessor.pkl"
            if prep_path.exists():
                with open(prep_path, 'rb') as f:
                    self.preprocessor = pickle.load(f)
                print(f"[IndianRiskScorer] Loaded preprocessor")
            
        except Exception as e:
            print(f"[IndianRiskScorer] Warning: Could not load models: {e}")
    
    def score(self, inp: IndianShipmentInput) -> IndianRiskOutput:
        """
        Score a shipment and return risk assessment.
        Blends XGBoost probability with component-based scoring to prevent
        artificially low (near-zero) scores when the model is under-confident.
        """
        if self.clf is None:
            return self._fallback_score(inp)
        
        # Convert input to feature vector
        features = self._prepare_features(inp)
        
        # Predict — XGBoost probability (0-1)
        delay_prob = float(self.clf.predict_proba(features)[0][1])
        xgb_score = delay_prob * 100  # 0-100

        # ── Component-based score as a meaningful floor ──────────────────────
        components = self._calculate_components(inp)
        component_score = (
            components.get("weather", 0) * 2.5
            + components.get("traffic", 0) * 2.0
            + components.get("vehicle", 0) * 1.5
            + components.get("driver", 0) * 1.5
            + components.get("cascade", 0) * 1.0
            + components.get("route", 0) * 0.5
            + inp.vehicle_breakdown_flag * 25   # breakdown = big risk
            + inp.accident_reported_flag * 20
            + inp.is_monsoon_season * 10
            + (inp.upstream_shipment_delay_minutes / 60.0) * 5  # upstream delay
            + (inp.checkpoint_delay_minutes / 60.0) * 8         # checkpoint delay
        )

        # Blend: 50% XGBoost + 50% component (give more weight to domain knowledge)
        # Floor = 10 always, ceiling = 100
        blended = max(10.0, xgb_score * 0.50 + component_score * 0.50)
        risk_score = round(min(blended, 100.0), 2)

        # Recalculate delay_prob proportionally from blended score
        delay_prob = round(risk_score / 100.0, 3)

        # Classify risk level
        if risk_score >= 75:
            risk_level = "critical"
        elif risk_score >= 50:
            risk_level = "high"
        elif risk_score >= 25:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        # Top risk factors (components already calculated above)
        risk_factors = self._identify_risk_factors(inp, components)
        
        # Recommended action
        action = self._recommend_action(risk_level, inp, components)
        
        # Priority category
        priority = self._assign_priority(risk_score, inp.priority_level)
        
        # Recovery actions
        recovery = self._suggest_recovery(risk_level, risk_factors)
        
        return IndianRiskOutput(
            shipment_id=inp.shipment_id,
            risk_score=round(risk_score, 2),
            risk_level=risk_level,
            delay_probability=round(delay_prob, 3),
            predicted_delay_minutes=round(delay_prob * 120, 1),
            cascade_risk=inp.cascade_risk_score,
            component_scores=components,
            top_risk_factors=risk_factors[:5],
            recommended_action=action,
            priority_category=priority,
            recovery_actions=recovery
        )
    
    def _prepare_features(self, inp: IndianShipmentInput) -> pd.DataFrame:
        """Convert input to feature vector aligned with training features"""
        # Build raw feature dict matching training column names
        data = {
            'distance_covered_km':      inp.distance_km * inp.cascade_risk_score,  # approx
            'distance_remaining_km':    inp.distance_km * (1 - inp.cascade_risk_score),
            'delay_hours_current':      inp.checkpoint_delay_minutes / 60.0,
            'avg_delay_this_route':     inp.upstream_shipment_delay_minutes / 60.0,
            'dwell_time_hrs':           inp.checkpoint_delay_minutes / 60.0,
            'idle_flag':                1 if inp.vehicle_breakdown_flag else 0,
            'hours_since_last_ping':    0.5,
            'wind_speed_kmh':           20.0,
            'visibility_km':            10.0,
            'road_closure_flag':        0,
            'port_congestion_idx':      inp.origin_wh_congestion_pct / 100.0,
            'strike_event_flag':        0,
            'holiday_flag':             inp.is_festival_season,
            'segment_congestion_idx':   {'Low':0.2,'Medium':0.5,'High':0.75,'Very High':0.9}.get(inp.traffic_congestion_level, 0.5),
            'avg_speed_kmh':            inp.distance_km / max(inp.planned_transit_hours, 1),
            'expected_speed_kmh':       60.0,
            'traffic_incident_flag':    inp.accident_reported_flag,
            'alternate_routes_avail':   1,
            'border_crossing_flag':     min(inp.num_state_border_crossings, 1),
            'carrier_on_time_rate':     0.8,
            'vehicle_age_yrs':          inp.vehicle_age_years,
            'maintenance_flag':         inp.vehicle_breakdown_flag,
            'driver_hours_elapsed':     max(0, 8 - inp.driver_rest_hours_prior),
            'temp_breach_flag':         0,
            'customs_hold_flag':        0 if inp.eway_bill_verified else 1,
            'route_avg_delay_7d':       inp.upstream_shipment_delay_minutes / 60.0,
            'route_disruption_cnt_30d': 1 if inp.cascade_risk_score > 0.5 else 0,
            'same_lane_delay_ratio':    inp.cascade_risk_score,
            'seasonal_risk_score':      inp.is_monsoon_season * 0.3 + inp.is_festival_season * 0.2,
            'carrier_incidents_90d':    2 if inp.vehicle_breakdown_flag else 0,
            'node_throughput_lag':      (inp.origin_wh_congestion_pct - 50) / 100.0,
            # Engineered features (same as training script)
            'hour':         12, 'dayofweek': 2, 'month': 6,
            'is_weekend':   0, 'is_night': inp.night_driving_flag,
            'is_peak':      0,
            'progress_pct': 50.0,
            'speed_ratio':  0.85,
            'speed_dev':    -5.0,
            'is_slow':      0,
            'has_delay':    1 if inp.checkpoint_delay_minutes > 30 else 0,
            'delay_sev':    2 if inp.checkpoint_delay_minutes > 60 else 1 if inp.checkpoint_delay_minutes > 0 else 0,
            'route_delay_risk':  1 if inp.upstream_shipment_delay_minutes > 90 else 0,
            'lane_delay_hi':     1 if inp.cascade_risk_score > 0.6 else 0,
            'route_hist_risk':   1 if inp.upstream_shipment_delay_minutes > 120 else 0,
            'freq_disrupt':      1 if inp.cascade_risk_score > 0.7 else 0,
            'weather_sev':  {'Clear':0,'Cloudy':1,'Rain':3,'Heavy Rain':4,'Fog':3,'Storm':5}.get(inp.weather_condition, 1),
            'hi_wind':       0,
            'lo_vis':        1 if inp.weather_condition == 'Fog' else 0,
            'hi_congestion': 1 if inp.traffic_congestion_level in ('High','Very High') else 0,
            'port_block':    1 if inp.origin_wh_congestion_pct > 80 else 0,
            'old_vehicle':   1 if inp.vehicle_age_years > 8 else 0,
            'bad_carrier':   0,
            'hi_incidents':  1 if inp.vehicle_breakdown_flag else 0,
            'fatigued':      1 if inp.driver_rest_hours_prior < 6 else 0,
            'over_limit':    1 if inp.driver_rest_hours_prior < 4 else 0,
            'long_dwell':    1 if inp.checkpoint_delay_minutes > 120 else 0,
            'track_gap':     0,
            'complexity':    inp.num_state_border_crossings * 25,
            'hi_complexity': 1 if inp.num_state_border_crossings > 2 else 0,
            'composite_risk': inp.cascade_risk_score,
            'wx_cong':  {'Clear':0,'Rain':3,'Storm':5}.get(inp.weather_condition,1) * (1 if inp.traffic_congestion_level in ('High','Very High') else 0),
            'veh_wx':   (1 if inp.vehicle_age_years > 8 else 0) * {'Clear':0,'Rain':3,'Storm':5}.get(inp.weather_condition,1),
            'fat_night':(1 if inp.driver_rest_hours_prior < 6 else 0) * inp.night_driving_flag,
            # Encoded categoricals (use 0 as unknown; model handles it via learned ranges)
            'origin_city_enc': 0, 'destination_city_enc': 0,
            'carrier_id_enc': 0, 'transport_mode_enc': 0,
            'cargo_type_enc': 0, 'weather_code_enc': 0,
        }

        df = pd.DataFrame([data])

        # Align to training feature order if we have the list
        if self.feature_names:
            for feat in self.feature_names:
                if feat not in df.columns:
                    df[feat] = 0
            df = df[self.feature_names]

        return df.values  # return numpy array
    
    def _calculate_components(self, inp: IndianShipmentInput) -> dict:
        """Calculate component risk scores"""
        components = {}
        
        # Weather risk
        weather_map = {"Clear": 0, "Cloudy": 2, "Rain": 6, "Heavy Rain": 9, "Fog": 7, "Storm": 10}
        components['weather'] = weather_map.get(inp.weather_condition, 3)
        
        # Traffic risk
        traffic_map = {"Low": 1, "Medium": 5, "High": 8, "Very High": 10}
        components['traffic'] = traffic_map.get(inp.traffic_congestion_level, 5)
        
        # Vehicle risk
        components['vehicle'] = min((inp.vehicle_age_years / 15) * 10 + inp.vehicle_breakdown_flag * 5, 10)
        
        # Driver risk
        fatigue = max(0, 10 - inp.driver_rest_hours_prior)
        experience = max(0, 10 - inp.driver_experience_years)
        components['driver'] = min((fatigue + experience) / 2 + inp.night_driving_flag * 2, 10)
        
        # Route complexity
        components['route'] = min(
            (inp.num_toll_plazas / 10) * 5 + 
            inp.num_state_border_crossings * 2 + 
            (10 - inp.road_condition_index), 
            10
        )
        
        # Congestion
        components['congestion'] = (inp.origin_wh_congestion_pct + inp.dest_wh_congestion_pct) / 20
        
        # Cascade risk
        components['cascade'] = inp.cascade_risk_score * 10
        
        return {k: round(v, 2) for k, v in components.items()}
    
    def _identify_risk_factors(self, inp: IndianShipmentInput, components: dict) -> list[str]:
        """Identify top risk factors"""
        factors = []
        
        if components.get('weather', 0) > 6:
            factors.append(f"Severe weather ({inp.weather_condition})")
        
        if components.get('traffic', 0) > 7:
            factors.append(f"High traffic congestion")
        
        if inp.vehicle_age_years > 8:
            factors.append(f"Old vehicle ({inp.vehicle_age_years} years)")
        
        if inp.driver_rest_hours_prior < 6:
            factors.append(f"Driver fatigue risk")
        
        if inp.is_monsoon_season:
            factors.append("Monsoon season")
        
        if inp.upstream_shipment_delay_minutes > 30:
            factors.append(f"Upstream delay ({inp.upstream_shipment_delay_minutes} min)")
        
        if inp.vehicle_breakdown_flag:
            factors.append("Vehicle breakdown reported")
        
        if inp.accident_reported_flag:
            factors.append("Accident reported on route")
        
        if inp.origin_wh_congestion_pct > 70 or inp.dest_wh_congestion_pct > 70:
            factors.append("Warehouse congestion")
        
        if components.get('route', 0) > 7:
            factors.append("Complex route (tolls/borders)")
        
        return factors
    
    def _recommend_action(self, risk_level: str, inp: IndianShipmentInput, components: dict) -> str:
        """Recommend action based on risk"""
        if risk_level == "critical":
            return "URGENT: Consider rerouting or delaying shipment. Alert customer."
        elif risk_level == "high":
            return "Monitor closely. Prepare alternate route. Notify stakeholders."
        elif risk_level == "medium":
            return "Track actively. Review driver rest schedule."
        else:
            return "Continue as planned. Standard monitoring."
    
    def _assign_priority(self, risk_score: float, priority_level: str) -> str:
        """Assign priority category"""
        if risk_score > 70 or priority_level == "Express":
            return "P1_CRITICAL"
        elif risk_score > 50 or priority_level == "Priority":
            return "P2_HIGH"
        else:
            return "P3_MEDIUM"
    
    def _suggest_recovery(self, risk_level: str, risk_factors: list[str]) -> list[str]:
        """Suggest recovery actions"""
        actions = []
        
        if any("weather" in f.lower() for f in risk_factors):
            actions.append("Wait for weather to clear before proceeding")
        
        if any("fatigue" in f.lower() for f in risk_factors):
            actions.append("Arrange driver rest break (2-4 hours)")
        
        if any("traffic" in f.lower() or "congestion" in f.lower() for f in risk_factors):
            actions.append("Reschedule delivery to off-peak hours")
        
        if any("vehicle" in f.lower() or "breakdown" in f.lower() for f in risk_factors):
            actions.append("Arrange backup vehicle standby")
        
        if risk_level in ["high", "critical"]:
            actions.append("Activate alternate route plan")
            actions.append("Increase tracking frequency to every 30 min")
        
        return actions
    
    def _fallback_score(self, inp: IndianShipmentInput) -> IndianRiskOutput:
        """Fallback rule-based scoring when model not available — always >= 10."""
        score = 20.0  # base: every active shipment has inherent risk
        
        # Weather
        weather_risk = {"Clear": 0, "Cloudy": 5, "Rain": 20, "Heavy Rain": 35, "Fog": 25, "Storm": 40}
        score += weather_risk.get(inp.weather_condition, 10)
        
        # Traffic
        traffic_risk = {"Low": 0, "Medium": 10, "High": 20, "Very High": 30}
        score += traffic_risk.get(inp.traffic_congestion_level, 10)
        
        # Other factors
        score += inp.is_monsoon_season * 10
        score += inp.is_festival_season * 8
        score += inp.vehicle_breakdown_flag * 30
        score += inp.accident_reported_flag * 25
        score += inp.cascade_risk_score * 20
        score += (inp.upstream_shipment_delay_minutes / 120) * 15
        # Vehicle age risk
        if inp.vehicle_age_years > 8:
            score += 10
        elif inp.vehicle_age_years > 5:
            score += 5
        # Driver fatigue
        if inp.driver_rest_hours_prior < 6:
            score += 8
        
        # Enforce floor and ceiling
        score = round(max(10.0, min(score, 100.0)), 2)
        
        risk_level = "critical" if score >= 75 else "high" if score >= 50 else "medium" if score >= 25 else "low"
        comps = self._calculate_components(inp)
        
        return IndianRiskOutput(
            shipment_id=inp.shipment_id,
            risk_score=score,
            risk_level=risk_level,
            delay_probability=round(score / 100.0, 3),
            predicted_delay_minutes=round(score * 2, 1),
            cascade_risk=inp.cascade_risk_score,
            component_scores=comps,
            top_risk_factors=self._identify_risk_factors(inp, comps)[:5],
            recommended_action=self._recommend_action(risk_level, inp, comps),
            priority_category=self._assign_priority(score, inp.priority_level),
            recovery_actions=self._suggest_recovery(risk_level, self._identify_risk_factors(inp, comps))
        )
