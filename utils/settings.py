"""Central config registry for CLI, API, and Next.js UI."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

from dotenv import dotenv_values, set_key

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = PROJECT_ROOT / ".env"

# key -> { label, category, type, default, secret, module }
CONFIG_FIELDS: dict[str, dict[str, Any]] = {
    # Model
    "MODEL_NAME": {
        "label": "Chat model",
        "category": "model",
        "type": "string",
        "default": "gpt-4o-mini",
        "module": "chatbot",
    },
    "TEMPERATURE": {
        "label": "Temperature",
        "category": "model",
        "type": "float",
        "default": 0.2,
        "module": "chatbot",
    },
    "EMBEDDING_MODEL": {
        "label": "Embedding model",
        "category": "model",
        "type": "string",
        "default": "text-embedding-3-small",
        "module": "both",
    },
    # Retrieval
    "RETRIEVE_K": {
        "label": "Retrieve K",
        "category": "retrieval",
        "type": "int",
        "default": 10,
        "module": "chatbot",
    },
    "RERANK_TOP_N": {
        "label": "Rerank top N",
        "category": "retrieval",
        "type": "int",
        "default": 3,
        "module": "chatbot",
    },
    "FLASHRANK_HIGH_THRESHOLD": {
        "label": "Flashrank high threshold",
        "category": "retrieval",
        "type": "float",
        "default": 0.70,
        "module": "chatbot",
    },
    "FLASHRANK_MID_THRESHOLD": {
        "label": "Flashrank mid threshold",
        "category": "retrieval",
        "type": "float",
        "default": 0.45,
        "module": "chatbot",
    },
    "FLASHRANK_UNRELIABLE_BELOW": {
        "label": "Flashrank unreliable below",
        "category": "retrieval",
        "type": "float",
        "default": 0.05,
        "module": "chatbot",
    },
    "PINECONE_HIGH_THRESHOLD": {
        "label": "Pinecone high threshold",
        "category": "retrieval",
        "type": "float",
        "default": 0.50,
        "module": "chatbot",
    },
    "PINECONE_MID_THRESHOLD": {
        "label": "Pinecone mid threshold",
        "category": "retrieval",
        "type": "float",
        "default": 0.28,
        "module": "chatbot",
    },
    "MAX_RETRIEVAL_ATTEMPTS": {
        "label": "Max retrieval attempts",
        "category": "retrieval",
        "type": "int",
        "default": 2,
        "module": "chatbot",
    },
    # Chat behaviour
    "MAX_HISTORY_TURNS": {
        "label": "Max history turns",
        "category": "chat",
        "type": "int",
        "default": 10,
        "module": "chatbot",
    },
    "MAX_USER_MESSAGE_CHARS": {
        "label": "Max user message chars",
        "category": "chat",
        "type": "int",
        "default": 2000,
        "module": "chatbot",
    },
    "LOW_CONFIDENCE_REPLY": {
        "label": "Low confidence reply",
        "category": "chat",
        "type": "string",
        "default": (
            "I couldn't find relevant information. "
            "Can you rephrase or ask about something else?"
        ),
        "module": "chatbot",
    },
    "MAX_API_RETRIES": {
        "label": "Max API retries",
        "category": "chat",
        "type": "int",
        "default": 3,
        "module": "chatbot",
    },
    "RETRY_DELAY_SECONDS": {
        "label": "Retry delay (seconds)",
        "category": "chat",
        "type": "float",
        "default": 1.5,
        "module": "chatbot",
    },
    # Assistant identity
    "ASSISTANT_NAME": {
        "label": "Assistant name",
        "category": "assistant",
        "type": "string",
        "default": "Document Assistant",
        "module": "chatbot",
    },
    "ASSISTANT_ROLE": {
        "label": "Assistant role",
        "category": "assistant",
        "type": "string",
        "default": "answering questions about the uploaded document",
        "module": "chatbot",
    },
    "ASSISTANT_ORGANISATION": {
        "label": "Organisation",
        "category": "assistant",
        "type": "string",
        "default": "Chatbot Avatar",
        "module": "chatbot",
    },
    "CHAT_SESSION_ID": {
        "label": "Default session ID",
        "category": "session",
        "type": "string",
        "default": "default",
        "module": "chatbot",
    },
    # Pinecone
    "PINECONE_API_KEY": {
        "label": "Pinecone API key",
        "category": "pinecone",
        "type": "string",
        "default": "",
        "secret": True,
        "module": "both",
    },
    "PINECONE_INDEX_NAME": {
        "label": "Pinecone index name",
        "category": "pinecone",
        "type": "string",
        "default": "chatbot-avatar",
        "module": "both",
    },
    "PINECONE_CLOUD": {
        "label": "Pinecone cloud",
        "category": "pinecone",
        "type": "string",
        "default": "aws",
        "module": "ingest",
    },
    "PINECONE_REGION": {
        "label": "Pinecone region",
        "category": "pinecone",
        "type": "string",
        "default": "us-east-1",
        "module": "ingest",
    },
    # MongoDB
    "MONGODB_URI": {
        "label": "MongoDB URI",
        "category": "mongodb",
        "type": "string",
        "default": "mongodb://localhost:27017",
        "module": "chatbot",
    },
    "MONGODB_DB": {
        "label": "MongoDB database",
        "category": "mongodb",
        "type": "string",
        "default": "chatbot_avatar",
        "module": "chatbot",
    },
    "MONGODB_COLLECTION": {
        "label": "Chat memory collection",
        "category": "mongodb",
        "type": "string",
        "default": "chat_memory",
        "module": "chatbot",
    },
    "MONGODB_LOGS_COLLECTION": {
        "label": "Logs collection",
        "category": "mongodb",
        "type": "string",
        "default": "chat_logs",
        "module": "chatbot",
    },
    # Ingest
    "PDF_PATH": {
        "label": "PDF path",
        "category": "ingest",
        "type": "string",
        "default": (
            "Documents/digital-marketing-strategy-an-integrated-approach-to-online-5ggz79hub6.pdf"
        ),
        "module": "ingest",
    },
    "CHUNK_SIZE": {
        "label": "Chunk size",
        "category": "ingest",
        "type": "int",
        "default": 1000,
        "module": "ingest",
    },
    "CHUNK_OVERLAP": {
        "label": "Chunk overlap",
        "category": "ingest",
        "type": "int",
        "default": 200,
        "module": "ingest",
    },
    # OpenAI / LangSmith
    "OPENAI_API_KEY": {
        "label": "OpenAI API key",
        "category": "openai",
        "type": "string",
        "default": "",
        "secret": True,
        "module": "both",
    },
    "LANGSMITH_API_KEY": {
        "label": "LangSmith API key",
        "category": "langsmith",
        "type": "string",
        "default": "",
        "secret": True,
        "module": "chatbot",
    },
    "LANGCHAIN_TRACING_V2": {
        "label": "LangChain tracing v2",
        "category": "langsmith",
        "type": "bool",
        "default": False,
        "module": "chatbot",
    },
    "LANGCHAIN_PROJECT": {
        "label": "LangChain project",
        "category": "langsmith",
        "type": "string",
        "default": "chatbot-avatar",
        "module": "chatbot",
    },
}


def _coerce_value(field_type: str, raw: Any) -> Any:
    if raw is None or raw == "":
        return None
    if field_type == "string":
        return str(raw)
    if field_type == "int":
        return int(raw)
    if field_type == "float":
        return float(raw)
    if field_type == "bool":
        if isinstance(raw, bool):
            return raw
        return str(raw).lower() in {"1", "true", "yes", "on"}
    return raw


def _mask_secret(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 8:
        return "********"
    return f"{value[:4]}...{value[-4:]}"


def get_config(mask_secrets: bool = True) -> dict:
    """Return all config fields grouped by category."""
    env_values = dotenv_values(ENV_PATH) if ENV_PATH.exists() else {}
    categories: dict[str, list] = {}

    for key, meta in CONFIG_FIELDS.items():
        raw = env_values.get(key)
        if raw is None:
            raw = os.getenv(key)
        if raw is None:
            value = meta["default"]
        else:
            value = _coerce_value(meta["type"], raw)

        display = _mask_secret(str(value)) if mask_secrets and meta.get("secret") and value else value

        item = {
            "key": key,
            "label": meta["label"],
            "type": meta["type"],
            "value": display,
            "default": meta["default"],
            "has_value": bool(value),
            "secret": bool(meta.get("secret")),
            "editable": True,
        }
        categories.setdefault(meta["category"], []).append(item)

    return {"categories": categories}


def update_config(updates: dict[str, Any]) -> dict:
    """Persist config updates to .env and apply to runtime modules."""
    if not ENV_PATH.exists():
        ENV_PATH.touch()

    applied: dict[str, Any] = {}
    for key, raw_value in updates.items():
        if key not in CONFIG_FIELDS:
            continue
        meta = CONFIG_FIELDS[key]
        value = _coerce_value(meta["type"], raw_value)
        if value is None:
            continue

        env_value = "true" if meta["type"] == "bool" and value is True else (
            "false" if meta["type"] == "bool" and value is False else str(value)
        )
        set_key(str(ENV_PATH), key, env_value)
        os.environ[key] = env_value
        applied[key] = value

    if applied:
        _apply_runtime_config(applied)

    return {"updated": list(applied.keys()), "config": get_config(mask_secrets=True)}


def reset_config(
    keys: Optional[list] = None,
    include_secrets: bool = False,
) -> dict:
    """
    Reset config fields to their declared defaults and persist to .env.

    By default skips secret keys (API keys) so credentials are preserved.
    Pass keys=[...] to reset only specific fields.
    """
    if not ENV_PATH.exists():
        ENV_PATH.touch()

    targets = keys if keys else list(CONFIG_FIELDS.keys())
    defaults: dict[str, Any] = {}

    for key in targets:
        if key not in CONFIG_FIELDS:
            continue
        meta = CONFIG_FIELDS[key]
        if meta.get("secret") and not include_secrets:
            continue
        defaults[key] = meta["default"]

    return update_config(defaults)


def _apply_runtime_config(applied: dict[str, Any]) -> None:
    """Push supported keys into loaded Python modules."""
    import chatbot
    import ingest

    chatbot_keys = {
        "MODEL_NAME", "TEMPERATURE", "MAX_HISTORY_TURNS", "RETRIEVE_K", "RERANK_TOP_N",
        "FLASHRANK_HIGH_THRESHOLD", "FLASHRANK_MID_THRESHOLD", "FLASHRANK_UNRELIABLE_BELOW",
        "PINECONE_HIGH_THRESHOLD", "PINECONE_MID_THRESHOLD", "LOW_CONFIDENCE_REPLY",
        "MAX_API_RETRIES", "RETRY_DELAY_SECONDS", "MAX_RETRIEVAL_ATTEMPTS", "EMBEDDING_MODEL",
        "MAX_USER_MESSAGE_CHARS", "ASSISTANT_NAME", "ASSISTANT_ROLE", "ASSISTANT_ORGANISATION",
        "CHAT_SESSION_ID", "PINECONE_API_KEY", "PINECONE_INDEX_NAME",
        "MONGODB_URI", "MONGODB_DB", "MONGODB_COLLECTION", "MONGODB_LOGS_COLLECTION",
    }
    ingest_keys = {"PDF_PATH", "CHUNK_SIZE", "CHUNK_OVERLAP", "EMBEDDING_MODEL",
                   "PINECONE_API_KEY", "PINECONE_INDEX_NAME", "PINECONE_CLOUD", "PINECONE_REGION"}

    for key, value in applied.items():
        if key in chatbot_keys and hasattr(chatbot, key):
            setattr(chatbot, key, value)
        if key == "CHAT_SESSION_ID":
            chatbot.SESSION_ID = str(value)
        if key in {"ASSISTANT_NAME", "ASSISTANT_ROLE", "ASSISTANT_ORGANISATION"}:
            try:
                chatbot.refresh_assistant_prompts()
            except Exception:
                pass
        if key in ingest_keys:
            if key == "PDF_PATH":
                ingest.PDF_PATH = Path(str(value))
            elif hasattr(ingest, key):
                setattr(ingest, key, value)
