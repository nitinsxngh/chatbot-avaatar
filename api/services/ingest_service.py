from pathlib import Path
from typing import Optional

import ingest

UPLOADS_DIR = Path(__file__).resolve().parents[2] / "Documents" / "uploads"


def run_ingest(pdf_path: Optional[str] = None) -> dict:
    return ingest.ingest(pdf_path=pdf_path)


def save_upload(filename: str, content: bytes) -> str:
    """Save an uploaded PDF under Documents/uploads and return relative path."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = Path(filename).name
    if not safe_name.lower().endswith(".pdf"):
        raise ValueError("Only PDF uploads are supported")
    target = UPLOADS_DIR / safe_name
    target.write_bytes(content)
    # Path relative to project root for ingest
    return str(Path("Documents") / "uploads" / safe_name)
