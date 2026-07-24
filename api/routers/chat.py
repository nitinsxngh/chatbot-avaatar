import json
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from api.schemas.chat import (
    ChatRequest,
    ChatResponse,
    HistoryResponse,
    SessionsResponse,
)
from api.services.chat_service import (
    clear_session_history,
    get_session_history,
    list_sessions,
    send_message,
    stream_message,
)

router = APIRouter()


@router.post("", response_model=ChatResponse)
def chat(body: ChatRequest):
    """Send a message and receive a chatbot response."""
    try:
        return send_message(
            body.message,
            session_name=body.session_name,
            session_id=body.session_id,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/stream")
def chat_stream(body: ChatRequest):
    """
    Stream chatbot progress + answer tokens via Server-Sent Events.

    Event types: status | token | done | error
    """

    def event_generator():
        try:
            for event in stream_message(
                body.message,
                session_name=body.session_name,
                session_id=body.session_id,
            ):
                payload = json.dumps(event, default=str)
                yield f"data: {payload}\n\n"
        except Exception as exc:
            err = json.dumps({"type": "error", "message": str(exc)})
            yield f"data: {err}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history", response_model=HistoryResponse)
def history(
    session_name: Optional[str] = Query(default=None),
    session_id: Optional[str] = Query(default=None),
):
    """Load chat history for a session (keyed by session_name)."""
    return get_session_history(session_name=session_name, session_id=session_id)


@router.delete("/history")
def delete_history(
    session_name: Optional[str] = Query(default=None),
    session_id: Optional[str] = Query(default=None),
):
    """Clear chat history for a session (config is preserved)."""
    cleared = clear_session_history(session_name=session_name, session_id=session_id)
    return {"session_name": cleared, "session_id": cleared, "cleared": True}


@router.get("/sessions", response_model=SessionsResponse)
def sessions():
    """List known chat session names from MongoDB."""
    return {"sessions": list_sessions()}
