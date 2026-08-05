"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { api, type DatasetCategory } from "@/lib/api";

const EMPTY_FORM = {
  name: "",
  description: "",
  enabled: true,
};

function formatDate(value: string) {
  if (!value) return "—";
  // created_at may be full ISO timestamp from Mongo
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
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

export default function DatasetCategoryPage() {
  const [categories, setCategories] = useState<DatasetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">(
    "all",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const rows = await api.listDatasetCategories();
      setCategories(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.filter((c) => {
      if (statusFilter === "enabled" && !c.enabled) return false;
      if (statusFilter === "disabled" && c.enabled) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    });
  }, [categories, query, statusFilter]);

  const isEditing = editingId !== null;
  const enabledCount = categories.filter((c) => c.enabled).length;

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  function openEdit(category: DatasetCategory) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description,
      enabled: category.enabled,
    });
    setError("");
  }

  async function toggleEnabled(category: DatasetCategory) {
    setSaving(true);
    setError("");
    try {
      const updated = await api.updateDatasetCategory(category.id, {
        enabled: !category.enabled,
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? updated : c)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(id: string) {
    setSaving(true);
    setError("");
    try {
      await api.deleteDatasetCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) {
      setError("Enter a dataset category name.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editingId) {
        const updated = await api.updateDatasetCategory(editingId, {
          name,
          description,
          enabled: form.enabled,
        });
        setCategories((prev) =>
          prev.map((c) => (c.id === editingId ? updated : c)),
        );
      } else {
        const created = await api.createDatasetCategory({
          name,
          description,
          enabled: form.enabled,
        });
        setCategories((prev) => [created, ...prev]);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
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
          Add category
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="!rounded-[2px] overflow-hidden !p-0">
          <div className="flex flex-col gap-3 border-b border-black/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
                Category catalog
              </h2>
              <p className="mt-0.5 text-[13px] text-[#86868b]">
                {loading
                  ? "Loading from backend…"
                  : `${filtered.length} of ${categories.length} shown · ${enabledCount} enabled`}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
              <div
                className="inline-flex h-9 shrink-0 items-center gap-0.5 self-start rounded-[2px] border-2 border-black/[0.08] bg-[#f5f5f7] p-0.5 sm:self-auto"
                role="group"
                aria-label="Filter by status"
              >
                {(
                  [
                    ["all", "All"],
                    ["enabled", "Enabled"],
                    ["disabled", "Disabled"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={`h-full rounded-[2px] px-3 text-[12px] font-semibold transition ${
                      statusFilter === value
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
                placeholder="Search categories…"
                className="apple-input h-9 w-full !rounded-[2px] !py-0 sm:w-[220px]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#fafafa] text-[12px] font-medium uppercase tracking-wide text-[#86868b]">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-[14px] text-[#86868b]"
                    >
                      Loading categories…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-[14px] text-[#86868b]"
                    >
                      No categories found. Seed via `/api/catalog/seed` or add
                      one on the right.
                    </td>
                  </tr>
                ) : (
                  filtered.map((category) => (
                    <tr
                      key={category.id}
                      className={`border-b border-black/[0.04] transition-colors hover:bg-[#f9f9fb] ${
                        editingId === category.id ? "bg-[#f0f7ff]" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <span className="text-[14px] font-semibold text-[#1d1d1f]">
                          {category.name}
                        </span>
                      </td>
                      <td className="max-w-[280px] px-5 py-3.5 text-[13px] text-[#86868b]">
                        {category.description || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-[#1d1d1f]">
                        {formatDate(category.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Toggle
                          checked={category.enabled}
                          disabled={saving}
                          onChange={() => toggleEnabled(category)}
                          title={category.enabled ? "Disable" : "Enable"}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="apple-btn-secondary !rounded-[2px] !px-3 !py-1.5 !text-[12px]"
                            onClick={() => openEdit(category)}
                            disabled={saving}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-[2px] px-3 py-1.5 text-[12px] font-medium text-[#ff3b30] transition hover:bg-[#ff3b30]/10"
                            onClick={() => removeCategory(category.id)}
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
            {isEditing ? "Edit category" : "New category"}
          </h2>
          <p className="mt-1 text-[13px] text-[#86868b]">
            Saved to MongoDB catalog.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block">
              <span className="apple-label mb-1.5 block">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Legal"
                className="apple-input !rounded-[2px]"
              />
            </label>

            <label className="block">
              <span className="apple-label mb-1.5 block">Description</span>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="What datasets belong here?"
                rows={3}
                className="apple-input !rounded-[2px] resize-y"
              />
            </label>

            <div className="flex items-center justify-between rounded-[2px] border-2 border-black/[0.08] bg-[#f5f5f7] px-3 py-3">
              <div>
                <p className="text-[14px] font-medium text-[#1d1d1f]">Enabled</p>
                <p className="text-[12px] text-[#86868b]">
                  Only enabled categories can be assigned to models.
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
                {saving
                  ? "Saving…"
                  : isEditing
                    ? "Save changes"
                    : "Create category"}
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
