from typing import Optional

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
