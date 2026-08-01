"use client";

import type { NodeProps } from "@xyflow/react";
import type { QuestionFlowNode } from "../../types";
import { FlowNodeShell } from "./FlowNodeShell";

export default function QuestionNode({
  data,
  selected,
}: NodeProps<QuestionFlowNode>) {
  return (
    <FlowNodeShell
      selected={selected}
      accent="#ff9500"
      badge="Q"
      kind="Question"
      title={data.label || "Question"}
      subtitle={data.prompt}
    />
  );
}
