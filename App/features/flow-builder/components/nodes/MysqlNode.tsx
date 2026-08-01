"use client";

import type { NodeProps } from "@xyflow/react";
import type { MysqlFlowNode } from "../../types";
import { FlowNodeShell } from "./FlowNodeShell";

export default function MysqlNode({
  data,
  selected,
}: NodeProps<MysqlFlowNode>) {
  const host = data.host || "host";
  const db = data.database || "db";
  return (
    <FlowNodeShell
      selected={selected}
      accent="#00758f"
      badge="SQL"
      kind="MySQL"
      title={data.label || "MySQL query"}
      subtitle={`${host}:${data.port || "3306"} / ${db}`}
      tag={data.variableName || "db"}
    />
  );
}
