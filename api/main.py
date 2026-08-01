"""FastAPI application for Chatbot Avatar."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import chat, config, flow, ingest

app = FastAPI(
    title="Chatbot Avatar API",
    description="Ingest, config, and chat endpoints for the RAG chatbot",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/api/ingest", tags=["Ingest"])
app.include_router(config.router, prefix="/api/config", tags=["Config"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(flow.router, prefix="/api/flow", tags=["Flow"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
