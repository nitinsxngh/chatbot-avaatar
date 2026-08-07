"""Data collection endpoints — named KB collections mapped to Pinecone namespaces."""

from fastapi import APIRouter, HTTPException, Query

from api.schemas.data_collection import (
    DataCollection,
    DataCollectionCreate,
    DataCollectionUpdate,
)
from api.services import data_collection_service as collections
from api.services.ingest_service import clear_namespace

router = APIRouter()


@router.get("", response_model=list[DataCollection])
def get_collections(enabled_only: bool = Query(default=False)):
    return collections.list_collections(enabled_only=enabled_only)


@router.get("/{item_id}", response_model=DataCollection)
def get_collection(item_id: str):
    try:
        return collections.get_collection(item_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("", response_model=DataCollection)
def post_collection(body: DataCollectionCreate):
    try:
        return collections.create_collection(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.patch("/{item_id}", response_model=DataCollection)
def patch_collection(item_id: str, body: DataCollectionUpdate):
    try:
        return collections.update_collection(item_id, body)
    except ValueError as exc:
        status = 404 if "not found" in str(exc).lower() else 400
        raise HTTPException(status_code=status, detail=str(exc)) from exc


@router.delete("/{item_id}", response_model=dict)
def remove_collection(
    item_id: str,
    clear_vectors: bool = Query(default=True),
):
    deleted = collections.delete_collection(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Data collection not found.")
    if clear_vectors and deleted.namespace:
        try:
            clear_namespace(deleted.namespace)
        except Exception as exc:
            return {
                "deleted": True,
                "id": item_id,
                "namespace": deleted.namespace,
                "vectors_cleared": False,
                "warning": str(exc),
            }
    return {
        "deleted": True,
        "id": item_id,
        "namespace": deleted.namespace,
        "vectors_cleared": clear_vectors,
    }
