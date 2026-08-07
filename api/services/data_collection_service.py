"""Mongo-backed CRUD for data collections (each mapped to a Pinecone namespace)."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from pymongo import ReturnDocument

import chatbot
from api.schemas.data_collection import (
    DataCollection,
    DataCollectionCreate,
    DataCollectionUpdate,
)

COLLECTIONS = "data_collections"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _db():
    return chatbot.mongo_client[chatbot.MONGODB_DB]


def _col():
    return _db()[COLLECTIONS]


def _ensure_indexes() -> None:
    _col().create_index("name", unique=True)
    _col().create_index("namespace", unique=True)


def _to_id_filter(item_id: str) -> Dict[str, Any]:
    try:
        return {"_id": ObjectId(item_id)}
    except Exception as exc:
        raise ValueError("Invalid collection id.") from exc


def slugify_namespace(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    slug = re.sub(r"-+", "-", slug)
    return (slug[:64] or "collection").strip("-")


def _unique_namespace(preferred: str) -> str:
    base = slugify_namespace(preferred)
    candidate = base
    n = 2
    while _col().find_one({"namespace": candidate}):
        suffix = f"-{n}"
        candidate = f"{base[: 64 - len(suffix)]}{suffix}"
        n += 1
    return candidate


def _as_collection(doc: Dict[str, Any]) -> DataCollection:
    return DataCollection(
        id=str(doc.get("_id")),
        name=str(doc.get("name", "")),
        description=str(doc.get("description", "")),
        namespace=str(doc.get("namespace", "")),
        enabled=bool(doc.get("enabled", True)),
        document_count=int(doc.get("document_count") or 0),
        pages=int(doc.get("pages") or 0),
        chunks=int(doc.get("chunks") or 0),
        document_title=doc.get("document_title"),
        domain=doc.get("domain"),
        topics=doc.get("topics") or {},
        source_files=list(doc.get("source_files") or []),
        created_at=str(doc.get("created_at", "")),
        updated_at=str(doc.get("updated_at", "")),
    )


def list_collections(enabled_only: bool = False) -> List[DataCollection]:
    _ensure_indexes()
    query: Dict[str, Any] = {"enabled": True} if enabled_only else {}
    cursor = _col().find(query).sort("updated_at", -1)
    return [_as_collection(doc) for doc in cursor]


def get_collection(item_id: str) -> DataCollection:
    _ensure_indexes()
    doc = _col().find_one(_to_id_filter(item_id))
    if not doc:
        raise ValueError("Data collection not found.")
    return _as_collection(doc)


def create_collection(payload: DataCollectionCreate) -> DataCollection:
    _ensure_indexes()
    name = payload.name.strip()
    if not name:
        raise ValueError("Collection name is required.")
    if _col().find_one({"name": name}):
        raise ValueError(f"Collection name already exists: {name}")

    preferred = (payload.namespace or name).strip()
    namespace = _unique_namespace(preferred)
    now = _now_iso()
    doc = {
        "name": name,
        "description": (payload.description or "").strip(),
        "namespace": namespace,
        "enabled": bool(payload.enabled),
        "document_count": 0,
        "pages": 0,
        "chunks": 0,
        "document_title": None,
        "domain": None,
        "topics": {},
        "source_files": [],
        "created_at": now,
        "updated_at": now,
    }
    inserted = _col().insert_one(doc)
    created = _col().find_one({"_id": inserted.inserted_id})
    if not created:
        raise RuntimeError("Failed to create data collection.")
    return _as_collection(created)


def update_collection(item_id: str, payload: DataCollectionUpdate) -> DataCollection:
    _ensure_indexes()
    updates = payload.model_dump(exclude_none=True)
    if "name" in updates:
        updates["name"] = str(updates["name"]).strip()
        if not updates["name"]:
            raise ValueError("Collection name cannot be empty.")
        clash = _col().find_one({"name": updates["name"], "_id": {"$ne": ObjectId(item_id)}})
        if clash:
            raise ValueError(f"Collection name already exists: {updates['name']}")
    if "description" in updates:
        updates["description"] = str(updates["description"]).strip()
    if not updates:
        raise ValueError("No fields provided for update.")
    updates["updated_at"] = _now_iso()
    result = _col().find_one_and_update(
        _to_id_filter(item_id),
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise ValueError("Data collection not found.")
    return _as_collection(result)


def delete_collection(item_id: str) -> Optional[DataCollection]:
    """Delete Mongo record and return it (caller may clear Pinecone namespace)."""
    _ensure_indexes()
    doc = _col().find_one_and_delete(_to_id_filter(item_id))
    if not doc:
        return None
    return _as_collection(doc)


def record_ingest_stats(
    item_id: str,
    *,
    document_count: int,
    pages: int,
    chunks: int,
    document_title: Optional[str] = None,
    domain: Optional[str] = None,
    topics: Optional[Dict[str, List[str]]] = None,
    source_files: Optional[List[str]] = None,
    append_sources: bool = True,
) -> DataCollection:
    """Update collection stats after an ingest run."""
    _ensure_indexes()
    doc = _col().find_one(_to_id_filter(item_id))
    if not doc:
        raise ValueError("Data collection not found.")

    existing_sources = list(doc.get("source_files") or [])
    new_sources = list(source_files or [])
    if append_sources:
        merged = list(dict.fromkeys([*existing_sources, *new_sources]))
        next_doc_count = int(doc.get("document_count") or 0) + document_count
        next_pages = int(doc.get("pages") or 0) + pages
        next_chunks = int(doc.get("chunks") or 0) + chunks
    else:
        merged = new_sources
        next_doc_count = document_count
        next_pages = pages
        next_chunks = chunks

    merged_topics = dict(doc.get("topics") or {})
    for key, keywords in (topics or {}).items():
        bucket = merged_topics.setdefault(key, [])
        for kw in keywords or []:
            if kw not in bucket:
                bucket.append(kw)

    updates: Dict[str, Any] = {
        "document_count": next_doc_count,
        "pages": next_pages,
        "chunks": next_chunks,
        "source_files": merged,
        "topics": merged_topics,
        "updated_at": _now_iso(),
    }
    if document_title:
        updates["document_title"] = document_title
    if domain:
        updates["domain"] = domain

    result = _col().find_one_and_update(
        _to_id_filter(item_id),
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise ValueError("Data collection not found.")
    return _as_collection(result)
