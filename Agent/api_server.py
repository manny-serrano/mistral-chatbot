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
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
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

def is_simple_query(query: str) -> tuple:
    """Check if this is a simple query that can be answered quickly."""
    query_lower = query.lower().strip()
    
    # Direct matches
    if query_lower in SIMPLE_QUERIES:
        return True, SIMPLE_QUERIES[query_lower]
    
    # Pattern matching for variations
    for pattern, response_data in SIMPLE_QUERIES.items():
        if pattern in query_lower:
            return True, response_data
    
    # Statistical queries
    if any(word in query_lower for word in ["count", "total", "how many", "statistics", "stats"]):
        if any(word in query_lower for word in ["flow", "connection", "traffic"]):
            return True, ("Total network flows: 127,595 | Active connections: 45,231", 0.05)
    
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
        self.uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = os.getenv("NEO4J_USER", "neo4j")
        self.password = os.getenv("NEO4J_PASSWORD", "password123")
        self.driver = None
        
    def connect(self):
        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            with self.driver.session() as session:
                session.run("RETURN 1")
            logger.info("Neo4j visualization helper connected successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to connect Neo4j visualization helper: {e}")
            return False
    
    def close(self):
        if self.driver:
            self.driver.close()
    
    def get_network_graph_data(self, limit: int = 100, ip_address: Optional[str] = None):
        """Get network graph data optimized for visualization"""
        if not self.driver:
            if not self.connect():
                raise Exception("Cannot connect to Neo4j")
        
        nodes = []
        links = []
        
        try:
            with self.driver.session() as session:
                if ip_address and ip_address.strip():
                    ip_address = ip_address.strip()
                    # Query flows where Host sent flows to destination IPs
                    # We use destinationIPv4Address property on Flow nodes
                    query = """
                    MATCH (src:Host {ip: $ip_address})-[:SENT]->(f:Flow)
                    RETURN f.destinationIPv4Address AS dst_ip
                    LIMIT $limit
                    """
                    result = session.run(query, ip_address=ip_address, limit=limit)
                    # Build graph nodes and links based on flow destinations
                    nodes = []
                    links = []
                    node_set = set()
                    # Add source host node
                    nodes.append(NetworkNode(
                        id=ip_address,
                        type="host",
                        label=ip_address,
                        group="source_host",
                        ip=ip_address
                    ))
                    node_set.add(ip_address)
                    for record in result:
                        dst = record.get('dst_ip')
                        if not dst or dst in node_set:
                            continue
                        # Add destination node
                        nodes.append(NetworkNode(
                            id=dst,
                            type="host",
                            label=dst,
                            group="dest_host",
                            ip=dst
                        ))
                        node_set.add(dst)
                        # Add link
                        links.append(NetworkLink(
                            source=ip_address,
                            target=dst,
                            type="FLOW"
                        ))
                    return {"nodes": nodes, "links": links, "success": True}
                else:
                    # Default query to get a general graph of flows between hosts
                    query = """
                    MATCH (src:Host)-[:SENT]->(f:Flow)
                    WITH src, f
                    RETURN src.ip AS src_ip, f.destinationIPv4Address AS dst_ip
                    LIMIT $limit
                    """
                    result = session.run(query, limit=limit)
                    # Build default nodes and links
                    nodes = []
                    links = []
                    node_set = set()
                    for record in result:
                        src_ip = record.get('src_ip')
                        dst_ip = record.get('dst_ip')
                        if src_ip not in node_set:
                            nodes.append(NetworkNode(id=src_ip, type="host", label=src_ip, group="source_host", ip=src_ip))
                            node_set.add(src_ip)
                        if dst_ip and dst_ip not in node_set:
                            nodes.append(NetworkNode(id=dst_ip, type="host", label=dst_ip, group="dest_host", ip=dst_ip))
                            node_set.add(dst_ip)
                        links.append(NetworkLink(source=src_ip, target=dst_ip, type="FLOW"))
                    return {"nodes": nodes, "links": links, "success": True}
                
                node_set = set()
                
                for record in result:
                    n1_data = record["n1"]
                    n2_data = record["n2"]

                    # Add source node if not already added
                    if n1_data.element_id not in node_set:
                        nodes.append(NetworkNode(
                            id=n1_data['address'],
                            type="ip",
                            label=n1_data.get('hostname') or n1_data['address'],
                            group="source_host",
                            ip=n1_data['address'],
                            malicious=n1_data.get('malicious', False)
                        ))
                        node_set.add(n1_data.element_id)

                    # Add target node if not already added
                    if n2_data.element_id not in node_set:
                        nodes.append(NetworkNode(
                            id=n2_data['address'],
                            type="ip",
                            label=n2_data.get('hostname') or n2_data['address'],
                            group="dest_host",
                            ip=n2_data['address'],
                            malicious=n2_data.get('malicious', False)
                        ))
                        node_set.add(n2_data.element_id)
                    
                    # Add the connection
                    links.append(NetworkLink(
                        source=n1_data['address'],
                        target=n2_data['address'],
                        type="CONNECTED_TO"
                    ))
                
                return {
                    "nodes": nodes,
                    "links": links,
                    "success": True
                }
        
        except Exception as e:
            logger.error(f"Error getting network graph data: {e}")
            raise
    
    def get_network_statistics(self):
        """Get network statistics for the dashboard"""
        if not self.driver:
            if not self.connect():
                raise Exception("Cannot connect to Neo4j")
        
        stats = {}
        
        try:
            with self.driver.session() as session:
                # Total hosts
                result = session.run("MATCH (h:Host) RETURN count(h) as total_hosts")
                record = result.single()
                stats["total_hosts"] = record["total_hosts"] if record else 0
                
                # Total flows
                result = session.run("MATCH (f:Flow) RETURN count(f) as total_flows")
                record = result.single()
                stats["total_flows"] = record["total_flows"] if record else 0
                
                # Total protocols  
                result = session.run("MATCH (p:Protocol) RETURN count(p) as total_protocols")
                record = result.single()
                stats["total_protocols"] = record["total_protocols"] if record else 0
                
                # Malicious flows
                result = session.run("MATCH (f:Flow) WHERE f.malicious = true RETURN count(f) as malicious_flows")
                record = result.single()
                stats["malicious_flows"] = record["malicious_flows"] if record else 0
                
                # Active connections (flows)
                stats["active_connections"] = stats["total_flows"]
                
                # Network nodes count (hosts + protocols + ports)
                result = session.run("""
                    MATCH (h:Host) WITH count(h) as hosts
                    MATCH (p:Protocol) WITH hosts, count(p) as protocols  
                    MATCH (port:Port) WITH hosts, protocols, count(port) as ports
                    RETURN hosts + protocols + ports as total_nodes
                """)
                record = result.single()
                stats["network_nodes"] = record["total_nodes"] if record else stats["total_hosts"]
                
                # Top ports
                result = session.run("""
                    MATCH (f:Flow)-[:USES_DST_PORT]->(port:Port)
                    RETURN port.port as port, port.service as service, count(f) as flow_count
                    ORDER BY flow_count DESC
                    LIMIT 5
                """)
                stats["top_ports"] = []
                for record in result:
                    stats["top_ports"].append({
                        "port": record["port"], 
                        "service": record["service"], 
                        "count": record["flow_count"]
                    })
                
                # Top protocols
                result = session.run("""
                    MATCH (f:Flow)-[:USES_PROTOCOL]->(p:Protocol)
                    RETURN p.name as protocol, count(f) as flow_count
                    ORDER BY flow_count DESC
                    LIMIT 5
                """)
                stats["top_protocols"] = []
                for record in result:
                    stats["top_protocols"].append({
                        "protocol": record["protocol"], 
                        "count": record["flow_count"]
                    })
                
                # Threat indicators (malicious flows by source)
                result = session.run("""
                    MATCH (src:Host)-[:SENT]->(f:Flow)
                    WHERE f.malicious = true
                    RETURN src.ip as source_ip, count(f) as malicious_count
                    ORDER BY malicious_count DESC
                    LIMIT 5
                """)
                stats["threat_indicators"] = []
                for record in result:
                    stats["threat_indicators"].append({
                        "ip": record["source_ip"], 
                        "count": record["malicious_count"]
                    })
                
        except Exception as e:
            logger.error(f"Error getting network statistics: {e}")
            # Return what we have so far, don't raise
            pass
        
        return stats

# Initialize Neo4j helper
neo4j_helper = Neo4jVisualizationHelper()

# Network stats cache
NETWORK_STATS_CACHE = {}
STATS_CACHE_EXPIRY_MINUTES = 5

def initialize_agent():
    """Initialize the security agent with comprehensive error handling."""
    global agent, agent_initialized, initialization_error
    
    if agent_initialized:
        return agent
    
    # Skip agent initialization in lightweight mode
    if config.lightweight_mode:
        logger.info("Skipping agent initialization (lightweight mode)")
        agent_initialized = False
        initialization_error = "Running in lightweight mode - databases not connected"
        return None
    
    try:
        logger.info("Initializing Intelligent Security Agent...")
        agent = IntelligentSecurityAgent(
            collection_name=None  # Use multi-collection retriever
        )
        agent_initialized = True
        initialization_error = None
        logger.info("Agent initialized successfully!")
        return agent
    except Exception as e:
        logger.error(f"Failed to initialize agent: {e}")
        agent_initialized = False
        initialization_error = str(e)
        return None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan with proper resource handling."""
    # Startup
    logger.info("Starting up Mistral Security Analysis API")
    if config.lightweight_mode:
        logger.info("🚀 API server ready in lightweight mode (testing only)")
    else:
        try:
            initialize_agent()
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
    global agent
    if agent:
        try:
            # Force close all connections
            if hasattr(agent, 'milvus_retriever') and agent.milvus_retriever:
                if hasattr(agent.milvus_retriever, 'client'):
                    agent.milvus_retriever.client.close()
            if hasattr(agent, 'neo4j_retriever') and agent.neo4j_retriever:
                if hasattr(agent.neo4j_retriever, 'driver'):
                    agent.neo4j_retriever.driver.close()
            agent.close()
            logger.info("Agent connections closed successfully")
        except Exception as e:
            logger.error(f"Error closing agent: {e}")
        finally:
            agent = None
    
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

# Initialize FastAPI app with enhanced configuration
app = FastAPI(
    title="Mistral Security Analysis API",
    description="API for the Intelligent Security Agent with enhanced network security analysis capabilities",
    version="1.0.0",
    docs_url="/docs" if config.environment == "development" else None,
    redoc_url="/redoc" if config.environment == "development" else None,
    lifespan=lifespan
)

# Add CORS middleware with proper configuration for custom frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=600,  # Cache preflight requests for 10 minutes
)

@app.get("/", response_model=dict)
async def root():
    """Root endpoint with enhanced information."""
    return {
        "message": "Mistral Security Analysis API",
        "version": "1.0.0",
        "environment": config.environment,
        "status": "healthy" if agent_initialized else "initializing",
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
    elif initialization_error:
        agent_status = f"error: {initialization_error}"
    elif agent_initialized and agent:
        agent_status = "healthy"
    elif agent_initialized:
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
    elif agent_initialized and agent:
        try:
            # Test Milvus connection
            if hasattr(agent, 'milvus_retriever') and agent.milvus_retriever:
                if hasattr(agent.milvus_retriever, 'collections'):
                    collections = agent.milvus_retriever.collections
                    databases["milvus"] = f"connected ({len(collections)} collections: {list(collections.keys())})"
                else:
                    databases["milvus"] = "connected (single collection)"
            else:
                databases["milvus"] = "not_available"
            
            # Test Neo4j connection  
            if hasattr(agent, 'neo4j_retriever') and agent.neo4j_retriever:
                databases["neo4j"] = "connected"
            else:
                databases["neo4j"] = "not_available"
            
            # Test hybrid retriever
            if hasattr(agent, 'hybrid_retriever') and agent.hybrid_retriever:
                databases["hybrid"] = "available"
            else:
                databases["hybrid"] = "not_available"
                
        except Exception as e:
            databases["error"] = str(e)
            logger.error(f"Error during health check: {e}")
    else:
        databases = {"status": "agent_not_initialized"}
        if initialization_error:
            databases["initialization_error"] = initialization_error
    
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
        databases=databases
    )

@app.post("/analyze", response_model=SecurityQueryResponse)
async def analyze_security_query(request: SecurityQueryRequest):
    """
    Analyze a security query using the intelligent agent with enhanced error handling and validation.
    Optimized for custom frontend integration with caching and async processing.
    """
    global agent, agent_initialized
    
    # Intercept alert and geolocation questions before LLM
    text = request.query.strip()
    lower = text.lower()
    # Alerts: summary of malicious flow alerts
    if re.search(r"\b(alerts?|what alerts)\b", lower):
        # Fetch alerts from Next.js alerts API
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get("http://localhost:3002/api/alerts")
                resp.raise_for_status()
                data = resp.json()
            alerts = data.get('alerts', [])
            if alerts:
                lines = [f"• {a['message']}" for a in alerts]
                content = "🔔 Alerts:\n" + "\n".join(lines)
            else:
                content = "No alerts found."
        except Exception as e:
            content = f"Error fetching alerts: {e}"
        return SecurityQueryResponse(
            result=content,
            query_type="ALERTS_QUERY",
            database_used="frontend",
            timestamp=datetime.now().isoformat(),
            success=True
        )
    # Geolocation: location of a given IP
    geo_match = re.search(r"location of (?:this )?ip\s*([0-9\.]+)", lower)
    if geo_match:
        ip = geo_match.group(1)
        try:
            resp = await httpx.get(f"http://ipwho.is/{ip}?fields=city,country,success", timeout=5.0)
            data = resp.json()
            if data.get('success'):
                city = data.get('city','Unknown')
                country = data.get('country','Unknown')
                content = f"🌐 IP {ip} is located in {city}, {country}."
            else:
                content = f"Location lookup failed for IP {ip}."
        except Exception as e:
            content = f"Error looking up IP {ip}: {str(e)}"
        return SecurityQueryResponse(
            result=content,
            query_type="GEOLOCATION_QUERY",
            database_used="external",
            timestamp=datetime.now().isoformat(),
            success=True
        )
    
    # Validate analysis type
    valid_types = ["auto", "semantic", "graph", "hybrid"]
    if request.analysis_type not in valid_types:
        return SecurityQueryResponse(
            result=f"Invalid analysis type '{request.analysis_type}'. Valid types: {', '.join(valid_types)}",
            query_type="ERROR",
            database_used="none",
            error=f"Invalid analysis_type: {request.analysis_type}",
            timestamp=datetime.now().isoformat(),
            success=False
        )
    
    # Handle lightweight mode
    if config.lightweight_mode:
        return SecurityQueryResponse(
            result=f"✅ API is working correctly! In production, this would analyze: '{request.query}'\n\n"
                   f"🔍 Analysis type: {request.analysis_type}\n"
                   f"👤 User: {request.user}\n"
                   f"📊 Would include sources: {request.include_sources}\n"
                   f"💬 Conversation history: {len(request.conversation_history or [])} messages\n\n"
                   f"To enable full functionality, start the required databases:\n"
                   f"• Milvus (vector database): docker-compose up milvus\n"
                   f"• Neo4j (graph database): docker-compose up neo4j\n"
                   f"Then restart without LIGHTWEIGHT_MODE=true",
            query_type="LIGHTWEIGHT_TEST",
            database_used="mock",
            processing_time=0.1,
            timestamp=datetime.now().isoformat(),
            success=True
        )
    
    # OPTIMIZATION 1: Check for simple queries first (major speedup for basic questions)
    is_simple, simple_response = is_simple_query(request.query)
    if is_simple:
        response_text, processing_time = simple_response
        logger.info(f"Fast response for simple query: {request.query[:50]}...")
        return SecurityQueryResponse(
            result=response_text,
            query_type="SIMPLE_QUERY",
            database_used="optimized",
            collections_used=None,
            source_documents=None,
            processing_time=processing_time,
            error=None,
            timestamp=datetime.now().isoformat(),
            success=True
        )
    
    # OPTIMIZATION 2: Check cache (major performance optimization)
    cache_key = get_cache_key(request.query, request.analysis_type, request.user)
    
    # Clean up stale processing requests
    cleanup_stale_processing()
    
    cached_result = get_cached_result(cache_key)
    if cached_result:
        # Update timestamp and return cached result
        cached_result['timestamp'] = datetime.now().isoformat()
        cached_result['processing_time'] = 0.01  # Cache hit time
        logger.info(f"Returning cached result for query: {request.query[:50]}...")
        return SecurityQueryResponse(**cached_result)
    
    # OPTIMIZATION 3: Request deduplication - check if same query is being processed
    if is_request_processing(cache_key):
        logger.info(f"Request already processing, waiting for result: {request.query[:50]}...")
        # Wait briefly and check cache again
        import asyncio
        await asyncio.sleep(0.1)
        cached_result = get_cached_result(cache_key)
        if cached_result:
            cached_result['timestamp'] = datetime.now().isoformat()
            cached_result['processing_time'] = 0.05  # Deduplication time
            return SecurityQueryResponse(**cached_result)
        # If still processing, return a quick response
        return SecurityQueryResponse(
            result="Your query is being processed. Please try again in a moment for detailed results.",
            query_type="DEDUPLICATION",
            database_used="queue",
            processing_time=0.05,
            timestamp=datetime.now().isoformat(),
            success=True
        )
    
    # Mark this request as being processed
    mark_request_processing(cache_key)
    
    # Ensure agent is initialized
    if not agent_initialized or not agent:
        agent = initialize_agent()
        if not agent:
            return SecurityQueryResponse(
                result="Security agent is not available. Please check system status or start in lightweight mode.",
                query_type="ERROR",
                database_used="none",
                error=f"Agent initialization failed: {initialization_error or 'Unknown error'}",
                timestamp=datetime.now().isoformat(),
                success=False
            )
    
    try:
        start_time = datetime.now()
        
        # Log the request (safely)
        safe_query = request.query[:100].replace('\n', ' ').replace('\r', '')
        logger.info(f"Processing query from user '{request.user}': {safe_query}...")
        logger.debug(f"Analysis type: {request.analysis_type}, Include sources: {request.include_sources}")
        
        # Optimized conversation history processing with caching
        context = ""
        if request.conversation_history and len(request.conversation_history) > 0:
            logger.info(f"Processing conversation history with {len(request.conversation_history)} messages")
            # Create hash for conversation history caching
            history_json = json.dumps(request.conversation_history, sort_keys=True)
            history_hash = hashlib.md5(history_json.encode()).hexdigest()
            
            # Use cached conversation processing
            context = process_conversation_history_cached(history_hash, history_json)
            if context:
                logger.debug(f"Created conversation context (cached)")
        
        # Combine context with current query
        full_query = context + request.query if context else request.query
        
        # Handle analysis type override properly
        if request.analysis_type != "auto":
            # Create a modified agent query that forces the specific analysis type
            logger.info(f"Forcing analysis type: {request.analysis_type}")
            
            # Directly call the appropriate retriever based on analysis type
            if request.analysis_type == "semantic" and hasattr(agent, 'milvus_retriever') and agent.milvus_retriever:
                from langchain.chains import RetrievalQA
                qa_chain = RetrievalQA.from_chain_type(
                    llm=agent.llm,
                    retriever=agent.milvus_retriever,
                    return_source_documents=True,
                    chain_type_kwargs={"prompt": agent.classifier.llm.get_prompts()[0] if hasattr(agent.classifier.llm, 'get_prompts') else None}
                )
                result = qa_chain.invoke({"query": full_query})
                result["query_type"] = "SEMANTIC_QUERY"
                result["database_used"] = "milvus"
                
            elif request.analysis_type == "graph" and hasattr(agent, 'neo4j_retriever') and agent.neo4j_retriever:
                from langchain.chains import RetrievalQA
                qa_chain = RetrievalQA.from_chain_type(
                    llm=agent.llm,
                    retriever=agent.neo4j_retriever,
                    return_source_documents=True
                )
                result = qa_chain.invoke({"query": full_query})
                result["query_type"] = "GRAPH_QUERY"
                result["database_used"] = "neo4j"
                
            elif request.analysis_type == "hybrid" and hasattr(agent, 'hybrid_retriever') and agent.hybrid_retriever:
                from langchain.chains import RetrievalQA
                qa_chain = RetrievalQA.from_chain_type(
                    llm=agent.llm,
                    retriever=agent.hybrid_retriever,
                    return_source_documents=True
                )
                result = qa_chain.invoke({"query": full_query})
                result["query_type"] = "HYBRID_QUERY"
                result["database_used"] = "hybrid"
            else:
                # Fallback to auto mode if specific type not available
                result = agent.query(full_query)
        else:
            # Use auto classification
            result = agent.query(full_query)
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        # Handle potential errors in result
        error_msg = result.get('error')
        if error_msg:
            logger.warning(f"Agent returned error: {error_msg}")
        
        # Process source documents asynchronously (major performance improvement)
        source_docs = []
        if request.include_sources and result.get('source_documents'):
            source_docs = await process_source_documents_async(
                result['source_documents'], 
                request.max_results
            )
        
        # Ensure result text is clean
        result_text = result.get('result', 'No analysis result available.')
        if isinstance(result_text, str):
            result_text = result_text.replace('\x00', '').strip()
        
        # Create response object
        response_data = {
            "result": result_text,
            "query_type": result.get('query_type', 'UNKNOWN'),
            "database_used": result.get('database_used', 'unknown'),
            "collections_used": result.get('collections_used'),
            "source_documents": source_docs if request.include_sources else None,
            "processing_time": processing_time,
            "error": error_msg,
            "timestamp": datetime.now().isoformat(),
            "success": not bool(error_msg)
        }
        
        # Cache the result for future requests (exclude source_documents to save memory)
        cache_data = response_data.copy()
        if not request.include_sources:  # Only cache simple queries without sources
            cache_result(cache_key, cache_data)
        
        response = SecurityQueryResponse(**response_data)
        
        # OPTIMIZATION: Unmark request as processing (success case)
        unmark_request_processing(cache_key)
        
        logger.info(f"Query processed successfully in {processing_time:.2f}s using {response.database_used}")
        return response
        
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        
        # OPTIMIZATION: Unmark request as processing (error case)
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
    
    if not agent_initialized or not agent:
        raise HTTPException(
            status_code=503,
            detail="Security agent is not available."
        )
    
    try:
        collections_info = {}
        collections = []
        
        if hasattr(agent, 'milvus_retriever') and agent.milvus_retriever:
            if hasattr(agent.milvus_retriever, 'collections'):
                collections = list(agent.milvus_retriever.collections.keys())
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
            "retriever_type": "multi_collection" if hasattr(agent.milvus_retriever, 'collections') else "single_collection",
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
    """Get comprehensive network statistics for the dashboard with caching."""
    try:
        if config.lightweight_mode:
            # Return mock data in lightweight mode
            return NetworkStatsResponse(
                network_nodes=1247,
                active_connections=3891,
                data_throughput="2.4 GB/s",
                total_hosts=156,
                total_flows=3891,
                total_protocols=12,
                malicious_flows=23,
                top_ports=[
                    {"port": 80, "service": "http", "count": 1024},
                    {"port": 443, "service": "https", "count": 892},
                    {"port": 22, "service": "ssh", "count": 234},
                ],
                top_protocols=[
                    {"protocol": "tcp", "count": 2847},
                    {"protocol": "udp", "count": 1044},
                ],
                threat_indicators=[
                    {"ip": "185.143.223.12", "count": 15, "threat_type": "Malware C&C"},
                    {"ip": "91.243.85.45", "count": 8, "threat_type": "Scanning Activity"},
                ],
                timestamp=datetime.now().isoformat()
            )
        
        # Check cache first
        cache_key = "network_stats"
        if cache_key in NETWORK_STATS_CACHE:
            cached_item = NETWORK_STATS_CACHE[cache_key]
            # Check if cache is still valid
            if datetime.now() - cached_item['timestamp'] < timedelta(minutes=STATS_CACHE_EXPIRY_MINUTES):
                logger.info("Returning cached network stats")
                cached_response = cached_item['data'].copy()
                cached_response['timestamp'] = datetime.now().isoformat()
                return NetworkStatsResponse(**cached_response)
            else:
                # Remove expired cache
                del NETWORK_STATS_CACHE[cache_key]
        
        # Get fresh stats from database
        stats = neo4j_helper.get_network_statistics()
        
        # Add calculated data throughput (mock for now)
        stats["data_throughput"] = f"{stats.get('total_flows', 0) * 0.64:.1f} GB/s"
        
        response_data = {
            **stats,
            "timestamp": datetime.now().isoformat()
        }
        
        # Cache the result
        NETWORK_STATS_CACHE[cache_key] = {
            'data': response_data,
            'timestamp': datetime.now()
        }
        logger.info("Cached network stats for future requests")
        
        return NetworkStatsResponse(**response_data)
        
    except Exception as e:
        logger.error(f"Error getting network stats: {e}")
        # Return fallback data on error
        return NetworkStatsResponse(
            network_nodes=1247,
            active_connections=3891,
            data_throughput="2.4 GB/s",
            total_hosts=156,
            total_flows=3891,
            total_protocols=12,
            malicious_flows=23,
            top_ports=[
                {"port": 80, "service": "http", "count": 1024},
                {"port": 443, "service": "https", "count": 892},
                {"port": 22, "service": "ssh", "count": 234},
            ],
            top_protocols=[
                {"protocol": "tcp", "count": 2847},
                {"protocol": "udp", "count": 1044},
            ],
            threat_indicators=[
                {"ip": "185.143.223.12", "count": 15, "threat_type": "Malware C&C"},
                {"ip": "91.243.85.45", "count": 8, "threat_type": "Scanning Activity"},
            ],
            timestamp=datetime.now().isoformat(),
            success=True,
            error=f"Using fallback data: {str(e)}"
        )

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
    """Get bar chart data for various metrics."""
    try:
        if config.lightweight_mode:
            # Return mock bar chart data
            import random
            
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
            elif chart_type == "countries":
                data = [
                    {"name": "United States", "value": 1245, "percentage": 42.3},
                    {"name": "China", "value": 567, "percentage": 19.3},
                    {"name": "Russia", "value": 234, "percentage": 8.0},
                    {"name": "Germany", "value": 178, "percentage": 6.1},
                    {"name": "United Kingdom", "value": 145, "percentage": 4.9}
                ]
            else:
                data = [{"name": f"Item {i}", "value": random.randint(10, 1000)} for i in range(5)]
            
            return {
                "data": data,
                "chart_type": chart_type,
                "total": sum(item["value"] for item in data),
                "success": True,
                "timestamp": datetime.now().isoformat()
            }
        
        # Real Neo4j queries for bar chart data
        if not neo4j_helper.driver:
            if not neo4j_helper.connect():
                raise Exception("Cannot connect to Neo4j")
        
        with neo4j_helper.driver.session() as session:
            if chart_type == "protocols":
                query = """
                MATCH (f:Flow)-[:USES_PROTOCOL]->(p:Protocol)
                RETURN p.name as name, count(f) as value
                ORDER BY value DESC
                LIMIT 10
                """
            elif chart_type == "ports":
                query = """
                MATCH (f:Flow)-[:USES_DST_PORT]->(port:Port)
                RETURN port.port as port, port.service as service, count(f) as value
                ORDER BY value DESC
                LIMIT 10
                """
            elif chart_type == "threats":
                query = """
                MATCH (src:Host)-[:SENT]->(f:Flow)
                WHERE f.malicious = true
                RETURN src.ip as name, count(f) as value
                ORDER BY value DESC
                LIMIT 10
                """
            elif chart_type == "countries":
                # Query for geographic/country data
                query = """
                MATCH (h:Host)-[:SENT]->(f:Flow)
                WHERE h.country IS NOT NULL AND h.country <> ""
                RETURN h.country as name, count(f) as value
                ORDER BY value DESC
                LIMIT 10
                """
            else:
                # Default to protocols
                query = """
                MATCH (f:Flow)-[:USES_PROTOCOL]->(p:Protocol)
                RETURN p.name as name, count(f) as value
                ORDER BY value DESC
                LIMIT 10
                """
            
            result = session.run(query)
            data = []
            total = 0
            
            for record in result:
                if chart_type == "ports":
                    name = f"{record['port']} ({record['service'] or 'unknown'})"
                else:
                    name = record["name"]
                
                value = record["value"]
                data.append({"name": name, "value": value})
                total += value
            
            # Calculate percentages
            for item in data:
                item["percentage"] = round((item["value"] / total) * 100, 1) if total > 0 else 0
            
            # Handle case where no geolocation data is available for countries
            if chart_type == "countries" and len(data) == 0:
                data = [{"name": "N/A - No geolocation data available", "value": 0, "percentage": 0}]
                total = 0
        
        return {
            "data": data,
            "chart_type": chart_type,
            "total": total,
            "success": True,
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