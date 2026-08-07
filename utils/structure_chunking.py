"""
Structure-aware chunking: sections from headings, sub-split large blocks,
attach rich metadata for Pinecone retrieval.

Headings are NOT stored as standalone chunks (they match queries well but
contain no answer text). Instead they prefix the following body content.
"""

from __future__ import annotations

from typing import Dict, List

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from utils.metadata_utils import detect_topics, enrich_chunk_metadata
from utils.pdf_parser import ParsedDocument


def _section_path(stack: List[str]) -> str:
    return " > ".join(stack) if stack else ""


def _with_heading_prefix(heading: str, body: str) -> str:
    """Attach section heading to body so retrieval carries definitional context."""
    heading = (heading or "").strip()
    body = (body or "").strip()
    if not heading:
        return body
    if not body:
        return heading
    # Avoid duplicating if body already starts with the heading
    if body.lower().startswith(heading.lower()):
        return body
    return f"{heading}\n\n{body}"


def chunk_parsed_document(
    parsed: ParsedDocument,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> List[Document]:
    """Build LangChain Documents from structure-parsed PDF blocks."""
    section_stack: List[str] = []
    current_section_level = 0
    section_index = 0
    chunk_global_index = 0

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " ", ""],
    )

    documents: List[Document] = []

    for block in parsed.blocks:
        if block.block_type == "heading":
            level = max(1, min(block.heading_level, 3))
            while len(section_stack) >= level:
                section_stack.pop()
            section_stack.append(block.text[:120])
            current_section_level = level
            section_index += 1
            # Do not emit heading-only chunks — they pollute retrieval
            # (high lexical match, zero answer content → "I don't know").
            continue

        text = block.text.strip()
        if not text:
            continue

        section_title = section_stack[-1] if section_stack else parsed.title
        section_path = _section_path(section_stack)
        # Include heading in content so embeddings + LLM see the topic
        prefixed = _with_heading_prefix(section_title, text)

        if len(prefixed) <= chunk_size:
            sub_chunks = [prefixed]
        else:
            # Split body, then re-prefix each sub-chunk with heading
            body_parts = splitter.split_text(text)
            sub_chunks = [
                _with_heading_prefix(section_title, part) for part in body_parts
            ]

        for sub_idx, sub_text in enumerate(sub_chunks):
            sub_text = sub_text.strip()
            if not sub_text or len(sub_text.split()) < 8:
                # Skip tiny fragments that can't answer questions
                continue
            topics_primary, topics_all = detect_topics(sub_text)
            meta = enrich_chunk_metadata(
                {
                    "page": block.page_number - 1,
                    "title": parsed.title,
                    "author": parsed.author,
                },
                sub_text,
                document_id=parsed.document_id,
                source_name=parsed.source_name,
                section_title=section_title,
                section_path=section_path,
                heading_level=current_section_level,
                block_type=block.block_type,
                section_index=section_index,
                chunk_index=chunk_global_index,
                chunk_index_in_section=sub_idx,
                structure_type=block.block_type,
                topics_all=topics_all,
                primary_topic=topics_primary,
            )
            documents.append(Document(page_content=sub_text, metadata=meta))
            chunk_global_index += 1

    return documents


def blocks_to_page_documents(parsed: ParsedDocument) -> List[Document]:
    """Fallback: flatten blocks per page for topic discovery sample."""
    by_page: Dict[int, List[str]] = {}
    for block in parsed.blocks:
        by_page.setdefault(block.page_number, []).append(block.text)
    pages: List[Document] = []
    for page_num in sorted(by_page.keys()):
        content = "\n\n".join(by_page[page_num])
        pages.append(
            Document(
                page_content=content,
                metadata={"page": page_num - 1, "source": parsed.source_name},
            ),
        )
    return pages
