const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export type ConfigField = {
  key: string;
  label: string;
  type: string;
  value: string | number | boolean;
  default?: string | number | boolean;
  has_value: boolean;
  secret: boolean;
};

export type ConfigResponse = {
  categories: Record<string, ConfigField[]>;
};

export type ChatMessage = {
  role: "human" | "ai";
  content: string;
};

export type ChunkTrace = {
  rank: number;
  score: number;
  page: string;
  topic: string;
  snippet: string;
};

export type RetrievalAttempt = {
  attempt: number;
  query: string;
  metadata_filter?: string;
  filter_fallback: boolean;
  flashrank_score: number;
  pinecone_score: number;
  confidence_score: number;
  band: string;
  chunks: ChunkTrace[];
};

export type ChatTrace = {
  logs: string[];
  intent_detail?: string | { raw: string; fallback: string };
  retrieval_attempts: RetrievalAttempt[];
  summary?: {
    intent?: string;
    route?: string;
    latency_ms?: number;
    search_query?: string;
    retry_queries?: string[];
    band?: string;
    flashrank_score?: number;
    pinecone_score?: number;
    confidence_score?: number;
    pages?: number[];
    topics?: string[];
  };
  thresholds?: Record<string, number>;
};

export type ChatResponse = {
  answer: string;
  session_id: string;
  intent?: string;
  route?: string;
  band?: string;
  latency_ms?: number;
  confidence_score?: number;
  flashrank_score?: number;
  pinecone_score?: number;
  search_query?: string;
  pages?: number[];
  topics?: string[];
  security_blocked?: boolean;
  trace?: ChatTrace;
};

export type StreamEvent =
  | { type: "status"; message: string }
  | { type: "token"; content: string }
  | { type: "done"; response: ChatResponse }
  | { type: "error"; message: string };

export type IngestResponse = {
  status: string;
  pdf_path: string;
  pages: number;
  chunks: number;
  index_name: string;
  topic_distribution: Record<string, number>;
};

export const api = {
  health: () => request<{ status: string }>("/api/health"),

  getConfig: () => request<ConfigResponse>("/api/config"),

  updateConfig: (updates: Record<string, string | number | boolean>) =>
    request<{ updated: string[]; config: ConfigResponse }>("/api/config", {
      method: "PATCH",
      body: JSON.stringify({ updates }),
    }),

  resetConfig: (options?: { keys?: string[]; include_secrets?: boolean }) =>
    request<{ updated: string[]; config: ConfigResponse }>("/api/config/reset", {
      method: "POST",
      body: JSON.stringify({
        keys: options?.keys ?? null,
        include_secrets: options?.include_secrets ?? false,
      }),
    }),

  runIngest: (pdf_path?: string) =>
    request<IngestResponse>("/api/ingest/run", {
      method: "POST",
      body: JSON.stringify({ pdf_path: pdf_path || null }),
    }),

  sendMessage: (message: string, session_id?: string) =>
    request<ChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, session_id: session_id || null }),
    }),

  streamMessage: async function* (
    message: string,
    session_id?: string,
  ): AsyncGenerator<StreamEvent, void> {
    const res = await fetch(`${API_BASE}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: session_id || null }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(detail || `Stream failed (${res.status})`);
    }

    if (!res.body) {
      throw new Error("No response body for stream");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        const line = part
          .split("\n")
          .map((l) => l.trim())
          .find((l) => l.startsWith("data:"));
        if (!line) continue;
        const raw = line.replace(/^data:\s*/, "");
        if (!raw) continue;
        try {
          yield JSON.parse(raw) as StreamEvent;
        } catch {
          /* skip malformed chunk */
        }
      }
    }
  },

  getHistory: (session_id?: string) => {
    const query = session_id ? `?session_id=${encodeURIComponent(session_id)}` : "";
    return request<{ session_id: string; messages: ChatMessage[] }>(
      `/api/chat/history${query}`,
    );
  },

  clearHistory: (session_id?: string) => {
    const query = session_id ? `?session_id=${encodeURIComponent(session_id)}` : "";
    return request<{ session_id: string; cleared: boolean }>(
      `/api/chat/history${query}`,
      { method: "DELETE" },
    );
  },

  listSessions: () =>
    request<{ sessions: string[] }>("/api/chat/sessions"),
};
