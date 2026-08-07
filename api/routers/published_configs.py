"""Published RAG config snapshots — reusable named configs by dataset category."""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from api.schemas.published_config import (
    PublishedConfig,
    PublishedConfigCreate,
    PublishedConfigUpdate,
)
from api.services import published_config_service as service

router = APIRouter()


@router.get("", response_model=list[PublishedConfig])
def get_published_configs(
    dataset_category: Optional[str] = Query(default=None),
    enabled_only: bool = Query(default=False),
):
    return service.list_published_configs(
        dataset_category=dataset_category,
        enabled_only=enabled_only,
    )


@router.get("/{item_id}", response_model=PublishedConfig)
def get_published_config(item_id: str):
    try:
        return service.get_published_config(item_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("", response_model=PublishedConfig)
def post_published_config(body: PublishedConfigCreate):
    try:
        return service.create_published_config(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.patch("/{item_id}", response_model=PublishedConfig)
def patch_published_config(item_id: str, body: PublishedConfigUpdate):
    try:
        return service.update_published_config(item_id, body)
    except ValueError as exc:
        status = 404 if "not found" in str(exc).lower() else 400
        raise HTTPException(status_code=status, detail=str(exc)) from exc


@router.delete("/{item_id}", response_model=dict)
def remove_published_config(item_id: str):
    deleted = service.delete_published_config(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Published config not found.")
    return {"deleted": True, "id": item_id}
