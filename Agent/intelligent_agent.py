import os
import time
import logging
import re
from typing import List, Dict, Any, Optional, Union
from langchain_milvus import Milvus
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import OpenAI
from langchain.chains import RetrievalQA
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document
from langchain.prompts import PromptTemplate
from langchain.schema import BaseOutputParser
from dotenv import load_dotenv
from pymilvus import connections, utility
from neo4j import GraphDatabase
from pydantic import Field, PrivateAttr
import json
import math

# Load environment variables from root directory
load_dotenv('../.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Suppress gRPC and Milvus warnings
import warnings

# Suppress gRPC warnings
os.environ['GRPC_VERBOSITY'] = 'ERROR'
os.environ['GRPC_TRACE'] = ''

# Suppress absl logging warnings
logging.getLogger('absl').setLevel(logging.ERROR)

# Suppress other noisy loggers
warnings.filterwarnings("ignore", category=UserWarning)
logging.getLogger('pymilvus').setLevel(logging.WARNING)

# Custom prompt template for conversation memory
CONVERSATION_AWARE_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template="""You are a Mistral Security Agent designed to analyze network security data and maintain conversation context.

IMPORTANT CONVERSATION MEMORY INSTRUCTIONS:
- Pay careful attention to any conversation context included in the question
- Remember user preferences, names, and details mentioned in previous messages
- If a user tells you their name or asks you to call them something, remember it for future responses
- Maintain conversational continuity and refer back to earlier parts of the conversation when relevant
- If asked about previous conversation details (like "what is my name"), use information from the conversation context

Use the following pieces of retrieved context to answer the security question. If the question includes conversation history or context, make sure to consider that information in your response.

Context from Security Database:
{context}

Question (may include conversation context): {question}

Provide a detailed security analysis based on the available data. If the question is about conversation history or personal details mentioned earlier, respond appropriately using that context.

Answer:"""
)

# Simple conversational prompt for non-security queries
CONVERSATIONAL_PROMPT = PromptTemplate(
    input_variables=["question"],
    template="""You are a Mistral Security Agent. You can analyze network security data, but you also maintain normal conversation.

IMPORTANT CONVERSATION MEMORY INSTRUCTIONS:
- Pay careful attention to any conversation context included in the question
- Remember user preferences, names, and details mentioned in previous messages
- If a user tells you their name or asks you to call them something, remember it for future responses
- Maintain conversational continuity and refer back to earlier parts of the conversation when relevant
- If asked about previous conversation details (like "what is my name"), use information from the conversation context

Question (may include conversation context): {question}

If this is a simple conversational question, respond naturally. If it's about security analysis, let them know you can help with that too.

Answer:"""
)

class CypherGenerator:
    """Use LLM to generate Cypher queries from natural language prompts with few-shot examples."""

    def __init__(self, llm):
        self.llm = llm
        self.prompt_template = """
You are a cybersecurity graph database expert.

The Neo4j schema contains nodes:
- (Host) with properties like ip
- (Port) with properties like port number  
- (Flow) with properties like flowId, protocolIdentifier, flowStartMilliseconds, malicious, honeypot
- (Protocol) with properties like name
- (ProcessedFile) with properties like name

Relationships:
- (Host)-[:SENT]->(Flow)
- (Flow)-[:USES_SRC_PORT]->(Port)
- (Flow)-[:USES_DST_PORT]->(Port)
- (Flow)-[:USES_PROTOCOL]->(Protocol)
- (Host)-[:RECEIVED]->(Flow)

Given the user query, generate the most relevant Cypher query, using LIMIT clauses to avoid too large result sets.

Important notes:
- Always include LIMIT clauses unless aggregation queries.
- Use parameterized syntax if possible.
- Do NOT include any explanation or comments.
- Return only the Cypher query.

Example 1:
User query: "List all hosts sending traffic on port 80"
Cypher query:
MATCH (src:Host)-[:SENT]->(f:Flow)-[:USES_DST_PORT]->(p:Port {{port: 80}})
RETURN DISTINCT src.ip
LIMIT 25

Example 2:
User query: "Show flows marked malicious with protocol 6"
Cypher query:
MATCH (f:Flow)-[:USES_PROTOCOL]->(p:Protocol)
WHERE f.malicious = true AND f.protocolIdentifier = 6
RETURN f.flowId, f.flowStartMilliseconds, p.name
LIMIT 25

Example 3:
User query: "Find the path between host 192.168.1.10 and 10.0.0.5"
Cypher query:
MATCH path = shortestPath((src:Host {{ip: "192.168.1.10"}})-[:SENT*..5]-(dst:Host {{ip: "10.0.0.5"}}))
RETURN path

User query:
\"\"\"{query}\"\"\"

Cypher query (only the code, no explanations):
"""
    
    def generate(self, query: str) -> str:
        prompt = self.prompt_template.format(query=query)
        try:
            logger.info(f"Generating Cypher for query: {query}")
            cypher = self.llm.invoke(prompt).strip()
            logger.info(f"LLM generated Cypher: {cypher}")
            if not cypher.lower().startswith("match"):
                logger.warning(f"Invalid Cypher generated (doesn't start with MATCH): {cypher}")
                raise ValueError("Invalid Cypher generated")
            return cypher
        except Exception as e:
            logger.error(f"Error in Cypher generation: {e}")
            fallback = "MATCH (n) RETURN n LIMIT 5"
            logger.info(f"Using fallback Cypher: {fallback}")
            return fallback

class QueryClassifier:
    """Classifies queries to determine which database to use and whether they need database retrieval at all."""
    
    def __init__(self, llm: OpenAI):
        self.llm = llm
        self.classification_prompt = PromptTemplate(
            input_variables=["query"],
            template=""" 
            Analyze the following query and classify it into one of these categories:
            
            1. CONVERSATIONAL - For greetings, personal questions, names, general chat that doesn't need security data
               Examples: "hi", "hello", "what is my name", "my name is X", "thank you", "how are you"
            
            2. GRAPH_QUERY - For queries about relationships, connections, paths, network topology, 
               "who connected to whom", "show me the path", "find connections between", 
               "network relationships", "communication patterns", counting entities
            
            3. SEMANTIC_QUERY - For queries about finding similar patterns, behaviors, 
               "find similar to", "show me traffic like", "detect patterns similar to", 
               "find flows that look like", "semantic similarity", "behavioral analysis"
            
            4. HYBRID_QUERY - For queries that need both relationship analysis AND semantic similarity,
               "find similar attacks and their network paths", "show me connections of similar traffic"
            
            Query: {query}
            
            Respond with only: CONVERSATIONAL, GRAPH_QUERY, SEMANTIC_QUERY, or HYBRID_QUERY
            """
        )
    
    def classify_query(self, query: str) -> str:
        """Classify the query type."""
        try:
            response = self.llm.invoke(
                self.classification_prompt.format(query=query)
            )
            classification = response.strip().upper()
            if classification in ["CONVERSATIONAL", "GRAPH_QUERY", "SEMANTIC_QUERY", "HYBRID_QUERY"]:
                logger.debug(f"Query classified as: {classification}")
                return classification
            else:
                logger.warning(f"Unclear classification: {classification}, defaulting to SEMANTIC_QUERY")
                return "SEMANTIC_QUERY"
        except Exception as e:
            logger.error(f"Error classifying query: {e}")
            return "SEMANTIC_QUERY"

class Neo4jRetriever(BaseRetriever):
    """Retriever for Neo4j graph database queries with improved security and error handling."""
    
    # Use PrivateAttr for non-config attributes
    _driver: Any = PrivateAttr()
    _cypher_generator: Any = PrivateAttr()
    
    def __init__(self, uri: str, user: str, password: str, llm=None, **kwargs):
        super().__init__(**kwargs)
        try:
            self._driver = GraphDatabase.driver(uri, auth=(user, password))
            with self._driver.session() as session:
                session.run("RETURN 1")
            logger.info("Neo4j connection established successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            raise

        if llm is None:
            raise ValueError("LLM instance must be provided for Cypher generation.")

        self._cypher_generator = CypherGenerator(llm)
    
    @property
    def driver(self):
        return self._driver
        
    def _get_relevant_documents(self, query: str, *, run_manager=None) -> List[Document]:
        """Retrieve relevant documents from Neo4j based on the query."""
        try:
            logger.info(f"Starting Neo4j query for: {query}")
            logger.info(f"run_manager type: {type(run_manager)}")
            logger.info(f"run_manager value: {run_manager}")
            
            with self.driver.session() as session:
                # Convert natural language query to Cypher
                cypher_query, parameters = self._query_to_cypher(query)
                logger.debug(f"Executing Cypher query: {cypher_query}")
                
                # Log the Cypher query
                logger.info(f"Executing LLM-generated Cypher:\n{cypher_query}")

                
                result = session.run(cypher_query, parameters)
                
                # Log the actual result structure for debugging
                result_list = list(result)
                logger.info(f"Query returned {len(result_list)} records")
                if result_list:
                    logger.info(f"Sample record keys: {list(result_list[0].keys())}")
                    logger.info(f"Sample record values: {dict(result_list[0])}")
                result = result_list  # Convert to list since we consumed the result
                
                documents = []
                for record in result:
                    # Convert Neo4j record to document format
                    content = self._format_neo4j_result(record)
                    metadata = {
                        "source": "neo4j",
                        "collection": "neo4j_graph",  # Set proper collection name
                        "data_type": "graph_network_flows",  # Set proper data type  
                        "query_type": "graph",
                        "record_data": dict(record)
                    }
                    documents.append(Document(page_content=content, metadata=metadata))
                
                logger.info(f"Retrieved {len(documents)} documents from Neo4j")
                
                return documents
        except Exception as e:
            logger.error(f"Error querying Neo4j: {e}")
            return []
    #Now relies on the LLM to generate the Cypher query, ignoring the hardcoded logic
    def _query_to_cypher(self, query: str) -> tuple[str, dict]:
        """Generate Cypher query exclusively via LLM, ignoring hardcoded logic."""
        if not self._cypher_generator:
            logger.warning("No CypherGenerator available, using default fallback.")
            return "MATCH (n) RETURN n LIMIT 5", {}

        logger.info("Generating Cypher query using LLM for user query.")
        try:
            logger.info("About to call cypher_generator.generate()")
            cypher_query = self._cypher_generator.generate(query)
            logger.info(f"Successfully generated Cypher: {cypher_query}")
            # LLM returns plain Cypher, so no parameters expected
            return cypher_query, {}
        except Exception as e:
            logger.error(f"Exception in _query_to_cypher: {e}")
            logger.error(f"Exception type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return "MATCH (n) RETURN n LIMIT 5", {}

    
    def _format_neo4j_result(self, record) -> str:
        """Format Neo4j record into readable text."""
        try:
            # Safely convert record to dict and handle Neo4j Node objects
            record_dict = dict(record)
            
            # Extract properties from Neo4j Node objects
            extracted_dict = {}
            for key, value in record_dict.items():
                if hasattr(value, 'labels') and hasattr(value, 'properties'):
                    # This is a Neo4j Node object
                    node_props = dict(value.properties)
                    node_props['_labels'] = list(value.labels)
                    node_props['_element_id'] = getattr(value, 'element_id', 'unknown')
                    extracted_dict.update(node_props)
                else:
                    # Regular property
                    extracted_dict[key] = value
            
            # Use the extracted properties for formatting
            record_dict = extracted_dict
            
            # Handle Flow-specific results (most common case)
            if any(key.endswith('IPv4Address') for key in record_dict.keys()):
                src = record_dict.get('f.sourceIPv4Address') or record_dict.get('sourceIPv4Address') or record_dict.get('source_ip', 'unknown')
                dst = record_dict.get('f.destinationIPv4Address') or record_dict.get('destinationIPv4Address') or record_dict.get('dest_ip', 'unknown')
                src_port = record_dict.get('f.sourceTransportPort') or record_dict.get('sourceTransportPort') or record_dict.get('src_port')
                dst_port = record_dict.get('f.destinationTransportPort') or record_dict.get('destinationTransportPort') or record_dict.get('dest_port')
                protocol_id = record_dict.get('f.protocolIdentifier') or record_dict.get('protocolIdentifier')
                flow_id = record_dict.get('f.flowId') or record_dict.get('flowId')
                malicious = record_dict.get('f.malicious') or record_dict.get('malicious')
                honeypot = record_dict.get('f.honeypot') or record_dict.get('honeypot')
                
                # Build result string
                result = f"{src}"
                if src_port:
                    result += f":{src_port}"
                result += f" → {dst}"
                if dst_port:
                    result += f":{dst_port}"
                
                # Add protocol info
                if protocol_id is not None:
                    protocol_name = {6: 'TCP', 17: 'UDP', 1: 'ICMP'}.get(protocol_id, f'Protocol-{protocol_id}')
                    result += f" ({protocol_name})"
                
                # Add security indicators
                if malicious:
                    result += " [MALICIOUS]"
                if honeypot:
                    result += " [HONEYPOT]"
                
                # Add flow ID if available
                if flow_id:
                    result += f" FlowID: {flow_id}"
                
                return result
            
            # Handle Host results
            elif 'ip' in record_dict:
                ip = record_dict.get('ip')
                hostname = record_dict.get('hostname')
                os_info = record_dict.get('os')
                
                result = f"Host: {ip}"
                if hostname:
                    result += f" ({hostname})"
                if os_info:
                    result += f" OS: {os_info}"
                
                return result
            
            # Handle Port results  
            elif 'port' in record_dict:
                port = record_dict.get('port')
                service = record_dict.get('service')
                
                result = f"Port: {port}"
                if service:
                    result += f" ({service})"
                
                return result
            
            # Handle COUNT/NUMERICAL results
            elif 'total_nodes' in record_dict:
                total = record_dict.get('total_nodes', 0)
                return f"Total nodes in graph database: {total:,}"
            
            elif 'total_ips' in record_dict:
                total = record_dict.get('total_ips', 0)
                samples = record_dict.get('sample_ips', [])
                sample_text = f"\nSample IPs: {', '.join(samples[:5])}" if samples else ""
                return f"Total unique IP addresses: {total}{sample_text}"
            
            elif 'total_connections' in record_dict:
                return f"Connections: {record_dict.get('total_connections', 0)}, " \
                       f"Unique sources: {record_dict.get('unique_source_ips', 0)}, " \
                       f"Unique flows: {record_dict.get('unique_flows', 0)}"
            
            elif 'total_flows' in record_dict:
                return f"Total flows: {record_dict.get('total_flows', 0)}, " \
                       f"Unique flow IDs: {record_dict.get('unique_flow_ids', 0)}"
            
            elif 'total_hosts' in record_dict:
                total = record_dict.get('total_hosts', 0)
                samples = record_dict.get('sample_hosts', [])
                sample_text = f"\nSample hosts: {', '.join(samples[:5])}" if samples else ""
                return f"Total unique hosts: {total}{sample_text}"
            
            # Handle simple key-value pairs for any remaining cases
            elif len(record_dict) <= 3:
                pairs = [f"{k}: {v}" for k, v in record_dict.items() if v is not None]
                return ", ".join(pairs)
            
            # Default JSON formatting for complex results
            else:
                return json.dumps(record_dict, indent=2)
                
        except Exception as e:
            logger.error(f"Error formatting Neo4j result: {e}")
            logger.error(f"Record: {record_dict}")
            return f"Raw result: {json.dumps(record_dict, default=str)}"
    
    async def _aget_relevant_documents(self, query: str, *, run_manager=None):
        return self._get_relevant_documents(query, run_manager=run_manager)

class MilvusRetriever(BaseRetriever):
    """Retriever for Milvus vector database queries with improved error handling."""
    
    # Use PrivateAttr for non-config attributes
    _vectorstore: Any = PrivateAttr()
    _k: int = PrivateAttr(default=5)
    
    def __init__(self, vectorstore: Milvus, k: int = 5, **kwargs):
        super().__init__(**kwargs)
        self._vectorstore = vectorstore
        self._k = k
        logger.info(f"Initialized MilvusRetriever with k={k}")
    
    @property
    def vectorstore(self):
        return self._vectorstore
    
    @property
    def k(self):
        return self._k
    
    def _get_relevant_documents(self, query: str, *, run_manager=None) -> List[Document]:
        """Retrieve relevant documents from Milvus based on semantic similarity."""
        try:
            docs = self.vectorstore.similarity_search(query, k=self.k)
            # Add metadata to indicate source
            for doc in docs:
                doc.metadata["source"] = "milvus"
                doc.metadata["query_type"] = "semantic"
            logger.info(f"Retrieved {len(docs)} documents from Milvus")
            return docs
        except Exception as e:
            logger.error(f"Error querying Milvus: {e}")
            return []
    
    async def _aget_relevant_documents(self, query: str, *, run_manager=None):
        return self._get_relevant_documents(query, run_manager=run_manager)

class MultiCollectionMilvusRetriever(BaseRetriever):
    """Retriever that queries multiple Milvus collections and combines results with improved error handling."""
    
    # Use PrivateAttr for non-config attributes
    _collections: Dict[str, Milvus] = PrivateAttr()
    _k_per_collection: int = PrivateAttr(default=3)
    _embeddings: Any = PrivateAttr()
    
    def __init__(self, embeddings, milvus_host: str = "localhost", milvus_port: int = 19530, 
                 collections: List[str] = None, k_per_collection: int = 3, **kwargs):
        super().__init__(**kwargs)
        self._embeddings = embeddings
        self._k_per_collection = k_per_collection
        
        # Initialize connections to multiple collections
        self._collections = {}
        if collections:
            successful_connections = 0
            for collection_name in collections:
                try:
                    vectorstore = Milvus(
                        embedding_function=embeddings,
                        collection_name=collection_name,
                        connection_args={"uri": f"http://{milvus_host}:{milvus_port}"},
                    )
                    # Test the connection by checking if collection exists
                    vectorstore.similarity_search("test", k=1)
                    self._collections[collection_name] = vectorstore
                    successful_connections += 1
                    logger.info(f"Connected to Milvus collection: {collection_name}")
                except Exception as e:
                    logger.warning(f"Failed to connect to collection {collection_name}: {e}")
            
            if successful_connections == 0:
                logger.error("Failed to connect to any Milvus collections")
            else:
                logger.info(f"Successfully connected to {successful_connections}/{len(collections)} collections")
    
    @property
    def collections(self):
        return self._collections
    
    @property
    def k_per_collection(self):
        return self._k_per_collection
    
    def _get_relevant_documents(self, query: str, *, run_manager=None) -> List[Document]:
        """Retrieve documents from all collections and combine results."""
        all_docs = []
        
        for collection_name, vectorstore in self._collections.items():
            try:
                # Query each collection
                docs = vectorstore.similarity_search(query, k=self._k_per_collection)
                
                # Add metadata to identify source collection
                for doc in docs:
                    doc.metadata["source"] = "milvus"
                    doc.metadata["collection"] = collection_name
                    doc.metadata["query_type"] = "semantic"
                    
                    # Add collection-specific context
                    if collection_name == "honeypotData":
                        doc.metadata["data_type"] = "honeypot_logs"
                    elif collection_name == "mistralData":
                        doc.metadata["data_type"] = "network_flows"
                
                all_docs.extend(docs)
                logger.debug(f"Found {len(docs)} results from {collection_name}")
                
            except Exception as e:
                logger.error(f"Error querying collection {collection_name}: {e}")
        
        logger.info(f"Retrieved total of {len(all_docs)} documents from {len(self._collections)} collections")
        return all_docs
    
    async def _aget_relevant_documents(self, query: str, *, run_manager=None):
        return self._get_relevant_documents(query, run_manager=run_manager)

class HybridRetriever(BaseRetriever):
    """Retriever that combines both Neo4j and Milvus results with improved error handling."""
    
    # Use PrivateAttr for non-config attributes
    _neo4j_retriever: Any = PrivateAttr()
    _milvus_retriever: Any = PrivateAttr()
    
    def __init__(self, neo4j_retriever: Neo4jRetriever, milvus_retriever: Union[MilvusRetriever, MultiCollectionMilvusRetriever], **kwargs):
        super().__init__(**kwargs)
        self._neo4j_retriever = neo4j_retriever
        self._milvus_retriever = milvus_retriever
        logger.info("Initialized HybridRetriever")
    
    @property
    def neo4j_retriever(self):
        return self._neo4j_retriever
    
    @property
    def milvus_retriever(self):
        return self._milvus_retriever
    
    def _get_relevant_documents(self, query: str, *, run_manager=None) -> List[Document]:
        """Get documents from both databases."""
        neo4j_docs = []
        milvus_docs = []
        
        try:
            neo4j_docs = self.neo4j_retriever._get_relevant_documents(query, run_manager=run_manager)
        except Exception as e:
            logger.error(f"Error retrieving from Neo4j in hybrid query: {e}")
        
        try:
            milvus_docs = self.milvus_retriever._get_relevant_documents(query, run_manager=run_manager)
        except Exception as e:
            logger.error(f"Error retrieving from Milvus in hybrid query: {e}")
        
        # Combine and add hybrid metadata
        combined_docs = neo4j_docs + milvus_docs
        for doc in combined_docs:
            doc.metadata["query_type"] = "hybrid"
        
        logger.info(f"Hybrid retrieval: {len(neo4j_docs)} Neo4j + {len(milvus_docs)} Milvus = {len(combined_docs)} total")
        return combined_docs
    
    async def _aget_relevant_documents(self, query: str, *, run_manager=None):
        return self._get_relevant_documents(query, run_manager=run_manager)

class IntelligentSecurityAgent:
    """Main agent that intelligently routes queries to appropriate databases with improved error handling and connection management."""
    
    def __init__(self, 
                 milvus_host: str = None,
                 milvus_port: int = None,
                 neo4j_uri: str = None,
                 neo4j_user: str = None,
                 neo4j_password: str = None,
                 collection_name: Optional[str] = None):
        
        # Use environment variables with fallbacks
        self.milvus_host = milvus_host or os.getenv("MILVUS_HOST", "localhost")
        self.milvus_port = milvus_port or int(os.getenv("MILVUS_PORT", "19530"))
        self.neo4j_uri = neo4j_uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.neo4j_user = neo4j_user or os.getenv("NEO4J_USER", "neo4j")
        self.neo4j_password = neo4j_password or os.getenv("NEO4J_PASSWORD", "password123")
        
        logger.info("Initializing Intelligent Security Agent")
        
        # Initialize LLM
        try:
            self.llm = OpenAI(
                model=os.getenv("OPENAI_MODEL", "GPT 4.1"),
                openai_api_key=os.getenv("OPENAI_API_KEY"),
                openai_api_base=os.getenv("OPENAI_API_BASE")
            )
            logger.info("LLM initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize LLM: {e}")
            raise
        
        # Initialize query classifier
        self.classifier = QueryClassifier(self.llm)
        
        # Initialize embeddings - using same model as init_milvus_and_embed.py
        try:
            model_name = os.getenv("EMB_MODEL", "BAAI/bge-large-en-v1.5")
            self.embeddings = HuggingFaceEmbeddings(model_name=model_name)
            logger.info(f"Embeddings model loaded: {model_name}")
        except Exception as e:
            logger.error(f"Failed to load embeddings model: {e}")
            raise
        
        # Connect to Milvus
        self._connect_milvus(self.milvus_host, self.milvus_port)
        
        # Initialize Milvus retriever with multiple collections
        self.milvus_retriever = None
        available_collections = ["mistralData", "honeypotData"]
        
        if collection_name:
            # If specific collection is requested, use single collection retriever
            try:
                self.milvus_vectorstore = Milvus(
                    embedding_function=self.embeddings,
                    collection_name=collection_name,
                    connection_args={"uri": f"http://{self.milvus_host}:{self.milvus_port}"},
                )
                self.milvus_retriever = MilvusRetriever(self.milvus_vectorstore)
                logger.info(f"Using single collection: {collection_name}")
            except Exception as e:
                logger.error(f"Failed to initialize single collection retriever: {e}")
        else:
            # Use multi-collection retriever for comprehensive search
            try:
                self.milvus_retriever = MultiCollectionMilvusRetriever(
                    embeddings=self.embeddings,
                    milvus_host=self.milvus_host,
                    milvus_port=self.milvus_port,
                    collections=available_collections,
                    k_per_collection=3  # Get 3 results from each collection
                )
                logger.info("Using multi-collection retriever")
            except Exception as e:
                logger.error(f"Failed to initialize multi-collection retriever: {e}")
        
        # Initialize Neo4j retriever
        try:
            self.neo4j_retriever = Neo4jRetriever(
                self.neo4j_uri,
                self.neo4j_user,
                self.neo4j_password,
                llm=self.llm  # pass the LLM here
            )
        except Exception as e:
            logger.error(f"Failed to initialize Neo4j retriever: {e}")
            self.neo4j_retriever = None
        
        # Initialize hybrid retriever
        if self.milvus_retriever and self.neo4j_retriever:
            try:
                self.hybrid_retriever = HybridRetriever(self.neo4j_retriever, self.milvus_retriever)
                logger.info("Hybrid retriever initialized")
            except Exception as e:
                logger.error(f"Failed to initialize hybrid retriever: {e}")
                self.hybrid_retriever = None
        else:
            self.hybrid_retriever = None
            logger.warning("Hybrid retriever not available due to missing component retrievers")
    
    def _connect_milvus(self, host: str, port: int):
        """Connect to Milvus with retry logic and better error handling."""
        logger.info(f"Connecting to Milvus at {host}:{port}")
        for attempt in range(30):
            try:
                connections.connect("default", host=host, port=port)
                logger.info("Successfully connected to Milvus")
                break
            except Exception as e:
                logger.warning(f"Connection attempt {attempt + 1}/30 failed: {e}")
                if attempt < 29:
                    time.sleep(2)
                else:
                    logger.error("Could not connect to Milvus after 30 attempts")
                    raise
    
    def query(self, question: str) -> Dict[str, Any]:
        """Main query method that routes to appropriate database with improved error handling."""
        
        if not question or not question.strip():
            return {
                "result": "Please provide a valid question.",
                "query_type": "INVALID",
                "database_used": "none",
                "error": "Empty or invalid query"
            }
        
        # Classify the query
        try:
            query_type = self.classifier.classify_query(question)
            logger.info(f"Query classified as: {query_type}")
        except Exception as e:
            logger.error(f"Error in query classification: {e}")
            query_type = "SEMANTIC_QUERY"
        
        # Handle conversational queries without database retrieval
        if query_type == "CONVERSATIONAL":
            try:
                logger.info("Processing conversational query without database retrieval")
                response = self.llm.invoke(
                    CONVERSATIONAL_PROMPT.format(question=question)
                )
                
                return {
                    "result": response,
                    "query_type": query_type,
                    "database_used": "none",
                    "source_documents": []  # No documents for conversational queries
                }
            except Exception as e:
                logger.error(f"Error processing conversational query: {e}")
                return {
                    "result": f"Error processing conversational query: {str(e)}",
                    "query_type": query_type,
                    "database_used": "none",
                    "error": str(e)
                }
        
        # Route to appropriate retriever with fallback logic for security queries
        retriever = None
        retriever_name = "none"
        
        if query_type == "GRAPH_QUERY" and self.neo4j_retriever:
            retriever = self.neo4j_retriever
            retriever_name = "neo4j"
            logger.info("Routing to Neo4j for graph analysis")
        elif query_type == "SEMANTIC_QUERY" and self.milvus_retriever:
            retriever = self.milvus_retriever
            retriever_name = "milvus"
            logger.info("Routing to Milvus for semantic similarity")
        elif query_type == "HYBRID_QUERY" and self.hybrid_retriever:
            retriever = self.hybrid_retriever
            retriever_name = "hybrid"
            logger.info("Routing to both databases for hybrid analysis")
        else:
            # Fallback logic
            if self.milvus_retriever:
                retriever = self.milvus_retriever
                retriever_name = "milvus_fallback"
                logger.info("Falling back to Milvus")
            elif self.neo4j_retriever:
                retriever = self.neo4j_retriever
                retriever_name = "neo4j_fallback"
                logger.info("Falling back to Neo4j")
            else:
                return {
                    "result": "No database connections available. Please check system status.",
                    "query_type": query_type,
                    "database_used": "none",
                    "error": "No available retrievers"
                }
        
        # Execute security query with database retrieval
        try:
            # Use custom conversation-aware prompt for better memory
            qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                retriever=retriever,
                return_source_documents=True,
                chain_type_kwargs={"prompt": CONVERSATION_AWARE_PROMPT}
            )
            
            result = qa_chain.invoke({"query": question})
            
            # Add metadata about the routing decision
            result["query_type"] = query_type
            
            # Determine which database was actually used based on the retriever
            if retriever == self.neo4j_retriever:
                result["database_used"] = "neo4j"
            elif retriever == self.milvus_retriever:
                # Check if it's multi-collection or single collection
                if isinstance(retriever, MultiCollectionMilvusRetriever):
                    result["database_used"] = "milvus_multi_collection"
                    result["collections_used"] = list(retriever.collections.keys())
                else:
                    result["database_used"] = "milvus"
            elif retriever == self.hybrid_retriever:
                result["database_used"] = "hybrid"
                if hasattr(self.milvus_retriever, 'collections'):
                    result["collections_used"] = list(self.milvus_retriever.collections.keys())
            else:
                result["database_used"] = retriever_name
            
            logger.info(f"Query processed successfully using {result.get('database_used')}")
            return result
            
        except Exception as e:
            logger.error(f"Error executing query: {e}")
            return {
                "result": f"Error processing query: {str(e)}",
                "query_type": query_type,
                "database_used": retriever_name,
                "error": str(e)
            }
    
    def close(self):
        """Clean up connections with proper error handling."""
        logger.info("Closing agent connections")
        try:
            if hasattr(self, 'neo4j_retriever') and self.neo4j_retriever:
                self.neo4j_retriever.driver.close()
                logger.info("Neo4j connection closed")
        except Exception as e:
            logger.error(f"Error closing Neo4j connection: {e}")

def main():
    """Main function to run the intelligent agent with improved error handling."""
    
    try:
        # Initialize the agent
        agent = IntelligentSecurityAgent(
            collection_name=None  # Use multi-collection retriever
        )
        
        logger.info("Agent initialized successfully. Starting interactive mode.")
        
        while True:
            try:
                question = input("\nEnter your security question (or 'exit' to quit): ").strip()
                
                if question.lower() in ['exit', 'quit', 'stop']:
                    break
                
                if not question:
                    continue
                
                logger.info(f"Processing question: {question}")
                result = agent.query(question)
                
                print(f"\n=== Analysis Results ===")
                print(f"Query Type: {result.get('query_type', 'Unknown')}")
                print(f"Database Used: {result.get('database_used', 'Unknown')}")
                
                # Show collection information if using multi-collection
                if 'collections_used' in result:
                    print(f"Collections Queried: {', '.join(result['collections_used'])}")
                
                print(f"\n=== Answer ===")
                print(result.get('result', 'No result found'))
                
                if result.get('source_documents'):
                    print(f"\n=== Source Data ({len(result['source_documents'])} items) ===")
                    
                    # Group by data source for multi-collection results
                    source_breakdown = {}
                    for doc in result['source_documents']:
                        collection = doc.metadata.get('collection', doc.metadata.get('source', 'unknown'))
                        data_type = doc.metadata.get('data_type', 'unknown')
                        key = f"{collection} ({data_type})"
                        if key not in source_breakdown:
                            source_breakdown[key] = []
                        source_breakdown[key].append(doc)
                    
                    # Show breakdown if multiple sources
                    if len(source_breakdown) > 1:
                        print("Data Source Breakdown:")
                        for source, docs in source_breakdown.items():
                            print(f"   • {source}: {len(docs)} documents")
                        print()
                    
                    # Show first 5 documents with enhanced metadata
                    for i, doc in enumerate(result['source_documents'][:5], 1):
                        source = doc.metadata.get('source', 'unknown')
                        collection = doc.metadata.get('collection', 'N/A')
                        data_type = doc.metadata.get('data_type', 'N/A')
                        print(f"{i}. Source: {source} | Collection: {collection} | Type: {data_type}")
                        content = doc.page_content
                        print(f"   {content[:150]}{'...' if len(content) > 150 else ''}")
                        print()
                
            except KeyboardInterrupt:
                print("\n\nStopping agent...")
                break
            except Exception as e:
                logger.error(f"Error in main loop: {e}")
                print(f"\nError: {e}")
                print("Please try a different question or check your database connections.")
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        print(f"Failed to initialize agent: {e}")
        return 1
    
    finally:
        try:
            agent.close()
        except:
            pass
        logger.info("Agent stopped")
    
    return 0

if __name__ == "__main__":
    exit(main()) 