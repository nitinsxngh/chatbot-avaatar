"use client";

import { FormEvent, useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/ui";
import {
  api,
  DataCollection,
  IngestDocumentResult,
  IngestResponse,
} from "@/lib/api";

type Mode = "create" | "update";

export default function IngestPage() {
  const [collections, setCollections] = useState<DataCollection[]>([]);
  const [mode, setMode] = useState<Mode>("create");
  const [selectedId, setSelectedId] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [pdfPath, setPdfPath] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [replaceNamespace, setReplaceNamespace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState("");

  async function loadCollections() {
    try {
      const rows = await api.listDataCollections();
      setCollections(rows);
      if (!selectedId && rows.length > 0) {
        setSelectedId(rows[0].id);
      }
    } catch {
      /* empty list until Mongo is up */
    }
  }

  useEffect(() => {
    loadCollections();
    api
      .getConfig()
      .then((config) => {
        const ingestFields = config.categories.ingest || [];
        const pdfField = ingestFields.find((f) => f.key === "PDF_PATH");
        if (pdfField && typeof pdfField.value === "string") {
          setPdfPath(pdfField.value);
        }
      })
      .catch(() => {});
  }, []);

  const selected = collections.find((c) => c.id === selectedId) || null;

  function collectionOptions() {
    if (mode === "create") {
      if (!newName.trim()) return undefined;
      return {
        collection_name: newName.trim(),
        collection_description: newDescription.trim(),
        replace_namespace: false,
      };
    }
    if (!selectedId) return undefined;
    return {
      collection_id: selectedId,
      replace_namespace: replaceNamespace,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      if (mode === "create" && !newName.trim()) {
        throw new Error("Enter a name for the new data collection");
      }
      if (mode === "update" && !selectedId) {
        throw new Error("Select a data collection to update");
      }

      const opts = collectionOptions();
      let response: IngestResponse;

      if (files.length > 1) {
        response = await api.uploadIngestBatch(files, opts);
      } else if (files.length === 1) {
        response = await api.uploadIngest(files[0], opts);
      } else {
        response = await api.runIngest({
          pdf_path: pdfPath.trim() || undefined,
          collection_id: mode === "update" ? selectedId : undefined,
          create_collection:
            mode === "create"
              ? {
                  name: newName.trim(),
                  description: newDescription.trim(),
                }
              : undefined,
          replace_namespace: mode === "update" ? replaceNamespace : false,
        });
      }

      setResult(response);
      await loadCollections();
      if (response.collection_id) {
        setSelectedId(response.collection_id);
        setMode("update");
        setNewName("");
        setNewDescription("");
      }

      // Point RAG session at this collection namespace when available
      if (response.collection_id && response.namespace) {
        try {
          await api.updateConfig({
            DATA_COLLECTION_ID: response.collection_id,
            PINECONE_NAMESPACE: response.namespace,
          });
        } catch {
          /* non-fatal */
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCollection(id: string) {
    if (!confirm("Delete this data collection and clear its Pinecone namespace?")) {
      return;
    }
    try {
      await api.deleteDataCollection(id, true);
      if (selectedId === id) setSelectedId("");
      await loadCollections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const perDocument: IngestDocumentResult[] =
    result?.documents && result.documents.length > 0
      ? result.documents
      : result
        ? [
            {
              pdf_path: result.pdf_path,
              pages: result.pages,
              chunks: result.chunks,
              topic_distribution: result.topic_distribution,
              document_title: result.document_title,
              domain: result.domain,
              discovery_method: result.discovery_method,
              topics: result.topics,
            },
          ]
        : [];

  return (
    <div className="mx-auto min-h-0 w-full max-w-[1280px] flex-1 overflow-y-auto px-3 pb-4 pt-2 sm:px-4">
      <PageHeader
        title="Ingest"
        description="Create or update data collections. Each collection lives in its own Pinecone namespace."
      />

      <div className="max-w-2xl space-y-5">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <span className="apple-label mb-2 block">Mode</span>
              <div className="flex rounded-[2px] bg-[#f5f5f7] p-0.5">
                {(
                  [
                    ["create", "Create collection"],
                    ["update", "Update collection"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className={`flex-1 rounded-[2px] px-3 py-1.5 text-[13px] font-medium transition-all ${
                      mode === value
                        ? "bg-white text-[#1d1d1f] shadow-sm"
                        : "text-[#86868b]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {mode === "create" ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="apple-label mb-2 block">Collection name</span>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Marketing handbook"
                    className="apple-input"
                    required
                  />
                </label>
                <label className="block">
                  <span className="apple-label mb-2 block">Description</span>
                  <input
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Optional"
                    className="apple-input"
                  />
                  <span className="mt-1.5 block text-[13px] text-[#86868b]">
                    A Pinecone namespace is generated from the name (isolated from
                    other collections).
                  </span>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block">
                  <span className="apple-label mb-2 block">Data collection</span>
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="apple-input"
                    required
                  >
                    <option value="">Select collection…</option>
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.namespace} ({c.document_count} docs)
                      </option>
                    ))}
                  </select>
                </label>
                {selected && (
                  <div className="rounded-xl bg-[#f5f5f7] px-4 py-3 text-[13px] text-[#86868b]">
                    <div className="font-medium text-[#1d1d1f]">{selected.name}</div>
                    <div className="mt-1">
                      Namespace: <code>{selected.namespace}</code>
                    </div>
                    <div className="mt-0.5">
                      {selected.document_count} docs · {selected.pages} pages ·{" "}
                      {selected.chunks} chunks
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCollection(selected.id)}
                      className="mt-2 text-[13px] text-[#ff3b30]"
                    >
                      Delete collection
                    </button>
                  </div>
                )}
                <label className="flex items-start gap-3 rounded-xl bg-[#f5f5f7] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={replaceNamespace}
                    onChange={(e) => setReplaceNamespace(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-[14px] text-[#1d1d1f]">
                    Replace collection contents
                    <span className="mt-0.5 block text-[13px] text-[#86868b]">
                      Clears this collection&apos;s namespace before ingest. Leave
                      off to add or refresh documents only.
                    </span>
                  </span>
                </label>
              </div>
            )}

            <label className="block">
              <span className="apple-label mb-2 block">Upload PDFs</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="block w-full text-[14px] text-[#1d1d1f] file:mr-3 file:rounded-[2px] file:border-0 file:bg-[#0071e3] file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-white"
              />
              {files.length > 0 && (
                <ul className="mt-2 space-y-1 text-[13px] text-[#1d1d1f]">
                  {files.map((f) => (
                    <li key={f.name} className="rounded-lg bg-[#f5f5f7] px-3 py-1.5">
                      {f.name}
                    </li>
                  ))}
                </ul>
              )}
            </label>

            <div className="relative py-1 text-center text-[12px] text-[#86868b]">
              <span className="bg-white px-2">or use a path</span>
              <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-black/[0.06]" />
            </div>

            <label className="block">
              <span className="apple-label mb-2 block">PDF path</span>
              <input
                value={pdfPath}
                onChange={(e) => setPdfPath(e.target.value)}
                placeholder="Documents/your-file.pdf"
                disabled={files.length > 0}
                className="apple-input disabled:opacity-50"
              />
            </label>

            <button
              type="submit"
              disabled={
                loading ||
                (files.length === 0 && !pdfPath.trim()) ||
                (mode === "create" && !newName.trim()) ||
                (mode === "update" && !selectedId)
              }
              className="apple-btn-primary"
            >
              {loading
                ? "Ingesting into collection…"
                : mode === "create"
                  ? "Create & ingest"
                  : "Update collection"}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-xl bg-[#ff3b30]/8 px-4 py-3 text-[14px] text-[#ff3b30]">
              {error}
            </p>
          )}
        </Card>

        {collections.length > 0 && (
          <Card>
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
              Your collections
            </h3>
            <ul className="mt-3 divide-y divide-black/[0.06]">
              {collections.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 py-3 text-[14px]"
                >
                  <div>
                    <div className="font-medium text-[#1d1d1f]">{c.name}</div>
                    <div className="text-[12px] text-[#86868b]">
                      ns:{c.namespace} · {c.document_count} docs · {c.chunks} chunks
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-[13px] font-medium text-[#0071e3]"
                    onClick={() => {
                      setMode("update");
                      setSelectedId(c.id);
                    }}
                  >
                    Update
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {result && (
          <Card>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-[2px] bg-[#34c759]/15 text-[#34c759]">
                ✓
              </span>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                Ingest complete
              </h3>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                {
                  label: "Collection",
                  value: result.collection?.name || result.collection_id || "—",
                },
                { label: "Namespace", value: result.namespace || "default" },
                { label: "Documents", value: result.document_count ?? perDocument.length },
                { label: "Title", value: result.document_title || "—" },
                { label: "Domain", value: result.domain || "—" },
                { label: "Index", value: result.index_name },
                { label: "Pages", value: result.pages },
                { label: "Chunks", value: result.chunks },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-[#f5f5f7] px-4 py-3">
                  <dt className="text-[12px] font-medium uppercase tracking-wide text-[#86868b]">
                    {label}
                  </dt>
                  <dd className="mt-0.5 break-words text-[15px] font-medium text-[#1d1d1f]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            {perDocument.length > 0 && (
              <div className="mt-6">
                <h4 className="text-[13px] font-semibold uppercase tracking-wide text-[#86868b]">
                  Per document
                </h4>
                <ul className="mt-3 divide-y divide-black/[0.06]">
                  {perDocument.map((doc) => (
                    <li key={doc.pdf_path} className="py-3 text-[14px]">
                      <div className="font-medium text-[#1d1d1f]">
                        {doc.source_name || doc.pdf_path.split("/").pop()}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[12px] text-[#86868b]">
                        <span>{doc.pages} pages</span>
                        {doc.blocks ? <span>{doc.blocks} blocks</span> : null}
                        <span>{doc.chunks} chunks</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
