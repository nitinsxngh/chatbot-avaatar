"""Schemas for flow connector execution (API / MySQL)."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class FlowHttpRequest(BaseModel):
    method: Literal["GET", "POST", "PUT", "PATCH", "DELETE"] = "GET"
    url: str
    headers: Dict[str, str] = Field(default_factory=dict)
    body: Optional[str] = None
    timeout_seconds: float = 20


class FlowHttpResponse(BaseModel):
    ok: bool
    status: int
    body: str
    json_data: Optional[Any] = None
    error: Optional[str] = None


class FlowMysqlRequest(BaseModel):
    host: str
    port: int = 3306
    database: str
    user: str
    password: str = ""
    sql: str
    result_mode: Literal["first_row", "rows_json", "scalar"] = "first_row"
    max_rows: int = 50


class FlowMysqlResponse(BaseModel):
    ok: bool
    rows: List[Dict[str, Any]] = Field(default_factory=list)
    columns: List[str] = Field(default_factory=list)
    row_count: int = 0
    scalar: Optional[Any] = None
    first_row: Optional[Dict[str, Any]] = None
    preview: str = ""
    error: Optional[str] = None
