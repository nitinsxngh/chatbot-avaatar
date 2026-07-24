from fastapi import APIRouter, HTTPException

from api.schemas.ingest import IngestRequest, IngestResponse
from api.services.ingest_service import run_ingest

router = APIRouter()


@router.post("/run", response_model=IngestResponse)
def ingest_documents(body: IngestRequest):
    """Load PDF, chunk, embed, and upsert vectors into Pinecone."""
    try:
        result = run_ingest(body.pdf_path)
        return IngestResponse(status="completed", **result)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
