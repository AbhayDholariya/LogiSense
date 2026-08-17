# ML/indian_anomaly_detector.py
"""Indian Supply Chain Anomaly Detector using Isolation Forest"""

import pickle
from pathlib import Path
import pandas as pd
import numpy as np


class IndianAnomalyDetector:
    """Detects anomalies in Indian shipment data"""
    
    def __init__(self, models_dir: str = None):
        if models_dir is None:
            models_dir = Path(__file__).parent.parent / "models" / "indian_supply_chain"
        self.models_dir = Path(models_dir)
        self.pipeline = None
        self.preprocessor = None
        self._load_model()
    
    def _load_model(self):
        """Load trained Isolation Forest"""
        try:
            model_path = self.models_dir / "isolation_forest_anomaly.pkl"
            if model_path.exists():
                with open(model_path, 'rb') as f:
                    self.pipeline = pickle.load(f)
                print(f"[IndianAnomalyDetector] Loaded model")
            
            prep_path = self.models_dir / "preprocessor.pkl"
            if prep_path.exists():
                with open(prep_path, 'rb') as f:
                    self.preprocessor = pickle.load(f)
        except Exception as e:
            print(f"[IndianAnomalyDetector] Warning: {e}")
    
    def predict(self, record: dict) -> tuple[bool, float]:
        """
        Predict if shipment is anomalous
        Returns: (is_anomaly, anomaly_score)
        """
        if self.pipeline is None:
            return False, 0.0
        
        try:
            # Prepare and align 72 features
            X = self._prepare_features(record)
            
            # Predict
            prediction = self.pipeline.predict(X)[0]
            score = self.pipeline.score_samples(X)[0]
            
            is_anomaly = (prediction == -1)
            anomaly_score = abs(score)
            
            return is_anomaly, round(anomaly_score, 4)
        
        except Exception as e:
            print(f"[IndianAnomalyDetector] Prediction error: {e}")
            return False, 0.0

    def _prepare_features(self, record: dict) -> pd.DataFrame:
        """Align dict keys and compute engineered features to match 72 model columns"""
        dist_km = float(record.get("distance_km", 500.0))
        cascade_risk = float(record.get("cascade_risk_score", 0.3))
        checkpoint_delay = float(record.get("checkpoint_delay_minutes", 0.0))
        upstream_delay = float(record.get("upstream_shipment_delay_minutes", 0.0))
        breakdown_flag = int(record.get("vehicle_breakdown_flag", 0))
        accident_flag = int(record.get("accident_reported_flag", 0))
        rest_hours = float(record.get("driver_rest_hours_prior", 8.0))
        night_flag = int(record.get("night_driving_flag", 0))
        toll_plazas = int(record.get("num_toll_plazas", 5))
        border_crossings = int(record.get("num_state_border_crossings", 1))
        eway_verified = int(record.get("eway_bill_verified", 1))
        origin_wh_congestion = float(record.get("origin_wh_congestion_pct", 50.0))
        dest_wh_congestion = float(record.get("dest_wh_congestion_pct", 50.0))
        is_monsoon = int(record.get("is_monsoon_season", 0))
        is_festival = int(record.get("is_festival_season", 0))
        traffic_level = record.get("traffic_congestion_level", "Medium")
        weather_cond = record.get("weather_condition", "Clear")
        planned_transit = float(record.get("planned_transit_hours", 24.0))
        vehicle_age = float(record.get("vehicle_age_years", 3.0))

        data = {
            'distance_covered_km':      dist_km * cascade_risk,
            'distance_remaining_km':    dist_km * (1 - cascade_risk),
            'delay_hours_current':      checkpoint_delay / 60.0,
            'avg_delay_this_route':     upstream_delay / 60.0,
            'dwell_time_hrs':           checkpoint_delay / 60.0,
            'idle_flag':                1 if breakdown_flag else 0,
            'hours_since_last_ping':    0.5,
            'wind_speed_kmh':           20.0,
            'visibility_km':            10.0,
            'road_closure_flag':        0,
            'port_congestion_idx':      origin_wh_congestion / 100.0,
            'strike_event_flag':        0,
            'holiday_flag':             is_festival,
            'segment_congestion_idx':   {'Low':0.2,'Medium':0.5,'High':0.75,'Very High':0.9}.get(traffic_level, 0.5),
            'avg_speed_kmh':            dist_km / max(planned_transit, 1),
            'expected_speed_kmh':       60.0,
            'traffic_incident_flag':    accident_flag,
            'alternate_routes_avail':   1,
            'border_crossing_flag':     min(border_crossings, 1),
            'carrier_on_time_rate':     0.8,
            'vehicle_age_yrs':          vehicle_age,
            'maintenance_flag':         breakdown_flag,
            'driver_hours_elapsed':     max(0, 8 - rest_hours),
            'temp_breach_flag':         0,
            'customs_hold_flag':        0 if eway_verified else 1,
            'route_avg_delay_7d':       upstream_delay / 60.0,
            'route_disruption_cnt_30d': 1 if cascade_risk > 0.5 else 0,
            'same_lane_delay_ratio':    cascade_risk,
            'seasonal_risk_score':      is_monsoon * 0.3 + is_festival * 0.2,
            'carrier_incidents_90d':    2 if breakdown_flag else 0,
            'node_throughput_lag':      (origin_wh_congestion - 50) / 100.0,
            # Engineered features
            'hour':         12, 'dayofweek': 2, 'month': 6,
            'is_weekend':   0, 'is_night': night_flag,
            'is_peak':      0,
            'progress_pct': 50.0,
            'speed_ratio':  0.85,
            'speed_dev':    -5.0,
            'is_slow':      0,
            'has_delay':    1 if checkpoint_delay > 30 else 0,
            'delay_sev':    2 if checkpoint_delay > 60 else 1 if checkpoint_delay > 0 else 0,
            'route_delay_risk':  1 if upstream_delay > 90 else 0,
            'lane_delay_hi':     1 if cascade_risk > 0.6 else 0,
            'route_hist_risk':   1 if upstream_delay > 120 else 0,
            'freq_disrupt':      1 if cascade_risk > 0.7 else 0,
            'weather_sev':  {'Clear':0,'Cloudy':1,'Rain':3,'Heavy Rain':4,'Fog':3,'Storm':5}.get(weather_cond, 1),
            'hi_wind':       0,
            'lo_vis':        1 if weather_cond == 'Fog' else 0,
            'hi_congestion': 1 if traffic_level in ('High','Very High') else 0,
            'port_block':    1 if origin_wh_congestion > 80 else 0,
            'old_vehicle':   1 if vehicle_age > 8 else 0,
            'bad_carrier':   0,
            'hi_incidents':  1 if breakdown_flag else 0,
            'fatigued':      1 if rest_hours < 6 else 0,
            'over_limit':    1 if rest_hours < 4 else 0,
            'long_dwell':    1 if checkpoint_delay > 120 else 0,
            'track_gap':     0,
            'complexity':    border_crossings * 25,
            'hi_complexity': 1 if border_crossings > 2 else 0,
            'composite_risk': cascade_risk,
            'wx_cong':  {'Clear':0,'Rain':3,'Storm':5}.get(weather_cond,1) * (1 if traffic_level in ('High','Very High') else 0),
            'veh_wx':   (1 if vehicle_age > 8 else 0) * {'Clear':0,'Rain':3,'Storm':5}.get(weather_cond,1),
            'fat_night':(1 if rest_hours < 6 else 0) * night_flag,
            # Encoded categoricals
            'origin_city_enc': 0, 'destination_city_enc': 0,
            'carrier_id_enc': 0, 'transport_mode_enc': 0,
            'cargo_type_enc': 0, 'weather_code_enc': 0,
        }

        df = pd.DataFrame([data])
        
        # Load and align to feature_names if available
        if not hasattr(self, 'feature_names') or not self.feature_names:
            feat_path = self.models_dir / "feature_cols.json"
            if feat_path.exists():
                import json
                with open(feat_path) as f:
                    self.feature_names = json.load(f)
            else:
                self.feature_names = list(data.keys())

        for feat in self.feature_names:
            if feat not in df.columns:
                df[feat] = 0
        df = df[self.feature_names]
        return df

