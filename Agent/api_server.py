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
from datetime import datetime
import json
from neo4j.time import DateTime as Neo4jDateTime
from contextlib import asynccontextmanager

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
    
    def get_network_graph_data(self, limit: int = 100):
        """Get network graph data optimized for visualization"""
        if not self.driver:
            if not self.connect():
                raise Exception("Cannot connect to Neo4j")
        
        nodes = []
        links = []
        
        try:
            with self.driver.session() as session:
                # Get a sample of hosts, flows, and their relationships
                query = """
                MATCH (src:Host)-[:SENT]->(f:Flow)-[:RECEIVED]-(dst:Host)
                OPTIONAL MATCH (f)-[:USES_PROTOCOL]->(p:Protocol)
                OPTIONAL MATCH (f)-[:USES_DST_PORT]->(port:Port)
                WITH src, dst, f, p, port
                LIMIT $limit
                RETURN 
                    src.ip as src_ip,
                    dst.ip as dst_ip,
                    f.flowId as flow_id,
                    f.malicious as malicious,
                    f.honeypot as honeypot,
                    p.name as protocol,
                    port.port as dst_port,
                    port.service as service
                """
                
                result = session.run(query, limit=limit)
                
                node_set = set()
                
                for record in result:
                    src_ip = record["src_ip"]
                    dst_ip = record["dst_ip"]
                    flow_id = record["flow_id"]
                    malicious = record.get("malicious", False)
                    protocol = record.get("protocol", "unknown")
                    dst_port = record.get("dst_port")
                    service = record.get("service")
                    
                    # Add source host node
                    if src_ip not in node_set:
                        nodes.append(NetworkNode(
                            id=src_ip,
                            type="host",
                            label=src_ip,
                            group="source_host",
                            ip=src_ip,
                            malicious=malicious
                        ))
                        node_set.add(src_ip)
                    
                    # Add destination host node  
                    if dst_ip not in node_set:
                        nodes.append(NetworkNode(
                            id=dst_ip,
                            type="host", 
                            label=dst_ip,
                            group="dest_host",
                            ip=dst_ip,
                            malicious=malicious
                        ))
                        node_set.add(dst_ip)
                    
                    # Add flow connection
                    links.append(NetworkLink(
                        source=src_ip,
                        target=dst_ip,
                        type="FLOW",
                        metadata={
                            "flow_id": flow_id,
                            "malicious": malicious,
                            "protocol": protocol,
                            "dst_port": dst_port,
                            "service": service
                        }
                    ))
        
        except Exception as e:
            logger.error(f"Error getting network graph data: {e}")
            raise
        
        return nodes, links
    
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
    Optimized for custom frontend integration.
    """
    global agent, agent_initialized
    
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
        
        # Prepare context from conversation history (improved for custom frontend)
        context = ""
        if request.conversation_history and len(request.conversation_history) > 0:
            logger.info(f"Processing conversation history with {len(request.conversation_history)} messages")
            context_messages = []
            
            # Take last 3 exchanges (6 messages max) for better context
            recent_messages = request.conversation_history[-6:]
            
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
                context = "Previous conversation:\n" + "\n".join(context_messages) + "\n\nCurrent question: "
                logger.debug(f"Created conversation context with {len(context_messages)} messages")
        
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
        
        # Process source documents with enhanced error handling
        source_docs = []
        if request.include_sources and result.get('source_documents'):
            for doc in result['source_documents'][:request.max_results]:
                try:
                    # Serialize metadata to handle Neo4j objects
                    serialized_metadata = serialize_neo4j_objects(doc.metadata)
                    
                    # Clean and limit content size for API response
                    content = str(doc.page_content)
                    if len(content) > 1500:  # Reasonable limit for frontend display
                        content = content[:1500] + "... [truncated]"
                    
                    # Remove problematic characters
                    content = content.replace('\x00', '').replace('\r\n', '\n').replace('\r', '\n')
                    
                    source_docs.append({
                        "content": content,
                        "metadata": serialized_metadata,
                        "score": getattr(doc, 'score', None)  # Include similarity score if available
                    })
                except Exception as e:
                    logger.error(f"Error processing source document: {e}")
                    # Continue with other documents rather than failing completely
                    continue
        
        # Ensure result text is clean
        result_text = result.get('result', 'No analysis result available.')
        if isinstance(result_text, str):
            result_text = result_text.replace('\x00', '').strip()
        
        response = SecurityQueryResponse(
            result=result_text,
            query_type=result.get('query_type', 'UNKNOWN'),
            database_used=result.get('database_used', 'unknown'),
            collections_used=result.get('collections_used'),
            source_documents=source_docs if request.include_sources else None,
            processing_time=processing_time,
            error=error_msg,
            timestamp=datetime.now().isoformat(),
            success=not bool(error_msg)
        )
        
        logger.info(f"Query processed successfully in {processing_time:.2f}s using {response.database_used}")
        return response
        
    except Exception as e:
        logger.error(f"Error processing query: {e}")
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
async def get_network_graph(limit: int = 100):
    """Get network graph data from Neo4j for visualization."""
    if config.lightweight_mode:
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
        nodes, links = neo4j_helper.get_network_graph_data(limit=limit)
        
        # Generate basic statistics
        node_types = {}
        malicious_count = 0
        for node in nodes:
            node_types[node.type] = node_types.get(node.type, 0) + 1
            if node.malicious:
                malicious_count += 1
        
        statistics = {
            "total_nodes": len(nodes),
            "total_links": len(links),
            "node_types": node_types,
            "malicious_flows": malicious_count,
            "limit_applied": limit
        }
        
        return NetworkGraphResponse(
            nodes=nodes,
            links=links,
            statistics=statistics,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error getting network graph data: {e}")
        return NetworkGraphResponse(
            nodes=[],
            links=[],
            statistics={},
            timestamp=datetime.now().isoformat(),
            success=False,
            error=str(e)
        )

@app.get("/network/stats", response_model=NetworkStatsResponse)
async def get_network_stats():
    """Get network statistics from Neo4j for the dashboard."""
    if config.lightweight_mode:
        # Return mock data for lightweight mode
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
    
    try:
        stats = neo4j_helper.get_network_statistics()
        
        # Format data throughput (mock calculation for now)
        # In a real implementation, this would come from network monitoring
        throughput_gbps = min(stats.get("total_flows", 0) / 1000, 5.0)
        
        # Enhance threat indicators with threat types
        enhanced_threats = []
        for threat in stats.get("threat_indicators", []):
            threat_type = "Malicious Activity"
            if threat["count"] > 10:
                threat_type = "High Volume Attack"
            elif threat["count"] > 5:
                threat_type = "Moderate Threat"
            
            enhanced_threats.append({
                "ip": threat["ip"],
                "count": threat["count"],
                "threat_type": threat_type
            })
        
        return NetworkStatsResponse(
            network_nodes=stats.get("network_nodes", 0),
            active_connections=stats.get("active_connections", 0),
            data_throughput=f"{throughput_gbps:.1f} GB/s",
            total_hosts=stats.get("total_hosts", 0),
            total_flows=stats.get("total_flows", 0),
            total_protocols=stats.get("total_protocols", 0),
            malicious_flows=stats.get("malicious_flows", 0),
            top_ports=stats.get("top_ports", []),
            top_protocols=stats.get("top_protocols", []),
            threat_indicators=enhanced_threats,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error getting network statistics: {e}")
        return NetworkStatsResponse(
            network_nodes=0,
            active_connections=0,
            data_throughput="0 GB/s",
            total_hosts=0,
            total_flows=0,
            total_protocols=0,
            malicious_flows=0,
            top_ports=[],
            top_protocols=[],
            threat_indicators=[],
            timestamp=datetime.now().isoformat(),
            success=False,
            error=str(e)
        )

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