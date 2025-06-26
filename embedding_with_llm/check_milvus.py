#!/usr/bin/env python3
"""check_milvus.py — Inspect Milvus collections and their contents

Works with both Docker and local setups:
- From host machine: uses localhost:19530
- From within container: uses milvus:19530 
- Custom connection via environment variables

Usage:
    python check_milvus.py
    MILVUS_HOST=custom_host python check_milvus.py
"""

import os
from pymilvus import connections, utility, Collection

# Get connection parameters from environment or use defaults
milvus_host = os.getenv("MILVUS_HOST", "localhost")
milvus_port = int(os.getenv("MILVUS_PORT", "19530"))

print(f"Connecting to Milvus at {milvus_host}:{milvus_port}...")

try:
    # Connect to Milvus
    connections.connect("default", host=milvus_host, port=milvus_port)
    print("✅ Connected successfully!")
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print("\nTroubleshooting:")
    print("- If running from host: ensure Docker services are up")
    print("- If running in container: use MILVUS_HOST=milvus")
    print("- Check if Milvus service is healthy: docker-compose ps")
    exit(1)

# List all collections and show to the user
collections = utility.list_collections()

if not collections:
    print("\nNo collections found in Milvus instance.")
    print("💡 Tip: Run init_milvus_and_embed.py to create and populate collections")
    exit(0)

print(f"\nFound {len(collections)} collection(s):")
for idx, col in enumerate(collections, 1):
    print(f"  {idx}. {col}")

# Special handling for the new predefined collections
if "mistralData" in collections:
    print("   ↳ mistralData: Contains general network security data")
if "honeypotData" in collections:
    print("   ↳ honeypotData: Contains honeypot attack logs")

# Ask user which collection to inspect
user_in = input("\nEnter the name (or number) of the collection to inspect: ").strip()

if user_in.isdigit():
    sel_idx = int(user_in) - 1
    if 0 <= sel_idx < len(collections):
        collection_name = collections[sel_idx]
    else:
        print("Invalid selection index.")
        exit(1)
else:
    collection_name = user_in

if collection_name not in collections:
    print(f"Collection '{collection_name}' does not exist.")
    exit(1)

collection = Collection(collection_name)

# Load collection to ensure we can query it
try:
    collection.load()
    print(f"✅ Collection '{collection_name}' loaded successfully")
except Exception as e:
    print(f"⚠️ Warning: Could not load collection: {e}")

# Print schema and stats
print(f"\n{'='*50}")
print(f"COLLECTION: {collection_name}")
print(f"{'='*50}")

print("\n📋 Schema:")
for field in collection.schema.fields:
    dim_info = f"(dim={field.params.get('dim', 'N/A')})" if field.dtype.name == 'FLOAT_VECTOR' else ''
    print(f"  • {field.name}: {field.dtype} {dim_info}")

print(f"\n📊 Statistics:")
print(f"  • Number of entities: {collection.num_entities:,}")

if collection.num_entities > 0:
    try:
        # Show first 5 embeddings with more details
        results = collection.query(
            expr="", 
            output_fields=["pk", "text", "source_file"], 
            limit=5
        )
        
        print(f"\n📄 Sample Data (first 5 entities):")
        for i, res in enumerate(results, 1):
            print(f"\n  {i}. PK: {res['pk']}")
            text_preview = res.get('text', 'N/A')[:100] + ("..." if len(res.get('text', '')) > 100 else "")
            print(f"     Text: {text_preview}")
            print(f"     Source: {res.get('source_file', 'N/A')}")
            
        # Show vector dimensions for the first record
        vector_results = collection.query(expr="", output_fields=["vector"], limit=1)
        if vector_results:
            vec = vector_results[0]["vector"]
            print(f"\n🔢 Vector Info:")
            print(f"  • Dimensions: {len(vec)}")
            print(f"  • Sample values: [{', '.join(f'{x:.3f}' for x in vec[:5])}...]")
            
    except Exception as e:
        print(f"⚠️ Could not retrieve sample data: {e}")

# Show index information
try:
    indexes = collection.indexes
    if indexes:
        print(f"\n🔍 Indexes:")
        for idx in indexes:
            print(f"  • Field: {idx.field_name}")
            print(f"    Type: {idx.params.get('index_type', 'Unknown')}")
            print(f"    Metric: {idx.params.get('metric_type', 'Unknown')}")
    else:
        print(f"\n⚠️ No indexes found (queries may be slow)")
except Exception as e:
    print(f"⚠️ Could not retrieve index information: {e}")

print(f"\n{'='*50}")
print("🎯 Next steps:")
print("  • Query this collection using the security agent")
print("  • Add more data with init_milvus_and_embed.py")
print("  • Clear data with clear_milvus.py")
print("="*50)
    