from typing import Any, Dict

from utils.settings import get_config, update_config


def get_configuration() -> dict:
    return get_config(mask_secrets=True)


def update_configuration(updates: Dict[str, Any]) -> dict:
    return update_config(updates)
