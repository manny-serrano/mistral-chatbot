from log_parser import parse_large_flow_file
from embedding import batch_embed_sentences
from qdrant_utils import create_collection, upsert_flows
import sys


def ingest_flow_file(filepath, batch_size=100, collection_name="flows"):
   # """
   # Ingests a large flow log file:
   # - Parses each flow and creates a summary
   # - Embeds summaries in batches
   # - Stores embeddings + metadata in Qdrant
   # """
    # Ensure the Qdrant collection exists
    create_collection(collection_name=collection_name, vector_size=384)

    batch_sentences = []
    batch_metadatas = []
    for flow, summary in parse_large_flow_file(filepath):
        batch_sentences.append(summary)
        batch_metadatas.append(flow)
        if len(batch_sentences) == batch_size:
            # Embed and upsert this batch
            _, batch_embeddings = next(batch_embed_sentences(batch_sentences, batch_size=batch_size))
            upsert_flows(batch_embeddings, batch_metadatas, collection_name=collection_name)
            batch_sentences = []
            batch_metadatas = []

    # Handle any remaining flows
    if batch_sentences:
        _, batch_embeddings = next(batch_embed_sentences(batch_sentences, batch_size=batch_size))
        upsert_flows(batch_embeddings, batch_metadatas, collection_name=collection_name)

    print(f"Ingestion complete for {filepath}")


def main():
    
    #Command-line interface for ingesting a flow log file.
    #Usage: python ingest.py <path_to_log_file> [batch_size]
    
    if len(sys.argv) < 2:
        print("Usage: python ingest.py <path_to_log_file> [batch_size]")
        sys.exit(1)
    filepath = sys.argv[1]
    batch_size = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    ingest_flow_file(filepath, batch_size=batch_size)

if __name__ == "__main__":
    main() 