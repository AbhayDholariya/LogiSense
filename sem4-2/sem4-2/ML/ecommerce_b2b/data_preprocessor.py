# ML/indian_data_preprocessor.py
"""
Indian Supply Chain Data Preprocessor
======================================
Handles data cleaning, feature engineering, and preprocessing for supply_chain_1M.csv
Target: 85-92% accuracy with advanced feature engineering
"""

import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
import warnings
warnings.filterwarnings('ignore')


class IndianDataPreprocessor:
    """
    Complete data preprocessing pipeline with advanced feature engineering
    for Indian supply chain data (supply_chain_1M.csv)
    """
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_names = []
        
    def load_and_clean_data(self, csv_path: str, sample_size: int = None):
        """
        Load and clean supply_chain_1M.csv with proper handling
        
        Args:
            csv_path: Path to CSV file
            sample_size: Number of rows to sample (None = all rows)
        """
        print(f"📊 Loading data from {csv_path}...")
        
        # Load data
        if sample_size:
            df = pd.read_csv(csv_path, nrows=sample_size)
            print(f"✓ Loaded {len(df):,} rows (sampled)")
        else:
            df = pd.read_csv(csv_path)
            print(f"✓ Loaded {len(df):,} rows")
        
        # Display initial info
        print(f"\n📋 Dataset Info:")
        print(f"  Shape: {df.shape}")
        print(f"  Columns: {len(df.columns)}")
        print(f"  Memory: {df.memory_usage(deep=True).sum() / 1024**2:.2f} MB")
        
        # Clean missing values
        print(f"\n🧹 Cleaning data...")
        initial_rows = len(df)
        
        # Handle missing values strategically
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        categorical_cols = df.select_dtypes(include=['object']).columns
        
        # Fill numeric with median
        for col in numeric_cols:
            if df[col].isnull().sum() > 0:
                df[col].fillna(df[col].median(), inplace=True)
        
        # Fill categorical with mode or 'Unknown'
        for col in categorical_cols:
            if df[col].isnull().sum() > 0:
                mode_val = df[col].mode()
                if len(mode_val) > 0:
                    df[col].fillna(mode_val[0], inplace=True)
                else:
                    df[col].fillna('Unknown', inplace=True)
        
        # Remove duplicates
        df.drop_duplicates(subset=['shipment_id'], keep='first', inplace=True)
        
        print(f"  Removed {initial_rows - len(df):,} duplicate/invalid rows")
        print(f"  Final shape: {df.shape}")
        
        return df
    
    def engineer_features(self, df: pd.DataFrame):
        """
        Advanced feature engineering for Indian supply chain data
        Creates 40+ engineered features for better model performance
        """
        print(f"\n🔧 Engineering features...")
        df = df.copy()
        
        # ===== TIME-BASED FEATURES =====
        print("  ⏰ Time-based features...")
        if 'snapshot_timestamp' in df.columns:
            df['snapshot_timestamp'] = pd.to_datetime(df['snapshot_timestamp'], errors='coerce')
            df['hour_of_day'] = df['snapshot_timestamp'].dt.hour
            df['day_of_week'] = df['snapshot_timestamp'].dt.dayofweek
            df['day_of_month'] = df['snapshot_timestamp'].dt.day
            df['month'] = df['snapshot_timestamp'].dt.month
            df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
            df['is_night'] = ((df['hour_of_day'] >= 22) | (df['hour_of_day'] <= 5)).astype(int)
            df['is_peak_hour'] = ((df['hour_of_day'] >= 8) & (df['hour_of_day'] <= 10) | 
                                   (df['hour_of_day'] >= 17) & (df['hour_of_day'] <= 19)).astype(int)
        
        if 'planned_arrival_dt' in df.columns and 'estimated_arrival_dt' in df.columns:
            df['planned_arrival_dt'] = pd.to_datetime(df['planned_arrival_dt'], errors='coerce')
            df['estimated_arrival_dt'] = pd.to_datetime(df['estimated_arrival_dt'], errors='coerce')
            df['eta_buffer_hours'] = (df['estimated_arrival_dt'] - df['planned_arrival_dt']).dt.total_seconds() / 3600
            df['eta_buffer_hours'].fillna(0, inplace=True)
        
        # ===== DISTANCE & SPEED FEATURES =====
        print("  🚛 Distance & speed features...")
        if 'distance_covered_km' in df.columns and 'distance_remaining_km' in df.columns:
            df['total_distance_km'] = df['distance_covered_km'] + df['distance_remaining_km']
            df['progress_pct'] = (df['distance_covered_km'] / (df['total_distance_km'] + 0.01)) * 100
            df['remaining_distance_pct'] = 100 - df['progress_pct']
        
        if 'avg_speed_kmh' in df.columns and 'expected_speed_kmh' in df.columns:
            df['speed_ratio'] = df['avg_speed_kmh'] / (df['expected_speed_kmh'] + 0.01)
            df['speed_deviation'] = df['avg_speed_kmh'] - df['expected_speed_kmh']
            df['is_slow_moving'] = (df['speed_ratio'] < 0.7).astype(int)
            df['is_speeding'] = (df['speed_ratio'] > 1.3).astype(int)
        
        # ===== DELAY FEATURES =====
        print("  ⏱️ Delay features...")
        if 'delay_hours_current' in df.columns:
            df['has_delay'] = (df['delay_hours_current'] > 0).astype(int)
            df['delay_severity'] = pd.cut(df['delay_hours_current'], 
                                          bins=[-np.inf, 0, 2, 6, 12, np.inf],
                                          labels=[0, 1, 2, 3, 4]).astype(int)
        
        if 'avg_delay_this_route' in df.columns:
            df['route_delay_risk'] = (df['avg_delay_this_route'] > 1.5).astype(int)
            
        if 'same_lane_delay_ratio' in df.columns:
            df['high_lane_delay'] = (df['same_lane_delay_ratio'] > 0.6).astype(int)
        
        # ===== WEATHER & ENVIRONMENT =====
        print("  🌦️ Weather features...")
        weather_severity = {
            'clear': 0, 'cloudy': 1, 'overcast': 1,
            'rain': 3, 'light_rain': 2, 'heavy_rain': 4,
            'fog': 3, 'storm': 5, 'snow': 4
        }
        if 'weather_code' in df.columns:
            df['weather_severity'] = df['weather_code'].str.lower().map(weather_severity).fillna(1)
        
        if 'wind_speed_kmh' in df.columns:
            df['high_wind'] = (df['wind_speed_kmh'] > 40).astype(int)
        
        if 'visibility_km' in df.columns:
            df['low_visibility'] = (df['visibility_km'] < 5).astype(int)
        
        # ===== CONGESTION & TRAFFIC =====
        print("  🚦 Congestion features...")
        if 'segment_congestion_idx' in df.columns:
            df['high_congestion'] = (df['segment_congestion_idx'] > 0.7).astype(int)
        
        if 'port_congestion_idx' in df.columns:
            df['port_bottleneck'] = (df['port_congestion_idx'] > 0.8).astype(int)
        
        if 'node_throughput_lag' in df.columns:
            df['throughput_issue'] = (df['node_throughput_lag'] < -0.2).astype(int)
        
        # ===== VEHICLE & CARRIER =====
        print("  🚚 Vehicle & carrier features...")
        if 'vehicle_age_yrs' in df.columns:
            df['old_vehicle'] = (df['vehicle_age_yrs'] > 8).astype(int)
            df['vehicle_age_category'] = pd.cut(df['vehicle_age_yrs'],
                                                bins=[-np.inf, 3, 6, 10, np.inf],
                                                labels=[0, 1, 2, 3]).astype(int)
        
        if 'carrier_on_time_rate' in df.columns:
            df['unreliable_carrier'] = (df['carrier_on_time_rate'] < 0.7).astype(int)
            df['reliable_carrier'] = (df['carrier_on_time_rate'] > 0.9).astype(int)
        
        if 'carrier_incidents_90d' in df.columns:
            df['high_incident_carrier'] = (df['carrier_incidents_90d'] > 3).astype(int)
        
        # ===== DRIVER & OPERATIONAL =====
        print("  👨‍✈️ Driver features...")
        if 'driver_hours_elapsed' in df.columns:
            df['driver_fatigue_risk'] = (df['driver_hours_elapsed'] > 8).astype(int)
            df['driver_over_limit'] = (df['driver_hours_elapsed'] > 12).astype(int)
        
        if 'dwell_time_hrs' in df.columns:
            df['excessive_dwell'] = (df['dwell_time_hrs'] > 2).astype(int)
        
        if 'hours_since_last_ping' in df.columns:
            df['tracking_gap'] = (df['hours_since_last_ping'] > 2).astype(int)
        
        # ===== ROUTE COMPLEXITY =====
        print("  🗺️ Route complexity features...")
        complexity_score = 0
        
        if 'border_crossing_flag' in df.columns:
            complexity_score += df['border_crossing_flag'] * 20
        
        if 'customs_hold_flag' in df.columns:
            complexity_score += df['customs_hold_flag'] * 30
        
        if 'road_closure_flag' in df.columns:
            complexity_score += df['road_closure_flag'] * 25
        
        if 'traffic_incident_flag' in df.columns:
            complexity_score += df['traffic_incident_flag'] * 15
        
        df['route_complexity_score'] = complexity_score
        df['high_complexity_route'] = (complexity_score > 40).astype(int)
        
        # ===== RISK AGGREGATION =====
        print("  ⚠️ Risk aggregation features...")
        risk_components = []
        
        if 'seasonal_risk_score' in df.columns:
            risk_components.append(df['seasonal_risk_score'])
        
        if 'weather_severity' in df.columns:
            risk_components.append(df['weather_severity'] / 5)
        
        if 'high_congestion' in df.columns:
            risk_components.append(df['high_congestion'] * 0.3)
        
        if 'unreliable_carrier' in df.columns:
            risk_components.append(df['unreliable_carrier'] * 0.4)
        
        if 'driver_fatigue_risk' in df.columns:
            risk_components.append(df['driver_fatigue_risk'] * 0.3)
        
        if len(risk_components) > 0:
            df['composite_risk_score'] = sum(risk_components) / len(risk_components)
        
        # ===== HISTORICAL ROUTE FEATURES =====
        print("  📊 Historical route features...")
        if 'route_avg_delay_7d' in df.columns:
            df['route_history_risk'] = (df['route_avg_delay_7d'] > 2.0).astype(int)
        
        if 'route_disruption_cnt_30d' in df.columns:
            df['frequent_disruptions'] = (df['route_disruption_cnt_30d'] > 5).astype(int)
        
        # ===== CARGO-SPECIFIC =====
        print("  📦 Cargo features...")
        high_value_cargo = ['electronics', 'pharmaceuticals', 'automotive_parts', 'perishables']
        if 'cargo_type' in df.columns:
            df['high_value_cargo'] = df['cargo_type'].str.lower().isin(high_value_cargo).astype(int)
        
        # ===== INTERACTION FEATURES =====
        print("  🔀 Interaction features...")
        if 'weather_severity' in df.columns and 'high_congestion' in df.columns:
            df['weather_congestion_risk'] = df['weather_severity'] * df['high_congestion']
        
        if 'old_vehicle' in df.columns and 'weather_severity' in df.columns:
            df['vehicle_weather_risk'] = df['old_vehicle'] * df['weather_severity']
        
        if 'driver_fatigue_risk' in df.columns and 'is_night' in df.columns:
            df['fatigue_night_risk'] = df['driver_fatigue_risk'] * df['is_night']
        
        print(f"✓ Created {len([c for c in df.columns if c not in df.columns])} new features")
        
        return df
    
    def encode_categorical(self, df: pd.DataFrame, fit: bool = True):
        """
        Encode categorical variables using Label Encoding
        
        Args:
            df: DataFrame with categorical columns
            fit: If True, fit encoders; if False, use existing encoders
        """
        print(f"\n🏷️ Encoding categorical variables...")
        df = df.copy()
        
        categorical_cols = [
            'origin_city', 'destination_city', 'carrier_id', 'transport_mode',
            'cargo_type', 'weather_code', 'disruption_type', 'recommended_action'
        ]
        
        for col in categorical_cols:
            if col not in df.columns:
                continue
            
            if fit:
                self.label_encoders[col] = LabelEncoder()
                # Handle unseen values
                df[col] = df[col].fillna('Unknown').astype(str)
                self.label_encoders[col].fit(df[col])
                df[f'{col}_encoded'] = self.label_encoders[col].transform(df[col])
            else:
                if col in self.label_encoders:
                    df[col] = df[col].fillna('Unknown').astype(str)
                    # Handle unseen categories
                    le = self.label_encoders[col]
                    df[f'{col}_encoded'] = df[col].apply(
                        lambda x: le.transform([x])[0] if x in le.classes_ else -1
                    )
        
        print(f"  Encoded {len([k for k in self.label_encoders.keys()])} categorical columns")
        
        return df
    
    def select_features(self, df: pd.DataFrame, target_col: str = 'disruption_flag'):
        """
        Select relevant features for modeling
        
        Args:
            df: DataFrame with all features
            target_col: Target column name
        """
        print(f"\n🎯 Selecting features for modeling...")
        
        # Features to exclude
        exclude_cols = [
            'shipment_id', 'snapshot_timestamp', 'planned_arrival_dt', 'estimated_arrival_dt',
            'last_checkpoint_id', 'planned_route_id', 'origin_city', 'destination_city',
            'carrier_id', 'weather_code', 'cargo_type', 'disruption_type', 'recommended_action',
            'current_lat', 'current_lon', 'actual_delay_hrs', 'alt_route_needed'
        ]
        
        # Select numeric features and encoded categoricals
        feature_cols = [
            col for col in df.columns
            if col not in exclude_cols and col != target_col
            and (df[col].dtype in [np.int64, np.float64, np.int32, np.float32] or '_encoded' in col)
        ]
        
        # Store for later use
        self.feature_names = feature_cols
        
        print(f"  Selected {len(feature_cols)} features")
        print(f"  Feature groups:")
        print(f"    - Time-based: {len([f for f in feature_cols if any(x in f for x in ['hour', 'day', 'month', 'weekend', 'night', 'peak'])])}")
        print(f"    - Distance: {len([f for f in feature_cols if any(x in f for x in ['distance', 'speed', 'progress'])])}")
        print(f"    - Delay: {len([f for f in feature_cols if 'delay' in f])}")
        print(f"    - Weather: {len([f for f in feature_cols if 'weather' in f or 'wind' in f or 'visibility' in f])}")
        print(f"    - Risk: {len([f for f in feature_cols if 'risk' in f])}")
        print(f"    - Encoded: {len([f for f in feature_cols if '_encoded' in f])}")
        
        return df[feature_cols], df[target_col] if target_col in df.columns else None
    
    def scale_features(self, X: pd.DataFrame, fit: bool = True):
        """
        Scale features using StandardScaler
        
        Args:
            X: Feature DataFrame
            fit: If True, fit scaler; if False, use existing scaler
        """
        print(f"\n📏 Scaling features...")
        
        if fit:
            X_scaled = self.scaler.fit_transform(X)
        else:
            X_scaled = self.scaler.transform(X)
        
        print(f"  Scaled {X.shape[1]} features")
        
        return pd.DataFrame(X_scaled, columns=X.columns, index=X.index)
    
    def prepare_train_test(self, df: pd.DataFrame, target_col: str = 'disruption_flag', 
                          test_size: float = 0.2, random_state: int = 42):
        """
        Complete preprocessing pipeline: clean -> engineer -> encode -> split -> scale
        
        Returns:
            X_train, X_test, y_train, y_test (all scaled and ready for modeling)
        """
        print(f"\n{'='*60}")
        print(f"🚀 FULL PREPROCESSING PIPELINE")
        print(f"{'='*60}")
        
        # Engineer features
        df = self.engineer_features(df)
        
        # Encode categoricals
        df = self.encode_categorical(df, fit=True)
        
        # Select features
        X, y = self.select_features(df, target_col=target_col)
        
        # Check target distribution
        if y is not None:
            print(f"\n📊 Target Distribution ({target_col}):")
            print(y.value_counts(normalize=True))
        
        # Train-test split
        print(f"\n✂️ Splitting data (test_size={test_size})...")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )
        
        print(f"  Train: {X_train.shape}")
        print(f"  Test: {X_test.shape}")
        
        # Scale features
        X_train_scaled = self.scale_features(X_train, fit=True)
        X_test_scaled = self.scale_features(X_test, fit=False)
        
        print(f"\n✅ Preprocessing complete!")
        print(f"{'='*60}")
        
        return X_train_scaled, X_test_scaled, y_train, y_test


def quick_test():
    """Quick test of preprocessor"""
    print("Testing Indian Data Preprocessor...")
    
    data_path = Path(__file__).parent.parent / "data" / "supply_chain_1M.csv"
    
    preprocessor = IndianDataPreprocessor()
    df = preprocessor.load_and_clean_data(str(data_path), sample_size=10000)
    
    X_train, X_test, y_train, y_test = preprocessor.prepare_train_test(df)
    
    print(f"\n✅ Test successful!")
    print(f"   Features: {len(preprocessor.feature_names)}")
    print(f"   Train samples: {len(X_train)}")
    print(f"   Test samples: {len(X_test)}")


if __name__ == "__main__":
    quick_test()
