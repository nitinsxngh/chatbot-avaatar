import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  reconnectEdge,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from "@xyflow/react";
import { create } from "zustand";
import { createFlowNode } from "../lib/createNode";
import { parseFlowDocument } from "../lib/parseFlowDocument";
import {
  listSavedFlows,
  loadFlow,
  loadFlowById,
  saveFlow,
  upsertFlowInLibrary,
  type SavedFlowMeta,
} from "../lib/persistence";
import { FLOW_EDGE } from "../constants";
import {
  PAGE_NAME_NODE,
  createIntentOption,
  type FlowDocument,
  type FlowEdge,
  type FlowNode,
  type FlowNodeType,
  type IntentOption,
  isIntentNode,
  isPageNameNode,
} from "../types";

function normalizeEdges(edges: FlowEdge[]): FlowEdge[] {
  return edges.map((edge) => ({
    ...edge,
    type: FLOW_EDGE,
    reconnectable: true,
    animated: edge.animated ?? true,
  }));
}

type FlowStore = {
  flowName: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  selectedEdgeIds: string[];
  dirty: boolean;
  hydrated: boolean;

  hydrate: () => void;
  setFlowName: (name: string) => void;
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  onReconnect: (oldEdge: FlowEdge, newConnection: Connection) => void;
  setSelection: (nodeIds: string[], edgeIds: string[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  deleteEdge: (id: string) => void;
  addNode: (
    type: FlowNodeType,
    position: XYPosition,
    overrides?: Record<string, string | boolean>,
  ) => void;
  updateNodeData: (id: string, patch: Record<string, unknown>) => void;
  addIntentOption: (nodeId: string, label?: string) => void;
  updateIntentOption: (
    nodeId: string,
    optionId: string,
    patch: Partial<Pick<IntentOption, "label" | "keywords">>,
  ) => void;
  removeIntentOption: (nodeId: string, optionId: string) => void;
  deleteSelected: () => void;
  clearFlow: () => void;
  persist: () => void;
  exportDocument: () => FlowDocument;
  importDocument: (doc: FlowDocument) => void;
  newFlow: () => void;
  openSavedFlow: (id: string) => boolean;
  listLibrary: () => SavedFlowMeta[];
};

export const useFlowStore = create<FlowStore>((set, get) => ({
  flowName: "Untitled flow",
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedNodeIds: [],
  selectedEdgeId: null,
  selectedEdgeIds: [],
  dirty: false,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const saved = loadFlow();
    if (saved) {
      const parsed = parseFlowDocument(saved);
      const doc = parsed.ok ? parsed.doc : saved;
      set({
        flowName: doc.name,
        nodes: doc.nodes,
        edges: normalizeEdges(doc.edges || []),
        hydrated: true,
        dirty: false,
      });
      return;
    }

    const entry = createFlowNode(
      PAGE_NAME_NODE,
      { x: 280, y: 160 },
      { pageName: "start", description: "Flow entry", isEntry: true },
    );
    set({
      nodes: [entry],
      edges: [],
      hydrated: true,
      dirty: false,
    });
  },

  setFlowName: (name) => {
    set({ flowName: name, dirty: true });
  },

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as FlowNode[],
      dirty: true,
    });
  },

  onEdgesChange: (changes) => {
    const selectedEdgeId = get().selectedEdgeId;
    const nextEdges = applyEdgeChanges(changes, get().edges);
    const stillSelected =
      selectedEdgeId && nextEdges.some((e) => e.id === selectedEdgeId)
        ? selectedEdgeId
        : null;
    set({
      edges: nextEdges,
      selectedEdgeId: stillSelected,
      dirty: true,
    });
  },

  onConnect: (connection) => {
    let handleLabel: string | undefined =
      connection.sourceHandle === "match"
        ? "match"
        : connection.sourceHandle === "else"
          ? "else"
          : undefined;

    if (!handleLabel && connection.sourceHandle) {
      if (connection.sourceHandle === "fallback") {
        handleLabel = "fallback";
      } else {
        const sourceNode = get().nodes.find((n) => n.id === connection.source);
        if (sourceNode && isIntentNode(sourceNode)) {
          const opt = sourceNode.data.options.find(
            (o) => o.id === connection.sourceHandle,
          );
          handleLabel = opt?.label;
        }
      }
    }

    set({
      edges: addEdge(
        {
          ...connection,
          id: `e-${connection.source}-${connection.target}-${crypto.randomUUID().slice(0, 6)}`,
          type: FLOW_EDGE,
          reconnectable: true,
          animated: true,
          label: handleLabel,
          style: { stroke: "#86868b", strokeWidth: 1.5 },
        },
        get().edges,
      ),
      dirty: true,
    });
  },

  onReconnect: (oldEdge, newConnection) => {
    let handleLabel = oldEdge.label;
    if (newConnection.sourceHandle) {
      const sourceNode = get().nodes.find((n) => n.id === newConnection.source);
      if (sourceNode && isIntentNode(sourceNode)) {
        const opt = sourceNode.data.options.find(
          (o) => o.id === newConnection.sourceHandle,
        );
        if (opt?.label) handleLabel = opt.label;
      } else if (newConnection.sourceHandle === "match") {
        handleLabel = "match";
      } else if (newConnection.sourceHandle === "else") {
        handleLabel = "else";
      } else if (newConnection.sourceHandle === "fallback") {
        handleLabel = "fallback";
      }
    }

    const next = reconnectEdge(oldEdge, newConnection, get().edges).map(
      (edge) =>
        edge.id === oldEdge.id
          ? {
              ...edge,
              type: FLOW_EDGE,
              reconnectable: true,
              label: handleLabel,
            }
          : edge,
    );

    set({
      edges: next,
      dirty: true,
      selectedEdgeId: oldEdge.id,
    });
  },

  setSelection: (nodeIds, edgeIds) => {
    set({
      selectedNodeIds: nodeIds,
      selectedEdgeIds: edgeIds,
      selectedNodeId: nodeIds.length === 1 ? nodeIds[0] : null,
      selectedEdgeId:
        edgeIds.length === 1 && nodeIds.length === 0 ? edgeIds[0] : null,
    });
  },

  setSelectedNodeId: (id) =>
    set({
      selectedNodeId: id,
      selectedNodeIds: id ? [id] : [],
      selectedEdgeId: null,
      selectedEdgeIds: [],
    }),

  setSelectedEdgeId: (id) =>
    set({
      selectedEdgeId: id,
      selectedEdgeIds: id ? [id] : [],
      selectedNodeId: null,
      selectedNodeIds: [],
      edges: get().edges.map((edge) => ({
        ...edge,
        selected: edge.id === id,
      })),
    }),

  deleteEdge: (id) => {
    set({
      edges: get().edges.filter((e) => e.id !== id),
      selectedEdgeId:
        get().selectedEdgeId === id ? null : get().selectedEdgeId,
      selectedEdgeIds: get().selectedEdgeIds.filter((eid) => eid !== id),
      dirty: true,
    });
  },

  addNode: (type, position, overrides) => {
    const node = createFlowNode(type, position, overrides);
    let nodes = get().nodes;

    if (type === PAGE_NAME_NODE) {
      const shouldBeEntry =
        overrides?.isEntry === true ||
        (nodes.filter((n) => n.type === PAGE_NAME_NODE).length === 0 &&
          overrides?.isEntry !== false);

      if (shouldBeEntry && isPageNameNode(node)) {
        nodes = nodes.map((n) =>
          isPageNameNode(n)
            ? { ...n, data: { ...n.data, isEntry: false } }
            : n,
        );
        node.data = { ...node.data, isEntry: true };
      }
    }

    set({
      nodes: [...nodes, node],
      selectedNodeId: node.id,
      selectedNodeIds: [node.id],
      selectedEdgeId: null,
      selectedEdgeIds: [],
      dirty: true,
    });
  },

  updateNodeData: (id, patch) => {
    const makingEntry = patch.isEntry === true;
    const nodes = get().nodes.map((node) => {
      if (makingEntry && isPageNameNode(node) && node.id !== id) {
        return { ...node, data: { ...node.data, isEntry: false } };
      }
      if (node.id !== id) return node;
      return {
        ...node,
        data: { ...node.data, ...patch },
      } as FlowNode;
    });
    set({ nodes, dirty: true });
  },

  addIntentOption: (nodeId, label = "New intent") => {
    set({
      nodes: get().nodes.map((node) => {
        if (!isIntentNode(node) || node.id !== nodeId) return node;
        const option = createIntentOption(label);
        return {
          ...node,
          data: {
            ...node.data,
            options: [...node.data.options, option],
          },
        };
      }),
      dirty: true,
    });
  },

  updateIntentOption: (nodeId, optionId, patch) => {
    const nodes = get().nodes.map((node) => {
      if (!isIntentNode(node) || node.id !== nodeId) return node;
      return {
        ...node,
        data: {
          ...node.data,
          options: node.data.options.map((o) =>
            o.id === optionId ? { ...o, ...patch } : o,
          ),
        },
      };
    });

    // Keep edge labels in sync with chip text when label changes
    const edges =
      patch.label === undefined
        ? get().edges
        : get().edges.map((edge) => {
            if (edge.source !== nodeId || edge.sourceHandle !== optionId) {
              return edge;
            }
            return { ...edge, label: patch.label };
          });

    set({ nodes, edges, dirty: true });
  },

  removeIntentOption: (nodeId, optionId) => {
    const nodes = get().nodes.map((node) => {
      if (!isIntentNode(node) || node.id !== nodeId) return node;
      const options: IntentOption[] = node.data.options.filter(
        (o) => o.id !== optionId,
      );
      return { ...node, data: { ...node.data, options } };
    });
    const edges = get().edges.filter(
      (e) => !(e.source === nodeId && e.sourceHandle === optionId),
    );
    set({ nodes, edges, dirty: true });
  },

  deleteSelected: () => {
    const { selectedNodeIds, selectedEdgeIds, nodes, edges } = get();
    const nodeIds = new Set(selectedNodeIds);
    const edgeIds = new Set(selectedEdgeIds);

    if (nodeIds.size === 0 && edgeIds.size === 0) {
      // Fallback to single-select fields
      const { selectedNodeId, selectedEdgeId } = get();
      if (selectedEdgeId) edgeIds.add(selectedEdgeId);
      if (selectedNodeId) nodeIds.add(selectedNodeId);
    }

    if (nodeIds.size === 0 && edgeIds.size === 0) return;

    set({
      nodes: nodes.filter((n) => !nodeIds.has(n.id)),
      edges: edges.filter(
        (e) =>
          !edgeIds.has(e.id) &&
          !nodeIds.has(e.source) &&
          !nodeIds.has(e.target),
      ),
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeId: null,
      selectedEdgeIds: [],
      dirty: true,
    });
  },

  clearFlow: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeId: null,
      selectedEdgeIds: [],
      dirty: true,
    });
  },

  persist: () => {
    const doc = get().exportDocument();
    saveFlow(doc);
    set({ dirty: false });
  },

  exportDocument: () => ({
    version: 1 as const,
    name: get().flowName,
    nodes: get().nodes,
    edges: get().edges,
    updatedAt: new Date().toISOString(),
  }),

  importDocument: (doc) => {
    const parsed = parseFlowDocument(doc);
    if (!parsed.ok) return;
    set({
      flowName: parsed.doc.name || "Untitled flow",
      nodes: parsed.doc.nodes,
      edges: normalizeEdges(parsed.doc.edges),
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeId: null,
      selectedEdgeIds: [],
      dirty: true,
      hydrated: true,
    });
  },

  newFlow: () => {
    // Archive current if it has content
    const current = get().exportDocument();
    if (current.nodes.length > 0) {
      upsertFlowInLibrary(current);
    }
    const entry = createFlowNode(
      PAGE_NAME_NODE,
      { x: 280, y: 160 },
      { pageName: "start", description: "Flow entry", isEntry: true },
    );
    set({
      flowName: "Untitled flow",
      nodes: [entry],
      edges: [],
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeId: null,
      selectedEdgeIds: [],
      dirty: true,
    });
  },

  openSavedFlow: (id) => {
    const doc = loadFlowById(id);
    if (!doc) return false;
    set({
      flowName: doc.name || "Untitled flow",
      nodes: doc.nodes,
      edges: normalizeEdges(doc.edges),
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeId: null,
      selectedEdgeIds: [],
      dirty: false,
      hydrated: true,
    });
    return true;
  },

  listLibrary: () => listSavedFlows(),
}));
