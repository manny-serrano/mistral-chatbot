"""
title: Mistral Security Agent
author: Mistral Team
author_url: https://github.com/mistralai
funding_url: https://github.com/sponsors/mistralai
version: 1.0.0
license: MIT
"""

import requests
import json
import os
import time
from datetime import datetime
from typing import Dict, Any, List, Optional


class Pipe:
    """
    OpenWebUI Function (Pipe) for Mistral Security Analysis.
    
    This function provides access to the intelligent security agent that can analyze:
    - Network traffic patterns and anomalies
    - Security threats and suspicious activities  
    - Connection relationships and network paths
    - Similar traffic patterns and behavioral analysis
    """
    
    def __init__(self):
        # Configuration
        self.type = "pipe"
        self.id = "mistral_security_agent"
        self.name = "Mistral Security Agent"
        self.agent_base_url = "http://mistral-security-app:8000"
        self.timeout = 120  # 2 minutes timeout for security analysis

    def pipe(
        self, 
        user_message: str = "",
        model_id: str = "",
        messages: List[Dict[str, Any]] = None,
        body: Dict[str, Any] = None,
        **kwargs
    ) -> str:
        """
        Main pipe function that processes user messages for security analysis.
        
        This automatically detects security-related queries and processes them
        through the security analysis agent.
        """
        

        # Handle different calling patterns from OpenWebUI
        if messages is None:
            messages = []
        if body is None:
            body = {}
            
        # Extract user message from different possible sources
        actual_message = user_message
        
        # Try body first (OpenWebUI might pass it here)
        if not actual_message and body:
            if isinstance(body, dict):
                actual_message = body.get('messages', [{}])[-1].get('content', '') if body.get('messages') else ""
                if not actual_message:
                    actual_message = body.get('user_message', '')
                if not actual_message:
                    actual_message = body.get('content', '')
        
        # Try messages array
        if not actual_message and messages:
            # Try to get the last user message from the conversation
            for msg in reversed(messages):
                if isinstance(msg, dict) and msg.get('role') == 'user':
                    actual_message = msg.get('content', '')
                    break
        
        # Try kwargs
        if not actual_message and kwargs:
            actual_message = kwargs.get('user_message', '') or kwargs.get('content', '')
        
        if not actual_message:
            return "Please provide a question to analyze."
        
        # Always route through the security agent - let it decide if it can provide security insights
        # This is much better than keyword matching!
        return self._analyze_security_query(actual_message)
    

    
    def _analyze_security_query(self, query: str) -> str:
        """Process the security query through the analysis agent."""
        
        try:
            # Prepare the request
            payload = {
                "query": query.strip(),
                "analysis_type": "auto",
                "include_sources": True,
                "max_results": 10,
                "user": "openwebui_user"
            }
            
            # Make request to the security agent API
            response = self._make_agent_request(payload)
            
            if response.get("error"):
                return f"**Security Analysis Error:** {response['error']}"
            
            # Format the response
            return self._format_security_response(response, query)
            
        except Exception as e:
            return f"**Security Analysis Error:** {str(e)}"
    
    def _make_agent_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Make HTTP request to the security agent."""
        
        try:
            # Make the HTTP request to the security agent API
            response = requests.post(
                f"{self.agent_base_url}/analyze",
                json=payload,
                timeout=self.timeout,
                headers={"Content-Type": "application/json"}
            )
            
            # Check if request was successful
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 503:
                return {
                    "error": "Security agent is not available. Please wait for the system to initialize."
                }
            else:
                return {
                    "error": f"API request failed with status {response.status_code}: {response.text}"
                }
                
        except requests.exceptions.ConnectionError:
            return {
                "error": "Could not connect to the security agent. Please ensure the Mistral Security App is running."
            }
        except requests.exceptions.Timeout:
            return {
                "error": "Security analysis timed out. Please try a simpler query."
            }
        except Exception as e:
            return {
                "error": f"Unexpected error: {str(e)}"
            }
    
    def _format_security_response(self, response: Dict[str, Any], original_query: str) -> str:
        """Format the agent response for OpenWebUI display."""
        
        # Header with analysis summary
        formatted = "# Security Analysis Results\n\n"
        
        # Query information
        formatted += f"**Query:** {original_query}\n"
        formatted += f"**Analysis Type:** {response.get('query_type', 'Unknown')}\n"
        formatted += f"**Database Used:** {response.get('database_used', 'Unknown')}\n"
        
        if response.get('collections_used'):
            formatted += f"**Collections:** {', '.join(response['collections_used'])}\n"
        
        if response.get('processing_time'):
            formatted += f"**Processing Time:** {response['processing_time']:.2f}s\n"
        
        if response.get('confidence_score'):
            confidence = response['confidence_score']
            confidence_level = "HIGH" if confidence >= 0.8 else "MEDIUM" if confidence >= 0.6 else "LOW"
            formatted += f"**Confidence:** {confidence_level} ({confidence:.0%})\n"
        
        formatted += "\n---\n\n"
        
        # Main analysis result
        formatted += "## Analysis Results\n\n"
        formatted += response.get('result', 'No analysis result available.')
        formatted += "\n\n"
        
        # Source documents if available
        if response.get('source_documents'):
            formatted += "## Source Data\n\n"
            
            # Group sources by collection/type
            sources_by_type = {}
            for doc in response['source_documents']:
                metadata = doc.get('metadata', {})
                doc_type = f"{metadata.get('collection', 'unknown')} ({metadata.get('data_type', 'unknown')})"
                if doc_type not in sources_by_type:
                    sources_by_type[doc_type] = []
                sources_by_type[doc_type].append(doc)
            
            # Display sources grouped by type
            for source_type, docs in sources_by_type.items():
                formatted += f"### {source_type.title()}\n\n"
                
                for i, doc in enumerate(docs[:3], 1):  # Limit to 3 docs per type for readability
                    content = doc.get('content', 'No content available')
                    metadata = doc.get('metadata', {})
                    
                    # Truncate long content
                    if len(content) > 200:
                        content = content[:200] + "..."
                    
                    formatted += f"**{i}.** {content}\n"
                    
                    if metadata.get('timestamp'):
                        formatted += f"   *Timestamp: {metadata['timestamp']}*\n"
                    
                    formatted += "\n"
        
        # Footer with recommendations
        formatted += "---\n\n"
        formatted += "**Next Steps:**\n"
        formatted += "- Review the source data for additional context\n"
        formatted += "- Consider correlating with other network events\n" 
        formatted += "- Ask more specific questions about the findings\n\n"
        
        formatted += "**Try these follow-up queries:**\n"
        formatted += "- \"Show me more connections from the suspicious IPs\"\n"
        formatted += "- \"Find similar attack patterns in the data\"\n"
        formatted += "- \"Analyze the network topology of these connections\"\n"
        
        return formatted


class Tools:
    """
    Legacy Tools class for backward compatibility.
    The main functionality is now in the Pipe class above.
    """
    
    def __init__(self):
        self.pipe = Pipe()
        
    def security_analysis_query(
        self,
        query: str,
        analysis_type: str = "auto",
        include_sources: bool = True,
        max_results: int = 10,
        __user__: dict = None,
    ) -> str:
        """
        Legacy method for direct security analysis queries.
        """
        return self.pipe._analyze_security_query(query)
    
    def get_security_suggestions(self, __user__: dict = None) -> str:
        """
        Get suggested security queries and analysis examples.
        """
        
        suggestions = """# Security Analysis Examples

## Example Queries

Try asking these questions naturally:

- "Find traffic similar to port scanning"
- "Show me suspicious network patterns"
- "Analyze the honeypot data for threats"
- "What connections look suspicious?"
- "Find patterns similar to malware communication"
- "Show me all connections from external IPs"
- "Identify potential scanning attempts"

## How It Works

The Mistral Security Agent automatically detects security-related questions and analyzes them using:

- **Semantic Analysis**: Finding similar patterns in network data
- **Graph Analysis**: Mapping network relationships and connections  
- **Hybrid Analysis**: Combining both approaches for comprehensive insights

## Data Sources

Your analysis includes data from:
- **Network Flows**: Traffic patterns and connection data
- **Honeypot Logs**: Captured attack attempts and malicious activities

## Getting Started

Just ask your security questions naturally! The system will automatically:
1. Detect security-related queries
2. Route them to the appropriate analysis engine
3. Return detailed findings with source data
4. Provide actionable insights and recommendations

Try it now by asking: "Show me suspicious network activity"
"""
        
        return suggestions

# Initialize both for compatibility
tools = Tools() 