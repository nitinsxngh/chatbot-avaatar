export type DatasetCategory = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  createdAt: string;
};

export const DATASET_CATEGORY_STORAGE_KEY = "rag-dataset-categories-v1";

export const SEED_DATASET_CATEGORIES: DatasetCategory[] = [
  {
    id: "cat-general",
    name: "General RAG",
    description: "Default knowledge and general Q&A corpora.",
    enabled: true,
    createdAt: "2024-05-01",
  },
  {
    id: "cat-embeddings",
    name: "Embeddings",
    description: "Vector and embedding evaluation datasets.",
    enabled: true,
    createdAt: "2024-01-20",
  },
  {
    id: "cat-legal",
    name: "Legal docs",
    description: "Contracts, policies, and legal reference material.",
    enabled: true,
    createdAt: "2025-10-15",
  },
  {
    id: "cat-medical",
    name: "Medical",
    description: "Clinical notes and medical knowledge bases.",
    enabled: false,
    createdAt: "2025-12-01",
  },
];

export function loadDatasetCategories(): DatasetCategory[] {
  if (typeof window === "undefined") return SEED_DATASET_CATEGORIES;
  try {
    const raw = window.localStorage.getItem(DATASET_CATEGORY_STORAGE_KEY);
    if (!raw) return SEED_DATASET_CATEGORIES;
    const parsed = JSON.parse(raw) as DatasetCategory[];
    if (!Array.isArray(parsed)) return SEED_DATASET_CATEGORIES;
    return parsed.map((item) => ({
      id: String(item.id || `cat-${Date.now()}`),
      name: String(item.name || "").trim(),
      description: String(item.description || "").trim(),
      enabled: Boolean(item.enabled),
      createdAt: String(item.createdAt || new Date().toISOString().slice(0, 10)),
    }));
  } catch {
    return SEED_DATASET_CATEGORIES;
  }
}

export function saveDatasetCategories(categories: DatasetCategory[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    DATASET_CATEGORY_STORAGE_KEY,
    JSON.stringify(categories),
  );
}

export function getEnabledDatasetCategoryNames(
  categories: DatasetCategory[],
): string[] {
  return categories
    .filter((c) => c.enabled && c.name.trim())
    .map((c) => c.name.trim())
    .sort((a, b) => a.localeCompare(b));
}
