from qdrant_client import QdrantClient
from qdrant_client.http import models
from typing import List, Any

# Initialize Qdrant client for Docker setup
client = QdrantClient(host="qdrant", port=6333)

def create_collection(collection_name: str = "flows", vector_size: int = 384):
   ### """
  ###  Create a Qdrant collection if it doesn't exist.
  ###  Args:
       ## collection_name: Name of the collection to create.
       # vector_size: Size of the embedding vectors (384 for BAAI/bge-small-en-v1.5).
  ###  """
    if not client.collection_exists(collection_name):
        client.create_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(
                size=vector_size,
                distance=models.Distance.COSINE
            )
        )

def upsert_flows(embeddings: List[Any], metadatas: List[dict], collection_name: str = "flows"):
   # """
   # Upsert a batch of embeddings and their metadata into Qdrant.
   # Args:
   #     embeddings: List or array of embedding vectors.
      #  metadatas: List of metadata dicts (same length as embeddings).
       # collection_name: Name of the Qdrant collection.
   # """
    points = []
    for i, (embedding, metadata) in enumerate(zip(embeddings, metadatas)):
        # Use a unique id for each point (can be a hash, or just the index if not critical)
        point_id = metadata.get("id", i)
        points.append(
            models.PointStruct(
                id=point_id,
                vector=embedding,
                payload=metadata
            )
        )
    client.upsert(
        collection_name=collection_name,
        points=points
    ) 