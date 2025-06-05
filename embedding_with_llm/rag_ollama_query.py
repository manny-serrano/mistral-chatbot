from sentence_transformers import SentenceTransformer
from pymilvus import connections, Collection
import ollama

# Connect to Milvus
connections.connect("default", host="localhost", port="19530")
collection = Collection("sbert_embeddings")
model = SentenceTransformer('all-MiniLM-L6-v2')

# Prompt user for a question
question = input("Enter your question: ")
question_embedding = model.encode(question).tolist()

# Retrieve top 3 relevant logs
search_params = {"metric_type": "COSINE", "params": {"nprobe": 10}}
results = collection.search(
    data=[question_embedding],
    anns_field="embedding",
    param=search_params,
    limit=3,
    output_fields=["id", "text"]
)
top_texts = [hit.entity.get("text") for hit in results[0] if hit.entity.get("text")]
context = "\n".join(top_texts)

# Build prompt and query Ollama
prompt = f"""Use the following context to answer the question.

Context:
{context}

Question: {question}
Answer:"""

response = ollama.chat(
    model='llama3:instruct',
    messages=[{'role': 'user', 'content': prompt}]
)
print("\nLLM Answer:")
print(response['message']['content']) 