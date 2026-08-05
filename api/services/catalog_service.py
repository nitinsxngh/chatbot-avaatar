"""Mongo-backed CRUD service for admin catalogs."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from bson import ObjectId
from pymongo import ReturnDocument

import chatbot
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


MODELS_COLLECTION = "catalog_models"
DATASET_CATEGORIES_COLLECTION = "catalog_dataset_categories"
LANGUAGES_COLLECTION = "catalog_languages"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _db():
    return chatbot.mongo_client[chatbot.MONGODB_DB]


def _collection(name: str):
    return _db()[name]


def _ensure_catalog_indexes() -> None:
    _collection(MODELS_COLLECTION).create_index("name")
    _collection(DATASET_CATEGORIES_COLLECTION).create_index("name", unique=True)
    _collection(LANGUAGES_COLLECTION).create_index("code", unique=True)


def _to_id_filter(item_id: str) -> Dict[str, Any]:
    try:
        return {"_id": ObjectId(item_id)}
    except Exception as exc:
        raise ValueError("Invalid id.") from exc


def _doc_id(doc: Dict[str, Any]) -> str:
    return str(doc.get("_id"))


def _as_model(doc: Dict[str, Any]) -> CatalogModel:
    return CatalogModel(
        id=_doc_id(doc),
        name=str(doc.get("name", "")),
        dataset_category=str(doc.get("dataset_category", "")),
        kind=str(doc.get("kind", "model")),
        launch_date=str(doc.get("launch_date", "")),
        enabled=bool(doc.get("enabled", True)),
        created_at=str(doc.get("created_at", "")),
        updated_at=str(doc.get("updated_at", "")),
    )


def _as_dataset_category(doc: Dict[str, Any]) -> DatasetCategory:
    return DatasetCategory(
        id=_doc_id(doc),
        name=str(doc.get("name", "")),
        description=str(doc.get("description", "")),
        enabled=bool(doc.get("enabled", True)),
        created_at=str(doc.get("created_at", "")),
        updated_at=str(doc.get("updated_at", "")),
    )


def _as_language(doc: Dict[str, Any]) -> Language:
    return Language(
        id=_doc_id(doc),
        name=str(doc.get("name", "")),
        code=str(doc.get("code", "")),
        native_name=str(doc.get("native_name", "")),
        enabled=bool(doc.get("enabled", True)),
        created_at=str(doc.get("created_at", "")),
        updated_at=str(doc.get("updated_at", "")),
    )


def list_models() -> List[CatalogModel]:
    _ensure_catalog_indexes()
    cursor = _collection(MODELS_COLLECTION).find().sort("created_at", -1)
    return [_as_model(doc) for doc in cursor]


def create_model(payload: CatalogModelCreate) -> CatalogModel:
    _ensure_catalog_indexes()
    now = _now_iso()
    doc = payload.model_dump()
    doc["created_at"] = now
    doc["updated_at"] = now
    inserted = _collection(MODELS_COLLECTION).insert_one(doc)
    created = _collection(MODELS_COLLECTION).find_one({"_id": inserted.inserted_id})
    if not created:
        raise RuntimeError("Failed to create model.")
    return _as_model(created)


def update_model(item_id: str, payload: CatalogModelUpdate) -> CatalogModel:
    _ensure_catalog_indexes()
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise ValueError("No fields provided for update.")
    updates["updated_at"] = _now_iso()
    result = _collection(MODELS_COLLECTION).find_one_and_update(
        _to_id_filter(item_id),
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise ValueError("Model not found.")
    return _as_model(result)


def delete_model(item_id: str) -> bool:
    _ensure_catalog_indexes()
    deleted = _collection(MODELS_COLLECTION).delete_one(_to_id_filter(item_id))
    return deleted.deleted_count > 0


def list_dataset_categories() -> List[DatasetCategory]:
    _ensure_catalog_indexes()
    cursor = _collection(DATASET_CATEGORIES_COLLECTION).find().sort("created_at", -1)
    return [_as_dataset_category(doc) for doc in cursor]


def create_dataset_category(payload: DatasetCategoryCreate) -> DatasetCategory:
    _ensure_catalog_indexes()
    now = _now_iso()
    doc = payload.model_dump()
    doc["created_at"] = now
    doc["updated_at"] = now
    try:
        inserted = _collection(DATASET_CATEGORIES_COLLECTION).insert_one(doc)
    except Exception as exc:
        raise ValueError("Dataset category with this name already exists.") from exc
    created = _collection(DATASET_CATEGORIES_COLLECTION).find_one(
        {"_id": inserted.inserted_id},
    )
    if not created:
        raise RuntimeError("Failed to create dataset category.")
    return _as_dataset_category(created)


def update_dataset_category(
    item_id: str,
    payload: DatasetCategoryUpdate,
) -> DatasetCategory:
    _ensure_catalog_indexes()
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise ValueError("No fields provided for update.")
    updates["updated_at"] = _now_iso()
    try:
        result = _collection(DATASET_CATEGORIES_COLLECTION).find_one_and_update(
            _to_id_filter(item_id),
            {"$set": updates},
            return_document=ReturnDocument.AFTER,
        )
    except Exception as exc:
        raise ValueError("Dataset category with this name already exists.") from exc
    if not result:
        raise ValueError("Dataset category not found.")
    return _as_dataset_category(result)


def delete_dataset_category(item_id: str) -> bool:
    _ensure_catalog_indexes()
    deleted = _collection(DATASET_CATEGORIES_COLLECTION).delete_one(_to_id_filter(item_id))
    return deleted.deleted_count > 0


def list_languages() -> List[Language]:
    _ensure_catalog_indexes()
    cursor = _collection(LANGUAGES_COLLECTION).find().sort("created_at", -1)
    return [_as_language(doc) for doc in cursor]


def create_language(payload: LanguageCreate) -> Language:
    _ensure_catalog_indexes()
    now = _now_iso()
    doc = payload.model_dump()
    doc["code"] = doc["code"].lower()
    doc["created_at"] = now
    doc["updated_at"] = now
    try:
        inserted = _collection(LANGUAGES_COLLECTION).insert_one(doc)
    except Exception as exc:
        raise ValueError("Language code already exists.") from exc
    created = _collection(LANGUAGES_COLLECTION).find_one({"_id": inserted.inserted_id})
    if not created:
        raise RuntimeError("Failed to create language.")
    return _as_language(created)


def update_language(item_id: str, payload: LanguageUpdate) -> Language:
    _ensure_catalog_indexes()
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise ValueError("No fields provided for update.")
    if "code" in updates:
        updates["code"] = str(updates["code"]).lower()
    updates["updated_at"] = _now_iso()
    try:
        result = _collection(LANGUAGES_COLLECTION).find_one_and_update(
            _to_id_filter(item_id),
            {"$set": updates},
            return_document=ReturnDocument.AFTER,
        )
    except Exception as exc:
        raise ValueError("Language code already exists.") from exc
    if not result:
        raise ValueError("Language not found.")
    return _as_language(result)


def delete_language(item_id: str) -> bool:
    _ensure_catalog_indexes()
    deleted = _collection(LANGUAGES_COLLECTION).delete_one(_to_id_filter(item_id))
    return deleted.deleted_count > 0
