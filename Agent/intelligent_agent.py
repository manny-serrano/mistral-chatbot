import os
import time
from typing import List, Dict, Any, Optional
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

# Suppress gRPC and Milvus warnings
import warnings
import logging

# Suppress gRPC warnings
os.environ['GRPC_VERBOSITY'] = 'ERROR'
os.environ['GRPC_TRACE'] = ''

# Suppress absl logging warnings
logging.getLogger('absl').setLevel(logging.ERROR)

# Suppress other noisy loggers
warnings.filterwarnings("ignore", category=UserWarning)
logging.getLogger('pymilvus').setLevel(logging.WARNING)

class QueryClassifier:
    """Classifies queries to determine which database to use."""
    
    def __init__(self, llm: OpenAI):
        self.llm = llm
        self.classification_prompt = PromptTemplate(
            input_variables=["query"],
            template="""
            Analyze the following security query and classify it into one of these categories:
            
            1. GRAPH_QUERY - For queries about relationships, connections, paths, network topology, 
               "who connected to whom", "show me the path", "find connections between", 
               "network relationships", "communication patterns"
            
            2. SEMANTIC_QUERY - For queries about finding similar patterns, behaviors, 
               "find similar to", "show me traffic like", "detect patterns similar to", 
               "find flows that look like", "semantic similarity", "behavioral analysis"
            
            3. HYBRID_QUERY - For queries that need both relationship analysis AND semantic similarity,
               "find similar attacks and their network paths", "show me connections of similar traffic"
            
            Query: {query}
            
            Respond with only: GRAPH_QUERY, SEMANTIC_QUERY, or HYBRID_QUERY
            """
        )
    
    def classify_query(self, query: str) -> str:
        """Classify the query type."""
        try:
            response = self.llm.invoke(
                self.classification_prompt.format(query=query)
            )
            classification = response.strip().upper()
            if classification in ["GRAPH_QUERY", "SEMANTIC_QUERY", "HYBRID_QUERY"]:
                return classification
            else:
                # Default to semantic query if classification is unclear
                return "SEMANTIC_QUERY"
        except Exception as e:
            print(f"Error classifying query: {e}")
            return "SEMANTIC_QUERY"

class Neo4jRetriever(BaseRetriever):
    """Retriever for Neo4j graph database queries."""
    
    # Use PrivateAttr for non-config attributes
    _driver: Any = PrivateAttr()
    
    def __init__(self, uri: str, user: str, password: str, **kwargs):
        super().__init__(**kwargs)
        self._driver = GraphDatabase.driver(uri, auth=(user, password))
    
    @property
    def driver(self):
        return self._driver
        
    def _get_relevant_documents(self, query: str, *, run_manager=None) -> List[Document]:
        """Retrieve relevant documents from Neo4j based on the query."""
        try:
            with self.driver.session() as session:
                # Convert natural language query to Cypher
                cypher_query = self._query_to_cypher(query)
                result = session.run(cypher_query)
                
                documents = []
                for record in result:
                    # Convert Neo4j record to document format
                    content = self._format_neo4j_result(record)
                    metadata = {
                        "source": "neo4j",
                        "query_type": "graph",
                        "record_data": dict(record)
                    }
                    documents.append(Document(page_content=content, metadata=metadata))
                
                return documents
        except Exception as e:
            print(f"Error querying Neo4j: {e}")
            return []
    
    def _query_to_cypher(self, query: str) -> str:
        """Convert natural language query to Cypher query."""
        # This is a simplified version - in production, you'd use an LLM to convert
        query_lower = query.lower()
        
        # COUNT/NUMERICAL QUERIES - No limits needed for aggregations
        if any(word in query_lower for word in ["how many", "count", "total", "number of"]):
            if "ip" in query_lower and ("address" in query_lower or "ips" in query_lower):
                return """
                MATCH (ip:Host)
                RETURN COUNT(DISTINCT ip.ip) as total_ips,
                       collect(DISTINCT ip.ip)[0..8] as sample_ips
                """
            elif "connection" in query_lower:
                return """
                MATCH (src:Host)-[r:SENT]->(f:Flow)
                RETURN COUNT(r) as total_connections,
                       COUNT(DISTINCT src.ip) as unique_source_ips,
                       COUNT(DISTINCT f) as unique_flows
                """
            elif "flow" in query_lower:
                return """
                MATCH (f:Flow)
                RETURN COUNT(f) as total_flows,
                       COUNT(DISTINCT f.flowId) as unique_flow_ids
                """
            elif "host" in query_lower:
                return """
                MATCH (h:Host)
                RETURN COUNT(DISTINCT h.ip) as total_hosts,
                       collect(DISTINCT h.ip)[0..8] as sample_hosts
                """
        
        # STATISTICAL/ANALYTICAL QUERIES - No limits for aggregations
        elif any(word in query_lower for word in ["average", "sum", "min", "max", "stats", "statistics"]):
            return """
            MATCH (src:Host)-[r:SENT]->(f:Flow)-[:USES_SRC_PORT]->(sp:Port),
                  (f)-[:USES_DST_PORT]->(dp:Port)
            RETURN COUNT(f) as total_flows,
                   COUNT(DISTINCT src.ip) as unique_sources,
                   COUNT(DISTINCT dp.port) as unique_dest_ports,
                   AVG(toInteger(dp.port)) as avg_dest_port,
                   MIN(toInteger(dp.port)) as min_dest_port,
                   MAX(toInteger(dp.port)) as max_dest_port
            """
        
        # SPECIFIC IP/HOST QUERIES - Moderate limits for detailed results
        elif "from ip" in query_lower or "ip " in query_lower and any(op in query_lower for op in ["192.", "10.", "172.", "127."]):
            # Extract IP from query (simple regex would be better in production)
            import re
            ip_match = re.search(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', query)
            if ip_match:
                target_ip = ip_match.group()
                return f"""
                MATCH (src:Host {{ip: '{target_ip}'}})-[r:SENT]->(f:Flow),
                      (f)-[:USES_DST_PORT]->(dp:Port),
                      (dst:Host)-[:RECEIVED]->(f)
                RETURN src.ip as source_ip, dst.ip as dest_ip, 
                       dp.port as dest_port, f.flowId as flow_id,
                       f.protocolIdentifier as protocol
                ORDER BY f.flowStartMilliseconds DESC
                LIMIT 50
                """
        
        # CONNECTION/RELATIONSHIP QUERIES - Reasonable limits for readability
        elif "connection" in query_lower or "connect" in query_lower:
            return """
            MATCH (src:Host)-[r:SENT]->(f:Flow),
                  (dst:Host)-[:RECEIVED]->(f),
                  (f)-[:USES_SRC_PORT]->(sp:Port),
                  (f)-[:USES_DST_PORT]->(dp:Port)
            RETURN src.ip as source_ip, dst.ip as dest_ip, 
                   sp.port as src_port, dp.port as dst_port,
                   f.protocolIdentifier as protocol,
                   f.flowStartMilliseconds as timestamp
            ORDER BY f.flowStartMilliseconds DESC
            LIMIT 25
            """
        
        # PATH QUERIES - Reasonable limits to prevent exponential explosion
        elif "path" in query_lower:
            return """
            MATCH path = (src:Host)-[:SENT]->(:Flow)<-[:RECEIVED]-(dst:Host)
            WHERE src.ip <> dst.ip
            RETURN DISTINCT src.ip as source, dst.ip as destination
            LIMIT 20
            """
        
        # PORT/SERVICE QUERIES - No limits for port analysis
        elif "port" in query_lower:
            if any(word in query_lower for word in ["common", "popular", "top"]):
                return """
                MATCH (f:Flow)-[:USES_DST_PORT]->(dp:Port)
                RETURN dp.port as port, COUNT(f) as connection_count
                ORDER BY connection_count DESC
                LIMIT 20
                """
            else:
                return """
                MATCH (f:Flow)-[:USES_DST_PORT]->(dp:Port),
                      (src:Host)-[:SENT]->(f),
                      (dst:Host)-[:RECEIVED]->(f)
                RETURN DISTINCT dp.port as dest_port,
                       COUNT(f) as flow_count,
                       COUNT(DISTINCT src.ip) as unique_sources
                ORDER BY flow_count DESC
                """
        
        # PROTOCOL QUERIES - No limits for protocol analysis
        elif "protocol" in query_lower:
            return """
            MATCH (f:Flow)
            WHERE f.protocolIdentifier IS NOT NULL
            RETURN f.protocolIdentifier as protocol,
                   COUNT(f) as flow_count,
                   COUNT(DISTINCT f.flowId) as unique_flows
            ORDER BY flow_count DESC
            """
        
        # DEFAULT QUERY - Comprehensive overview with reasonable limit
        else:
            return """
            MATCH (src:Host)-[r:SENT]->(f:Flow),
                  (dst:Host)-[:RECEIVED]->(f),
                  (f)-[:USES_DST_PORT]->(dp:Port)
            RETURN src.ip as source_ip, dst.ip as dest_ip, 
                   dp.port as dest_port,
                   f.protocolIdentifier as protocol,
                   f.flowStartMilliseconds as timestamp
            ORDER BY f.flowStartMilliseconds DESC
            LIMIT 15
            """
    
    def _format_neo4j_result(self, record) -> str:
        """Format Neo4j record into readable text."""
        try:
            record_dict = dict(record)
            
            # Handle COUNT/NUMERICAL results
            if 'total_ips' in record_dict:
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
            
            # Handle STATISTICAL results
            elif 'avg_dest_port' in record_dict:
                return f"Port statistics: Flows: {record_dict.get('total_flows', 0)}, " \
                       f"Unique sources: {record_dict.get('unique_sources', 0)}, " \
                       f"Unique dest ports: {record_dict.get('unique_dest_ports', 0)}, " \
                       f"Avg port: {record_dict.get('avg_dest_port', 0):.1f}, " \
                       f"Port range: {record_dict.get('min_dest_port', 0)}-{record_dict.get('max_dest_port', 0)}"
            
            # Handle PORT analysis
            elif 'port' in record_dict and 'connection_count' in record_dict:
                return f"Port {record_dict.get('port')}: {record_dict.get('connection_count')} connections"
            
            elif 'dest_port' in record_dict and 'flow_count' in record_dict:
                return f"Port {record_dict.get('dest_port')}: {record_dict.get('flow_count')} flows, " \
                       f"{record_dict.get('unique_sources', 0)} unique sources"
            
            # Handle PROTOCOL analysis
            elif 'protocol' in record_dict and 'flow_count' in record_dict:
                return f"Protocol {record_dict.get('protocol')}: {record_dict.get('flow_count')} flows"
            
            # Handle CONNECTION results
            elif all(key in record_dict for key in ['source_ip', 'dest_ip']):
                src = record_dict.get('source_ip', 'unknown')
                dst = record_dict.get('dest_ip', 'unknown')
                port = record_dict.get('dest_port', record_dict.get('dst_port', '?'))
                protocol = record_dict.get('protocol', '?')
                
                base = f"{src} → {dst}:{port}"
                if protocol != '?' and protocol is not None:
                    base += f" ({protocol})"
                
                if 'timestamp' in record_dict:
                    ts = record_dict.get('timestamp')
                    if ts:
                        try:
                            from datetime import datetime
                            dt = datetime.fromtimestamp(int(ts) / 1000)
                            base += f" at {dt.strftime('%Y-%m-%d %H:%M:%S')}"
                        except:
                            base += f" at {ts}"
                
                return base
            
            # Handle PATH results
            elif hasattr(record, 'path'):
                nodes = [node['address'] for node in record.path.nodes if 'address' in node]
                return f"Network path: {' -> '.join(nodes)}"
            
            # Handle simple key-value pairs
            elif len(record_dict) <= 3:
                pairs = [f"{k}: {v}" for k, v in record_dict.items() if v is not None]
                return ", ".join(pairs)
            
            # Default JSON formatting for complex results
            else:
                return json.dumps(record_dict, indent=2)
                
        except Exception as e:
            return f"Record formatting error: {str(record)} (Error: {e})"
    
    async def _aget_relevant_documents(self, query: str, *, run_manager=None):
        return self._get_relevant_documents(query, run_manager=run_manager)

class MilvusRetriever(BaseRetriever):
    """Retriever for Milvus vector database queries."""
    
    # Use PrivateAttr for non-config attributes
    _vectorstore: Any = PrivateAttr()
    _k: int = PrivateAttr(default=5)
    
    def __init__(self, vectorstore: Milvus, k: int = 5, **kwargs):
        super().__init__(**kwargs)
        self._vectorstore = vectorstore
        self._k = k
    
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
            return docs
        except Exception as e:
            print(f"Error querying Milvus: {e}")
            return []
    
    async def _aget_relevant_documents(self, query: str, *, run_manager=None):
        return self._get_relevant_documents(query, run_manager=run_manager)

class MultiCollectionMilvusRetriever(BaseRetriever):
    """Retriever that queries multiple Milvus collections and combines results."""
    
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
            for collection_name in collections:
                try:
                    vectorstore = Milvus(
                        embedding_function=embeddings,
                        collection_name=collection_name,
                        connection_args={"uri": f"http://{milvus_host}:{milvus_port}"},
                    )
                    self._collections[collection_name] = vectorstore
                    print(f"Connected to Milvus collection: {collection_name}")
                except Exception as e:
                    print(f"Failed to connect to collection {collection_name}: {e}")
    
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
                print(f"Found {len(docs)} results from {collection_name}")
                
            except Exception as e:
                print(f"Error querying collection {collection_name}: {e}")
        
        # Sort by relevance (assuming first results are most relevant)
        # In a more sophisticated implementation, you could re-rank based on scores
        return all_docs
    
    async def _aget_relevant_documents(self, query: str, *, run_manager=None):
        return self._get_relevant_documents(query, run_manager=run_manager)

class HybridRetriever(BaseRetriever):
    """Retriever that combines both Neo4j and Milvus results."""
    
    # Use PrivateAttr for non-config attributes
    _neo4j_retriever: Any = PrivateAttr()
    _milvus_retriever: Any = PrivateAttr()
    
    def __init__(self, neo4j_retriever: Neo4jRetriever, milvus_retriever: MilvusRetriever, **kwargs):
        super().__init__(**kwargs)
        self._neo4j_retriever = neo4j_retriever
        self._milvus_retriever = milvus_retriever
    
    @property
    def neo4j_retriever(self):
        return self._neo4j_retriever
    
    @property
    def milvus_retriever(self):
        return self._milvus_retriever
    
    def _get_relevant_documents(self, query: str, *, run_manager=None) -> List[Document]:
        """Get documents from both databases."""
        neo4j_docs = self.neo4j_retriever._get_relevant_documents(query, run_manager=run_manager)
        milvus_docs = self.milvus_retriever._get_relevant_documents(query, run_manager=run_manager)
        
        # Combine and add hybrid metadata
        combined_docs = neo4j_docs + milvus_docs
        for doc in combined_docs:
            doc.metadata["query_type"] = "hybrid"
        
        return combined_docs
    
    async def _aget_relevant_documents(self, query: str, *, run_manager=None):
        return self._get_relevant_documents(query, run_manager=run_manager)

class IntelligentSecurityAgent:
    """Main agent that intelligently routes queries to appropriate databases."""
    
    def __init__(self, 
                 milvus_host: str = None,
                 milvus_port: int = None,
                 neo4j_uri: str = None,
                 neo4j_user: str = None,
                 neo4j_password: str = None,
                 collection_name: Optional[str] = None):
        
        # Use environment variables with fallbacks
        milvus_host = milvus_host or os.getenv("MILVUS_HOST", "localhost")
        milvus_port = milvus_port or int(os.getenv("MILVUS_PORT", "19530"))
        neo4j_uri = neo4j_uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        neo4j_user = neo4j_user or os.getenv("NEO4J_USER", "neo4j")
        neo4j_password = neo4j_password or os.getenv("NEO4J_PASSWORD", "password123")
        
        # Initialize LLM
        self.llm = OpenAI(
            model="GPT 4.1",  # Using available model from your team
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            openai_api_base=os.getenv("OPENAI_API_BASE")
        )
        
        # Initialize query classifier
        self.classifier = QueryClassifier(self.llm)
        
        # Initialize embeddings - using same model as init_milvus_and_embed.py
        model_name = os.getenv("EMB_MODEL", "BAAI/bge-large-en-v1.5")
        self.embeddings = HuggingFaceEmbeddings(model_name=model_name)
        
        # Store connection details
        self.milvus_host = milvus_host
        self.milvus_port = milvus_port
        
        # Connect to Milvus
        self._connect_milvus(milvus_host, milvus_port)
        
        # Initialize Milvus retriever with multiple collections
        available_collections = ["mistralData", "honeypotData"]  # Both collections
        if collection_name:
            # If specific collection is requested, use single collection retriever
            self.milvus_vectorstore = Milvus(
                embedding_function=self.embeddings,
                collection_name=collection_name,
                connection_args={"uri": f"http://{milvus_host}:{milvus_port}"},
            )
            self.milvus_retriever = MilvusRetriever(self.milvus_vectorstore)
        else:
            # Use multi-collection retriever for comprehensive search
            self.milvus_retriever = MultiCollectionMilvusRetriever(
                embeddings=self.embeddings,
                milvus_host=milvus_host,
                milvus_port=milvus_port,
                collections=available_collections,
                k_per_collection=3  # Get 3 results from each collection
            )
        
        # Initialize Neo4j retriever
        self.neo4j_retriever = Neo4jRetriever(neo4j_uri, neo4j_user, neo4j_password)
        
        # Initialize hybrid retriever
        if self.milvus_retriever:
            self.hybrid_retriever = HybridRetriever(self.neo4j_retriever, self.milvus_retriever)
        else:
            self.hybrid_retriever = None
    
    def _connect_milvus(self, host: str, port: int):
        """Connect to Milvus with retry logic."""
        print("Connecting to Milvus...")
        for attempt in range(30):
            try:
                connections.connect("default", host=host, port=port)
                break
            except Exception as e:
                print(f"Connection attempt {attempt + 1}/30 failed: {e}")
                if attempt < 29:
                    time.sleep(2)
                else:
                    print("Could not connect to Milvus")
                    break
    
    def query(self, question: str) -> Dict[str, Any]:
        """Main query method that routes to appropriate database."""
        
        # Classify the query
        query_type = self.classifier.classify_query(question)
        print(f"Query classified as: {query_type}")
        
        # Route to appropriate retriever
        if query_type == "GRAPH_QUERY":
            retriever = self.neo4j_retriever
            print("Routing to Neo4j for graph analysis...")
        elif query_type == "SEMANTIC_QUERY" and self.milvus_retriever:
            retriever = self.milvus_retriever
            print("Routing to Milvus for semantic similarity...")
        elif query_type == "HYBRID_QUERY" and self.hybrid_retriever:
            retriever = self.hybrid_retriever
            print("Routing to both databases for hybrid analysis...")
        else:
            # Fallback to available retriever
            if self.milvus_retriever:
                retriever = self.milvus_retriever
                print("Falling back to Milvus...")
            else:
                retriever = self.neo4j_retriever
                print("Falling back to Neo4j...")
        
        # Create RAG chain
        qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            retriever=retriever,
            return_source_documents=True,
        )
        
        # Execute query
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
        else:
            result["database_used"] = "unknown"
        
        return result
    
    def close(self):
        """Clean up connections."""
        if hasattr(self, 'neo4j_retriever'):
            self.neo4j_retriever.driver.close()

def main():
    """Main function to run the intelligent agent."""
    
    # Initialize the agent
    agent = IntelligentSecurityAgent(
        collection_name="network_flows"  # Replace with your actual collection name
    )
    

    
    while True:
        question = input("\nEnter your question: ")
        if question.strip().lower() in ['exit', 'quit', 'stop']:
            break
        
        try:
            result = agent.query(question)
            print("Query processed successfully")                
        except Exception as e:
            print(f"Error processing query: {e}")
    
    agent.close()
    print("Agent closed.")

if __name__ == "__main__":
    main() 