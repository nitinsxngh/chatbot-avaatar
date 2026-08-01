"use client";

import type { NodeProps } from "@xyflow/react";
import type { EndFlowNode } from "../../types";
import { FlowNodeShell } from "./FlowNodeShell";

export default function EndNode({ data, selected }: NodeProps<EndFlowNode>) {
  return (
    <FlowNodeShell
      selected={selected}
      accent="#8e8e93"
      badge="End"
      kind="End"
      title={data.label || "End"}
      subtitle={data.farewell || undefined}
      source={false}
    />
  );
}
