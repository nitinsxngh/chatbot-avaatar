"""Schemas for model, dataset category, and language catalogs."""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


ModelKind = Literal["model", "embedding"]


class CatalogModelBase(BaseModel):
    name: str = Field(min_length=1)
    dataset_category: str = Field(min_length=1)
    kind: ModelKind = "model"
    launch_date: str = Field(min_length=1)
    enabled: bool = True


class CatalogModelCreate(CatalogModelBase):
    pass


class CatalogModelUpdate(BaseModel):
    name: Optional[str] = None
    dataset_category: Optional[str] = None
    kind: Optional[ModelKind] = None
    launch_date: Optional[str] = None
    enabled: Optional[bool] = None


class CatalogModel(CatalogModelBase):
    id: str
    created_at: str
    updated_at: str


class DatasetCategoryBase(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    enabled: bool = True


class DatasetCategoryCreate(DatasetCategoryBase):
    pass


class DatasetCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None


class DatasetCategory(DatasetCategoryBase):
    id: str
    created_at: str
    updated_at: str


class LanguageBase(BaseModel):
    name: str = Field(min_length=1)
    code: str = Field(min_length=2)
    native_name: str = ""
    enabled: bool = True


class LanguageCreate(LanguageBase):
    pass


class LanguageUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    native_name: Optional[str] = None
    enabled: Optional[bool] = None


class Language(LanguageBase):
    id: str
    created_at: str
    updated_at: str


class CatalogListResponse(BaseModel):
    models: List[CatalogModel] = Field(default_factory=list)
    dataset_categories: List[DatasetCategory] = Field(default_factory=list)
    languages: List[Language] = Field(default_factory=list)
