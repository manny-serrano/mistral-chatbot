# Enhancing Network Security Analysis with MISTRAL

This project enhances the MISTRAL platform, a National Science Foundation (NSF)-funded initiative focused on capturing and analyzing network data within research lab environments. It aims to improve tools for querying, distributing, and visualizing security logs and research data, specifically targeting network security datasets relevant to research labs. The project involves correlating diverse data sources and developing intuitive visualizations for researchers and security teams, offering hands-on experience in Python, API development, and advanced data analysis.

## Features

*   **Intelligent Query Routing**: Automatically classifies natural language queries into conversational, graph-based (Neo4j), semantic (Milvus), or hybrid types to route them to the appropriate data store.
*   **Multi-Database Integration**: Seamlessly queries data from Neo4j (graph database) and Milvus (vector database).
*   **Conversation Memory**: Maintains context across user interactions, remembering details and preferences for more natural dialogue.
*   **Cypher Query Generation**: Utilizes LLMs to dynamically generate Neo4j Cypher queries from natural language.
*   **Semantic Search**: Employs sentence transformers for vector embeddings to find similar network behaviors and patterns in Milvus.
*   **Network Graph Visualization**: Provides endpoints to retrieve network topology data from Neo4j for visualization purposes.
*   **Network Statistics and Analysis**: Offers endpoints for retrieving aggregated network statistics, including flow counts, protocol distribution, top ports, and threat indicators.
*   **Time-Series and Heatmap Data**: Generates data for time-series charts (bandwidth, alerts) and heatmaps (hourly activity, threat intensity) from Neo4j.
*   **API Server**: Exposes functionalities via a FastAPI-based HTTP API for integration with frontends and other services.
*   **Optimized Embeddings**: Loads sentence transformer models with optimizations for memory usage and cache management.
*   **Data Ingestion**: Includes scripts for ingesting network flow logs (JSON) and enriching them with IP information and protocol/service mappings into Neo4j.
*   **Caching Mechanisms**: Implements aggressive caching for analyzed results and network statistics to improve response times.
*   **Request Deduplication**: Prevents redundant processing of identical concurrent requests.

## Usage

The project can be run as a standalone agent for interactive use, as a backend API server, or used for batch processing and data ingestion.

### Interactive Agent

Run the `run_agent.py` script to launch an interactive command-line interface for querying the agent.

```bash
python Agent/run_agent.py
```

You will be prompted to enter security questions. Type 'exit' to quit.

### API Server

The FastAPI application provides HTTP endpoints for interacting with the agent.

```bash
uvicorn Agent/api_server:app --host 0.0.0.0 --port 8000 --reload
```

**Example API Calls:**

1.  **Analyze Security Query:**
    ```bash
    curl -X POST "http://localhost:8000/analyze" \
    -H "Content-Type: application/json" \
    -d '{
      "query": "Show me suspicious network patterns",
      "analysis_type": "auto",
      "include_sources": true,
      "user": "test_user"
    }'
    ```

2.  **Get Network Graph Data:**
    ```bash
    curl "http://localhost:8000/network/graph?limit=100&ip_address=192.168.1.1"
    ```

3.  **Get Network Statistics:**
    ```bash
    curl "http://localhost:8000/network/stats"
    ```

4.  **Get Available Collections:**
    ```bash
    curl "http://localhost:8000/collections"
    ```

### Data Ingestion

Use the `insert_logs.py` script to ingest JSON log files into the Neo4j database.

```bash
python neo4j-graphdatabase/insert_logs.py
```

Follow the prompts to select the collection, files, and data type.

## Installation

To set up the project, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2.  **Set up a Python virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    *Note: The `requirements.txt` file is not provided in the codebase, but it's a standard practice.*

4.  **Configure environment variables:**
    Create a `.env` file in the root directory with your database credentials and API keys.
    ```dotenv
    # Example .env file
    OPENAI_API_KEY=your_openai_api_key
    NEO4J_URI=bolt://localhost:7687
    NEO4J_USER=neo4j
    NEO4J_PASSWORD=your_neo4j_password
    MILVUS_HOST=localhost
    MILVUS_PORT=19530
    MILVUS_COLLECTION_NAME=mistralData
    EMB_MODEL=all-MiniLM-L6-v2
    MODEL_CACHE_DIR=/srv/homedir/mistral-app/model-cache
    ```

5.  **Start Databases:**
    Ensure that Neo4j and Milvus are running and accessible at the configured URIs and ports.

## Technologies Used

*   **Python**: The primary programming language for the entire project.
*   **Langchain**: A framework for developing applications powered by language models, used here for building LLM-driven chains like `RetrievalQA`.
*   **Langchain-Milvus**: Integration library for connecting Langchain with Milvus vector databases.
*   **Langchain-HuggingFace**: Integration library for using Hugging Face models (like sentence transformers) with Langchain.
*   **Langchain-OpenAI**: Integration library for using OpenAI models with Langchain.
*   **Milvus**: An open-source vector database used for storing and searching embeddings of network data, enabling semantic similarity searches.
*   **HuggingFace Embeddings**: Leverages models from Hugging Face (e.g., `all-MiniLM-L6-v2`) to generate vector representations (embeddings) of text data.
*   **Neo4j**: A leading graph database used to store and query network topology, relationships, and flow data, enabling graph-based analysis.
*   **NumPy**: Used for numerical operations, especially with embeddings.
*   **Pandas**: Utilized for data manipulation and analysis, particularly in loading data from CSV and Excel files for Neo4j ingestion.
*   **PyMilvus**: The official Python SDK for interacting with Milvus.
*   **Neo4j Python Driver**: The official Python driver for connecting to and querying Neo4j databases.
*   **FastAPI**: A modern, fast (high-performance) web framework for building APIs with Python. Used to expose the agent's capabilities via HTTP.
*   **Uvicorn**: An ASGI server used to run the FastAPI application.
*   **Pydantic**: Used for data validation and settings management within FastAPI applications.
*   **Dotenv**: Loads environment variables from a `.env` file, useful for managing credentials and configurations.
*   **Sentence-Transformers**: A Python framework for state-of-the-art sentence, text and image embeddings.
*   **uvloop**: An optimized asyncio event loop that can provide performance improvements.
*   **Tqdm**: A library for creating smart progress bars for loops and iterations.

## Configuration

Configuration is primarily managed through environment variables. A `.env` file in the project root is recommended.

**Key Environment Variables:**

*   **`OPENAI_API_KEY`**: Your OpenAI API key.
*   **`OPENAI_API_BASE`**: (Optional) The base URL for the OpenAI API if using a proxy or custom endpoint.
*   **`OPENAI_MODEL`**: The OpenAI model to use (e.g., `GPT 4.1`).
*   **`MILVUS_HOST`**: Hostname or IP address of the Milvus instance (default: `localhost`).
*   **`MILVUS_PORT`**: Port for the Milvus instance (default: `19530`).
*   **`MILVUS_INDEX_TYPE`**: Milvus index type (default: `IVF_FLAT`).
*   **`MILVUS_METRIC_TYPE`**: Milvus metric type for similarity search (default: `COSINE`).
*   **`VECTOR_DIMENSIONS`**: Expected dimensions for vectors (default: `384`).
*   **`EMB_MODEL`**: Name of the Hugging Face sentence transformer model (default: `all-MiniLM-L6-v2`).
*   **`MODEL_CACHE_DIR`**: Directory for caching downloaded transformer models (default: `/srv/homedir/mistral-app/model-cache`).
*   **`NEO4J_URI`**: Connection URI for Neo4j (default: `bolt://localhost:7687`).
*   **`NEO4J_USER`**: Username for Neo4j authentication (default: `neo4j`).
*   **`NEO4J_PASSWORD`**: Password for Neo4j authentication (default: `password123`).
*   **`FLOW_LOG_PATTERN`**: Glob pattern to find flow log files for ingestion (e.g., `Samples_flow/*.json`).
*   **`EMBEDDING_BATCH_SIZE`**: Number of texts to process for embedding at once (default: `512`).
*   **`EMBEDDING_INTERNAL_BATCH`**: Internal batch size for model encoding (default: `64`).
*   **`INSERT_BATCH_SIZE`**: Number of records to insert into Milvus per batch (default: `100`).
*   **`LOG_LEVEL`**: Logging level for the API server (e.g., `INFO`, `DEBUG`, `ERROR`) (default: `INFO`).
*   **`ENVIRONMENT`**: Deployment environment (e.g., `development`, `production`) (default: `development`).
*   **`CORS_ORIGINS`**: Comma-separated list of allowed CORS origins (default: `*`).
*   **`LIGHTWEIGHT_MODE`**: Enable lightweight mode for faster startup/CI checks (default: `false`).
*   **`STARTUP_MODE`**: Control startup behavior (e.g., `normal`, `health_check_friendly`) (default: `normal`).

## API Documentation

The project exposes a RESTful API using FastAPI.

### Base URL

`http://localhost:8000` (or the configured `API_HOST` and `API_PORT`)

### Endpoints

#### `/` (GET)

*   **Description**: Root endpoint providing basic API information.
*   **Response**:
    ```json
    {
      "message": "Mistral Security Analysis API",
      "version": "1.0.0",
      "environment": "development",
      "status": "healthy",
      "docs": "/docs",
      "health": "/health",
      "endpoints": {
        "analyze": "/analyze",
        "collections": "/collections",
        "examples": "/examples",
        "network_graph": "/network/graph",
        "network_stats": "/network/stats"
      }
    }
    ```

#### `/health` (GET)

*   **Description**: Health check endpoint for the API and its dependencies.
*   **Response**:
    ```json
    {
      "status": "healthy",
      "timestamp": "2023-10-27T10:30:00.123456",
      "agent_status": "healthy",
      "databases": {
        "milvus": "connected (2 collections: ['mistralData', 'honeypotData'])",
        "neo4j": "connected",
        "hybrid": "available"
      },
      "version": "1.0.0"
    }
    ```
    *   `agent_status` can be `healthy`, `initializing`, `error: <message>`, `lightweight_mode`, etc.
    *   `databases` provides status for Milvus, Neo4j, and hybrid retrieval.

#### `/analyze` (POST)

*   **Description**: Analyzes a security query using intelligent routing and parallel processing.
*   **Request Body**:
    ```json
    {
      "query": "Find traffic similar to port scanning",
      "analysis_type": "auto",
      "include_sources": true,
      "max_results": 10,
      "user": "test_user",
      "timestamp": "2023-10-27T10:30:00.123456",
      "conversation_history": [
        {"role": "user", "content": "Hello!"},
        {"role": "assistant", "content": "Hi there! How can I help you today?"}
      ]
    }
    ```
    *   `query` (string, required): The natural language security query.
    *   `analysis_type` (string, optional): `auto`, `semantic`, `graph`, or `hybrid` (default: `auto`).
    *   `include_sources` (boolean, optional): Whether to include source documents in the response (default: `true`).
    *   `max_results` (integer, optional): Max number of source documents to return (default: `10`).
    *   `user` (string, optional): Identifier for the requesting user (default: `anonymous`).
    *   `timestamp` (string, optional): Timestamp of the request.
    *   `conversation_history` (array of objects, optional): Previous messages for context.
*   **Response**:
    ```json
    {
      "result": "Semantic analysis indicates patterns similar to port scanning...",
      "query_type": "SEMANTIC_QUERY",
      "database_used": "milvus",
      "collections_used": ["mistralData"],
      "source_documents": [
        {
          "content": "High volume of connections to different ports on a single host...",
          "metadata": {
            "source": "milvus",
            "collection": "mistralData",
            "query_type": "semantic",
            "data_type": "network_flows"
          },
          "score": 0.95
        }
      ],
      "processing_time": 1.5,
      "error": null,
      "timestamp": "2023-10-27T10:31:00.123456",
      "success": true
    }
    ```

#### `/collections` (GET)

*   **Description**: Lists available Milvus collections and their metadata.
*   **Response**:
    ```json
    {
      "collections": ["mistralData", "honeypotData"],
      "collections_info": {
        "mistralData": {"type": "network_flows", "description": "General network security data"},
        "honeypotData": {"type": "honeypot_logs", "description": "Honeypot attack logs"}
      },
      "total": 2,
      "retriever_type": "multi_collection",
      "timestamp": "2023-10-27T10:32:00.123456"
    }
    ```

#### `/network/graph` (GET)

*   **Description**: Retrieves network graph data for visualization.
*   **Query Parameters**:
    *   `limit` (integer, optional): Maximum number of nodes/links to return (default: `100`).
    *   `ip_address` (string, optional): Filter graph data for a specific IP address.
*   **Response**:
    ```json
    {
      "nodes": [
        {"id": "192.168.1.1", "type": "host", "label": "192.168.1.1", "group": "source_host", "ip": "192.168.1.1", "malicious": false}
      ],
      "links": [
        {"source": "192.168.1.1", "target": "10.0.0.5", "type": "FLOW", "weight": 1}
      ],
      "statistics": {
        "total_nodes": 5,
        "total_links": 10,
        "node_types": {"host": 5},
        "malicious_flows": 2,
        "limit_applied": 100
      },
      "message": null,
      "timestamp": "2023-10-27T10:33:00.123456",
      "success": true
    }
    ```

#### `/network/stats` (GET)

*   **Description**: Retrieves aggregated network statistics with caching.
*   **Response**:
    ```json
    {
      "network_nodes": 1500,
      "active_connections": 75000,
      "data_throughput": "N/A",
      "total_hosts": 1500,
      "total_flows": 12567890,
      "total_protocols": 12,
      "malicious_flows": 15000,
      "top_ports": [
        {"port": 443, "service": "https", "count": 5000000, "percentage": 39.8},
        {"port": 80, "service": "http", "count": 3000000, "percentage": 23.9}
      ],
      "top_protocols": [
        {"protocol": "tcp", "count": 10000000, "percentage": 79.6},
        {"protocol": "udp", "count": 2500000, "percentage": 19.9}
      ],
      "threat_indicators": [
        {"type": "Malicious Flows", "count": 15000, "percentage": 0.1}
      ],
      "timestamp": "2023-10-27T10:34:00.123456",
      "success": true
    }
    ```

#### `/visualization/time-series` (GET)

*   **Description**: Retrieves time-series data for network metrics.
*   **Query Parameters**:
    *   `metric` (string, required): `alerts`, `bandwidth`, `flows`, `threats` (default: `alerts`).
    *   `period` (string, optional): Time period for data (e.g., `24h`, `7d`, `30d`) (default: `24h`).
    *   `granularity` (string, optional): Time interval for data points (e.g., `30m`, `1h`, `6h`, `1d`) (default: `1h`).
    *   `source_ip` (string, optional): Filter data for a specific source IP.
    *   `dest_ip` (string, optional): Filter data for a specific destination IP.
*   **Response**:
    ```json
    {
      "data": [
        {"timestamp": "2023-10-26T10:00:00", "value": 150, "metric": "alerts"},
        {"timestamp": "2023-10-26T11:00:00", "value": 200, "metric": "alerts"}
      ],
      "metric": "alerts",
      "period": "24h",
      "granularity": "1h",
      "total_points": 24,
      "success": true,
      "timestamp": "2023-10-27T10:35:00.123456"
    }
    ```

#### `/visualization/bar-chart` (GET)

*   **Description**: Retrieves data suitable for bar charts.
*   **Query Parameters**:
    *   `chart_type` (string, required): `protocols`, `ports`, `threats`, `countries` (default: `protocols`).
*   **Response**:
    ```json
    {
      "data": [
        {"name": "TCP", "value": 10000000, "percentage": 79.6},
        {"name": "UDP", "value": 2500000, "percentage": 19.9}
      ],
      "chart_type": "protocols",
      "total": 12500000,
      "success": true,
      "timestamp": "2023-10-27T10:36:00.123456"
    }
    ```

#### `/visualization/geolocation` (GET)

*   **Description**: Retrieves geolocation data for IPs with associated threat and flow counts.
*   **Response**:
    ```json
    {
      "locations": [
        {"ip": "1.1.1.1", "country": "USA", "city": "New York", "lat": 40.7128, "lon": -74.0060, "threats": 150, "flows": 10000}
      ],
      "total_ips": 50,
      "total_threats": 750,
      "total_flows": 50000,
      "success": true,
      "timestamp": "2023-10-27T10:37:00.123456"
    }
    ```

#### `/visualization/heatmap` (GET)

*   **Description**: Retrieves data for generating heatmaps.
*   **Query Parameters**:
    *   `heatmap_type` (string, optional): `hourly_activity`, `ip_port_matrix`, `threat_intensity` (default: `hourly_activity`).
*   **Response**:
    ```json
    {
      "data": [
        {"day": "Monday", "day_index": 0, "hour": 10, "value": 500}
      ],
      "heatmap_type": "hourly_activity",
      "success": true,
      "timestamp": "2023-10-27T10:38:00.123456"
    }
    ```

## Dependencies

The project relies on several Python libraries. A `requirements.txt` file should be created to manage these dependencies. Key dependencies include:

*   `langchain`
*   `langchain-community`
*   `langchain-core`
*   `langchain-openai`
*   `langchain-milvus`
*   `langchain-huggingface`
*   `pymilvus`
*   `neo4j`
*   `python-dotenv`
*   `sentence-transformers`
*   `pandas`
*   `fastapi`
*   `uvicorn`
*   `uvloop`
*   `tqdm`
*   `httpx`

```python
# Example requirements.txt structure
# langchain==0.1.0
# langchain-community==0.0.34
# langchain-core==0.1.50
# langchain-openai==0.1.7
# langchain-milvus==0.1.1
# langchain-huggingface==0.2.3
# pymilvus==2.3.0
# neo4j==5.17.0
# python-dotenv==1.0.0
# sentence-transformers==2.7.0
# pandas==2.2.0
# fastapi==0.109.0
# uvicorn[standard]==0.27.0
# uvloop==0.19.0
# tqdm==4.66.2
# httpx==0.27.0
```

## Technologies Used

*   **Python**: Core programming language for backend logic, data processing, and API development.
*   **Langchain**: Orchestrates LLM interactions, chains, and agentic behavior for intelligent query processing.
*   **Milvus**: A scalable vector database for storing and searching embeddings, enabling semantic similarity searches on network data.
    *   *Purpose*: Facilitates fast similarity searches on text-based network event descriptions or flow characteristics.
*   **HuggingFace Embeddings**: Provides pre-trained models (e.g., `all-MiniLM-L6-v2`) to convert text into numerical vector representations (embeddings).
    *   *Purpose*: Generates embeddings for network log data to be stored and queried in Milvus.
*   **Neo4j**: A native graph database used for storing and querying network topology, host/port relationships, and flow metadata.
    *   *Purpose*: Enables complex graph traversals to understand network connections, paths, and identify relationships between entities like hosts, ports, and protocols.
*   **FastAPI**: A modern, high-performance web framework for building the RESTful API that exposes the agent's functionalities.
    *   *Purpose*: Serves as the interface for frontend applications or other services to interact with the security analysis engine.
*   **Uvicorn**: An ASGI server used to run the FastAPI application.
    *   *Purpose*: Hosts the FastAPI application in a production-ready manner.
*   **PyMilvus**: The official Python SDK for interacting with Milvus.
    *   *Purpose*: Manages Milvus connections, collections, and data operations.
*   **Neo4j Python Driver**: The official Python driver for connecting to and querying Neo4j.
    *   *Purpose*: Allows Python applications to interact with the Neo4j graph database.
*   **Sentence-Transformers**: A library that simplifies the process of generating embeddings from text using various pre-trained models.
    *   *Purpose*: Used internally by `langchain-huggingface` for embedding generation.
*   **Pandas**: Used for data manipulation, especially in the Neo4j ingestion scripts for loading enrichment data from CSV/Excel.
    *   *Purpose*: Facilitates reading and processing structured data files for enriching Neo4j nodes.
*   **Dotenv**: Helps manage environment variables, crucial for securely storing API keys and database credentials.
    *   *Purpose*: Loads configuration settings from a `.env` file, simplifying setup.

## Statistical Analysis

The project utilizes statistical analysis through aggregated queries on the Neo4j database to provide insights into network traffic. This includes:

*   **Flow Aggregations**: Counting total flows, active connections, and malicious flows.
*   **Port and Protocol Distribution**: Calculating the percentage distribution of traffic across different ports and protocols.
*   **Geolocation Analysis**: Aggregating threat and flow counts by geographical location (country, city).
*   **Time-Series Analysis**: Summarizing network activity (flows, bandwidth, alerts) over different time granularities.
*   **IP Enrichment**: Utilizing pre-compiled IP dictionaries to categorize IPs (e.g., by organization, country) during data ingestion.

These statistics are exposed via API endpoints (`/network/stats`, `/visualization/*`) to support data-driven security assessments.

## Testing
*   **Integration Tests**: Test the interactions between different components, such as the agent's query routing and database retrieval.
*   **API Tests**: Use tools like `pytest` and `httpx` to test the FastAPI endpoints, verifying request/response formats and data integrity.
*   **Data Ingestion Tests**: Verify that data is correctly ingested into Neo4j and Milvus with accurate embeddings and relationships.

## License

