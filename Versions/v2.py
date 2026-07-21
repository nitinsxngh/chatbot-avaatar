"""
LangChain RAG chatbot with intent routing + reranking.

Vector DB: Pinecone
Memory:    MongoDB

Flow:
  Question → Intent → Need documents?
                      YES → (rewrite query) → Retriever → Reranker → GPT
                      NO  → Normal Chat
"""

import os
import re
from datetime import datetime, timezone

from dotenv import load_dotenv
from langchain_community.document_compressors import FlashrankRerank
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pymongo import MongoClient

load_dotenv()

# --- Config ---
MODEL_NAME = "gpt-4o-mini"
TEMPERATURE = 0.2
MAX_HISTORY_TURNS = 10  # keep last N question/answer pairs
RETRIEVE_K = 10  # candidates from vector DB (before rerank)
RERANK_TOP_N = 3  # best chunks kept after reranking
EMBEDDING_MODEL = "text-embedding-3-small"
SHOW_SNIPPET_CHARS = 180  # how much of each best chunk to print
SESSION_ID = os.getenv("CHAT_SESSION_ID", "default")

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "chatbot-avatar")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "chatbot_avatar")
MONGODB_COLLECTION = os.getenv("MONGODB_COLLECTION", "chat_memory")

# --- Model ---
llm = ChatOpenAI(
    model=MODEL_NAME,
    temperature=TEMPERATURE,
)

# Cheap classifier / rewriter (same model, low temp)
router_llm = ChatOpenAI(model=MODEL_NAME, temperature=0)

# --- Normal chat (no documents) ---
CHAT_SYSTEM = (
    "You are a friendly digital marketing assistant. "
    "Reply naturally to greetings, small talk, and follow-up clarification "
    "using the conversation history. Keep answers clear and concise."
)

chat_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", CHAT_SYSTEM),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ]
)
chat_chain = chat_prompt | llm | StrOutputParser()

# --- RAG chat (with documents) ---
RAG_SYSTEM = (
    "You are a helpful digital marketing assistant. "
    "Use the provided context from the document to answer. "
    "Also use conversation history for follow-up questions. "
    "If the context does not contain the answer, say you don't know "
    "based on the document. Keep answers clear and concise."
)

rag_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", RAG_SYSTEM),
        MessagesPlaceholder(variable_name="chat_history"),
        (
            "human",
            "Context from the document:\n{context}\n\nQuestion: {question}",
        ),
    ]
)
rag_chain = rag_prompt | llm | StrOutputParser()

# --- Query rewrite (for follow-ups that still need docs) ---
rewrite_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "Rewrite the user's latest message into a standalone search query "
            "using the chat history. Return ONLY the search query, nothing else.",
        ),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ]
)
rewrite_chain = rewrite_prompt | router_llm | StrOutputParser()

# --- Pinecone vector DB + Reranker ---
embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL)
vector_store = None
retriever = None
reranker = FlashrankRerank(
    model="ms-marco-TinyBERT-L-2-v2",
    top_n=RERANK_TOP_N,
)

if PINECONE_API_KEY:
    vector_store = PineconeVectorStore.from_existing_index(
        index_name=PINECONE_INDEX_NAME,
        embedding=embeddings,
    )
    retriever = vector_store.as_retriever(search_kwargs={"k": RETRIEVE_K})

# --- MongoDB memory ---
mongo_client = MongoClient(MONGODB_URI)
mongo_collection = mongo_client[MONGODB_DB][MONGODB_COLLECTION]


def load_history(session_id: str) -> list:
    """Load chat history for a session from MongoDB."""
    doc = mongo_collection.find_one({"session_id": session_id})
    if not doc:
        return []

    messages = []
    for item in doc.get("messages", []):
        role = item.get("role")
        content = item.get("content", "")
        if role == "human":
            messages.append(HumanMessage(content=content))
        elif role == "ai":
            messages.append(AIMessage(content=content))
    return messages


def save_history(session_id: str, messages: list) -> None:
    """Save chat history for a session to MongoDB (trimmed)."""
    max_messages = MAX_HISTORY_TURNS * 2
    trimmed = messages[-max_messages:]

    payload = []
    for msg in trimmed:
        if isinstance(msg, HumanMessage):
            role = "human"
        elif isinstance(msg, AIMessage):
            role = "ai"
        else:
            continue
        payload.append({"role": role, "content": msg.content})

    mongo_collection.update_one(
        {"session_id": session_id},
        {
            "$set": {
                "session_id": session_id,
                "messages": payload,
                "updated_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )


chat_history: list = load_history(SESSION_ID)

# Greetings / small talk → Normal Chat (no retrieval)
CHAT_PATTERNS = re.compile(
    r"^\s*("
    r"hi|hello|hey|hiya|yo|"
    r"good\s*(morning|afternoon|evening)|"
    r"how\s+are\s+you|what'?s\s+up|how'?s\s+it\s+going|"
    r"my\s+day\s+is\b.*|i'?m\s+(good|fine|great|ok|okay|well)\b.*|"
    r"(doing|going)\s+(good|great|fine|well|ok|okay)\b.*|"
    r"thanks|thank\s+you|thx|"
    r"bye|goodbye|see\s+you|ok|okay|cool|nice|"
    r"who\s+are\s+you|what\s+can\s+you\s+do"
    r")[\s!?.]*$",
    re.IGNORECASE,
)

# Clarifications about the previous answer → Normal Chat (use memory, skip retrieval)
FOLLOWUP_PATTERNS = re.compile(
    r"^\s*("
    r"(can\s+you\s+)?(please\s+)?(explain|repeat|clarify|summarize|simplify)"
    r"(\s+(it|that|this|again|more))?|"
    r"(say|tell)\s+(that|it|me)\s+again|"
    r"what\s+do\s+you\s+mean|"
    r"(more\s+)?(details|detail)|"
    r"elaborate(\s+(on\s+)?(that|it|this))?|"
    r"in\s+(simple|simpler|other)\s+words"
    r")[\s!?.]*$",
    re.IGNORECASE,
)


def classify_intent(question: str) -> str:
    """
    Intent step.
    Returns:
      - "chat"     → greetings / small talk (no docs)
      - "followup" → clarify previous answer from memory (no docs)
      - "document" → retrieve from Pinecone
    """
    text = question.strip()
    if CHAT_PATTERNS.match(text):
        return "chat"
    if FOLLOWUP_PATTERNS.match(text) and chat_history:
        return "followup"
    return "document"


def needs_documents(intent: str) -> bool:
    """Decide whether this intent should use the retriever."""
    return intent == "document"


def rewrite_search_query(question: str) -> str:
    """Make a standalone search query using recent chat history."""
    if not chat_history:
        return question
    rewritten = rewrite_chain.invoke(
        {"question": question, "chat_history": chat_history[-6:]}
    ).strip()
    return rewritten or question


def format_docs(docs) -> str:
    """Join retrieved chunks into one context string."""
    if not docs:
        return "No relevant context found."
    return "\n\n---\n\n".join(doc.page_content for doc in docs)


def page_label(metadata: dict) -> str:
    """Best-effort page number from Pinecone metadata."""
    page = metadata.get("page")
    if page is None:
        page = metadata.get("page_label")
    try:
        # Pinecone may return floats / strings
        page_num = int(float(page))
        # page is 0-based in PDF loader; page_label is often 1-based string
        if metadata.get("page") is not None:
            page_num += 1
        return f"page {page_num}"
    except (TypeError, ValueError):
        return "page ?"


def show_best_docs(docs) -> None:
    """Print the best reranked chunks with scores."""
    if not docs:
        print("Best chunks: (none)")
        return

    print(f"Best {len(docs)} chunk(s) after rerank:")
    for i, doc in enumerate(docs, start=1):
        raw_score = doc.metadata.get("relevance_score")
        snippet = " ".join(doc.page_content.split())
        if len(snippet) > SHOW_SNIPPET_CHARS:
            snippet = snippet[:SHOW_SNIPPET_CHARS] + "..."

        try:
            score_text = f"{float(raw_score):.3f}"
        except (TypeError, ValueError):
            score_text = "n/a"

        print(f"  #{i}  score={score_text}  ({page_label(doc.metadata)})")
        print(f"      {snippet}")


def remember(question: str, answer: str) -> None:
    """Save this turn to MongoDB memory."""
    chat_history.append(HumanMessage(content=question))
    chat_history.append(AIMessage(content=answer))
    save_history(SESSION_ID, chat_history)

    max_messages = MAX_HISTORY_TURNS * 2
    if len(chat_history) > max_messages:
        del chat_history[:-max_messages]


def ask(question: str) -> str:
    """
    Question → Intent → Need documents?
                         YES → rewrite → Retriever → Reranker → GPT
                         NO  → Normal Chat
    """
    # 1. Intent
    intent = classify_intent(question)

    # 2. Route
    if needs_documents(intent):
        # YES → rewrite query → Retriever → Reranker → GPT
        search_query = rewrite_search_query(question)
        if search_query != question:
            print(f"[search_query={search_query}]")

        candidates = retriever.invoke(search_query)
        best_docs = reranker.compress_documents(candidates, query=search_query)

        show_best_docs(best_docs)
        context = format_docs(best_docs)

        answer = rag_chain.invoke(
            {
                "question": question,
                "chat_history": chat_history,
                "context": context,
            }
        )
        route = "RAG"
    else:
        # NO → Normal Chat (greetings, small talk, follow-up clarifications)
        answer = chat_chain.invoke(
            {
                "question": question,
                "chat_history": chat_history,
            }
        )
        route = "CHAT"

    print(f"[intent={intent} | route={route}]")
    remember(question, answer)
    return answer


def main() -> None:
    if not PINECONE_API_KEY or retriever is None:
        print("Pinecone is not configured. Add PINECONE_API_KEY to .env, then run:")
        print("  python ingest.py")
        return

    # Quick MongoDB connectivity check
    try:
        mongo_client.admin.command("ping")
    except Exception as exc:
        print("MongoDB connection failed. Check MONGODB_URI in .env")
        print(f"  Error: {exc}")
        return

    print("LangChain RAG Chatbot (Pinecone + MongoDB)")
    print("  Question → Intent → Docs? → Retriever → Reranker → GPT  or  Normal Chat")
    print(f"Model: {MODEL_NAME} | Temperature: {TEMPERATURE}")
    print(f"Vector DB: Pinecone ({PINECONE_INDEX_NAME})")
    print(f"Memory: MongoDB ({MONGODB_DB}.{MONGODB_COLLECTION}) | session={SESSION_ID}")
    print(
        f"History: last {MAX_HISTORY_TURNS} turns | "
        f"Retrieve: {RETRIEVE_K} → Rerank top: {RERANK_TOP_N}"
    )
    print("Type 'quit' or 'exit' to stop.\n")

    while True:
        question = input("You: ").strip()

        if not question:
            continue

        if question.lower() in {"quit", "exit", "q"}:
            print("Goodbye!")
            break

        answer = ask(question)
        print(f"Bot: {answer}\n")


if __name__ == "__main__":
    main()
