"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ConditionFlowNode } from "../../types";

export default function ConditionNode({
  data,
  selected,
}: NodeProps<ConditionFlowNode>) {
  return (
    <div className={`flow-node flow-node--condition ${selected ? "flow-node--selected" : ""}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="flow-node__handle flow-node__handle--target"
      />

      <div className="flow-node__header">
        <div className="flow-node__badge-row">
          <span className="flow-node__badge" style={{ background: "rgba(175,82,222,0.12)", color: "#af52de" }}>
            If
          </span>
          <span className="flow-node__kind">Condition</span>
        </div>
      </div>

      <p className="flow-node__title">{data.label || "Branch"}</p>
      <p className="flow-node__desc">Match: {data.keywords || "—"}</p>

      <div className="flow-node__ports">
        <span>match</span>
        <span>else</span>
      </div>

      <Handle
        type="source"
        id="match"
        position={Position.Right}
        style={{ top: "62%" }}
        className="flow-node__handle flow-node__handle--source"
      />
      <Handle
        type="source"
        id="else"
        position={Position.Right}
        style={{ top: "78%" }}
        className="flow-node__handle flow-node__handle--source"
      />
    </div>
  );
}
