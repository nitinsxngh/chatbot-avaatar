import type { Edge, Node } from "@xyflow/react";

export const PAGE_NAME_NODE = "pageName" as const;
export const MESSAGE_NODE = "message" as const;
export const QUESTION_NODE = "question" as const;
export const CONDITION_NODE = "condition" as const;
export const KNOWLEDGE_NODE = "knowledge" as const;
export const INTENT_NODE = "intent" as const;
export const FALLBACK_NODE = "fallback" as const;
export const API_NODE = "api" as const;
export const MYSQL_NODE = "mysql" as const;
export const END_NODE = "end" as const;

/** Source handle id on Intent nodes for unmatched free-text queries */
export const INTENT_FALLBACK_HANDLE = "fallback" as const;

export const FLOW_NODE_TYPES = [
  PAGE_NAME_NODE,
  MESSAGE_NODE,
  QUESTION_NODE,
  CONDITION_NODE,
  KNOWLEDGE_NODE,
  INTENT_NODE,
  FALLBACK_NODE,
  API_NODE,
  MYSQL_NODE,
  END_NODE,
] as const;

export type FlowNodeType = (typeof FLOW_NODE_TYPES)[number];

export type PageNameNodeData = {
  pageName: string;
  description: string;
  isEntry: boolean;
};

export type MessageNodeData = {
  label: string;
  text: string;
};

export type QuestionNodeData = {
  label: string;
  prompt: string;
  /** Stored in runtime vars under this key (also always last_answer) */
  variableName: string;
};

export type ConditionNodeData = {
  label: string;
  keywords: string;
};

export type KnowledgeNodeData = {
  label: string;
  queryHint: string;
};

export type IntentOption = {
  id: string;
  label: string;
  /** Optional comma-separated keywords for free-text matching */
  keywords?: string;
};

export type IntentNodeData = {
  label: string;
  prompt: string;
  options: IntentOption[];
};

export type FallbackNodeData = {
  label: string;
  message: string;
  /** When true, answer the typed query with RAG before continuing */
  runRag: boolean;
};

export type ApiNodeData = {
  label: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Base URL or full endpoint — supports {{vars}} */
  connectionString: string;
  /** Optional path appended to connection string, e.g. /users/{{answer}} */
  path: string;
  /** @deprecated use connectionString — kept for older saved flows */
  url?: string;
  /** JSON object string, e.g. {"Authorization":"Bearer …"} — supports {{vars}} */
  headersJson: string;
  /** Request body (JSON or text) — supports {{vars}} */
  body: string;
  /** Optional dotted path into JSON response, e.g. data.items.0.name */
  responsePath: string;
  /** Vars prefix: {prefix}, {prefix}_status, {prefix}_body, plus path extract */
  variableName: string;
  showInChat: boolean;
};

export type MysqlNodeData = {
  label: string;
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
  /** SQL — supports {{vars}}; SELECT only recommended */
  sql: string;
  /** first_row | rows_json | scalar */
  resultMode: "first_row" | "rows_json" | "scalar";
  /** Map first-row columns into vars as {prefix}_{column} */
  mapColumnsToVars: boolean;
  variableName: string;
  showInChat: boolean;
};

export type EndNodeData = {
  label: string;
  farewell: string;
};

export type FlowNodeData =
  | PageNameNodeData
  | MessageNodeData
  | QuestionNodeData
  | ConditionNodeData
  | KnowledgeNodeData
  | IntentNodeData
  | FallbackNodeData
  | ApiNodeData
  | MysqlNodeData
  | EndNodeData;

export type PageNameFlowNode = Node<PageNameNodeData, typeof PAGE_NAME_NODE>;
export type MessageFlowNode = Node<MessageNodeData, typeof MESSAGE_NODE>;
export type QuestionFlowNode = Node<QuestionNodeData, typeof QUESTION_NODE>;
export type ConditionFlowNode = Node<ConditionNodeData, typeof CONDITION_NODE>;
export type KnowledgeFlowNode = Node<KnowledgeNodeData, typeof KNOWLEDGE_NODE>;
export type IntentFlowNode = Node<IntentNodeData, typeof INTENT_NODE>;
export type FallbackFlowNode = Node<FallbackNodeData, typeof FALLBACK_NODE>;
export type ApiFlowNode = Node<ApiNodeData, typeof API_NODE>;
export type MysqlFlowNode = Node<MysqlNodeData, typeof MYSQL_NODE>;
export type EndFlowNode = Node<EndNodeData, typeof END_NODE>;

export type FlowNode =
  | PageNameFlowNode
  | MessageFlowNode
  | QuestionFlowNode
  | ConditionFlowNode
  | KnowledgeFlowNode
  | IntentFlowNode
  | FallbackFlowNode
  | ApiFlowNode
  | MysqlFlowNode
  | EndFlowNode;

export type FlowEdge = Edge;

export type FlowDocument = {
  version: 1;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  updatedAt: string;
};

export type PaletteItem = {
  type: FlowNodeType;
  label: string;
  description: string;
  badge: string;
  accent: string;
};

export function isFlowNodeType(value: string): value is FlowNodeType {
  return (FLOW_NODE_TYPES as readonly string[]).includes(value);
}

export function isPageNameNode(node: FlowNode): node is PageNameFlowNode {
  return node.type === PAGE_NAME_NODE;
}

export function isIntentNode(node: FlowNode): node is IntentFlowNode {
  return node.type === INTENT_NODE;
}

export function isFallbackNode(node: FlowNode): node is FallbackFlowNode {
  return node.type === FALLBACK_NODE;
}

export function getNodeTitle(node: FlowNode): string {
  switch (node.type) {
    case PAGE_NAME_NODE:
      return node.data.pageName || "Start";
    case MESSAGE_NODE:
      return node.data.label || "Message";
    case QUESTION_NODE:
      return node.data.label || "Question";
    case CONDITION_NODE:
      return node.data.label || "Condition";
    case KNOWLEDGE_NODE:
      return node.data.label || "Knowledge";
    case INTENT_NODE:
      return node.data.label || "Intent";
    case FALLBACK_NODE:
      return node.data.label || "Fallback";
    case API_NODE:
      return node.data.label || "API";
    case MYSQL_NODE:
      return node.data.label || "MySQL";
    case END_NODE:
      return node.data.label || "End";
    default:
      return "Node";
  }
}

export function createIntentOption(
  label = "New intent",
  keywords = "",
): IntentOption {
  return {
    id: `intent-${crypto.randomUUID().slice(0, 8)}`,
    label,
    ...(keywords.trim() ? { keywords: keywords.trim() } : {}),
  };
}
