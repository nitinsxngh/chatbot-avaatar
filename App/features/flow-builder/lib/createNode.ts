import type { XYPosition } from "@xyflow/react";
import { NODE_DEFAULTS } from "../constants";
import {
  API_NODE,
  CONDITION_NODE,
  END_NODE,
  FALLBACK_NODE,
  INTENT_NODE,
  KNOWLEDGE_NODE,
  MESSAGE_NODE,
  MYSQL_NODE,
  PAGE_NAME_NODE,
  QUESTION_NODE,
  createIntentOption,
  type ApiNodeData,
  type FlowNode,
  type FlowNodeType,
  type MysqlNodeData,
  type PageNameNodeData,
} from "../types";

export function createFlowNode(
  type: FlowNodeType,
  position: XYPosition,
  overrides?: Record<string, string | boolean>,
): FlowNode {
  const id = `${type}-${crypto.randomUUID().slice(0, 8)}`;

  if (type === INTENT_NODE) {
    return {
      id,
      type,
      position,
      data: {
        label: String(overrides?.label ?? "Choose an intent"),
        prompt: String(
          overrides?.prompt ?? "What would you like to do next?",
        ),
        options: [
          createIntentOption("Pricing"),
          createIntentOption("Support"),
          createIntentOption("Talk to agent"),
        ],
      },
    };
  }

  const data = { ...NODE_DEFAULTS[type], ...overrides };

  switch (type) {
    case PAGE_NAME_NODE:
      return {
        id,
        type,
        position,
        data: data as PageNameNodeData,
      };
    case MESSAGE_NODE:
      return {
        id,
        type,
        position,
        data: {
          label: String(data.label),
          text: String(data.text),
        },
      };
    case QUESTION_NODE:
      return {
        id,
        type,
        position,
        data: {
          label: String(data.label),
          prompt: String(data.prompt),
          variableName: String(data.variableName || "answer") || "answer",
        },
      };
    case CONDITION_NODE:
      return {
        id,
        type,
        position,
        data: {
          label: String(data.label),
          keywords: String(data.keywords),
        },
      };
    case KNOWLEDGE_NODE:
      return {
        id,
        type,
        position,
        data: {
          label: String(data.label),
          queryHint: String(data.queryHint),
        },
      };
    case FALLBACK_NODE:
      return {
        id,
        type,
        position,
        data: {
          label: String(data.label),
          message: String(data.message),
          runRag: Boolean(data.runRag),
        },
      };
    case API_NODE: {
      const method = String(data.method || "GET").toUpperCase();
      const allowed = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
      const connectionString = String(
        data.connectionString || data.url || "",
      );
      return {
        id,
        type,
        position,
        data: {
          label: String(data.label),
          method: (allowed.includes(method as (typeof allowed)[number])
            ? method
            : "GET") as ApiNodeData["method"],
          connectionString:
            connectionString || "https://httpbin.org",
          path: String(data.path ?? ""),
          headersJson: String(data.headersJson),
          body: String(data.body),
          responsePath: String(data.responsePath || ""),
          variableName: String(data.variableName || "api") || "api",
          showInChat: data.showInChat !== false,
        },
      };
    }
    case MYSQL_NODE: {
      const mode = String(data.resultMode || "first_row");
      const modes = ["first_row", "rows_json", "scalar"] as const;
      return {
        id,
        type,
        position,
        data: {
          label: String(data.label),
          host: String(data.host),
          port: String(data.port || "3306"),
          database: String(data.database),
          user: String(data.user),
          password: String(data.password),
          sql: String(data.sql),
          resultMode: (modes.includes(mode as (typeof modes)[number])
            ? mode
            : "first_row") as MysqlNodeData["resultMode"],
          mapColumnsToVars: data.mapColumnsToVars !== false,
          variableName: String(data.variableName || "db") || "db",
          showInChat: data.showInChat !== false,
        },
      };
    }
    case END_NODE:
      return {
        id,
        type,
        position,
        data: {
          label: String(data.label),
          farewell: String(data.farewell),
        },
      };
    default:
      return {
        id,
        type: PAGE_NAME_NODE,
        position,
        data: data as PageNameNodeData,
      };
  }
}
