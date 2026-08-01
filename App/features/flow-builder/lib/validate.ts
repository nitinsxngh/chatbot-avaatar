import type { FlowEdge, FlowNode } from "../types";
import {
  API_NODE,
  CONDITION_NODE,
  END_NODE,
  FALLBACK_NODE,
  INTENT_FALLBACK_HANDLE,
  INTENT_NODE,
  KNOWLEDGE_NODE,
  MESSAGE_NODE,
  MYSQL_NODE,
  PAGE_NAME_NODE,
  QUESTION_NODE,
  getNodeTitle,
  isIntentNode,
  isPageNameNode,
} from "../types";

export type FlowValidationIssue = {
  level: "error" | "warning";
  message: string;
  nodeId?: string;
};

function findEntryId(nodes: FlowNode[]): string | null {
  const marked = nodes.find((n) => isPageNameNode(n) && n.data.isEntry);
  if (marked) return marked.id;
  const anyStart = nodes.find((n) => n.type === PAGE_NAME_NODE);
  return anyStart?.id ?? null;
}

function reachableFrom(entryId: string, edges: FlowEdge[]): Set<string> {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const list = adj.get(e.source) || [];
    list.push(e.target);
    adj.set(e.source, list);
  }
  const seen = new Set<string>();
  const stack = [entryId];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of adj.get(id) || []) stack.push(next);
  }
  return seen;
}

function hasCycleFrom(entryId: string, edges: FlowEdge[]): boolean {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const list = adj.get(e.source) || [];
    list.push(e.target);
    adj.set(e.source, list);
  }
  const visiting = new Set<string>();
  const done = new Set<string>();

  function dfs(id: string): boolean {
    if (visiting.has(id)) return true;
    if (done.has(id)) return false;
    visiting.add(id);
    for (const next of adj.get(id) || []) {
      if (dfs(next)) return true;
    }
    visiting.delete(id);
    done.add(id);
    return false;
  }

  return dfs(entryId);
}

export function validateFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
): FlowValidationIssue[] {
  const issues: FlowValidationIssue[] = [];

  if (nodes.length === 0) {
    issues.push({ level: "error", message: "Flow has no nodes." });
    return issues;
  }

  const entryNodes = nodes.filter(
    (n) => isPageNameNode(n) && n.data.isEntry,
  );
  if (entryNodes.length === 0) {
    issues.push({
      level: "error",
      message: "No Start node marked as entry. Mark one Start node as the entry.",
    });
  } else if (entryNodes.length > 1) {
    issues.push({
      level: "error",
      message: "Multiple entry pages found. Only one is allowed.",
    });
  }

  const pageNames = new Map<string, string[]>();
  for (const node of nodes) {
    if (!isPageNameNode(node)) continue;
    const name = node.data.pageName.trim();
    if (!name) {
      issues.push({
        level: "error",
        message: `Start node ${node.id} is missing a name.`,
        nodeId: node.id,
      });
      continue;
    }
    const list = pageNames.get(name) || [];
    list.push(node.id);
    pageNames.set(name, list);
  }

  for (const [name, ids] of pageNames) {
    if (ids.length > 1) {
      issues.push({
        level: "error",
        message: `Duplicate start name "${name}" on ${ids.length} nodes.`,
      });
    }
  }

  for (const node of nodes) {
    if (node.type === MESSAGE_NODE && !node.data.text.trim()) {
      issues.push({
        level: "warning",
        message: `Message "${getNodeTitle(node)}" has empty text.`,
        nodeId: node.id,
      });
    }
    if (node.type === QUESTION_NODE && !node.data.prompt.trim()) {
      issues.push({
        level: "warning",
        message: `Question "${getNodeTitle(node)}" has empty prompt.`,
        nodeId: node.id,
      });
    }
    if (node.type === CONDITION_NODE && !node.data.keywords.trim()) {
      issues.push({
        level: "warning",
        message: `Condition "${getNodeTitle(node)}" has no keywords.`,
        nodeId: node.id,
      });
    }
    if (node.type === FALLBACK_NODE) {
      if (!node.data.message.trim() && !node.data.runRag) {
        issues.push({
          level: "warning",
          message: `Fallback "${getNodeTitle(node)}" has empty message and RAG off.`,
          nodeId: node.id,
        });
      }
    }
    if (node.type === API_NODE) {
      const conn = (node.data.connectionString || node.data.url || "").trim();
      if (!conn) {
        issues.push({
          level: "error",
          message: `API "${getNodeTitle(node)}" needs a connection string.`,
          nodeId: node.id,
        });
      }
      if (node.data.headersJson.trim()) {
        try {
          JSON.parse(node.data.headersJson);
        } catch {
          issues.push({
            level: "warning",
            message: `API "${getNodeTitle(node)}" headers are not valid JSON.`,
            nodeId: node.id,
          });
        }
      }
    }
    if (node.type === MYSQL_NODE) {
      if (!node.data.host.trim() || !node.data.database.trim()) {
        issues.push({
          level: "error",
          message: `MySQL "${getNodeTitle(node)}" needs host and database.`,
          nodeId: node.id,
        });
      }
      if (!node.data.sql.trim()) {
        issues.push({
          level: "error",
          message: `MySQL "${getNodeTitle(node)}" needs SQL.`,
          nodeId: node.id,
        });
      }
    }
    if (node.type === INTENT_NODE && isIntentNode(node)) {
      if (!node.data.options.length) {
        issues.push({
          level: "error",
          message: `Intent "${getNodeTitle(node)}" needs at least one chip.`,
          nodeId: node.id,
        });
      }
      for (const opt of node.data.options) {
        const linked = edges.some(
          (e) => e.source === node.id && e.sourceHandle === opt.id,
        );
        if (!linked) {
          issues.push({
            level: "warning",
            message: `Intent chip “${opt.label || "Untitled"}” is not connected.`,
            nodeId: node.id,
          });
        }
      }
      const hasFallback = edges.some(
        (e) =>
          e.source === node.id && e.sourceHandle === INTENT_FALLBACK_HANDLE,
      );
      if (!hasFallback) {
        issues.push({
          level: "warning",
          message: `Intent "${getNodeTitle(node)}" has no Fallback link for unmatched typed text.`,
          nodeId: node.id,
        });
      }
    }

    // Multiple default outs from linear nodes
    if (
      node.type === MESSAGE_NODE ||
      node.type === QUESTION_NODE ||
      node.type === KNOWLEDGE_NODE ||
      node.type === FALLBACK_NODE ||
      node.type === API_NODE ||
      node.type === MYSQL_NODE ||
      node.type === PAGE_NAME_NODE
    ) {
      const outs = edges.filter((e) => e.source === node.id);
      if (outs.length > 1) {
        issues.push({
          level: "warning",
          message: `"${getNodeTitle(node)}" has ${outs.length} outgoing links — only the first is used.`,
          nodeId: node.id,
        });
      }
    }
  }

  const connected = new Set<string>();
  for (const edge of edges) {
    connected.add(edge.source);
    connected.add(edge.target);
  }

  if (nodes.length > 1) {
    for (const node of nodes) {
      const isEntry = isPageNameNode(node) && node.data.isEntry;
      if (!connected.has(node.id) && !isEntry && node.type !== END_NODE) {
        issues.push({
          level: "warning",
          message: `"${getNodeTitle(node)}" is not connected.`,
          nodeId: node.id,
        });
      }
    }
  }

  for (const node of nodes) {
    if (node.type !== CONDITION_NODE) continue;
    const outs = edges.filter((e) => e.source === node.id);
    if (outs.length < 2) {
      issues.push({
        level: "warning",
        message: `Condition "${getNodeTitle(node)}" should have 2+ outgoing links (match / else).`,
        nodeId: node.id,
      });
    }
  }

  const entryId = findEntryId(nodes);
  if (entryId) {
    const reachable = reachableFrom(entryId, edges);
    for (const node of nodes) {
      if (!reachable.has(node.id) && node.id !== entryId) {
        issues.push({
          level: "warning",
          message: `"${getNodeTitle(node)}" is unreachable from Start.`,
          nodeId: node.id,
        });
      }
    }
    if (hasCycleFrom(entryId, edges)) {
      issues.push({
        level: "warning",
        message:
          "Flow has a cycle reachable from Start. Loops are ok if they pause on Intent/Question; otherwise Test chat may stop.",
      });
    }
  }

  return issues;
}
