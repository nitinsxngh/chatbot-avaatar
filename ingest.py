"""
Preprocess PDFs into a Pinecone vector database.

Supports single or multiple PDFs with structure-aware parsing:
1. Parse PDF layout (headings, sections, lists)
2. Discover topics per document (LLM + heuristic fallback)
3. Structure-aware chunking with metadata enrichment
4. Embed and upsert into Pinecone (per-document replace or full index clear)
"""

import os
import time
from pathlib import Path
from typing import List, Optional, Union

from dotenv import load_dotenv, set_key
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec
from utils.metadata_utils import (
    build_sample_text,
    discover_document_topics_with_llm,
    save_document_profile,
    set_topic_vocabulary,
    slugify_topic,
)
from utils.pdf_parser import parse_pdf_structure
from utils.structure_chunking import blocks_to_page_documents, chunk_parsed_document

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


def _resolve_path(pdf_path: Union[str, Path]) -> Path:
    path = Path(pdf_path)
    if not path.is_absolute():
        path = (PROJECT_ROOT / path).resolve()
    return path


def _merge_topic_vocabularies(
    vocabularies: List[dict],
) -> dict:
    merged: dict = {}
    for topics in vocabularies:
        for key, keywords in (topics or {}).items():
            slug = slugify_topic(str(key))
            if not slug:
                continue
            existing = merged.setdefault(slug, [])
            for kw in keywords or []:
                kw_str = str(kw).lower().strip()
                if kw_str and kw_str not in existing:
                    existing.append(kw_str)
    if not merged:
        merged = {"general": ["general", "overview", "introduction"]}
    return merged


def _apply_assistant_from_profile(profile: dict) -> None:
    """Update assistant identity from discovered document domain (optional soft update)."""
    role = (profile.get("assistant_role") or "").strip()
    title = (profile.get("document_title") or "").strip()
    if not role:
        return

    if not ENV_PATH.exists():
        ENV_PATH.touch()
    set_key(str(ENV_PATH), "ASSISTANT_ROLE", role)
    os.environ["ASSISTANT_ROLE"] = role
    if title:
        name = f"{title} Assistant"
        set_key(str(ENV_PATH), "ASSISTANT_NAME", name)
        os.environ["ASSISTANT_NAME"] = name

    try:
        import chatbot

        chatbot.ASSISTANT_ROLE = role
        if title:
            chatbot.ASSISTANT_NAME = f"{title} Assistant"
        chatbot.refresh_assistant_prompts()
    except Exception:
        pass


def clear_namespace(namespace: str) -> None:
    """Delete all vectors in a Pinecone namespace (no-op if empty name + default)."""
    if not PINECONE_API_KEY:
        raise ValueError("Missing PINECONE_API_KEY in .env")
    ns = (namespace or "").strip()
    pc = Pinecone(api_key=PINECONE_API_KEY)
    ensure_index(pc, PINECONE_INDEX_NAME)
    index = pc.Index(PINECONE_INDEX_NAME)
    try:
        if ns:
            index.delete(delete_all=True, namespace=ns)
            print(f"Cleared Pinecone namespace: {ns}")
        else:
            index.delete(delete_all=True)
            print("Cleared default Pinecone namespace")
    except Exception as exc:
        print(f"Namespace clear warning ({exc})")


def _delete_vectors_for_document(index, document_id: str, namespace: str = "") -> None:
    if not document_id:
        return
    try:
        kwargs = {"filter": {"document_id": {"$eq": document_id}}}
        if namespace:
            kwargs["namespace"] = namespace
        index.delete(**kwargs)
        print(f"  Removed existing vectors for document_id={document_id} ns={namespace or 'default'}")
    except Exception as exc:
        print(f"  Could not delete by document_id ({exc}); continuing upsert")


def _ingest_single_pdf(
    path: Path,
    index,
    embeddings: OpenAIEmbeddings,
    replace_document: bool = True,
    namespace: str = "",
) -> dict:
    print(f"Parsing PDF structure: {path.name}")
    parsed = parse_pdf_structure(path)
    print(f"  Blocks: {len(parsed.blocks)} | Pages: {parsed.page_count}")

    sample_pages = blocks_to_page_documents(parsed)
    sample = build_sample_text(sample_pages)
    print("  Discovering document topics...")
    discovery = discover_document_topics_with_llm(sample)

    chunks = chunk_parsed_document(
        parsed,
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )
    # Stamp collection namespace onto chunk metadata for debugging / filters
    for chunk in chunks:
        if namespace:
            chunk.metadata["collection_namespace"] = namespace
    print(f"  Structure-aware chunks: {len(chunks)}")

    topic_counts: dict = {}
    for chunk in chunks:
        topic = chunk.metadata.get("primary_topic", "general")
        topic_counts[topic] = topic_counts.get(topic, 0) + 1

    if replace_document:
        _delete_vectors_for_document(index, parsed.document_id, namespace=namespace)

    upsert_kwargs = {
        "documents": chunks,
        "embedding": embeddings,
        "index_name": PINECONE_INDEX_NAME,
    }
    if namespace:
        upsert_kwargs["namespace"] = namespace
    PineconeVectorStore.from_documents(**upsert_kwargs)

    return {
        "pdf_path": str(path),
        "document_id": parsed.document_id,
        "source_name": parsed.source_name,
        "pages": parsed.page_count,
        "blocks": len(parsed.blocks),
        "chunks": len(chunks),
        "topic_distribution": topic_counts,
        "document_title": discovery.get("document_title") or parsed.title,
        "domain": discovery.get("domain"),
        "assistant_role": discovery.get("assistant_role"),
        "discovery_method": discovery.get("discovery_method"),
        "topics": discovery.get("topics") or {},
    }


def ingest_documents(
    pdf_paths: List[Union[str, Path]],
    replace_all: bool = False,
    namespace: str = "",
) -> dict:
    """
    Ingest one or more PDFs with structure parsing and enriched metadata.

    namespace scopes upsert/delete to a Pinecone namespace (data collection).
    replace_all=True clears that namespace (or entire default ns) before ingest.
    replace_all=False removes only vectors for each document_id before upsert.
    """
    if not PINECONE_API_KEY:
        raise ValueError("Missing PINECONE_API_KEY in .env")

    ns = (namespace or "").strip()
    resolved = [_resolve_path(p) for p in pdf_paths]
    for path in resolved:
        if not path.exists():
            raise FileNotFoundError(f"PDF not found: {path}")

    print(f"Ingesting {len(resolved)} PDF(s) into namespace={ns or 'default'}...")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    ensure_index(pc, PINECONE_INDEX_NAME)
    index = pc.Index(PINECONE_INDEX_NAME)

    if replace_all:
        print(f"Clearing Pinecone namespace: {ns or 'default'}...")
        try:
            if ns:
                index.delete(delete_all=True, namespace=ns)
            else:
                index.delete(delete_all=True)
        except Exception:
            pass

    embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL)

    document_results: List[dict] = []
    merged_topics: List[dict] = []
    aggregate_topic_counts: dict = {}
    total_chunks = 0
    total_pages = 0

    for path in resolved:
        doc_result = _ingest_single_pdf(
            path,
            index=index,
            embeddings=embeddings,
            replace_document=not replace_all,
            namespace=ns,
        )
        document_results.append(doc_result)
        merged_topics.append(doc_result.get("topics") or {})
        total_chunks += doc_result.get("chunks", 0)
        total_pages += doc_result.get("pages", 0)
        for topic, count in (doc_result.get("topic_distribution") or {}).items():
            aggregate_topic_counts[topic] = aggregate_topic_counts.get(topic, 0) + count

    combined_topics = _merge_topic_vocabularies(merged_topics)
    set_topic_vocabulary(combined_topics)

    primary = document_results[0] if document_results else {}
    profile = {
        "document_id": primary.get("document_id"),
        "pdf_path": primary.get("pdf_path"),
        "source_name": primary.get("source_name"),
        "document_title": primary.get("document_title"),
        "domain": primary.get("domain"),
        "assistant_role": primary.get("assistant_role"),
        "topics": combined_topics,
        "discovery_method": primary.get("discovery_method"),
        "pages": total_pages,
        "documents": document_results,
        "document_count": len(document_results),
        "chunks": total_chunks,
        "namespace": ns,
    }
    save_document_profile(profile)
    _apply_assistant_from_profile(profile)

    print("Done. Pinecone vector DB is ready.")
    print(f"  Index: {PINECONE_INDEX_NAME}")
    print(f"  Namespace: {ns or 'default'}")
    print(f"  Documents: {len(document_results)}")
    print(f"  Chunks stored: {total_chunks}")

    return {
        "pdf_path": primary.get("pdf_path", ""),
        "pdf_paths": [d.get("pdf_path") for d in document_results],
        "pages": total_pages,
        "chunks": total_chunks,
        "index_name": PINECONE_INDEX_NAME,
        "namespace": ns,
        "topic_distribution": aggregate_topic_counts,
        "document_title": primary.get("document_title"),
        "domain": primary.get("domain"),
        "assistant_role": primary.get("assistant_role"),
        "discovery_method": primary.get("discovery_method"),
        "topics": combined_topics,
        "documents": document_results,
        "document_count": len(document_results),
    }


def ingest(
    pdf_path: Optional[Union[str, Path]] = None,
    pdf_paths: Optional[List[Union[str, Path]]] = None,
    replace_all: bool = True,
    namespace: str = "",
) -> dict:
    """Ingest a single PDF (default) or explicit path list into a namespace."""
    if pdf_paths:
        return ingest_documents(pdf_paths, replace_all=replace_all, namespace=namespace)
    path = pdf_path or PDF_PATH
    return ingest_documents([path], replace_all=replace_all, namespace=namespace)


if __name__ == "__main__":
    ingest()
