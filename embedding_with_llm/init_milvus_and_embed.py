from sentence_transformers import SentenceTransformer
from pymilvus import connections, FieldSchema, CollectionSchema, DataType, Collection, utility
import json
import time
from datetime import datetime
import glob, os

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
            FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=2048),
            FieldSchema(name="source_file", dtype=DataType.VARCHAR, max_length=512)
        ]
        schema = CollectionSchema(fields, description="SBERT embeddings collection with text")
        collection = Collection(collection_name, schema)
    else:
        # Use existing collection
        collection = Collection(collection_name)
    
    # Determine whether this is a freshly-created collection (no data yet)
    is_new_collection = collection.num_entities == 0

    # If it already contains data we must load it so queries don't fail with
    # "collection not loaded" (Milvus error code 101).
    if not is_new_collection:
        try:
            collection.load()
        except Exception as e:
            # If loading fails (e.g. index missing) we'll continue, queries will
            # be skipped and data re-inserted.
            print(f"Warning: could not load collection: {e}")

    print("Loading sentence transformer model...")
    model = SentenceTransformer('all-MiniLM-L6-v2')

    # --- Determine which files to embed ---
    env_pattern = os.getenv("FLOW_LOG_PATTERN")
    if env_pattern:
        FILE_GLOB = env_pattern
    else:
        # Interactive prompt – let user type a filename or glob
        user_in = input("Enter the filename or glob pattern of JSON flow logs to embed (default: *.json): ").strip()
        FILE_GLOB = user_in or "*.json"

    files_to_process = sorted(glob.glob(FILE_GLOB))

    if not files_to_process:
        print(f"No files match pattern '{FILE_GLOB}'. Nothing to embed.")
        exit(0)

    print(f"Found {len(files_to_process)} file(s) matching pattern '{FILE_GLOB}'.\n")

    # For each file, we will first check whether any embeddings with this source_file already exist.

    EMBEDDING_BATCH_SIZE = 100  # Process embeddings in batches
    INSERT_BATCH_SIZE = 100     # Insert to Milvus in batches

    total_inserted = 0

    # Helper to convert a single flow record into a natural-language sentence
    def flow_to_sentence(flow: dict) -> str:
        """Convert a YAF/Zeek flow dictionary to a readable sentence for embedding."""
        protocol_map = {6: "TCP", 17: "UDP", 1: "ICMP"}
        src_ip = flow.get("sourceIPv4Address") or flow.get("id.orig_h") or "unknown"
        dst_ip = flow.get("destinationIPv4Address") or flow.get("id.resp_h") or "unknown"
        src_port = flow.get("sourceTransportPort") or flow.get("id.orig_p") or "?"
        dst_port = flow.get("destinationTransportPort") or flow.get("id.resp_p") or "?"
        proto = protocol_map.get(flow.get("protocolIdentifier"), flow.get("proto", "?"))
        # Timestamp handling
        ts_raw = flow.get("flowStartMilliseconds") or flow.get("ts")
        if ts_raw is not None:
            try:
                ts_readable = datetime.fromtimestamp(int(ts_raw) / 1000).isoformat()
            except Exception:
                ts_readable = str(ts_raw)
        else:
            ts_readable = "unknown_time"
        bytes_total = flow.get("octetTotalCount", "?")
        packets_total = flow.get("packetTotalCount", "?")

        return (
            f"Flow from {src_ip}:{src_port} to {dst_ip}:{dst_port} "
            f"using {proto} at {ts_readable}. "
            f"Bytes: {bytes_total}, Packets: {packets_total}."
        )

    for filename in files_to_process:
        print(f"\nProcessing file: {filename}")

        # Skip querying on a brand-new (empty) collection. For existing ones,
        # check whether this file was already embedded.
        if not is_new_collection:
            try:
                already = collection.query(expr=f"source_file == \"{filename}\"", output_fields=["pk"], limit=1)
                if already:
                    print(" – already embedded. Skipping.")
                    continue
            except Exception as e:
                # If the field does not exist in an older collection schema or the
                # collection isn't loaded, just warn and continue embedding.
                print("Warning: could not query by source_file; proceeding anyway.")
                print(str(e))

        batch_texts = []

        with open(filename, 'r') as f:
            for line_num, line in enumerate(f, 1):
                if line.strip():
                    data = json.loads(line)
                    if 'flows' in data:
                        log_text = flow_to_sentence(data['flows'])
                        batch_texts.append(log_text)

                        if len(batch_texts) >= EMBEDDING_BATCH_SIZE:
                            # Compute embeddings for the batch
                            batch_embeddings = model.encode(batch_texts)
                            embeddings_list = [emb.tolist() for emb in batch_embeddings]

                            # Also build source_file list
                            src_list = [filename] * len(embeddings_list)

                            for i in range(0, len(embeddings_list), INSERT_BATCH_SIZE):
                                chunk_embeddings = embeddings_list[i:i+INSERT_BATCH_SIZE]
                                chunk_texts = batch_texts[i:i+INSERT_BATCH_SIZE]
                                chunk_src = src_list[i:i+INSERT_BATCH_SIZE]
                                collection.insert([chunk_embeddings, chunk_texts, chunk_src])
                                total_inserted += len(chunk_embeddings)
                            batch_texts = []

        # Process remaining records for this file
        if batch_texts:
            batch_embeddings = model.encode(batch_texts)
            embeddings_list = [emb.tolist() for emb in batch_embeddings]
            src_list = [filename] * len(embeddings_list)
            for i in range(0, len(embeddings_list), INSERT_BATCH_SIZE):
                chunk_embeddings = embeddings_list[i:i+INSERT_BATCH_SIZE]
                chunk_texts = batch_texts[i:i+INSERT_BATCH_SIZE]
                chunk_src = src_list[i:i+INSERT_BATCH_SIZE]
                collection.insert([chunk_embeddings, chunk_texts, chunk_src])
                total_inserted += len(chunk_embeddings)

        print(f"Finished {filename}. New embeddings inserted so far: {total_inserted}")

    if total_inserted > 0:
        print("Creating index...")
        collection.create_index(
            field_name="vector",
            index_params={"index_type": "IVF_FLAT", "metric_type": "COSINE", "params": {"nlist": 128}}
        )
        print("Loading collection...")
        collection.load()
        print(f"Successfully inserted {total_inserted} embeddings into Milvus collection '{collection_name}'.")
    else:
        print("No embeddings to insert.")

print("Initialization complete!") 