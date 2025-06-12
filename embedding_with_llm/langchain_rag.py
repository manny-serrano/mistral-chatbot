import os
import time
from langchain_milvus import Milvus
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import OpenAI
from langchain.chains import RetrievalQA
from dotenv import load_dotenv
from pymilvus import connections

# Load environment variables
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")
openai_api_base = os.getenv("OPENAI_API_BASE")
openai_model = os.getenv("OPENAI_MODEL", "GPT 4.1")

# Set up embeddings
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Connect to Milvus vector store with retry logic
print("Connecting to Milvus...")
vectorstore = None
for attempt in range(30):  # Try for up to 30*2=60 seconds
    try:
        print(f"Milvus connection attempt {attempt + 1}/30...")
        # Use the connection_args approach with correct host
        vectorstore = Milvus(
            embedding_function=embeddings,
            collection_name="sbert_embeddings",
            connection_args={"uri": "http://standalone:19530"},
        )
        print("Successfully connected to Milvus!")
        break
    except Exception as e:
        print(f"Milvus connection failed (attempt {attempt + 1}): {str(e)}")
        if attempt < 29:  # Don't sleep on the last attempt
            print("Retrying in 2 seconds...")
            time.sleep(2)
else:
    raise RuntimeError("Failed to connect to Milvus after 60 seconds. Check if Milvus service is running properly.")

if vectorstore is None:
    raise RuntimeError("Failed to initialize Milvus vectorstore")

# Set up retriever
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

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