from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, model_validator


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    session_name: Optional[str] = Field(
        default=None,
        description="Primary unique key for the chat session",
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Legacy alias for session_name",
    )

    @model_validator(mode="after")
    def prefer_session_name(self):
        if not self.session_name and self.session_id:
            self.session_name = self.session_id
        return self


class RetrievalAttempt(BaseModel):
    attempt: int
    query: str
    metadata_filter: Optional[str] = None
    filter_fallback: bool = False
    flashrank_score: float
    pinecone_score: float
    confidence_score: float
    band: str
    chunks: List[Dict[str, Any]] = Field(default_factory=list)


class TraceSummary(BaseModel):
    intent: Optional[str] = None
    route: Optional[str] = None
    latency_ms: Optional[int] = None
    search_query: Optional[str] = None
    retry_queries: List[str] = Field(default_factory=list)
    band: Optional[str] = None
    flashrank_score: Optional[float] = None
    pinecone_score: Optional[float] = None
    confidence_score: Optional[float] = None
    pages: List[Any] = Field(default_factory=list)
    topics: List[Any] = Field(default_factory=list)


class ChatTrace(BaseModel):
    logs: List[str] = Field(default_factory=list)
    intent_detail: Optional[Any] = None
    retrieval_attempts: List[RetrievalAttempt] = Field(default_factory=list)
    summary: Optional[TraceSummary] = None
    thresholds: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    answer: str
    session_name: str
    session_id: str  # same value as session_name (compat)
    intent: Optional[str] = None
    route: Optional[str] = None
    band: Optional[str] = None
    latency_ms: Optional[int] = None
    confidence_score: Optional[float] = None
    flashrank_score: Optional[float] = None
    pinecone_score: Optional[float] = None
    search_query: Optional[str] = None
    pages: List[Any] = Field(default_factory=list)
    topics: List[Any] = Field(default_factory=list)
    security_blocked: bool = False
    trace: Optional[ChatTrace] = None


class HistoryMessage(BaseModel):
    role: str
    content: str


class HistoryResponse(BaseModel):
    session_name: str
    session_id: str
    messages: List[HistoryMessage]


class SessionsResponse(BaseModel):
    sessions: List[str]
