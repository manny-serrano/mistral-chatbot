from pymilvus import connections, utility, Collection

# Connect to Milvus
connections.connect("default", host="localhost", port="19530")

# List all collections
collections = utility.list_collections()
print("Collections:", collections)

# Use the 'sbert_embeddings' collection
collection_name = "sbert_embeddings"
if collection_name not in collections:
    print(f"Collection '{collection_name}' does not exist.")
    exit(1)

collection = Collection(collection_name)

# Print schema
print("\nSchema:", collection.schema)

# Print number of entities
print("Number of entities:", collection.num_entities)

# Query and print first 5 embeddings
results = collection.query(expr="", output_fields=["pk", "vector"], limit=5)
print("\nFirst 5 entities:")
for res in results:
    print(f"PK: {res['pk']} (showing first 5 dims)")
    print(f"Vector: {res['vector'][:5]}")
    print() 