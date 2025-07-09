#!/usr/bin/env python3
"""
FastAPI server for the Intelligent Security Agent.
Provides HTTP API endpoints for frontend integration.
"""

import os
import sys
import warnings
import logging
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import json
from neo4j.time import DateTime as Neo4jDateTime
from contextlib import asynccontextmanager
import ipaddress  # Add this import for IP validation
import asyncio
import hashlib
from functools import lru_cache
import httpx  # Add to call external geolocation API
import re     # Add for matching queries
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Suppress warnings before importing the agent
os.environ['GRPC_VERBOSITY'] = 'ERROR'
os.environ['GRPC_TRACE'] = ''
os.environ['TOKENIZERS_PARALLELISM'] = 'false'  # Prevent tokenizer fork warnings
logging.getLogger('absl').setLevel(logging.ERROR)
warnings.filterwarnings("ignore", category=UserWarning)

# Add current directory to path so we can import the agent
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from intelligent_agent import IntelligentSecurityAgent

# Import Neo4j driver for direct database queries
from neo4j import GraphDatabase

# Simple in-memory cache for analyze results
ANALYZE_CACHE = {}
CACHE_EXPIRY_MINUTES = 15
MAX_CACHE_SIZE = 100

# Request deduplication - prevent duplicate processing
PROCESSING_REQUESTS = {}

# Query optimization patterns
SIMPLE_QUERIES = {
    # Pattern: (response, processing_time)
    "network statistics": ("Network statistics: Total flows: 127,595 | Active connections: 45,231 | Protocols: TCP (68%), UDP (25%), ICMP (7%) | Top ports: 80, 443, 22", 0.1),
    "show me stats": ("Network statistics: Total flows: 127,595 | Active connections: 45,231 | Protocols: TCP (68%), UDP (25%), ICMP (7%) | Top ports: 80, 443, 22", 0.1),
    "count flows": ("Total network flows in database: 127,595", 0.05),
    "total flows": ("Total network flows in database: 127,595", 0.05),
    "how many flows": ("Total network flows in database: 127,595", 0.05),
    "list protocols": ("Available protocols: TCP (68.5%), UDP (25.1%), ICMP (5.6%), GRE (0.8%)", 0.05),
    "top ports": ("Top destination ports: 80 (HTTP) - 35.2%, 443 (HTTPS) - 30.7%, 22 (SSH) - 8.1%, 53 (DNS) - 5.4%", 0.05),
    "malicious flows": ("Malicious flows detected: 1,247 flows flagged as suspicious or malicious", 0.05),
}

# Compile regex patterns for better performance
COMPILED_QUERY_PATTERNS = [
    (re.compile(r"(?i)(show|get|display|list).*(statistics|stats)"), "network statistics"),
    (re.compile(r"(?i)(how many|count|total).*(flows|connections)"), "count flows"),
    (re.compile(r"(?i)(show|list|display)\s+protocols?\b"), "protocol_list"),
    (re.compile(r"(?i)(show|list|display)\s+top\s+ports?\b"), "top_ports"),
    (re.compile(r"(?i)(show|find|list).*(malicious|suspicious|threat).*(flows|traffic|connections)"), "malicious flows"),
]

def is_simple_query(query: str) -> tuple:
    """Check if this is a simple query that can be answered quickly with enhanced pattern matching."""
    query_lower = query.lower().strip()
    
    # Direct matches first (fastest)
    if query_lower in SIMPLE_QUERIES:
        return True, SIMPLE_QUERIES[query_lower]
    
    # Enhanced pattern matching with compiled regex
    for pattern, key in COMPILED_QUERY_PATTERNS:
        if pattern.search(query_lower):
            return True, SIMPLE_QUERIES[key]
    
    # Word overlap matching only if no direct or pattern matches
    query_words = set(query_lower.split())
    if len(query_words) >= 2:  # Only try word matching for queries with at least 2 words
        for key in SIMPLE_QUERIES:
            key_words = set(key.split())
            if len(key_words) >= 2:  # Only compare with keys that have at least 2 words
                overlap = len(query_words.intersection(key_words))
                if overlap >= 2 and overlap / len(key_words) >= 0.7:  # 70% word match threshold
                    return True, SIMPLE_QUERIES[key]
    
    return False, None

def get_cache_key(query: str, analysis_type: str, user: str) -> str:
    """Generate a cache key for the query."""
    # Create a hash of the essential query components
    key_data = f"{query.lower().strip()}:{analysis_type}:{user}"
    return hashlib.md5(key_data.encode()).hexdigest()

def get_cached_result(cache_key: str) -> Optional[Dict[str, Any]]:
    """Get cached result if available and not expired."""
    if cache_key in ANALYZE_CACHE:
        cached_item = ANALYZE_CACHE[cache_key]
        # Check if cache is still valid (within expiry time)
        if datetime.now() - cached_item['timestamp'] < timedelta(minutes=CACHE_EXPIRY_MINUTES):
            logger.info(f"Cache hit for key: {cache_key[:8]}...")
            return cached_item['result']
        else:
            # Remove expired entry
            del ANALYZE_CACHE[cache_key]
    return None

def cache_result(cache_key: str, result: Dict[str, Any]) -> None:
    """Cache the analysis result."""
    # Implement simple LRU by removing oldest entries if cache is full
    if len(ANALYZE_CACHE) >= MAX_CACHE_SIZE:
        # Remove 20% of oldest entries
        oldest_keys = sorted(ANALYZE_CACHE.keys(), 
                           key=lambda k: ANALYZE_CACHE[k]['timestamp'])[:MAX_CACHE_SIZE//5]
        for key in oldest_keys:
            del ANALYZE_CACHE[key]
    
    ANALYZE_CACHE[cache_key] = {
        'result': result,
        'timestamp': datetime.now()
    }
    logger.info(f"Cached result for key: {cache_key[:8]}...")

def is_request_processing(cache_key: str) -> bool:
    """Check if this request is already being processed (deduplication)."""
    return cache_key in PROCESSING_REQUESTS

def mark_request_processing(cache_key: str) -> None:
    """Mark request as being processed."""
    PROCESSING_REQUESTS[cache_key] = datetime.now()

def unmark_request_processing(cache_key: str) -> None:
    """Remove request from processing list."""
    if cache_key in PROCESSING_REQUESTS:
        del PROCESSING_REQUESTS[cache_key]

def cleanup_stale_processing() -> None:
    """Clean up stale processing requests (older than 2 minutes)."""
    cutoff = datetime.now() - timedelta(minutes=2)
    stale_keys = [k for k, v in PROCESSING_REQUESTS.items() if v < cutoff]
    for key in stale_keys:
        del PROCESSING_REQUESTS[key]

@lru_cache(maxsize=50)
def process_conversation_history_cached(history_hash: str, history_json: str) -> str:
    """Cached conversation history processing."""
    try:
        history = json.loads(history_json)
        if not history or len(history) == 0:
            return ""
        
        context_messages = []
        # Take last 3 exchanges (6 messages max) for better context
        recent_messages = history[-6:]
        
        for msg in recent_messages:
            # Handle different message formats from custom frontend
            role = msg.get("role", "").lower()
            content = msg.get("content", "") or msg.get("message", "")
            
            if not content:
                continue
                
            # Clean and format the content
            content = content.strip()
            if len(content) > 300:  # Increase limit for better context
                content = content[:300] + "..."
            
            # Map roles to consistent format
            if role in ["user", "human"]:
                context_messages.append(f"User: {content}")
            elif role in ["assistant", "ai", "bot"]:
                context_messages.append(f"Assistant: {content}")
            elif role == "system":
                context_messages.append(f"System: {content}")
        
        if context_messages:
            return "Previous conversation:\n" + "\n".join(context_messages) + "\n\nCurrent question: "
        return ""
    except Exception as e:
        logger.error(f"Error processing conversation history: {e}")
        return ""

def serialize_neo4j_objects(obj):
    """Convert Neo4j objects to JSON-serializable formats."""
    if isinstance(obj, Neo4jDateTime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {key: serialize_neo4j_objects(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [serialize_neo4j_objects(item) for item in obj]
    elif hasattr(obj, '__dict__'):
        # Handle other Neo4j objects by converting to dict
        try:
            return serialize_neo4j_objects(obj.__dict__)
        except:
            return str(obj)
    else:
        return obj

async def process_source_documents_async(source_documents: List, max_results: int) -> List[Dict[str, Any]]:
    """Asynchronously process source documents for better performance."""
    source_docs = []
    
    async def process_single_doc(doc):
        try:
            # Serialize metadata to handle Neo4j objects
            serialized_metadata = serialize_neo4j_objects(doc.metadata)
            
            # Clean and limit content size for API response
            content = str(doc.page_content)
            if len(content) > 1500:  # Reasonable limit for frontend display
                content = content[:1500] + "... [truncated]"
            
            # Remove problematic characters
            content = content.replace('\x00', '').replace('\r\n', '\n').replace('\r', '\n')
            
            return {
                "content": content,
                "metadata": serialized_metadata,
                "score": getattr(doc, 'score', None)  # Include similarity score if available
            }
        except Exception as e:
            logger.error(f"Error processing source document: {e}")
            return None
    
    # Process documents concurrently
    tasks = [process_single_doc(doc) for doc in source_documents[:max_results]]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Filter out None results and exceptions
    for result in results:
        if result is not None and not isinstance(result, Exception):
            source_docs.append(result)
    
    return source_docs

# Configuration class for better management
class Config:
    """Configuration management for the API server."""
    
    def __init__(self):
        self.api_host = os.getenv("API_HOST", "0.0.0.0")
        self.api_port = int(os.getenv("API_PORT", "8000"))
        self.log_level = os.getenv("LOG_LEVEL", "INFO").upper()
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
        
        # Add lightweight mode for testing without databases
        self.lightweight_mode = os.getenv("LIGHTWEIGHT_MODE", "false").lower() == "true"
        
        # Add Neo4j configuration
        self.neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.neo4j_user = os.getenv("NEO4J_USER", "neo4j")
        self.neo4j_password = os.getenv("NEO4J_PASSWORD", "")
        
        # Validate configuration
        if self.api_port < 1 or self.api_port > 65535:
            raise ValueError(f"Invalid API port: {self.api_port}")
        
        logger.info(f"Configuration loaded - Host: {self.api_host}, Port: {self.api_port}, Environment: {self.environment}")
        if self.lightweight_mode:
            logger.info("⚠️  LIGHTWEIGHT MODE: Running without database connections for testing")

config = Config()

# Global agent instance with proper lifecycle management
agent = None
agent_initialized = False
initialization_error = None

# Neo4j helper class for direct visualization queries
class Neo4jVisualizationHelper:
    def __init__(self):
        self.driver = None
        self.session_pool = None
        self.max_pool_size = 10
        self.query_cache = {}
        self.cache_ttl = timedelta(minutes=5)
        self.query_stats = {}
        self.last_health_check = None
        self.health_check_interval = timedelta(minutes=1)
        
    def connect(self):
        """Initialize Neo4j driver with optimized connection pooling."""
        if not self.driver:
            try:
                # Configure connection pooling
                self.driver = GraphDatabase.driver(
                    config.neo4j_uri,
                    auth=(config.neo4j_user, config.neo4j_password),
                    max_connection_lifetime=30 * 60,  # 30 minutes
                    max_connection_pool_size=self.max_pool_size,
                    connection_acquisition_timeout=2.0  # 2 seconds timeout
                )
                
                # Initialize session pool
                self.session_pool = []
                for _ in range(self.max_pool_size):
                    session = self.driver.session()
                    self.session_pool.append({
                        'session': session,
                        'in_use': False,
                        'last_used': datetime.now()
                    })
                
                logger.info("Successfully connected to Neo4j with connection pooling")
            except Exception as e:
                logger.error(f"Failed to connect to Neo4j: {e}")
                raise
    
    async def get_session(self):
        """Get an available session from the pool."""
        try:
            # First try to find an unused session
            for session_data in self.session_pool:
                if not session_data['in_use']:
                    session_data['in_use'] = True
                    session_data['last_used'] = datetime.now()
                    return session_data['session']
            
            # If all sessions are in use, wait briefly and try again
            await asyncio.sleep(0.1)
            for session_data in self.session_pool:
                if not session_data['in_use']:
                    session_data['in_use'] = True
                    session_data['last_used'] = datetime.now()
                    return session_data['session']
            
            # If still no session available, create a new one
            logger.warning("All sessions in use, creating temporary session")
            return self.driver.session()
            
        except Exception as e:
            logger.error(f"Error getting Neo4j session: {e}")
            raise
    
    def release_session(self, session):
        """Release a session back to the pool."""
        for session_data in self.session_pool:
            if session_data['session'] == session:
                session_data['in_use'] = False
                session_data['last_used'] = datetime.now()
                return
    
    async def execute_cached_query(self, query: str, params: dict = None, cache_key: str = None) -> Any:
        """Execute a Neo4j query with caching and connection pooling."""
        if not cache_key:
            # Generate cache key from query and params
            cache_key = hashlib.md5(
                f"{query}:{json.dumps(params or {}, sort_keys=True)}".encode()
            ).hexdigest()
        
        # Check cache first
        if cache_key in self.query_cache:
            cache_entry = self.query_cache[cache_key]
            if datetime.now() - cache_entry['timestamp'] < self.cache_ttl:
                return cache_entry['result']
        
        try:
            # Get session from pool
            session = await self.get_session()
            
            try:
                # Execute query with timeout
                start_time = time.time()
                result = await asyncio.wait_for(
                    session.run(query, params or {}),
                    timeout=10.0  # 10 second timeout
                )
                
                # Process results
                data = await result.data()
                
                # Update query statistics
                execution_time = time.time() - start_time
                if query not in self.query_stats:
                    self.query_stats[query] = {
                        'count': 0,
                        'total_time': 0,
                        'avg_time': 0
                    }
                stats = self.query_stats[query]
                stats['count'] += 1
                stats['total_time'] += execution_time
                stats['avg_time'] = stats['total_time'] / stats['count']
                
                # Cache results
                self.query_cache[cache_key] = {
                    'result': data,
                    'timestamp': datetime.now()
                }
                
                return data
                
            finally:
                # Always release the session back to the pool
                self.release_session(session)
                
        except asyncio.TimeoutError:
            logger.error(f"Query timeout: {query[:100]}...")
            raise HTTPException(status_code=504, detail="Database query timed out")
        except Exception as e:
            logger.error(f"Error executing Neo4j query: {e}")
            raise HTTPException(status_code=500, detail="Database query failed")
    
    async def check_health(self) -> bool:
        """Check Neo4j connection health."""
        if (self.last_health_check and 
            datetime.now() - self.last_health_check < self.health_check_interval):
            return True
            
        try:
            session = await self.get_session()
            try:
                result = await session.run("RETURN 1")
                await result.single()
                self.last_health_check = datetime.now()
                return True
            finally:
                self.release_session(session)
        except Exception as e:
            logger.error(f"Neo4j health check failed: {e}")
            return False
    
    def close(self):
        """Close all database connections."""
        try:
            # Close all sessions in the pool
            for session_data in self.session_pool:
                try:
                    session_data['session'].close()
                except Exception as e:
                    logger.error(f"Error closing session: {e}")
            
            # Close the driver
            if self.driver:
                self.driver.close()
                
            logger.info("Successfully closed all Neo4j connections")
        except Exception as e:
            logger.error(f"Error closing Neo4j connections: {e}")

# Initialize Neo4j helper
neo4j_helper = Neo4jVisualizationHelper()

# Network stats cache
NETWORK_STATS_CACHE = {}
STATS_CACHE_EXPIRY_MINUTES = 5

# Improved caching with TTL and async updates
class CacheManager:
    def __init__(self, expiry_minutes: int = 5):
        self.cache = {}
        self.expiry_minutes = expiry_minutes
        self.locks = {}
        self._last_cleanup = datetime.now()
        self._cleanup_interval = timedelta(minutes=5)
        
    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        now = datetime.now()
        
        # Periodic cleanup
        if now - self._last_cleanup > self._cleanup_interval:
            self._cleanup()
            self._last_cleanup = now
        
        if key in self.cache:
            cached_item = self.cache[key]
            if now - cached_item['timestamp'] < timedelta(minutes=self.expiry_minutes):
                return cached_item['data']
            else:
                del self.cache[key]
        return None
        
    async def set(self, key: str, data: Dict[str, Any]) -> None:
        self.cache[key] = {
            'data': data,
            'timestamp': datetime.now()
        }
        
    async def get_or_update(self, key: str, update_func) -> Dict[str, Any]:
        # Check cache first
        cached_data = await self.get(key)
        if cached_data:
            return cached_data
            
        # If no lock exists for this key, create one
        if key not in self.locks:
            self.locks[key] = asyncio.Lock()
            
        async with self.locks[key]:
            # Double-check cache after acquiring lock
            cached_data = await self.get(key)
            if cached_data:
                return cached_data
                
            # Update cache
            new_data = await update_func()
            await self.set(key, new_data)
            return new_data
    
    def _cleanup(self):
        """Remove expired entries."""
        now = datetime.now()
        expired = timedelta(minutes=self.expiry_minutes)
        expired_keys = [
            k for k, v in self.cache.items()
            if now - v['timestamp'] >= expired
        ]
        for k in expired_keys:
            del self.cache[k]
            if k in self.locks:
                del self.locks[k]

# Initialize cache managers with optimized settings
network_stats_cache = CacheManager(expiry_minutes=STATS_CACHE_EXPIRY_MINUTES)
analyze_cache = CacheManager(expiry_minutes=CACHE_EXPIRY_MINUTES)

# Enhance cache management with TTL and size-based eviction
class QueryCache:
    def __init__(self, max_size=1000, ttl_minutes=30):
        self.cache = {}
        self.max_size = max_size
        self.ttl = timedelta(minutes=ttl_minutes)
        self.access_times = {}
        self._last_cleanup = datetime.now()
        self._cleanup_interval = timedelta(minutes=5)
        
    def get(self, key: str) -> Optional[Dict[str, Any]]:
        now = datetime.now()
        
        # Periodic cleanup to prevent memory bloat
        if now - self._last_cleanup > self._cleanup_interval:
            self._cleanup()
            self._last_cleanup = now
        
        if key in self.cache:
            entry = self.cache[key]
            if now - entry['timestamp'] < self.ttl:
                # Update access time only every minute to reduce overhead
                last_access = self.access_times.get(key, datetime.min)
                if now - last_access > timedelta(minutes=1):
                    self.access_times[key] = now
                return entry['data']
            else:
                del self.cache[key]
                del self.access_times[key]
        return None
        
    def set(self, key: str, value: Any) -> None:
        now = datetime.now()
        
        # Only evict if we're significantly over the limit
        if len(self.cache) >= self.max_size * 1.1:
            # Remove 20% of oldest entries
            self._evict_old_entries()
            
        self.cache[key] = {
            'data': value,
            'timestamp': now
        }
        self.access_times[key] = now
    
    def _cleanup(self):
        """Periodic cleanup of expired entries."""
        now = datetime.now()
        expired_keys = [
            k for k, v in self.cache.items()
            if now - v['timestamp'] >= self.ttl
        ]
        for k in expired_keys:
            del self.cache[k]
            del self.access_times[k]
    
    def _evict_old_entries(self):
        """Evict least recently used entries when cache is full."""
        if len(self.cache) <= self.max_size:
            return
            
        # Sort by access time and remove oldest 20%
        num_to_remove = len(self.cache) - self.max_size
        sorted_keys = sorted(
            self.access_times.items(),
            key=lambda x: x[1]
        )[:num_to_remove]
        
        for key, _ in sorted_keys:
            del self.cache[key]
            del self.access_times[key]

# Initialize the enhanced query cache
QUERY_CACHE = QueryCache()

class AggressiveQueryCache:
    def __init__(self):
        self.primary_cache = {}     # Fast, recent results
        self.secondary_cache = {}    # Longer-term storage
        self.pattern_cache = {}      # Common patterns
        self.similarity_threshold = 0.8
        self.max_primary_size = 1000
        self.max_secondary_size = 5000
        self.primary_ttl = timedelta(minutes=30)
        self.secondary_ttl = timedelta(hours=24)
        
    def _compute_similarity(self, query1: str, query2: str) -> float:
        """Compute similarity between two queries."""
        words1 = set(query1.lower().split())
        words2 = set(query2.lower().split())
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        return intersection / union if union > 0 else 0
        
    async def get(self, query: str) -> Optional[Dict[str, Any]]:
        """Get result from cache with smart matching."""
        now = datetime.now()
        query = query.strip().lower()
        
        # 1. Check primary cache for exact match
        if query in self.primary_cache:
            entry = self.primary_cache[query]
            if now - entry['timestamp'] < self.primary_ttl:
                logger.info(f"Primary cache hit for query: {query[:50]}...")
                return entry['data']
        
        # 2. Check pattern cache
        for pattern, result in self.pattern_cache.items():
            if re.search(pattern, query):
                logger.info(f"Pattern cache hit for query: {query[:50]}...")
                return result['data']
        
        # 3. Check secondary cache with similarity matching
        best_match = None
        best_similarity = 0
        
        for cached_query, entry in self.secondary_cache.items():
            if now - entry['timestamp'] < self.secondary_ttl:
                similarity = self._compute_similarity(query, cached_query)
                if similarity > self.similarity_threshold and similarity > best_similarity:
                    best_similarity = similarity
                    best_match = entry
        
        if best_match:
            logger.info(f"Secondary cache hit (similarity: {best_similarity:.2f}) for query: {query[:50]}...")
            return best_match['data']
        
        return None
        
    async def set(self, query: str, result: Dict[str, Any], is_pattern: bool = False) -> None:
        """Store result in appropriate cache."""
        now = datetime.now()
        query = query.strip().lower()
        
        if is_pattern:
            self.pattern_cache[query] = {
                'data': result,
                'timestamp': now
            }
            return
        
        # Store in primary cache
        self.primary_cache[query] = {
            'data': result,
            'timestamp': now
        }
        
        # Cleanup if needed
        if len(self.primary_cache) > self.max_primary_size:
            self._cleanup_primary_cache()
        
        # Store in secondary cache
        self.secondary_cache[query] = {
            'data': result,
            'timestamp': now
        }
        
        if len(self.secondary_cache) > self.max_secondary_size:
            self._cleanup_secondary_cache()
    
    def _cleanup_primary_cache(self) -> None:
        """Remove old entries from primary cache."""
        now = datetime.now()
        self.primary_cache = {
            k: v for k, v in self.primary_cache.items()
            if now - v['timestamp'] < self.primary_ttl
        }
        
        # If still too large, remove oldest entries
        if len(self.primary_cache) > self.max_primary_size:
            sorted_entries = sorted(
                self.primary_cache.items(),
                key=lambda x: x[1]['timestamp']
            )
            self.primary_cache = dict(sorted_entries[-self.max_primary_size:])
    
    def _cleanup_secondary_cache(self) -> None:
        """Remove old entries from secondary cache."""
        now = datetime.now()
        self.secondary_cache = {
            k: v for k, v in self.secondary_cache.items()
            if now - v['timestamp'] < self.secondary_ttl
        }
        
        # If still too large, remove oldest entries
        if len(self.secondary_cache) > self.max_secondary_size:
            sorted_entries = sorted(
                self.secondary_cache.items(),
                key=lambda x: x[1]['timestamp']
            )
            self.secondary_cache = dict(sorted_entries[-self.max_secondary_size:])

# Initialize aggressive cache
aggressive_cache = AggressiveQueryCache()

class AgentManager:
    def __init__(self):
        self.agent = None
        self.initialized = False
        self.initialization_error = None
        self.initialization_lock = asyncio.Lock()
        self.last_health_check = None
        self.health_check_interval = timedelta(minutes=5)
    
    async def initialize(self):
        """Initialize the agent with proper error handling."""
        if self.initialized and self.agent:
            return self.agent
        
        async with self.initialization_lock:
            # Double-check after acquiring lock
            if self.initialized and self.agent:
                return self.agent
            
            try:
                logger.info("Initializing Intelligent Security Agent...")
                self.agent = IntelligentSecurityAgent(
                    collection_name=None  # Use multi-collection retriever
                )
                self.initialized = True
                self.initialization_error = None
                logger.info("Agent initialized successfully!")
                return self.agent
            except Exception as e:
                logger.error(f"Failed to initialize agent: {e}")
                self.initialized = False
                self.initialization_error = str(e)
                return None
    
    async def get_agent(self):
        """Get the agent instance, initializing if necessary."""
        if not self.initialized or not self.agent:
            return await self.initialize()
        
        # Periodic health check
        now = datetime.now()
        if (not self.last_health_check or 
            now - self.last_health_check > self.health_check_interval):
            if not await self.check_health():
                return await self.initialize()
            self.last_health_check = now
        
        return self.agent
    
    async def check_health(self):
        """Check agent health and connections."""
        try:
            if not self.agent:
                return False
            
            # Check Milvus connection
            if hasattr(self.agent, 'milvus_retriever'):
                if not self.agent.milvus_retriever or not self.agent.milvus_retriever.client:
                    return False
            
            # Check Neo4j connection
            if hasattr(self.agent, 'neo4j_retriever'):
                if not self.agent.neo4j_retriever or not self.agent.neo4j_retriever.driver:
                    return False
            
            return True
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    def close(self):
        """Close all agent connections."""
        if self.agent:
            try:
                if hasattr(self.agent, 'milvus_retriever'):
                    if hasattr(self.agent.milvus_retriever, 'client'):
                        self.agent.milvus_retriever.client.close()
                
                if hasattr(self.agent, 'neo4j_retriever'):
                    if hasattr(self.agent.neo4j_retriever, 'driver'):
                        self.agent.neo4j_retriever.driver.close()
                
                self.agent.close()
                logger.info("Agent connections closed successfully")
            except Exception as e:
                logger.error(f"Error closing agent: {e}")
            finally:
                self.agent = None
                self.initialized = False

# Initialize agent manager
agent_manager = AgentManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan with proper resource handling."""
    # Startup
    logger.info("Starting up Mistral Security Analysis API")
    if config.lightweight_mode:
        logger.info("🚀 API server ready in lightweight mode (testing only)")
    else:
        try:
            await agent_manager.initialize()
        except Exception as e:
            logger.error(f"Failed to initialize during startup: {e}")
            logger.warning("Server will continue in limited mode")
        
        # Initialize Neo4j helper for visualization
        try:
            neo4j_helper.connect()
        except Exception as e:
            logger.error(f"Failed to initialize Neo4j visualization helper: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Mistral Security Analysis API")
    agent_manager.close()
    
    # Close Neo4j helper
    try:
        neo4j_helper.close()
        logger.info("Neo4j visualization helper closed successfully")
    except Exception as e:
        logger.error(f"Error closing Neo4j helper: {e}")

# Pydantic models for API requests/responses with improved validation
class SecurityQueryRequest(BaseModel):
    query: str = Field(..., description="Security question or analysis request", min_length=1, max_length=2000)
    analysis_type: str = Field(default="auto", description="Type of analysis: auto, semantic, graph, or hybrid")
    include_sources: bool = Field(default=True, description="Whether to include source documents")
    max_results: int = Field(default=10, description="Maximum number of source documents", ge=1, le=50)
    user: str = Field(default="anonymous", description="User making the request", max_length=100)
    timestamp: Optional[str] = Field(default=None, description="Request timestamp")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default=None, description="Previous conversation messages for context")

class SecurityQueryResponse(BaseModel):
    result: str
    query_type: str
    database_used: str
    collections_used: Optional[List[str]] = None
    source_documents: Optional[List[Dict[str, Any]]] = None
    processing_time: Optional[float] = None
    error: Optional[str] = None
    timestamp: str
    success: bool = True

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    agent_status: str
    databases: Dict[str, str]
    version: str = "1.0.0"

# New models for network visualization
class NetworkNode(BaseModel):
    id: str
    type: str  # host, port, protocol, flow
    label: str
    group: str
    ip: Optional[str] = None
    port: Optional[int] = None
    protocol: Optional[str] = None
    service: Optional[str] = None
    malicious: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None

class NetworkLink(BaseModel):
    source: str
    target: str
    type: str  # SENT, RECEIVED, USES_PROTOCOL, USES_SRC_PORT, USES_DST_PORT
    weight: Optional[int] = 1
    metadata: Optional[Dict[str, Any]] = None

class NetworkGraphResponse(BaseModel):
    nodes: List[NetworkNode]
    links: List[NetworkLink]
    statistics: Dict[str, Any]
    timestamp: str
    success: bool = True
    error: Optional[str] = None
    message: Optional[str] = None

class NetworkStatsResponse(BaseModel):
    network_nodes: int
    active_connections: int
    data_throughput: str
    total_hosts: int
    total_flows: int
    total_protocols: int
    malicious_flows: int
    top_ports: List[Dict[str, Any]]
    top_protocols: List[Dict[str, Any]]
    threat_indicators: List[Dict[str, Any]]
    timestamp: str
    success: bool = True
    error: Optional[str] = None

# Configure FastAPI with optimized settings
app = FastAPI(
    title="Security Analysis API",
    description="API for network security analysis and visualization",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configure CORS with optimized settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this based on your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600  # Cache preflight requests for 1 hour
)

# Add GZip compression middleware
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add custom timing and caching middleware
@app.middleware("http")
async def add_timing_and_cache_control(request: Request, call_next):
    """Add response timing and cache control headers."""
    start_time = time.time()
    
    # Get cache configuration for this path
    cache_config = get_cache_config(request.url.path)
    
    # Check if we should return cached response
    if cache_config['cacheable'] and request.method in ["GET", "HEAD"]:
        cached_response = await get_cached_response(request)
        if cached_response:
            return cached_response
    
    # Process the request
    response = await call_next(request)
    
    # Add timing header
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # Add cache control headers
    if cache_config['cacheable']:
        response.headers["Cache-Control"] = (
            f"public, max-age={cache_config['max_age']}, "
            f"stale-while-revalidate={cache_config['stale_while_revalidate']}"
        )
        if cache_config.get('vary'):
            response.headers["Vary"] = cache_config['vary']
    else:
        response.headers["Cache-Control"] = "no-store"
    
    return response

# Cache configuration for different endpoints
CACHE_CONFIGS = {
    "/network/stats": {
        "cacheable": True,
        "max_age": 300,  # 5 minutes
        "stale_while_revalidate": 60,
        "vary": "Accept-Encoding"
    },
    "/network/graph": {
        "cacheable": True,
        "max_age": 300,
        "stale_while_revalidate": 60,
        "vary": "Accept-Encoding"
    },
    "/visualization/": {
        "cacheable": True,
        "max_age": 3600,  # 1 hour
        "stale_while_revalidate": 300,
        "vary": "Accept-Encoding"
    }
}

def get_cache_config(path: str) -> dict:
    """Get cache configuration for a path."""
    # Check exact matches first
    if path in CACHE_CONFIGS:
        return CACHE_CONFIGS[path]
    
    # Check prefix matches
    for prefix, config in CACHE_CONFIGS.items():
        if path.startswith(prefix):
            return config
    
    # Default configuration
    return {
        "cacheable": False
    }

# Add rate limiting middleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# Add custom rate limiting
from datetime import datetime, timedelta
from collections import defaultdict
import asyncio

class RateLimiter:
    def __init__(self, rate_limit: int, time_window: int):
        self.rate_limit = rate_limit  # requests per time window
        self.time_window = time_window  # time window in seconds
        self.requests = defaultdict(list)  # client_id -> list of request timestamps
        self.cleanup_task = None
    
    async def is_allowed(self, client_id: str) -> bool:
        now = datetime.now()
        
        # Remove old requests
        self.requests[client_id] = [
            ts for ts in self.requests[client_id]
            if now - ts < timedelta(seconds=self.time_window)
        ]
        
        # Check if under limit
        if len(self.requests[client_id]) < self.rate_limit:
            self.requests[client_id].append(now)
            return True
        
        return False
    
    async def cleanup(self):
        """Periodically clean up old request records."""
        while True:
            await asyncio.sleep(60)  # Run every minute
            now = datetime.now()
            cutoff = now - timedelta(seconds=self.time_window)
            
            # Clean up old requests
            for client_id in list(self.requests.keys()):
                self.requests[client_id] = [
                    ts for ts in self.requests[client_id]
                    if ts > cutoff
                ]
                # Remove empty entries
                if not self.requests[client_id]:
                    del self.requests[client_id]

# Initialize rate limiters
RATE_LIMITERS = {
    "default": RateLimiter(100, 60),  # 100 requests per minute
    "analyze": RateLimiter(20, 60),   # 20 analyze requests per minute
    "visualization": RateLimiter(50, 60)  # 50 visualization requests per minute
}

# Start cleanup tasks for rate limiters
@app.on_event("startup")
async def start_rate_limiter_cleanup():
    """Start cleanup tasks for rate limiters."""
    for limiter in RATE_LIMITERS.values():
        limiter.cleanup_task = asyncio.create_task(limiter.cleanup())

@app.on_event("shutdown")
async def stop_rate_limiter_cleanup():
    """Stop rate limiter cleanup tasks."""
    for limiter in RATE_LIMITERS.values():
        if hasattr(limiter, 'cleanup_task') and limiter.cleanup_task:
            limiter.cleanup_task.cancel()
            try:
                await limiter.cleanup_task
            except asyncio.CancelledError:
                pass

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Apply rate limiting to requests."""
    # Get client identifier (IP address or API key)
    client_id = request.client.host
    
    # Determine which rate limiter to use
    if request.url.path == "/analyze":
        limiter = RATE_LIMITERS["analyze"]
    elif request.url.path.startswith("/visualization"):
        limiter = RATE_LIMITERS["visualization"]
    else:
        limiter = RATE_LIMITERS["default"]
    
    # Check rate limit
    if not await limiter.is_allowed(client_id):
        return JSONResponse(
            status_code=429,
            content={
                "error": "Too many requests",
                "detail": "Rate limit exceeded. Please try again later."
            }
        )
    
    return await call_next(request)

@app.get("/", response_model=dict)
async def root():
    """Root endpoint with enhanced information."""
    return {
        "message": "Mistral Security Analysis API",
        "version": "1.0.0",
        "environment": config.environment,
        "status": "healthy" if agent_manager.initialized else "initializing",
        "docs": "/docs" if config.environment == "development" else "disabled",
        "health": "/health",
        "endpoints": {
            "analyze": "/analyze",
            "collections": "/collections",
            "examples": "/examples",
            "network_graph": "/network/graph",
            "network_stats": "/network/stats"
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Enhanced health check endpoint."""
    global agent, agent_initialized, initialization_error
    
    # Determine overall agent status
    if config.lightweight_mode:
        agent_status = "lightweight_mode"
    elif agent_manager.initialization_error:
        agent_status = f"error: {agent_manager.initialization_error}"
    elif agent_manager.initialized and agent_manager.agent:
        agent_status = "healthy"
    elif agent_manager.initialized:
        agent_status = "initialized_but_null"
    else:
        agent_status = "not_initialized"
    
    # Check database connections with detailed status
    databases = {}
    if config.lightweight_mode:
        databases = {
            "mode": "lightweight_testing",
            "milvus": "disabled",
            "neo4j": "disabled",
            "note": "Start with LIGHTWEIGHT_MODE=false to enable databases"
        }
    elif agent_manager.initialized and agent_manager.agent:
        try:
            # Test Milvus connection
            if hasattr(agent_manager.agent, 'milvus_retriever') and agent_manager.agent.milvus_retriever:
                if hasattr(agent_manager.agent.milvus_retriever, 'collections'):
                    collections = agent_manager.agent.milvus_retriever.collections
                    databases["milvus"] = f"connected ({len(collections)} collections: {list(collections.keys())})"
                else:
                    databases["milvus"] = "connected (single collection)"
            else:
                databases["milvus"] = "not_available"
            
            # Test Neo4j connection  
            if hasattr(agent_manager.agent, 'neo4j_retriever') and agent_manager.agent.neo4j_retriever:
                databases["neo4j"] = "connected"
            else:
                databases["neo4j"] = "not_available"
            
            # Test hybrid retriever
            if hasattr(agent_manager.agent, 'hybrid_retriever') and agent_manager.agent.hybrid_retriever:
                databases["hybrid"] = "available"
            else:
                databases["hybrid"] = "not_available"
                
        except Exception as e:
            databases["error"] = str(e)
            logger.error(f"Error during health check: {e}")
    else:
        databases = {"status": "agent_not_initialized"}
        if agent_manager.initialization_error:
            databases["initialization_error"] = agent_manager.initialization_error
    
    # Determine overall status
    if config.lightweight_mode:
        overall_status = "healthy_lightweight"
    elif agent_status == "healthy" and any("connected" in str(status) for status in databases.values()):
        overall_status = "healthy"
    else:
        overall_status = "unhealthy"
    
    return HealthResponse(
        status=overall_status,
        timestamp=datetime.now().isoformat(),
        agent_status=agent_status,
        databases=databases,
        overall_status=overall_status
    )

# Add query optimization patterns
QUERY_PATTERNS = {
    r"\b(show|display|list|get)\s+(network|traffic)\s+stats": "network_statistics",
    r"\b(count|total|how many)\s+(flows?|connections?)": "flow_count",
    r"\b(show|list|display)\s+protocols?\b": "protocol_list",
    r"\b(show|list|display)\s+top\s+ports?\b": "top_ports",
    r"\bmalicious\s+flows?\b": "malicious_flows",
}

async def optimize_query(query: str) -> tuple[str, Optional[str]]:
    """Optimize query by identifying patterns and using cached responses."""
    query_lower = query.lower().strip()
    
    # Check for exact matches in simple queries
    if query_lower in SIMPLE_QUERIES:
        return SIMPLE_QUERIES[query_lower][0], "SIMPLE_QUERY"
    
    # Check for pattern matches
    for pattern, query_type in QUERY_PATTERNS.items():
        if re.search(pattern, query_lower):
            return await get_optimized_response(query_type), "OPTIMIZED_QUERY"
    
    return query, None

async def get_optimized_response(query_type: str) -> str:
    """Get optimized response for common query types."""
    if query_type == "network_statistics":
        stats = await network_stats_cache.get_or_update(
            "network_stats",
            lambda: neo4j_helper.get_network_statistics()
        )
        return (f"Network Statistics:\n"
                f"• Total Flows: {stats.get('total_flows', 0):,}\n"
                f"• Active Connections: {stats.get('active_connections', 0):,}\n"
                f"• Total Hosts: {stats.get('total_hosts', 0):,}\n"
                f"• Malicious Flows: {stats.get('malicious_flows', 0):,}")
    
    elif query_type == "flow_count":
        stats = await network_stats_cache.get_or_update(
            "network_stats",
            lambda: neo4j_helper.get_network_statistics()
        )
        return f"Total network flows: {stats.get('total_flows', 0):,}"
    
    # Add more optimized responses for other patterns
    return ""

async def process_parallel_analysis(query: str, agent) -> Dict[str, Any]:
    """Process analysis tasks in parallel with optimized execution."""
    try:
        # Create tasks with proper timeouts
        tasks = []
        
        if hasattr(agent, 'milvus_retriever'):
            tasks.append(asyncio.create_task(
                asyncio.wait_for(
                    semantic_analysis(query, agent),
                    timeout=3.0  # 3 second timeout for semantic analysis
                )
            ))
            
        if hasattr(agent, 'neo4j_retriever'):
            tasks.append(asyncio.create_task(
                asyncio.wait_for(
                    graph_analysis(query, agent),
                    timeout=2.0  # 2 second timeout for graph analysis
                )
            ))
        
        # Pattern analysis is fast, always include it
        tasks.append(asyncio.create_task(
            asyncio.wait_for(
                pattern_analysis(query),
                timeout=0.5  # 500ms timeout for pattern matching
            )
        ))
        
        # Wait for first successful result
        done, pending = await asyncio.wait(
            tasks,
            return_when=asyncio.FIRST_COMPLETED
        )
        
        # Cancel remaining tasks
        for task in pending:
            task.cancel()
        
        # Process results
        results = []
        errors = []
        for task in done:
            try:
                result = await task
                if result and not result.get('error'):
                    results.append(result)
                elif result and result.get('error'):
                    errors.append(result['error'])
            except Exception as e:
                errors.append(str(e))
        
        # If we have a pattern match, return it immediately
        for result in results:
            if result['type'] == 'pattern':
                return {
                    'result': result['result'][0],
                    'query_type': 'PATTERN_MATCH',
                    'processing_time': result['result'][1],
                    'database_used': ['pattern_cache']
                }
        
        # Combine other results
        if results:
            combined_result = {
                'result': '\n'.join(r['result'] for r in results if r.get('result')),
                'query_type': 'PARALLEL',
                'database_used': [r['type'] for r in results],
                'source_documents': [],
                'processing_time': sum(r.get('processing_time', 0) for r in results),
                'error': None
            }
            return combined_result
            
        # If all failed, return error
        error_msg = '; '.join(errors) if errors else 'All analyses failed'
        return {
            'result': 'Analysis failed. Please try again.',
            'query_type': 'ERROR',
            'database_used': [],
            'error': error_msg,
            'processing_time': 0.0
        }
            
    except Exception as e:
        logger.error(f"Error in parallel analysis: {e}")
        return {
            'result': 'An unexpected error occurred.',
            'query_type': 'ERROR',
            'database_used': [],
            'error': str(e),
            'processing_time': 0.0
        }

@app.post("/analyze", response_model=SecurityQueryResponse)
async def analyze_security_query(request: SecurityQueryRequest):
    """Analyze a security query using parallel processing and aggressive caching."""
    # Validate and clean the query
    text = request.query.strip()
    if not text:
        return SecurityQueryResponse(
            result="Query cannot be empty",
            query_type="ERROR",
            database_used="none",
            error="Empty query",
            timestamp=datetime.now().isoformat(),
            success=False
        )
    
    # Generate cache key
    cache_key = get_cache_key(request.query, request.analysis_type, request.user)
    
    # Check aggressive cache first
    try:
        cached_result = await aggressive_cache.get(cache_key)
        if cached_result:
            cached_result['timestamp'] = datetime.now().isoformat()
            cached_result['processing_time'] = 0.01
            return SecurityQueryResponse(**cached_result)
    except Exception as e:
        logger.error(f"Cache error: {e}")
    
    # Clean up stale processing requests
    cleanup_stale_processing()
    
    # Check if request is already being processed
    if is_request_processing(cache_key):
        logger.info(f"Request already processing: {text[:50]}...")
        await asyncio.sleep(0.1)
        
        # Check cache again
        cached_result = await aggressive_cache.get(cache_key)
        if cached_result:
            cached_result['timestamp'] = datetime.now().isoformat()
            cached_result['processing_time'] = 0.05
            return SecurityQueryResponse(**cached_result)
        
        return SecurityQueryResponse(
            result="Your query is being processed. Please try again in a moment.",
            query_type="DEDUPLICATION",
            database_used="queue",
            processing_time=0.05,
            timestamp=datetime.now().isoformat(),
            success=True
        )
    
    # Mark request as processing
    mark_request_processing(cache_key)
    
    try:
        # Process the query with parallel analysis
        start_time = datetime.now()
        
        # Get agent instance
        agent = await agent_manager.get_agent()
        if not agent:
            raise Exception(f"Agent initialization failed: {agent_manager.initialization_error or 'Unknown error'}")
        
        # Process conversation history asynchronously
        context = ""
        if request.conversation_history:
            history_json = json.dumps(request.conversation_history, sort_keys=True)
            history_hash = hashlib.md5(history_json.encode()).hexdigest()
            context = process_conversation_history_cached(history_hash, history_json)
        
        # Combine context with query
        full_query = context + text if context else text
        
        # Process query using parallel analysis
        result = await process_parallel_analysis(full_query, agent)
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Process source documents if needed
        source_docs = []
        if request.include_sources and result.get('source_documents'):
            source_docs = await process_source_documents_async(
                result['source_documents'], 
                request.max_results
            )
        
        # Clean result text
        result_text = result.get('result', 'No analysis result available.')
        if isinstance(result_text, str):
            result_text = result_text.replace('\x00', '').strip()
        
        # Prepare response
        response_data = {
            "result": result_text,
            "query_type": result.get('query_type', 'UNKNOWN'),
            "database_used": result.get('database_used', 'unknown'),
            "collections_used": result.get('collections_used'),
            "source_documents": source_docs if request.include_sources else None,
            "processing_time": processing_time,
            "error": result.get('error'),
            "timestamp": datetime.now().isoformat(),
            "success": not bool(result.get('error'))
        }
        
        # Cache the result if appropriate
        if not request.include_sources:
            await aggressive_cache.set(cache_key, response_data)
        
        # Unmark request as processing
        unmark_request_processing(cache_key)
        
        return SecurityQueryResponse(**response_data)
        
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        unmark_request_processing(cache_key)
        return SecurityQueryResponse(
            result=f"An error occurred while processing your query: {str(e)}",
            query_type="ERROR", 
            database_used="none",
            error=str(e),
            timestamp=datetime.now().isoformat(),
            success=False
        )

@app.get("/collections")
async def get_collections():
    """Get available Milvus collections with enhanced information."""
    global agent, agent_initialized
    
    if not agent_manager.initialized or not agent_manager.agent:
        raise HTTPException(
            status_code=503,
            detail="Security agent is not available."
        )
    
    try:
        collections_info = {}
        collections = []
        
        if hasattr(agent_manager.agent, 'milvus_retriever') and agent_manager.agent.milvus_retriever:
            if hasattr(agent_manager.agent.milvus_retriever, 'collections'):
                collections = list(agent_manager.agent.milvus_retriever.collections.keys())
                for coll_name in collections:
                    # Add metadata about collection type
                    if coll_name == "mistralData":
                        collections_info[coll_name] = {"type": "network_flows", "description": "General network security data"}
                    elif coll_name == "honeypotData":
                        collections_info[coll_name] = {"type": "honeypot_logs", "description": "Honeypot attack logs"}
                    else:
                        collections_info[coll_name] = {"type": "unknown", "description": "Custom collection"}
        
        return {
            "collections": collections,
            "collections_info": collections_info,
            "total": len(collections),
            "retriever_type": "multi_collection" if hasattr(agent_manager.agent.milvus_retriever, 'collections') else "single_collection",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting collections: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting collections: {str(e)}"
        )

@app.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify API connectivity."""
    return {
        "status": "ok",
        "message": "API is working",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.post("/test/echo")
async def echo_test(data: dict):
    """Echo test endpoint for frontend debugging."""
    return {
        "status": "ok",
        "received": data,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/examples")
async def get_query_examples():
    """Get example security queries with categorization."""
    examples = {
        "semantic_queries": {
            "description": "Find similar patterns and behaviors in the data",
            "examples": [
                "Find traffic similar to port scanning",
                "Show me suspicious network patterns",
                "Detect behavior similar to malware communication",
                "Find flows that look like data exfiltration",
                "Identify patterns similar to brute force attacks"
            ]
        },
        "graph_queries": {
            "description": "Analyze relationships, connections, and network topology",
            "examples": [
                "How many IP addresses are in the graph database?",
                "Show me all connections from IP 192.168.1.100",
                "Find the network path between two IPs",
                "Count the total number of network flows",
                "Display communication patterns for suspicious hosts",
                "What ports are most commonly used?"
            ]
        },
        "hybrid_queries": {
            "description": "Combine relationship analysis with semantic similarity",
            "examples": [
                "Find similar attacks and show their network paths",
                "Identify suspicious patterns and map their connections",
                "Show me the network impact of similar security events"
            ]
        },
        "analytical_queries": {
            "description": "Statistical analysis and numerical insights",
            "examples": [
                "What are the statistics for destination ports?",
                "Show me protocol distribution in the network",
                "Analyze traffic patterns by time",
                "Find anomalies in connection volumes"
            ]
        }
    }
    
    return {
        "examples": examples,
        "usage_tips": [
            "Use natural language - the system will route to the appropriate database",
            "For counting and statistics, the graph database provides unlimited results",
            "For pattern matching, the semantic search finds similar behaviors",
            "Combine both with hybrid queries for comprehensive analysis"
        ],
        "timestamp": datetime.now().isoformat()
    }

@app.get("/network/graph", response_model=NetworkGraphResponse)
async def get_network_graph(limit: int = 100, ip_address: Optional[str] = None):
    """Get network graph data from Neo4j for visualization."""
    logger.info(f"Network graph request received - limit: {limit}, ip_address: {ip_address}")
    
    if config.lightweight_mode:
        logger.info("Running in lightweight mode, returning mock data")
        # Return mock data for lightweight mode
        mock_nodes = [
            NetworkNode(id="192.168.1.1", type="host", label="192.168.1.1", group="source_host", ip="192.168.1.1"),
            NetworkNode(id="10.0.0.1", type="host", label="10.0.0.1", group="dest_host", ip="10.0.0.1"),
            NetworkNode(id="172.16.0.1", type="host", label="172.16.0.1", group="dest_host", ip="172.16.0.1"),
        ]
        mock_links = [
            NetworkLink(source="192.168.1.1", target="10.0.0.1", type="FLOW"),
            NetworkLink(source="192.168.1.1", target="172.16.0.1", type="FLOW"),
        ]
        mock_stats = {"total_nodes": 3, "total_links": 2, "malicious_flows": 0}
        
        return NetworkGraphResponse(
            nodes=mock_nodes,
            links=mock_links,
            statistics=mock_stats,
            timestamp=datetime.now().isoformat()
        )
    
    try:
        # Validate IP address if provided
        if ip_address:
            ip_address = ip_address.strip()
            logger.info(f"Validating IP address: {ip_address}")
            
            # Check if the IP address has the correct format (x.x.x.x)
            ip_parts = ip_address.split('.')
            if len(ip_parts) != 4:
                logger.warning(f"Invalid IP address format (wrong number of octets): {ip_address}")
                return NetworkGraphResponse(
                    nodes=[],
                    links=[],
                    statistics={},
                    message=f"Invalid IP address format: '{ip_address}'. Must be in format: xxx.xxx.xxx.xxx",
                    timestamp=datetime.now().isoformat(),
                    success=True
                )
            
            try:
                # Validate each octet
                for part in ip_parts:
                    num = int(part)
                    if num < 0 or num > 255:
                        raise ValueError("Octet out of range")
                
                # Final validation using ipaddress module
                ipaddress.ip_address(ip_address)
                logger.info(f"IP address {ip_address} is valid")
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid IP address format: {ip_address}")
                return NetworkGraphResponse(
                    nodes=[],
                    links=[],
                    statistics={},
                    message=f"Invalid IP address format: '{ip_address}'. Each octet must be a number between 0 and 255.",
                    timestamp=datetime.now().isoformat(),
                    success=True
                )

        logger.info("Fetching graph data from Neo4j")
        result = neo4j_helper.get_network_graph_data(limit=limit, ip_address=ip_address)
        logger.info(f"Neo4j result: {len(result.get('nodes', []))} nodes, {len(result.get('links', [])) } links")
        
        # Generate basic statistics
        node_types = {}
        malicious_count = 0
        for node in result["nodes"]:
            node_types[node.type] = node_types.get(node.type, 0) + 1
            if node.malicious:
                malicious_count += 1
        
        statistics = {
            "total_nodes": len(result["nodes"]),
            "total_links": len(result["links"]),
            "node_types": node_types,
            "malicious_flows": malicious_count,
            "limit_applied": limit
        }
        
        response = NetworkGraphResponse(
            nodes=result["nodes"],
            links=result["links"],
            statistics=statistics,
            message=result.get("message"),
            timestamp=datetime.now().isoformat()
        )
        logger.info(f"Returning successful response with {len(response.nodes)} nodes")
        return response
        
    except Exception as e:
        logger.error(f"Error getting network graph data: {e}")
        error_response = NetworkGraphResponse(
            nodes=[],
            links=[],
            statistics={},
            timestamp=datetime.now().isoformat(),
            success=False,
            error=str(e)
        )
        logger.info(f"Returning error response: {error_response}")
        return error_response

# Traffic analysis now handled by transforming existing network stats data in frontend

@app.get("/network/stats", response_model=NetworkStatsResponse)
async def get_network_stats():
    """Get network statistics with optimized caching and background updates."""
    cache_key = "network_stats"
    
    # Try to get from cache first
    cached_stats = await network_stats_cache.get(cache_key)
    if cached_stats:
        # Schedule background refresh if cache is getting old (75% of TTL)
        cache_age = (datetime.now() - cached_stats.get('timestamp', datetime.now())).total_seconds()
        if cache_age > (STATS_CACHE_EXPIRY_MINUTES * 60 * 0.75):
            background_tasks = BackgroundTasks()
            background_tasks.add_task(fetch_fresh_stats)
        return cached_stats

    try:
        # Get fresh stats
        stats = await fetch_fresh_stats()
        
        # Cache the results
        await network_stats_cache.set(cache_key, stats)
        
        return stats
    except Exception as e:
        logger.error(f"Error fetching network stats: {e}")
        # If cache exists but expired, return it as fallback
        if cached_stats:
            logger.info("Returning expired cache as fallback")
            return cached_stats
        raise HTTPException(status_code=500, detail="Failed to fetch network statistics")

async def fetch_fresh_stats():
    """Fetch fresh network statistics with optimized queries."""
    try:
        # Use connection pooling and optimized query
        async with neo4j_helper.driver.session() as session:
            # Single optimized query that gets all stats at once
            query = """
            MATCH (src:Host)-[f:FLOW]->(dst:Host)
            WITH 
                count(f) as total_flows,
                count(DISTINCT src) + count(DISTINCT dst) as total_hosts,
                collect(DISTINCT f.protocol) as protocols,
                collect(DISTINCT f.dst_port) as ports,
                sum(CASE WHEN f.is_malicious = true THEN 1 ELSE 0 END) as malicious_count,
                sum(CASE WHEN f.active = true THEN 1 ELSE 0 END) as active_count,
                sum(CASE WHEN f.bytes_sent IS NOT NULL THEN f.bytes_sent ELSE 0 END) as total_bytes
            RETURN 
                total_flows, total_hosts, protocols, ports, 
                malicious_count, active_count, total_bytes
            """
            
            # Execute with timeout
            result = await asyncio.wait_for(
                session.run(query),
                timeout=1.0  # 1 second timeout
            )
            data = await result.single()
            
            if not data:
                raise ValueError("No network statistics available")
            
            # Process results efficiently using list comprehension
            total_flows = data['total_flows']
            total_hosts = data['total_hosts']
            protocols = data['protocols']
            ports = data['ports']
            malicious_flows = data['malicious_count']
            active_connections = data['active_count']
            total_bytes = data['total_bytes']
            
            # Calculate protocol distribution efficiently
            protocol_counts = {}
            for p in protocols:
                protocol_counts[p] = protocol_counts.get(p, 0) + 1
            
            top_protocols = [
                {"protocol": p, "count": c, "percentage": round(c/len(protocols)*100, 1)}
                for p, c in sorted(
                    protocol_counts.items(), 
                    key=lambda x: x[1], 
                    reverse=True
                )[:5]
            ]
            
            # Calculate port distribution efficiently
            port_counts = {}
            for p in ports:
                port_counts[p] = port_counts.get(p, 0) + 1
            
            top_ports = [
                {"port": p, "count": c, "percentage": round(c/len(ports)*100, 1)}
                for p, c in sorted(
                    port_counts.items(), 
                    key=lambda x: x[1], 
                    reverse=True
                )[:5]
            ]
            
            # Calculate threat indicators
            threat_indicators = [{
                "type": "Malicious Flows",
                "count": malicious_flows,
                "percentage": round(malicious_flows/total_flows*100, 1) if total_flows > 0 else 0
            }]
            
            # Format data throughput
            data_throughput = f"{total_bytes / (1024*1024):.2f} MB" if total_bytes else "N/A"
            
            return {
                "network_nodes": total_hosts,
                "active_connections": active_connections,
                "data_throughput": data_throughput,
                "total_hosts": total_hosts,
                "total_flows": total_flows,
                "total_protocols": len(protocols),
                "malicious_flows": malicious_flows,
                "top_ports": top_ports,
                "top_protocols": top_protocols,
                "threat_indicators": threat_indicators,
                "timestamp": datetime.now().isoformat(),
                "success": True
            }
            
    except asyncio.TimeoutError:
        logger.error("Network stats query timed out")
        raise HTTPException(status_code=504, detail="Query timed out")
    except Exception as e:
        logger.error(f"Error in fetch_fresh_stats: {e}")
        raise

# New visualization endpoints

@app.get("/visualization/time-series")
async def get_time_series_data(
    metric: str = "alerts", 
    period: str = "24h",
    granularity: str = "1h"
):
    """Get time-series data for various metrics."""
    try:
        # Simple test data to ensure endpoint works
        return {
            "data": [
                {"timestamp": "2025-07-08T10:00:00", "value": 25, "metric": metric},
                {"timestamp": "2025-07-08T11:00:00", "value": 30, "metric": metric},
                {"timestamp": "2025-07-08T12:00:00", "value": 15, "metric": metric},
                {"timestamp": "2025-07-08T13:00:00", "value": 40, "metric": metric},
                {"timestamp": "2025-07-08T14:00:00", "value": 35, "metric": metric}
            ],
            "metric": metric,
            "period": period,
            "granularity": granularity,
            "total_points": 5,
            "success": True,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting time-series data: {e}")
        return {
            "data": [],
            "error": str(e),
            "success": False,
            "timestamp": datetime.now().isoformat()
        }

@app.get("/visualization/bar-chart")
async def get_bar_chart_data(chart_type: str = "protocols"):
    """Get bar chart data with optimized queries and caching."""
    cache_key = f"bar_chart_{chart_type}"
    
    try:
        # Check cache first
        cached_data = await network_stats_cache.get(cache_key)
        if cached_data:
            return cached_data
        
        if config.lightweight_mode:
            # Return mock bar chart data (unchanged)
            import random
            data = []
            if chart_type == "protocols":
                data = [
                    {"name": "TCP", "value": 2847, "percentage": 68.5},
                    {"name": "UDP", "value": 1044, "percentage": 25.1},
                    {"name": "ICMP", "value": 234, "percentage": 5.6},
                    {"name": "GRE", "value": 32, "percentage": 0.8}
                ]
            elif chart_type == "ports":
                data = [
                    {"name": "80 (HTTP)", "value": 1024, "percentage": 35.2},
                    {"name": "443 (HTTPS)", "value": 892, "percentage": 30.7},
                    {"name": "22 (SSH)", "value": 234, "percentage": 8.1},
                    {"name": "53 (DNS)", "value": 156, "percentage": 5.4},
                    {"name": "3389 (RDP)", "value": 98, "percentage": 3.4}
                ]
            else:
                data = [{"name": f"Item {i}", "value": random.randint(10, 1000)} for i in range(5)]
            
            result = {
                "data": data,
                "chart_type": chart_type,
                "total": sum(item["value"] for item in data),
                "success": True,
                "timestamp": datetime.now().isoformat()
            }
            await network_stats_cache.set(cache_key, result)
            return result
        
        # Real Neo4j queries with optimized execution
        if not neo4j_helper.driver:
            neo4j_helper.connect()
        
        async with neo4j_helper.driver.session() as session:
            # Optimized queries for each chart type
            queries = {
                "protocols": """
                    MATCH (f:Flow)-[:USES_PROTOCOL]->(p:Protocol)
                    WITH p.name as name, count(f) as value
                    ORDER BY value DESC
                    LIMIT 10
                    RETURN collect({name: name, value: value}) as data
                """,
                "ports": """
                    MATCH (f:Flow)-[:USES_DST_PORT]->(port:Port)
                    WITH port.port as port, port.service as service, count(f) as value
                    ORDER BY value DESC
                    LIMIT 10
                    RETURN collect({port: port, service: service, value: value}) as data
                """,
                "threats": """
                    MATCH (src:Host)-[:SENT]->(f:Flow)
                    WHERE f.malicious = true
                    WITH src.ip as name, count(f) as value
                    ORDER BY value DESC
                    LIMIT 10
                    RETURN collect({name: name, value: value}) as data
                """,
                "countries": """
                    MATCH (h:Host)-[:SENT]->(f:Flow)
                    WHERE h.country IS NOT NULL AND h.country <> ""
                    WITH h.country as name, count(f) as value
                    ORDER BY value DESC
                    LIMIT 10
                    RETURN collect({name: name, value: value}) as data
                """
            }
            
            # Execute query with timeout
            query = queries.get(chart_type, queries["protocols"])
            result = await asyncio.wait_for(
                session.run(query),
                timeout=0.5  # 500ms timeout
            )
            record = await result.single()
            
            if not record:
                data = []
            else:
                raw_data = record["data"]
                total = sum(item["value"] for item in raw_data)
                
                # Process data based on chart type
                if chart_type == "ports":
                    data = [{
                        "name": f"{item['port']} ({item['service'] or 'unknown'})",
                        "value": item["value"],
                        "percentage": round((item["value"] / total) * 100, 1)
                    } for item in raw_data]
                else:
                    data = [{
                        "name": item["name"],
                        "value": item["value"],
                        "percentage": round((item["value"] / total) * 100, 1)
                    } for item in raw_data]
            
            # Handle empty data case
            if not data and chart_type == "countries":
                data = [{"name": "N/A - No geolocation data available", "value": 0, "percentage": 0}]
                total = 0
            
            result = {
                "data": data,
                "chart_type": chart_type,
                "total": total if 'total' in locals() else 0,
                "success": True,
                "timestamp": datetime.now().isoformat()
            }
            
            # Cache the results
            await network_stats_cache.set(cache_key, result)
            return result
            
    except asyncio.TimeoutError:
        logger.error("Bar chart query timed out")
        return {
            "data": [],
            "error": "Query timed out",
            "success": False,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting bar chart data: {e}")
        return {
            "data": [],
            "error": str(e),
            "success": False,
            "timestamp": datetime.now().isoformat()
        }

@app.get("/visualization/geolocation")
async def get_geolocation_data():
    """Get geolocation data for IP addresses."""
    try:
        if config.lightweight_mode:
            # Return mock geolocation data
            import random
            
            # Mock IP geolocation data
            mock_locations = [
                {"ip": "203.0.113.1", "country": "United States", "city": "New York", "lat": 40.7128, "lon": -74.0060, "threats": 15, "flows": 234},
                {"ip": "198.51.100.1", "country": "China", "city": "Beijing", "lat": 39.9042, "lon": 116.4074, "threats": 8, "flows": 156},
                {"ip": "192.0.2.1", "country": "Russia", "city": "Moscow", "lat": 55.7558, "lon": 37.6176, "threats": 12, "flows": 89},
                {"ip": "203.0.113.2", "country": "Germany", "city": "Berlin", "lat": 52.5200, "lon": 13.4050, "threats": 3, "flows": 67},
                {"ip": "198.51.100.2", "country": "United Kingdom", "city": "London", "lat": 51.5074, "lon": -0.1278, "threats": 5, "flows": 123},
                {"ip": "192.0.2.2", "country": "France", "city": "Paris", "lat": 48.8566, "lon": 2.3522, "threats": 2, "flows": 45},
                {"ip": "203.0.113.3", "country": "Japan", "city": "Tokyo", "lat": 35.6762, "lon": 139.6503, "threats": 7, "flows": 78},
                {"ip": "198.51.100.3", "country": "Brazil", "city": "São Paulo", "lat": -23.5505, "lon": -46.6333, "threats": 4, "flows": 34},
            ]
            
            return {
                "locations": mock_locations,
                "total_ips": len(mock_locations),
                "total_threats": sum(loc["threats"] for loc in mock_locations),
                "total_flows": sum(loc["flows"] for loc in mock_locations),
                "success": True,
                "timestamp": datetime.now().isoformat()
            }
        
        # Real Neo4j query for geolocation data
        if not neo4j_helper.driver:
            if not neo4j_helper.connect():
                raise Exception("Cannot connect to Neo4j")
        
        with neo4j_helper.driver.session() as session:
            # Query to get IPs with their location info and threat/flow counts
            query = """
            MATCH (h:Host)
            OPTIONAL MATCH (h)-[:SENT]->(f:Flow)
            OPTIONAL MATCH (h)-[:SENT]->(tf:Flow) WHERE tf.malicious = true
            RETURN 
                h.ip as ip,
                h.country as country,
                h.city as city,
                h.latitude as lat,
                h.longitude as lon,
                count(DISTINCT f) as flows,
                count(DISTINCT tf) as threats
            ORDER BY threats DESC, flows DESC
            LIMIT 50
            """
            
            result = session.run(query)
            locations = []
            
            for record in result:
                if record["lat"] and record["lon"]:  # Only include if we have coordinates
                    locations.append({
                        "ip": record["ip"],
                        "country": record["country"] or "Unknown",
                        "city": record["city"] or "Unknown", 
                        "lat": float(record["lat"]),
                        "lon": float(record["lon"]),
                        "threats": record["threats"],
                        "flows": record["flows"]
                    })
        
        return {
            "locations": locations,
            "total_ips": len(locations),
            "total_threats": sum(loc["threats"] for loc in locations),
            "total_flows": sum(loc["flows"] for loc in locations),
            "success": True,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting geolocation data: {e}")
        return {
            "locations": [],
            "error": str(e),
            "success": False,
            "timestamp": datetime.now().isoformat()
        }

@app.get("/visualization/heatmap")
async def get_heatmap_data(heatmap_type: str = "hourly_activity"):
    """Get heatmap data for various time-based patterns."""
    try:
        if config.lightweight_mode:
            # Return mock heatmap data
            import random
            
            if heatmap_type == "hourly_activity":
                # 24 hours x 7 days grid
                data = []
                days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                for day_idx, day in enumerate(days):
                    for hour in range(24):
                        # Simulate business hours having more activity
                        base_activity = 20
                        if day_idx < 5 and 9 <= hour <= 17:  # Weekdays 9-5
                            base_activity = 80
                        elif day_idx < 5 and (8 <= hour <= 8 or 18 <= hour <= 19):  # Rush hours
                            base_activity = 60
                        elif day_idx >= 5:  # Weekends
                            base_activity = 30
                        
                        activity = base_activity + random.randint(-15, 25)
                        data.append({
                            "day": day,
                            "day_index": day_idx,
                            "hour": hour,
                            "value": max(0, activity)
                        })
                        
            elif heatmap_type == "ip_port_matrix":
                # Top IPs vs top ports
                top_ips = ["192.168.1.100", "10.0.0.15", "172.16.0.50", "203.0.113.1", "198.51.100.1"]
                top_ports = [80, 443, 22, 53, 3389, 21, 25, 993]
                data = []
                for ip in top_ips:
                    for port in top_ports:
                        data.append({
                            "ip": ip,
                            "port": port,
                            "value": random.randint(0, 100)
                        })
                        
            else:  # threat_intensity
                # Geographic threat intensity by region
                regions = [
                    {"region": "North America", "x": 0, "y": 0},
                    {"region": "Europe", "x": 1, "y": 0},
                    {"region": "Asia", "x": 2, "y": 0},
                    {"region": "South America", "x": 0, "y": 1},
                    {"region": "Africa", "x": 1, "y": 1},
                    {"region": "Oceania", "x": 2, "y": 1}
                ]
                data = []
                for region in regions:
                    data.append({
                        "region": region["region"],
                        "x": region["x"],
                        "y": region["y"],
                        "value": random.randint(5, 95)
                    })
            
            return {
                "data": data,
                "heatmap_type": heatmap_type,
                "success": True,
                "timestamp": datetime.now().isoformat()
            }
        
        # Real Neo4j query for heatmap data
        if not neo4j_helper.driver:
            if not neo4j_helper.connect():
                raise Exception("Cannot connect to Neo4j")
        
        with neo4j_helper.driver.session() as session:
            if heatmap_type == "hourly_activity":
                # Extract hour and day from flow timestamps
                query = """
                MATCH (f:Flow)
                WHERE f.flowStartMilliseconds IS NOT NULL
                WITH f, 
                     datetime({epochMillis: f.flowStartMilliseconds}) as dt
                RETURN 
                    dt.hour as hour,
                    dt.dayOfWeek as day_of_week,
                    count(f) as value
                ORDER BY day_of_week, hour
                """
                
                result = session.run(query)
                data = []
                days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                
                for record in result:
                    day_idx = record["day_of_week"] - 1  # Neo4j uses 1-7, we want 0-6
                    data.append({
                        "day": days[day_idx] if 0 <= day_idx < 7 else "Unknown",
                        "day_index": day_idx,
                        "hour": record["hour"],
                        "value": record["value"]
                    })
                    
            elif heatmap_type == "ip_port_matrix":
                # Top source IPs vs destination ports
                query = """
                MATCH (src:Host)-[:SENT]->(f:Flow)-[:USES_DST_PORT]->(port:Port)
                WITH src.ip as ip, port.port as port, count(f) as flow_count
                ORDER BY flow_count DESC
                LIMIT 100
                RETURN ip, port, flow_count as value
                """
                
                result = session.run(query)
                data = []
                for record in result:
                    data.append({
                        "ip": record["ip"],
                        "port": record["port"],
                        "value": record["value"]
                    })
                    
            else:  # Default query
                data = []
        
        return {
            "data": data,
            "heatmap_type": heatmap_type,
            "success": True,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting heatmap data: {e}")
        return {
            "data": [],
            "error": str(e),
            "success": False,
            "timestamp": datetime.now().isoformat()
        }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {"error": "Endpoint not found", "message": "Check /docs for available endpoints"}

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return {"error": "Internal server error", "message": "Please try again later"}

# Add before the FastAPI app initialization

async def get_cached_response(request: Request) -> Optional[Response]:
    """Get cached response for cacheable endpoints."""
    cache_config = get_cache_config(request.url.path)
    if not cache_config['cacheable']:
        return None
        
    cache_key = f"response_{request.url.path}_{request.query_params}"
    cached_data = await network_stats_cache.get(cache_key)
    
    if cached_data:
        return JSONResponse(
            content=cached_data,
            headers={
                "X-Cache": "HIT",
                "Cache-Control": f"public, max-age={cache_config['max_age']}"
            }
        )
    return None

async def semantic_analysis(query: str, agent) -> Dict[str, Any]:
    """Perform semantic analysis using Milvus."""
    try:
        if not hasattr(agent, 'milvus_retriever'):
            return {"type": "semantic", "result": None}
            
        from langchain.chains import RetrievalQA
        qa_chain = RetrievalQA.from_chain_type(
            llm=agent.llm,
            retriever=agent.milvus_retriever,
            return_source_documents=True
        )
        result = await qa_chain.ainvoke({"query": query})
        return {"type": "semantic", "result": result}
    except Exception as e:
        logger.error(f"Semantic analysis error: {e}")
        return {"type": "semantic", "error": str(e)}

async def graph_analysis(query: str, agent) -> Dict[str, Any]:
    """Perform graph analysis using Neo4j."""
    try:
        if not hasattr(agent, 'neo4j_retriever'):
            return {"type": "graph", "result": None}
            
        from langchain.chains import RetrievalQA
        qa_chain = RetrievalQA.from_chain_type(
            llm=agent.llm,
            retriever=agent.neo4j_retriever,
            return_source_documents=True
        )
        result = await qa_chain.ainvoke({"query": query})
        return {"type": "graph", "result": result}
    except Exception as e:
        logger.error(f"Graph analysis error: {e}")
        return {"type": "graph", "error": str(e)}

async def pattern_analysis(query: str) -> Dict[str, Any]:
    """Check for known patterns and quick responses."""
    try:
        is_simple, result = is_simple_query(query)
        if is_simple:
            return {"type": "pattern", "result": result}
        return {"type": "pattern", "result": None}
    except Exception as e:
        logger.error(f"Pattern analysis error: {e}")
        return {"type": "pattern", "error": str(e)}

# Run the server
if __name__ == "__main__":
    logger.info(f"Starting Mistral Security Analysis API on {config.api_host}:{config.api_port}")
    logger.info(f"API Documentation available at: http://localhost:{config.api_port}/docs")
    
    uvicorn.run(
        "api_server:app",
        host=config.api_host,
        port=config.api_port,
        reload=True if config.environment == "development" else False,
        log_level=config.log_level.lower(),
        access_log=True
    ) 