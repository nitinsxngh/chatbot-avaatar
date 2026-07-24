"use client";

import { FormEvent, useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/ui";
import { api, IngestResponse } from "@/lib/api";

export default function IngestPage() {
  const [pdfPath, setPdfPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getConfig()
      .then((config) => {
        const ingestFields = config.categories.ingest || [];
        const pdfField = ingestFields.find((f) => f.key === "PDF_PATH");
        if (pdfField && typeof pdfField.value === "string") {
          setPdfPath(pdfField.value);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await api.runIngest(pdfPath || undefined);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-4">
      <PageHeader
        title="Ingest"
        description="Load a PDF, chunk it, enrich metadata, and embed into Pinecone."
      />

      <div className="max-w-2xl space-y-5">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="apple-label mb-2 block">PDF path</span>
              <input
                value={pdfPath}
                onChange={(e) => setPdfPath(e.target.value)}
                placeholder="Documents/your-file.pdf"
                className="apple-input"
              />
              <span className="mt-1.5 block text-[13px] text-[#86868b]">
                Relative to project root. Existing vectors will be replaced.
              </span>
            </label>

            <button type="submit" disabled={loading} className="apple-btn-primary">
              {loading ? "Running…" : "Run ingest"}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-xl bg-[#ff3b30]/8 px-4 py-3 text-[14px] text-[#ff3b30]">
              {error}
            </p>
          )}
        </Card>

        {result && (
          <Card>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#34c759]/15 text-[#34c759]">
                ✓
              </span>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Ingest complete</h3>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                { label: "PDF", value: result.pdf_path },
                { label: "Index", value: result.index_name },
                { label: "Pages", value: result.pages },
                { label: "Chunks", value: result.chunks },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-[#f5f5f7] px-4 py-3">
                  <dt className="text-[12px] font-medium uppercase tracking-wide text-[#86868b]">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-[15px] font-medium text-[#1d1d1f]">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6">
              <h4 className="text-[13px] font-semibold uppercase tracking-wide text-[#86868b]">
                Topics
              </h4>
              <ul className="mt-3 divide-y divide-black/[0.06]">
                {Object.entries(result.topic_distribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([topic, count]) => (
                    <li
                      key={topic}
                      className="flex items-center justify-between py-2.5 text-[15px]"
                    >
                      <span className="text-[#1d1d1f]">{topic}</span>
                      <span className="rounded-full bg-[#f5f5f7] px-2.5 py-0.5 text-[13px] font-medium text-[#86868b]">
                        {count}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
