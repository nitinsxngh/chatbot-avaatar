"""
Session store: session_name is the primary unique key for chat memory + logs.

Each session document in MongoDB `chat_memory` holds:
  - session_name (unique)
  - messages
  - config (per-session settings snapshot)
  - timestamps
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from utils.settings import CONFIG_FIELDS, _coerce_value, get_config

# Keys stored per session (non-secret chatbot behaviour / identity / retrieval)
SESSION_CONFIG_KEYS = [
    "MODEL_NAME",
    "TEMPERATURE",
    "EMBEDDING_MODEL",
    "RETRIEVE_K",
    "RERANK_TOP_N",
    "FLASHRANK_HIGH_THRESHOLD",
    "FLASHRANK_MID_THRESHOLD",
    "FLASHRANK_UNRELIABLE_BELOW",
    "PINECONE_HIGH_THRESHOLD",
    "PINECONE_MID_THRESHOLD",
    "MAX_RETRIEVAL_ATTEMPTS",
    "MAX_HISTORY_TURNS",
    "MAX_USER_MESSAGE_CHARS",
    "LOW_CONFIDENCE_REPLY",
    "MAX_API_RETRIES",
    "RETRY_DELAY_SECONDS",
    "ASSISTANT_NAME",
    "ASSISTANT_ROLE",
    "ASSISTANT_ORGANISATION",
    "PINECONE_INDEX_NAME",
]


def normalize_session_name(name: Optional[str], fallback: str = "default") -> str:
    """Normalize session name used as the unique key."""
    raw = (name or "").strip()
    if not raw:
        raw = fallback
    # Allow letters, numbers, spaces, dash, underscore; collapse whitespace
    cleaned = re.sub(r"\s+", " ", raw)
    cleaned = re.sub(r"[^\w\s\-]", "", cleaned, flags=re.UNICODE).strip()
    cleaned = cleaned[:80] if cleaned else fallback
    return cleaned or fallback


def snapshot_runtime_config() -> Dict[str, Any]:
    """Capture current global config values for a new session."""
    cfg = get_config(mask_secrets=False)
    flat: Dict[str, Any] = {}
    for fields in cfg.get("categories", {}).values():
        for item in fields:
            key = item["key"]
            if key in SESSION_CONFIG_KEYS:
                flat[key] = item["value"]
    return flat


def ensure_indexes(mongo_collection, mongo_logs=None) -> None:
    """Ensure unique index on session_name (memory) and lookup index (logs)."""
    try:
        mongo_collection.create_index("session_name", unique=True, name="uniq_session_name")
    except Exception as exc:
        print(f"[session_index] {type(exc).__name__}: {exc}")
    if mongo_logs is not None:
        try:
            mongo_logs.create_index("session_name", name="idx_logs_session_name")
        except Exception as exc:
            print(f"[session_logs_index] {type(exc).__name__}: {exc}")


def find_session(mongo_collection, session_name: str) -> Optional[dict]:
    """Find session by session_name (or legacy session_id)."""
    name = normalize_session_name(session_name)
    doc = mongo_collection.find_one({"session_name": name})
    if doc:
        return doc
    # Back-compat with older docs that only had session_id
    return mongo_collection.find_one({"session_id": name})


def ensure_session(
    mongo_collection,
    session_name: str,
    config: Optional[Dict[str, Any]] = None,
) -> dict:
    """
    Get or create a session document keyed by session_name.
    New sessions get a snapshot of current runtime config unless config is provided.

    Uses upsert so concurrent create (e.g. stream + history) cannot race to DuplicateKeyError.
    """
    from pymongo.errors import DuplicateKeyError

    name = normalize_session_name(session_name)
    now = datetime.now(timezone.utc)
    existing = find_session(mongo_collection, name)

    if existing:
        updates: Dict[str, Any] = {
            "session_name": name,
            "session_id": name,
            "updated_at": now,
        }
        if config is not None:
            updates["config"] = _sanitize_session_config(config)
        elif not existing.get("config"):
            updates["config"] = snapshot_runtime_config()

        mongo_collection.update_one({"_id": existing["_id"]}, {"$set": updates})
        return find_session(mongo_collection, name) or {**existing, **updates}

    cfg = (
        _sanitize_session_config(config)
        if config is not None
        else snapshot_runtime_config()
    )
    try:
        # Only $setOnInsert — same field cannot appear in both $set and $setOnInsert.
        mongo_collection.update_one(
            {"session_name": name},
            {
                "$setOnInsert": {
                    "session_name": name,
                    "session_id": name,
                    "messages": [],
                    "config": cfg,
                    "created_at": now,
                    "updated_at": now,
                },
            },
            upsert=True,
        )
    except DuplicateKeyError:
        # Concurrent upsert lost the race; load the winner.
        pass

    doc = find_session(mongo_collection, name)
    if doc:
        if config is not None:
            sanitized = _sanitize_session_config(config)
            mongo_collection.update_one(
                {"_id": doc["_id"]},
                {
                    "$set": {
                        "config": sanitized,
                        "session_name": name,
                        "session_id": name,
                        "updated_at": now,
                    }
                },
            )
            doc = find_session(mongo_collection, name) or doc
        elif not doc.get("config"):
            snap = snapshot_runtime_config()
            mongo_collection.update_one(
                {"_id": doc["_id"]},
                {"$set": {"config": snap, "updated_at": now}},
            )
            doc = find_session(mongo_collection, name) or doc
        return doc

    # Extremely unlikely fallback
    payload = {
        "session_name": name,
        "session_id": name,
        "messages": [],
        "config": cfg,
        "created_at": now,
        "updated_at": now,
    }
    try:
        mongo_collection.insert_one(payload)
    except DuplicateKeyError:
        return find_session(mongo_collection, name) or payload
    return payload


def get_session_config(mongo_collection, session_name: str) -> Dict[str, Any]:
    """Return per-session config (creating session if needed)."""
    doc = ensure_session(mongo_collection, session_name)
    return dict(doc.get("config") or snapshot_runtime_config())


def save_session_config(
    mongo_collection,
    session_name: str,
    updates: Dict[str, Any],
) -> Dict[str, Any]:
    """Merge updates into the session config and persist."""
    name = normalize_session_name(session_name)
    doc = ensure_session(mongo_collection, name)
    current = dict(doc.get("config") or {})
    current.update(_sanitize_session_config(updates))
    mongo_collection.update_one(
        {"session_name": name},
        {
            "$set": {
                "config": current,
                "session_id": name,
                "updated_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )
    return current


def list_session_names(mongo_collection) -> List[str]:
    """List all session names (unique key)."""
    names = set()
    for doc in mongo_collection.find({}, {"session_name": 1, "session_id": 1}):
        name = doc.get("session_name") or doc.get("session_id")
        if name:
            names.add(str(name))
    return sorted(names)


def _sanitize_session_config(updates: Dict[str, Any]) -> Dict[str, Any]:
    cleaned: Dict[str, Any] = {}
    for key, raw in (updates or {}).items():
        if key not in SESSION_CONFIG_KEYS:
            continue
        meta = CONFIG_FIELDS.get(key)
        if not meta:
            continue
        if meta.get("secret"):
            continue
        value = _coerce_value(meta["type"], raw)
        if value is None:
            continue
        cleaned[key] = value
    return cleaned


def config_as_categories(
    session_config: Dict[str, Any],
    mask_secrets: bool = True,
) -> dict:
    """
    Shape full config for Settings UI.

    Session keys use values from session_config and are editable.
    All other keys come from global .env / env and are read-only.
    """
    global_cfg = get_config(mask_secrets=mask_secrets)
    global_by_key: Dict[str, dict] = {}
    for fields in global_cfg.get("categories", {}).values():
        for item in fields:
            global_by_key[item["key"]] = item

    categories: Dict[str, list] = {}
    for key, meta in CONFIG_FIELDS.items():
        editable = key in SESSION_CONFIG_KEYS
        if editable:
            value = session_config[key] if key in session_config else meta["default"]
            item = {
                "key": key,
                "label": meta["label"],
                "type": meta["type"],
                "value": value,
                "default": meta["default"],
                "has_value": value not in (None, ""),
                "secret": False,
                "editable": True,
            }
        else:
            base = global_by_key.get(key) or {
                "key": key,
                "label": meta["label"],
                "type": meta["type"],
                "value": meta["default"],
                "default": meta["default"],
                "has_value": False,
                "secret": bool(meta.get("secret")),
            }
            item = {**base, "editable": False}
        categories.setdefault(meta["category"], []).append(item)

    return {"categories": categories, "session_scoped": True}
