#!/usr/bin/env python3
"""
Performance testing script for the API server.
Measures endpoint response times and identifies bottlenecks.
"""

import time
import asyncio
import aiohttp
import json
import statistics
from datetime import datetime
from typing import Dict, List, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class APIPerformanceTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def test_endpoint(self, endpoint: str, method: str = "GET", 
                          data: Dict[str, Any] = None, 
                          iterations: int = 10) -> Dict[str, Any]:
        """Test an endpoint multiple times and return performance metrics."""
        
        url = f"{self.base_url}{endpoint}"
        response_times = []
        errors = []
        
        logger.info(f"Testing {method} {endpoint} with {iterations} iterations...")
        
        for i in range(iterations):
            start_time = time.time()
            try:
                if method.upper() == "GET":
                    async with self.session.get(url) as response:
                        await response.text()
                        status = response.status
                elif method.upper() == "POST":
                    async with self.session.post(url, json=data) as response:
                        await response.text()
                        status = response.status
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000  # Convert to ms
                
                if status == 200:
                    response_times.append(response_time)
                else:
                    errors.append(f"HTTP {status}")
                    
            except Exception as e:
                errors.append(str(e))
                logger.error(f"Error in iteration {i+1}: {e}")
        
        if response_times:
            return {
                "endpoint": endpoint,
                "method": method,
                "iterations": iterations,
                "successful_requests": len(response_times),
                "failed_requests": len(errors),
                "avg_response_time_ms": round(statistics.mean(response_times), 2),
                "min_response_time_ms": round(min(response_times), 2),
                "max_response_time_ms": round(max(response_times), 2),
                "median_response_time_ms": round(statistics.median(response_times), 2),
                "std_dev_ms": round(statistics.stdev(response_times) if len(response_times) > 1 else 0, 2),
                "errors": errors,
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "endpoint": endpoint,
                "method": method,
                "error": "All requests failed",
                "errors": errors,
                "timestamp": datetime.now().isoformat()
            }
    
    async def test_concurrent_requests(self, endpoint: str, 
                                     concurrent_users: int = 5,
                                     requests_per_user: int = 5) -> Dict[str, Any]:
        """Test endpoint with concurrent requests to simulate load."""
        
        url = f"{self.base_url}{endpoint}"
        
        async def user_simulation():
            user_times = []
            for _ in range(requests_per_user):
                start_time = time.time()
                try:
                    async with self.session.get(url) as response:
                        await response.text()
                        if response.status == 200:
                            end_time = time.time()
                            user_times.append((end_time - start_time) * 1000)
                except Exception as e:
                    logger.error(f"Concurrent request error: {e}")
            return user_times
        
        logger.info(f"Testing {endpoint} with {concurrent_users} concurrent users, {requests_per_user} requests each...")
        
        start_time = time.time()
        tasks = [user_simulation() for _ in range(concurrent_users)]
        results = await asyncio.gather(*tasks)
        total_time = time.time() - start_time
        
        all_times = []
        for user_times in results:
            all_times.extend(user_times)
        
        if all_times:
            return {
                "endpoint": endpoint,
                "concurrent_users": concurrent_users,
                "requests_per_user": requests_per_user,
                "total_requests": len(all_times),
                "total_test_time_s": round(total_time, 2),
                "requests_per_second": round(len(all_times) / total_time, 2),
                "avg_response_time_ms": round(statistics.mean(all_times), 2),
                "min_response_time_ms": round(min(all_times), 2),
                "max_response_time_ms": round(max(all_times), 2),
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {"error": "No successful requests in concurrent test"}
    
    async def comprehensive_test_suite(self) -> Dict[str, Any]:
        """Run a comprehensive test suite on all critical endpoints."""
        
        test_results = {
            "test_start": datetime.now().isoformat(),
            "endpoints": {}
        }
        
        # Define test cases for each endpoint
        test_cases = [
            {"endpoint": "/", "method": "GET", "iterations": 20},
            {"endpoint": "/health", "method": "GET", "iterations": 20},
            {"endpoint": "/test", "method": "GET", "iterations": 20},
            {"endpoint": "/examples", "method": "GET", "iterations": 15},
            {"endpoint": "/collections", "method": "GET", "iterations": 10},
            {"endpoint": "/network/stats", "method": "GET", "iterations": 10},
            {"endpoint": "/network/graph", "method": "GET", "iterations": 5},
            {"endpoint": "/visualization/time-series", "method": "GET", "iterations": 5},
            {"endpoint": "/visualization/bar-chart", "method": "GET", "iterations": 5},
            {"endpoint": "/analyze", "method": "POST", "iterations": 5, 
             "data": {
                 "query": "Show me network statistics",
                 "analysis_type": "auto",
                 "user": "performance_test"
             }}
        ]
        
        for test_case in test_cases:
            endpoint = test_case["endpoint"]
            try:
                # Regular performance test
                result = await self.test_endpoint(
                    endpoint=endpoint,
                    method=test_case["method"],
                    data=test_case.get("data"),
                    iterations=test_case["iterations"]
                )
                
                test_results["endpoints"][endpoint] = {
                    "performance": result
                }
                
                # Concurrent test for critical endpoints
                if endpoint in ["/", "/health", "/network/stats"]:
                    concurrent_result = await self.test_concurrent_requests(
                        endpoint=endpoint,
                        concurrent_users=3,
                        requests_per_user=3
                    )
                    test_results["endpoints"][endpoint]["concurrent"] = concurrent_result
                
                logger.info(f"✅ Completed testing {endpoint}")
                
            except Exception as e:
                logger.error(f"❌ Failed testing {endpoint}: {e}")
                test_results["endpoints"][endpoint] = {"error": str(e)}
        
        test_results["test_end"] = datetime.now().isoformat()
        return test_results
    
    def print_results(self, results: Dict[str, Any]):
        """Print formatted test results."""
        print("\n" + "="*80)
        print("API PERFORMANCE TEST RESULTS")
        print("="*80)
        print(f"Test Period: {results['test_start']} to {results['test_end']}")
        print()
        
        for endpoint, data in results["endpoints"].items():
            print(f"🔗 {endpoint}")
            print("-" * 60)
            
            if "error" in data:
                print(f"   ❌ Error: {data['error']}")
                continue
            
            perf = data.get("performance", {})
            if perf and "avg_response_time_ms" in perf:
                print(f"   📊 Performance ({perf['iterations']} requests):")
                print(f"      • Average: {perf['avg_response_time_ms']}ms")
                print(f"      • Min/Max: {perf['min_response_time_ms']}ms / {perf['max_response_time_ms']}ms")
                print(f"      • Success Rate: {perf['successful_requests']}/{perf['iterations']} requests")
                
                if perf.get("errors"):
                    print(f"      • Errors: {len(perf['errors'])}")
            
            concurrent = data.get("concurrent", {})
            if concurrent and "requests_per_second" in concurrent:
                print(f"   🚀 Concurrent Load:")
                print(f"      • Throughput: {concurrent['requests_per_second']} req/s")
                print(f"      • Average Response: {concurrent['avg_response_time_ms']}ms")
            
            print()
        
        # Summary
        print("📈 SUMMARY")
        print("-" * 60)
        successful_endpoints = [ep for ep, data in results["endpoints"].items() 
                              if "error" not in data and "performance" in data]
        
        if successful_endpoints:
            avg_times = [results["endpoints"][ep]["performance"]["avg_response_time_ms"] 
                        for ep in successful_endpoints 
                        if "avg_response_time_ms" in results["endpoints"][ep]["performance"]]
            
            if avg_times:
                print(f"Total Endpoints Tested: {len(results['endpoints'])}")
                print(f"Successful Endpoints: {len(successful_endpoints)}")
                print(f"Overall Average Response Time: {round(statistics.mean(avg_times), 2)}ms")
                print(f"Fastest Endpoint: {round(min(avg_times), 2)}ms")
                print(f"Slowest Endpoint: {round(max(avg_times), 2)}ms")
        
        print("="*80)

async def main():
    """Main function to run performance tests."""
    async with APIPerformanceTester() as tester:
        print("Starting API Performance Tests...")
        print("Make sure the API server is running on http://localhost:8000")
        print()
        
        # Run comprehensive test suite
        results = await tester.comprehensive_test_suite()
        
        # Print results
        tester.print_results(results)
        
        # Save results to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"performance_results_{timestamp}.json"
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"📁 Results saved to: {filename}")

if __name__ == "__main__":
    asyncio.run(main()) 