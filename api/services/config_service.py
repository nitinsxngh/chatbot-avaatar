from typing import Any, Dict, List, Optional

import chatbot
from utils.session_store import (
    SESSION_CONFIG_KEYS,
    config_as_categories,
    get_session_config,
    normalize_session_name,
    save_session_config,
)
from utils.settings import get_config, reset_config, update_config


def get_configuration(session_name: Optional[str] = None) -> dict:
    if session_name:
        name = normalize_session_name(session_name, fallback=chatbot.SESSION_ID)
        cfg = get_session_config(chatbot.mongo_collection, name)
        shaped = config_as_categories(cfg)
        shaped["session_name"] = name
        return shaped
    data = get_config(mask_secrets=True)
    data["session_name"] = None
    data["session_scoped"] = False
    return data


def update_configuration(
    updates: Dict[str, Any],
    session_name: Optional[str] = None,
) -> dict:
    if session_name:
        name = normalize_session_name(session_name, fallback=chatbot.SESSION_ID)
        saved = save_session_config(chatbot.mongo_collection, name, updates)
        # Apply immediately if this is the active runtime session path
        chatbot.apply_session_config(name)
        return {
            "updated": sorted(k for k in updates if k in SESSION_CONFIG_KEYS),
            "session_name": name,
            "config": {
                **config_as_categories(saved),
                "session_name": name,
            },
        }
    return update_config(updates)


def reset_configuration(
    keys: Optional[List[str]] = None,
    include_secrets: bool = False,
    session_name: Optional[str] = None,
) -> dict:
    if session_name:
        from utils.settings import CONFIG_FIELDS

        name = normalize_session_name(session_name, fallback=chatbot.SESSION_ID)
        reset_keys = keys or list(SESSION_CONFIG_KEYS)
        payload: Dict[str, Any] = {}
        for key in reset_keys:
            if key not in SESSION_CONFIG_KEYS:
                continue
            meta = CONFIG_FIELDS.get(key) or {}
            if meta.get("secret") and not include_secrets:
                continue
            if "default" in meta:
                payload[key] = meta["default"]

        current = get_session_config(chatbot.mongo_collection, name)
        current.update(payload)
        saved = save_session_config(chatbot.mongo_collection, name, current)
        chatbot.apply_session_config(name)
        return {
            "updated": sorted(payload.keys()),
            "session_name": name,
            "config": {
                **config_as_categories(saved),
                "session_name": name,
            },
        }
    return reset_config(keys=keys, include_secrets=include_secrets)
