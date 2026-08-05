"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ISO6391 from "iso-639-1";
import { Card } from "@/components/ui";
import { api, type CatalogLanguage } from "@/lib/api";

type LibraryLanguage = {
  code: string;
  name: string;
  nativeName: string;
};

const LIBRARY_LANGUAGES: LibraryLanguage[] = ISO6391.getLanguages(
  ISO6391.getAllCodes(),
).sort((a, b) => a.name.localeCompare(b.name));

function formatDate(value: string) {
  if (!value) return "—";
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

export default function LanguagePage() {
  const [languages, setLanguages] = useState<CatalogLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">(
    "all",
  );
  const [selectedCode, setSelectedCode] = useState("");
  const [pickerQuery, setPickerQuery] = useState("");
  const [enabledOnAdd, setEnabledOnAdd] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      setLanguages(await api.listCatalogLanguages());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load languages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const existingCodes = useMemo(
    () => new Set(languages.map((l) => l.code.toLowerCase())),
    [languages],
  );

  const availableLanguages = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return LIBRARY_LANGUAGES.filter((lang) => {
      if (existingCodes.has(lang.code.toLowerCase())) return false;
      if (!q) return true;
      return (
        lang.name.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q)
      );
    });
  }, [existingCodes, pickerQuery]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return languages.filter((l) => {
      if (statusFilter === "enabled" && !l.enabled) return false;
      if (statusFilter === "disabled" && l.enabled) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        l.native_name.toLowerCase().includes(q)
      );
    });
  }, [languages, query, statusFilter]);

  const enabledCount = languages.filter((l) => l.enabled).length;
  const selected = availableLanguages.find((l) => l.code === selectedCode);

  function resetPicker() {
    setSelectedCode("");
    setPickerQuery("");
    setEnabledOnAdd(true);
    setError("");
  }

  async function toggleEnabled(language: CatalogLanguage) {
    setSaving(true);
    setError("");
    try {
      const updated = await api.updateCatalogLanguage(language.id, {
        enabled: !language.enabled,
      });
      setLanguages((prev) =>
        prev.map((l) => (l.id === language.id ? updated : l)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update language");
    } finally {
      setSaving(false);
    }
  }

  async function removeLanguage(id: string) {
    setSaving(true);
    setError("");
    try {
      await api.deleteCatalogLanguage(id);
      setLanguages((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete language");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!selected) {
      setError("Choose a language from the list.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const created = await api.createCatalogLanguage({
        name: selected.name,
        code: selected.code,
        native_name: selected.nativeName,
        enabled: enabledOnAdd,
      });
      setLanguages((prev) => [created, ...prev]);
      resetPicker();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add language");
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
          onClick={resetPicker}
          disabled={saving}
        >
          Add language
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="!rounded-[2px] overflow-hidden !p-0">
          <div className="flex flex-col gap-3 border-b border-black/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
                Language catalog
              </h2>
              <p className="mt-0.5 text-[13px] text-[#86868b]">
                {loading
                  ? "Loading from backend…"
                  : `${filtered.length} of ${languages.length} shown · ${enabledCount} enabled`}
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
                placeholder="Search catalog…"
                className="apple-input h-9 w-full !rounded-[2px] !py-0 sm:w-[220px]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#fafafa] text-[12px] font-medium uppercase tracking-wide text-[#86868b]">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Native name</th>
                  <th className="px-5 py-3 font-medium">Created</th>
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
                      Loading languages…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-[14px] text-[#86868b]"
                    >
                      No languages yet. Seed via `/api/catalog/seed` or add one
                      on the right.
                    </td>
                  </tr>
                ) : (
                  filtered.map((language) => (
                    <tr
                      key={language.id}
                      className="border-b border-black/[0.04] transition-colors hover:bg-[#f9f9fb]"
                    >
                      <td className="px-5 py-3.5">
                        <span className="text-[14px] font-semibold text-[#1d1d1f]">
                          {language.name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-[2px] bg-[#f5f5f7] px-2 py-0.5 font-mono text-[12px] font-semibold text-[#1d1d1f]">
                          {language.code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[14px] text-[#1d1d1f]">
                        {language.native_name || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-[#1d1d1f]">
                        {formatDate(language.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Toggle
                          checked={language.enabled}
                          disabled={saving}
                          onChange={() => toggleEnabled(language)}
                          title={language.enabled ? "Disable" : "Enable"}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          className="rounded-[2px] px-3 py-1.5 text-[12px] font-medium text-[#ff3b30] transition hover:bg-[#ff3b30]/10"
                          onClick={() => removeLanguage(language.id)}
                          disabled={saving}
                        >
                          Remove
                        </button>
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
            Add language
          </h2>
          <p className="mt-1 text-[13px] text-[#86868b]">
            Pick from ISO 639-1. Saved to MongoDB and available in RAG Settings.
          </p>

          <form onSubmit={handleAdd} className="mt-5 space-y-4">
            <label className="block">
              <span className="apple-label mb-1.5 block">Search library</span>
              <input
                value={pickerQuery}
                onChange={(e) => {
                  setPickerQuery(e.target.value);
                  setSelectedCode("");
                  setError("");
                }}
                placeholder="Search by name or code…"
                className="apple-input !rounded-[2px]"
              />
            </label>

            <label className="block">
              <span className="apple-label mb-1.5 block">Language</span>
              <select
                value={selectedCode}
                onChange={(e) => {
                  setSelectedCode(e.target.value);
                  setError("");
                }}
                size={8}
                className="apple-input !h-auto !rounded-[2px] py-1"
              >
                {availableLanguages.length === 0 ? (
                  <option value="" disabled>
                    No matching languages left to add
                  </option>
                ) : (
                  availableLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.code}) — {lang.nativeName}
                    </option>
                  ))
                )}
              </select>
            </label>

            {selected ? (
              <div className="rounded-[2px] border-2 border-black/[0.08] bg-[#f5f5f7] px-3 py-3 text-[13px]">
                <p className="font-semibold text-[#1d1d1f]">{selected.name}</p>
                <p className="mt-1 text-[#86868b]">
                  Code <span className="font-mono text-[#1d1d1f]">{selected.code}</span>
                  {" · "}
                  Native {selected.nativeName}
                </p>
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-[2px] border-2 border-black/[0.08] bg-[#f5f5f7] px-3 py-3">
              <div>
                <p className="text-[14px] font-medium text-[#1d1d1f]">Enabled</p>
                <p className="text-[12px] text-[#86868b]">
                  Add as active in RAG Settings.
                </p>
              </div>
              <Toggle
                checked={enabledOnAdd}
                onChange={() => setEnabledOnAdd((v) => !v)}
              />
            </div>

            {error ? (
              <p className="text-[13px] text-[#ff3b30]">{error}</p>
            ) : null}

            <button
              type="submit"
              className="apple-btn-primary !rounded-[2px] w-full"
              disabled={!selected || saving}
            >
              {saving ? "Adding…" : "Add to catalog"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
