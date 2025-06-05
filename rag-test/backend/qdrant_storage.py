from qdrant_client import QdrantClient  # Import Qdrant Python client
from qdrant_client.http import models   # Import data models for Qdrant
from typing import List, Any            # For type hints

# Initializes the Qdrant client to connect to the Qdrant service in Docker
client = QdrantClient(host="qdrant", port=6333)

def create_collections(collection_name: str = "flows", vector_size: int = 384):
    # Creates a Qdrant collection if it doesn't already exist
    # We use 384 because our embedding model outputs 384-dimensional vectors

    if not client.collection_exists(collection_name):  # Check if collection exists
        client.create_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(
                size=vector_size,                      # Size of embedding vectors
                distance=models.Distance.COSINE       # Use cosine similarity for search
            ),
        )

def upsert_flows(embeddings: List[Any], metadatas: List[dict], collection_name: str = "flows"):
    # Upserts (inserts or updates) a batch of embeddings and their associated metadata into Qdrant

    points = []  # List to hold all points to insert
    for i, (embedding, metadata) in enumerate(zip(embeddings, metadatas)):
        point_id = metadata.get("id", i)  # Use metadata ID if available, otherwise use index
        points.append(
            models.PointStruct(
                id=point_id,              # Unique ID for each point
                vector=embedding,         # The embedding vector
                payload=metadata          # Extra metadata stored as payload
            )
        )

    # Perform the actual upsert into the specified collection
    client.upsert(
        collection_name=collection_name,
        points=points
    )