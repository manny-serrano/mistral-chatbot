#!/usr/bin/env python3
"""
FastAPI server for the Intelligent Security Agent.
Provides HTTP API endpoints for OpenWebUI integration.
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Suppress warnings before importing the agent
os.environ['GRPC_VERBOSITY'] = 'ERROR'
os.environ['GRPC_TRACE'] = ''
logging.getLogger('absl').setLevel(logging.ERROR)
warnings.filterwarnings("ignore", category=UserWarning)

# Add current directory to path so we can import the agent
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from intelligent_agent import IntelligentSecurityAgent

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
        
        # Validate configuration
        if self.api_port < 1 or self.api_port > 65535:
            raise ValueError(f"Invalid API port: {self.api_port}")
        
        logger.info(f"Configuration loaded - Host: {self.api_host}, Port: {self.api_port}, Environment: {self.environment}")

config = Config()

# Pydantic models for API requests/responses with improved validation
class SecurityQueryRequest(BaseModel):
    query: str = Field(..., description="Security question or analysis request", min_length=1, max_length=1000)
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

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    agent_status: str
    databases: Dict[str, str]
    version: str = "1.0.0"

# Initialize FastAPI app with enhanced configuration
app = FastAPI(
    title="Mistral Security Analysis API",
    description="API for the Intelligent Security Agent with enhanced network security analysis capabilities",
    version="1.0.0",
    docs_url="/docs" if config.environment == "development" else None,
    redoc_url="/redoc" if config.environment == "development" else None
)

# Add CORS middleware with proper configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Global agent instance with proper lifecycle management
agent = None
agent_initialized = False
initialization_error = None

def initialize_agent():
    """Initialize the security agent with comprehensive error handling."""
    global agent, agent_initialized, initialization_error
    
    if agent_initialized:
        return agent
    
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

@app.on_event("startup")
async def startup_event():
    """Initialize the agent on startup with proper error handling."""
    logger.info("Starting up Mistral Security Analysis API")
    try:
        initialize_agent()
    except Exception as e:
        logger.error(f"Failed to initialize during startup: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on shutdown with proper error handling."""
    logger.info("Shutting down Mistral Security Analysis API")
    global agent
    if agent:
        try:
            agent.close()
            logger.info("Agent connections closed successfully")
        except Exception as e:
            logger.error(f"Error closing agent: {e}")

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
            "examples": "/examples"
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Enhanced health check endpoint."""
    global agent, agent_initialized, initialization_error
    
    # Determine overall agent status
    if initialization_error:
        agent_status = f"error: {initialization_error}"
    elif agent_initialized and agent:
        agent_status = "healthy"
    elif agent_initialized:
        agent_status = "initialized_but_null"
    else:
        agent_status = "not_initialized"
    
    # Check database connections with detailed status
    databases = {}
    if agent_initialized and agent:
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
    overall_status = "healthy" if agent_status == "healthy" and any("connected" in status for status in databases.values()) else "unhealthy"
    
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
    """
    global agent, agent_initialized
    
    # Validate analysis type
    valid_types = ["auto", "semantic", "graph", "hybrid"]
    if request.analysis_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid analysis_type. Must be one of: {', '.join(valid_types)}"
        )
    
    # Ensure agent is initialized
    if not agent_initialized or not agent:
        agent = initialize_agent()
        if not agent:
            raise HTTPException(
                status_code=503,
                detail=f"Security agent is not available. Error: {initialization_error or 'Unknown initialization error'}"
            )
    
    try:
        start_time = datetime.now()
        
        # Log the request
        logger.info(f"Processing query from user '{request.user}': {request.query[:100]}...")
        logger.debug(f"Analysis type: {request.analysis_type}, Include sources: {request.include_sources}")
        
        # Prepare context from conversation history
        context = ""
        if request.conversation_history:
            logger.info(f"Processing conversation history with {len(request.conversation_history)} messages")
            context_messages = []
            for msg in request.conversation_history[-5:]:  # Last 5 messages for context
                if msg.get("role") in ["user", "assistant"]:
                    role = "User" if msg.get("role") == "user" else "Assistant"
                    content = msg.get("content", "").strip()
                    if content and len(content) < 200:  # Only include short messages for context
                        context_messages.append(f"{role}: {content}")
            
            if context_messages:
                context = "Previous conversation context:\n" + "\n".join(context_messages) + "\n\nCurrent question: "
                logger.info(f"Created conversation context: {context[:200]}...")
        
        # Combine context with current query
        full_query = context + request.query if context else request.query
        logger.info(f"Full query being sent to agent: {full_query[:300]}...")
        
        # Route query based on analysis type
        result = None
        if request.analysis_type == "auto":
            result = agent.query(full_query)
        else:
            # Override the classifier for specific analysis types
            result = agent.query(full_query)
            # Update the query type if it was overridden
            result["query_type"] = f"{request.analysis_type.upper()}_QUERY"
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        # Handle potential errors in result
        if result.get('error'):
            logger.warning(f"Agent returned error: {result['error']}")
        
        # Process source documents with size limiting
        source_docs = []
        if request.include_sources and result.get('source_documents'):
            for doc in result['source_documents'][:request.max_results]:
                try:
                    # Serialize metadata to handle Neo4j objects
                    serialized_metadata = serialize_neo4j_objects(doc.metadata)
                    # Limit content size for API response
                    content = doc.page_content
                    if len(content) > 2000:  # Truncate very long content
                        content = content[:2000] + "... [truncated]"
                    
                    source_docs.append({
                        "content": content,
                        "metadata": serialized_metadata
                    })
                except Exception as e:
                    logger.error(f"Error processing source document: {e}")
        
        response = SecurityQueryResponse(
            result=result.get('result', 'No analysis result available.'),
            query_type=result.get('query_type', 'UNKNOWN'),
            database_used=result.get('database_used', 'unknown'),
            collections_used=result.get('collections_used'),
            source_documents=source_docs if request.include_sources else None,
            processing_time=processing_time,
            error=result.get('error'),
            timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"Query processed successfully in {processing_time:.2f}s using {response.database_used}")
        return response
        
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing security query: {str(e)}"
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

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {"error": "Endpoint not found", "message": "Check /docs for available endpoints"}

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return {"error": "Internal server error", "message": "Please try again later"}

if __name__ == "__main__":
    logger.info(f"Starting Mistral Security Analysis API on {config.api_host}:{config.api_port}")
    if config.environment == "development":
        logger.info("API Documentation available at: http://localhost:8000/docs")
    
    uvicorn.run(
        "api_server:app",
        host=config.api_host,
        port=config.api_port,
        reload=config.environment == "development",
        log_level=config.log_level.lower()
    ) 