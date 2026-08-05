"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  api,
  CatalogLanguage,
  CatalogModel,
  ConfigField,
} from "@/lib/api";

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

const FALLBACK_CHAT_MODELS = ["gpt-4o-mini"];

const FALLBACK_EMBEDDING_MODELS = ["text-embedding-3-small"];

const FALLBACK_LANGUAGES: CatalogLanguage[] = [
  {
    id: "fallback-en",
    name: "English",
    code: "en",
    native_name: "English",
    enabled: true,
    created_at: "",
    updated_at: "",
  },
];

const MODEL_SELECT_KEYS = new Set(["MODEL_NAME", "EMBEDDING_MODEL"]);

type ConfigPanelProps = {
  /** When set, load/save config for this session in MongoDB */
  sessionName?: string;
};

function optionsForField(
  key: string,
  currentValue: string,
  catalogModels: CatalogModel[],
): string[] {
  const enabled = catalogModels.filter((m) => m.enabled);
  const fromCatalog =
    key === "EMBEDDING_MODEL"
      ? enabled.filter((m) => m.kind === "embedding").map((m) => m.name)
      : enabled.filter((m) => m.kind === "model").map((m) => m.name);

  const fallback =
    key === "EMBEDDING_MODEL" ? FALLBACK_EMBEDDING_MODELS : FALLBACK_CHAT_MODELS;

  const merged = [...fromCatalog, ...fallback];
  if (currentValue && !merged.includes(currentValue)) {
    merged.unshift(currentValue);
  }

  return Array.from(new Set(merged));
}

function languageOptions(
  currentCode: string,
  catalogLanguages: CatalogLanguage[],
): CatalogLanguage[] {
  const enabled = catalogLanguages.filter((l) => l.enabled);
  const base = enabled.length > 0 ? enabled : FALLBACK_LANGUAGES;
  const byCode = new Map(base.map((l) => [l.code.toLowerCase(), l]));
  if (currentCode && !byCode.has(currentCode.toLowerCase())) {
    byCode.set(currentCode.toLowerCase(), {
      id: `current-${currentCode}`,
      name: currentCode,
      code: currentCode,
      native_name: currentCode,
      enabled: true,
      created_at: "",
      updated_at: "",
    });
  }
  return Array.from(byCode.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export default function ConfigPanel({ sessionName }: ConfigPanelProps) {
  const [categories, setCategories] = useState<Record<string, ConfigField[]>>({});
  const [catalogModels, setCatalogModels] = useState<CatalogModel[]>([]);
  const [catalogLanguages, setCatalogLanguages] = useState<CatalogLanguage[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string>("model");
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    loadConfig();
  }, [sessionName]);

  async function loadConfig() {
    setLoading(true);
    setError("");
    try {
      const [data, models, languages] = await Promise.all([
        api.getConfig(sessionName),
        api.listCatalogModels().catch(() => [] as CatalogModel[]),
        api.listCatalogLanguages().catch(() => [] as CatalogLanguage[]),
      ]);
      setCategories(data.categories);
      setCatalogModels(models);
      setCatalogLanguages(languages);
      setDraft({});
      setFormKey((k) => k + 1);
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
    const field = Object.values(categories)
      .flat()
      .find((item) => item.key === key);
    if (field && field.editable === false) return;
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
      if (!field || field.editable === false) continue;

      if (field.type === "int") updates[key] = Number(value);
      else if (field.type === "float") updates[key] = Number(value);
      else if (field.type === "bool") updates[key] = value === "true";
      else updates[key] = value;
    }

    if (Object.keys(updates).length === 0) {
      setSaving(false);
      setMessage("No editable changes.");
      return;
    }

    try {
      const result = await api.updateConfig(updates, sessionName);
      setCategories(result.config.categories);
      setDraft({});
      setFormKey((k) => k + 1);
      setMessage(
        `Saved ${result.updated.length} setting${result.updated.length === 1 ? "" : "s"}${
          sessionName ? ` for “${sessionName}”` : ""
        }.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetAll() {
    const ok = window.confirm(
      sessionName
        ? `Reset editable session settings for “${sessionName}” to defaults?\n\nGlobal settings (API keys, MongoDB, ingest) are unchanged.`
        : "Reset all settings to defaults?\n\nAPI keys (OpenAI, Pinecone, LangSmith) will be kept.",
    );
    if (!ok) return;

    setResetting(true);
    setMessage("");
    setError("");

    try {
      const result = await api.resetConfig({ sessionName });
      setCategories(result.config.categories);
      setDraft({});
      setFormKey((k) => k + 1);
      setMessage(
        `Reset ${result.updated.length} setting${result.updated.length === 1 ? "" : "s"} to defaults.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset");
    } finally {
      setResetting(false);
    }
  }

  async function handleResetCategory(category: string) {
    const fields = (categories[category] || []).filter(
      (f) => !f.secret && f.editable !== false,
    );
    if (fields.length === 0) {
      setMessage("Nothing editable to reset in this section.");
      return;
    }

    const label = CATEGORY_LABELS[category] || category;
    const ok = window.confirm(`Reset “${label}” editable settings to defaults?`);
    if (!ok) return;

    setResetting(true);
    setMessage("");
    setError("");

    try {
      const result = await api.resetConfig({
        keys: fields.map((f) => f.key),
        sessionName,
      });
      setCategories(result.config.categories);
      setDraft({});
      setFormKey((k) => k + 1);
      setMessage(`Reset ${label} to defaults.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset");
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[14px] text-[#86868b]">Loading settings…</p>
      </div>
    );
  }

  const busy = saving || resetting;

  return (
    <form key={formKey} onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="border-b border-black/[0.06] px-4 py-2">
        <h2 className="text-[14px] font-semibold text-[#1d1d1f]">Settings</h2>
        <p className="text-[11px] text-[#86868b]">
          {sessionName
            ? `Session “${sessionName}” · grey fields are global (read-only)`
            : "Configure the assistant"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {orderedCategories.map((category) => {
          const isOpen = expanded === category;
          const editableInCategory = (categories[category] || []).some(
            (f) => f.editable !== false && !f.secret,
          );
          return (
            <div key={category} className="mb-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? "" : category)}
                  className="flex min-w-0 flex-1 items-center justify-between rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
                >
                  {CATEGORY_LABELS[category] || category}
                  <span className="text-[12px] text-[#86868b]">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && editableInCategory && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleResetCategory(category)}
                    className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] disabled:opacity-40"
                    title="Reset editable fields in this section"
                  >
                    Reset
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="space-y-3 px-3 pb-3 pt-1">
                  {(categories[category] || []).map((field) => {
                    const editable = field.editable !== false;
                    return (
                      <label
                        key={field.key}
                        className={`block ${editable ? "" : "opacity-70"}`}
                      >
                        <span className="mb-1 flex items-center justify-between gap-2 text-[12px] font-medium text-[#86868b]">
                          <span>
                            {field.label}
                            {!editable && (
                              <span className="ml-1 font-normal text-[#86868b]/60">
                                (global)
                              </span>
                            )}
                          </span>
                          {editable &&
                            field.default !== undefined &&
                            !field.secret &&
                            String(field.value) !== String(field.default) && (
                              <span className="font-normal text-[#86868b]/70">
                                default: {String(field.default)}
                              </span>
                            )}
                        </span>
                        {field.type === "bool" ? (
                          <select
                            value={draft[field.key] ?? String(field.value)}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            disabled={!editable || busy}
                            className="apple-input py-2 text-[13px] disabled:cursor-not-allowed disabled:bg-[#f5f5f7]"
                          >
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                        ) : MODEL_SELECT_KEYS.has(field.key) ? (
                          <select
                            value={
                              draft[field.key] ?? String(field.value ?? "")
                            }
                            onChange={(e) =>
                              handleChange(field.key, e.target.value)
                            }
                            disabled={!editable || busy}
                            className="apple-input py-2 text-[13px] disabled:cursor-not-allowed disabled:bg-[#f5f5f7]"
                          >
                            {optionsForField(
                              field.key,
                              String(
                                draft[field.key] ?? field.value ?? "",
                              ),
                              catalogModels,
                            ).map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        ) : field.key === "LANGUAGE" ? (
                          <select
                            value={
                              draft[field.key] ?? String(field.value ?? "en")
                            }
                            onChange={(e) =>
                              handleChange(field.key, e.target.value)
                            }
                            disabled={!editable || busy}
                            className="apple-input py-2 text-[13px] disabled:cursor-not-allowed disabled:bg-[#f5f5f7]"
                          >
                            {languageOptions(
                              String(draft[field.key] ?? field.value ?? "en"),
                              catalogLanguages,
                            ).map((lang) => (
                              <option key={lang.code} value={lang.code}>
                                {lang.name} ({lang.code})
                                {lang.native_name &&
                                lang.native_name !== lang.name
                                  ? ` — ${lang.native_name}`
                                  : ""}
                              </option>
                            ))}
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
                            readOnly={!editable}
                            disabled={!editable || busy}
                            defaultValue={
                              field.secret && field.has_value
                                ? ""
                                : String(field.value ?? "")
                            }
                            placeholder={
                              field.secret && field.has_value
                                ? String(field.value)
                                : field.default !== undefined
                                  ? String(field.default)
                                  : field.key
                            }
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            className="apple-input py-2 text-[13px] disabled:cursor-not-allowed disabled:bg-[#f5f5f7]"
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2 border-t border-black/[0.06] px-4 py-3">
        <button type="submit" disabled={busy} className="apple-btn-primary w-full text-[14px]">
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleResetAll}
          className="apple-btn-secondary w-full text-[13px]"
        >
          {resetting ? "Resetting…" : "Reset to defaults"}
        </button>
        {message && <p className="text-center text-[12px] text-[#34c759]">{message}</p>}
        {error && <p className="text-center text-[12px] text-[#ff3b30]">{error}</p>}
      </div>
    </form>
  );
}
