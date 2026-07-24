"""
Dynamic metadata helpers for ingest + retrieval filtering.

Topics are discovered per document (any PDF domain), persisted to
`.cache/document_profile.json`, and reused at query time.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROFILE_PATH = PROJECT_ROOT / ".cache" / "document_profile.json"

# In-memory topic vocabulary: topic_slug -> list of keywords/phrases
_TOPIC_VOCABULARY: Dict[str, List[str]] = {}

# Common English stopwords (domain-agnostic)
_STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "if", "then", "else", "when", "at",
    "by", "for", "with", "about", "against", "between", "into", "through",
    "during", "before", "after", "above", "below", "to", "from", "up", "down",
    "in", "out", "on", "off", "over", "under", "again", "further", "once",
    "here", "there", "all", "any", "both", "each", "few", "more", "most",
    "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so",
    "than", "too", "very", "can", "will", "just", "should", "now", "also",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "of", "as", "it", "its", "this", "that", "these",
    "those", "i", "you", "he", "she", "we", "they", "them", "their", "our",
    "my", "your", "his", "her", "what", "which", "who", "whom", "how", "why",
    "where", "chapter", "section", "figure", "table", "page", "pages", "see",
    "using", "used", "use", "may", "might", "must", "shall", "would", "could",
}


def slugify_topic(text: str) -> str:
    """Normalize a topic label to a Pinecone-safe slug."""
    slug = re.sub(r"[^a-z0-9]+", "_", (text or "").lower()).strip("_")
    return slug[:64] or "general"


def get_topic_vocabulary() -> Dict[str, List[str]]:
    """Return the active topic vocabulary (from memory or disk)."""
    global _TOPIC_VOCABULARY
    if _TOPIC_VOCABULARY:
        return _TOPIC_VOCABULARY
    profile = load_document_profile()
    vocab = profile.get("topics") or {}
    if isinstance(vocab, dict) and vocab:
        _TOPIC_VOCABULARY = {
            slugify_topic(k): [str(x).lower() for x in (v or [])]
            for k, v in vocab.items()
        }
    return _TOPIC_VOCABULARY


def set_topic_vocabulary(topics: Dict[str, List[str]]) -> None:
    """Replace in-memory topic vocabulary."""
    global _TOPIC_VOCABULARY
    _TOPIC_VOCABULARY = {
        slugify_topic(k): [str(x).lower() for x in (v or []) if str(x).strip()]
        for k, v in (topics or {}).items()
    }


def load_document_profile() -> dict:
    """Load persisted profile for the last ingested document."""
    if not PROFILE_PATH.exists():
        return {}
    try:
        return json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_document_profile(profile: dict) -> None:
    """Persist document profile + topic vocabulary."""
    PROFILE_PATH.parent.mkdir(parents=True, exist_ok=True)
    PROFILE_PATH.write_text(json.dumps(profile, indent=2), encoding="utf-8")
    if profile.get("topics"):
        set_topic_vocabulary(profile["topics"])


def _tokenize(text: str) -> List[str]:
    return re.findall(r"[a-z0-9][a-z0-9\-']{1,}", (text or "").lower())


def extract_keyword_candidates(text: str, top_n: int = 12) -> List[str]:
    """Domain-agnostic keyword/phrase candidates from free text."""
    tokens = [t for t in _tokenize(text) if t not in _STOPWORDS and len(t) > 2]
    if not tokens:
        return []

    counts = Counter(tokens)
    # Also score bigrams
    bigrams = [
        f"{tokens[i]} {tokens[i + 1]}"
        for i in range(len(tokens) - 1)
        if tokens[i] not in _STOPWORDS and tokens[i + 1] not in _STOPWORDS
    ]
    counts.update(bigrams)

    ranked = [term for term, _ in counts.most_common(top_n * 2)]
    # Prefer multi-word phrases slightly by keeping order; dedupe singles covered by phrases
    selected: List[str] = []
    for term in ranked:
        if len(selected) >= top_n:
            break
        selected.append(term)
    return selected


def heuristic_discover_topics(sample_text: str, max_topics: int = 12) -> Dict[str, List[str]]:
    """
    Build a topic vocabulary from document sample without an LLM.
    Each top keyword becomes a topic slug with itself + related tokens as keywords.
    """
    candidates = extract_keyword_candidates(sample_text, top_n=max_topics * 2)
    topics: Dict[str, List[str]] = {}

    for term in candidates:
        if len(topics) >= max_topics:
            break
        slug = slugify_topic(term)
        if slug in topics or slug == "general":
            continue
        # Keywords: the term itself + single tokens from the phrase
        keywords = [term]
        keywords.extend(t for t in term.split() if t not in _STOPWORDS and len(t) > 2)
        topics[slug] = list(dict.fromkeys(keywords))

    if not topics:
        topics = {"general": ["general", "overview", "introduction"]}
    return topics


def discover_document_topics_with_llm(sample_text: str, max_topics: int = 12) -> Dict[str, Any]:
    """
    Ask an LLM to discover domain + topic vocabulary for any PDF.
    Falls back to heuristic discovery on failure.
    """
    sample = (sample_text or "")[:12000]
    if not sample.strip():
        return {
            "document_title": "Untitled document",
            "domain": "general knowledge",
            "assistant_role": "document assistant",
            "topics": heuristic_discover_topics(sample_text, max_topics=max_topics),
            "discovery_method": "heuristic",
        }

    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.output_parsers import StrOutputParser

        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You analyze document samples and output ONLY valid JSON (no markdown).\n"
                    "Schema:\n"
                    "{\n"
                    '  "document_title": "short title",\n'
                    '  "domain": "short domain description",\n'
                    '  "assistant_role": "2-5 word specialty for an assistant that helps with this document",\n'
                    '  "topics": {\n'
                    '     "topic_slug": ["keyword or phrase", "..."],\n'
                    "     ...\n"
                    "  }\n"
                    "}\n"
                    f"Provide 5-{max_topics} topics. topic_slug must be snake_case. "
                    "Keywords should help match user questions to sections. "
                    "Works for ANY domain (legal, medical, tech, history, marketing, etc.).",
                ),
                ("human", "Document sample:\n\n{sample}"),
            ]
        )
        raw = (prompt | llm | StrOutputParser()).invoke({"sample": sample}).strip()
        # Strip accidental code fences
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.IGNORECASE).strip()
        data = json.loads(raw)

        topics_raw = data.get("topics") or {}
        topics: Dict[str, List[str]] = {}
        for key, keywords in topics_raw.items():
            slug = slugify_topic(str(key))
            if not slug:
                continue
            kw_list = [str(x).lower() for x in (keywords or []) if str(x).strip()]
            if not kw_list:
                kw_list = [slug.replace("_", " ")]
            topics[slug] = kw_list

        if not topics:
            topics = heuristic_discover_topics(sample_text, max_topics=max_topics)

        return {
            "document_title": str(data.get("document_title") or "Untitled document"),
            "domain": str(data.get("domain") or "general knowledge"),
            "assistant_role": str(data.get("assistant_role") or "document assistant"),
            "topics": topics,
            "discovery_method": "llm",
        }
    except Exception as exc:
        print(f"[topic_discovery] LLM failed ({type(exc).__name__}: {exc}); using heuristic")
        return {
            "document_title": "Untitled document",
            "domain": "general knowledge",
            "assistant_role": "document assistant",
            "topics": heuristic_discover_topics(sample_text, max_topics=max_topics),
            "discovery_method": "heuristic",
        }


def detect_topics(text: str) -> Tuple[str, List[str]]:
    """Return primary topic + all matching topics for a chunk using active vocabulary."""
    lowered = (text or "").lower()
    vocab = get_topic_vocabulary()
    scores: Dict[str, int] = {}

    if vocab:
        for topic, keywords in vocab.items():
            hits = sum(1 for kw in keywords if kw and kw in lowered)
            if hits:
                scores[topic] = hits

    if not scores:
        # Fallback: derive a soft topic from chunk keywords
        candidates = extract_keyword_candidates(text, top_n=3)
        if candidates:
            primary = slugify_topic(candidates[0])
            return primary, [slugify_topic(c) for c in candidates]
        return "general", ["general"]

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    primary_topic = ranked[0][0]
    topics = [topic for topic, _ in ranked]
    return primary_topic, topics


def enrich_chunk_metadata(
    metadata: dict,
    text: str,
    document_id: str = "",
    source_name: str = "",
) -> dict:
    """Add filter-friendly metadata to a chunk (Pinecone-safe fields only)."""
    page = metadata.get("page")
    try:
        page_number = int(float(page)) + 1  # PDF loader uses 0-based pages
    except (TypeError, ValueError):
        page_number = None

    primary_topic, topics = detect_topics(text)

    enriched = {
        "page_number": page_number,
        "page_label": str(metadata.get("page_label") or page_number or ""),
        "primary_topic": primary_topic,
        "topics": topics,
        "source": source_name or metadata.get("source") or "",
        "title": metadata.get("title") or "",
        "author": metadata.get("author") or "",
        "document_id": document_id or "",
    }
    return {k: v for k, v in enriched.items() if v not in (None, "")}


def detect_topics_in_query(query: str) -> list:
    """Find topics mentioned in a user question using the active vocabulary."""
    lowered = (query or "").lower()
    matched = []
    for topic, keywords in get_topic_vocabulary().items():
        if any(kw and kw in lowered for kw in keywords):
            matched.append(topic)
        elif topic.replace("_", " ") in lowered:
            matched.append(topic)
    return matched


def extract_page_from_query(query: str) -> Optional[int]:
    """Extract a page number if the user asks about a specific page."""
    match = re.search(r"\bpage\s+(\d+)\b", query, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None


def build_metadata_filter(query: str) -> Optional[dict]:
    """
    Build a Pinecone metadata filter from the search query.

    Uses the dynamic topic vocabulary discovered at ingest time.
    """
    clauses = []

    page_number = extract_page_from_query(query)
    if page_number is not None:
        clauses.append({"page_number": {"$eq": page_number}})

    topics = detect_topics_in_query(query)
    if topics:
        if len(topics) == 1:
            clauses.append({"primary_topic": {"$eq": topics[0]}})
        else:
            clauses.append({"primary_topic": {"$in": topics}})

    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


def filter_label(metadata_filter: Optional[dict]) -> str:
    """Human-readable filter for logs."""
    if not metadata_filter:
        return "none"
    return str(metadata_filter)


def build_sample_text(pages: list, max_pages: int = 20, max_chars: int = 12000) -> str:
    """Concatenate early pages for topic discovery."""
    parts = []
    total = 0
    for page in pages[:max_pages]:
        content = getattr(page, "page_content", "") or ""
        if not content.strip():
            continue
        parts.append(content.strip())
        total += len(content)
        if total >= max_chars:
            break
    return "\n\n".join(parts)[:max_chars]
