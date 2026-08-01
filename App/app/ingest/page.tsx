"use client";

import { FormEvent, useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/ui";
import { api, IngestResponse } from "@/lib/api";

export default function IngestPage() {
  const [pdfPath, setPdfPath] = useState("");
  const [file, setFile] = useState<File | null>(null);
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
      const response = file
        ? await api.uploadIngest(file)
        : await api.runIngest(pdfPath || undefined);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto min-h-0 w-full max-w-[1280px] flex-1 overflow-y-auto px-3 pb-4 pt-2 sm:px-4">
      <PageHeader
        title="Ingest"
        description="Upload any PDF. Topics and assistant role are discovered automatically for that document."
      />

      <div className="max-w-2xl space-y-5">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="apple-label mb-2 block">Upload PDF</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-[14px] text-[#1d1d1f] file:mr-3 file:rounded-full file:border-0 file:bg-[#0071e3] file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-white"
              />
              <span className="mt-1.5 block text-[13px] text-[#86868b]">
                Works for any domain — legal, medical, tech, marketing, etc.
              </span>
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
                disabled={!!file}
                className="apple-input disabled:opacity-50"
              />
              <span className="mt-1.5 block text-[13px] text-[#86868b]">
                Relative to project root. Existing vectors will be replaced.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || (!file && !pdfPath.trim())}
              className="apple-btn-primary"
            >
              {loading ? "Discovering topics & ingesting…" : "Run ingest"}
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
                { label: "Title", value: result.document_title || "—" },
                { label: "Domain", value: result.domain || "—" },
                { label: "Assistant role", value: result.assistant_role || "—" },
                { label: "Discovery", value: result.discovery_method || "—" },
                { label: "PDF", value: result.pdf_path },
                { label: "Index", value: result.index_name },
                { label: "Pages", value: result.pages },
                { label: "Chunks", value: result.chunks },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-[#f5f5f7] px-4 py-3">
                  <dt className="text-[12px] font-medium uppercase tracking-wide text-[#86868b]">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-[15px] font-medium text-[#1d1d1f] break-words">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-6">
              <h4 className="text-[13px] font-semibold uppercase tracking-wide text-[#86868b]">
                Discovered topics
              </h4>
              <ul className="mt-3 divide-y divide-black/[0.06]">
                {Object.entries(result.topics || {})
                  .map(([topic, keywords]) => (
                    <li key={topic} className="py-2.5 text-[14px]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-[#1d1d1f]">{topic}</span>
                        <span className="rounded-full bg-[#f5f5f7] px-2.5 py-0.5 text-[12px] text-[#86868b]">
                          {result.topic_distribution?.[topic] ?? 0} chunks
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-[#86868b]">
                        {(keywords || []).slice(0, 6).join(", ")}
                      </p>
                    </li>
                  ))}
              </ul>
            </div>

            <div className="mt-6">
              <h4 className="text-[13px] font-semibold uppercase tracking-wide text-[#86868b]">
                Chunk topic distribution
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
