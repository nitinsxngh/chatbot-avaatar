"use client";

import type { DragEvent, KeyboardEvent } from "react";
import { PALETTE_ITEMS } from "../constants";
import { useFlowStore } from "../store/useFlowStore";
import type { FlowNodeType } from "../types";

export default function NodePalette() {
  const addNode = useFlowStore((s) => s.addNode);
  const nodes = useFlowStore((s) => s.nodes);

  const onDragStart = (event: DragEvent, type: string) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
    // Helps some browsers show a proper drag preview
    if (event.currentTarget instanceof HTMLElement) {
      event.dataTransfer.setDragImage(event.currentTarget, 24, 24);
    }
  };

  const placeNode = (type: FlowNodeType) => {
    addNode(type, {
      x: 160 + Math.random() * 200,
      y: 100 + Math.random() * 180,
    });
  };

  const onKeyDown = (event: KeyboardEvent, type: FlowNodeType) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      placeNode(type);
    }
  };

  return (
    <div className="flow-palette">
      <div className="flow-palette__header">
        <h2>Add nodes</h2>
        <p>Drag onto the canvas, or click to drop near center.</p>
      </div>

      <div className="flow-palette__list">
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.type}
            role="button"
            tabIndex={0}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            onClick={() => placeNode(item.type)}
            onKeyDown={(e) => onKeyDown(e, item.type)}
            className="flow-palette__item"
            title={`Drag “${item.label}” onto the canvas`}
          >
            <span
              className="flow-palette__icon"
              style={{ background: item.accent }}
            >
              {item.badge}
            </span>
            <span className="flow-palette__copy">
              <span className="flow-palette__label">{item.label}</span>
              <span className="flow-palette__desc">{item.description}</span>
            </span>
            <span className="flow-palette__drag" aria-hidden>
              ⋮⋮
            </span>
          </div>
        ))}
      </div>

      <div className="flow-palette__footer">
        {nodes.length === 0
          ? "Canvas is empty — drag a node in"
          : `${nodes.length} node${nodes.length === 1 ? "" : "s"} on canvas`}
      </div>
    </div>
  );
}
