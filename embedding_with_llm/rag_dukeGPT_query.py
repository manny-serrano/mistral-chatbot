from sentence_transformers import SentenceTransformer
from pymilvus import connections, Collection
from dotenv import load_dotenv
import os
import openai

# Load environment variables from .env
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
openai.base_url = os.getenv("OPENAI_API_BASE")

# Connect to Milvus
connections.connect("default", host="localhost", port="19530")
collection = Collection("sbert_embeddings")
model = SentenceTransformer('all-MiniLM-L6-v2')

# Initialize conversation history
messages = []

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
        limit=10, # adjust this number to test quality of response
        output_fields=["id", "text"]
    )
    top_texts = [hit.entity.get("text") for hit in results[0] if hit.entity.get("text")]
    context = "\n".join(top_texts)

    # Build prompt for this turn
    prompt = f"""Use the following context to answer the question.\n\nContext:\n{context}\n\nQuestion: {question}\nAnswer:"""

    # Add the user's question to the conversation history
    messages.append({"role": "user", "content": prompt})

    # Query OpenAI with the full conversation history
    response = openai.chat.completions.create(
        model="GPT 4.1", #Possible models: 'Mistral on-site', 'GPT 4.1', 'GPT 4.1 Nano', 'GPT 4.1 Mini', 'o4 Mini']
        messages=messages
    )
    answer = response.choices[0].message.content
    print("\nLLM Answer:")
    print(answer)

    # Add the LLM's answer to the conversation history
    messages.append({"role": "assistant", "content": answer}) 