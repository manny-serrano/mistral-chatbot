import os
import time
from langchain_milvus import Milvus
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import OpenAI
from langchain.chains import RetrievalQA
from dotenv import load_dotenv
from pymilvus import connections, utility
from langchain_core.retrievers import BaseRetriever


# Load environment variables
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")
openai_api_base = os.getenv("OPENAI_API_BASE")
openai_model = "GPT 4.1"

# Set up embeddings
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Connect to Milvus first, with simple retry loop
print("Connecting to Milvus to enumerate collections…")
for attempt in range(30):
    try:
        connections.connect("default", host="standalone", port="19530")
        break
    except Exception as e:
        print(f"Connection attempt {attempt + 1}/30 failed: {e}")
        if attempt < 29:
            time.sleep(2)
        else:
            print("Could not connect to Milvus; exiting.")
            exit(1)

# Retrieve available collections
collections_available = utility.list_collections()

if not collections_available:
    print("No collections found in Milvus instance.")
    exit(0)

print("Available collections:")
for idx, cname in enumerate(collections_available, 1):
    print(f"  {idx}. {cname}")

# --- Choose which collection(s) to use ---
print("\nType 'all' to search across every collection.")
choice = input("Enter collection name, number, or 'all': ").strip().lower()

if choice == "all":
    selected_collections = collections_available
else:
    if choice.isdigit():
        idx = int(choice) - 1
        if 0 <= idx < len(collections_available):
            selected_collections = [collections_available[idx]]
        else:
            print("Invalid selection index.")
            exit(1)
    else:
        selected_collections = [choice if choice else collections_available[0]]

# Helper to create a vectorstore for a given collection name
def make_vs(name: str):
    return Milvus(
        embedding_function=embeddings,
        collection_name=name,
        connection_args={"uri": "http://standalone:19530"},
    )

vectorstores = []
for col in selected_collections:
    try:
        vs = make_vs(col)
        vectorstores.append(vs)
    except Exception as e:
        print(f"Warning: could not init vector store for collection '{col}': {e}")

if not vectorstores:
    print("No usable collections – exiting.")
    exit(1)

# Build a retriever. If only one collection, use its built-in retriever; otherwise combine.
if len(vectorstores) == 1:
    retriever = vectorstores[0].as_retriever(search_kwargs={"k": 5})
else:
    class MultiCollectionRetriever(BaseRetriever):
        """Retriever that queries multiple Milvus collections and merges results by similarity distance."""

        stores: list
        k: int = 5
        # Allow arbitrary vectorstore objects
        model_config = {
            "arbitrary_types_allowed": True,
            "extra": "allow",
        }

        def _get_relevant_documents(self, query, *, run_manager=None):
            scored_docs = []
            for vs in self.stores:
                try:
                    docs_scores = vs.similarity_search_with_score(query, k=self.k)
                    # Attach collection provenance
                    for doc, score in docs_scores:
                        doc.metadata = doc.metadata or {}
                        doc.metadata["collection"] = vs.collection_name
                    scored_docs.extend(docs_scores)
                except Exception as e:
                    print(f"Warning retrieving from {vs.collection_name}: {e}")
            scored_docs.sort(key=lambda pair: pair[1])  # lower distance better
            return [d[0] for d in scored_docs[: self.k]]

        async def _aget_relevant_documents(self, query, *, run_manager=None):
            return self._get_relevant_documents(query, run_manager=run_manager)

    retriever = MultiCollectionRetriever(stores=vectorstores, k=5)

# Set up LLM
llm = OpenAI(model=openai_model, openai_api_key=openai_api_key, openai_api_base=openai_api_base)

# Set up RAG chain
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=retriever,
    return_source_documents=True,
)

# Interactive loop
while True:
    question = input("Enter your question (or type 'stop' to exit): ")
    if question.strip().lower() in ['stop', 'exit']:
        print("Exiting.")
        break
    result = qa_chain.invoke({"query": question})
    print("\nLLM Answer:")
    print(result["result"])
    # print("\n--- Source Documents ---")
    #for doc in result["source_documents"]:
    #    print(doc.page_content)
    #    print("------") 