from sentence_transformers import SentenceTransformer
from pymilvus import connections, FieldSchema, CollectionSchema, DataType, Collection, utility
import json
import ast
import time
from datetime import datetime
import glob, os
from tqdm import tqdm

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

# Load embedding model early (needed for schema dim)
print("Loading embedding model optimized for cybersecurity and numerical data...")
model = SentenceTransformer('BAAI/bge-large-en-v1.5')
print("Successfully loaded BAAI/bge-large-en-v1.5 - excellent for technical content and numbers!")

# --- Step 1 – collection creation / selection ---
existing_collections = utility.list_collections()
if existing_collections:
    print(f"Existing collections: {', '.join(existing_collections)}")
else:
    print("No existing collections found.")

# Ask whether the user wants to create a new collection first
create_new_input = input("Would you like to create a new collection? (y/N): ").strip().lower()

if create_new_input == "y":
    collection_name = input("Enter a name for the new collection: ").strip()
    if not collection_name:
        print("Collection name cannot be empty. Exiting.")
        exit(1)
    print(f"A new collection named '{collection_name}' will be created (if it does not already exist).")
else:
    collection_name = input("Enter the name of the collection you would like to embed the file into: ").strip()
    if not collection_name:
        print("Collection name cannot be empty. Exiting.")
        exit(1)

# If a new collection was just defined, optionally let the user override where to embed
if create_new_input == "y":
    embed_target = input(f"Enter the name of the collection you would like to embed the file into (default: {collection_name}): ").strip()
    if embed_target:
        collection_name = embed_target

# Pause before moving on to file selection
input("Press Enter to continue to file selection…")

if True:
    # Create collection if it doesn't exist
    if collection_name not in utility.list_collections():
        print("Creating new collection...")
        # Define schema compatible with LangChain – vector dim equals embedding size
        emb_dim = model.get_sentence_embedding_dimension()
        fields = [
            FieldSchema(name="pk", dtype=DataType.INT64, is_primary=True, auto_id=True),
            FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=emb_dim),
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

    # Ask the user which kind of log is being embedded so we can pick the right
    # sentence-extraction routine.
    data_type_in = input("What type of data are you embedding? Enter 'honeypot' or 'flow' (default: flow): ").strip().lower()
    data_type = data_type_in if data_type_in in {"honeypot", "flow"} else "flow"
    print(f"Embedding as {data_type} data…")

    # For each file, we will first check whether any embeddings with this source_file already exist.

    # OPTIMIZED BATCH CONFIGURATION
    # Based on benchmark results: optimized for your specific system
    EMBEDDING_BATCH_SIZE = 256     # Optimal batch size for maximum performance (40% faster than 64)
    EMBEDDING_INTERNAL_BATCH = 32  # Internal batch size for model.encode()
    INSERT_BATCH_SIZE = 100        # Keep same for Milvus insertion
    
    print(f"Using optimized batch processing:")
    print(f"  - Embedding batch size: {EMBEDDING_BATCH_SIZE}")
    print(f"  - Model internal batch size: {EMBEDDING_INTERNAL_BATCH}")
    print(f"  - Milvus insert batch size: {INSERT_BATCH_SIZE}")

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

    # Helper to convert a honeypot log entry into a readable sentence
    def honeypot_to_sentence(evt: dict) -> str:
        """Convert a STINGAR honeypot event dictionary to a sentence suitable for embedding."""
        app = evt.get("app", "unknown_app")
        protocol = evt.get("protocol", "unknown_proto")
        sensor_host = evt.get("sensor", {}).get("hostname", "unknown_sensor")
        src_ip, src_port = evt.get("src_ip", "?"), evt.get("src_port", "?")
        dst_ip, dst_port = evt.get("dst_ip", "?"), evt.get("dst_port", "?")

        # Attempt to derive an event description
        hp_data = evt.get("hp_data", {}) or {}
        event_desc = (
            hp_data.get("event_type") or
            hp_data.get("con_type") or
            hp_data.get("mqtt_action") or
            "activity"
        )

        ts = evt.get("start_time") or evt.get("@timestamp") or evt.get("end_time") or "unknown_time"

        return (
            f"Honeypot {app} on {sensor_host} observed {event_desc} using {protocol} "
            f"from {src_ip}:{src_port} to {dst_ip}:{dst_port} at {ts}."
        )

    # Generic parser that tolerates both strict JSON and Python-literal style dicts (such as STINGAR samples)
    def parse_event_line(line_str: str):
        """Parse a single-line JSON or Python-dict string into a dictionary.

        Returns None if the line cannot be parsed."""
        try:
            return json.loads(line_str)
        except json.JSONDecodeError:
            try:
                return ast.literal_eval(line_str)
            except Exception:
                print(f"Warning: could not parse line -> skipping: {line_str[:80]}…")
                return None

    # OPTIMIZED BATCH PROCESSING FUNCTION
    def process_batch_optimized(texts_batch, filename):
        """Process a batch of texts with optimal performance."""
        if not texts_batch:
            return 0
        
        start_time = time.time()
        
        # Use optimized batch processing with internal batch size
        batch_embeddings = model.encode(
            texts_batch, 
            batch_size=EMBEDDING_INTERNAL_BATCH,  # OPTIMIZATION: Internal batching
            show_progress_bar=False,              # We have our own progress bar
            convert_to_numpy=True                 # Slight performance gain
        )
        
        embedding_time = time.time() - start_time
        
        # Convert to list format for Milvus
        embeddings_list = [emb.tolist() for emb in batch_embeddings]
        src_list = [filename] * len(embeddings_list)
        
        # Insert in chunks to Milvus
        inserted_count = 0
        for i in range(0, len(embeddings_list), INSERT_BATCH_SIZE):
            chunk_embeddings = embeddings_list[i:i+INSERT_BATCH_SIZE]
            chunk_texts = texts_batch[i:i+INSERT_BATCH_SIZE]
            chunk_src = src_list[i:i+INSERT_BATCH_SIZE]
            collection.insert([chunk_embeddings, chunk_texts, chunk_src])
            inserted_count += len(chunk_embeddings)
        
        # Performance reporting
        texts_per_sec = len(texts_batch) / embedding_time
        print(f"    Processed {len(texts_batch)} texts in {embedding_time:.2f}s ({texts_per_sec:.1f} texts/sec)")
        
        return inserted_count

    # Process files with progress tracking
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

        # First pass: count total lines for progress bar
        total_lines = 0
        with open(filename, 'r') as f:
            for line in f:
                if line.strip():
                    total_lines += 1
        
        print(f"Total lines to process: {total_lines}")
        
        batch_texts = []
        processed_lines = 0
        
        # Second pass: process with progress bar
        with open(filename, 'r') as f:
            with tqdm(total=total_lines, desc="Processing", unit=" lines") as pbar:
                for line_num, line in enumerate(f, 1):
                    if line.strip():
                        data = parse_event_line(line)
                        if data is None:
                            pbar.update(1)
                            continue
                            
                        log_text = None
                        if data_type == "flow":
                            if 'flows' in data:
                                log_text = flow_to_sentence(data['flows'])
                        else:  # honeypot mode
                            log_text = honeypot_to_sentence(data)

                        if log_text:
                            batch_texts.append(log_text)

                        processed_lines += 1
                        pbar.update(1)

                        # OPTIMIZED: Process batch when threshold reached
                        if len(batch_texts) >= EMBEDDING_BATCH_SIZE:
                            inserted = process_batch_optimized(batch_texts, filename)
                            total_inserted += inserted
                            batch_texts = []

        # Process remaining records for this file
        if batch_texts:
            print(f"Processing final batch of {len(batch_texts)} texts...")
            inserted = process_batch_optimized(batch_texts, filename)
            total_inserted += inserted

        print(f"Finished {filename}. Total embeddings inserted: {total_inserted}")

    if total_inserted > 0:
        print("\nCreating index...")
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