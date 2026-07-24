from typing import Dict, Optional

from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    pdf_path: Optional[str] = Field(
        default=None,
        description="Path to PDF relative to project root",
    )


class IngestResponse(BaseModel):
    status: str
    pdf_path: str
    pages: int
    chunks: int
    index_name: str
    topic_distribution: dict
    document_title: Optional[str] = None
    domain: Optional[str] = None
    assistant_role: Optional[str] = None
    discovery_method: Optional[str] = None
    topics: Dict[str, list] = Field(default_factory=dict)
