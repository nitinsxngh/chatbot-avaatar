"""Shared metadata helpers for ingest + retrieval filtering."""

import re
from typing import Optional

# Topic keywords used at ingest time and for query-time filtering
TOPIC_KEYWORDS: dict = {
    "seo": ["seo", "search engine optimization", "search engine", "organic search"],
    "content_marketing": ["content marketing", "content strategy", "blog", "copywriting"],
    "social_media": [
        "social media",
        "facebook",
        "twitter",
        "instagram",
        "linkedin",
        "tiktok",
    ],
    "crm": ["crm", "customer relationship", "retention", "loyalty"],
    "ppc": [
        "ppc",
        "pay per click",
        "paid search",
        "display advertising",
        "programmatic",
    ],
    "analytics": ["analytics", "metrics", "kpi", "measurement", "reporting", "data"],
    "strategy": ["strategy", "planning", "digital marketing strategy", "roadmap"],
    "personalization": [
        "personalization",
        "personalisation",
        "personalized",
        "personalised",
    ],
    "email": ["email marketing", "newsletter", "e-mail"],
    "ux": ["user experience", "usability", "ux ", " ui "],
    "regulation": ["regulation", "gdpr", "privacy", "compliance", "cookie"],
    "affiliate": ["affiliate marketing", "affiliate network"],
    "mobile": ["mobile marketing", "mobile app", "smartphone"],
}


def detect_topics(text: str):
    """Return primary topic + all matching topics for a chunk."""
    lowered = text.lower()
    scores = {}

    for topic, keywords in TOPIC_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in lowered)
        if hits:
            scores[topic] = hits

    if not scores:
        return "general", ["general"]

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    primary_topic = ranked[0][0]
    topics = [topic for topic, _ in ranked]
    return primary_topic, topics


def enrich_chunk_metadata(metadata: dict, text: str) -> dict:
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
        "source": metadata.get("source") or "",
        "title": metadata.get("title") or "",
        "author": metadata.get("author") or "",
    }
    # Drop empty strings / None so Pinecone metadata stays clean
    return {k: v for k, v in enriched.items() if v not in (None, "")}


def detect_topics_in_query(query: str) -> list:
    """Find topics mentioned in a user question."""
    lowered = query.lower()
    matched = []
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(kw in lowered for kw in keywords):
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

    Examples:
      "What is SEO?"           -> {"primary_topic": {"$eq": "seo"}}
      "Explain page 63"        -> {"page_number": {"$eq": 63}}
      "SEO on page 105"        -> {"$and": [...]}
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
