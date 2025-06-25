# Mistral Security Analysis - Complete Setup Guide

Welcome to the Mistral Network Security Analysis platform! This guide provides step-by-step instructions to get your security analysis system running with OpenWebUI.

## System Architecture

- **Neo4j**: Graph database for network relationships
- **Milvus**: Vector database for semantic similarity search  
- **OpenWebUI**: Web interface for security analysis
- **API Server**: FastAPI backend connecting databases to UI
- **Intelligent Agent**: AI-powered security analysis engine

## 1. Start the Stack

Start all services using Docker Compose:
./docker-start.sh

**Services Started:**
- Neo4j Graph Database (port 7474, 7687)
- Milvus Vector Database (port 19530, 9091)  
- OpenWebUI Interface (port 3000)
- API Server (port 8000)
- Supporting services (etcd, minio)

**Verify Services:**
docker-compose ps
All containers should show "Up" status.

## 2. Get OpenWebUI API Key

### Step 2.1: Access OpenWebUI
Open your browser and go to: **http://localhost:3000**

### Step 2.2: Create Admin Account
- Click "Sign up" 
- Create your admin account (first user becomes admin)
- Log in with your new account

### Step 2.3: Generate API Key
1. Click on your profile icon (top right)
2. Go to **Settings** → **Account**
3. Scroll down to **API Keys** section
4. Click **Generate API Key**
5. Copy the generated key (starts with `sk-`)

### Step 2.4: Export API Key
Set the API key as an environment variable:
export OPENWEBUI_API_KEY='sk-your-api-key-here'
**Important:** Replace `sk-your-api-key-here` with your actual API key.

## 3. Populate Neo4j Graph Database

### Step 3.1: Enter Container

docker-compose exec mistral-app bash

### Step 3.2: Insert Network Data
cd /app/neo4j-graphdatabase && python insert_logs.py

**What this does:**
- Loads network connection logs into Neo4j
- Creates nodes for IPs, ports, protocols
- Establishes relationships between network entities
- Indexes data for fast graph queries

**Expected Output:**

Loading network logs...
Creating IP nodes...
Creating connection relationships...
Neo4j population complete!

## 4. Embed Data in Milvus

### Step 4.1: Initialize Vector Database

cd /app/embedding_with_llm && python init_milvus_and_embed.py

**What this does:**
- Creates Milvus collections for security data
- Generates vector embeddings for network flows
- Embeds honeypot attack data
- Sets up semantic similarity search

**Expected Output:**

Initializing Milvus collections...
Embedding network flow data...
Embedding honeypot data...
Milvus embedding complete!


---

## 5. Upload Security Agent Function

### Step 5.1: Upload to OpenWebUI

cd /app && python upload_function.py


**What this does:**
- Uploads the Mistral Security Agent function to OpenWebUI
- Activates the function for security analysis
- Enables intelligent query routing

**Expected Output:**

SUCCESS: Function uploaded successfully!
The Mistral Security Agent is now active in OpenWebUI


---

## 6. Start Using the System

### Step 6.1: Access the Interface
Open **http://localhost:3000** in your browser

### Step 6.2: Select Security Agent
- Start a new chat
- In the model dropdown, select **"Mistral Security Agent"**

### Step 6.3: Ask Security Questions

Try these example queries:

**Database Statistics:**
How many IP addresses are in the graph database?
How many nodes are in Neo4j?
What collections are available in Milvus?


**Security Analysis:**
Show me suspicious network patterns
Find traffic similar to port scanning
What honeypot attack data do you have?
Analyze connections to external IPs

**Network Investigation:**
Show me all connections from IP 192.168.1.100
Find the network path between two hosts
Display communication patterns for external IPs

**Your Mistral Security Analysis system is now ready for intelligent network security investigation!** 