"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ConfigField } from "@/lib/api";

const CATEGORY_LABELS: Record<string, string> = {
  model: "Model",
  retrieval: "Retrieval",
  chat: "Chat",
  assistant: "Assistant",
  session: "Session",
  pinecone: "Pinecone",
  mongodb: "MongoDB",
  ingest: "Ingest",
  openai: "OpenAI",
  langsmith: "LangSmith",
};

export default function ConfigPanel() {
  const [categories, setCategories] = useState<Record<string, ConfigField[]>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string>("model");

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    setError("");
    try {
      const data = await api.getConfig();
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config");
    } finally {
      setLoading(false);
    }
  }

  const orderedCategories = useMemo(
    () => Object.keys(CATEGORY_LABELS).filter((key) => categories[key]),
    [categories],
  );

  function handleChange(key: string, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (Object.keys(draft).length === 0) {
      setMessage("No changes.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    const updates: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(draft)) {
      const field = Object.values(categories)
        .flat()
        .find((item) => item.key === key);
      if (!field) continue;

      if (field.type === "int") updates[key] = Number(value);
      else if (field.type === "float") updates[key] = Number(value);
      else if (field.type === "bool") updates[key] = value === "true";
      else updates[key] = value;
    }

    try {
      const result = await api.updateConfig(updates);
      setCategories(result.config.categories);
      setDraft({});
      setMessage(`Saved ${result.updated.length} setting${result.updated.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[14px] text-[#86868b]">Loading settings…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="border-b border-black/[0.06] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Settings</h2>
        <p className="text-[12px] text-[#86868b]">Configure the assistant</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {orderedCategories.map((category) => {
          const isOpen = expanded === category;
          return (
            <div key={category} className="mb-1">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? "" : category)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
              >
                {CATEGORY_LABELS[category] || category}
                <span className="text-[12px] text-[#86868b]">{isOpen ? "−" : "+"}</span>
              </button>

              {isOpen && (
                <div className="space-y-3 px-3 pb-3 pt-1">
                  {(categories[category] || []).map((field) => (
                    <label key={field.key} className="block">
                      <span className="mb-1 block text-[12px] font-medium text-[#86868b]">
                        {field.label}
                      </span>
                      {field.type === "bool" ? (
                        <select
                          value={draft[field.key] ?? String(field.value)}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          className="apple-input py-2 text-[13px]"
                        >
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      ) : (
                        <input
                          type={
                            field.secret
                              ? "password"
                              : field.type === "int" || field.type === "float"
                                ? "number"
                                : "text"
                          }
                          step={field.type === "float" ? "any" : undefined}
                          defaultValue={
                            field.secret && field.has_value
                              ? ""
                              : String(field.value ?? "")
                          }
                          placeholder={
                            field.secret && field.has_value
                              ? String(field.value)
                              : field.key
                          }
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          className="apple-input py-2 text-[13px]"
                        />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-black/[0.06] px-4 py-3">
        <button type="submit" disabled={saving} className="apple-btn-primary w-full text-[14px]">
          {saving ? "Saving…" : "Save changes"}
        </button>
        {message && <p className="mt-2 text-center text-[12px] text-[#34c759]">{message}</p>}
        {error && <p className="mt-2 text-center text-[12px] text-[#ff3b30]">{error}</p>}
      </div>
    </form>
  );
}
