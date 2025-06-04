from sentence_transformers import SentenceTransformer
import numpy as np
import json
from pymilvus import connections, FieldSchema, CollectionSchema, DataType, Collection, utility

# 1. Connect to Milvus
connections.connect("default", host="localhost", port="19530")

# Drop the collection if it exists
collection_name = "sbert_embeddings"
if collection_name in utility.list_collections():
    collection = Collection(collection_name)
    collection.drop()
    print(f"Dropped existing collection '{collection_name}'.")

# 2. Define collection schema (384-dim for MiniLM)
fields = [
    FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
    FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=384),
    FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=2048)
]
schema = CollectionSchema(fields, description="SBERT embeddings collection with text")
collection = Collection(collection_name, schema)

# 3. Load SBERT model
model = SentenceTransformer('all-MiniLM-L6-v2')

def log_to_string(log: dict) -> str:
    return (
        f"From {log.get('sourceIPv4Address')}:{log.get('sourceTransportPort', 'N/A')} "
        f"to {log.get('destinationIPv4Address')}:{log.get('destinationTransportPort', 'N/A')}, "
        f"protocol {log.get('protocolIdentifier')}, "
        f"packets sent: {log.get('packetTotalCount')}, octets sent: {log.get('octetTotalCount')}. "
        f"Reverse packets: {log.get('reversePacketTotalCount', 'N/A')}, "
        f"reverse octets: {log.get('reverseOctetTotalCount', 'N/A')}. "
        f"Flow duration: {log.get('flowDurationMilliseconds', 'N/A')} ms, "
        f"start: {log.get('flowStartMilliseconds', 'N/A')}, end: {log.get('flowEndMilliseconds', 'N/A')}. "
        f"TCP flags: {log.get('initialTCPFlags', 'N/A')}/{log.get('unionTCPFlags', 'N/A')}, "
        f"reverse TCP flags: {log.get('reverseInitialTCPFlags', 'N/A')}/{log.get('reverseUnionTCPFlags', 'N/A')}. "
        f"Flow end reason: {log.get('flowEndReason', 'N/A')}, "
        f"observation domain: {log.get('observationDomainId', 'N/A')}."
    )

def load_logs_from_jsonl(filepath):
    logs = []
    with open(filepath, 'r') as f:
        for line in f:
            if line.strip():
                data = json.loads(line)
                if 'flows' in data:
                    logs.append(data['flows'])
    return logs

# Load logs
logs = load_logs_from_jsonl('flow.20240531100621.json')

# Generate embeddings and insert into Milvus in batches, including text
embeddings = []
texts = []
for log in logs:
    log_text = log_to_string(log)
    embedding = model.encode(log_text)
    embeddings.append(embedding.tolist())
    texts.append(log_text)

BATCH_SIZE = 100
for i in range(0, len(embeddings), BATCH_SIZE):
    batch_embeddings = embeddings[i:i+BATCH_SIZE]
    batch_texts = texts[i:i+BATCH_SIZE]
    collection.insert([batch_embeddings, batch_texts])
    print(f"Inserted batch {i//BATCH_SIZE + 1}")

if embeddings:
    collection.create_index(
        field_name="embedding",
        index_params={"index_type": "IVF_FLAT", "metric_type": "COSINE", "params": {"nlist": 128}}
    )
    collection.load()
    print(f"Inserted {len(embeddings)} embeddings into Milvus collection '{collection_name}'.")
else:
    print("No embeddings to insert.")