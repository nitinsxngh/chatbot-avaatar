"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import {
  api,
  type CatalogModel,
  type DatasetCategory,
} from "@/lib/api";

type ModelKind = "model" | "embedding";

const KIND_LABEL: Record<ModelKind, string> = {
  model: "Model",
  embedding: "Embedding",
};

const EMPTY_FORM = {
  name: "",
  datasetCategory: "",
  kind: "model" as ModelKind,
  launchDate: "",
  enabled: true,
};

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Toggle({
  checked,
  onChange,
  title,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-[#34c759]" : "bg-[#d2d2d7]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

export default function RagModelPage() {
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [categories, setCategories] = useState<DatasetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | ModelKind>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [modelRows, categoryRows] = await Promise.all([
        api.listCatalogModels(),
        api.listDatasetCategories(),
      ]);
      setModels(modelRows);
      setCategories(categoryRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((c) => c.enabled)
        .map((c) => c.name)
        .sort((a, b) => a.localeCompare(b)),
    [categories],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((m) => {
      if (kindFilter !== "all" && m.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.dataset_category.toLowerCase().includes(q) ||
        KIND_LABEL[m.kind].toLowerCase().includes(q)
      );
    });
  }, [models, query, kindFilter]);

  const isEditing = editingId !== null;

  const datasetSelectOptions = useMemo(() => {
    const options = [...categoryOptions];
    if (form.datasetCategory && !options.includes(form.datasetCategory)) {
      options.unshift(form.datasetCategory);
    }
    return options;
  }, [categoryOptions, form.datasetCategory]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  function openEdit(model: CatalogModel) {
    setEditingId(model.id);
    setForm({
      name: model.name,
      datasetCategory: model.dataset_category,
      kind: model.kind,
      launchDate: model.launch_date,
      enabled: model.enabled,
    });
    setError("");
  }

  async function toggleEnabled(model: CatalogModel) {
    setSaving(true);
    setError("");
    try {
      const updated = await api.updateCatalogModel(model.id, {
        enabled: !model.enabled,
      });
      setModels((prev) => prev.map((m) => (m.id === model.id ? updated : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update model");
    } finally {
      setSaving(false);
    }
  }

  async function removeModel(id: string) {
    setSaving(true);
    setError("");
    try {
      await api.deleteCatalogModel(id);
      setModels((prev) => prev.filter((m) => m.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete model");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const datasetCategory = form.datasetCategory.trim();
    const launchDate = form.launchDate.trim();

    if (!name || !datasetCategory || !launchDate) {
      setError("Fill in model name, dataset category, and launch date.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editingId) {
        const updated = await api.updateCatalogModel(editingId, {
          name,
          dataset_category: datasetCategory,
          kind: form.kind,
          launch_date: launchDate,
          enabled: form.enabled,
        });
        setModels((prev) =>
          prev.map((m) => (m.id === editingId ? updated : m)),
        );
      } else {
        const created = await api.createCatalogModel({
          name,
          dataset_category: datasetCategory,
          kind: form.kind,
          launch_date: launchDate,
          enabled: form.enabled,
        });
        setModels((prev) => [created, ...prev]);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save model");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto min-h-0 w-full max-w-[1280px] flex-1 overflow-y-auto px-3 pb-6 pt-2 sm:px-4">
      <div className="mb-4 flex justify-end gap-2">
        <button
          type="button"
          className="apple-btn-secondary !rounded-[2px]"
          disabled={loading || saving}
          onClick={() => loadData()}
        >
          Refresh
        </button>
        <button
          type="button"
          className="apple-btn-primary"
          onClick={openCreate}
          disabled={saving}
        >
          Add model
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="!rounded-[2px] overflow-hidden !p-0">
          <div className="flex flex-col gap-3 border-b border-black/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
                Model catalog
              </h2>
              <p className="mt-0.5 text-[13px] text-[#86868b]">
                {loading
                  ? "Loading from backend…"
                  : `${filtered.length} of ${models.length} shown`}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
              <div
                className="inline-flex h-9 shrink-0 items-center gap-0.5 self-start rounded-[2px] border-2 border-black/[0.08] bg-[#f5f5f7] p-0.5 sm:self-auto"
                role="group"
                aria-label="Filter by type"
              >
                {(
                  [
                    ["all", "All"],
                    ["model", "Model"],
                    ["embedding", "Embedding"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setKindFilter(value)}
                    className={`h-full rounded-[2px] px-3 text-[12px] font-semibold transition ${
                      kindFilter === value
                        ? "bg-white text-[#0071e3] shadow-sm"
                        : "text-[#86868b] hover:text-[#1d1d1f]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, dataset category…"
                className="apple-input h-9 w-full !rounded-[2px] !py-0 sm:w-[220px]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#fafafa] text-[12px] font-medium uppercase tracking-wide text-[#86868b]">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Dataset category</th>
                  <th className="px-5 py-3 font-medium">Launch date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-[14px] text-[#86868b]"
                    >
                      Loading models…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-[14px] text-[#86868b]"
                    >
                      No models found. Seed via `/api/catalog/seed` or add one
                      on the right.
                    </td>
                  </tr>
                ) : (
                  filtered.map((model) => (
                    <tr
                      key={model.id}
                      className={`border-b border-black/[0.04] transition-colors hover:bg-[#f9f9fb] ${
                        editingId === model.id ? "bg-[#f0f7ff]" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <span className="text-[14px] font-semibold text-[#1d1d1f]">
                          {model.name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-[2px] px-2 py-0.5 text-[11px] font-semibold ${
                            model.kind === "embedding"
                              ? "bg-[#af52de]/12 text-[#af52de]"
                              : "bg-[#0071e3]/12 text-[#0071e3]"
                          }`}
                        >
                          {KIND_LABEL[model.kind]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[14px] text-[#1d1d1f]">
                        {model.dataset_category}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-[#1d1d1f]">
                        {formatDate(model.launch_date)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Toggle
                          checked={model.enabled}
                          disabled={saving}
                          onChange={() => toggleEnabled(model)}
                          title={model.enabled ? "Disable" : "Enable"}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="apple-btn-secondary !rounded-[2px] !px-3 !py-1.5 !text-[12px]"
                            onClick={() => openEdit(model)}
                            disabled={saving}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-[2px] px-3 py-1.5 text-[12px] font-medium text-[#ff3b30] transition hover:bg-[#ff3b30]/10"
                            onClick={() => removeModel(model.id)}
                            disabled={saving}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="!rounded-[2px] h-fit self-start">
          <h2 className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
            {isEditing ? "Edit model" : "New model"}
          </h2>
          <p className="mt-1 text-[13px] text-[#86868b]">
            Saved to MongoDB catalog.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <span className="apple-label mb-1.5 block">Type</span>
              <div
                className="inline-flex w-full gap-0.5 rounded-[2px] border-2 border-black/[0.08] bg-[#f5f5f7] p-0.5"
                role="group"
                aria-label="Model type"
              >
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, kind: "model" }))}
                  className={`flex-1 rounded-[2px] px-3 py-2 text-[12px] font-semibold transition ${
                    form.kind === "model"
                      ? "bg-white text-[#0071e3] shadow-sm"
                      : "text-[#86868b] hover:text-[#1d1d1f]"
                  }`}
                >
                  Model
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, kind: "embedding" }))}
                  className={`flex-1 rounded-[2px] px-3 py-2 text-[12px] font-semibold transition ${
                    form.kind === "embedding"
                      ? "bg-white text-[#af52de] shadow-sm"
                      : "text-[#86868b] hover:text-[#1d1d1f]"
                  }`}
                >
                  Embedding model
                </button>
              </div>
            </div>

            <label className="block">
              <span className="apple-label mb-1.5 block">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={
                  form.kind === "embedding"
                    ? "e.g. text-embedding-3-small"
                    : "e.g. gpt-4o-mini"
                }
                className="apple-input !rounded-[2px]"
              />
            </label>

            <label className="block">
              <span className="apple-label mb-1.5 block">Dataset category</span>
              <select
                value={form.datasetCategory}
                onChange={(e) =>
                  setForm((f) => ({ ...f, datasetCategory: e.target.value }))
                }
                className="apple-input !rounded-[2px]"
              >
                <option value="">Select a category</option>
                {datasetSelectOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <span className="mt-1.5 block text-[12px] text-[#86868b]">
                Manage categories in{" "}
                <Link
                  href="/rag/dataset-category"
                  className="font-medium text-[#0071e3] hover:underline"
                >
                  Categories
                </Link>
                .
              </span>
            </label>

            <label className="block">
              <span className="apple-label mb-1.5 block">Launch date</span>
              <input
                type="date"
                value={form.launchDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, launchDate: e.target.value }))
                }
                className="apple-input !rounded-[2px]"
              />
            </label>

            <div className="flex items-center justify-between rounded-[2px] border-2 border-black/[0.08] bg-[#f5f5f7] px-3 py-3">
              <div>
                <p className="text-[14px] font-medium text-[#1d1d1f]">Enabled</p>
                <p className="text-[12px] text-[#86868b]">
                  Turn off to keep it in the catalog but inactive.
                </p>
              </div>
              <Toggle
                checked={form.enabled}
                onChange={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
              />
            </div>

            {error ? (
              <p className="text-[13px] text-[#ff3b30]">{error}</p>
            ) : null}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="apple-btn-primary !rounded-[2px] flex-1"
                disabled={saving}
              >
                {saving ? "Saving…" : isEditing ? "Save changes" : "Create"}
              </button>
              {isEditing ? (
                <button
                  type="button"
                  className="apple-btn-secondary !rounded-[2px]"
                  onClick={openCreate}
                  disabled={saving}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
