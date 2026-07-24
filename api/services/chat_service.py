from datetime import datetime, timezone
from typing import List, Optional

import chatbot
from api.schemas.chat import ChatResponse, ChatTrace, HistoryMessage, HistoryResponse
from utils.session_store import list_session_names, normalize_session_name


def _resolve_session_name(
    session_name: Optional[str] = None,
    session_id: Optional[str] = None,
) -> str:
    return normalize_session_name(
        session_name or session_id,
        fallback=chatbot.SESSION_ID,
    )


def _ensure_ready() -> None:
    store = chatbot.get_vector_store()
    if not chatbot.PINECONE_API_KEY or store is None:
        raise RuntimeError(
            "Pinecone is not configured or unreachable. "
            "Check PINECONE_API_KEY, network, and that ingest has been run."
        )
    try:
        chatbot.mongo_client.admin.command("ping")
    except Exception as exc:
        raise RuntimeError(f"MongoDB connection failed: {exc}") from exc


def _to_chat_response(result: dict) -> ChatResponse:
    trace_data = result.get("trace")
    trace = ChatTrace(**trace_data) if trace_data else None
    name = result.get("session_name") or result.get("session_id") or chatbot.SESSION_ID
    return ChatResponse(
        answer=result["answer"],
        session_name=name,
        session_id=name,
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


def send_message(
    message: str,
    session_name: Optional[str] = None,
    session_id: Optional[str] = None,
) -> ChatResponse:
    _ensure_ready()
    name = _resolve_session_name(session_name, session_id)
    result = chatbot.ask(message, session_name=name, return_meta=True)
    return _to_chat_response(result)


def stream_message(
    message: str,
    session_name: Optional[str] = None,
    session_id: Optional[str] = None,
):
    """Yield SSE-ready dict events from ask_stream."""
    _ensure_ready()
    name = _resolve_session_name(session_name, session_id)
    for event in chatbot.ask_stream(message, session_name=name):
        if event.get("type") == "done" and "response" in event:
            response = _to_chat_response(event["response"])
            yield {
                "type": "done",
                "response": response.model_dump(),
            }
        else:
            yield event


def get_session_history(
    session_name: Optional[str] = None,
    session_id: Optional[str] = None,
) -> HistoryResponse:
    name = _resolve_session_name(session_name, session_id)
    messages = chatbot.load_history(name)
    payload = []
    for msg in messages:
        role = "human" if msg.__class__.__name__ == "HumanMessage" else "ai"
        payload.append(HistoryMessage(role=role, content=msg.content))
    return HistoryResponse(session_name=name, session_id=name, messages=payload)


def clear_session_history(
    session_name: Optional[str] = None,
    session_id: Optional[str] = None,
) -> str:
    """Clear messages for a session but keep session_name + config."""
    name = _resolve_session_name(session_name, session_id)
    chatbot.mongo_collection.update_one(
        {"session_name": name},
        {
            "$set": {
                "messages": [],
                "session_id": name,
                "updated_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )
    if name == normalize_session_name(chatbot.SESSION_ID):
        chatbot.chat_history.clear()
    return name


def list_sessions() -> List[str]:
    return list_session_names(chatbot.mongo_collection)
