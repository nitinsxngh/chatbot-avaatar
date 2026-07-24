from typing import Optional

import ingest


def run_ingest(pdf_path: Optional[str] = None) -> dict:
    return ingest.ingest(pdf_path=pdf_path)
