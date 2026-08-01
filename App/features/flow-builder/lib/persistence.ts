import { FLOW_STORAGE_KEY } from "../constants";
import type { FlowDocument } from "../types";
import { parseFlowDocument } from "./parseFlowDocument";

export const FLOW_LIBRARY_KEY = "chatbot-avatar-flow-library";

export type SavedFlowMeta = {
  id: string;
  name: string;
  updatedAt: string;
};

type FlowLibrary = {
  version: 1;
  activeId: string;
  flows: Array<{ id: string; document: FlowDocument }>;
};

function emptyLibrary(): FlowLibrary {
  return { version: 1, activeId: "", flows: [] };
}

function readLibrary(): FlowLibrary {
  if (typeof window === "undefined") return emptyLibrary();
  try {
    const raw = localStorage.getItem(FLOW_LIBRARY_KEY);
    if (!raw) return emptyLibrary();
    const parsed = JSON.parse(raw) as FlowLibrary;
    if (parsed?.version !== 1 || !Array.isArray(parsed.flows)) {
      return emptyLibrary();
    }
    return parsed;
  } catch {
    return emptyLibrary();
  }
}

function writeLibrary(lib: FlowLibrary): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FLOW_LIBRARY_KEY, JSON.stringify(lib));
}

export function loadFlow(): FlowDocument | null {
  if (typeof window === "undefined") return null;

  // Prefer library active flow
  const lib = readLibrary();
  if (lib.activeId) {
    const entry = lib.flows.find((f) => f.id === lib.activeId);
    if (entry) {
      const parsed = parseFlowDocument(entry.document);
      if (parsed.ok) return parsed.doc;
    }
  }

  // Legacy single-document key
  try {
    const raw = localStorage.getItem(FLOW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseFlowDocument(JSON.parse(raw));
    if (!parsed.ok) return null;
    // Migrate into library
    upsertFlowInLibrary(parsed.doc);
    return parsed.doc;
  } catch {
    return null;
  }
}

export function saveFlow(doc: FlowDocument): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(doc));
  upsertFlowInLibrary(doc);
}

export function upsertFlowInLibrary(
  doc: FlowDocument,
  id?: string,
): SavedFlowMeta {
  const lib = readLibrary();
  const existing =
    (id && lib.flows.find((f) => f.id === id)) ||
    lib.flows.find((f) => f.document.name === doc.name && f.id === lib.activeId) ||
    (lib.activeId ? lib.flows.find((f) => f.id === lib.activeId) : undefined);

  const flowId = existing?.id || id || crypto.randomUUID();
  const nextDoc: FlowDocument = {
    ...doc,
    updatedAt: new Date().toISOString(),
  };
  const flows = existing
    ? lib.flows.map((f) =>
        f.id === flowId ? { id: flowId, document: nextDoc } : f,
      )
    : [...lib.flows, { id: flowId, document: nextDoc }];

  // Cap library size
  const trimmed = flows.slice(-20);
  writeLibrary({ version: 1, activeId: flowId, flows: trimmed });
  localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(nextDoc));

  return {
    id: flowId,
    name: nextDoc.name,
    updatedAt: nextDoc.updatedAt,
  };
}

export function listSavedFlows(): SavedFlowMeta[] {
  return readLibrary()
    .flows.map((f) => ({
      id: f.id,
      name: f.document.name || "Untitled flow",
      updatedAt: f.document.updatedAt || "",
    }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function loadFlowById(id: string): FlowDocument | null {
  const lib = readLibrary();
  const entry = lib.flows.find((f) => f.id === id);
  if (!entry) return null;
  const parsed = parseFlowDocument(entry.document);
  if (!parsed.ok) return null;
  writeLibrary({ ...lib, activeId: id });
  localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(parsed.doc));
  return parsed.doc;
}

export function downloadFlowJson(doc: FlowDocument): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(doc.name || "flow")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "flow"
  );
}
