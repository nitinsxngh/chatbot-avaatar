from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class PublishedConfigCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    dataset_category: str = Field(..., min_length=1, max_length=120)
    settings: Dict[str, Any] = Field(default_factory=dict)
    session_name: Optional[str] = None
    enabled: bool = True


class PublishedConfigUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    dataset_category: Optional[str] = Field(default=None, min_length=1, max_length=120)
    settings: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None


class PublishedConfig(BaseModel):
    id: str
    name: str
    description: str = ""
    dataset_category: str
    settings: Dict[str, Any] = Field(default_factory=dict)
    session_name: Optional[str] = None
    enabled: bool = True
    created_at: str = ""
    updated_at: str = ""
