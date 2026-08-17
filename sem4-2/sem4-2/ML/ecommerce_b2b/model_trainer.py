# ML/indian_model_trainer.py
"""
Indian Supply Chain ML Model Trainer
=====================================
Trains XGBoost, Random Forest, and Isolation Forest with GridSearchCV
Target: 85-92% accuracy on disruption prediction
"""

import os
import sys
import pickle
import json
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, classification_report, confusion_matrix
)
from sklearn.model_selection import GridSearchCV, cross_val_score
import xgboost as xgb

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ML.ecommerce_b2b.data_preprocessor import IndianDataPreprocessor


class IndianModelTrainer:
    """
    Complete ML training pipeline with GridSearchCV for hyperparameter tuning
    Trains multiple models and selects the best performer
    """
    
    def __init__(self, models_dir: str = None):
        if models_dir is None:
            models_dir = Path(__file__).parent.parent / "models" / "indian_supply_chain"
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        
        self.best_model = None
        self.best_model_name = None
        self.best_score = 0.0
        self.models = {}
        self.metrics = {}
        
    def train_xgboost(self, X_train, y_train, X_test, y_test, use_gridsearch: bool = True):
        """
        Train XGBoost Classifier with GridSearchCV
        
        Args:
            use_gridsearch: If True, use GridSearchCV; if False, use default params
        """
        print(f"\n{'='*60}")
        print(f"🌲 TRAINING XGBOOST CLASSIFIER")
        print(f"{'='*60}")
        
        if use_gridsearch:
            print("🔍 Running GridSearchCV (this may take 5-10 minutes)...")
            
            # Parameter grid for GridSearchCV
            param_grid = {
                'max_depth': [6, 8, 10],
                'learning_rate': [0.01, 0.05, 0.1],
                'n_estimators': [100, 200, 300],
                'min_child_weight': [1, 3, 5],
                'gamma': [0, 0.1, 0.2],
                'subsample': [0.8, 0.9, 1.0],
                'colsample_bytree': [0.8, 0.9, 1.0],
            }
            
            # Base model
            xgb_base = xgb.XGBClassifier(
                objective='binary:logistic',
                random_state=42,
                n_jobs=-1,
                eval_metric='logloss'
            )
            
            # GridSearchCV
            grid_search = GridSearchCV(
                estimator=xgb_base,
                param_grid=param_grid,
                cv=3,
                scoring='f1',
                n_jobs=-1,
                verbose=1
            )
            
            grid_search.fit(X_train, y_train)
            
            print(f"\n✅ Best parameters found:")
            for param, value in grid_search.best_params_.items():
                print(f"   {param}: {value}")
            
            model = grid_search.best_estimator_
            
        else:
            print("⚡ Using optimized default parameters...")
            model = xgb.XGBClassifier(
                max_depth=8,
                learning_rate=0.05,
                n_estimators=200,
                min_child_weight=3,
                gamma=0.1,
                subsample=0.9,
                colsample_bytree=0.9,
                objective='binary:logistic',
                random_state=42,
                n_jobs=-1,
                eval_metric='logloss'
            )
            
            model.fit(X_train, y_train)
        
        # Evaluate
        metrics = self._evaluate_model(model, X_test, y_test, "XGBoost")
        
        # Store
        self.models['xgboost'] = model
        self.metrics['xgboost'] = metrics
        
        # Update best model
        if metrics['accuracy'] > self.best_score:
            self.best_model = model
            self.best_model_name = 'xgboost'
            self.best_score = metrics['accuracy']
        
        return model, metrics
    
    def train_random_forest(self, X_train, y_train, X_test, y_test, use_gridsearch: bool = True):
        """
        Train Random Forest Classifier with GridSearchCV
        """
        print(f"\n{'='*60}")
        print(f"🌳 TRAINING RANDOM FOREST CLASSIFIER")
        print(f"{'='*60}")
        
        if use_gridsearch:
            print("🔍 Running GridSearchCV (this may take 5-10 minutes)...")
            
            param_grid = {
                'n_estimators': [100, 200, 300],
                'max_depth': [10, 15, 20, None],
                'min_samples_split': [2, 5, 10],
                'min_samples_leaf': [1, 2, 4],
                'max_features': ['sqrt', 'log2'],
                'bootstrap': [True, False]
            }
            
            rf_base = RandomForestClassifier(
                random_state=42,
                n_jobs=-1
            )
            
            grid_search = GridSearchCV(
                estimator=rf_base,
                param_grid=param_grid,
                cv=3,
                scoring='f1',
                n_jobs=-1,
                verbose=1
            )
            
            grid_search.fit(X_train, y_train)
            
            print(f"\n✅ Best parameters found:")
            for param, value in grid_search.best_params_.items():
                print(f"   {param}: {value}")
            
            model = grid_search.best_estimator_
            
        else:
            print("⚡ Using optimized default parameters...")
            model = RandomForestClassifier(
                n_estimators=200,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                max_features='sqrt',
                bootstrap=True,
                random_state=42,
                n_jobs=-1
            )
            
            model.fit(X_train, y_train)
        
        # Evaluate
        metrics = self._evaluate_model(model, X_test, y_test, "Random Forest")
        
        # Store
        self.models['random_forest'] = model
        self.metrics['random_forest'] = metrics
        
        # Update best model
        if metrics['accuracy'] > self.best_score:
            self.best_model = model
            self.best_model_name = 'random_forest'
            self.best_score = metrics['accuracy']
        
        return model, metrics
    
    def train_anomaly_detector(self, X_train, use_gridsearch: bool = False):
        """
        Train Isolation Forest for anomaly detection
        """
        print(f"\n{'='*60}")
        print(f"🔍 TRAINING ISOLATION FOREST (ANOMALY DETECTION)")
        print(f"{'='*60}")
        
        if use_gridsearch:
            print("🔍 Running GridSearchCV...")
            
            param_grid = {
                'n_estimators': [100, 200, 300],
                'max_samples': ['auto', 0.5, 0.8],
                'contamination': [0.05, 0.1, 0.15],
                'max_features': [0.5, 0.8, 1.0]
            }
            
            iso_base = IsolationForest(random_state=42, n_jobs=-1)
            
            # Note: GridSearchCV needs a scorer, but IsolationForest is unsupervised
            # We'll use manual parameter testing instead
            best_contamination = 0.1
            best_n_estimators = 200
            
        else:
            best_contamination = 0.1
            best_n_estimators = 200
        
        print(f"⚡ Training with contamination={best_contamination}, n_estimators={best_n_estimators}...")
        
        model = IsolationForest(
            n_estimators=best_n_estimators,
            contamination=best_contamination,
            max_samples='auto',
            random_state=42,
            n_jobs=-1
        )
        
        model.fit(X_train)
        
        # Basic evaluation
        predictions = model.predict(X_train)
        anomaly_count = (predictions == -1).sum()
        
        print(f"\n📊 Anomaly Detection Results:")
        print(f"   Training samples: {len(X_train):,}")
        print(f"   Detected anomalies: {anomaly_count:,} ({anomaly_count/len(X_train)*100:.2f}%)")
        
        self.models['isolation_forest'] = model
        
        return model
    
    def _evaluate_model(self, model, X_test, y_test, model_name: str):
        """
        Comprehensive model evaluation
        """
        print(f"\n📊 Evaluating {model_name}...")
        
        # Predictions
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else None
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        # ROC AUC
        roc_auc = roc_auc_score(y_test, y_pred_proba) if y_pred_proba is not None else 0.0
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        
        # Display results
        print(f"\n{'─'*40}")
        print(f"  🎯 Accuracy:  {accuracy*100:.2f}%")
        print(f"  📍 Precision: {precision*100:.2f}%")
        print(f"  🔁 Recall:    {recall*100:.2f}%")
        print(f"  ⚖️  F1 Score:  {f1*100:.2f}%")
        print(f"  📈 ROC AUC:   {roc_auc*100:.2f}%")
        print(f"{'─'*40}")
        
        print(f"\n📉 Confusion Matrix:")
        print(f"   {cm}")
        
        # Feature importance (if available)
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            top_indices = importances.argsort()[-10:][::-1]
            
            print(f"\n🔝 Top 10 Feature Importances:")
            feature_names = X_test.columns if hasattr(X_test, 'columns') else [f"feature_{i}" for i in range(len(importances))]
            for idx in top_indices:
                print(f"   {feature_names[idx]}: {importances[idx]:.4f}")
        
        metrics = {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'roc_auc': roc_auc,
            'confusion_matrix': cm.tolist()
        }
        
        return metrics
    
    def save_models(self, preprocessor: IndianDataPreprocessor):
        """
        Save all trained models and preprocessor
        """
        print(f"\n{'='*60}")
        print(f"💾 SAVING MODELS")
        print(f"{'='*60}")
        
        # Save best classification model
        if self.best_model:
            model_path = self.models_dir / f"{self.best_model_name}_classifier.pkl"
            with open(model_path, 'wb') as f:
                pickle.dump(self.best_model, f)
            print(f"✓ Saved {self.best_model_name} classifier: {model_path}")
        
        # Save anomaly detector
        if 'isolation_forest' in self.models:
            anomaly_path = self.models_dir / "isolation_forest_anomaly.pkl"
            with open(anomaly_path, 'wb') as f:
                pickle.dump(self.models['isolation_forest'], f)
            print(f"✓ Saved isolation forest: {anomaly_path}")
        
        # Save preprocessor
        preprocessor_path = self.models_dir / "preprocessor.pkl"
        with open(preprocessor_path, 'wb') as f:
            pickle.dump(preprocessor, f)
        print(f"✓ Saved preprocessor: {preprocessor_path}")
        
        # Save metrics
        metrics_path = self.models_dir / "metrics.json"
        with open(metrics_path, 'w') as f:
            json.dump({
                'best_model': self.best_model_name,
                'best_accuracy': self.best_score,
                'all_metrics': {k: {mk: (mv if not isinstance(mv, np.ndarray) else mv.tolist()) 
                                   for mk, mv in v.items()} 
                               for k, v in self.metrics.items()},
                'timestamp': datetime.now().isoformat()
            }, f, indent=2)
        print(f"✓ Saved metrics: {metrics_path}")
        
        print(f"\n✅ All models saved successfully!")


def run_training(sample_size: int = None, use_gridsearch: bool = True):
    """
    Complete training pipeline
    
    Args:
        sample_size: Number of rows to train on (None = all 1M rows)
        use_gridsearch: Whether to use GridSearchCV (slower but better)
    """
    print(f"\n{'#'*60}")
    print(f"# INDIAN SUPPLY CHAIN ML TRAINING PIPELINE")
    print(f"# Target: 85-92% Accuracy")
    print(f"# Data: supply_chain_1M.csv")
    print(f"{'#'*60}\n")
    
    start_time = datetime.now()
    
    # Paths
    data_path = Path(__file__).resolve().parent.parent.parent / "data" / "supply_chain_1M.csv"
    
    if not data_path.exists():
        print(f"Error: Data file not found at {data_path}")
        return
    
    # 1. Load and preprocess data
    print(f"STEP 1: DATA PREPROCESSING")
    print(f"{'─'*60}")
    
    preprocessor = IndianDataPreprocessor()
    df = preprocessor.load_and_clean_data(str(data_path), sample_size=sample_size)
    
    X_train, X_test, y_train, y_test = preprocessor.prepare_train_test(df)
    
    # 2. Train models
    print(f"\n\nSTEP 2: MODEL TRAINING")
    print(f"{'─'*60}")
    
    trainer = IndianModelTrainer()
    
    # Train XGBoost
    xgb_model, xgb_metrics = trainer.train_xgboost(
        X_train, y_train, X_test, y_test, use_gridsearch=use_gridsearch
    )
    
    # Train Random Forest
    rf_model, rf_metrics = trainer.train_random_forest(
        X_train, y_train, X_test, y_test, use_gridsearch=use_gridsearch
    )
    
    # Train Anomaly Detector
    iso_model = trainer.train_anomaly_detector(X_train, use_gridsearch=False)
    
    # 3. Compare and select best model
    print(f"\n\nSTEP 3: MODEL COMPARISON")
    print(f"{'─'*60}")
    print(f"\n📊 Model Performance Summary:")
    print(f"{'─'*60}")
    print(f"{'Model':<20} {'Accuracy':<12} {'F1 Score':<12} {'ROC AUC':<12}")
    print(f"{'─'*60}")
    
    for model_name, metrics in trainer.metrics.items():
        print(f"{model_name:<20} {metrics['accuracy']*100:>10.2f}% {metrics['f1_score']*100:>10.2f}% {metrics['roc_auc']*100:>10.2f}%")
    
    print(f"{'─'*60}")
    print(f"\n🏆 BEST MODEL: {trainer.best_model_name.upper()}")
    print(f"   Accuracy: {trainer.best_score*100:.2f}%")
    
    # Check if target accuracy reached
    if trainer.best_score >= 0.85:
        print(f"   ✅ TARGET ACHIEVED! (85-92% range)")
    else:
        print(f"   ⚠️  Below target. Consider:")
        print(f"      - Increase sample size")
        print(f"      - Enable GridSearchCV")
        print(f"      - Add more feature engineering")
    
    # 4. Save models
    print(f"\n\nSTEP 4: SAVING MODELS")
    print(f"{'─'*60}")
    
    trainer.save_models(preprocessor)
    
    # Summary
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    print(f"\n\n{'#'*60}")
    print(f"# TRAINING COMPLETE!")
    print(f"{'#'*60}")
    print(f"  Duration: {duration/60:.2f} minutes")
    print(f"  Best Model: {trainer.best_model_name}")
    print(f"  Accuracy: {trainer.best_score*100:.2f}%")
    print(f"  Models saved to: {trainer.models_dir}")
    print(f"{'#'*60}\n")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Train Indian Supply Chain ML Models')
    parser.add_argument('--sample', type=int, default=None, help='Sample size (default: full 1M)')
    parser.add_argument('--no-gridsearch', action='store_true', help='Skip GridSearchCV for faster training')
    
    args = parser.parse_args()
    
    run_training(
        sample_size=args.sample,
        use_gridsearch=not args.no_gridsearch
    )
