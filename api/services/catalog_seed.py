"""Seed data for catalog collections (models, embeddings, dataset categories)."""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

from api.schemas.catalog import (
    CatalogModelCreate,
    DatasetCategoryCreate,
    LanguageCreate,
)
from api.services.catalog_service import (
    create_dataset_category,
    create_language,
    create_model,
    list_dataset_categories,
    list_languages,
    list_models,
)


SEED_DATASET_CATEGORIES: List[Dict[str, Any]] = [
    {
        "name": "General RAG",
        "description": "Default general-purpose knowledge and Q&A corpora.",
        "enabled": True,
    },
    {
        "name": "Legal",
        "description": "Contracts, policies, regulations, and legal reference material.",
        "enabled": True,
    },
    {
        "name": "Medical",
        "description": "Clinical notes, guidelines, and healthcare knowledge bases.",
        "enabled": True,
    },
    {
        "name": "Finance",
        "description": "Banking, accounting, investments, and financial reports.",
        "enabled": True,
    },
    {
        "name": "Insurance",
        "description": "Policies, claims, underwriting, and insurance product docs.",
        "enabled": True,
    },
    {
        "name": "HR",
        "description": "People ops, benefits, employee handbooks, and hiring content.",
        "enabled": True,
    },
    {
        "name": "Customer Support",
        "description": "Help center articles, FAQs, and support playbooks.",
        "enabled": True,
    },
    {
        "name": "Technical Docs",
        "description": "APIs, engineering docs, architecture, and developer guides.",
        "enabled": True,
    },
    {
        "name": "Product",
        "description": "Product specs, release notes, and feature documentation.",
        "enabled": True,
    },
    {
        "name": "Sales",
        "description": "Sales enablement, pitch decks, and CRM knowledge.",
        "enabled": True,
    },
    {
        "name": "Marketing",
        "description": "Campaigns, brand guidelines, and content marketing assets.",
        "enabled": True,
    },
    {
        "name": "Education",
        "description": "Courses, training materials, and academic content.",
        "enabled": True,
    },
    {
        "name": "Research",
        "description": "Papers, studies, and research notes.",
        "enabled": True,
    },
    {
        "name": "Compliance",
        "description": "Audit, risk, and regulatory compliance documents.",
        "enabled": True,
    },
    {
        "name": "Real Estate",
        "description": "Property listings, leases, and real-estate operations.",
        "enabled": True,
    },
    {
        "name": "E-commerce",
        "description": "Catalog, policies, and order/fulfillment knowledge.",
        "enabled": True,
    },
    {
        "name": "Government",
        "description": "Public sector policies, forms, and civic information.",
        "enabled": True,
    },
    {
        "name": "Media",
        "description": "News archives, transcripts, and media content libraries.",
        "enabled": True,
    },
    {
        "name": "Embeddings",
        "description": "Vector/embedding evaluation and retrieval datasets.",
        "enabled": True,
    },
    {
        "name": "Multilingual",
        "description": "Cross-language and localization corpora.",
        "enabled": True,
    },
]


# Comprehensive OpenAI chat / reasoning model catalog
SEED_CHAT_MODELS: List[Dict[str, Any]] = [
    {"name": "gpt-4o-mini", "launch_date": "2024-07-18", "enabled": True},
    {"name": "gpt-4o", "launch_date": "2024-05-13", "enabled": True},
    {"name": "gpt-4.1", "launch_date": "2025-04-14", "enabled": True},
    {"name": "gpt-4.1-mini", "launch_date": "2025-04-14", "enabled": True},
    {"name": "gpt-4.1-nano", "launch_date": "2025-04-14", "enabled": True},
    {"name": "gpt-4-turbo", "launch_date": "2024-04-09", "enabled": True},
    {"name": "gpt-4", "launch_date": "2023-03-14", "enabled": False},
    {"name": "gpt-3.5-turbo", "launch_date": "2023-03-01", "enabled": False},
    {"name": "o1", "launch_date": "2024-12-05", "enabled": True},
    {"name": "o1-mini", "launch_date": "2024-09-12", "enabled": True},
    {"name": "o1-pro", "launch_date": "2025-03-19", "enabled": False},
    {"name": "o3", "launch_date": "2025-04-16", "enabled": True},
    {"name": "o3-mini", "launch_date": "2025-01-31", "enabled": True},
    {"name": "o4-mini", "launch_date": "2025-04-16", "enabled": True},
    {"name": "chatgpt-4o-latest", "launch_date": "2024-08-06", "enabled": False},
]


SEED_EMBEDDING_MODELS: List[Dict[str, Any]] = [
    {
        "name": "text-embedding-3-small",
        "launch_date": "2024-01-25",
        "enabled": True,
        "dataset_category": "Embeddings",
    },
    {
        "name": "text-embedding-3-large",
        "launch_date": "2024-01-25",
        "enabled": True,
        "dataset_category": "Embeddings",
    },
    {
        "name": "text-embedding-ada-002",
        "launch_date": "2022-12-15",
        "enabled": False,
        "dataset_category": "Embeddings",
    },
]


SEED_LANGUAGES: List[Dict[str, Any]] = [
    {"name": "English", "code": "en", "native_name": "English", "enabled": True},
    {"name": "Hindi", "code": "hi", "native_name": "हिन्दी", "enabled": True},
    {"name": "Spanish", "code": "es", "native_name": "Español", "enabled": True},
    {"name": "French", "code": "fr", "native_name": "Français", "enabled": True},
    {"name": "German", "code": "de", "native_name": "Deutsch", "enabled": True},
    {"name": "Portuguese", "code": "pt", "native_name": "Português", "enabled": True},
    {"name": "Arabic", "code": "ar", "native_name": "العربية", "enabled": True},
    {"name": "Chinese", "code": "zh", "native_name": "中文", "enabled": True},
    {"name": "Japanese", "code": "ja", "native_name": "日本語", "enabled": True},
    {"name": "Korean", "code": "ko", "native_name": "한국어", "enabled": True},
    {"name": "Italian", "code": "it", "native_name": "Italiano", "enabled": True},
    {"name": "Russian", "code": "ru", "native_name": "Русский", "enabled": True},
    {"name": "Bengali", "code": "bn", "native_name": "বাংলা", "enabled": True},
    {"name": "Tamil", "code": "ta", "native_name": "தமிழ்", "enabled": True},
    {"name": "Telugu", "code": "te", "native_name": "తెలుగు", "enabled": True},
    {"name": "Marathi", "code": "mr", "native_name": "मराठी", "enabled": True},
    {"name": "Gujarati", "code": "gu", "native_name": "ગુજરાતી", "enabled": True},
    {"name": "Punjabi", "code": "pa", "native_name": "ਪੰਜਾਬੀ", "enabled": True},
    {"name": "Urdu", "code": "ur", "native_name": "اردو", "enabled": True},
    {"name": "Dutch", "code": "nl", "native_name": "Nederlands", "enabled": False},
    {"name": "Turkish", "code": "tr", "native_name": "Türkçe", "enabled": False},
    {"name": "Vietnamese", "code": "vi", "native_name": "Tiếng Việt", "enabled": False},
    {"name": "Thai", "code": "th", "native_name": "ไทย", "enabled": False},
    {"name": "Indonesian", "code": "id", "native_name": "Bahasa Indonesia", "enabled": False},
]


def seed_catalog(force: bool = False) -> Dict[str, Any]:
    """
    Idempotent seed of dataset categories, models, and languages.

    If force=False, skips items that already exist by name/code.
    """
    existing_categories = {c.name.lower(): c for c in list_dataset_categories()}
    created_categories = 0
    skipped_categories = 0

    for item in SEED_DATASET_CATEGORIES:
        key = item["name"].lower()
        if not force and key in existing_categories:
            skipped_categories += 1
            continue
        try:
            create_dataset_category(DatasetCategoryCreate(**item))
            created_categories += 1
            existing_categories[key] = True  # type: ignore[assignment]
        except ValueError:
            skipped_categories += 1

    existing_models = {m.name.lower(): m for m in list_models()}
    created_models = 0
    skipped_models = 0

    model_rows: List[Tuple[str, Dict[str, Any]]] = [
        ("model", row) for row in SEED_CHAT_MODELS
    ] + [("embedding", row) for row in SEED_EMBEDDING_MODELS]

    for kind, row in model_rows:
        key = row["name"].lower()
        if not force and key in existing_models:
            skipped_models += 1
            continue
        payload = CatalogModelCreate(
            name=row["name"],
            kind=kind,  # type: ignore[arg-type]
            dataset_category=row.get("dataset_category", "General RAG"),
            launch_date=row["launch_date"],
            enabled=bool(row.get("enabled", True)),
        )
        try:
            create_model(payload)
            created_models += 1
            existing_models[key] = True  # type: ignore[assignment]
        except ValueError:
            skipped_models += 1

    existing_languages = {l.code.lower(): l for l in list_languages()}
    created_languages = 0
    skipped_languages = 0

    for item in SEED_LANGUAGES:
        key = item["code"].lower()
        if not force and key in existing_languages:
            skipped_languages += 1
            continue
        try:
            create_language(LanguageCreate(**item))
            created_languages += 1
            existing_languages[key] = True  # type: ignore[assignment]
        except ValueError:
            skipped_languages += 1

    return {
        "dataset_categories": {
            "created": created_categories,
            "skipped": skipped_categories,
            "total": len(list_dataset_categories()),
        },
        "models": {
            "created": created_models,
            "skipped": skipped_models,
            "total": len(list_models()),
            "chat_seed_count": len(SEED_CHAT_MODELS),
            "embedding_seed_count": len(SEED_EMBEDDING_MODELS),
        },
        "languages": {
            "created": created_languages,
            "skipped": skipped_languages,
            "total": len(list_languages()),
            "seed_count": len(SEED_LANGUAGES),
        },
    }
