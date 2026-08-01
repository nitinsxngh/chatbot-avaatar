import { api } from "@/lib/api";
import { FLOW_TEST_SESSION } from "../constants";
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
  type FlowEdge,
  type FlowNode,
  type IntentOption,
  getNodeTitle,
  isIntentNode,
  isPageNameNode,
} from "../types";

export type TestChatMessage = {
  id: string;
  role: "human" | "ai" | "system";
  content: string;
};

export type IntentChip = {
  id: string;
  label: string;
  targetNodeId: string | null;
};

export type FlowRuntimeState = {
  currentNodeId: string | null;
  waitingForInput: boolean;
  waitingForChip: boolean;
  finished: boolean;
  messages: TestChatMessage[];
  activePage: string | null;
  chips: IntentChip[];
  /** Captured answers / last user text for {{var}} interpolation */
  vars: Record<string, string>;
};

export const idleRuntimeState = (): FlowRuntimeState => ({
  currentNodeId: null,
  waitingForInput: false,
  waitingForChip: false,
  finished: false,
  messages: [],
  activePage: null,
  chips: [],
  vars: {},
});

function msg(
  role: TestChatMessage["role"],
  content: string,
): TestChatMessage {
  return { id: crypto.randomUUID(), role, content };
}

export function interpolate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key: string) => {
    return vars[key] ?? "";
  });
}

function findEntry(nodes: FlowNode[]): FlowNode | null {
  const entry = nodes.find((n) => isPageNameNode(n) && n.data.isEntry);
  if (entry) return entry;
  return nodes.find((n) => n.type === PAGE_NAME_NODE) || nodes[0] || null;
}

function outgoing(edges: FlowEdge[], nodeId: string): FlowEdge[] {
  return edges.filter((e) => e.source === nodeId);
}

function nextFrom(edges: FlowEdge[], nodeId: string): string | null {
  const outs = outgoing(edges, nodeId).filter(
    (e) => !e.sourceHandle || e.sourceHandle === null,
  );
  // Prefer unlabeled / default source; else first edge
  if (outs.length) return outs[0]?.target ?? null;
  return outgoing(edges, nodeId)[0]?.target ?? null;
}

function isSmallTalk(text: string): boolean {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[!?.…]+$/g, "")
    .trim();
  if (!t || t.length > 40) return false;
  return /^(hi|hello|hey|hiya|yo|sup|howdy|good (morning|afternoon|evening)|thanks|thank you|thx|ok|okay|cool|great|nice|sure|yep|yeah|nope|bye)$/i.test(
    t,
  );
}

function lastAiContent(messages: TestChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "ai") return messages[i].content;
  }
  return null;
}

function keywordsMatch(keywords: string, text: string): boolean {
  const parts = keywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  if (!parts.length) return false;
  const hay = text.toLowerCase();
  return parts.some((k) => hay.includes(k));
}


function pickConditionTarget(
  edges: FlowEdge[],
  nodeId: string,
  matched: boolean,
): string | null {
  const outs = outgoing(edges, nodeId);
  if (!outs.length) return null;

  const labeledMatch = outs.find(
    (e) =>
      e.sourceHandle === "match" ||
      /^(yes|match|true|if)$/i.test(String(e.label || "")),
  );
  const labeledElse = outs.find(
    (e) =>
      e.sourceHandle === "else" ||
      /^(no|else|default|false)$/i.test(String(e.label || "")),
  );

  if (matched) {
    return (labeledMatch || outs[0]).target;
  }
  return (labeledElse || outs[1] || outs[0]).target;
}

function buildChips(node: FlowNode, edges: FlowEdge[]): IntentChip[] {
  if (!isIntentNode(node)) return [];
  return (node.data.options || []).map((opt) => {
    const edge = edges.find(
      (e) => e.source === node.id && e.sourceHandle === opt.id,
    );
    return {
      id: opt.id,
      label: opt.label || "Untitled",
      targetNodeId: edge?.target ?? null,
    };
  });
}

/** Exact label, keyword list, or soft contains match */
export function matchIntentOption(
  options: IntentOption[],
  text: string,
): IntentOption | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;

  const exact = options.find((o) => (o.label || "").trim().toLowerCase() === t);
  if (exact) return exact;

  for (const opt of options) {
    if (opt.keywords && keywordsMatch(opt.keywords, t)) return opt;
  }

  // Soft: chip label appears in typed text (or vice versa for short labels)
  const soft = options.find((o) => {
    const label = (o.label || "").trim().toLowerCase();
    if (label.length < 2) return false;
    return t.includes(label) || (t.length >= 3 && label.includes(t));
  });
  return soft ?? null;
}

function resolveKnowledgeQuery(
  queryHint: string,
  userText: string | undefined,
  vars: Record<string, string>,
  activePage: string | null,
): string {
  const fromUser = (userText || "").trim();
  if (fromUser) return fromUser;
  const fromLast = (vars.last_user || vars.last_answer || "").trim();
  if (fromLast) return fromLast;
  const hint = (queryHint || "").trim();
  if (hint) return interpolate(hint, vars);
  return activePage || "help";
}

function stringifyValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Dotted path into JSON, e.g. data.items.0.name */
function getByPath(obj: unknown, path: string): unknown {
  const parts = path
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur) && /^\d+$/.test(part)) {
      cur = cur[Number(part)];
      continue;
    }
    if (typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[part];
      continue;
    }
    return undefined;
  }
  return cur;
}

function joinApiUrl(base: string, path: string): string {
  const b = base.trim();
  const p = path.trim();
  if (!p) return b;
  if (/^https?:\/\//i.test(p)) return p;
  if (!b) return p;
  const left = b.replace(/\/+$/, "");
  const right = p.startsWith("/") ? p : `/${p}`;
  return `${left}${right}`;
}

function parseHeadersJson(
  raw: string,
  vars: Record<string, string>,
): Record<string, string> {
  const text = interpolate(raw || "", vars).trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      out[k] = stringifyValue(v);
    }
    return out;
  } catch {
    return {};
  }
}

async function runKnowledge(
  query: string,
  onToken?: (partial: string) => void,
): Promise<string> {
  let assembled = "";
  for await (const event of api.streamMessage(query, FLOW_TEST_SESSION)) {
    if (event.type === "token") {
      assembled += event.content;
      onToken?.(assembled);
    } else if (event.type === "done") {
      return event.response.answer || assembled;
    } else if (event.type === "error") {
      throw new Error(event.message);
    }
  }
  return assembled || "No answer returned.";
}

function deadEnd(
  messages: TestChatMessage[],
  activePage: string | null,
  vars: Record<string, string>,
  reason: string,
): FlowRuntimeState {
  return {
    currentNodeId: null,
    waitingForInput: true,
    waitingForChip: false,
    finished: false,
    messages: [...messages, msg("system", reason)],
    activePage,
    chips: [],
    vars,
  };
}

/** Advance through auto nodes until a pause (question/intent) or end. */
export async function advanceFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  state: FlowRuntimeState,
  options?: {
    userText?: string;
    onToken?: (partial: string) => void;
  },
): Promise<FlowRuntimeState> {
  let current = state.currentNodeId
    ? nodes.find((n) => n.id === state.currentNodeId) || null
    : findEntry(nodes);

  if (!current) {
    return {
      ...state,
      finished: true,
      waitingForInput: false,
      waitingForChip: false,
      chips: [],
      messages: [
        ...state.messages,
        msg(
          "system",
          "No Start node found. Add a Start node and mark it as the entry.",
        ),
      ],
    };
  }

  const messages = [...state.messages];
  let waitingForInput = false;
  let waitingForChip = false;
  let chips: IntentChip[] = [];
  let finished = false;
  let activePage = state.activePage;
  let vars = { ...state.vars };
  let guard = 0;
  const visited = new Set<string>();

  while (current && guard < 40) {
    guard += 1;

    // Detect tight cycles (same node twice in one advance without waiting)
    const visitKey = `${current.id}:${current.type}`;
    if (
      current.type !== INTENT_NODE &&
      current.type !== QUESTION_NODE &&
      visited.has(visitKey)
    ) {
      return deadEnd(
        messages,
        activePage,
        vars,
        `Loop detected at “${getNodeTitle(current)}”. Break the cycle or add an End node.`,
      );
    }
    if (current.type !== INTENT_NODE && current.type !== QUESTION_NODE) {
      visited.add(visitKey);
    }

    switch (current.type) {
      case PAGE_NAME_NODE: {
        activePage = current.data.pageName || getNodeTitle(current);
        // Quiet start — no "Started: …" spam in the chat transcript
        const nid = nextFrom(edges, current.id);
        current = nid ? nodes.find((n) => n.id === nid) || null : null;
        if (!current) {
          return deadEnd(
            messages,
            activePage,
            vars,
            "Start has no outgoing link — connect it to the next node.",
          );
        }
        break;
      }

      case MESSAGE_NODE: {
        const text = interpolate(current.data.text || "…", vars);
        messages.push(msg("ai", text));
        const nid = nextFrom(edges, current.id);
        current = nid ? nodes.find((n) => n.id === nid) || null : null;
        if (!current) {
          return deadEnd(
            messages,
            activePage,
            vars,
            "Message has no next node — flow paused. Connect an outgoing link or press Start.",
          );
        }
        break;
      }

      case INTENT_NODE: {
        const prompt = interpolate(current.data.prompt || "", vars).trim();
        // Avoid repeating the same menu prompt on every loop-back
        if (prompt && lastAiContent(messages) !== prompt) {
          messages.push(msg("ai", prompt));
        }
        chips = buildChips(current, edges);
        waitingForChip = true;
        waitingForInput = false;
        return {
          currentNodeId: current.id,
          waitingForInput,
          waitingForChip,
          finished: false,
          messages,
          activePage,
          chips,
          vars,
        };
      }

      case QUESTION_NODE: {
        messages.push(
          msg("ai", interpolate(current.data.prompt || "…", vars)),
        );
        waitingForInput = true;
        return {
          currentNodeId: current.id,
          waitingForInput,
          waitingForChip: false,
          finished: false,
          messages,
          activePage,
          chips: [],
          vars,
        };
      }

      case CONDITION_NODE: {
        const userText =
          options?.userText || vars.last_user || vars.last_answer || "";
        const matched = keywordsMatch(current.data.keywords, userText);
        const nid = pickConditionTarget(edges, current.id, matched);
        current = nid ? nodes.find((n) => n.id === nid) || null : null;
        if (!current) {
          return deadEnd(
            messages,
            activePage,
            vars,
            "Condition has no matching outgoing path — connect match/else handles.",
          );
        }
        break;
      }

      case KNOWLEDGE_NODE: {
        const query = resolveKnowledgeQuery(
          current.data.queryHint,
          options?.userText,
          vars,
          activePage,
        );
        try {
          const answer = await runKnowledge(query, options?.onToken);
          vars = {
            ...vars,
            last_answer: answer,
            last_rag: answer,
          };
          messages.push(msg("ai", answer));
        } catch (err) {
          messages.push(
            msg(
              "ai",
              err instanceof Error
                ? `Knowledge error: ${err.message}`
                : "Knowledge lookup failed.",
            ),
          );
        }
        const nid = nextFrom(edges, current.id);
        current = nid ? nodes.find((n) => n.id === nid) || null : null;
        if (!current) {
          return deadEnd(
            messages,
            activePage,
            vars,
            "Knowledge has no next node — flow paused.",
          );
        }
        break;
      }

      case FALLBACK_NODE: {
        if (current.data.message.trim()) {
          messages.push(
            msg("ai", interpolate(current.data.message, vars)),
          );
        }
        if (current.data.runRag) {
          const query =
            (options?.userText || "").trim() ||
            vars.last_user ||
            activePage ||
            "help";
          try {
            const answer = await runKnowledge(query, options?.onToken);
            vars = {
              ...vars,
              last_answer: answer,
              last_rag: answer,
            };
            messages.push(msg("ai", answer));
          } catch (err) {
            messages.push(
              msg(
                "ai",
                err instanceof Error
                  ? `Fallback error: ${err.message}`
                  : "Fallback lookup failed.",
              ),
            );
          }
        }
        const nid = nextFrom(edges, current.id);
        current = nid ? nodes.find((n) => n.id === nid) || null : null;
        if (!current) {
          return deadEnd(
            messages,
            activePage,
            vars,
            "Fallback has no next node — flow paused. Link it back to Intent or End.",
          );
        }
        break;
      }

      case API_NODE: {
        const prefix = (current.data.variableName || "api").trim() || "api";
        const connection = interpolate(
          current.data.connectionString || current.data.url || "",
          vars,
        );
        const pathPart = interpolate(current.data.path || "", vars);
        const url = joinApiUrl(connection, pathPart).trim();
        const headers = parseHeadersJson(current.data.headersJson, vars);
        const bodyRaw = interpolate(current.data.body || "", vars);
        if (!url) {
          messages.push(msg("ai", "API node has no connection string / URL."));
          return deadEnd(
            messages,
            activePage,
            vars,
            "Set Connection string on the API node.",
          );
        }
        try {
          const result = await api.executeFlowHttp({
            method: current.data.method || "GET",
            url,
            headers,
            body:
              current.data.method === "GET" || !bodyRaw.trim()
                ? null
                : bodyRaw,
          });
          let extracted: unknown = result.json_data ?? result.body;
          if (current.data.responsePath.trim()) {
            extracted = getByPath(
              result.json_data ?? {},
              current.data.responsePath,
            );
          }
          const extractedStr = stringifyValue(extracted);
          vars = {
            ...vars,
            [prefix]: extractedStr,
            [`${prefix}_status`]: String(result.status),
            [`${prefix}_body`]: result.body,
            [`${prefix}_ok`]: result.ok ? "true" : "false",
            last_answer: extractedStr || result.body,
            last_api: extractedStr || result.body,
          };
          if (current.data.showInChat) {
            if (result.error && !result.body) {
              messages.push(msg("ai", `API error: ${result.error}`));
            } else {
              const preview =
                extractedStr.length > 1200
                  ? `${extractedStr.slice(0, 1200)}…`
                  : extractedStr || result.body || "(empty response)";
              messages.push(msg("ai", preview));
            }
          }
        } catch (err) {
          messages.push(
            msg(
              "ai",
              err instanceof Error
                ? `API error: ${err.message}`
                : "API request failed.",
            ),
          );
        }
        const nid = nextFrom(edges, current.id);
        current = nid ? nodes.find((n) => n.id === nid) || null : null;
        if (!current) {
          return deadEnd(
            messages,
            activePage,
            vars,
            "API has no next node — flow paused.",
          );
        }
        break;
      }

      case MYSQL_NODE: {
        const prefix = (current.data.variableName || "db").trim() || "db";
        const sql = interpolate(current.data.sql || "", vars).trim();
        if (!sql) {
          messages.push(msg("ai", "MySQL node has empty SQL."));
          return deadEnd(messages, activePage, vars, "Add a SQL query.");
        }
        try {
          const result = await api.executeFlowMysql({
            host: interpolate(current.data.host, vars),
            port: Number(current.data.port || 3306) || 3306,
            database: interpolate(current.data.database, vars),
            user: interpolate(current.data.user, vars),
            password: interpolate(current.data.password, vars),
            sql,
            result_mode: current.data.resultMode || "first_row",
          });
          if (!result.ok) {
            messages.push(
              msg("ai", `MySQL error: ${result.error || "Query failed"}`),
            );
          } else {
            let primary = "";
            if (current.data.resultMode === "scalar") {
              primary = stringifyValue(result.scalar);
            } else if (current.data.resultMode === "rows_json") {
              primary = stringifyValue(result.rows);
            } else {
              primary = stringifyValue(result.first_row || {});
            }
            vars = {
              ...vars,
              [prefix]: primary,
              [`${prefix}_rows`]: stringifyValue(result.rows),
              [`${prefix}_count`]: String(result.row_count),
              last_answer: primary || result.preview,
              last_db: primary || result.preview,
            };
            if (current.data.mapColumnsToVars && result.first_row) {
              for (const [col, val] of Object.entries(result.first_row)) {
                const key = `${prefix}_${col}`.replace(/\W+/g, "_");
                vars[key] = stringifyValue(val);
              }
            }
            if (current.data.showInChat) {
              messages.push(
                msg(
                  "ai",
                  result.preview || primary || `(${result.row_count} rows)`,
                ),
              );
            }
          }
        } catch (err) {
          messages.push(
            msg(
              "ai",
              err instanceof Error
                ? `MySQL error: ${err.message}`
                : "MySQL query failed.",
            ),
          );
        }
        const nid = nextFrom(edges, current.id);
        current = nid ? nodes.find((n) => n.id === nid) || null : null;
        if (!current) {
          return deadEnd(
            messages,
            activePage,
            vars,
            "MySQL has no next node — flow paused.",
          );
        }
        break;
      }

      case END_NODE: {
        if (current.data.farewell.trim()) {
          messages.push(
            msg("ai", interpolate(current.data.farewell, vars)),
          );
        }
        finished = true;
        return {
          currentNodeId: current.id,
          waitingForInput: false,
          waitingForChip: false,
          finished,
          messages,
          activePage,
          chips: [],
          vars,
        };
      }

      default:
        return deadEnd(
          messages,
          activePage,
          vars,
          `Unknown node type — cannot continue.`,
        );
    }
  }

  return deadEnd(
    messages,
    activePage,
    vars,
    "Flow stopped after too many steps (possible loop). Check connections.",
  );
}

export async function clearFlowTestSession(): Promise<void> {
  try {
    await api.clearHistory(FLOW_TEST_SESSION);
  } catch {
    // Session may not exist yet — ignore
  }
}

export async function startFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
): Promise<FlowRuntimeState> {
  await clearFlowTestSession();
  const entry = findEntry(nodes);
  const initial: FlowRuntimeState = {
    ...idleRuntimeState(),
    currentNodeId: entry?.id ?? null,
    messages: [],
  };
  return advanceFlow(nodes, edges, initial);
}

export async function submitUserMessage(
  nodes: FlowNode[],
  edges: FlowEdge[],
  state: FlowRuntimeState,
  text: string,
  onToken?: (partial: string) => void,
): Promise<FlowRuntimeState> {
  const messages = [...state.messages, msg("human", text)];
  let current = state.currentNodeId
    ? nodes.find((n) => n.id === state.currentNodeId) || null
    : null;

  if (!current) {
    return {
      ...state,
      messages: [
        ...messages,
        msg(
          "system",
          state.finished
            ? "Flow already ended. Press Start to run again."
            : "Flow is paused (no active node). Press Start to run again.",
        ),
      ],
      waitingForInput: false,
      waitingForChip: false,
      chips: [],
    };
  }

  if (current.type === INTENT_NODE) {
    const options = isIntentNode(current) ? current.data.options || [] : [];
    const matched = matchIntentOption(options, text);
    if (matched) {
      return selectIntentChip(
        nodes,
        edges,
        { ...state, messages, vars: { ...state.vars, last_user: text } },
        matched.id,
        onToken,
      );
    }

    // Greetings / small talk stay on the menu — don't burn a RAG fallback
    if (isSmallTalk(text)) {
      const chips = buildChips(current, edges);
      return {
        ...state,
        messages: [
          ...messages,
          msg(
            "ai",
            "Hi! Pick a topic below, or type a specific question and I’ll look it up.",
          ),
        ],
        vars: { ...state.vars, last_user: text },
        currentNodeId: current.id,
        waitingForChip: true,
        waitingForInput: false,
        chips,
        finished: false,
      };
    }

    const intentId = current.id;
    const fallbackEdge = edges.find(
      (e) =>
        e.source === intentId && e.sourceHandle === INTENT_FALLBACK_HANDLE,
    );
    if (fallbackEdge?.target) {
      const nextNode = nodes.find((n) => n.id === fallbackEdge.target) || null;
      if (nextNode) {
        return advanceFlow(
          nodes,
          edges,
          {
            ...state,
            messages,
            vars: { ...state.vars, last_user: text, last_answer: text },
            currentNodeId: nextNode.id,
            waitingForInput: false,
            waitingForChip: false,
            chips: [],
          },
          { userText: text, onToken },
        );
      }
    }

    return {
      ...state,
      messages: [
        ...messages,
        msg(
          "ai",
          "I didn’t catch that. Pick a chip below, or ask a clearer question.",
        ),
      ],
      waitingForChip: true,
      chips: buildChips(current, edges),
    };
  }

  let vars: Record<string, string> = { ...state.vars, last_user: text };

  if (current.type === QUESTION_NODE) {
    const varName =
      (current.data.variableName || "").trim() || "answer";
    vars = {
      ...vars,
      last_answer: text,
      [varName]: text,
      [`q_${current.id}`]: text,
    };
    const nid = nextFrom(edges, current.id);
    current = nid ? nodes.find((n) => n.id === nid) || null : null;
  } else if (current.type !== CONDITION_NODE) {
    // Dead-end wait: should not re-enter auto nodes from a previous id
    return {
      ...state,
      messages: [
        ...messages,
        msg(
          "system",
          "Not waiting for input here. Press Start, or connect the flow so it pauses on Question / Intent.",
        ),
      ],
    };
  }

  const nextState: FlowRuntimeState = {
    ...state,
    messages,
    vars,
    currentNodeId: current?.id ?? null,
    waitingForInput: false,
    waitingForChip: false,
    chips: [],
  };

  if (!current) {
    return deadEnd(
      messages,
      state.activePage,
      vars,
      "No next node after your reply. Connect the Question to the next step.",
    );
  }

  return advanceFlow(nodes, edges, nextState, { userText: text, onToken });
}

export async function selectIntentChip(
  nodes: FlowNode[],
  edges: FlowEdge[],
  state: FlowRuntimeState,
  optionId: string,
  onToken?: (partial: string) => void,
): Promise<FlowRuntimeState> {
  const chip = state.chips.find((c) => c.id === optionId);
  const label = chip?.label || "Intent";
  const last = state.messages[state.messages.length - 1];
  const withHuman =
    last?.role === "human"
      ? state.messages
      : [...state.messages, msg("human", label)];

  if (!chip?.targetNodeId) {
    return {
      ...state,
      messages: [
        ...withHuman,
        msg(
          "system",
          `“${label}” is not connected. Link that intent handle to a Message, Knowledge, Intent, or other node.`,
        ),
      ],
      waitingForChip: true,
    };
  }

  const nextNode = nodes.find((n) => n.id === chip.targetNodeId) || null;
  if (!nextNode) {
    return {
      ...state,
      messages: [
        ...withHuman,
        msg("system", "Target node missing. Reconnect the intent."),
      ],
      waitingForChip: true,
    };
  }

  const userText = last?.role === "human" ? last.content : label;

  return advanceFlow(
    nodes,
    edges,
    {
      ...state,
      messages: withHuman,
      vars: {
        ...state.vars,
        last_user: userText,
        last_intent: label,
      },
      currentNodeId: nextNode.id,
      waitingForInput: false,
      waitingForChip: false,
      chips: [],
    },
    { userText, onToken },
  );
}
