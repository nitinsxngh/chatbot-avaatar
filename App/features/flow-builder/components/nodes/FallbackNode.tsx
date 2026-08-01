"use client";

import type { NodeProps } from "@xyflow/react";
import type { FallbackFlowNode } from "../../types";
import { FlowNodeShell } from "./FlowNodeShell";

export default function FallbackNode({
  data,
  selected,
}: NodeProps<FallbackFlowNode>) {
  return (
    <FlowNodeShell
      selected={selected}
      accent="#ff9500"
      badge="Fb"
      kind="Fallback"
      title={data.label || "Fallback"}
      subtitle={
        data.runRag
          ? `${data.message || "Unmatched query"} · RAG on`
          : data.message || "Handles unmatched free-text"
      }
    />
  );
}
