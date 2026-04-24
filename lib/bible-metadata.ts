import metadata from "@/data/generated/bible-metadata.json";

export type BibleMetadataVersion = {
  id: string;
  label: string;
  value: string;
  availability: "ready";
};

export type BibleMetadataBook = {
  id: string;
  label: string;
  abbrev: string | null;
  chapters: number;
  testament: "AT" | "NT";
};

type BibleMetadataShape = {
  versions: BibleMetadataVersion[];
  booksByVersion: Record<string, BibleMetadataBook[]>;
};

const bibleMetadata = metadata as BibleMetadataShape;

export function getBibleVersionsMetadata() {
  return bibleMetadata.versions;
}

export function getBibleBooksMetadata(version: string) {
  return bibleMetadata.booksByVersion[version.toUpperCase()] ?? [];
}

export function getBibleBookMetadataBySlug(version: string, bookSlug: string) {
  return getBibleBooksMetadata(version).find((book) => book.id === bookSlug) ?? null;
}
