"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { api, type DatasetCategory, type PublishedConfig } from "@/lib/api";

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PublishedConfigsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<PublishedConfig[]>([]);
  const [categories, setCategories] = useState<DatasetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [applySession, setApplySession] = useState("default");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [rows, cats] = await Promise.all([
        api.listPublishedConfigs(),
        api.listDatasetCategories().catch(() => [] as DatasetCategory[]),
      ]);
      setConfigs(rows);
      setCategories(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load published configs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return configs.filter((c) => {
      if (categoryFilter !== "all" && c.dataset_category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.dataset_category.toLowerCase().includes(q)
      );
    });
  }, [configs, query, categoryFilter]);

  const selected = configs.find((c) => c.id === selectedId) || null;

  const categoryOptions = useMemo(() => {
    const names = new Set<string>();
    categories.forEach((c) => names.add(c.name));
    configs.forEach((c) => names.add(c.dataset_category));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [categories, configs]);

  async function handleApply(config: PublishedConfig) {
    const session = applySession.trim() || "default";
    setBusyId(config.id);
    setError("");
    setMessage("");
    try {
      const result = await api.updateConfig(config.settings, session);
      setMessage(
        `Applied “${config.name}” to session “${session}” (${result.updated.length} settings).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply config");
    } finally {
      setBusyId(null);
    }
  }

  async function handleTestOnRag(config: PublishedConfig) {
    setBusyId(config.id);
    setError("");
    setMessage("");
    try {
      // Apply into the session used on the RAG page (default or chosen)
      const session = applySession.trim() || "default";
      await api.updateConfig(config.settings, session);
      const params = new URLSearchParams({
        session,
        config: config.id,
      });
      router.push(`/rag?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open RAG test");
      setBusyId(null);
    }
  }

  async function handleToggleEnabled(config: PublishedConfig) {
    setBusyId(config.id);
    setError("");
    try {
      const updated = await api.updatePublishedConfig(config.id, {
        enabled: !config.enabled,
      });
      setConfigs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(config: PublishedConfig) {
    if (!confirm(`Delete published config “${config.name}”?`)) return;
    setBusyId(config.id);
    setError("");
    try {
      await api.deletePublishedConfig(config.id);
      setConfigs((prev) => prev.filter((c) => c.id !== config.id));
      if (selectedId === config.id) setSelectedId(null);
      setMessage(`Deleted “${config.name}”.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 flex-col overflow-hidden px-3 pb-3 pt-2 sm:px-4">
      <div className="mb-3 flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
            Published configs
          </h1>
          <p className="mt-0.5 text-[13px] text-[#86868b]">
            Click a config or Test on RAG to load it into RAG Settings and chat.
          </p>
        </div>
        <label className="block">
          <span className="apple-label mb-1 block">RAG session</span>
          <input
            value={applySession}
            onChange={(e) => setApplySession(e.target.value)}
            className="apple-input h-9 w-[160px] !py-0"
            placeholder="default"
          />
        </label>
      </div>

      {(error || message) && (
        <p
          className={`mb-2 shrink-0 text-[13px] ${
            error ? "text-[#ff3b30]" : "text-[#34c759]"
          }`}
        >
          {error || message}
        </p>
      )}

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="flex min-h-0 flex-col overflow-hidden !p-0">
          <div className="flex shrink-0 flex-col gap-2 border-b border-black/[0.06] px-4 py-3 sm:flex-row sm:items-center">
            <label className="flex min-w-0 flex-1 items-center gap-2">
              <span className="shrink-0 text-[12px] font-medium text-[#86868b]">
                Category
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="apple-input h-9 min-w-0 flex-1 !py-0"
              >
                <option value="all">All categories</option>
                {categoryOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search configs…"
              className="apple-input h-9 w-full shrink-0 !py-0 sm:w-[220px]"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-[14px] text-[#86868b]">
                Loading…
              </p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-[14px] text-[#86868b]">
                No published configs yet. Open RAG Settings and click Publish
                config.
              </p>
            ) : (
              <ul className="divide-y divide-black/[0.06]">
                {filtered.map((config) => {
                  const busy = busyId === config.id;
                  const isSelected = selectedId === config.id;
                  const settingCount = Object.keys(config.settings || {}).length;
                  return (
                    <li
                      key={config.id}
                      className={`px-4 py-3 ${
                        isSelected ? "bg-[#0071e3]/05" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedId(isSelected ? null : config.id)
                          }
                          className="min-w-0 w-full text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[15px] font-semibold text-[#1d1d1f]">
                              {config.name}
                            </span>
                            <span className="rounded-[2px] bg-[#f5f5f7] px-2 py-0.5 text-[11px] font-medium text-[#86868b]">
                              {config.dataset_category}
                            </span>
                            {!config.enabled && (
                              <span className="rounded-[2px] bg-[#ff3b30]/10 px-2 py-0.5 text-[11px] font-medium text-[#ff3b30]">
                                Disabled
                              </span>
                            )}
                          </div>
                          {config.description && (
                            <p className="mt-1 line-clamp-2 text-[13px] text-[#86868b]">
                              {config.description}
                            </p>
                          )}
                          <p className="mt-1 text-[12px] text-[#aeaeb2]">
                            {settingCount} settings ·{" "}
                            {formatDate(config.updated_at)}
                            {config.session_name
                              ? ` · from “${config.session_name}”`
                              : ""}
                          </p>
                        </button>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={busy || !config.enabled}
                            onClick={() => handleTestOnRag(config)}
                            className="apple-btn-primary !px-3 !py-1.5 !text-[12px]"
                          >
                            {busy ? "Opening…" : "Test on RAG"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              setSelectedId(isSelected ? null : config.id)
                            }
                            className="apple-btn-secondary !px-3 !py-1.5 !text-[12px]"
                          >
                            {isSelected ? "Hide" : "Preview"}
                          </button>
                          <button
                            type="button"
                            disabled={busy || !config.enabled}
                            onClick={() => handleApply(config)}
                            className="apple-btn-secondary !px-3 !py-1.5 !text-[12px]"
                          >
                            Apply only
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleToggleEnabled(config)}
                            className="apple-btn-secondary !px-3 !py-1.5 !text-[12px]"
                          >
                            {config.enabled ? "Disable" : "Enable"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDelete(config)}
                            className="rounded-[2px] px-3 py-1.5 text-[12px] font-medium text-[#ff3b30] transition hover:bg-[#ff3b30]/10"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden self-stretch">
          <h2 className="shrink-0 text-[15px] font-semibold text-[#1d1d1f]">
            Settings preview
          </h2>
          {!selected ? (
            <p className="mt-2 text-[13px] text-[#86868b]">
              Select a published config to inspect its settings.
            </p>
          ) : (
            <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
              <p className="shrink-0 text-[13px] font-medium text-[#1d1d1f]">
                {selected.name}
              </p>
              <p className="shrink-0 text-[12px] text-[#86868b]">
                {selected.dataset_category}
              </p>
              <button
                type="button"
                disabled={!selected.enabled || busyId === selected.id}
                onClick={() => handleTestOnRag(selected)}
                className="apple-btn-primary mt-3 w-full shrink-0 !text-[13px]"
              >
                Test on RAG
              </button>
              <dl className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
                {Object.entries(selected.settings || {})
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-[2px] bg-[#f5f5f7] px-3 py-2"
                    >
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-[#86868b]">
                        {key}
                      </dt>
                      <dd className="mt-0.5 break-all text-[13px] text-[#1d1d1f]">
                        {String(value)}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
