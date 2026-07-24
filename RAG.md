# RAG System Documentation

Complete reference for the Chatbot Avatar RAG stack: ingest → vectors → intent → retrieval → answer → UI.

This document covers the **entire codebase** — Python core, FastAPI, Next.js app, config, security, streaming, and data stores.

---

## Table of contents

1. [Overview](#1-overview)
2. [Repository layout](#2-repository-layout)
3. [Architecture](#3-architecture)
4. [Setup & run](#4-setup--run)
5. [Ingest pipeline](#5-ingest-pipeline)
6. [Chat / RAG pipeline](#6-chat--rag-pipeline)
7. [Streaming](#7-streaming)
8. [FastAPI backend](#8-fastapi-backend)
9. [Next.js frontend](#9-nextjs-frontend)
10. [Configuration](#10-configuration)
11. [Metadata & filtering](#11-metadata--filtering)
12. [MongoDB memory & logs](#12-mongodb-memory--logs)
13. [Security](#13-security)
14. [Key functions & objects](#14-key-functions--objects)
15. [Sessions](#15-sessions)
16. [Troubleshooting](#16-troubleshooting)
17. [Version history](#17-version-history)

---

## 1. Overview

**What it is:** A digital-marketing RAG assistant that answers from a PDF knowledge base (Pinecone), remembers conversation in MongoDB, and exposes a web UI (Next.js) plus CLI.

**Stack:**

| Layer | Tech |
|---|---|
| LLM | OpenAI `gpt-4o-mini` (LangChain) |
| Embeddings | `text-embedding-3-small` |
| Vector DB | Pinecone (cosine, 1536-dim) |
| Reranker | Flashrank `ms-marco-TinyBERT-L-2-v2` |
| Memory / logs | MongoDB |
| API | FastAPI + Uvicorn |
| UI | Next.js 15 + Tailwind (Apple-inspired light UI) |

**High-level flow:**

```
PDF → chunk + metadata → embed → Pinecone
                                      ↓
User message → sanitize → intent → [chat | followup | document]
                                      ↓ document
                         rewrite → Pinecone (+ filter) → Flashrank
                                      ↓
                         high / mid / low → stream answer / clarify / refuse
                                      ↓
                         Mongo memory + chat_logs + Response panel
```

---

## 2. Repository layout

```
Chatbot-Avatar/
├── chatbot.py              # Core RAG engine (ask, ask_stream, CLI)
├── ingest.py               # PDF → Pinecone ingest
├── requirements.txt
├── .env / .env.example
├── README.md               # Quick start
├── RAG.md                  # This document
│
├── utils/
│   ├── metadata_utils.py   # Topics, page filters, chunk enrich
│   └── settings.py         # Config registry (.env read/write/reset)
│
├── api/                    # FastAPI
│   ├── main.py
│   ├── routers/            # ingest, config, chat
│   ├── schemas/            # Pydantic models
│   └── services/           # Thin wrappers over ingest/chatbot
│
├── App/                    # Next.js UI
│   ├── app/rag/            # Main 3-panel page
│   ├── app/ingest/
│   ├── components/         # ChatPanel, ConfigPanel, ResponsePanel, Nav
│   └── lib/api.ts          # Frontend API client (+ SSE stream)
│
├── Documents/              # Source PDFs
├── scripts/run-api.sh
├── Versions/               # Snapshots (v1, v2, v3)
├── .cache/flashrank/       # Durable Flashrank ONNX models
└── vector_db/              # Legacy local FAISS (not used by current path)
```

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser  http://localhost:3000                             │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ Settings │  │ RAG Chat     │  │ Response (debug)    │   │
│  │ panel    │  │ + streaming  │  │ intent/scores/logs  │   │
│  └────┬─────┘  └──────┬───────┘  └──────────▲──────────┘   │
└───────┼───────────────┼─────────────────────┼──────────────┘
        │               │ SSE / REST          │
        ▼               ▼                     │
┌─────────────────────────────────────────────┴──────────────┐
│  FastAPI  http://localhost:8000                            │
│  /api/config  /api/chat(/stream)  /api/ingest/run          │
└───────────┬─────────────────┬──────────────────┬───────────┘
            │                 │                  │
            ▼                 ▼                  ▼
     utils/settings      chatbot.py         ingest.py
            │                 │                  │
            ▼                 ├─► Pinecone       ├─► Pinecone
         .env                 ├─► Flashrank      └─► OpenAI emb.
                              ├─► OpenAI LLM
                              └─► MongoDB
```

---

## 4. Setup & run

### Prerequisites

- Python 3.9+
- Node.js 18+
- MongoDB running locally (or remote URI)
- OpenAI + Pinecone API keys

### Backend

```bash
cd Chatbot-Avatar
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill keys
```

### Ingest PDF (once, or after PDF/metadata changes)

```bash
python ingest.py
# or use UI: /ingest → Run ingest
```

### API

```bash
uvicorn api.main:app --reload --port 8000
# or: ./scripts/run-api.sh
```

Health: `GET http://localhost:8000/api/health`

### Frontend

```bash
cd App
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

Open: [http://localhost:3000/rag](http://localhost:3000/rag)

### CLI-only chatbot

```bash
python chatbot.py
```

You need **API + frontend** for the web UI. CLI does not require Next.js.

---

## 5. Ingest pipeline

**File:** `ingest.py`

### Steps

1. Load PDF (`PyPDFLoader`)
2. Split: `RecursiveCharacterTextSplitter` (`CHUNK_SIZE=1000`, `CHUNK_OVERLAP=200`)
3. Enrich each chunk via `enrich_chunk_metadata()`:
   - `page_number` (1-based)
   - `primary_topic` / `topics`
   - `source`, `title`, `author` (when present)
4. Ensure Pinecone index exists (create serverless if missing)
5. `delete_all` on index (clean re-ingest)
6. Embed + upsert with `PineconeVectorStore.from_documents`

### API

`POST /api/ingest/run`

```json
{ "pdf_path": "Documents/your-file.pdf" }
```

Response includes `pages`, `chunks`, `index_name`, `topic_distribution`.

### Defaults

| Setting | Default |
|---|---|
| `PDF_PATH` | Digital marketing strategy PDF under `Documents/` |
| `CHUNK_SIZE` | 1000 |
| `CHUNK_OVERLAP` | 200 |
| `EMBEDDING_MODEL` | `text-embedding-3-small` |
| `EMBEDDING_DIMENSION` | 1536 |
| `PINECONE_CLOUD` / `REGION` | `aws` / `us-east-1` |

---

## 6. Chat / RAG pipeline

**File:** `chatbot.py` — entry points `ask()` and `ask_stream()`

### Step-by-step (`ask` / `ask_stream`)

1. **Sanitize** — trim, strip nulls, cap `MAX_USER_MESSAGE_CHARS` (2000)
2. **Injection gate** — `looks_like_injection()` → fixed refuse + log
3. **Wrap** — `wrap_untrusted()` for delimiter safety
4. **Intent** — `classify_intent()` → `chat` | `followup` | `document`
   - Personal-memory regex fast path → always `chat`
5. **If not document** → `chat_chain` (history only)
6. **If document:**
   - `rewrite_search_query()` (standalone query from history)
   - Loop up to `MAX_RETRIEVAL_ATTEMPTS` (2):
     - `build_metadata_filter()` → Pinecone search (`RETRIEVE_K=10`)
     - Empty filter results → fallback search without filter
     - Flashrank keep top `RERANK_TOP_N=3`
     - `effective_confidence()` → band
     - If still **low** → `broaden_search_query()` and retry
   - Keep best attempt
7. **Band action:**
   - **high** → `rag_chain` (answer from context)
   - **mid** → `clarify_chain` (“Did you mean…?”)
   - **low** → `LOW_CONFIDENCE_REPLY`
8. **Remember** turn in Mongo + **log_turn** to `chat_logs`

### Confidence bands

| Band | Condition (simplified) | Result |
|---|---|---|
| high | score ≥ 0.70 (Flashrank scale) | Full RAG answer |
| mid | score ≥ 0.45 | Clarifying question |
| low | below mid | Fixed refuse |

**Dual scoring:** Prefer Flashrank. If Flashrank &lt; `0.05` (unreliable), map Pinecone similarity onto the Flashrank band scale using `PINECONE_HIGH/MID_THRESHOLD`.

### Intent labels

| Intent | Uses docs? | Typical use |
|---|---|---|
| `chat` | No | Greetings, small talk, personal memory |
| `followup` | No | Clarify previous answer from history |
| `document` | Yes | Questions needing the PDF |

### Routes (logged / shown in UI)

| Route | Meaning |
|---|---|
| `CHAT` | Normal chat |
| `RAG_HIGH` | Document answer |
| `RAG_MID` | Clarifying question |
| `RAG_LOW` | No relevant info |
| `SECURITY_BLOCK` | Injection blocked |

---

## 7. Streaming

**Backend:** `ask_stream()` + `POST /api/chat/stream` (SSE)

**Event types:**

| Type | Payload | When |
|---|---|---|
| `status` | `{ message }` | Intent, retrieve, confidence, generate… |
| `token` | `{ content }` | LLM token chunks (or fixed reply chars) |
| `done` | `{ response }` | Full `ChatResponse` + `trace` |
| `error` | `{ message }` | Failure |

**Frontend:** `api.streamMessage()` in `App/lib/api.ts` reads SSE; `ChatPanel` shows live status then streaming text with cursor. Response panel updates on `done`.

Non-stream `POST /api/chat` still available for simple clients.

---

## 8. FastAPI backend

**Entry:** `api/main.py` — CORS for `localhost:3000`

### Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | `{ "status": "ok" }` |
| POST | `/api/ingest/run` | Run ingest |
| GET | `/api/config` | All settings (secrets masked) |
| PATCH | `/api/config` | `{ "updates": { "KEY": value } }` |
| POST | `/api/config/reset` | Reset to defaults (skips secrets by default) |
| POST | `/api/chat` | One-shot chat |
| POST | `/api/chat/stream` | SSE streaming chat |
| GET | `/api/chat/history?session_id=` | Load history |
| DELETE | `/api/chat/history?session_id=` | Clear history |
| GET | `/api/chat/sessions` | List session IDs |

### Layering

```
routers/ → services/ → chatbot.py | ingest.py | utils/settings.py
schemas/ → request/response validation
```

---

## 9. Next.js frontend

**Folder:** `App/`

### Pages

| Route | Purpose |
|---|---|
| `/` | Redirects to `/rag` |
| `/rag` | Main UI: Settings \| Chat \| Response |
| `/ingest` | PDF ingest form |
| `/chat` | Redirects to `/rag` |
| `/config` | Redirects to `/rag` |

### `/rag` layout

Fixed viewport (no page scroll):

1. **Left — Settings** (`ConfigPanel`): collapsible categories, save, reset to defaults / per-section reset
2. **Center — Chat** (`ChatPanel`): sessions, streaming messages
3. **Right — Response** (`ResponsePanel`): summary, thresholds, retrieval attempts, chunks, raw logs

Cards use **2px** border radius. Header is compact (`h-11`).

### Design

Light Apple-inspired UI: `#f5f5f7` background, white cards, `#0071e3` accent, system fonts.

### Env

`App/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 10. Configuration

**Source of truth:** `utils/settings.py` → `CONFIG_FIELDS`  
**Persistence:** project root `.env`  
**UI/API:** get / patch / reset

### Categories

| Category | Examples |
|---|---|
| model | `MODEL_NAME`, `TEMPERATURE`, `EMBEDDING_MODEL` |
| retrieval | `RETRIEVE_K`, `RERANK_TOP_N`, Flashrank/Pinecone thresholds |
| chat | `MAX_HISTORY_TURNS`, `LOW_CONFIDENCE_REPLY`, retries |
| assistant | `ASSISTANT_NAME`, `ROLE`, `ORGANISATION` |
| session | `CHAT_SESSION_ID` |
| pinecone | API key, index, cloud, region |
| mongodb | URI, DB, collections |
| ingest | `PDF_PATH`, chunk size/overlap |
| openai | `OPENAI_API_KEY` |
| langsmith | tracing keys / project |

### Reset

- **Reset to defaults** — all non-secret fields → declared defaults; API keys preserved
- **Reset** on a section — only that category
- `POST /api/config/reset` with optional `{ "keys": [...], "include_secrets": false }`

### Runtime apply

`update_config` / `reset_config` write `.env` and push values into loaded `chatbot` / `ingest` modules when possible. For connection changes (Pinecone/Mongo re-init), restart the API.

### Chatbot defaults (core)

| Variable | Default |
|---|---|
| `MODEL_NAME` | `gpt-4o-mini` |
| `TEMPERATURE` | `0.2` |
| `MAX_HISTORY_TURNS` | `10` |
| `RETRIEVE_K` | `10` |
| `RERANK_TOP_N` | `3` |
| `FLASHRANK_HIGH_THRESHOLD` | `0.70` |
| `FLASHRANK_MID_THRESHOLD` | `0.45` |
| `FLASHRANK_UNRELIABLE_BELOW` | `0.05` |
| `PINECONE_HIGH_THRESHOLD` | `0.50` |
| `PINECONE_MID_THRESHOLD` | `0.28` |
| `MAX_API_RETRIES` | `3` |
| `MAX_RETRIEVAL_ATTEMPTS` | `2` |
| `MAX_USER_MESSAGE_CHARS` | `2000` |

Flashrank models cache under `.cache/flashrank/` (not `/tmp`, which macOS clears).

---

## 11. Metadata & filtering

**File:** `utils/metadata_utils.py`

### At ingest

`detect_topics` + `enrich_chunk_metadata` attach:

- `primary_topic` (e.g. `seo`, `email`, `crm`, … or `general`)
- `topics` (all matches)
- `page_number`

### At query time

`build_metadata_filter(query)` may produce:

- `{ "primary_topic": { "$eq": "seo" } }`
- `{ "page_number": { "$eq": 63 } }`
- `$and` when both present

If filtered search returns nothing → retry without filter.

### Topic keywords (examples)

`seo`, `content_marketing`, `social_media`, `crm`, `ppc`, `analytics`, `strategy`, `personalization`, `email`, `ux`, `regulation`, `affiliate`, `mobile`

---

## 12. MongoDB memory & logs

| Collection | Purpose |
|---|---|
| `chat_memory` | Per-`session_id` message list (`human` / `ai`) |
| `chat_logs` | Durable turn logs |

### Memory document shape

```json
{
  "session_id": "default",
  "messages": [
    { "role": "human", "content": "..." },
    { "role": "ai", "content": "..." }
  ],
  "updated_at": "..."
}
```

Trimmed to `MAX_HISTORY_TURNS * 2` messages.

### Log turn fields (typical)

`session_id`, `question`, `answer`, `intent`, `route`, `band`, `flashrank_score`, `pinecone_score`, `confidence_score`, `search_query`, `pages`, `topics`, `latency_ms`, `security_blocked`, `assistant_name`, `assistant_organisation`, `created_at`, plus stream `trace` when present.

### Inspect

```bash
mongosh chatbot_avatar --eval 'db.chat_logs.find().sort({created_at:-1}).limit(3).pretty()'
```

### Optional LangSmith

Set `LANGSMITH_API_KEY` (+ tracing env) for chain traces. Prefer Mongo `chat_logs` for production durability.

---

## 13. Security

| Defense | Mechanism |
|---|---|
| `SAFETY_RULES` | Appended to every system prompt |
| Delimiters | `<<<USER>>>` / `<<<CONTEXT>>>` + `wrap_untrusted()` |
| Heuristic block | `INJECTION_PATTERNS` early refuse |
| Sanitize | Length cap, strip nulls |
| RAG hardening | Context treated as untrusted data in prompts |
| Secrets masking | Config API masks API keys in GET responses |

---

## 14. Key functions & objects

### Models / chains (`chatbot.py`)

| Name | Role |
|---|---|
| `llm` | Main answer model |
| `router_llm` | Rewrite / broaden (`temperature=0`) |
| `intent_llm` | Intent only (`max_tokens=5`) |
| `chat_chain` | No-docs chat |
| `rag_chain` | Answer from context |
| `clarify_chain` | Mid-band clarifying Q |
| `rewrite_chain` | Standalone search query |
| `intent_chain` | Classify intent |
| `embeddings` / `vector_store` | Pinecone retrieval |
| `reranker` | Flashrank |

### Core helpers

| Function | Role |
|---|---|
| `ask` / `ask_stream` | Full turn (sync / SSE events) |
| `classify_intent` | Intent routing |
| `retrieve_and_rerank` | Filter → Pinecone → Flashrank |
| `effective_confidence` | Flashrank or Pinecone-mapped score |
| `confidence_band` | high / mid / low |
| `remember` / `log_turn` | Memory + durable log |
| `load_history` / `save_history` | Mongo session I/O |
| `with_retry` | Transient API retries |
| `_build_flashrank_reranker` | Durable cache + repair empty model dir |

### Utils

| Module | Role |
|---|---|
| `metadata_utils` | Topics, pages, filters, enrich |
| `settings` | Config registry, get/update/reset |

---

## 15. Sessions

- Keyed by `session_id` string (default from `CHAT_SESSION_ID` or UI field)
- UI: edit session ID, **New**, **Clear**
- New session ID → empty history; existing ID → loads prior turns
- Logs always include `session_id`

---

## 16. Troubleshooting

| Problem | Fix |
|---|---|
| `ERR_CONNECTION_REFUSED` on `:8000` | Start API: `uvicorn api.main:app --reload --port 8000` |
| Flashrank `NoSuchFile` ONNX in `/tmp` | Fixed via `.cache/flashrank`; restart API after pull |
| Empty RAG answers / always low | Re-run `ingest.py`; check Pinecone index + keys |
| Config save but old model behavior | Restart API after connection-related changes |
| Mongo errors | Ensure MongoDB is running; check `MONGODB_URI` |
| Stream hangs / no tokens | Confirm `/api/chat/stream`; check OpenAI key + network |

---

## 17. Version history

| Path | Notes |
|---|---|
| `Versions/v1.py` | Early chatbot snapshot |
| `Versions/v2.py` | Intermediate |
| `Versions/v3.py` | Pre–web-app snapshot (may use old `metadata_utils` import) |

Current production path: root `chatbot.py` + `ingest.py` + `api/` + `App/`.

---

## Quick reference — commands

```bash
# Ingest
python ingest.py

# API
source .venv/bin/activate
uvicorn api.main:app --reload --port 8000

# UI
cd App && npm run dev

# CLI
python chatbot.py
```

| URL | What |
|---|---|
| http://localhost:3000/rag | Main RAG UI |
| http://localhost:3000/ingest | Ingest UI |
| http://localhost:8000/api/health | API health |
| http://localhost:8000/docs | FastAPI OpenAPI docs |

---

*Generated for Chatbot Avatar — keep this file updated when architecture or endpoints change.*
