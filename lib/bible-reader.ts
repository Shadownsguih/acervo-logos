export type BibleVirtualCategory = {
  id: "virtual-biblia";
  name: "Bíblia";
  slug: "biblia";
};

export const BIBLE_VIRTUAL_CATEGORY: BibleVirtualCategory = {
  id: "virtual-biblia",
  name: "Bíblia",
  slug: "biblia",
};

function normalizeBibleCategoryText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isBibleReaderCategory(category: {
  name: string;
  slug: string | null;
  id: string;
}) {
  const candidates = [category.name, category.slug ?? "", category.id]
    .map((value) => normalizeBibleCategoryText(value))
    .filter(Boolean);

  return candidates.includes("biblia");
}

export function isBibleReaderRoute(value: string) {
  return normalizeBibleCategoryText(value) === "biblia";
}
