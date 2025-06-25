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

# Pydantic models for API requests/responses
class SecurityQueryRequest(BaseModel):
    query: str = Field(..., description="Security question or analysis request")
    analysis_type: str = Field(default="auto", description="Type of analysis: auto, semantic, graph, or hybrid")
    include_sources: bool = Field(default=True, description="Whether to include source documents")
    max_results: int = Field(default=10, description="Maximum number of source documents")
    user: str = Field(default="anonymous", description="User making the request")
    timestamp: Optional[str] = Field(default=None, description="Request timestamp")

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

# Initialize FastAPI app
app = FastAPI(
    title="Mistral Security Analysis API",
    description="API for the Intelligent Security Agent",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware for OpenWebUI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the OpenWebUI origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global agent instance
agent = None
agent_initialized = False

def initialize_agent():
    """Initialize the security agent with error handling."""
    global agent, agent_initialized
    
    if agent_initialized:
        return agent
    
    try:
        print("Initializing Intelligent Security Agent...")
        agent = IntelligentSecurityAgent(
            collection_name=None  # Use multi-collection retriever
        )
        agent_initialized = True
        print("Agent initialized successfully!")
        return agent
    except Exception as e:
        print(f"Failed to initialize agent: {e}")
        agent_initialized = False
        return None

@app.on_event("startup")
async def startup_event():
    """Initialize the agent on startup."""
    initialize_agent()

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on shutdown."""
    global agent
    if agent:
        try:
            agent.close()
        except Exception as e:
            print(f"Error closing agent: {e}")

@app.get("/", response_model=dict)
async def root():
    """Root endpoint."""
    return {
        "message": "Mistral Security Analysis API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    global agent, agent_initialized
    
    # Check agent status
    agent_status = "healthy" if agent_initialized and agent else "unhealthy"
    
    # Check database connections
    databases = {}
    if agent_initialized and agent:
        try:
            # Test Milvus connection
            if hasattr(agent.milvus_retriever, 'collections'):
                databases["milvus"] = f"connected ({len(agent.milvus_retriever.collections)} collections)"
            else:
                databases["milvus"] = "connected"
            
            # Test Neo4j connection  
            if hasattr(agent.neo4j_retriever, 'driver'):
                databases["neo4j"] = "connected"
            else:
                databases["neo4j"] = "unknown"
                
        except Exception as e:
            databases["error"] = str(e)
    else:
        databases = {"status": "agent_not_initialized"}
    
    return HealthResponse(
        status="healthy" if agent_status == "healthy" else "unhealthy",
        timestamp=datetime.now().isoformat(),
        agent_status=agent_status,
        databases=databases
    )

@app.post("/analyze", response_model=SecurityQueryResponse)
async def analyze_security_query(request: SecurityQueryRequest):
    """
    Analyze a security query using the intelligent agent.
    """
    global agent, agent_initialized
    
    # Ensure agent is initialized
    if not agent_initialized or not agent:
        agent = initialize_agent()
        if not agent:
            raise HTTPException(
                status_code=503,
                detail="Security agent is not available. Please check database connections."
            )
    
    try:
        start_time = datetime.now()
        
        # Validate analysis type
        valid_types = ["auto", "semantic", "graph", "hybrid"]
        if request.analysis_type not in valid_types:
            request.analysis_type = "auto"
        
        # Query the agent
        print(f"Processing query: {request.query}")
        print(f"Analysis type: {request.analysis_type}")
        
        # For auto type, let the agent's classifier decide
        if request.analysis_type == "auto":
            result = agent.query(request.query)
        else:
            # Override the classifier for specific analysis types
            if request.analysis_type == "semantic":
                result = agent.query(request.query)
                result["query_type"] = "SEMANTIC_QUERY"
            elif request.analysis_type == "graph":
                result = agent.query(request.query)
                result["query_type"] = "GRAPH_QUERY"
            elif request.analysis_type == "hybrid":
                result = agent.query(request.query)
                result["query_type"] = "HYBRID_QUERY"
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        # Process source documents
        source_docs = []
        if request.include_sources and result.get('source_documents'):
            for doc in result['source_documents'][:request.max_results]:
                # Serialize metadata to handle Neo4j objects
                serialized_metadata = serialize_neo4j_objects(doc.metadata)
                source_docs.append({
                    "content": doc.page_content,
                    "metadata": serialized_metadata
                })
        
        return SecurityQueryResponse(
            result=result.get('result', 'No analysis result available.'),
            query_type=result.get('query_type', 'UNKNOWN'),
            database_used=result.get('database_used', 'unknown'),
            collections_used=result.get('collections_used'),
            source_documents=source_docs if request.include_sources else None,
            processing_time=processing_time,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        print(f"Error processing query: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing security query: {str(e)}"
        )

@app.get("/collections")
async def get_collections():
    """Get available Milvus collections."""
    global agent, agent_initialized
    
    if not agent_initialized or not agent:
        raise HTTPException(
            status_code=503,
            detail="Security agent is not available."
        )
    
    try:
        collections = []
        if hasattr(agent.milvus_retriever, 'collections'):
            collections = list(agent.milvus_retriever.collections.keys())
        
        return {
            "collections": collections,
            "total": len(collections),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting collections: {str(e)}"
        )

@app.get("/examples")
async def get_query_examples():
    """Get example security queries."""
    examples = {
        "semantic_queries": [
            "Find traffic similar to port scanning",
            "Show me suspicious network patterns",
            "Detect behavior similar to malware communication",
            "Find flows that look like data exfiltration"
        ],
        "graph_queries": [
            "Show me all connections from IP 192.168.1.100",
            "Find the network path between two IPs",
            "Display communication patterns for suspicious hosts",
            "Show me all devices that communicated with external IPs"
        ],
        "hybrid_queries": [
            "Find similar attacks and show their network paths",
            "Identify suspicious patterns and map their connections",
            "Show me the network impact of similar security events"
        ],
        "specific_queries": [
            "Analyze the Nmap scan data from the honeypot",
            "Show me connections on port 22 (SSH)",
            "Find all HTTP traffic to external domains",
            "Identify potential C2 communications"
        ]
    }
    
    return {
        "examples": examples,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    # Get configuration from environment
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    
    print(f"Starting Mistral Security Analysis API on {host}:{port}")
    print("API Documentation available at: http://localhost:8000/docs")
    
    uvicorn.run(
        "api_server:app",
        host=host,
        port=port,
        reload=False,  # Disable reload in production
        log_level="info"
    ) 