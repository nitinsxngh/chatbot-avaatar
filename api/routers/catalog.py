"""Catalog management endpoints for models, dataset categories, and languages."""

from fastapi import APIRouter, HTTPException, Query

from api.schemas.catalog import (
    CatalogModel,
    CatalogModelCreate,
    CatalogModelUpdate,
    DatasetCategory,
    DatasetCategoryCreate,
    DatasetCategoryUpdate,
    Language,
    LanguageCreate,
    LanguageUpdate,
)
from api.services.catalog_seed import seed_catalog
from api.services.catalog_service import (
    create_dataset_category,
    create_language,
    create_model,
    delete_dataset_category,
    delete_language,
    delete_model,
    list_dataset_categories,
    list_languages,
    list_models,
    update_dataset_category,
    update_language,
    update_model,
)

router = APIRouter()


@router.api_route("/seed", methods=["GET", "POST"], response_model=dict)
def seed_catalog_endpoint(force: bool = Query(default=False)):
    """
    Seed Mongo with chat models, embedding models, and dataset categories.

    Skips existing names unless force=true (force still skips unique conflicts).
    Accepts GET or POST so it can be opened in a browser.
    """
    try:
        return seed_catalog(force=force)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/models", response_model=list[CatalogModel])
def get_models():
    return list_models()


@router.post("/models", response_model=CatalogModel)
def post_model(body: CatalogModelCreate):
    try:
        return create_model(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.patch("/models/{item_id}", response_model=CatalogModel)
def patch_model(item_id: str, body: CatalogModelUpdate):
    try:
        return update_model(item_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/models/{item_id}", response_model=dict)
def remove_model(item_id: str):
    deleted = delete_model(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Model not found.")
    return {"deleted": True, "id": item_id}


@router.get("/dataset-categories", response_model=list[DatasetCategory])
def get_dataset_categories():
    return list_dataset_categories()


@router.post("/dataset-categories", response_model=DatasetCategory)
def post_dataset_category(body: DatasetCategoryCreate):
    try:
        return create_dataset_category(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.patch("/dataset-categories/{item_id}", response_model=DatasetCategory)
def patch_dataset_category(item_id: str, body: DatasetCategoryUpdate):
    try:
        return update_dataset_category(item_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/dataset-categories/{item_id}", response_model=dict)
def remove_dataset_category(item_id: str):
    deleted = delete_dataset_category(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Dataset category not found.")
    return {"deleted": True, "id": item_id}


@router.get("/languages", response_model=list[Language])
def get_languages():
    return list_languages()


@router.post("/languages", response_model=Language)
def post_language(body: LanguageCreate):
    try:
        return create_language(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.patch("/languages/{item_id}", response_model=Language)
def patch_language(item_id: str, body: LanguageUpdate):
    try:
        return update_language(item_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/languages/{item_id}", response_model=dict)
def remove_language(item_id: str):
    deleted = delete_language(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Language not found.")
    return {"deleted": True, "id": item_id}
