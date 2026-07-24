from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ConfigUpdateRequest(BaseModel):
    updates: Dict[str, Any] = Field(
        description="Key-value pairs to update in .env",
    )


class ConfigResetRequest(BaseModel):
    keys: Optional[List[str]] = Field(
        default=None,
        description="Optional list of keys to reset. If omitted, reset all non-secret fields.",
    )
    include_secrets: bool = Field(
        default=False,
        description="If true, also reset secret keys (API keys) to empty defaults.",
    )


class ConfigField(BaseModel):
    key: str
    label: str
    type: str
    value: Any
    default: Any = None
    has_value: bool
    secret: bool


class ConfigResponse(BaseModel):
    categories: Dict[str, List[ConfigField]]
