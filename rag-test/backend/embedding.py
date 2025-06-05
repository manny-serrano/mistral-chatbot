# This file embeds log entries so they can be stored as vectors in a vector database

from sentence_transformers import SentenceTransformer  # Import the sentence transformer model
from typing import List, Iterable  # Import type hinting for lists and iterables

# Load the BAAI/bge-small-en-v1.5 model once at startup
# This model converts sentences into vector embeddings
model = SentenceTransformer("BAAI/bge-small-en-v1.5")

def embed_sentence(sentence: str):
    # Embeds a single sentence and returns its vector representation (as a numpy array)
    # The model.encode method returns a list, so we take the first (and only) element
    return model.encode([sentence])[0]

def embed_sentences(sentences: List[str]):
    # Embeds a list of sentences and returns a list of vector embeddings
    return model.encode(sentences)

def batch_embed_sentences(sentences: Iterable[str], batch_size: int = 100):
    # Embeds sentences in batches to reduce memory usage
    # Yields (batch_sentences, batch_embeddings) for each batch

    batch = []  # Temporary list to store the current batch of sentences
    for sentence in sentences:
        batch.append(sentence)  # Add sentence to batch
        if len(batch) == batch_size:
            embeddings = model.encode(batch)  # Embed the current batch
            yield batch, embeddings  # Yield both the original batch and the embeddings
            batch = []  # Reset the batch after yielding

    if batch:  # Handle any remaining sentences in the final batch
        embeddings = model.encode(batch)
        yield batch, embeddings