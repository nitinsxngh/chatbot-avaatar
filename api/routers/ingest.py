from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from api.schemas.data_collection import DataCollectionCreate
from api.schemas.ingest import IngestRequest, IngestResponse
from api.services.ingest_service import run_ingest, save_upload, save_uploads

router = APIRouter()


def _parse_create_collection(
    name: Optional[str],
    description: Optional[str],
    namespace: Optional[str],
) -> Optional[DataCollectionCreate]:
    if not name or not name.strip():
        return None
    return DataCollectionCreate(
        name=name.strip(),
        description=(description or "").strip(),
        namespace=(namespace or None),
        enabled=True,
    )


@router.post("/run", response_model=IngestResponse)
def ingest_documents(body: IngestRequest):
    """Parse PDF(s) into a data collection namespace (create or update)."""
    try:
        result = run_ingest(
            pdf_path=body.pdf_path,
            pdf_paths=body.pdf_paths,
            replace_all=body.replace_all,
            collection_id=body.collection_id,
            create_collection=body.create_collection,
            replace_namespace=body.replace_namespace,
        )
        return IngestResponse(status="completed", **result)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/upload", response_model=IngestResponse)
async def ingest_upload(
    file: UploadFile = File(...),
    collection_id: Optional[str] = Form(default=None),
    collection_name: Optional[str] = Form(default=None),
    collection_description: Optional[str] = Form(default=None),
    collection_namespace: Optional[str] = Form(default=None),
    replace_namespace: bool = Form(default=False),
):
    """Upload a single PDF into an existing or new data collection."""
    try:
        if not file.filename:
            raise ValueError("Missing filename")
        content = await file.read()
        if not content:
            raise ValueError("Empty file")
        relative_path = save_upload(file.filename, content)
        result = run_ingest(
            pdf_path=relative_path,
            replace_all=False,
            collection_id=collection_id,
            create_collection=_parse_create_collection(
                collection_name,
                collection_description,
                collection_namespace,
            ),
            replace_namespace=replace_namespace,
        )
        return IngestResponse(status="completed", **result)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/upload/batch", response_model=IngestResponse)
async def ingest_upload_batch(
    files: List[UploadFile] = File(...),
    collection_id: Optional[str] = Form(default=None),
    collection_name: Optional[str] = Form(default=None),
    collection_description: Optional[str] = Form(default=None),
    collection_namespace: Optional[str] = Form(default=None),
    replace_namespace: bool = Form(default=False),
):
    """Upload multiple PDFs into an existing or new data collection namespace."""
    try:
        if not files:
            raise ValueError("No files provided")

        uploads: List[tuple] = []
        for file in files:
            if not file.filename:
                continue
            content = await file.read()
            if not content:
                continue
            uploads.append((file.filename, content))

        if not uploads:
            raise ValueError("No valid PDF files in upload")

        relative_paths = save_uploads(uploads)
        result = run_ingest(
            pdf_paths=relative_paths,
            replace_all=False,
            collection_id=collection_id,
            create_collection=_parse_create_collection(
                collection_name,
                collection_description,
                collection_namespace,
            ),
            replace_namespace=replace_namespace,
        )
        return IngestResponse(status="completed", **result)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
