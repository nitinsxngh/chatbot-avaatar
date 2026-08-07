"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "architecture", label: "Architecture" },
  { id: "quick-start", label: "Quick start" },
  { id: "variables", label: "Variables" },
  { id: "rag", label: "RAG chat" },
  { id: "ingest", label: "Ingest pipeline" },
  { id: "collections", label: "Data collections" },
  { id: "metadata", label: "Chunk metadata" },
  { id: "catalog", label: "Catalog" },
  { id: "configs", label: "Published configs" },
  { id: "sessions", label: "Sessions & settings" },
  { id: "flow", label: "Flow builder" },
  { id: "api", label: "API reference" },
  { id: "troubleshooting", label: "Troubleshooting" },
] as const;

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-4 text-[18px] font-semibold tracking-tight text-[#1d1d1f]"
    >
      {children}
    </h2>
  );
}

function SubTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-5 text-[14px] font-semibold text-[#1d1d1f]">{children}</h3>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-[14px] leading-relaxed text-[#424245]">{children}</p>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-[2px] bg-[#1d1d1f] p-3 font-mono text-[12px] leading-relaxed text-[#f5f5f7]">
      {children}
    </pre>
  );
}

function Inline({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-[2px] bg-[#f5f5f7] px-1.5 py-0.5 font-mono text-[12px] text-[#1d1d1f]">
      {children}
    </code>
  );
}

function DocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-[#0071e3] hover:underline">
      {children}
    </Link>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="text-[14px] leading-relaxed text-[#424245]">{children}</li>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="mt-3 overflow-x-auto rounded-[2px] border border-black/[0.08]">
      <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="bg-[#f5f5f7]">
            {headers.map((h) => (
              <th
                key={h}
                className="border-b border-black/[0.06] px-3 py-2 font-semibold text-[#1d1d1f]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="align-top">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="border-b border-black/[0.04] px-3 py-2 text-[#424245]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocumentationPage() {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 gap-4 overflow-hidden px-3 py-2 sm:px-4">
      <aside className="hidden w-52 shrink-0 overflow-y-auto py-2 lg:block">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
          On this page
        </p>
        <nav className="space-y-0.5">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="block rounded-[2px] px-2 py-1.5 text-[13px] text-[#424245] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="min-h-0 flex-1 overflow-y-auto pb-10 pt-1">
        <header className="mb-6">
          <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
            Documentation
          </h1>
          <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-[#86868b]">
            Complete product and engineering guide for Chatbot Avatar: architecture,
            ingest, RAG retrieval, collections, catalogs, published configs, Flow,
            and the full HTTP API.
          </p>
        </header>

        <div className="space-y-8">
          {/* Overview */}
          <Card>
            <SectionTitle id="overview">Overview</SectionTitle>
            <P>
              Chatbot Avatar is a retrieval-augmented generation (RAG) assistant
              with a Next.js control panel and a FastAPI backend. Documents are
              structure-parsed, chunked with enriched metadata, and stored in
              Pinecone. Chat answers use intent routing, metadata filters,
              Flashrank reranking, confidence bands, and MongoDB session memory.
            </P>
            <SubTitle>Stack</SubTitle>
            <Table
              headers={["Layer", "Technology"]}
              rows={[
                ["LLM", "OpenAI via LangChain (configurable model)"],
                ["Embeddings", "text-embedding-3-small (1536-dim)"],
                ["Vector DB", "Pinecone (cosine) + namespaces per collection"],
                ["Reranker", "Flashrank ms-marco-TinyBERT-L-2-v2"],
                ["Memory / catalogs", "MongoDB"],
                ["API", "FastAPI + Uvicorn (port 8000)"],
                ["UI", "Next.js + Tailwind (port 3000)"],
                ["PDF parsing", "PyMuPDF (structure-aware)"],
              ]}
            />
            <SubTitle>UI map</SubTitle>
            <Table
              headers={["Page", "Path", "Purpose"]}
              rows={[
                [<DocLink href="/rag">RAG</DocLink>, <Inline>/rag</Inline>, "Settings + chat + retrieval debug"],
                [<DocLink href="/ingest">Ingest</DocLink>, <Inline>/ingest</Inline>, "Create/update collections; upload PDFs"],
                [<DocLink href="/rag/published-configs">Configs</DocLink>, <Inline>/rag/published-configs</Inline>, "Publish, apply, test configs on RAG"],
                [<DocLink href="/rag/model">Models</DocLink>, <Inline>/rag/model</Inline>, "Chat & embedding model catalog"],
                [<DocLink href="/rag/dataset-category">Categories</DocLink>, <Inline>/rag/dataset-category</Inline>, "Dataset categories"],
                [<DocLink href="/rag/language">Languages</DocLink>, <Inline>/rag/language</Inline>, "Response languages"],
                [<DocLink href="/flow">Flow</DocLink>, <Inline>/flow</Inline>, "Visual conversation / connector builder"],
                ["Documentation", <Inline>/documentation</Inline>, "This guide"],
              ]}
            />
          </Card>

          {/* Architecture */}
          <Card>
            <SectionTitle id="architecture">Architecture</SectionTitle>
            <Code>{`Browser (Next.js :3000)
  Settings | Chat (SSE) | Response debug
            │
            ▼
FastAPI (:8000)
  /api/config  /api/chat  /api/ingest
  /api/data-collections  /api/published-configs
  /api/catalog  /api/flow
            │
    ┌───────┼──────────────┐
    ▼       ▼              ▼
settings  chatbot.py     ingest.py
  .env    Pinecone       PyMuPDF → chunks
          Flashrank      OpenAI embeddings
          Mongo memory   Pinecone namespaces`}</Code>
            <SubTitle>End-to-end data path</SubTitle>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[14px] text-[#424245]">
              <li>PDF uploaded → saved under <Inline>Documents/uploads/</Inline></li>
              <li>Structure parse → headings / paragraphs / lists</li>
              <li>Topic discovery (LLM with heuristic fallback)</li>
              <li>Section-aware chunks + metadata → embed → upsert to namespace</li>
              <li>User asks question → intent → retrieve (+ filter) → rerank</li>
              <li>Band high/mid/low → answer / clarify / refuse → Mongo history</li>
            </ol>
          </Card>

          {/* Quick start */}
          <Card>
            <SectionTitle id="quick-start">Quick start</SectionTitle>
            <SubTitle>1. Backend</SubTitle>
            <Code>{`cd Chatbot-Avatar
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill keys
uvicorn api.main:app --reload --port 8000`}</Code>
            <SubTitle>2. Frontend</SubTitle>
            <Code>{`cd App
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev`}</Code>
            <SubTitle>3. Required environment</SubTitle>
            <Table
              headers={["Variable", "Required", "Notes"]}
              rows={[
                [<Inline>OPENAI_API_KEY</Inline>, "Yes", "Chat + embeddings + topic discovery"],
                [<Inline>PINECONE_API_KEY</Inline>, "Yes", "Vector store"],
                [<Inline>PINECONE_INDEX_NAME</Inline>, "Yes", "Default chatbot-avatar"],
                [<Inline>PINECONE_CLOUD</Inline> / <Inline>REGION</Inline>, "Ingest", "Index creation"],
                [<Inline>MONGODB_URI</Inline>, "Yes", "Sessions, catalogs, published configs"],
                [<Inline>ASSISTANT_*</Inline>, "Optional", "Name, role, organisation"],
              ]}
            />
            <P>
              Interactive API docs: <Inline>http://localhost:8000/docs</Inline>
            </P>
          </Card>

          {/* Variables */}
          <Card>
            <SectionTitle id="variables">Variables</SectionTitle>
            <P>
              All config keys from <Inline>utils/settings.py</Inline>, grouped by
              how they are used. Set secrets and infrastructure in{" "}
              <Inline>.env</Inline>. Dynamic keys can also be changed per chat
              session in RAG Settings and included in published configs.
            </P>

            <SubTitle>Must needed</SubTitle>
            <P>
              Required for the system to run. Without these, ingest and/or chat
              will fail.
            </P>
            <Table
              headers={["Variable", "Default", "Where", "Why required"]}
              rows={[
                [
                  <Inline>OPENAI_API_KEY</Inline>,
                  "(empty)",
                  ".env · secret",
                  "LLM answers, embeddings, topic discovery",
                ],
                [
                  <Inline>PINECONE_API_KEY</Inline>,
                  "(empty)",
                  ".env · secret",
                  "Vector upsert + similarity search",
                ],
                [
                  <Inline>PINECONE_INDEX_NAME</Inline>,
                  "chatbot-avatar",
                  ".env / session",
                  "Index used by ingest and RAG",
                ],
                [
                  <Inline>MONGODB_URI</Inline>,
                  "mongodb://localhost:27017",
                  ".env",
                  "Sessions, catalogs, published configs, history",
                ],
              ]}
            />
            <P>
              Strongly recommended after first setup: create a{" "}
              <strong>data collection</strong>, ingest at least one PDF, then set{" "}
              <Inline>DATA_COLLECTION_ID</Inline> /{" "}
              <Inline>PINECONE_NAMESPACE</Inline> so chat retrieves the right
              knowledge base.
            </P>

            <SubTitle>Dynamic</SubTitle>
            <P>
              Session-scoped (editable on RAG Settings when a session is
              selected). These are what get published and applied when you{" "}
              <strong>Test on RAG</strong>.
            </P>
            <Table
              headers={["Variable", "Default", "Category", "Purpose"]}
              rows={[
                [<Inline>MODEL_NAME</Inline>, "gpt-4o-mini", "model", "Chat LLM"],
                [<Inline>TEMPERATURE</Inline>, "0.2", "model", "Sampling temperature"],
                [<Inline>EMBEDDING_MODEL</Inline>, "text-embedding-3-small", "model", "Embeddings (ingest + query)"],
                [<Inline>LANGUAGE</Inline>, "en", "model", "Response language (ISO 639-1)"],
                [<Inline>RETRIEVE_K</Inline>, "10", "retrieval", "Pinecone candidates before rerank"],
                [<Inline>RERANK_TOP_N</Inline>, "3", "retrieval", "Chunks kept after Flashrank"],
                [<Inline>FLASHRANK_HIGH_THRESHOLD</Inline>, "0.70", "retrieval", "High-confidence band"],
                [<Inline>FLASHRANK_MID_THRESHOLD</Inline>, "0.45", "retrieval", "Mid / clarify band"],
                [<Inline>FLASHRANK_UNRELIABLE_BELOW</Inline>, "0.05", "retrieval", "Treat very low Flashrank as unreliable"],
                [<Inline>PINECONE_HIGH_THRESHOLD</Inline>, "0.50", "retrieval", "Pinecone score high gate"],
                [<Inline>PINECONE_MID_THRESHOLD</Inline>, "0.28", "retrieval", "Pinecone score mid gate"],
                [<Inline>MAX_RETRIEVAL_ATTEMPTS</Inline>, "2", "retrieval", "Retry retrieve with broader query"],
                [<Inline>MAX_HISTORY_TURNS</Inline>, "10", "chat", "History turns sent to the LLM"],
                [<Inline>MAX_USER_MESSAGE_CHARS</Inline>, "2000", "chat", "User message length cap"],
                [<Inline>LOW_CONFIDENCE_REPLY</Inline>, "(fixed string)", "chat", "Reply when band is low"],
                [<Inline>MAX_API_RETRIES</Inline>, "3", "chat", "Retries for OpenAI / Pinecone calls"],
                [<Inline>RETRY_DELAY_SECONDS</Inline>, "1.5", "chat", "Backoff between retries"],
                [<Inline>ASSISTANT_NAME</Inline>, "Document Assistant", "assistant", "Display / prompt identity"],
                [<Inline>ASSISTANT_ROLE</Inline>, "(document helper)", "assistant", "Specialty in system prompts"],
                [<Inline>ASSISTANT_ORGANISATION</Inline>, "Chatbot Avatar", "assistant", "Org in system prompts"],
                [<Inline>PINECONE_INDEX_NAME</Inline>, "chatbot-avatar", "pinecone", "Also session-overridable"],
                [<Inline>PINECONE_NAMESPACE</Inline>, "(empty)", "pinecone", "Active collection namespace"],
                [<Inline>DATA_COLLECTION_ID</Inline>, "(empty)", "pinecone", "Mongo collection id → sets namespace"],
              ]}
            />

            <SubTitle>Fixed</SubTitle>
            <P>
              Global / infrastructure settings. Stored in <Inline>.env</Inline>.
              When a session is selected in the UI they appear as read-only
              (grey) and are <strong>not</strong> part of published config
              snapshots (except secrets are never published).
            </P>
            <Table
              headers={["Variable", "Default", "Category", "Purpose"]}
              rows={[
                [<Inline>OPENAI_API_KEY</Inline>, "(empty)", "openai", "Secret — must needed"],
                [<Inline>PINECONE_API_KEY</Inline>, "(empty)", "pinecone", "Secret — must needed"],
                [<Inline>PINECONE_CLOUD</Inline>, "aws", "pinecone", "Index create (ingest)"],
                [<Inline>PINECONE_REGION</Inline>, "us-east-1", "pinecone", "Index create (ingest)"],
                [<Inline>MONGODB_URI</Inline>, "mongodb://localhost:27017", "mongodb", "Must needed connection"],
                [<Inline>MONGODB_DB</Inline>, "chatbot_avatar", "mongodb", "Database name"],
                [<Inline>MONGODB_COLLECTION</Inline>, "chat_memory", "mongodb", "Chat sessions + config"],
                [<Inline>MONGODB_LOGS_COLLECTION</Inline>, "chat_logs", "mongodb", "Turn logs"],
                [<Inline>CHAT_SESSION_ID</Inline>, "default", "session", "Default CLI / fallback session"],
                [<Inline>PDF_PATH</Inline>, "(sample PDF path)", "ingest", "CLI default PDF path"],
                [<Inline>CHUNK_SIZE</Inline>, "1000", "ingest", "Structure chunk target size"],
                [<Inline>CHUNK_OVERLAP</Inline>, "200", "ingest", "Overlap when splitting large blocks"],
                [<Inline>LANGSMITH_API_KEY</Inline>, "(empty)", "langsmith", "Optional tracing secret"],
                [<Inline>LANGCHAIN_TRACING_V2</Inline>, "false", "langsmith", "Enable LangSmith tracing"],
                [<Inline>LANGCHAIN_PROJECT</Inline>, "chatbot-avatar", "langsmith", "LangSmith project name"],
              ]}
            />

            <SubTitle>Quick legend</SubTitle>
            <Table
              headers={["Class", "Meaning"]}
              rows={[
                [
                  "Must needed",
                  "Fill before first run — OpenAI, Pinecone, Mongo URI (+ index name)",
                ],
                [
                  "Dynamic",
                  "Per-session / publishable — models, thresholds, language, collection, assistant",
                ],
                [
                  "Fixed",
                  "Global .env infrastructure — secrets, Mongo names, ingest chunking, LangSmith",
                ],
              ]}
            />
          </Card>

          {/* RAG */}
          <Card>
            <SectionTitle id="rag">RAG chat</SectionTitle>
            <P>
              Three panes: <strong>Settings</strong> (left), <strong>Chat</strong>{" "}
              (center), <strong>Response</strong> (right debug). Session name
              controls Mongo history and session-scoped config.
            </P>
            <SubTitle>Pipeline steps</SubTitle>
            <Table
              headers={["Step", "What happens"]}
              rows={[
                ["Sanitize", "Length limit, null strip, injection heuristics"],
                ["Intent", "chat | followup | document (tiny classifier)"],
                ["Rewrite", "Search query for retrieval (document path)"],
                ["Retrieve", "Pinecone similarity in active namespace; optional metadata filter"],
                ["Thin filter", "Drops heading-only / title stubs before rerank"],
                ["Rerank", "Flashrank top N chunks"],
                ["Confidence", "Combines Flashrank + Pinecone scores → band"],
                ["Generate", "high → answer; mid → clarify; low → fallback reply"],
                ["Persist", "Human + AI messages saved to Mongo session"],
              ]}
            />
            <SubTitle>Confidence bands (defaults)</SubTitle>
            <Table
              headers={["Band", "Typical meaning", "Behavior"]}
              rows={[
                ["high", "Flashrank ≥ 0.7 (and Pinecone healthy)", "Full RAG answer (RAG_HIGH)"],
                ["mid", "Partial match", "Ask one clarifying question (RAG_MID)"],
                ["low", "Weak match", "LOW_CONFIDENCE_REPLY — no hallucinated answer"],
              ]}
            />
            <SubTitle>Response panel fields</SubTitle>
            <P>
              Intent, route, band, latency, confidence / Flashrank / Pinecone
              scores, search query, metadata filter, per-attempt chunks (page,
              topic, snippet), and raw logs — same information as the CLI trace.
            </P>
            <SubTitle>Streaming</SubTitle>
            <P>
              <Inline>POST /api/chat/stream</Inline> returns Server-Sent Events:
            </P>
            <Table
              headers={["Event type", "Payload"]}
              rows={[
                [<Inline>status</Inline>, "Progress message"],
                [<Inline>token</Inline>, "Answer token chunk"],
                [<Inline>done</Inline>, "Full ChatResponse object"],
                [<Inline>error</Inline>, "Error message"],
              ]}
            />
          </Card>

          {/* Ingest */}
          <Card>
            <SectionTitle id="ingest">Ingest pipeline</SectionTitle>
            <P>
              Open <DocLink href="/ingest">Ingest</DocLink> to create or update a
              data collection and upload PDFs (multi-select supported).
            </P>
            <SubTitle>Processing stages</SubTitle>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[14px] text-[#424245]">
              <li>
                <strong>Parse</strong> — PyMuPDF extracts lines with font-size
                heuristics → heading / paragraph / list blocks
              </li>
              <li>
                <strong>Discover topics</strong> — LLM JSON schema over sample
                pages; heuristic keyword fallback if LLM fails
              </li>
              <li>
                <strong>Chunk</strong> — section-aware; headings prefix body text;
                <em>no heading-only vectors</em> (avoids “I don’t know” on title matches)
              </li>
              <li>
                <strong>Enrich metadata</strong> — page, topics, section path,
                document_id, word_count, etc.
              </li>
              <li>
                <strong>Embed + upsert</strong> — OpenAI embeddings into the
                collection’s Pinecone namespace
              </li>
            </ol>
            <SubTitle>Create vs update</SubTitle>
            <Table
              headers={["Mode", "Behavior"]}
              rows={[
                ["Create collection", "New Mongo record + unique namespace slug; then ingest"],
                ["Update collection", "Upsert into existing namespace; replace same document_id by default"],
                ["Replace collection contents", "delete_all on that namespace, then ingest"],
              ]}
            />
            <SubTitle>Upload endpoints</SubTitle>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <Bullet>
                <Inline>POST /api/ingest/upload</Inline> — single PDF
                (multipart) + optional collection fields
              </Bullet>
              <Bullet>
                <Inline>POST /api/ingest/upload/batch</Inline> — multiple PDFs
              </Bullet>
              <Bullet>
                <Inline>POST /api/ingest/run</Inline> — JSON paths +{" "}
                <Inline>collection_id</Inline> / <Inline>create_collection</Inline>
              </Bullet>
            </ul>
            <P>
              Dependency: <Inline>pymupdf</Inline> must be installed in the API
              virtualenv (<Inline>pip install -r requirements.txt</Inline>).
            </P>
          </Card>

          {/* Collections */}
          <Card>
            <SectionTitle id="collections">Data collections</SectionTitle>
            <P>
              A <strong>data collection</strong> is a named knowledge base mapped
              1:1 to a Pinecone <strong>namespace</strong> on the shared index.
            </P>
            <Table
              headers={["Field", "Description"]}
              rows={[
                ["name", "Display name (unique)"],
                ["namespace", "Pinecone namespace slug (auto from name if omitted)"],
                ["document_count / pages / chunks", "Ingest stats"],
                ["topics / source_files", "Discovered topics and uploaded filenames"],
                ["enabled", "Soft-disable for UI lists"],
              ]}
            />
            <SubTitle>Using a collection in chat</SubTitle>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px] text-[#424245]">
              <li>Ingest PDFs into a collection on the Ingest page</li>
              <li>
                On RAG Settings → Pinecone, set <Inline>Data collection ID</Inline>{" "}
                (also sets <Inline>PINECONE_NAMESPACE</Inline>)
              </li>
              <li>Ask document questions — retrieval is scoped to that namespace</li>
            </ol>
            <P>
              Deleting a collection can clear its namespace vectors (
              <Inline>clear_vectors=true</Inline> by default).
            </P>
          </Card>

          {/* Metadata */}
          <Card>
            <SectionTitle id="metadata">Chunk metadata</SectionTitle>
            <P>
              Each vector stores filter-friendly fields used at query time and in
              the Response panel:
            </P>
            <Table
              headers={["Field", "Use"]}
              rows={[
                [<Inline>document_id</Inline>, "Per-file replace on re-ingest"],
                [<Inline>page_number</Inline>, "Page filter (“page 12”) + UI"],
                [<Inline>primary_topic</Inline> / <Inline>topics</Inline>, "Dynamic topic filter"],
                [<Inline>section_title</Inline> / <Inline>section_path</Inline>, "Hierarchy context"],
                [<Inline>structure_type</Inline> / <Inline>block_type</Inline>, "paragraph / list / …"],
                [<Inline>source</Inline> / <Inline>title</Inline> / <Inline>author</Inline>, "Provenance"],
                [<Inline>word_count</Inline>, "Thin-chunk filtering"],
                [<Inline>collection_namespace</Inline>, "Debug stamp of ingest namespace"],
              ]}
            />
            <P>
              Query-time filters are built in <Inline>utils/metadata_utils.py</Inline>{" "}
              from page mentions and topic vocabulary discovered at ingest.
            </P>
          </Card>

          {/* Catalog */}
          <Card>
            <SectionTitle id="catalog">Catalog</SectionTitle>
            <P>
              Mongo collections power Settings dropdowns. Seed once if empty:
            </P>
            <Code>{`GET or POST /api/catalog/seed?force=false`}</Code>
            <Table
              headers={["Resource", "UI", "API prefix"]}
              rows={[
                ["Models (chat + embedding)", <DocLink href="/rag/model">/rag/model</DocLink>, <Inline>/api/catalog/models</Inline>],
                ["Dataset categories", <DocLink href="/rag/dataset-category">/rag/dataset-category</DocLink>, <Inline>/api/catalog/dataset-categories</Inline>],
                ["Languages", <DocLink href="/rag/language">/rag/language</DocLink>, <Inline>/api/catalog/languages</Inline>],
              ]}
            />
            <P>
              Model <Inline>kind</Inline> is <Inline>model</Inline> or{" "}
              <Inline>embedding</Inline>. Only enabled items appear in RAG
              Settings. Languages drive the assistant response language rule.
            </P>
          </Card>

          {/* Published configs */}
          <Card>
            <SectionTitle id="configs">Published configs</SectionTitle>
            <P>
              Capture a reusable snapshot of non-secret session settings under a
              dataset category for later apply / test.
            </P>
            <SubTitle>Publish</SubTitle>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[14px] text-[#424245]">
              <li>Tune Settings on the RAG page</li>
              <li>Click <strong>Publish config</strong></li>
              <li>Enter name, choose category, optional description</li>
              <li>
                Draft edits are applied to the session, then the snapshot is
                stored (API keys excluded)
              </li>
            </ol>
            <SubTitle>Test on RAG</SubTitle>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[14px] text-[#424245]">
              <li>
                Open <DocLink href="/rag/published-configs">Configs</DocLink>
              </li>
              <li>Click a config or <strong>Test on RAG</strong></li>
              <li>
                Settings are written into the chosen session (
                <Inline>default</Inline> unless you change “RAG session”)
              </li>
              <li>
                RAG opens with <Inline>?config=&lt;id&gt;&amp;session=…</Inline>,
                re-applies the snapshot, and shows an Active config banner
              </li>
              <li>Chat to verify behavior; Exit clears the test banner</li>
            </ol>
          </Card>

          {/* Sessions */}
          <Card>
            <SectionTitle id="sessions">Sessions & settings</SectionTitle>
            <P>
              Each chat session name is a unique Mongo key. Session config stores
              behavior keys (model, thresholds, language, namespace, assistant
              identity). Global keys (API secrets, Mongo URI) stay in{" "}
              <Inline>.env</Inline> and are read-only in the UI when a session is
              active.
            </P>
            <SubTitle>Session-scoped keys</SubTitle>
            <P>
              See <a href="#variables" className="font-medium text-[#0071e3] hover:underline">Variables → Dynamic</a>{" "}
              for the full list. Secrets and Mongo / ingest infrastructure stay
              global (Fixed).
            </P>
            <SubTitle>Config API</SubTitle>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <Bullet>
                <Inline>GET /api/config?session_name=</Inline> — categories of
                fields
              </Bullet>
              <Bullet>
                <Inline>PATCH /api/config</Inline> —{" "}
                <Inline>{`{ updates, session_name }`}</Inline>
              </Bullet>
              <Bullet>
                <Inline>POST /api/config/reset</Inline> — defaults (optional keys /
                include_secrets)
              </Bullet>
            </ul>
          </Card>

          {/* Flow */}
          <Card>
            <SectionTitle id="flow">Flow builder</SectionTitle>
            <P>
              Visual editor for multi-step conversations: page names, messages,
              questions, intents, conditions, knowledge, API, MySQL, and end
              nodes. Pan/select mode and node inspector edit properties.
            </P>
            <SubTitle>Connectors</SubTitle>
            <Table
              headers={["Endpoint", "Body highlights", "Response"]}
              rows={[
                [
                  <Inline>POST /api/flow/http</Inline>,
                  "method, url, headers, body, timeout",
                  "ok, status, body, json_data, error",
                ],
                [
                  <Inline>POST /api/flow/mysql</Inline>,
                  "host, port, database, user, password, sql, result_mode",
                  "rows, columns, scalar, first_row, preview, error",
                ],
              ]}
            />
            <P>
              MySQL <Inline>result_mode</Inline>:{" "}
              <Inline>first_row</Inline> | <Inline>rows_json</Inline> |{" "}
              <Inline>scalar</Inline>.
            </P>
          </Card>

          {/* API */}
          <Card>
            <SectionTitle id="api">API reference</SectionTitle>
            <P>
              Base URL: <Inline>http://localhost:8000</Inline>. CORS allows
              localhost:3000. Live OpenAPI: <Inline>/docs</Inline> ·{" "}
              <Inline>/openapi.json</Inline>. Schemas below match{" "}
              <Inline>api/schemas/*.py</Inline>.
            </P>

            {/* Health */}
            <SubTitle>Health</SubTitle>
            <P>
              <Inline>GET /api/health</Inline>
            </P>
            <Code>{`Response
{
  "status": "ok"
}`}</Code>

            {/* Chat */}
            <SubTitle>Chat</SubTitle>
            <P>
              <Inline>POST /api/chat</Inline> — sync answer
            </P>
            <Code>{`Request (ChatRequest)
{
  "message": "string",          // required, min length 1
  "session_name": "string|null", // preferred session key
  "session_id": "string|null"    // legacy alias → session_name
}

Response (ChatResponse)
{
  "answer": "string",
  "session_name": "string",
  "session_id": "string",       // same as session_name
  "intent": "string|null",
  "route": "string|null",
  "band": "string|null",        // high | mid | low
  "latency_ms": 0,
  "confidence_score": 0.0,
  "flashrank_score": 0.0,
  "pinecone_score": 0.0,
  "search_query": "string|null",
  "pages": [],
  "topics": [],
  "security_blocked": false,
  "trace": {
    "logs": ["string"],
    "intent_detail": {},
    "retrieval_attempts": [
      {
        "attempt": 1,
        "query": "string",
        "metadata_filter": "string|null",
        "filter_fallback": false,
        "flashrank_score": 0.0,
        "pinecone_score": 0.0,
        "confidence_score": 0.0,
        "band": "string",
        "chunks": [{ "...": "chunk + scores" }]
      }
    ],
    "summary": {
      "intent": "string|null",
      "route": "string|null",
      "latency_ms": 0,
      "search_query": "string|null",
      "retry_queries": ["string"],
      "band": "string|null",
      "flashrank_score": 0.0,
      "pinecone_score": 0.0,
      "confidence_score": 0.0,
      "pages": [],
      "topics": []
    },
    "thresholds": {}
  }
}`}</Code>

            <P>
              <Inline>POST /api/chat/stream</Inline> — same request body; SSE{" "}
              <Inline>text/event-stream</Inline>
            </P>
            <Code>{`Each SSE line: data: <json>\\n\\n

{ "type": "status", "message": "string" }
{ "type": "token",  "content": "string" }
{ "type": "done",   "response": { /* ChatResponse */ } }
{ "type": "error",  "message": "string" }`}</Code>

            <P>
              <Inline>GET /api/chat/history</Inline> ·{" "}
              <Inline>DELETE /api/chat/history</Inline>
            </P>
            <Code>{`Query
?session_name=string&session_id=string   // either; session_name preferred

GET Response (HistoryResponse)
{
  "session_name": "string",
  "session_id": "string",
  "messages": [
    { "role": "human|ai", "content": "string" }
  ]
}

DELETE Response
{
  "session_name": "string",
  "session_id": "string",
  "cleared": true
}`}</Code>

            <P>
              <Inline>GET /api/chat/sessions</Inline>
            </P>
            <Code>{`Response (SessionsResponse)
{
  "sessions": ["default", "RAG session", "..."]
}`}</Code>

            {/* Ingest */}
            <SubTitle>Ingest</SubTitle>
            <P>
              <Inline>POST /api/ingest/run</Inline> — JSON paths on disk
            </P>
            <Code>{`Request (IngestRequest)
{
  "pdf_path": "string|null",           // relative to project root
  "pdf_paths": ["string"]|null,        // multi-PDF
  "replace_all": false,                // legacy: clear default ns
  "collection_id": "string|null",      // update existing collection
  "create_collection": {               // DataCollectionCreate | null
    "name": "string",                  // required if creating
    "description": "string",
    "namespace": "string|null",        // auto from name if omitted
    "enabled": true
  },
  "replace_namespace": false           // wipe collection ns before upsert
}

Response (IngestResponse)
{
  "status": "string",
  "pdf_path": "string",
  "pdf_paths": ["string"],
  "pages": 0,
  "chunks": 0,
  "index_name": "string",
  "namespace": "string",
  "collection_id": "string|null",
  "collection": { /* DataCollection | null */ },
  "topic_distribution": {},
  "document_title": "string|null",
  "domain": "string|null",
  "assistant_role": "string|null",
  "discovery_method": "string|null",
  "topics": { "primary": [], "secondary": [] },
  "documents": [
    {
      "pdf_path": "string",
      "document_id": "string",
      "source_name": "string",
      "pages": 0,
      "blocks": 0,
      "chunks": 0,
      "topic_distribution": {},
      "document_title": "string|null",
      "domain": "string|null",
      "assistant_role": "string|null",
      "discovery_method": "string|null",
      "topics": {}
    }
  ],
  "document_count": 0
}`}</Code>

            <P>
              <Inline>POST /api/ingest/upload</Inline> ·{" "}
              <Inline>POST /api/ingest/upload/batch</Inline> — multipart
            </P>
            <Code>{`Form fields (multipart/form-data)
file | files[]          // PDF binary (single vs batch)
collection_id           // string | omit
collection_name         // create new if no collection_id
collection_description  // string
collection_namespace    // string | auto
replace_namespace       // "true" | "false" (default false)

Response: same IngestResponse as /run`}</Code>

            {/* Data collections */}
            <SubTitle>Data collections</SubTitle>
            <P>
              <Inline>GET /api/data-collections</Inline> ·{" "}
              <Inline>POST /api/data-collections</Inline>
            </P>
            <Code>{`Query (GET)
?enabled_only=false

Request (POST — DataCollectionCreate)
{
  "name": "string",            // 1–120
  "description": "string",     // max 500
  "namespace": "string|null",  // max 64; auto from name
  "enabled": true
}

Response item / GET list[] (DataCollection)
{
  "id": "string",
  "name": "string",
  "description": "string",
  "namespace": "string",
  "enabled": true,
  "document_count": 0,
  "pages": 0,
  "chunks": 0,
  "document_title": "string|null",
  "domain": "string|null",
  "topics": {},
  "source_files": ["string"],
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}`}</Code>

            <P>
              <Inline>GET|PATCH|DELETE /api/data-collections/{"{id}"}</Inline>
            </P>
            <Code>{`PATCH body (DataCollectionUpdate) — all optional
{
  "name": "string",
  "description": "string",
  "enabled": true
}

DELETE query
?clear_vectors=true   // also wipe Pinecone namespace

DELETE Response
{
  "deleted": true,
  "id": "string",
  "namespace": "string",
  "vectors_cleared": true,
  "warning": "string"   // only if vector clear failed
}`}</Code>

            {/* Published configs */}
            <SubTitle>Published configs</SubTitle>
            <P>
              <Inline>GET /api/published-configs</Inline> ·{" "}
              <Inline>POST /api/published-configs</Inline>
            </P>
            <Code>{`Query (GET)
?dataset_category=string&enabled_only=false

Request (POST — PublishedConfigCreate)
{
  "name": "string",                 // 1–120
  "description": "string",
  "dataset_category": "string",     // required
  "settings": {                     // dynamic SESSION_CONFIG_KEYS
    "MODEL_NAME": "gpt-4o-mini",
    "DATA_COLLECTION_ID": "...",
    "...": "..."
  },
  "session_name": "string|null",
  "enabled": true
}

Response item / GET list[] (PublishedConfig)
{
  "id": "string",
  "name": "string",
  "description": "string",
  "dataset_category": "string",
  "settings": {},
  "session_name": "string|null",
  "enabled": true,
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}`}</Code>

            <P>
              <Inline>GET|PATCH|DELETE /api/published-configs/{"{id}"}</Inline>
            </P>
            <Code>{`PATCH body (PublishedConfigUpdate) — all optional
{
  "name": "string",
  "description": "string",
  "dataset_category": "string",
  "settings": {},
  "enabled": true
}

DELETE Response
{ "deleted": true, "id": "string" }`}</Code>

            {/* Catalog */}
            <SubTitle>Catalog</SubTitle>
            <P>
              <Inline>GET|POST /api/catalog/seed</Inline>
            </P>
            <Code>{`Query
?force=false

Response
{
  "dataset_categories": { "created": 0, "skipped": 0, "total": 0 },
  "models": {
    "created": 0, "skipped": 0, "total": 0,
    "chat_seed_count": 0, "embedding_seed_count": 0
  },
  "languages": { "created": 0, "skipped": 0, "total": 0 }
}`}</Code>

            <P>
              <Inline>GET|POST /api/catalog/models</Inline> ·{" "}
              <Inline>PATCH|DELETE /api/catalog/models/{"{id}"}</Inline>
            </P>
            <Code>{`Create (CatalogModelCreate)
{
  "name": "string",
  "dataset_category": "string",
  "kind": "model" | "embedding",
  "launch_date": "string",
  "enabled": true
}

Update (CatalogModelUpdate) — all optional
{ "name", "dataset_category", "kind", "launch_date", "enabled" }

Item (CatalogModel) = Create + { "id", "created_at", "updated_at" }
DELETE → { "deleted": true, "id": "string" }`}</Code>

            <P>
              <Inline>GET|POST /api/catalog/dataset-categories</Inline> ·{" "}
              <Inline>PATCH|DELETE …/{"{id}"}</Inline>
            </P>
            <Code>{`Create (DatasetCategoryCreate)
{
  "name": "string",
  "description": "string",
  "enabled": true
}

Update — optional fields of the same shape
Item (DatasetCategory) = Create + { "id", "created_at", "updated_at" }`}</Code>

            <P>
              <Inline>GET|POST /api/catalog/languages</Inline> ·{" "}
              <Inline>PATCH|DELETE …/{"{id}"}</Inline>
            </P>
            <Code>{`Create (LanguageCreate)
{
  "name": "string",
  "code": "string",          // ISO 639-1, min 2
  "native_name": "string",
  "enabled": true
}

Update — optional fields of the same shape
Item (Language) = Create + { "id", "created_at", "updated_at" }`}</Code>

            {/* Config */}
            <SubTitle>Config</SubTitle>
            <P>
              <Inline>GET /api/config</Inline>
            </P>
            <Code>{`Query
?session_name=string   // omit → global .env view

Response (ConfigResponse)
{
  "categories": {
    "model": [
      {
        "key": "MODEL_NAME",
        "label": "string",
        "type": "string|int|float|bool",
        "value": "...",
        "default": "...",
        "has_value": true,
        "secret": false,
        "editable": true
      }
    ],
    "retrieval": [],
    "chat": [],
    "assistant": [],
    "pinecone": [],
    "mongodb": [],
    "openai": [],
    "ingest": [],
    "langsmith": [],
    "session": []
  },
  "session_name": "string|null",
  "session_scoped": true
}`}</Code>

            <P>
              <Inline>PATCH /api/config</Inline>
            </P>
            <Code>{`Request (ConfigUpdateRequest)
{
  "updates": { "MODEL_NAME": "gpt-4o-mini", "...": "..." },
  "session_name": "string|null"   // set → session Mongo; omit → .env
}

Response (session)
{
  "updated": ["MODEL_NAME", "..."],
  "session_name": "string",
  "config": { /* ConfigResponse shape */ }
}
// Global (.env) response is the shaped config from update_config`}</Code>

            <P>
              <Inline>POST /api/config/reset</Inline>
            </P>
            <Code>{`Request (ConfigResetRequest)
{
  "keys": ["MODEL_NAME"]|null,  // null → all non-secret (or all session keys)
  "include_secrets": false,
  "session_name": "string|null"
}

Response — same shape as PATCH (updated + config / session_name)`}</Code>

            {/* Flow */}
            <SubTitle>Flow</SubTitle>
            <P>
              <Inline>POST /api/flow/http</Inline>
            </P>
            <Code>{`Request (FlowHttpRequest)
{
  "method": "GET|POST|PUT|PATCH|DELETE",
  "url": "string",
  "headers": { "Header": "value" },
  "body": "string|null",
  "timeout_seconds": 20
}

Response (FlowHttpResponse)
{
  "ok": true,
  "status": 200,
  "body": "string",
  "json_data": {}|null,
  "error": "string|null"
}`}</Code>

            <P>
              <Inline>POST /api/flow/mysql</Inline>
            </P>
            <Code>{`Request (FlowMysqlRequest)
{
  "host": "string",
  "port": 3306,
  "database": "string",
  "user": "string",
  "password": "string",
  "sql": "string",
  "result_mode": "first_row|rows_json|scalar",
  "max_rows": 50
}

Response (FlowMysqlResponse)
{
  "ok": true,
  "rows": [{ "col": "value" }],
  "columns": ["col"],
  "row_count": 0,
  "scalar": null,
  "first_row": {}|null,
  "preview": "string",
  "error": "string|null"
}`}</Code>
          </Card>

          {/* Troubleshooting */}
          <Card>
            <SectionTitle id="troubleshooting">Troubleshooting</SectionTitle>
            <Table
              headers={["Symptom", "Likely cause", "Fix"]}
              rows={[
                [
                  "Ingest 500: PyMuPDF not installed",
                  "API venv missing pymupdf",
                  "pip install pymupdf (in .venv used by uvicorn)",
                ],
                [
                  "Answers “I don’t know” with high scores",
                  "Heading-only chunks (legacy index)",
                  "Re-ingest with replace; thin-chunk filter helps on old data",
                ],
                [
                  "Wrong / empty retrieval",
                  "Wrong namespace or empty collection",
                  "Set Data collection on Settings; confirm ingest stats",
                ],
                [
                  "Published config doesn’t change Settings",
                  "Applied to different session",
                  "Match “RAG session” or use Test on RAG (re-applies on load)",
                ],
                [
                  "Mongo / catalog 500",
                  "URI unreachable",
                  "Check MONGODB_URI and network access",
                ],
                [
                  "Pinecone 503 on chat",
                  "Key / SSL / index missing",
                  "Verify PINECONE_* and that ingest created the index",
                ],
                [
                  "Frontend can’t reach API",
                  "CORS or wrong base URL",
                  "NEXT_PUBLIC_API_URL=http://localhost:8000",
                ],
              ]}
            />
            <P>
              Deeper module-level notes also live in the repo file{" "}
              <Inline>RAG.md</Inline>.
            </P>
          </Card>
        </div>
      </div>
    </div>
  );
}
