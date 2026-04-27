export type BibleTestament = "AT" | "NT";

const CANONICAL_BOOK_SLUGS = [
  "genesis",
  "exodo",
  "levitico",
  "numeros",
  "deuteronomio",
  "josue",
  "juizes",
  "rute",
  "1-samuel",
  "2-samuel",
  "1-reis",
  "2-reis",
  "1-cronicas",
  "2-cronicas",
  "esdras",
  "neemias",
  "ester",
  "jo",
  "salmos",
  "proverbios",
  "eclesiastes",
  "cantares",
  "isaias",
  "jeremias",
  "lamentacoes",
  "ezequiel",
  "daniel",
  "oseias",
  "joel",
  "amos",
  "obadias",
  "jonas",
  "miqueias",
  "naum",
  "habacuque",
  "sofonias",
  "ageu",
  "zacarias",
  "malaquias",
  "mateus",
  "marcos",
  "lucas",
  "joao",
  "atos",
  "romanos",
  "1-corintios",
  "2-corintios",
  "galatas",
  "efesios",
  "filipenses",
  "colossenses",
  "1-tessalonicenses",
  "2-tessalonicenses",
  "1-timoteo",
  "2-timoteo",
  "tito",
  "filemom",
  "hebreus",
  "tiago",
  "1-pedro",
  "2-pedro",
  "1-joao",
  "2-joao",
  "3-joao",
  "judas",
  "apocalipse",
] as const;

const CANONICAL_BOOK_ALIASES: Record<string, string> = {
  canticos: "cantares",
  "cantares-de-salomao": "cantares",
  "lamentacoes-de-jeremias": "lamentacoes",
};

export function normalizeBibleText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getBibleBookSlug(book: string) {
  return normalizeBibleText(book);
}

export function getCanonicalBibleBookSlug(book: string) {
  const slug = getBibleBookSlug(book);
  return CANONICAL_BOOK_ALIASES[slug] ?? slug;
}

export function getBibleBookOrder(book: string) {
  const slug = getCanonicalBibleBookSlug(book);
  const index = CANONICAL_BOOK_SLUGS.indexOf(
    slug as (typeof CANONICAL_BOOK_SLUGS)[number]
  );

  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function getBibleBookTestament(book: string): BibleTestament {
  return getBibleBookOrder(book) <= 38 ? "AT" : "NT";
}
