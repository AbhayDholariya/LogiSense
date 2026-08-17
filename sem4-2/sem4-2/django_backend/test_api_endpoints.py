#!/usr/bin/env python
# test_api_endpoints.py
"""
Test all Django API endpoints and display JSON responses
"""

import sys
import os
import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:8000"
TIMEOUT = 5

def print_header(title):
    print(f"\n{'='*80}")
    print(f"🧪 {title}")
    print(f"{'='*80}\n")

def test_health():
    """Test health endpoint"""
    print_header("TESTING: GET /health")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
        print(f"✅ Status Code: {response.status_code}")
        print(f"📋 Response:\n")
        print(json.dumps(response.json(), indent=2))
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_shipments():
    """Test shipments endpoint"""
    print_header("TESTING: GET /shipments/live")
    try:
        response = requests.get(f"{BASE_URL}/shipments/live", timeout=TIMEOUT)
        print(f"✅ Status Code: {response.status_code}")
        print(f"📋 Response (first 3 shipments):\n")
        data = response.json()
        if isinstance(data, list) and len(data) > 0:
            print(json.dumps(data[:3], indent=2))
            print(f"\n... ({len(data)} total shipments)")
        else:
            print(json.dumps(data, indent=2))
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_alerts():
    """Test alerts endpoint"""
    print_header("TESTING: GET /alerts?hours=24")
    try:
        response = requests.get(f"{BASE_URL}/alerts?hours=24", timeout=TIMEOUT)
        print(f"✅ Status Code: {response.status_code}")
        print(f"📋 Response:\n")
        data = response.json()
        if isinstance(data, list) and len(data) > 0:
            print(json.dumps(data[:3], indent=2))
            print(f"\n... ({len(data)} total alerts)")
        else:
            print(json.dumps(data, indent=2))
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_india_health():
    """Test India ML models health endpoint"""
    print_header("TESTING: GET /india/health")
    try:
        response = requests.get(f"{BASE_URL}/india/health", timeout=TIMEOUT)
        print(f"✅ Status Code: {response.status_code}")
        print(f"📋 Response:\n")
        print(json.dumps(response.json(), indent=2))
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print(f"\n{'='*80}")
    print("🚀 SUPPLY CHAIN AI - DJANGO API ENDPOINT TESTS")
    print(f"{'='*80}")
    print(f"\n📍 Base URL: {BASE_URL}")
    print(f"⏱️  Timeout: {TIMEOUT}s")
    print(f"\n🔍 Testing endpoints...\n")
    
    # Wait a moment for server to be ready
    time.sleep(0.5)
    
    results = {
        "Health Check": test_health(),
        "Shipments": test_shipments(),
        "Alerts": test_alerts(),
        "India ML Health": test_india_health(),
    }
    
    # Summary
    print(f"\n{'='*80}")
    print("📊 TEST SUMMARY")
    print(f"{'='*80}\n")
    
    for name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{name:<25} {status}")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    print(f"\n{passed}/{total} tests passed")
    
    if passed == total:
        print(f"\n🎉 All endpoints are working! Django server is healthy.")
    else:
        print(f"\n⚠️  Some endpoints failed. Verify Django server is running on port 8000.")
    
    print(f"\n{'='*80}\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n✅ Testing stopped.")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
