"""
Preprocess a PDF into a Pinecone vector database.

Steps:
1. Load the PDF
2. Split into overlapping text chunks
3. Embed chunks with OpenAI
4. Upsert embeddings into Pinecone
"""

import os
import time
from pathlib import Path

from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter
from utils.metadata_utils import enrich_chunk_metadata
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

# --- Config ---
PDF_PATH = Path("Documents/digital-marketing-strategy-an-integrated-approach-to-online-5ggz79hub6.pdf")
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSION = 1536  # text-embedding-3-small

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "chatbot-avatar")
PINECONE_CLOUD = os.getenv("PINECONE_CLOUD", "aws")
PINECONE_REGION = os.getenv("PINECONE_REGION", "us-east-1")


def ensure_index(pc: Pinecone, index_name: str) -> None:
    """Create the Pinecone index if it does not exist."""
    existing = set(pc.list_indexes().names())
    if index_name in existing:
        print(f"Pinecone index already exists: {index_name}")
        return

    print(f"Creating Pinecone index: {index_name}")
    pc.create_index(
        name=index_name,
        dimension=EMBEDDING_DIMENSION,
        metric="cosine",
        spec=ServerlessSpec(cloud=PINECONE_CLOUD, region=PINECONE_REGION),
    )

    # Wait until the index is ready
    while not pc.describe_index(index_name).status.get("ready"):
        time.sleep(1)

    print("Index is ready.")


def ingest() -> None:
    if not PINECONE_API_KEY:
        raise ValueError("Missing PINECONE_API_KEY in .env")

    if not PDF_PATH.exists():
        raise FileNotFoundError(f"PDF not found: {PDF_PATH.resolve()}")

    print(f"Loading PDF: {PDF_PATH}")
    loader = PyPDFLoader(str(PDF_PATH))
    pages = loader.load()
    print(f"Loaded {len(pages)} pages")

    print("Splitting into chunks...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )
    chunks = splitter.split_documents(pages)
    print(f"Created {len(chunks)} chunks")

    print("Enriching chunk metadata (primary_topic, page_number)...")
    for chunk in chunks:
        chunk.metadata = enrich_chunk_metadata(chunk.metadata, chunk.page_content)

    # Show a quick topic distribution for sanity
    topic_counts = {}
    for chunk in chunks:
        topic = chunk.metadata.get("primary_topic", "general")
        topic_counts[topic] = topic_counts.get(topic, 0) + 1
    print("Topic distribution:")
    for topic, count in sorted(topic_counts.items(), key=lambda x: -x[1]):
        print(f"  {topic}: {count}")

    print("Connecting to Pinecone...")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    ensure_index(pc, PINECONE_INDEX_NAME)

    # Clear existing vectors so re-ingest replaces content cleanly
    index = pc.Index(PINECONE_INDEX_NAME)
    print("Clearing existing vectors in index...")
    try:
        index.delete(delete_all=True)
    except Exception:
        # Empty index / namespace may raise; safe to continue
        pass

    print("Embedding and upserting to Pinecone...")
    embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL)
    PineconeVectorStore.from_documents(
        documents=chunks,
        embedding=embeddings,
        index_name=PINECONE_INDEX_NAME,
    )

    print("Done. Pinecone vector DB is ready.")
    print(f"  Index: {PINECONE_INDEX_NAME}")
    print(f"  Chunks stored: {len(chunks)}")


if __name__ == "__main__":
    ingest()
