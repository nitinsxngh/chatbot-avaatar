"use client";

import { ChatResponse } from "@/lib/api";

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-[12px] text-[#86868b]">{label}</dt>
      <dd className="text-right text-[12px] font-medium text-[#1d1d1f]">{value ?? "—"}</dd>
    </div>
  );
}

export default function ResponsePanel({ meta }: { meta: ChatResponse | null }) {
  if (!meta) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-black/[0.06] px-4 py-3">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Response</h2>
          <p className="text-[12px] text-[#86868b]">Pipeline debug output</p>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="text-[13px] text-[#86868b]">
            Send a message to see intent, retrieval, confidence, and chunk details.
          </p>
        </div>
      </div>
    );
  }

  const trace = meta.trace;
  const summary = trace?.summary;
  const thresholds = trace?.thresholds;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-black/[0.06] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Response</h2>
        <p className="text-[12px] text-[#86868b]">Terminal-equivalent debug output</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Intent detail */}
        {trace?.intent_detail && (
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
              Intent detail
            </h3>
            <p className="rounded-xl bg-[#f5f5f7] px-3 py-2 text-[12px] text-[#1d1d1f]">
              {typeof trace.intent_detail === "string"
                ? trace.intent_detail
                : `raw=${trace.intent_detail.raw} → fallback=${trace.intent_detail.fallback}`}
            </p>
          </section>
        )}

        {/* Summary */}
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
            Summary
          </h3>
          <dl className="rounded-xl bg-[#f5f5f7] px-3 py-1">
            <Row label="Intent" value={meta.intent} />
            <Row label="Route" value={meta.route} />
            <Row label="Band" value={meta.band} />
            <Row label="Latency" value={meta.latency_ms != null ? `${meta.latency_ms} ms` : null} />
            <Row label="Confidence" value={meta.confidence_score?.toFixed(3)} />
            <Row label="Flashrank" value={meta.flashrank_score?.toFixed(3)} />
            <Row label="Pinecone" value={meta.pinecone_score?.toFixed(3)} />
            <Row label="Search query" value={meta.search_query} />
            {meta.security_blocked && (
              <Row label="Security" value="blocked" />
            )}
          </dl>
        </section>

        {/* Thresholds */}
        {thresholds && (
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
              Thresholds
            </h3>
            <dl className="rounded-xl bg-[#f5f5f7] px-3 py-1">
              <Row label="Flashrank high ≥" value={thresholds.flashrank_high} />
              <Row label="Flashrank mid ≥" value={thresholds.flashrank_mid} />
              <Row label="Flashrank unreliable <" value={thresholds.flashrank_unreliable_below} />
              <Row label="Pinecone high ≥" value={thresholds.pinecone_high} />
              <Row label="Pinecone mid ≥" value={thresholds.pinecone_mid} />
              <Row label="Retrieve K" value={thresholds.retrieve_k} />
              <Row label="Rerank top N" value={thresholds.rerank_top_n} />
            </dl>
          </section>
        )}

        {/* Retrieval attempts */}
        {trace?.retrieval_attempts && trace.retrieval_attempts.length > 0 && (
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
              Retrieval
            </h3>
            <div className="space-y-3">
              {trace.retrieval_attempts.map((attempt) => (
                <div key={attempt.attempt} className="rounded-xl bg-[#f5f5f7] p-3">
                  <p className="text-[12px] font-semibold text-[#1d1d1f]">
                    Attempt {attempt.attempt}
                  </p>
                  <p className="mt-1 text-[11px] text-[#86868b] break-words">{attempt.query}</p>
                  <dl className="mt-2">
                    <Row label="Filter" value={attempt.metadata_filter} />
                    <Row label="Filter fallback" value={attempt.filter_fallback ? "yes" : "no"} />
                    <Row label="Flashrank" value={attempt.flashrank_score} />
                    <Row label="Pinecone" value={attempt.pinecone_score} />
                    <Row label="Confidence" value={attempt.confidence_score} />
                    <Row label="Band" value={attempt.band} />
                  </dl>
                  {attempt.chunks.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {attempt.chunks.map((chunk) => (
                        <div
                          key={chunk.rank}
                          className="rounded-lg bg-white px-2.5 py-2 text-[11px]"
                        >
                          <p className="font-medium text-[#1d1d1f]">
                            #{chunk.rank} · {chunk.score} · {chunk.page} · {chunk.topic}
                          </p>
                          <p className="mt-1 leading-relaxed text-[#86868b]">{chunk.snippet}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Retry queries */}
        {summary?.retry_queries && summary.retry_queries.length > 0 && (
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
              Retry queries
            </h3>
            <ul className="space-y-1 rounded-xl bg-[#f5f5f7] p-3">
              {summary.retry_queries.map((q, i) => (
                <li key={i} className="text-[11px] text-[#1d1d1f] break-words">
                  {q}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Raw logs */}
        {trace?.logs && trace.logs.length > 0 && (
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
              Logs
            </h3>
            <pre className="max-h-48 overflow-y-auto rounded-xl bg-[#1d1d1f] p-3 font-mono text-[10px] leading-relaxed text-[#f5f5f7]">
              {trace.logs.join("\n")}
            </pre>
          </section>
        )}
      </div>
    </div>
  );
}
