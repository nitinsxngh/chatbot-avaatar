export type AppLanguage = {
  id: string;
  name: string;
  code: string;
  nativeName: string;
  enabled: boolean;
  createdAt: string;
};

export const LANGUAGE_STORAGE_KEY = "rag-languages-v1";

export const SEED_LANGUAGES: AppLanguage[] = [
  {
    id: "lang-en",
    name: "English",
    code: "en",
    nativeName: "English",
    enabled: true,
    createdAt: "2024-01-01",
  },
  {
    id: "lang-hi",
    name: "Hindi",
    code: "hi",
    nativeName: "हिन्दी",
    enabled: true,
    createdAt: "2024-01-01",
  },
];

export function loadLanguages(): AppLanguage[] {
  if (typeof window === "undefined") return SEED_LANGUAGES;
  try {
    const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!raw) return SEED_LANGUAGES;
    const parsed = JSON.parse(raw) as AppLanguage[];
    if (!Array.isArray(parsed)) return SEED_LANGUAGES;
    return parsed.map((item) => ({
      id: String(item.id || `lang-${Date.now()}`),
      name: String(item.name || "").trim(),
      code: String(item.code || "").trim().toLowerCase(),
      nativeName: String(item.nativeName || "").trim(),
      enabled: Boolean(item.enabled),
      createdAt: String(item.createdAt || new Date().toISOString().slice(0, 10)),
    }));
  } catch {
    return SEED_LANGUAGES;
  }
}

export function saveLanguages(languages: AppLanguage[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(languages));
}

export function getEnabledLanguages(languages: AppLanguage[]): AppLanguage[] {
  return languages
    .filter((l) => l.enabled && l.name.trim() && l.code.trim())
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}
