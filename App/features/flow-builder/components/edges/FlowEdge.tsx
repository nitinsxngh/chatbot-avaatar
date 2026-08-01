"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { useState } from "react";
import { FLOW_EDGE } from "../../constants";
import { useFlowStore } from "../../store/useFlowStore";

export { FLOW_EDGE };

export default function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
  label,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const deleteEdge = useFlowStore((s) => s.deleteEdge);
  const setSelectedEdgeId = useFlowStore((s) => s.setSelectedEdgeId);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const showActions = hovered || selected;

  return (
    <>
      {/* Wider invisible hit area for easier hover */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        className="react-flow__edge-interaction"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected || hovered ? "#0071e3" : style?.stroke || "#86868b",
          strokeWidth: selected || hovered ? 2.25 : style?.strokeWidth || 1.5,
        }}
        interactionWidth={24}
      />

      <EdgeLabelRenderer>
        <div
          className={`flow-edge-toolbar nodrag nopan ${showActions ? "is-visible" : ""}`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {label ? (
            <span className="flow-edge-toolbar__label">{String(label)}</span>
          ) : null}

          <button
            type="button"
            className="flow-edge-toolbar__btn flow-edge-toolbar__btn--connect"
            title="Reconnect — drag either end of the line to a new handle"
            aria-label="Reconnect edge"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEdgeId(id);
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M4.2 7.8 2.8 6.4a2 2 0 0 1 0-2.8l.7-.7a2 2 0 0 1 2.8 0L7.7 4.3M7.8 4.2l1.4 1.4a2 2 0 0 1 0 2.8l-.7.7a2 2 0 0 1-2.8 0L4.3 7.7"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <button
            type="button"
            className="flow-edge-toolbar__btn flow-edge-toolbar__btn--disconnect"
            title="Disconnect"
            aria-label="Disconnect edge"
            onClick={(e) => {
              e.stopPropagation();
              deleteEdge(id);
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M3 3l6 6M9 3 3 9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
