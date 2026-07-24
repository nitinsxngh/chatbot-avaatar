from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from api.schemas.config import ConfigResetRequest, ConfigResponse, ConfigUpdateRequest
from api.services.config_service import (
    get_configuration,
    reset_configuration,
    update_configuration,
)

router = APIRouter()


@router.get("", response_model=ConfigResponse)
def read_config(session_name: Optional[str] = Query(default=None)):
    """
    Return configurable variables grouped by category.

    Pass session_name to load that session's stored config from MongoDB.
    """
    return get_configuration(session_name=session_name)


@router.patch("", response_model=dict)
def patch_config(body: ConfigUpdateRequest):
    """Update config values (.env globally, or per-session when session_name is set)."""
    try:
        return update_configuration(body.updates, session_name=body.session_name)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/reset", response_model=dict)
def reset_config_endpoint(body: ConfigResetRequest = ConfigResetRequest()):
    """Reset settings to defaults (global or per-session)."""
    try:
        return reset_configuration(
            keys=body.keys,
            include_secrets=body.include_secrets,
            session_name=body.session_name,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
