#!/usr/bin/env python3
"""
Script to run the Intelligent Security Agent with local database connections.
"""

import os
import warnings
import logging

# Suppress gRPC and Milvus warnings before importing the agent
os.environ['GRPC_VERBOSITY'] = 'ERROR'
os.environ['GRPC_TRACE'] = ''
logging.getLogger('absl').setLevel(logging.ERROR)
warnings.filterwarnings("ignore", category=UserWarning)

from intelligent_agent import IntelligentSecurityAgent

def main():
    print("Starting Intelligent Security Agent...")
    print("Connecting to local databases:")
    print("  - Milvus: localhost:19530")
    print("  - Neo4j: localhost:7687")
    
    # Initialize the agent with localhost settings - using BOTH Milvus collections
    agent = IntelligentSecurityAgent(
        milvus_host="localhost",                    # Use localhost instead of "standalone"
        milvus_port=19530,
        neo4j_uri="bolt://localhost:7687",
        neo4j_user="neo4j",
        neo4j_password="password123",
        collection_name=None  # Use multi-collection retriever for both mistralData and honeypotData
    )
    
    print("\nIntelligent Security Agent Ready!")
    print("\nExample queries you can try:")
    print("• 'Show me all connections from IP 192.168.1.1' (Graph query)")
    print("• 'Find traffic similar to port scanning' (Semantic query)")
    print("• 'Show me suspicious network patterns' (Hybrid query)")
    print("\nType 'exit' to quit.\n")
    
    while True:
        try:
            question = input("Enter your security question: ").strip()
            
            if question.lower() in ['exit', 'quit', 'stop']:
                break
            
            if not question:
                continue
                
            print(f"\nProcessing: {question}")
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
            print(f"\nError: {e}")
            print("Please try a different question or check your database connections.")
    
    agent.close()
    print("Agent stopped. Goodbye!")

if __name__ == "__main__":
    main() 