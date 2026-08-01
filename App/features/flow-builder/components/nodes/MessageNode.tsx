"use client";

import type { NodeProps } from "@xyflow/react";
import type { MessageFlowNode } from "../../types";
import { FlowNodeShell } from "./FlowNodeShell";

export default function MessageNode({
  data,
  selected,
}: NodeProps<MessageFlowNode>) {
  return (
    <FlowNodeShell
      selected={selected}
      accent="#34c759"
      badge="Msg"
      kind="Message"
      title={data.label || "Message"}
      subtitle={data.text}
    />
  );
}
