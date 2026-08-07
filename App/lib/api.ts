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
  editable?: boolean;
};

export type ConfigResponse = {
  categories: Record<string, ConfigField[]>;
  session_name?: string | null;
  session_scoped?: boolean;
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
  session_name: string;
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

export type IngestDocumentResult = {
  pdf_path: string;
  document_id?: string;
  source_name?: string;
  pages: number;
  blocks?: number;
  chunks: number;
  topic_distribution?: Record<string, number>;
  document_title?: string;
  domain?: string;
  assistant_role?: string;
  discovery_method?: string;
  topics?: Record<string, string[]>;
};

export type DataCollection = {
  id: string;
  name: string;
  description: string;
  namespace: string;
  enabled: boolean;
  document_count: number;
  pages: number;
  chunks: number;
  document_title?: string | null;
  domain?: string | null;
  topics?: Record<string, string[]>;
  source_files?: string[];
  created_at: string;
  updated_at: string;
};

export type IngestResponse = {
  status: string;
  pdf_path: string;
  pdf_paths?: string[];
  pages: number;
  chunks: number;
  index_name: string;
  namespace?: string;
  collection_id?: string | null;
  collection?: DataCollection | null;
  topic_distribution: Record<string, number>;
  document_title?: string;
  domain?: string;
  assistant_role?: string;
  discovery_method?: string;
  topics?: Record<string, string[]>;
  documents?: IngestDocumentResult[];
  document_count?: number;
};

export type CatalogModel = {
  id: string;
  name: string;
  dataset_category: string;
  kind: "model" | "embedding";
  launch_date: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type DatasetCategory = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type PublishedConfig = {
  id: string;
  name: string;
  description: string;
  dataset_category: string;
  settings: Record<string, string | number | boolean>;
  session_name?: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type CatalogLanguage = {
  id: string;
  name: string;
  code: string;
  native_name: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

function sessionQuery(sessionName?: string) {
  return sessionName ? `?session_name=${encodeURIComponent(sessionName)}` : "";
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),

  getConfig: (sessionName?: string) =>
    request<ConfigResponse>(`/api/config${sessionQuery(sessionName)}`),

  updateConfig: (
    updates: Record<string, string | number | boolean>,
    sessionName?: string,
  ) =>
    request<{ updated: string[]; config: ConfigResponse; session_name?: string }>(
      "/api/config",
      {
        method: "PATCH",
        body: JSON.stringify({
          updates,
          session_name: sessionName || null,
        }),
      },
    ),

  resetConfig: (options?: {
    keys?: string[];
    include_secrets?: boolean;
    sessionName?: string;
  }) =>
    request<{ updated: string[]; config: ConfigResponse; session_name?: string }>(
      "/api/config/reset",
      {
        method: "POST",
        body: JSON.stringify({
          keys: options?.keys ?? null,
          include_secrets: options?.include_secrets ?? false,
          session_name: options?.sessionName || null,
        }),
      },
    ),

  runIngest: (options?: {
    pdf_path?: string;
    pdf_paths?: string[];
    replace_all?: boolean;
    collection_id?: string;
    create_collection?: {
      name: string;
      description?: string;
      namespace?: string;
      enabled?: boolean;
    };
    replace_namespace?: boolean;
  }) =>
    request<IngestResponse>("/api/ingest/run", {
      method: "POST",
      body: JSON.stringify({
        pdf_path: options?.pdf_path || null,
        pdf_paths: options?.pdf_paths || null,
        replace_all: options?.replace_all ?? false,
        collection_id: options?.collection_id || null,
        create_collection: options?.create_collection || null,
        replace_namespace: options?.replace_namespace ?? false,
      }),
    }),

  uploadIngest: async (
    file: File,
    options?: {
      collection_id?: string;
      collection_name?: string;
      collection_description?: string;
      collection_namespace?: string;
      replace_namespace?: boolean;
    },
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (options?.collection_id) form.append("collection_id", options.collection_id);
    if (options?.collection_name) form.append("collection_name", options.collection_name);
    if (options?.collection_description)
      form.append("collection_description", options.collection_description);
    if (options?.collection_namespace)
      form.append("collection_namespace", options.collection_namespace);
    if (options?.replace_namespace) form.append("replace_namespace", "true");
    const res = await fetch(`${API_BASE}/api/ingest/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(detail || `Upload failed (${res.status})`);
    }
    return res.json() as Promise<IngestResponse>;
  },

  uploadIngestBatch: async (
    files: File[],
    options?: {
      collection_id?: string;
      collection_name?: string;
      collection_description?: string;
      collection_namespace?: string;
      replace_namespace?: boolean;
    },
  ) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    if (options?.collection_id) form.append("collection_id", options.collection_id);
    if (options?.collection_name) form.append("collection_name", options.collection_name);
    if (options?.collection_description)
      form.append("collection_description", options.collection_description);
    if (options?.collection_namespace)
      form.append("collection_namespace", options.collection_namespace);
    if (options?.replace_namespace) form.append("replace_namespace", "true");
    const res = await fetch(`${API_BASE}/api/ingest/upload/batch`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(detail || `Batch upload failed (${res.status})`);
    }
    return res.json() as Promise<IngestResponse>;
  },

  listDataCollections: (enabledOnly = false) =>
    request<DataCollection[]>(
      `/api/data-collections${enabledOnly ? "?enabled_only=true" : ""}`,
    ),

  createDataCollection: (body: {
    name: string;
    description?: string;
    namespace?: string;
    enabled?: boolean;
  }) =>
    request<DataCollection>("/api/data-collections", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateDataCollection: (
    id: string,
    body: Partial<{ name: string; description: string; enabled: boolean }>,
  ) =>
    request<DataCollection>(`/api/data-collections/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteDataCollection: (id: string, clearVectors = true) =>
    request<{
      deleted: boolean;
      id: string;
      namespace?: string;
      vectors_cleared?: boolean;
      warning?: string;
    }>(
      `/api/data-collections/${id}?clear_vectors=${clearVectors ? "true" : "false"}`,
      { method: "DELETE" },
    ),

  sendMessage: (message: string, sessionName?: string) =>
    request<ChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        session_name: sessionName || null,
      }),
    }),

  streamMessage: async function* (
    message: string,
    sessionName?: string,
  ): AsyncGenerator<StreamEvent, void> {
    const res = await fetch(`${API_BASE}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        session_name: sessionName || null,
      }),
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

  getHistory: (sessionName?: string) =>
    request<{ session_name: string; session_id: string; messages: ChatMessage[] }>(
      `/api/chat/history${sessionQuery(sessionName)}`,
    ),

  clearHistory: (sessionName?: string) =>
    request<{ session_name: string; session_id: string; cleared: boolean }>(
      `/api/chat/history${sessionQuery(sessionName)}`,
      { method: "DELETE" },
    ),

  listSessions: () =>
    request<{ sessions: string[] }>("/api/chat/sessions"),

  executeFlowHttp: (body: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string | null;
    timeout_seconds?: number;
  }) =>
    request<{
      ok: boolean;
      status: number;
      body: string;
      json_data: unknown;
      error: string | null;
    }>("/api/flow/http", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  executeFlowMysql: (body: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    sql: string;
    result_mode: string;
    max_rows?: number;
  }) =>
    request<{
      ok: boolean;
      rows: Record<string, unknown>[];
      columns: string[];
      row_count: number;
      scalar: unknown;
      first_row: Record<string, unknown> | null;
      preview: string;
      error: string | null;
    }>("/api/flow/mysql", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listCatalogModels: () => request<CatalogModel[]>("/api/catalog/models"),

  createCatalogModel: (body: {
    name: string;
    dataset_category: string;
    kind: "model" | "embedding";
    launch_date: string;
    enabled: boolean;
  }) =>
    request<CatalogModel>("/api/catalog/models", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateCatalogModel: (
    id: string,
    body: Partial<{
      name: string;
      dataset_category: string;
      kind: "model" | "embedding";
      launch_date: string;
      enabled: boolean;
    }>,
  ) =>
    request<CatalogModel>(`/api/catalog/models/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteCatalogModel: (id: string) =>
    request<{ deleted: boolean; id: string }>(`/api/catalog/models/${id}`, {
      method: "DELETE",
    }),

  listDatasetCategories: () =>
    request<DatasetCategory[]>("/api/catalog/dataset-categories"),

  createDatasetCategory: (body: {
    name: string;
    description: string;
    enabled: boolean;
  }) =>
    request<DatasetCategory>("/api/catalog/dataset-categories", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateDatasetCategory: (
    id: string,
    body: Partial<{
      name: string;
      description: string;
      enabled: boolean;
    }>,
  ) =>
    request<DatasetCategory>(`/api/catalog/dataset-categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteDatasetCategory: (id: string) =>
    request<{ deleted: boolean; id: string }>(
      `/api/catalog/dataset-categories/${id}`,
      { method: "DELETE" },
    ),

  listCatalogLanguages: () =>
    request<CatalogLanguage[]>("/api/catalog/languages"),

  createCatalogLanguage: (body: {
    name: string;
    code: string;
    native_name: string;
    enabled: boolean;
  }) =>
    request<CatalogLanguage>("/api/catalog/languages", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateCatalogLanguage: (
    id: string,
    body: Partial<{
      name: string;
      code: string;
      native_name: string;
      enabled: boolean;
    }>,
  ) =>
    request<CatalogLanguage>(`/api/catalog/languages/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteCatalogLanguage: (id: string) =>
    request<{ deleted: boolean; id: string }>(`/api/catalog/languages/${id}`, {
      method: "DELETE",
    }),

  seedCatalog: () => request<Record<string, unknown>>("/api/catalog/seed"),

  listPublishedConfigs: (options?: {
    dataset_category?: string;
    enabled_only?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (options?.dataset_category)
      params.set("dataset_category", options.dataset_category);
    if (options?.enabled_only) params.set("enabled_only", "true");
    const qs = params.toString();
    return request<PublishedConfig[]>(
      `/api/published-configs${qs ? `?${qs}` : ""}`,
    );
  },

  getPublishedConfig: (id: string) =>
    request<PublishedConfig>(`/api/published-configs/${id}`),

  createPublishedConfig: (body: {
    name: string;
    description?: string;
    dataset_category: string;
    settings: Record<string, string | number | boolean>;
    session_name?: string | null;
    enabled?: boolean;
  }) =>
    request<PublishedConfig>("/api/published-configs", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updatePublishedConfig: (
    id: string,
    body: Partial<{
      name: string;
      description: string;
      dataset_category: string;
      settings: Record<string, string | number | boolean>;
      enabled: boolean;
    }>,
  ) =>
    request<PublishedConfig>(`/api/published-configs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deletePublishedConfig: (id: string) =>
    request<{ deleted: boolean; id: string }>(`/api/published-configs/${id}`, {
      method: "DELETE",
    }),
};
