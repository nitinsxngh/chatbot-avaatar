from pathlib import Path
from typing import List, Optional

import ingest
from api.schemas.data_collection import DataCollection, DataCollectionCreate
from api.services import data_collection_service as collections

UPLOADS_DIR = Path(__file__).resolve().parents[2] / "Documents" / "uploads"


def _collect_paths(
    pdf_path: Optional[str] = None,
    pdf_paths: Optional[List[str]] = None,
) -> List[str]:
    if pdf_paths:
        return [p for p in pdf_paths if p and str(p).strip()]
    if pdf_path and str(pdf_path).strip():
        return [pdf_path]
    return []


def clear_namespace(namespace: str) -> None:
    ingest.clear_namespace(namespace)


def run_ingest(
    pdf_path: Optional[str] = None,
    pdf_paths: Optional[List[str]] = None,
    replace_all: bool = False,
    collection_id: Optional[str] = None,
    create_collection: Optional[DataCollectionCreate] = None,
    replace_namespace: bool = False,
) -> dict:
    """
    Run ingest scoped to a data collection namespace.

    - create_collection: create a new Mongo collection + namespace, then ingest
    - collection_id: update an existing collection namespace
    - replace_namespace: clear the collection namespace before upsert
    """
    collection: Optional[DataCollection] = None

    if create_collection is not None:
        collection = collections.create_collection(create_collection)
    elif collection_id:
        collection = collections.get_collection(collection_id)

    namespace = collection.namespace if collection else ""
    paths = _collect_paths(pdf_path, pdf_paths)
    clear_before = replace_namespace or (replace_all and not collection)

    if not paths:
        result = ingest.ingest(replace_all=clear_before, namespace=namespace)
    elif len(paths) == 1:
        result = ingest.ingest(
            pdf_path=paths[0],
            replace_all=clear_before,
            namespace=namespace,
        )
    else:
        result = ingest.ingest(
            pdf_paths=paths,
            replace_all=clear_before,
            namespace=namespace,
        )

    if collection is not None:
        source_files = [
            Path(p).name
            for p in (result.get("pdf_paths") or [result.get("pdf_path") or ""])
            if p
        ]
        updated = collections.record_ingest_stats(
            collection.id,
            document_count=int(result.get("document_count") or 0),
            pages=int(result.get("pages") or 0),
            chunks=int(result.get("chunks") or 0),
            document_title=result.get("document_title"),
            domain=result.get("domain"),
            topics=result.get("topics") or {},
            source_files=source_files,
            append_sources=not clear_before,
        )
        result["collection"] = updated.model_dump()
        result["collection_id"] = updated.id
        result["namespace"] = updated.namespace
    else:
        result.setdefault("namespace", namespace)
        result.setdefault("collection_id", None)
        result.setdefault("collection", None)

    return result


def save_upload(filename: str, content: bytes) -> str:
    """Save an uploaded PDF under Documents/uploads and return relative path."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = Path(filename).name
    if not safe_name.lower().endswith(".pdf"):
        raise ValueError("Only PDF uploads are supported")
    target = UPLOADS_DIR / safe_name
    target.write_bytes(content)
    return str(Path("Documents") / "uploads" / safe_name)


def save_uploads(files: List[tuple]) -> List[str]:
    """Save multiple uploads; each item is (filename, content bytes)."""
    return [save_upload(name, content) for name, content in files]
