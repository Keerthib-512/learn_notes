#!/usr/bin/env python3
"""
Test script for Intellinotes Backend
Tests basic API endpoints and functionality
"""

import requests
import json
import time
import sys

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_signup():
    """Test user signup"""
    try:
        user_data = {
            "email": "test@example.com",
            "password": "testpass123",
            "first_name": "Test",
            "last_name": "User"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/signup", json=user_data)
        print(f"📝 Signup response: {response.status_code} - {response.text}")
        
        if response.status_code in [200, 201]:
            print("✅ Signup test passed")
            return True
        elif response.status_code == 400 and "already exists" in response.text:
            print("✅ Signup test passed (user already exists)")
            return True
        else:
            print(f"❌ Signup test failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Signup test error: {e}")
        return False

def test_forgot_password():
    """Test forgot password functionality"""
    try:
        data = {"email": "test@example.com"}
        
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json=data)
        print(f"🔐 Forgot password response: {response.status_code} - {response.text}")
        
        if response.status_code == 200:
            print("✅ Forgot password test passed")
            return True
        elif response.status_code == 404 and "not registered" in response.text:
            print("✅ Forgot password test passed (email not registered)")
            return True
        else:
            print(f"❌ Forgot password test failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Forgot password test error: {e}")
        return False

def test_docs():
    """Test API documentation endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/docs")
        if response.status_code == 200:
            print("✅ API docs accessible")
            return True
        else:
            print(f"❌ API docs failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API docs error: {e}")
        return False

def main():
    print("🧪 Intellinotes Backend Test Suite")
    print("=" * 40)
    
    # Wait a moment for server to be ready
    print("⏳ Waiting for server to be ready...")
    time.sleep(2)
    
    tests = [
        ("Health Check", test_health),
        ("API Documentation", test_docs),
        ("User Signup", test_signup),
        ("Forgot Password", test_forgot_password),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🔍 Running {test_name}...")
        if test_func():
            passed += 1
        else:
            print(f"❌ {test_name} failed")
    
    print("\n" + "=" * 40)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend is working correctly.")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Check the backend configuration.")
        sys.exit(1)

if __name__ == "__main__":
    main()
