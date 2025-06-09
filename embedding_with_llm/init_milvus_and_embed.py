from sentence_transformers import SentenceTransformer
from pymilvus import connections, FieldSchema, CollectionSchema, DataType, Collection, utility
import json

connections.connect("default", host="localhost", port="19530")
collection_name = "sbert_embeddings"

if collection_name in utility.list_collections():
    print(f"Collection '{collection_name}' already exists. Skipping embedding.")
else:
    print(f"Collection '{collection_name}' does not exist. Creating and embedding data...")
    # Define schema
    fields = [
        FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
        FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=384),
        FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=2048)
    ]
    schema = CollectionSchema(fields, description="SBERT embeddings collection with text")
    collection = Collection(collection_name, schema)
    model = SentenceTransformer('all-MiniLM-L6-v2')

    # Load logs from JSONL
    logs = []
    with open('flow.20240531100621.json', 'r') as f:
        for line in f:
            if line.strip():
                data = json.loads(line)
                if 'flows' in data:
                    logs.append(data['flows'])

    embeddings = []
    texts = []
    for log in logs:
        log_text = str(log)
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