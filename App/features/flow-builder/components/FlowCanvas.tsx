"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  SelectionMode,
  useReactFlow,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { FLOW_EDGE } from "../constants";
import { isFlowNodeType } from "../types";
import { useFlowRuntimeStore } from "../store/useFlowRuntimeStore";
import { useFlowStore } from "../store/useFlowStore";
import { edgeTypes } from "./edges";
import { nodeTypes } from "./nodes";

import "@xyflow/react/dist/style.css";

type CanvasMode = "pan" | "select";

function CanvasInner() {
  const { screenToFlowPosition } = useReactFlow();
  const [mode, setMode] = useState<CanvasMode>("pan");
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const onReconnect = useFlowStore((s) => s.onReconnect);
  const addNode = useFlowStore((s) => s.addNode);
  const setSelection = useFlowStore((s) => s.setSelection);
  const activeNodeId = useFlowRuntimeStore((s) => s.runtime.currentNodeId);

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        className: [
          n.className,
          n.id === activeNodeId ? "is-runtime-active" : "",
        ]
          .filter(Boolean)
          .join(" "),
      })),
    [nodes, activeNodeId],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
      setSelection(
        selectedNodes.map((n) => n.id),
        selectedEdges.map((e) => e.id),
      );
    },
    [setSelection],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!isFlowNodeType(type)) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(type, position);
    },
    [addNode, screenToFlowPosition],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.key === "v" || e.key === "V") setMode("pan");
      if (e.key === "s" || e.key === "S") setMode("select");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isSelect = mode === "select";

  return (
    <div className={`relative h-full w-full flow-canvas-shell is-${mode}`}>
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onSelectionChange={onSelectionChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        edgesReconnectable
        reconnectRadius={16}
        multiSelectionKeyCode="Shift"
        selectionKeyCode={isSelect ? null : "Shift"}
        selectionOnDrag={isSelect}
        selectionMode={SelectionMode.Partial}
        panOnDrag={isSelect ? [1, 2] : true}
        panOnScroll
        selectNodesOnDrag={false}
        fitView
        fitViewOptions={{ padding: 0.28 }}
        deleteKeyCode={["Backspace", "Delete"]}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: FLOW_EDGE,
          animated: true,
          reconnectable: true,
          style: { stroke: "#86868b", strokeWidth: 1.5 },
        }}
        connectionLineStyle={{ stroke: "#0071e3", strokeWidth: 1.5 }}
        className="flow-canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color="#c7c7cc"
          className="!bg-[#f0f0f2]"
        />

        <Panel position="top-left" className="flow-mode-panel">
          <div
            className="flow-mode-toggle"
            role="group"
            aria-label="Canvas interaction mode"
          >
            <button
              type="button"
              className={mode === "pan" ? "is-active" : ""}
              aria-pressed={mode === "pan"}
              title="Pan — drag canvas to move (V)"
              onClick={() => setMode("pan")}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
              >
                <path
                  d="M8 2.5v11M2.5 8h11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M5.5 5.5 2.5 2.5M10.5 5.5 13.5 2.5M5.5 10.5l-3 3M10.5 10.5l3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Pan</span>
            </button>
            <button
              type="button"
              className={mode === "select" ? "is-active" : ""}
              aria-pressed={mode === "select"}
              title="Select — drag to box-select (S)"
              onClick={() => setMode("select")}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
              >
                <rect
                  x="3"
                  y="3"
                  width="10"
                  height="10"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="2.5 2"
                />
                <path
                  d="M6.5 10.5 7.5 6.5l1.5 2.5L11.5 7.5 9.5 11.5H6.5Z"
                  fill="currentColor"
                />
              </svg>
              <span>Select</span>
            </button>
          </div>
        </Panel>

        <Controls
          showInteractive={false}
          position="bottom-left"
          className="flow-controls"
        />
        <MiniMap
          pannable
          zoomable
          position="bottom-right"
          className="flow-minimap"
          nodeColor={(n) => {
            const map: Record<string, string> = {
              pageName: "#0071e3",
              message: "#34c759",
              question: "#ff9f0a",
              condition: "#af52de",
              knowledge: "#5856d6",
              intent: "#ff2d55",
              fallback: "#ff9500",
              api: "#0a84ff",
              mysql: "#00758f",
              end: "#8e8e93",
            };
            return map[n.type || ""] || "#a1a1a6";
          }}
          maskColor="rgba(245, 245, 247, 0.75)"
        />
      </ReactFlow>

      {nodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl border border-dashed border-black/[0.12] bg-white/80 px-8 py-7 text-center backdrop-blur-sm">
            <p className="text-[15px] font-semibold text-[#1d1d1f]">
              Start your flow
            </p>
            <p className="mt-1.5 max-w-[280px] text-[13px] leading-relaxed text-[#86868b]">
              Add Start, Message, Intent, Question, Condition, Fallback,
              Knowledge, or End from the left panel.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function FlowCanvas() {
  return <CanvasInner />;
}
