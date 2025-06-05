from sentence_transformers import SentenceTransformer
from pymilvus import connections, Collection
import ollama

# Connect to Milvus
connections.connect("default", host="localhost", port="19530")
collection = Collection("sbert_embeddings")
model = SentenceTransformer('all-MiniLM-L6-v2')

# Prompt user for a question
while True:
    question = input("Enter your question (or type 'stop' to exit): ")
    if question.strip().lower() in ['stop', 'exit']:
        print("Exiting.")
        break
    question_embedding = model.encode(question).tolist()

    # Retrieve top 5 relevant logs
    search_params = {"metric_type": "COSINE", "params": {"nprobe": 10}}
    results = collection.search(
        data=[question_embedding],
        anns_field="embedding",
        param=search_params,
        limit=5, # adjust this number to test quality of response
        output_fields=["id", "text"]
    )
    top_texts = [hit.entity.get("text") for hit in results[0] if hit.entity.get("text")]
    context = "\n".join(top_texts)

    # Build prompt and query Ollama
    prompt = f"""Use the following context to answer the question.\n\nContext:\n{context}\n\nQuestion: {question}\nAnswer:"""

    response = ollama.chat(
        model='llama3:instruct',
        messages=[{'role': 'user', 'content': prompt}]
    )
    print("\nLLM Answer:")
    print(response['message']['content']) 