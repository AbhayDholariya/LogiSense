#!/usr/bin/env python3
"""
Train Indian Supply Chain ML Models
=====================================
Run this script to train XGBoost + Random Forest + Isolation Forest
on the supply_chain_1M.csv dataset

Usage:
  python train_indian_models.py                    # Full 1M rows, with GridSearchCV
  python train_indian_models.py --sample 100000    # 100K sample (faster)
  python train_indian_models.py --no-gridsearch    # Skip GridSearchCV (even faster)
  
Target Accuracy: 85-92%
"""

import argparse
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

def main():
    parser = argparse.ArgumentParser(
        description='Train Indian Supply Chain ML Models',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('--sample', type=int, default=None, 
                       help='Sample size (default: full 1M rows, use 100000 for quick test)')
    parser.add_argument('--no-gridsearch', action='store_true',
                       help='Skip GridSearchCV (faster but may be less accurate)')
    
    args = parser.parse_args()
    
    print("=" * 65)
    print(" INDIAN SUPPLY CHAIN ML MODEL TRAINER")
    print("=" * 65)
    print(f" Dataset  : data/supply_chain_1M.csv")
    print(f" Sample   : {args.sample or 'Full 1M rows'}")
    print(f" GridSearch: {'Disabled' if args.no_gridsearch else 'Enabled (slower, better accuracy)'}")
    print("=" * 65)
    print()
    
    try:
        from ML.ecommerce_b2b.model_trainer import run_training
        run_training(
            sample_size=args.sample,
            use_gridsearch=not args.no_gridsearch
        )
        print("\n✅ Models saved to: ML/models/indian_supply_chain/")
        print("   Now restart FastAPI backend to load the trained models")
    
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("\nInstall required packages:")
        print("  pip install scikit-learn xgboost pandas numpy")
    
    except FileNotFoundError as e:
        print(f"❌ File not found: {e}")
        print("   Make sure you're running from the project root")


if __name__ == '__main__':
    main()
