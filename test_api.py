#!/usr/bin/env python3
"""
Test script to verify the API server works correctly with custom frontend.
"""

import requests
import json
import time
import sys

def test_api_connection():
    """Test basic API connectivity."""
    print("🔍 Testing API connection...")
    
    try:
        response = requests.get("http://localhost:8000/test", timeout=5)
        if response.status_code == 200:
            print("✅ API connection successful")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ API returned status {response.status_code}")
            return False
    except requests.ConnectionError:
        print("❌ Could not connect to API. Is it running on localhost:8000?")
        return False
    except Exception as e:
        print(f"❌ Error testing connection: {e}")
        return False

def test_health_endpoint():
    """Test the health endpoint."""
    print("\n🏥 Testing health endpoint...")
    
    try:
        response = requests.get("http://localhost:8000/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print("✅ Health check successful")
            print(f"   Status: {data.get('status')}")
            print(f"   Agent Status: {data.get('agent_status')}")
            print(f"   Databases: {data.get('databases')}")
            return True
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error testing health: {e}")
        return False

def test_echo_endpoint():
    """Test the echo endpoint for frontend debugging."""
    print("\n📡 Testing echo endpoint...")
    
    test_data = {
        "test": "hello",
        "message": "This is a test from the frontend",
        "timestamp": time.time()
    }
    
    try:
        response = requests.post(
            "http://localhost:8000/test/echo", 
            json=test_data,
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            print("✅ Echo test successful")
            print(f"   Received back: {data.get('received')}")
            return True
        else:
            print(f"❌ Echo test failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error testing echo: {e}")
        return False

def test_analyze_endpoint():
    """Test the analyze endpoint with a simple query."""
    print("\n🔍 Testing analyze endpoint...")
    
    test_query = {
        "query": "Hello, what can you help me with?",
        "analysis_type": "auto",
        "include_sources": False,
        "user": "test_user"
    }
    
    try:
        response = requests.post(
            "http://localhost:8000/analyze",
            json=test_query,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Analyze endpoint successful")
            print(f"   Query Type: {data.get('query_type')}")
            print(f"   Database Used: {data.get('database_used')}")
            print(f"   Success: {data.get('success')}")
            print(f"   Result: {data.get('result', '')[:100]}...")
            
            if data.get('error'):
                print(f"   ⚠️  Warning: {data.get('error')}")
            
            return True
        else:
            print(f"❌ Analyze failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data}")
            except:
                print(f"   Raw response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing analyze: {e}")
        return False

def test_conversation_history():
    """Test conversation history handling."""
    print("\n💬 Testing conversation history...")
    
    conversation_query = {
        "query": "My name is John. Remember this for future conversations.",
        "analysis_type": "auto",
        "include_sources": False,
        "user": "john_doe",
        "conversation_history": [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hello! How can I help you today?"}
        ]
    }
    
    try:
        response = requests.post(
            "http://localhost:8000/analyze",
            json=conversation_query,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Conversation history test successful")
            print(f"   Result: {data.get('result', '')[:200]}...")
            return True
        else:
            print(f"❌ Conversation test failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error testing conversation: {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 Testing Mistral Security Analysis API for Custom Frontend")
    print("=" * 60)
    
    # Check if API is running
    if not test_api_connection():
        print("\n❌ Cannot proceed with tests. Please start the API server:")
        print("   cd Agent && python api_server.py")
        return 1
    
    # Run all tests
    tests = [
        test_health_endpoint,
        test_echo_endpoint, 
        test_analyze_endpoint,
        test_conversation_history
    ]
    
    passed = 0
    total = len(tests)
    
    for test_func in tests:
        try:
            if test_func():
                passed += 1
        except Exception as e:
            print(f"❌ Test {test_func.__name__} crashed: {e}")
    
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your API is ready for custom frontend integration.")
        print("\n🔗 API Endpoints for your frontend:")
        print("   • Health Check: GET  http://localhost:8000/health")
        print("   • Analyze Query: POST http://localhost:8000/analyze") 
        print("   • Examples:     GET  http://localhost:8000/examples")
        print("   • API Docs:     GET  http://localhost:8000/docs")
    else:
        print(f"⚠️  {total - passed} tests failed. Check the issues above.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 