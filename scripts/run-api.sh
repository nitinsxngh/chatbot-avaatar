#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .venv/bin/activate ]]; then
  source .venv/bin/activate
fi

pip install -q fastapi uvicorn python-multipart 2>/dev/null || true

exec uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
