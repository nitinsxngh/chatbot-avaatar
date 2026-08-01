"""Flow builder connector endpoints (HTTP proxy + MySQL)."""

from fastapi import APIRouter

from api.schemas.flow import (
    FlowHttpRequest,
    FlowHttpResponse,
    FlowMysqlRequest,
    FlowMysqlResponse,
)
from api.services.flow_connectors import execute_http, execute_mysql

router = APIRouter()


@router.post("/http", response_model=FlowHttpResponse)
def flow_http(body: FlowHttpRequest) -> FlowHttpResponse:
    return execute_http(body)


@router.post("/mysql", response_model=FlowMysqlResponse)
def flow_mysql(body: FlowMysqlRequest) -> FlowMysqlResponse:
    return execute_mysql(body)
