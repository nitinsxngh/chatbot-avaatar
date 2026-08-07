from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class DataCollectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    namespace: Optional[str] = Field(
        default=None,
        description="Pinecone namespace slug; auto-generated from name if omitted",
        max_length=64,
    )
    enabled: bool = True


class DataCollectionUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    enabled: Optional[bool] = None


class DataCollection(BaseModel):
    id: str
    name: str
    description: str = ""
    namespace: str
    enabled: bool = True
    document_count: int = 0
    pages: int = 0
    chunks: int = 0
    document_title: Optional[str] = None
    domain: Optional[str] = None
    topics: Dict[str, List[str]] = Field(default_factory=dict)
    source_files: List[str] = Field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""
