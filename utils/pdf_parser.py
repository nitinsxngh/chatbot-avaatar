"""
Structure-aware PDF parsing using PyMuPDF.

Extracts text blocks with font-size heuristics for headings, sections,
and reading order — better than flat page text for RAG chunking.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Tuple

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None  # type: ignore[assignment]


@dataclass
class ParsedBlock:
    text: str
    page_number: int  # 1-based
    block_type: str  # heading | paragraph | list | table
    heading_level: int  # 0 = body, 1-3 = heading depth
    font_size: float = 0.0
    order: int = 0


@dataclass
class ParsedDocument:
    source_path: str
    source_name: str
    document_id: str
    page_count: int
    blocks: List[ParsedBlock] = field(default_factory=list)
    title: str = ""
    author: str = ""


def _clean_text(text: str) -> str:
    text = (text or "").replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _median_body_size(sizes: List[float]) -> float:
    if not sizes:
        return 11.0
    sizes = sorted(sizes)
    mid = len(sizes) // 2
    return sizes[mid]


def _classify_line(
    text: str,
    font_size: float,
    body_size: float,
) -> Tuple[str, int]:
    stripped = text.strip()
    if not stripped:
        return "paragraph", 0

    # List-like lines
    if re.match(r"^(\d+[\.\)]|[•\-*])\s+\S", stripped):
        return "list", 0

    # Heading heuristics: larger font or short title-like line
    if font_size >= body_size * 1.35 and len(stripped) < 120:
        if font_size >= body_size * 1.8:
            return "heading", 1
        return "heading", 2

    if len(stripped) < 80 and stripped.isupper() and len(stripped.split()) <= 8:
        return "heading", 2

    # Chapter / section patterns
    if re.match(r"^(chapter|section|part)\s+[\d\w]+", stripped, re.I):
        return "heading", 1

    return "paragraph", 0


def parse_pdf_structure(path: Path) -> ParsedDocument:
    if fitz is None:
        raise RuntimeError(
            "PyMuPDF is not installed. Run: pip install pymupdf",
        )

    path = path.resolve()
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    doc = fitz.open(str(path))
    meta = doc.metadata or {}
    title = (meta.get("title") or "").strip()
    author = (meta.get("author") or "").strip()
    page_count = len(doc)

    line_sizes: List[float] = []
    raw_lines: List[Tuple[str, int, float]] = []

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_number = page_idx + 1
        page_dict = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)

        for block in page_dict.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                if not spans:
                    continue
                line_text = "".join(s.get("text", "") for s in spans).strip()
                if not line_text:
                    continue
                max_size = max(float(s.get("size", 0) or 0) for s in spans)
                if max_size > 0:
                    line_sizes.append(max_size)
                raw_lines.append((line_text, page_number, max_size))

    doc.close()

    body_size = _median_body_size(line_sizes)
    parsed_blocks: List[ParsedBlock] = []
    order = 0

    # Merge consecutive lines into paragraphs / headings
    buffer: List[str] = []
    buffer_page = 1
    buffer_type = "paragraph"
    buffer_level = 0
    buffer_size = body_size

    def flush_buffer() -> None:
        nonlocal order, buffer, buffer_page, buffer_type, buffer_level, buffer_size
        if not buffer:
            return
        text = _clean_text("\n".join(buffer))
        if not text:
            buffer = []
            return
        parsed_blocks.append(
            ParsedBlock(
                text=text,
                page_number=buffer_page,
                block_type=buffer_type,
                heading_level=buffer_level,
                font_size=buffer_size,
                order=order,
            ),
        )
        order += 1
        buffer = []

    for line_text, page_number, font_size in raw_lines:
        block_type, heading_level = _classify_line(line_text, font_size, body_size)

        if block_type == "heading" and buffer:
            flush_buffer()

        if block_type == "heading":
            flush_buffer()
            parsed_blocks.append(
                ParsedBlock(
                    text=_clean_text(line_text),
                    page_number=page_number,
                    block_type="heading",
                    heading_level=heading_level,
                    font_size=font_size,
                    order=order,
                ),
            )
            order += 1
            continue

        if buffer and (
            block_type != buffer_type
            or page_number != buffer_page
            and len(buffer) > 3
        ):
            flush_buffer()

        if not buffer:
            buffer_page = page_number
            buffer_type = block_type
            buffer_level = heading_level
            buffer_size = font_size

        buffer.append(line_text)

    flush_buffer()

    if not title and parsed_blocks:
        first_heading = next(
            (b for b in parsed_blocks if b.block_type == "heading"),
            None,
        )
        if first_heading:
            title = first_heading.text[:120]
        else:
            title = path.stem.replace("_", " ").replace("-", " ")

    return ParsedDocument(
        source_path=str(path),
        source_name=path.name,
        document_id=path.stem[:80],
        page_count=page_count,
        blocks=parsed_blocks,
        title=title,
        author=author,
    )
