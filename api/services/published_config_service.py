"""Mongo-backed published RAG config snapshots."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from pymongo import ReturnDocument

import chatbot
from api.schemas.published_config import (
    PublishedConfig,
    PublishedConfigCreate,
    PublishedConfigUpdate,
)

COLLECTION = "published_configs"

# Never persist secrets in published snapshots
SECRET_KEYS = {
    "OPENAI_API_KEY",
    "PINECONE_API_KEY",
    "LANGSMITH_API_KEY",
    "LANGCHAIN_API_KEY",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _col():
    return chatbot.mongo_client[chatbot.MONGODB_DB][COLLECTION]


def _ensure_indexes() -> None:
    _col().create_index("name")
    _col().create_index("dataset_category")
    _col().create_index("updated_at")


def _to_id_filter(item_id: str) -> Dict[str, Any]:
    try:
        return {"_id": ObjectId(item_id)}
    except Exception as exc:
        raise ValueError("Invalid published config id.") from exc


def sanitize_settings(settings: Dict[str, Any]) -> Dict[str, Any]:
    clean: Dict[str, Any] = {}
    for key, value in (settings or {}).items():
        if key in SECRET_KEYS:
            continue
        if value is None:
            continue
        clean[str(key)] = value
    return clean


def _as_config(doc: Dict[str, Any]) -> PublishedConfig:
    return PublishedConfig(
        id=str(doc.get("_id")),
        name=str(doc.get("name", "")),
        description=str(doc.get("description", "")),
        dataset_category=str(doc.get("dataset_category", "")),
        settings=doc.get("settings") or {},
        session_name=doc.get("session_name"),
        enabled=bool(doc.get("enabled", True)),
        created_at=str(doc.get("created_at", "")),
        updated_at=str(doc.get("updated_at", "")),
    )


def list_published_configs(
    dataset_category: Optional[str] = None,
    enabled_only: bool = False,
) -> List[PublishedConfig]:
    _ensure_indexes()
    query: Dict[str, Any] = {}
    if dataset_category and dataset_category.strip():
        query["dataset_category"] = dataset_category.strip()
    if enabled_only:
        query["enabled"] = True
    cursor = _col().find(query).sort("updated_at", -1)
    return [_as_config(doc) for doc in cursor]


def get_published_config(item_id: str) -> PublishedConfig:
    _ensure_indexes()
    doc = _col().find_one(_to_id_filter(item_id))
    if not doc:
        raise ValueError("Published config not found.")
    return _as_config(doc)


def create_published_config(payload: PublishedConfigCreate) -> PublishedConfig:
    _ensure_indexes()
    name = payload.name.strip()
    category = payload.dataset_category.strip()
    if not name:
        raise ValueError("Name is required.")
    if not category:
        raise ValueError("Category is required.")

    now = _now_iso()
    doc = {
        "name": name,
        "description": (payload.description or "").strip(),
        "dataset_category": category,
        "settings": sanitize_settings(payload.settings),
        "session_name": payload.session_name,
        "enabled": bool(payload.enabled),
        "created_at": now,
        "updated_at": now,
    }
    inserted = _col().insert_one(doc)
    created = _col().find_one({"_id": inserted.inserted_id})
    if not created:
        raise RuntimeError("Failed to publish config.")
    return _as_config(created)


def update_published_config(
    item_id: str,
    payload: PublishedConfigUpdate,
) -> PublishedConfig:
    _ensure_indexes()
    updates = payload.model_dump(exclude_none=True)
    if "name" in updates:
        updates["name"] = str(updates["name"]).strip()
        if not updates["name"]:
            raise ValueError("Name cannot be empty.")
    if "description" in updates:
        updates["description"] = str(updates["description"]).strip()
    if "dataset_category" in updates:
        updates["dataset_category"] = str(updates["dataset_category"]).strip()
        if not updates["dataset_category"]:
            raise ValueError("Category cannot be empty.")
    if "settings" in updates:
        updates["settings"] = sanitize_settings(updates["settings"] or {})
    if not updates:
        raise ValueError("No fields provided for update.")
    updates["updated_at"] = _now_iso()
    result = _col().find_one_and_update(
        _to_id_filter(item_id),
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise ValueError("Published config not found.")
    return _as_config(result)


def delete_published_config(item_id: str) -> bool:
    _ensure_indexes()
    result = _col().delete_one(_to_id_filter(item_id))
    return result.deleted_count > 0
