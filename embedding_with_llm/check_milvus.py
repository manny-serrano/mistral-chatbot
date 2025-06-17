from pymilvus import connections, utility, Collection

# Connect to Milvus
connections.connect("default", host="standalone", port="19530")

# List all collections and show to the user
collections = utility.list_collections()

if not collections:
    print("No collections found in Milvus instance.")
    exit(0)

print("Available collections:")
for idx, col in enumerate(collections, 1):
    print(f"  {idx}. {col}")

# Ask user which collection to inspect
user_in = input("\nEnter the name (or number) of the collection to inspect: ").strip()

if user_in.isdigit():
    sel_idx = int(user_in) - 1
    if 0 <= sel_idx < len(collections):
        collection_name = collections[sel_idx]
    else:
        print("Invalid selection index.")
        exit(1)
else:
    collection_name = user_in

if collection_name not in collections:
    print(f"Collection '{collection_name}' does not exist.")
    exit(1)

collection = Collection(collection_name)

# Print schema and stats
print("\nSchema:")
print(collection.schema)

print(f"Number of entities: {collection.num_entities}")

# Show first 5 embeddings (pk + first few dims)
results = collection.query(expr="", output_fields=["pk", "vector"], limit=5)

print("\nFirst 5 entities:")
for res in results:
    vec_preview = res["vector"][:5] if isinstance(res["vector"], (list, tuple)) else res["vector"]
    print(f"PK: {res['pk']}  |  Vector preview: {vec_preview}")
    