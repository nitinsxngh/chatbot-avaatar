"use client";

import type { NodeProps } from "@xyflow/react";
import type { KnowledgeFlowNode } from "../../types";
import { FlowNodeShell } from "./FlowNodeShell";

export default function KnowledgeNode({
  data,
  selected,
}: NodeProps<KnowledgeFlowNode>) {
  return (
    <FlowNodeShell
      selected={selected}
      accent="#5856d6"
      badge="RAG"
      kind="Knowledge"
      title={data.label || "Knowledge"}
      subtitle={
        data.queryHint
          ? `Query: ${data.queryHint}`
          : "Uses the user’s last message"
      }
    />
  );
}
