#!/usr/bin/env python3
"""
Milvus Embedding and Initialization Script
Optimized for network security data with enhanced error handling and logging.
"""

import os
import sys
import time
import json
import ast
import glob
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from sentence_transformers import SentenceTransformer
from pymilvus import connections, FieldSchema, CollectionSchema, DataType, Collection, utility
from tqdm import tqdm

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class Config:
    """Configuration management for the embedding script."""
    
    def __init__(self):
        self.milvus_host = os.getenv("MILVUS_HOST", "localhost")
        self.milvus_port = int(os.getenv("MILVUS_PORT", "19530"))
        self.model_name = os.getenv("EMB_MODEL", "all-MiniLM-L6-v2")
        self.file_pattern = os.getenv("FLOW_LOG_PATTERN")
        self.max_retries = int(os.getenv("MILVUS_MAX_RETRIES", "60"))
        self.retry_delay = int(os.getenv("MILVUS_RETRY_DELAY", "2"))
        
        # Batch processing configuration (optimized for smaller model)
        self.embedding_batch_size = int(os.getenv("EMBEDDING_BATCH_SIZE", "512"))
        self.embedding_internal_batch = int(os.getenv("EMBEDDING_INTERNAL_BATCH", "64"))
        self.insert_batch_size = int(os.getenv("INSERT_BATCH_SIZE", "100"))
        
        # Space optimization settings
        self.model_cache_dir = os.getenv("MODEL_CACHE_DIR", "/srv/homedir/mistral-app/model-cache")
        self.low_memory_mode = os.getenv("LOW_MEMORY_MODE", "true").lower() == "true"
        self.use_network_storage = os.path.exists("/srv/homedir") and os.access("/srv/homedir", os.W_OK)
        
        # Vector configuration (explicit for Docker deployment)
        self.expected_dimensions = int(os.getenv("VECTOR_DIMENSIONS", "384"))
        self.model_size_optimized = os.getenv("MODEL_SIZE_OPTIMIZED", "true").lower() == "true"
        self.index_type = os.getenv("MILVUS_INDEX_TYPE", "IVF_FLAT")
        self.metric_type = os.getenv("MILVUS_METRIC_TYPE", "COSINE")
        
        # Validate configuration
        if self.milvus_port < 1 or self.milvus_port > 65535:
            raise ValueError(f"Invalid Milvus port: {self.milvus_port}")
        
        if self.embedding_batch_size < 1 or self.embedding_batch_size > 1000:
            logger.warning(f"Embedding batch size {self.embedding_batch_size} may not be optimal")
        
        logger.info(f"Configuration - Host: {self.milvus_host}:{self.milvus_port}, Model: {self.model_name}")
        logger.info(f"Batch sizes - Embedding: {self.embedding_batch_size}, Internal: {self.embedding_internal_batch}, Insert: {self.insert_batch_size}")

class MilvusEmbedder:
    """Enhanced Milvus embedding manager with proper error handling."""
    
    def __init__(self, config: Config):
        self.config = config
        self.model = None
        self.collection = None
        self.is_new_collection = False
        
    def initialize(self):
        """Initialize connections and model."""
        self._connect_to_milvus()
        self._load_embedding_model()
    
    def _connect_to_milvus(self):
        """Connect to Milvus with retry logic."""
        logger.info(f"Connecting to Milvus at {self.config.milvus_host}:{self.config.milvus_port}")
        
        for attempt in range(self.config.max_retries):
            try:
                connections.connect("default", host=self.config.milvus_host, port=self.config.milvus_port)
                logger.info("Successfully connected to Milvus!")
                return
            except Exception as e:
                logger.warning(f"Connection attempt {attempt + 1}/{self.config.max_retries} failed: {e}")
                if attempt < self.config.max_retries - 1:
                    time.sleep(self.config.retry_delay)
        
        raise RuntimeError(f"Failed to connect to Milvus after {self.config.max_retries * self.config.retry_delay} seconds")
    
    def _load_embedding_model(self):
        """Load the sentence transformer model with optimization."""
        try:
            logger.info(f"Loading optimized embedding model: {self.config.model_name}")
            
            # Use network storage cache if available
            cache_dir = None
            if self.config.use_network_storage:
                cache_dir = f"{self.config.model_cache_dir}/sentence-transformers"
                os.makedirs(cache_dir, exist_ok=True)
                logger.info(f"Using network storage cache: {cache_dir}")
            
            # Load model with optimizations
            if self.config.low_memory_mode:
                logger.info("Loading model in low memory mode")
                self.model = SentenceTransformer(
                    self.config.model_name,
                    cache_folder=cache_dir,
                    device='cpu'
                )
            else:
                self.model = SentenceTransformer(self.config.model_name, cache_folder=cache_dir)
            
            dimensions = self.model.get_sentence_embedding_dimension()
            logger.info(f"Successfully loaded model with {dimensions} dimensions")
            logger.info(f"Space optimization - Network storage: {self.config.use_network_storage}, Low memory: {self.config.low_memory_mode}")
            
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
    
    def select_collection(self) -> str:
        """Interactive collection selection with validation."""
        existing_collections = utility.list_collections()
        if existing_collections:
            logger.info(f"Existing collections: {', '.join(existing_collections)}")
        else:
            logger.info("No existing collections found")
        
        print("\nAvailable collection options:")
        print("1. mistralData (General network security data)")
        print("2. honeypotData (Honeypot attack logs)")
        
        while True:
            choice = input("Select collection (1 or 2): ").strip()
            if choice == "1":
                return "mistralData"
            elif choice == "2":
                return "honeypotData"
            else:
                print("Invalid choice. Please enter 1 or 2.")
    
    def setup_collection(self, collection_name: str):
        """Set up the collection with proper schema."""
        if collection_name not in utility.list_collections():
            logger.info("Creating new collection...")
            self._create_collection(collection_name)
            self.is_new_collection = True
        else:
            logger.info(f"Using existing collection: {collection_name}")
            self.collection = Collection(collection_name)
            self.is_new_collection = self.collection.num_entities == 0
        
        # Load collection if it has data
        if not self.is_new_collection:
            try:
                self.collection.load()
                logger.info(f"Collection loaded with {self.collection.num_entities:,} entities")
            except Exception as e:
                logger.warning(f"Could not load collection: {e}")
    
    def _create_collection(self, collection_name: str):
        """Create a new collection with optimized schema and migration support."""
        try:
            emb_dim = self.model.get_sentence_embedding_dimension()
            
            # Validate dimensions match expected configuration
            if emb_dim != self.config.expected_dimensions:
                logger.warning(f"⚠️  DIMENSION MISMATCH:")
                logger.warning(f"   Expected: {self.config.expected_dimensions}D (from config)")
                logger.warning(f"   Actual: {emb_dim}D (from model {self.config.model_name})")
                logger.warning(f"   Using actual model dimensions: {emb_dim}D")
            
            # Check for dimension compatibility with existing collections
            existing_collections = utility.list_collections()
            dimension_conflicts = []
            
            if existing_collections:
                logger.info(f"Found existing collections: {', '.join(existing_collections)}")
                for existing_name in existing_collections:
                    if existing_name != collection_name:
                        try:
                            existing_col = Collection(existing_name)
                            existing_col.load()
                            # Try to detect dimension conflicts
                            logger.info(f"✓ Existing collection '{existing_name}' detected")
                            existing_col.release()
                        except Exception as e:
                            logger.debug(f"Could not check collection '{existing_name}': {e}")
                
                if self.config.model_size_optimized:
                    logger.warning(f"🔄 MODEL OPTIMIZATION ACTIVE:")
                    logger.warning(f"   New model: {self.config.model_name} ({emb_dim}D)")
                    logger.warning(f"   Previous models likely used different dimensions (e.g., 1024D)")
                    logger.warning(f"   🚨 MIGRATION REQUIRED if switching from larger models")
                    logger.warning(f"   💡 Consider creating new collection name: '{collection_name}_384d' or '{collection_name}_optimized'")
                    logger.warning(f"   💡 Or drop existing collections: `collection.drop()` in Python")
            
            fields = [
                FieldSchema(name="pk", dtype=DataType.INT64, is_primary=True, auto_id=True),
                FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=emb_dim),
                FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=2048),
                FieldSchema(name="source_file", dtype=DataType.VARCHAR, max_length=512)
            ]
            
            schema = CollectionSchema(
                fields, 
                description=f"Network security embeddings ({emb_dim}D, {self.config.model_name})"
            )
            self.collection = Collection(collection_name, schema)
            
            # Create optimized index using configured parameters
            if self.config.model_size_optimized and emb_dim <= 512:
                # Optimized settings for smaller models
                index_params = {
                    "index_type": self.config.index_type,
                    "metric_type": self.config.metric_type,
                    "params": {"nlist": 512}  # Smaller nlist for 384D vectors
                }
                logger.info(f"🎯 Using optimized index for small model ({emb_dim}D)")
            else:
                # Standard settings for larger models
                index_params = {
                    "index_type": self.config.index_type,
                    "metric_type": "L2" if emb_dim > 512 else self.config.metric_type,
                    "params": {"nlist": 1024 if emb_dim > 512 else 512}
                }
                logger.info(f"📊 Using standard index for large model ({emb_dim}D)")
            
            self.collection.create_index("vector", index_params)
            
            logger.info(f"✅ Created collection '{collection_name}' with {emb_dim}D vectors")
            logger.info(f"📊 Index: {index_params['index_type']} | Metric: {index_params['metric_type']}")
            logger.info(f"🤖 Model: {self.config.model_name}")
            
        except Exception as e:
            logger.error(f"Failed to create collection: {e}")
            raise
    
    def get_files_to_process(self) -> List[str]:
        """Get and validate files to process with interactive selection."""
        
        # Show available options first
        print("\n" + "="*60)
        print("📁 AVAILABLE DATA FILES:")
        print("="*60)
        
        print("\n🔄 Flow Data Files (Samples_flow/):")
        flow_files = sorted(glob.glob("Samples_flow/*.json"))
        for i, f in enumerate(flow_files, 1):
            size = os.path.getsize(f) / (1024*1024)  # MB
            print(f"  {i}. {f} ({size:.1f}MB)")
        
        print("\n🚨 Suspicious Data Files (Suspicious_DATA/):")
        suspicious_files = sorted(glob.glob("Suspicious_DATA/**/*.json", recursive=True))
        for i, f in enumerate(suspicious_files, 1):
            size = os.path.getsize(f) / 1024  # KB
            print(f"  {i}. {f} ({size:.1f}KB)")
        
        print("\n📊 Other JSON Files (current directory):")
        other_files = [f for f in sorted(glob.glob("*.json")) if not f.startswith("Samples_flow") and not f.startswith("Suspicious_DATA")]
        for i, f in enumerate(other_files, 1):
            size = os.path.getsize(f) / 1024  # KB
            print(f"  {i}. {f} ({size:.1f}KB)")
        
        print("\n" + "="*60)
        print("📝 FILE SELECTION OPTIONS:")
        print("  • Enter a specific file path (e.g., Samples_flow/flow.20240531080616.json)")
        print("  • Enter a glob pattern (e.g., Samples_flow/*.json)")
        print("  • Press Enter for default: *.json (all JSON files)")
        print("="*60)
        
        file_pattern = input("\n🔍 Enter your choice: ").strip() or "*.json"
        
        files = sorted(glob.glob(file_pattern))
        
        if not files:
            raise ValueError(f"No files match pattern '{file_pattern}'")
        
        print(f"\n✅ Selected {len(files)} file(s) matching pattern '{file_pattern}'")
        for f in files:
            size = os.path.getsize(f) / (1024*1024)  # MB
            print(f"  📄 {f} ({size:.1f}MB)")
        
        logger.info(f"Found {len(files)} file(s) matching pattern '{file_pattern}'")
        return files
    
    def get_data_type(self) -> str:
        """Get the data type for processing."""
        data_type = input("Data type - 'honeypot' or 'flow' (default: flow): ").strip().lower()
        return data_type if data_type in {"honeypot", "flow"} else "flow"
    
    def check_file_already_processed(self, filename: str) -> bool:
        """Check if a file has already been processed."""
        if self.is_new_collection:
            return False
        
        try:
            result = self.collection.query(
                expr=f'source_file == "{filename}"',
                output_fields=["pk"],
                limit=1
            )
            return bool(result)
        except Exception as e:
            logger.warning(f"Could not query existing data for {filename}: {e}")
            return False
    
    def process_files(self, files: List[str], data_type: str) -> int:
        """Process all files and return total embeddings inserted."""
        total_inserted = 0
        
        for filename in files:
            logger.info(f"Processing file: {filename}")
            
            if self.check_file_already_processed(filename):
                logger.info(f"File {filename} already processed. Skipping.")
                continue
            
            try:
                inserted = self._process_single_file(filename, data_type)
                total_inserted += inserted
                logger.info(f"Processed {filename}: {inserted:,} embeddings inserted")
            except Exception as e:
                logger.error(f"Error processing {filename}: {e}")
                continue
        
        return total_inserted
    
    def _process_single_file(self, filename: str, data_type: str) -> int:
        """Process a single file and return number of embeddings inserted."""
        # Count total lines for progress tracking
        total_lines = self._count_lines(filename)
        logger.info(f"Processing {total_lines:,} lines from {filename}")
        
        batch_texts = []
        inserted_count = 0
        
        with open(filename, 'r', encoding='utf-8') as f:
            with tqdm(total=total_lines, desc="Processing", unit=" lines") as pbar:
                for line_num, line in enumerate(f, 1):
                    if not line.strip():
                        pbar.update(1)
                        continue
                    
                    try:
                        data = self._parse_line(line)
                        if data is None:
                            pbar.update(1)
                            continue
                        
                        text = self._convert_to_text(data, data_type)
                        if text:
                            batch_texts.append(text)
                        
                        # Process batch when threshold reached
                        if len(batch_texts) >= self.config.embedding_batch_size:
                            inserted = self._process_batch(batch_texts, filename)
                            inserted_count += inserted
                            batch_texts = []
                        
                        pbar.update(1)
                        
                    except Exception as e:
                        logger.warning(f"Error processing line {line_num}: {e}")
                        pbar.update(1)
                        continue
        
        # Process remaining texts
        if batch_texts:
            logger.info(f"Processing final batch of {len(batch_texts)} texts")
            inserted = self._process_batch(batch_texts, filename)
            inserted_count += inserted
        
        return inserted_count
    
    def _count_lines(self, filename: str) -> int:
        """Count non-empty lines in a file."""
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                return sum(1 for line in f if line.strip())
        except Exception as e:
            logger.warning(f"Could not count lines in {filename}: {e}")
            return 0
    
    def _parse_line(self, line: str) -> Optional[Dict]:
        """Parse a line as JSON or Python literal."""
        try:
            return json.loads(line)
        except json.JSONDecodeError:
            try:
                return ast.literal_eval(line)
            except Exception:
                return None
    
    def _convert_to_text(self, data: Dict, data_type: str) -> Optional[str]:
        """Convert structured data to natural language text."""
        try:
            if data_type == "flow":
                if 'flows' in data:
                    return self._flow_to_sentence(data['flows'])
            else:  # honeypot
                return self._honeypot_to_sentence(data)
        except Exception as e:
            logger.debug(f"Error converting data to text: {e}")
        return None
    
    def _flow_to_sentence(self, flow: Dict) -> str:
        """Convert flow data to readable sentence."""
        protocol_map = {6: "TCP", 17: "UDP", 1: "ICMP"}
        
        src_ip = flow.get("sourceIPv4Address") or flow.get("id.orig_h") or "unknown"
        dst_ip = flow.get("destinationIPv4Address") or flow.get("id.resp_h") or "unknown"
        src_port = flow.get("sourceTransportPort") or flow.get("id.orig_p") or "?"
        dst_port = flow.get("destinationTransportPort") or flow.get("id.resp_p") or "?"
        proto = protocol_map.get(flow.get("protocolIdentifier"), flow.get("proto", "?"))
        
        # Handle timestamp
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
    
    def _honeypot_to_sentence(self, evt: Dict) -> str:
        """Convert honeypot event to readable sentence."""
        app = evt.get("app", "unknown_app")
        protocol = evt.get("protocol", "unknown_proto")
        sensor_host = evt.get("sensor", {}).get("hostname", "unknown_sensor")
        src_ip = evt.get("src_ip", "?")
        src_port = evt.get("src_port", "?")
        dst_ip = evt.get("dst_ip", "?")
        dst_port = evt.get("dst_port", "?")
        
        # Get event description
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
    
    def _process_batch(self, texts: List[str], filename: str) -> int:
        """Process a batch of texts with optimized performance."""
        if not texts:
            return 0
        
        try:
            start_time = time.time()
            
            # Generate embeddings with optimization
            embeddings = self.model.encode(
                texts,
                batch_size=self.config.embedding_internal_batch,
                show_progress_bar=False,
                convert_to_numpy=True,
                normalize_embeddings=True  # Normalize for better similarity search
            )
            
            embedding_time = time.time() - start_time
            
            # Convert to list format for Milvus
            embeddings_list = [emb.tolist() for emb in embeddings]
            src_list = [filename] * len(embeddings_list)
            
            # Insert in chunks
            inserted_count = 0
            for i in range(0, len(embeddings_list), self.config.insert_batch_size):
                chunk_embeddings = embeddings_list[i:i+self.config.insert_batch_size]
                chunk_texts = texts[i:i+self.config.insert_batch_size]
                chunk_src = src_list[i:i+self.config.insert_batch_size]
                
                self.collection.insert([chunk_embeddings, chunk_texts, chunk_src])
                inserted_count += len(chunk_embeddings)
            
            # Performance logging
            texts_per_sec = len(texts) / embedding_time if embedding_time > 0 else 0
            logger.debug(f"Batch processed: {len(texts)} texts in {embedding_time:.2f}s ({texts_per_sec:.1f} texts/sec)")
            
            return inserted_count
            
        except Exception as e:
            logger.error(f"Error processing batch: {e}")
            return 0
    
    def finalize_collection(self, total_inserted: int):
        """Finalize the collection with indexing."""
        if total_inserted > 0:
            try:
                logger.info("Creating index...")
                self.collection.create_index(
                    field_name="vector",
                    index_params={
                        "index_type": "IVF_FLAT",
                        "metric_type": "COSINE",
                        "params": {"nlist": 128}
                    }
                )
                
                logger.info("Loading collection...")
                self.collection.load()
                
                logger.info(f"Successfully processed {total_inserted:,} embeddings")
                
            except Exception as e:
                logger.error(f"Error finalizing collection: {e}")
        else:
            logger.warning("No embeddings were inserted")

def main():
    """Main function with comprehensive error handling."""
    try:
        # Initialize configuration
        config = Config()
        
        # Initialize embedder
        embedder = MilvusEmbedder(config)
        embedder.initialize()
        
        # Interactive setup
        collection_name = embedder.select_collection()
        logger.info(f"Selected collection: {collection_name}")
        
        embedder.setup_collection(collection_name)
        
        input("Press Enter to continue to file selection...")
        
        files = embedder.get_files_to_process()
        data_type = embedder.get_data_type()
        
        logger.info(f"Processing {len(files)} files as {data_type} data")
        
        # Process files
        total_inserted = embedder.process_files(files, data_type)
        
        # Finalize
        embedder.finalize_collection(total_inserted)
        
        logger.info("Embedding process completed successfully!")
        return 0
        
    except KeyboardInterrupt:
        logger.info("Process interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 