from typing import Any, Dict, List, Optional

from utils.settings import get_config, reset_config, update_config


def get_configuration() -> dict:
    return get_config(mask_secrets=True)


def update_configuration(updates: Dict[str, Any]) -> dict:
    return update_config(updates)


def reset_configuration(
    keys: Optional[List[str]] = None,
    include_secrets: bool = False,
) -> dict:
    return reset_config(keys=keys, include_secrets=include_secrets)
