"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { INTENT_FALLBACK_HANDLE, type IntentFlowNode } from "../../types";

export default function IntentNode({
  data,
  selected,
}: NodeProps<IntentFlowNode>) {
  const options = data.options?.length
    ? data.options
    : [{ id: "intent-empty", label: "Add intents…" }];

  return (
    <div
      className={`flow-node flow-node--intent ${selected ? "flow-node--selected" : ""}`}
      style={{ ["--node-accent" as string]: "#ff2d55" }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="flow-node__handle flow-node__handle--target"
      />

      <div className="flow-node__header">
        <div className="flow-node__badge-row">
          <span className="flow-node__badge">Int</span>
          <span className="flow-node__kind">Intent</span>
        </div>
      </div>

      <p className="flow-node__title">{data.label || "Intent menu"}</p>
      {data.prompt?.trim() ? (
        <p className="flow-node__desc">{data.prompt}</p>
      ) : null}

      <div className="flow-node__intent-list">
        {options.map((opt) => (
          <div key={opt.id} className="flow-node__intent-row">
            <span className="flow-node__chip-preview">
              {opt.label || "Untitled"}
            </span>
            <Handle
              type="source"
              id={opt.id}
              position={Position.Right}
              className="flow-node__handle flow-node__handle--source flow-node__handle--row"
            />
          </div>
        ))}

        <div className="flow-node__intent-row flow-node__intent-row--fallback">
          <span className="flow-node__chip-preview flow-node__chip-preview--fallback">
            Fallback (typed query)
          </span>
          <Handle
            type="source"
            id={INTENT_FALLBACK_HANDLE}
            position={Position.Right}
            className="flow-node__handle flow-node__handle--source flow-node__handle--row flow-node__handle--fallback"
          />
        </div>
      </div>
    </div>
  );
}
