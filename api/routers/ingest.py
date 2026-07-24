from fastapi import APIRouter, File, HTTPException, UploadFile

from api.schemas.ingest import IngestRequest, IngestResponse
from api.services.ingest_service import run_ingest, save_upload

router = APIRouter()


@router.post("/run", response_model=IngestResponse)
def ingest_documents(body: IngestRequest):
    """Load PDF, discover topics, chunk, embed, and upsert vectors into Pinecone."""
    try:
        result = run_ingest(body.pdf_path)
        return IngestResponse(status="completed", **result)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/upload", response_model=IngestResponse)
async def ingest_upload(file: UploadFile = File(...)):
    """Upload any PDF, discover its domain/topics, and ingest into Pinecone."""
    try:
        if not file.filename:
            raise ValueError("Missing filename")
        content = await file.read()
        if not content:
            raise ValueError("Empty file")
        relative_path = save_upload(file.filename, content)
        result = run_ingest(relative_path)
        return IngestResponse(status="completed", **result)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
