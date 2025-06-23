#!/usr/bin/env python3
"""
Test script for the Intelligent Security Agent
This script demonstrates the query classification functionality without requiring
full database connections.
"""

import os
from dotenv import load_dotenv
from langchain_openai import OpenAI
from langchain.prompts import PromptTemplate

# Load environment variables
load_dotenv()

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

def test_query_classification():
    """Test the query classification functionality."""
    
    # Initialize LLM
    llm = OpenAI(
        model="gpt-4",
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_api_base=os.getenv("OPENAI_API_BASE")
    )
    
    # Initialize classifier
    classifier = QueryClassifier(llm)
    
    # Test queries
    test_queries = [
        "Show me all connections from IP 192.168.1.1",
        "Find traffic similar to the Nmap scan",
        "Show me the network path of suspicious traffic",
        "Who connected to the honeypot?",
        "Find flows that look like port scanning",
        "Show me the communication patterns between these IPs",
        "Detect patterns similar to the DDoS attack",
        "What's the relationship between these network nodes?",
        "Find similar attacks and their network paths",
        "Show me connections of similar traffic"
    ]
    
    print("=== Intelligent Security Agent - Query Classification Test ===\n")
    
    for i, query in enumerate(test_queries, 1):
        print(f"Query {i}: {query}")
        classification = classifier.classify_query(query)
        
        if classification == "GRAPH_QUERY":
            print(f"  → Classified as: GRAPH_QUERY (will use Neo4j)")
            print(f"  → Reason: Query focuses on relationships, connections, or network topology")
        elif classification == "SEMANTIC_QUERY":
            print(f"  → Classified as: SEMANTIC_QUERY (will use Milvus)")
            print(f"  → Reason: Query focuses on finding similar patterns or behaviors")
        else:
            print(f"  → Classified as: HYBRID_QUERY (will use both databases)")
            print(f"  → Reason: Query needs both relationship analysis and semantic similarity")
        
        print()

def main():
    """Main function to run the test."""
    print("Testing Intelligent Security Agent Query Classification...")
    print("This test demonstrates how the agent decides which database to use for different queries.\n")
    
    try:
        test_query_classification()
        print("Test completed successfully!")
        print("\nThe intelligent agent can automatically route queries to:")
        print("• Neo4j for graph/relationship analysis")
        print("• Milvus for semantic similarity search")
        print("• Both databases for complex hybrid queries")
        
    except Exception as e:
        print(f"Error during test: {e}")
        print("\nMake sure you have:")
        print("1. Set up your .env file with OPENAI_API_KEY and OPENAI_API_BASE")
        print("2. Installed the required dependencies: pip install -r requirements.txt")

if __name__ == "__main__":
    main() 