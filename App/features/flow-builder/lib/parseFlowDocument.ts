import {
  API_NODE,
  CONDITION_NODE,
  END_NODE,
  FALLBACK_NODE,
  FLOW_NODE_TYPES,
  INTENT_NODE,
  KNOWLEDGE_NODE,
  MESSAGE_NODE,
  MYSQL_NODE,
  PAGE_NAME_NODE,
  QUESTION_NODE,
  createIntentOption,
  isFlowNodeType,
  type ApiNodeData,
  type FlowDocument,
  type FlowEdge,
  type FlowNode,
  type IntentOption,
  type MysqlNodeData,
} from "../types";
import { FLOW_EDGE } from "../constants";

export type ParseFlowResult =
  | { ok: true; doc: FlowDocument; warnings: string[] }
  | { ok: false; error: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeIntentOptions(raw: unknown): IntentOption[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [createIntentOption("Option 1")];
  }
  return raw.map((item, i) => {
    const row = asRecord(item);
    const id = str(row?.id, `intent-${i + 1}`);
    const label = str(row?.label, `Option ${i + 1}`);
    const keywords = str(row?.keywords, "");
    return keywords
      ? { id, label, keywords }
      : { id, label };
  });
}

function normalizeNode(raw: unknown, index: number): FlowNode | null {
  const row = asRecord(raw);
  if (!row) return null;
  const type = str(row.type);
  if (!isFlowNodeType(type)) return null;

  const id = str(row.id, `${type}-${index + 1}`);
  const pos = asRecord(row.position) || {};
  const position = { x: num(pos.x, 80 + index * 40), y: num(pos.y, 80 + index * 30) };
  const data = asRecord(row.data) || {};

  switch (type) {
    case PAGE_NAME_NODE:
      return {
        id,
        type,
        position,
        data: {
          pageName: str(data.pageName, "start"),
          description: str(data.description),
          isEntry: bool(data.isEntry, false),
        },
      };
    case MESSAGE_NODE:
      return {
        id,
        type,
        position,
        data: {
          label: str(data.label, "Message"),
          text: str(data.text, "…"),
        },
      };
    case QUESTION_NODE:
      return {
        id,
        type,
        position,
        data: {
          label: str(data.label, "Question"),
          prompt: str(data.prompt, "…"),
          variableName: str(data.variableName, "answer") || "answer",
        },
      };
    case CONDITION_NODE:
      return {
        id,
        type,
        position,
        data: {
          label: str(data.label, "Condition"),
          keywords: str(data.keywords, "yes, ok"),
        },
      };
    case KNOWLEDGE_NODE:
      return {
        id,
        type,
        position,
        data: {
          label: str(data.label, "Knowledge"),
          queryHint: str(data.queryHint),
        },
      };
    case INTENT_NODE:
      return {
        id,
        type,
        position,
        data: {
          label: str(data.label, "Intent"),
          prompt: str(data.prompt, ""),
          options: normalizeIntentOptions(data.options),
        },
      };
    case FALLBACK_NODE:
      return {
        id,
        type,
        position,
        data: {
          label: str(data.label, "Fallback"),
          message: str(data.message, "I’ll look that up."),
          runRag: bool(data.runRag, true),
        },
      };
    case API_NODE: {
      const method = str(data.method, "GET").toUpperCase();
      const allowed = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
      const connectionString =
        str(data.connectionString) || str(data.url, "https://httpbin.org");
      return {
        id,
        type,
        position,
        data: {
          label: str(data.label, "HTTP request"),
          method: (allowed.includes(method as (typeof allowed)[number])
            ? method
            : "GET") as ApiNodeData["method"],
          connectionString,
          path: str(data.path),
          headersJson: str(
            data.headersJson,
            '{\n  "Accept": "application/json"\n}',
          ),
          body: str(data.body),
          responsePath: str(data.responsePath),
          variableName: str(data.variableName, "api") || "api",
          showInChat: bool(data.showInChat, true),
        },
      };
    }
    case MYSQL_NODE: {
      const mode = str(data.resultMode, "first_row");
      const modes = ["first_row", "rows_json", "scalar"] as const;
      return {
        id,
        type,
        position,
        data: {
          label: str(data.label, "MySQL query"),
          host: str(data.host, "127.0.0.1"),
          port: str(data.port, "3306") || "3306",
          database: str(data.database, "app"),
          user: str(data.user, "root"),
          password: str(data.password),
          sql: str(data.sql, "SELECT 1 AS ok;"),
          resultMode: (modes.includes(mode as (typeof modes)[number])
            ? mode
            : "first_row") as MysqlNodeData["resultMode"],
          mapColumnsToVars: bool(data.mapColumnsToVars, true),
          variableName: str(data.variableName, "db") || "db",
          showInChat: bool(data.showInChat, true),
        },
      };
    }
    case END_NODE:
      return {
        id,
        type,
        position,
        data: {
          label: str(data.label, "End"),
          farewell: str(data.farewell, "Goodbye!"),
        },
      };
    default:
      return null;
  }
}

function normalizeEdge(raw: unknown, index: number): FlowEdge | null {
  const row = asRecord(raw);
  if (!row) return null;
  const source = str(row.source);
  const target = str(row.target);
  if (!source || !target) return null;
  return {
    id: str(row.id, `e-${index + 1}`),
    type: FLOW_EDGE,
    source,
    target,
    sourceHandle: row.sourceHandle == null ? undefined : str(row.sourceHandle),
    targetHandle: row.targetHandle == null ? undefined : str(row.targetHandle),
    label: row.label == null ? undefined : str(row.label),
    animated: bool(row.animated, true),
    reconnectable: true,
    style: { stroke: "#86868b", strokeWidth: 1.5 },
  };
}

/** Parse and normalize an imported / stored flow document. */
export function parseFlowDocument(raw: unknown): ParseFlowResult {
  const root = asRecord(raw);
  if (!root) return { ok: false, error: "Flow file must be a JSON object." };
  if (root.version !== 1) {
    return { ok: false, error: "Unsupported flow version (expected version: 1)." };
  }
  if (!Array.isArray(root.nodes)) {
    return { ok: false, error: "Flow file is missing a nodes array." };
  }

  const warnings: string[] = [];
  const nodes: FlowNode[] = [];
  const seenIds = new Set<string>();

  root.nodes.forEach((item, i) => {
    const node = normalizeNode(item, i);
    if (!node) {
      warnings.push(`Skipped invalid node at index ${i}.`);
      return;
    }
    if (seenIds.has(node.id)) {
      warnings.push(`Duplicate node id “${node.id}” — skipped.`);
      return;
    }
    seenIds.add(node.id);
    nodes.push(node);
  });

  if (!nodes.length) {
    return { ok: false, error: "Flow file has no valid nodes." };
  }

  const unknownTypes = (root.nodes as unknown[])
    .map((n) => asRecord(n)?.type)
    .filter((t): t is string => typeof t === "string" && !isFlowNodeType(t));
  if (unknownTypes.length) {
    warnings.push(
      `Unknown node types ignored: ${[...new Set(unknownTypes)].join(", ")}.`,
    );
  }

  // Ensure at least one entry if any Start exists
  const starts = nodes.filter((n) => n.type === PAGE_NAME_NODE);
  if (starts.length && !starts.some((n) => n.type === PAGE_NAME_NODE && n.data.isEntry)) {
    const first = starts[0];
    if (first.type === PAGE_NAME_NODE) {
      first.data.isEntry = true;
      warnings.push(`Marked “${first.data.pageName || first.id}” as flow entry.`);
    }
  }

  const edgesRaw = Array.isArray(root.edges) ? root.edges : [];
  const edges: FlowEdge[] = [];
  edgesRaw.forEach((item, i) => {
    const edge = normalizeEdge(item, i);
    if (!edge) {
      warnings.push(`Skipped invalid edge at index ${i}.`);
      return;
    }
    if (!seenIds.has(edge.source) || !seenIds.has(edge.target)) {
      warnings.push(`Skipped edge “${edge.id}” — missing source/target node.`);
      return;
    }
    edges.push(edge);
  });

  void FLOW_NODE_TYPES;

  return {
    ok: true,
    warnings,
    doc: {
      version: 1,
      name: str(root.name, "Untitled flow") || "Untitled flow",
      nodes,
      edges,
      updatedAt:
        typeof root.updatedAt === "string"
          ? root.updatedAt
          : new Date().toISOString(),
    },
  };
}
