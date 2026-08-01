"""Execute HTTP and MySQL operations for flow nodes."""

from __future__ import annotations

import json
from typing import Any, Optional
from urllib import error as urlerror
from urllib import request as urlrequest

from api.schemas.flow import (
    FlowHttpRequest,
    FlowHttpResponse,
    FlowMysqlRequest,
    FlowMysqlResponse,
)


def execute_http(req: FlowHttpRequest) -> FlowHttpResponse:
    method = req.method.upper()
    headers = {str(k): str(v) for k, v in (req.headers or {}).items()}
    data: Optional[bytes] = None
    if method in {"POST", "PUT", "PATCH", "DELETE"} and req.body is not None:
        data = req.body.encode("utf-8")
        headers.setdefault("Content-Type", "application/json")

    http_req = urlrequest.Request(
        req.url,
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urlrequest.urlopen(http_req, timeout=req.timeout_seconds) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            status = getattr(resp, "status", 200) or 200
            json_data: Optional[Any] = None
            try:
                json_data = json.loads(raw) if raw.strip() else None
            except json.JSONDecodeError:
                json_data = None
            return FlowHttpResponse(
                ok=200 <= status < 400,
                status=status,
                body=raw,
                json_data=json_data,
            )
    except urlerror.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace") if exc.fp else str(exc)
        json_data = None
        try:
            json_data = json.loads(raw) if raw.strip() else None
        except json.JSONDecodeError:
            json_data = None
        return FlowHttpResponse(
            ok=False,
            status=exc.code or 0,
            body=raw,
            json_data=json_data,
            error=f"HTTP {exc.code}: {exc.reason}",
        )
    except Exception as exc:  # noqa: BLE001 — surface to flow test chat
        return FlowHttpResponse(
            ok=False,
            status=0,
            body="",
            error=str(exc),
        )


def _serialize_cell(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:  # noqa: BLE001
            return str(value)
    return str(value)


def execute_mysql(req: FlowMysqlRequest) -> FlowMysqlResponse:
    try:
        import pymysql
        from pymysql.cursors import DictCursor
    except ImportError:
        return FlowMysqlResponse(
            ok=False,
            error="pymysql is not installed. Run: pip install pymysql",
        )

    sql = (req.sql or "").strip()
    if not sql:
        return FlowMysqlResponse(ok=False, error="SQL is empty.")

    # Soft guard: reject multi-statements
    if ";" in sql.rstrip(";"):
        return FlowMysqlResponse(
            ok=False,
            error="Multiple SQL statements are not allowed.",
        )

    conn = None
    try:
        conn = pymysql.connect(
            host=req.host,
            port=int(req.port or 3306),
            user=req.user,
            password=req.password or "",
            database=req.database,
            connect_timeout=8,
            read_timeout=20,
            write_timeout=20,
            charset="utf8mb4",
            cursorclass=DictCursor,
        )
        with conn.cursor() as cur:
            cur.execute(sql)
            if cur.description:
                rows_raw = cur.fetchmany(max(1, min(req.max_rows, 200)))
                columns = [d[0] for d in cur.description]
                rows = [
                    {k: _serialize_cell(v) for k, v in row.items()}
                    for row in rows_raw
                ]
            else:
                conn.commit()
                columns = []
                rows = []
                affected = cur.rowcount
                preview = f"OK — {affected} row(s) affected"
                return FlowMysqlResponse(
                    ok=True,
                    rows=[],
                    columns=[],
                    row_count=affected,
                    preview=preview,
                )

        first = rows[0] if rows else None
        scalar = None
        if first and columns:
            scalar = first.get(columns[0])

        if req.result_mode == "scalar":
            preview = "" if scalar is None else str(scalar)
        elif req.result_mode == "first_row":
            preview = json.dumps(first or {}, ensure_ascii=False, default=str)
        else:
            preview = json.dumps(rows, ensure_ascii=False, default=str)

        if len(preview) > 4000:
            preview = preview[:4000] + "…"

        return FlowMysqlResponse(
            ok=True,
            rows=rows,
            columns=columns,
            row_count=len(rows),
            scalar=scalar,
            first_row=first,
            preview=preview,
        )
    except Exception as exc:  # noqa: BLE001
        return FlowMysqlResponse(ok=False, error=str(exc))
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:  # noqa: BLE001
                pass
