from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ConfigUpdateRequest(BaseModel):
    updates: Dict[str, Any] = Field(
        description="Key-value pairs to update in .env",
    )


class ConfigField(BaseModel):
    key: str
    label: str
    type: str
    value: Any
    has_value: bool
    secret: bool


class ConfigResponse(BaseModel):
    categories: Dict[str, List[ConfigField]]
