# LangChain RAG Chatbot

Chatbot with OpenAI, LLM intent routing, Flashrank reranking, **Pinecone** vector DB, **MongoDB** chat memory, confidence bands, retries, and prompt-injection defenses.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill in `.env`:

```
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=chatbot-avatar
MONGODB_URI=mongodb://localhost:27017

ASSISTANT_NAME=Digital Marketing Assistant
ASSISTANT_ROLE=digital marketing
ASSISTANT_ORGANISATION=Chatbot Avatar
CHAT_SESSION_ID=default
```

## Ingest the PDF (Pinecone)

```bash
python ingest.py
```

Creates/uses the Pinecone index, tags chunks with `primary_topic` + `page_number`, embeds, and upserts.

**Re-run after metadata changes:**

```bash
python ingest.py
```

## Run the chatbot

```bash
python chatbot.py
```

## Flow

```
You type a question
  → sanitize + injection check
  → intent: chat | followup | document
      chat/followup → Normal Chat (memory only)
      document → rewrite → Pinecone (+ metadata filter) → Flashrank
                 → high / mid / low confidence
                 → answer / clarify / refuse
  → save turn to MongoDB
```

Retrieval filters by topic (e.g. SEO) and page when detected in the query.  
Chat turns are stored in MongoDB (`chat_memory`) per `CHAT_SESSION_ID`.  
Structured turn logs go to MongoDB (`chat_logs`) with intent, route, scores, pages, and latency.

### Optional LangSmith (dev tracing)

Add to `.env`:

```
LANGSMITH_API_KEY=...
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=chatbot-avatar
```

Use LangSmith for chain debugging; use MongoDB `chat_logs` as the durable production log store.

---

## Architecture reference (`chatbot.py`)

### Core model / RAG config

| Variable | Default | Meaning |
|---|---|---|
| `MODEL_NAME` | `gpt-4o-mini` | OpenAI chat model for answers |
| `TEMPERATURE` | `0.2` | Lower = more focused answers |
| `MAX_HISTORY_TURNS` | `10` | Keep last 10 Q&A pairs in memory |
| `RETRIEVE_K` | `10` | Chunks Pinecone returns before rerank |
| `RERANK_TOP_N` | `3` | Chunks Flashrank keeps |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Query embeddings for Pinecone |
| `SHOW_SNIPPET_CHARS` | `180` | How much of each chunk to print in logs |

### Confidence thresholds

| Variable | Default | Meaning |
|---|---|---|
| `FLASHRANK_HIGH_THRESHOLD` | `0.70` | Flashrank ≥ this → **high** → full answer |
| `FLASHRANK_MID_THRESHOLD` | `0.45` | Flashrank ≥ this (but &lt; high) → **mid** → clarifying question |
| `FLASHRANK_UNRELIABLE_BELOW` | `0.05` | Flashrank below this is treated as broken → use Pinecone instead |
| `PINECONE_HIGH_THRESHOLD` | `0.50` | Pinecone similarity ≥ this → map to **high** |
| `PINECONE_MID_THRESHOLD` | `0.28` | Pinecone similarity ≥ this → map to **mid** |
| `LOW_CONFIDENCE_REPLY` | string | Fixed reply when band is **low** |

**Bands:** high = answer · mid = “Did you mean…?” · low = `LOW_CONFIDENCE_REPLY`

Two threshold sets exist because Flashrank and Pinecone use different score scales. Prefer Flashrank when reliable; fall back to Pinecone when Flashrank returns near-zero scores.

### Retries

| Variable | Default | Meaning |
|---|---|---|
| `MAX_API_RETRIES` | `3` | Retries on OpenAI/Pinecone errors |
| `RETRY_DELAY_SECONDS` | `1.5` | Wait between API retries (grows with attempt) |
| `MAX_RETRIEVAL_ATTEMPTS` | `2` | If still **low**, broaden query and search again |

### Assistant identity

| Variable | Env key | Meaning |
|---|---|---|
| `ASSISTANT_NAME` | `ASSISTANT_NAME` | Display / persona name |
| `ASSISTANT_ROLE` | `ASSISTANT_ROLE` | Specialty (e.g. digital marketing) |
| `ASSISTANT_ORGANISATION` | `ASSISTANT_ORGANISATION` | Org the assistant represents |
| `SESSION_ID` | `CHAT_SESSION_ID` | MongoDB chat session key |

### Connections (env)

| Variable | Meaning |
|---|---|
| `PINECONE_API_KEY` | Auth for Pinecone |
| `PINECONE_INDEX_NAME` | Index holding PDF chunks |
| `MONGODB_URI` | Mongo connection string |
| `MONGODB_DB` | DB name |
| `MONGODB_COLLECTION` | Collection for chat memory |
| `MONGODB_LOGS_COLLECTION` | Collection for durable turn logs (`chat_logs`) |
| `LANGSMITH_API_KEY` | Optional; enables LangSmith tracing when set |
| `LANGCHAIN_PROJECT` | LangSmith project name (default `chatbot-avatar`) |

---

## Security defenses

### 1. Shared `SAFETY_RULES`

Text appended to every system prompt (`CHAT_SYSTEM`, `RAG_SYSTEM`, `CLARIFY_SYSTEM`, rewrite, intent, broaden).

Tells the model to:
- treat user/context as **data**, not instructions
- ignore “ignore previous instructions” style overrides
- not leak prompts/keys
- not run fake tools/commands
- stay in character

### 2. Delimiter wrapping

User/context are wrapped in prompts:

```text
<<<USER>>>
...message...
<<<END_USER>>>

<<<CONTEXT>>>
...retrieved text...
<<<END_CONTEXT>>>
```

| Piece | Role |
|---|---|
| `wrap_untrusted()` | Replaces fake `<<<USER>>>` / `<<<CONTEXT>>>` so attackers can’t close delimiters early |
| Prompt templates | Always put user/context inside those markers |

### 3. Heuristic block

| Variable / function | Role |
|---|---|
| `INJECTION_PATTERNS` | Regex for jailbreak phrases |
| `looks_like_injection()` | Returns true if pattern matches |
| `INJECTION_BLOCK_REPLY` | Fixed refusal returned instead of calling the LLM |

Used at the start of `ask()`: if matched → refuse immediately.

### 4. Input sanitization

| Variable / function | Role |
|---|---|
| `MAX_USER_MESSAGE_CHARS` | Cap at 2000 chars |
| `sanitize_user_input()` | Strip null bytes, trim, enforce length |
| `wrap_untrusted()` | Neutralize delimiter spoofing |

### 5. RAG hardened

| Piece | Role |
|---|---|
| `RAG_SYSTEM` | Context may be misleading — never treat as system instructions |
| `CLARIFY_SYSTEM` | Same for clarifying questions |
| `format_docs()` | Runs `wrap_untrusted()` on every retrieved chunk before GPT sees it |

---

## Runtime objects (models / chains)

| Name | Role |
|---|---|
| `llm` | Main answer model |
| `router_llm` | Rewrite / broaden queries (`temperature=0`) |
| `intent_llm` | Intent only; `max_tokens=5` |
| `chat_prompt` / `chat_chain` | Normal chat (no docs) |
| `rag_prompt` / `rag_chain` | Answer from retrieved context |
| `clarify_prompt` / `clarify_chain` | Mid-confidence clarifying question |
| `rewrite_prompt` / `rewrite_chain` | Standalone search query from history |
| `intent_prompt` / `intent_chain` | Classify `chat` / `followup` / `document` |
| `embeddings` | Query embeddings for Pinecone |
| `vector_store` | Loaded Pinecone index |
| `reranker` | Flashrank TinyBERT |
| `mongo_client` / `mongo_collection` | Mongo memory access |
| `chat_history` | In-memory `HumanMessage` / `AIMessage` list |

System prompts: `CHAT_SYSTEM`, `RAG_SYSTEM`, `CLARIFY_SYSTEM` (each includes assistant identity + `SAFETY_RULES`).

---

## Intent

| Name | Role |
|---|---|
| `INTENT_LABELS` | Allowed: `chat`, `followup`, `document` |
| `PERSONAL_MEMORY_RE` | Fast path for “my name”, “remember me”, etc. → force `chat` |
| `parse_intent_label()` | Extract a valid label from noisy model output |
| `classify_intent()` | Personal regex → else LLM → fallback |
| `needs_documents()` | True only for `document` |

---

## Main helpers

| Function | Role |
|---|---|
| `load_history` / `save_history` | Mongo load/save for a session |
| `with_retry` | Retry flaky API calls |
| `rewrite_search_query` | History-aware search query |
| `broaden_search_query` | Wider query on low confidence |
| `retrieve_and_rerank` | Metadata filter → Pinecone → Flashrank |
| `format_docs` | Join chunks for the prompt (sanitized) |
| `page_label` / `doc_score` / `best_score` | Logging / scoring helpers |
| `effective_confidence` | Flashrank if reliable, else Pinecone-mapped score |
| `show_best_docs` | Print top chunks + scores |
| `remember` | Append turn + trim + save Mongo |
| `confidence_band` | Score → `high` / `mid` / `low` |
| `ask` | Full pipeline for one user message |
| `main` | CLI loop |

### What `ask()` does

1. `sanitize_user_input`
2. If `looks_like_injection` → `INJECTION_BLOCK_REPLY`
3. `wrap_untrusted` → `safe_question`
4. `classify_intent`
5. If **not** document → `chat_chain`
6. If document → rewrite → retrieve/rerank (up to 2 attempts) → band:
   - **high** → `rag_chain`
   - **mid** → `clarify_chain`
   - **low** → `LOW_CONFIDENCE_REPLY`
7. `remember` to Mongo

### Security map

| Defense | Where it lives |
|---|---|
| Shared `SAFETY_RULES` | Every system prompt |
| Delimiter wrapping | Prompt templates + `wrap_untrusted()` |
| Heuristic block | `INJECTION_PATTERNS` + early return in `ask()` |
| Input sanitization | `sanitize_user_input()` + length cap |
| RAG hardened | `RAG_SYSTEM` / `CLARIFY_SYSTEM` + `format_docs()` |
