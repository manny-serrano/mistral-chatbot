from sentence_transformers import SentenceTransformer
from pymilvus import connections, FieldSchema, CollectionSchema, DataType, Collection, utility
import json
import time

print("Starting Milvus connection attempts...")

for attempt in range(60):  # Try for up to 60*2=120 seconds (2 minutes)
    try:
        print(f"Connection attempt {attempt + 1}/60...")
        connections.connect("default", host="standalone", port="19530")
        print("Connected to Milvus!")
        break
    except Exception as e:
        print(f"Milvus not ready (attempt {attempt + 1}): {str(e)}")
        if attempt < 59:  # Don't sleep on the last attempt
            print("Retrying in 2 seconds...")
            time.sleep(2)
else:
    raise RuntimeError("Failed to connect to Milvus after 120 seconds. Check if Milvus service is running properly.")

collection_name = "sbert_embeddings"

print(f"Checking if collection '{collection_name}' exists and has data...")
should_skip_embedding = False

if collection_name in utility.list_collections():
    # Collection exists, now check if it has data and is loaded
    collection = Collection(collection_name)
    try:
        # Load the collection if it's not already loaded
        collection.load()
        
        # Check if collection has data
        num_entities = collection.num_entities
        if num_entities > 0:
            print(f"Collection '{collection_name}' already exists with {num_entities} embeddings. Skipping embedding.")
            should_skip_embedding = True
        else:
            print(f"Collection '{collection_name}' exists but is empty. Proceeding with embedding...")
    except Exception as e:
        print(f"Error checking collection status: {e}")
        print("Proceeding with embedding to ensure collection is properly set up...")
else:
    print(f"Collection '{collection_name}' does not exist. Creating and embedding data...")

if not should_skip_embedding:
    # Create collection if it doesn't exist
    if collection_name not in utility.list_collections():
        print("Creating new collection...")
        # Define schema compatible with LangChain
        fields = [
            FieldSchema(name="pk", dtype=DataType.INT64, is_primary=True, auto_id=True),
            FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=384),
            FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=2048)
        ]
        schema = CollectionSchema(fields, description="SBERT embeddings collection with text")
        collection = Collection(collection_name, schema)
    else:
        # Use existing collection
        collection = Collection(collection_name)
    
    print("Loading sentence transformer model...")
    model = SentenceTransformer('all-MiniLM-L6-v2')

    # Load and process logs in batches to avoid memory issues
    print("Loading data from flow.20240531100621.json...")
    
    EMBEDDING_BATCH_SIZE = 100  # Process embeddings in batches
    INSERT_BATCH_SIZE = 100     # Insert to Milvus in batches
    
    total_inserted = 0
    batch_texts = []
    
    with open('flow.20240531100621.json', 'r') as f:
        for line_num, line in enumerate(f, 1):
            if line.strip():
                data = json.loads(line)
                if 'flows' in data:
                    log_text = str(data['flows'])
                    batch_texts.append(log_text)
                    
                    # Process when batch is full
                    if len(batch_texts) >= EMBEDDING_BATCH_SIZE:
                        print(f"Processing batch of {len(batch_texts)} entries (total processed: {line_num})")
                        
                        # Compute embeddings for the batch
                        batch_embeddings = model.encode(batch_texts)
                        embeddings_list = [emb.tolist() for emb in batch_embeddings]
                        
                        # Insert into Milvus in smaller chunks if needed
                        for i in range(0, len(embeddings_list), INSERT_BATCH_SIZE):
                            chunk_embeddings = embeddings_list[i:i+INSERT_BATCH_SIZE]
                            chunk_texts = batch_texts[i:i+INSERT_BATCH_SIZE]
                            collection.insert([chunk_embeddings, chunk_texts])
                            total_inserted += len(chunk_embeddings)
                            print(f"Inserted {len(chunk_embeddings)} embeddings (total: {total_inserted})")
                        
                        # Clear batch to free memory
                        batch_texts = []
    
    # Process remaining texts if any
    if batch_texts:
        print(f"Processing final batch of {len(batch_texts)} entries")
        batch_embeddings = model.encode(batch_texts)
        embeddings_list = [emb.tolist() for emb in batch_embeddings]
        
        for i in range(0, len(embeddings_list), INSERT_BATCH_SIZE):
            chunk_embeddings = embeddings_list[i:i+INSERT_BATCH_SIZE]
            chunk_texts = batch_texts[i:i+INSERT_BATCH_SIZE]
            collection.insert([chunk_embeddings, chunk_texts])
            total_inserted += len(chunk_embeddings)
            print(f"Inserted {len(chunk_embeddings)} embeddings (total: {total_inserted})")

    if total_inserted > 0:
        print("Creating index...")
        collection.create_index(
            field_name="vector",  # Changed from "embedding" to "vector" for LangChain compatibility
            index_params={"index_type": "IVF_FLAT", "metric_type": "COSINE", "params": {"nlist": 128}}
        )
        print("Loading collection...")
        collection.load()
        print(f"Successfully inserted {total_inserted} embeddings into Milvus collection '{collection_name}'.")
    else:
        print("No embeddings to insert.")

print("Initialization complete!") 