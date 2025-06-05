from embedding import embed_sentence
from qdrant_utils import client
from log_parser import flow_to_sentence
import httpx

def search_similar_flows(query_vector, top_k=10, collection_name="flows"):
    # Searches Qdrant for the top_k most similar flows to the query_vector.
    # Returns a list of payloads (metadata) for the top results.
    search_result = client.search(
        collection_name=collection_name,
        query_vector=query_vector,
        limit=top_k
    )
    return [hit.payload for hit in search_result]

def build_llm_prompt(user_query, flows):
    # Builds a prompt for the LLM using the user query and a list of flow dicts.
    # Format each flow as a readable sentence
    context = "\n".join(
        f"- {flow_to_sentence(flow)}" for flow in flows
    )
    prompt = (
        "You are a cybersecurity analyst. Here are some recent network flows:\n"
        f"{context}\n\n"
        f"User question: {user_query}\n"
        "Answer as helpfully as possible."
    )
    return prompt

def query_ollama(prompt, model="gemma:2b"):
    response = httpx.post(
        "http://ollama:11434/api/generate",
        json={"model": model, "prompt": prompt},
        timeout=120
    )
    response.raise_for_status()
    import json
    lines = response.text.strip().splitlines()
    responses = [json.loads(line)["response"] for line in lines if line.strip()]
    return "".join(responses)

def main():
    print("Hello! 👋  My name is Flojo and I am here to help you 😎 . Type 'exit' to quit.\n")
    while True:
        # Step 1: Get user query
        user_query = input("Please ask me a question: ")
        if user_query.strip().lower() in {"exit", "quit"}:
            print("Goodbye!")
            break

        # Step 2: Embed the query
        query_vector = embed_sentence(user_query)

        # Step 3: Search Qdrant for similar flows
        flows = search_similar_flows(query_vector, top_k=5)

        # Step 4: Build the LLM prompt
        prompt = build_llm_prompt(user_query, flows)

        # Step 5: Query Ollama
        print("\n--- LLM Prompt ---\n")
        print(prompt)
        print("\n--- LLM Response ---\n")
        response = query_ollama(prompt)
        print(response)
        print("\n" + "="*40 + "\n")

if __name__ == "__main__":
    main()