from fastapi import APIRouter, HTTPException

from api.schemas.config import ConfigResetRequest, ConfigResponse, ConfigUpdateRequest
from api.services.config_service import (
    get_configuration,
    reset_configuration,
    update_configuration,
)

router = APIRouter()


@router.get("", response_model=ConfigResponse)
def read_config():
    """Return all configurable variables grouped by category."""
    return get_configuration()


@router.patch("", response_model=dict)
def patch_config(body: ConfigUpdateRequest):
    """Update one or more config values and persist to .env."""
    try:
        return update_configuration(body.updates)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/reset", response_model=dict)
def reset_config_endpoint(body: ConfigResetRequest = ConfigResetRequest()):
    """Reset settings to defaults (API keys preserved unless include_secrets=true)."""
    try:
        return reset_configuration(
            keys=body.keys,
            include_secrets=body.include_secrets,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
