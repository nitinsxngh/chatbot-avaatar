"use client";

import type { NodeProps } from "@xyflow/react";
import type { ApiFlowNode } from "../../types";
import { FlowNodeShell } from "./FlowNodeShell";

export default function ApiNode({ data, selected }: NodeProps<ApiFlowNode>) {
  const base =
    (data.connectionString || data.url || "").trim() || "No connection string";
  const path = (data.path || "").trim();
  const display = path ? `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}` : base;
  const short =
    display.length > 42 ? `${display.slice(0, 40)}…` : display;
  return (
    <FlowNodeShell
      selected={selected}
      accent="#0a84ff"
      badge="API"
      kind="API"
      title={data.label || "HTTP request"}
      subtitle={`${data.method || "GET"} · ${short}`}
      tag={data.variableName || "api"}
    />
  );
}
