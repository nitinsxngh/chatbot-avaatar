from typing import List, Optional

import chatbot
from api.schemas.chat import ChatResponse, ChatTrace, HistoryMessage, HistoryResponse


def _ensure_ready() -> None:
    if not chatbot.PINECONE_API_KEY or chatbot.vector_store is None:
        raise RuntimeError(
            "Pinecone is not configured. Set PINECONE_API_KEY and run ingest first."
        )
    try:
        chatbot.mongo_client.admin.command("ping")
    except Exception as exc:
        raise RuntimeError(f"MongoDB connection failed: {exc}") from exc


def _to_chat_response(result: dict) -> ChatResponse:
    trace_data = result.get("trace")
    trace = ChatTrace(**trace_data) if trace_data else None
    return ChatResponse(
        answer=result["answer"],
        session_id=result["session_id"],
        intent=result.get("intent"),
        route=result.get("route"),
        band=result.get("band"),
        latency_ms=result.get("latency_ms"),
        confidence_score=result.get("confidence_score"),
        flashrank_score=result.get("flashrank_score"),
        pinecone_score=result.get("pinecone_score"),
        search_query=result.get("search_query"),
        pages=result.get("pages") or [],
        topics=result.get("topics") or [],
        security_blocked=bool(result.get("security_blocked")),
        trace=trace,
    )


def send_message(message: str, session_id: Optional[str] = None) -> ChatResponse:
    _ensure_ready()
    sid = session_id or chatbot.SESSION_ID
    result = chatbot.ask(message, session_id=sid, return_meta=True)
    return _to_chat_response(result)


def stream_message(message: str, session_id: Optional[str] = None):
    """Yield SSE-ready dict events from ask_stream."""
    _ensure_ready()
    sid = session_id or chatbot.SESSION_ID
    for event in chatbot.ask_stream(message, session_id=sid):
        if event.get("type") == "done" and "response" in event:
            response = _to_chat_response(event["response"])
            yield {
                "type": "done",
                "response": response.model_dump(),
            }
        else:
            yield event


def get_session_history(session_id: Optional[str] = None) -> HistoryResponse:
    sid = session_id or chatbot.SESSION_ID
    messages = chatbot.load_history(sid)
    payload = []
    for msg in messages:
        role = "human" if msg.__class__.__name__ == "HumanMessage" else "ai"
        payload.append(HistoryMessage(role=role, content=msg.content))
    return HistoryResponse(session_id=sid, messages=payload)


def clear_session_history(session_id: Optional[str] = None) -> str:
    sid = session_id or chatbot.SESSION_ID
    chatbot.mongo_collection.delete_one({"session_id": sid})
    if sid == chatbot.SESSION_ID:
        chatbot.chat_history.clear()
    return sid


def list_sessions() -> List[str]:
    sessions = chatbot.mongo_collection.distinct("session_id")
    return sorted(s for s in sessions if s)
