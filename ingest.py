"""
Preprocess a PDF into a Pinecone vector database.

Works for ANY document domain:
1. Load the PDF
2. Discover topics + domain from the document (LLM with heuristic fallback)
3. Split into overlapping text chunks
4. Enrich metadata with dynamic topics
5. Embed chunks with OpenAI
6. Upsert embeddings into Pinecone
"""

import os
import time
from pathlib import Path
from typing import Optional, Union

from dotenv import load_dotenv, set_key
from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pinecone import Pinecone, ServerlessSpec
from utils.metadata_utils import (
    build_sample_text,
    discover_document_topics_with_llm,
    enrich_chunk_metadata,
    save_document_profile,
    set_topic_vocabulary,
)

load_dotenv()

# --- Config ---
PDF_PATH = Path(
    "Documents/digital-marketing-strategy-an-integrated-approach-to-online-5ggz79hub6.pdf"
)
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSION = 1536  # text-embedding-3-small

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "chatbot-avatar")
PINECONE_CLOUD = os.getenv("PINECONE_CLOUD", "aws")
PINECONE_REGION = os.getenv("PINECONE_REGION", "us-east-1")

PROJECT_ROOT = Path(__file__).resolve().parent
ENV_PATH = PROJECT_ROOT / ".env"
UPLOADS_DIR = PROJECT_ROOT / "Documents" / "uploads"


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

    while not pc.describe_index(index_name).status.get("ready"):
        time.sleep(1)

    print("Index is ready.")


def _apply_assistant_from_profile(profile: dict) -> None:
    """Update assistant identity from discovered document domain (optional soft update)."""
    role = (profile.get("assistant_role") or "").strip()
    title = (profile.get("document_title") or "").strip()
    if not role:
        return

    # Persist for next process start
    if ENV_PATH.exists() or True:
        if not ENV_PATH.exists():
            ENV_PATH.touch()
        set_key(str(ENV_PATH), "ASSISTANT_ROLE", role)
        os.environ["ASSISTANT_ROLE"] = role
        if title:
            name = f"{title} Assistant"
            set_key(str(ENV_PATH), "ASSISTANT_NAME", name)
            os.environ["ASSISTANT_NAME"] = name

    # Hot-update running chatbot module if loaded
    try:
        import chatbot

        chatbot.ASSISTANT_ROLE = role
        if title:
            chatbot.ASSISTANT_NAME = f"{title} Assistant"
        chatbot.refresh_assistant_prompts()
    except Exception:
        pass


def ingest(pdf_path: Optional[Union[str, Path]] = None) -> dict:
    path = Path(pdf_path) if pdf_path else PDF_PATH
    if not path.is_absolute():
        path = (PROJECT_ROOT / path).resolve()

    if not PINECONE_API_KEY:
        raise ValueError("Missing PINECONE_API_KEY in .env")

    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    print(f"Loading PDF: {path}")
    loader = PyPDFLoader(str(path))
    pages = loader.load()
    print(f"Loaded {len(pages)} pages")

    print("Discovering document topics (any domain)...")
    sample = build_sample_text(pages)
    discovery = discover_document_topics_with_llm(sample)
    set_topic_vocabulary(discovery["topics"])

    document_id = path.stem[:80]
    profile = {
        "document_id": document_id,
        "pdf_path": str(path),
        "source_name": path.name,
        "document_title": discovery.get("document_title"),
        "domain": discovery.get("domain"),
        "assistant_role": discovery.get("assistant_role"),
        "topics": discovery.get("topics"),
        "discovery_method": discovery.get("discovery_method"),
        "pages": len(pages),
    }
    save_document_profile(profile)
    _apply_assistant_from_profile(profile)

    print(f"  Title: {profile.get('document_title')}")
    print(f"  Domain: {profile.get('domain')}")
    print(f"  Role: {profile.get('assistant_role')}")
    print(f"  Discovery: {profile.get('discovery_method')}")
    print(f"  Topics: {len(profile.get('topics') or {})}")

    print("Splitting into chunks...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )
    chunks = splitter.split_documents(pages)
    print(f"Created {len(chunks)} chunks")

    print("Enriching chunk metadata (dynamic primary_topic, page_number)...")
    for chunk in chunks:
        chunk.metadata = enrich_chunk_metadata(
            chunk.metadata,
            chunk.page_content,
            document_id=document_id,
            source_name=path.name,
        )

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

    index = pc.Index(PINECONE_INDEX_NAME)
    print("Clearing existing vectors in index...")
    try:
        index.delete(delete_all=True)
    except Exception:
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

    return {
        "pdf_path": str(path),
        "pages": len(pages),
        "chunks": len(chunks),
        "index_name": PINECONE_INDEX_NAME,
        "topic_distribution": topic_counts,
        "document_title": profile.get("document_title"),
        "domain": profile.get("domain"),
        "assistant_role": profile.get("assistant_role"),
        "discovery_method": profile.get("discovery_method"),
        "topics": profile.get("topics") or {},
    }


if __name__ == "__main__":
    ingest()
