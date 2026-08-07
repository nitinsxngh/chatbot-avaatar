from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from api.schemas.data_collection import DataCollection, DataCollectionCreate


class IngestDocumentResult(BaseModel):
    pdf_path: str
    document_id: str = ""
    source_name: str = ""
    pages: int = 0
    blocks: int = 0
    chunks: int = 0
    topic_distribution: dict = Field(default_factory=dict)
    document_title: Optional[str] = None
    domain: Optional[str] = None
    assistant_role: Optional[str] = None
    discovery_method: Optional[str] = None
    topics: Dict[str, list] = Field(default_factory=dict)


class IngestRequest(BaseModel):
    pdf_path: Optional[str] = Field(
        default=None,
        description="Path to a single PDF relative to project root",
    )
    pdf_paths: Optional[List[str]] = Field(
        default=None,
        description="Paths to multiple PDFs relative to project root",
    )
    replace_all: bool = Field(
        default=False,
        description="Legacy: clear default namespace before ingest when no collection",
    )
    collection_id: Optional[str] = Field(
        default=None,
        description="Existing data collection to update",
    )
    create_collection: Optional[DataCollectionCreate] = Field(
        default=None,
        description="Create a new data collection (separate Pinecone namespace) then ingest",
    )
    replace_namespace: bool = Field(
        default=False,
        description="Clear the collection namespace before ingest (full refresh of that collection)",
    )


class IngestResponse(BaseModel):
    status: str
    pdf_path: str = ""
    pdf_paths: List[str] = Field(default_factory=list)
    pages: int = 0
    chunks: int = 0
    index_name: str = ""
    namespace: str = ""
    collection_id: Optional[str] = None
    collection: Optional[DataCollection] = None
    topic_distribution: dict = Field(default_factory=dict)
    document_title: Optional[str] = None
    domain: Optional[str] = None
    assistant_role: Optional[str] = None
    discovery_method: Optional[str] = None
    topics: Dict[str, list] = Field(default_factory=dict)
    documents: List[IngestDocumentResult] = Field(default_factory=list)
    document_count: int = 0
