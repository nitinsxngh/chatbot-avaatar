import type { FlowNodeType, PaletteItem } from "./types";
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
} from "./types";

export const FLOW_STORAGE_KEY = "chatbot-avatar-flow";
export const FLOW_TEST_SESSION = "flow-test";
export const FLOW_EDGE = "flow" as const;

export const DEFAULT_PAGE_NAME = "start";

export const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: PAGE_NAME_NODE,
    label: "Start",
    description: "Flow entry point",
    badge: "St",
    accent: "#0071e3",
  },
  {
    type: MESSAGE_NODE,
    label: "Message",
    description: "Bot sends a fixed reply",
    badge: "Msg",
    accent: "#34c759",
  },
  {
    type: INTENT_NODE,
    label: "Intent",
    description: "Chip choices that open linked nodes",
    badge: "Int",
    accent: "#ff2d55",
  },
  {
    type: QUESTION_NODE,
    label: "Question",
    description: "Ask the user and store their answer",
    badge: "Q",
    accent: "#ff9f0a",
  },
  {
    type: CONDITION_NODE,
    label: "Condition",
    description: "Branch on keywords in the last reply",
    badge: "If",
    accent: "#af52de",
  },
  {
    type: API_NODE,
    label: "API",
    description: "Call an HTTP API and store the response",
    badge: "API",
    accent: "#0a84ff",
  },
  {
    type: MYSQL_NODE,
    label: "MySQL",
    description: "Run a SQL query and store the result",
    badge: "SQL",
    accent: "#00758f",
  },
  {
    type: FALLBACK_NODE,
    label: "Fallback",
    description: "Handles free-text that doesn’t match chips",
    badge: "Fb",
    accent: "#ff9500",
  },
  {
    type: KNOWLEDGE_NODE,
    label: "Knowledge",
    description: "Answer from RAG / documents",
    badge: "RAG",
    accent: "#5856d6",
  },
  {
    type: END_NODE,
    label: "End",
    description: "Stop the conversation flow",
    badge: "End",
    accent: "#8e8e93",
  },
];

export const NODE_DEFAULTS: Record<
  Exclude<FlowNodeType, typeof INTENT_NODE>,
  Record<string, string | boolean>
> = {
  [PAGE_NAME_NODE]: {
    pageName: DEFAULT_PAGE_NAME,
    description: "",
    isEntry: false,
  },
  [MESSAGE_NODE]: {
    label: "Bot message",
    text: "Hello! How can I help you today?",
  },
  [QUESTION_NODE]: {
    label: "Ask user",
    prompt: "What would you like to know?",
    variableName: "answer",
  },
  [CONDITION_NODE]: {
    label: "Branch",
    keywords: "yes, ok, sure",
  },
  [KNOWLEDGE_NODE]: {
    label: "RAG answer",
    queryHint: "",
  },
  [FALLBACK_NODE]: {
    label: "Fallback",
    message: "I’ll look that up for you.",
    runRag: true,
  },
  [API_NODE]: {
    label: "HTTP request",
    method: "GET",
    connectionString: "https://httpbin.org",
    path: "/get",
    headersJson: '{\n  "Accept": "application/json"\n}',
    body: "",
    responsePath: "",
    variableName: "api",
    showInChat: true,
  },
  [MYSQL_NODE]: {
    label: "MySQL query",
    host: "127.0.0.1",
    port: "3306",
    database: "app",
    user: "root",
    password: "",
    sql: "SELECT 1 AS ok;",
    resultMode: "first_row",
    mapColumnsToVars: true,
    variableName: "db",
    showInChat: true,
  },
  [END_NODE]: {
    label: "End",
    farewell: "Thanks for chatting. Goodbye!",
  },
};
