from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from pypdf import PdfReader


PDF_GLOB = "Pao diario*.pdf"
PDF_DIR = Path("public/pdfs")
NVI_PATH = Path("temp-bible-data/NVI-flat.json")
OUTPUT_PATH = Path("data/daily-bible-verse-library.json")

FULL_REF_ONLY = re.compile(r"^(?:[1-3]\s+)?[A-Za-zÀ-ÿ ]+\s+\d+:\d+(?:[-,]\d+)*$")
LETTER_REF_ONLY = re.compile(r"^[A-Za-zÀ-ÿ ]+\s+\d+:\d+(?:[-,]\d+)*$")
SHORT_REF_ONLY = re.compile(r"^v{1,2}\.\s*\d+(?:[-,]\d+)*$", re.I)
CHAPTER_REF_ONLY = re.compile(r"^\d+:\d+(?:[-,]\d+)*$")
FULL_REF_END = re.compile(r"^(.*?)\s+((?:[1-3]\s+)?[A-Za-zÀ-ÿ ]+\s+\d+:\d+(?:[-,]\d+)*)$")
SHORT_REF_END = re.compile(r"^(.*?)\s+(v{1,2}\.\s*\d+(?:[-,]\d+)*)$", re.I)
CHAPTER_REF_END = re.compile(r"^(.*?)(\d+:\d+(?:[-,]\d+)*)$")
INITIALS = re.compile(r"^[A-Z]{2,4}$")
TRAILING_REF_NUMBER = re.compile(r"^(.*?)(?:\s+)([1-3])$")
BOOK_ALIASES = {
    "salmo": "salmos",
    "canticodoscanticos": "canticos",
}
INSIGHT_REPLACEMENTS = {
    "ROM ANOS": "ROMANOS",
    "M ATEUS": "MATEUS",
    "M ATEU S": "MATEUS",
    "M ARCOS": "MARCOS",
    "LU CAS": "LUCAS",
    "JO EL": "JOEL",
    "NEEM IAS": "NEEMIAS",
    "2 SAM UEL": "2 SAMUEL",
    "SALM O": "SALMO",
    "EDW ARD NOTE": "EDWARD MOTE",
}


def canonicalize(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    stripped = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]", "", stripped.lower())


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def to_display_title(value: str) -> str:
    words = value.lower().split()
    return " ".join(word[:1].upper() + word[1:] for word in words)


def normalize_pdf_text(value: str) -> str:
    value = value.replace("\r", "\n")
    value = value.replace("\ufb01", "fi").replace("\ufb02", "fl")
    value = value.replace("\x00", "ti")
    value = value.replace("-\n", "-")
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value


def polish_insight_text(value: str) -> str:
    separator = "__DEVOCIONAL_BREAK__"
    value = value.replace("\n\n", separator)

    for source, target in INSIGHT_REPLACEMENTS.items():
        value = value.replace(source, target)

    value = value.replace("(VV.", "(vv.")
    value = value.replace("(V.", "(v.")
    value = value.replace(" VV.", " vv.")
    value = value.replace(" V.", " v.")

    value = re.sub(r"\s+([,.;:!?])", r"\1", value)
    value = re.sub(r"\(\s+", "(", value)
    value = re.sub(r"\s+\)", ")", value)
    value = re.sub(r"[ \t]+", " ", value)
    value = value.replace(". “", ". \"")
    value = value.replace("”.", "\".")
    value = value.replace("”", "\"").replace("“", "\"")
    value = value.replace("—", "—")
    value = value.replace(separator, "\n\n")
    value = value.strip()

    if "\n\n" in value:
        title, body = value.split("\n\n", 1)
        return f"{title.strip()}\n\n{body.strip()}"

    return value


def load_nvi_index() -> tuple[dict[tuple[str, int, int], str], dict[str, tuple[str, str | None]]]:
    raw = json.loads(NVI_PATH.read_text(encoding="utf-8"))
    verse_index: dict[tuple[str, int, int], str] = {}
    book_index: dict[str, tuple[str, str | None]] = {}

    for entry in raw:
        book = entry["book"]
        canonical_book = canonicalize(book)
        verse_index[(canonical_book, int(entry["chapter"]), int(entry["verse"]))] = entry["text"].strip()
        if canonical_book not in book_index:
            book_index[canonical_book] = (book, entry.get("abbrev"))

    return verse_index, book_index


def resolve_book_key(book_raw: str, book_index: dict[str, tuple[str, str | None]]) -> str:
    canonical_book = canonicalize(book_raw)
    if canonical_book in book_index:
        return canonical_book

    alias_key = BOOK_ALIASES.get(canonical_book)
    if alias_key and alias_key in book_index:
        return alias_key

    if f"{canonical_book}s" in book_index:
        return f"{canonical_book}s"

    raise ValueError(f"Livro nao encontrado na NVI local: {book_raw}")


def parse_reading_reference(reading: str) -> tuple[str, int]:
    full_match = re.match(r"(.+?)\s+(\d+):", reading)
    if full_match:
        return full_match.group(1).strip(), int(full_match.group(2))

    chapter_only_match = re.match(r"(.+?)\s+(\d+)$", reading)
    if chapter_only_match:
        return chapter_only_match.group(1).strip(), int(chapter_only_match.group(2))

    if re.search(r"[A-Za-zÀ-ÿ]", reading):
        return reading.strip(), 1

    raise ValueError(f"Nao foi possivel interpretar a leitura: {reading}")


def resolve_reference(reading: str, ref_token: str) -> tuple[str, int, str]:
    reading_book, reading_chapter = parse_reading_reference(reading)
    ref_token = normalize_spaces(ref_token).replace("Rom anos", "Romanos")

    full_match = re.match(r"(.+?)\s+(\d+):(\d+(?:[-,]\d+)*)$", ref_token)
    if full_match:
        return full_match.group(1).strip(), int(full_match.group(2)), full_match.group(3)

    chapter_match = re.match(r"(\d+):(\d+(?:[-,]\d+)*)$", ref_token)
    if chapter_match:
        return reading_book, int(chapter_match.group(1)), chapter_match.group(2)

    short_match = re.match(r"v{1,2}\.\s*(\d+(?:[-,]\d+)*)$", ref_token, re.I)
    if short_match:
        return reading_book, reading_chapter, short_match.group(1)

    raise ValueError(f"Nao foi possivel resolver a referencia: {reading} / {ref_token}")


def expand_verse_spec(verse_spec: str) -> list[int]:
    verses: list[int] = []
    for part in verse_spec.split(","):
        token = part.strip()
        if not token:
            continue
        if "-" in token:
            start_text, end_text = token.split("-", 1)
            start = int(start_text)
            end = int(end_text)
            verses.extend(range(start, end + 1))
        else:
            verses.append(int(token))
    return verses


def extract_quote_and_reference(lines: list[str], reading_idx: int) -> tuple[str, str, int]:
    quote_parts: list[str] = []

    for index in range(reading_idx + 1, len(lines)):
        line = lines[index]

        if LETTER_REF_ONLY.match(line) and quote_parts:
            trailing_number_match = TRAILING_REF_NUMBER.match(quote_parts[-1])
            if trailing_number_match:
                previous_quote = normalize_spaces(trailing_number_match.group(1))
                quote_parts[-1] = previous_quote
                if not quote_parts[-1]:
                    quote_parts.pop()
                ref_token = f"{trailing_number_match.group(2)} {line}"
                return normalize_spaces(" ".join(quote_parts)), ref_token, index + 1

        if FULL_REF_ONLY.match(line) or SHORT_REF_ONLY.match(line) or CHAPTER_REF_ONLY.match(line):
            return normalize_spaces(" ".join(quote_parts)), line, index + 1

        inline_match = SHORT_REF_END.match(line) or FULL_REF_END.match(line) or CHAPTER_REF_END.match(line)
        if inline_match:
            before = normalize_spaces(inline_match.group(1))
            if before:
                quote_parts.append(before)
            return normalize_spaces(" ".join(quote_parts)), inline_match.group(2).strip(), index + 1

        quote_parts.append(line)
        if len(quote_parts) > 6:
            break

    raise ValueError("Nao foi possivel localizar a referencia do versiculo no devocional.")


def extract_body(lines: list[str], start_index: int) -> str:
    initials_index = next((idx for idx in range(start_index, len(lines)) if INITIALS.match(lines[idx])), None)
    if initials_index is None:
        raise ValueError("Nao foi possivel localizar o marcador final do devocional.")

    body_lines = lines[start_index:initials_index]
    return normalize_spaces(" ".join(body_lines))


def build_entries() -> list[dict[str, object]]:
    verse_index, book_index = load_nvi_index()
    pdf_path = next(PDF_DIR.glob(PDF_GLOB))
    raw_text = normalize_pdf_text("\n".join((page.extract_text() or "") for page in PdfReader(str(pdf_path)).pages))

    entries: list[dict[str, object]] = []

    for day in range(1, 200):
        section_match = re.search(rf"DIA {day}\n(.*?)(?=\nDIA {day + 1}\n|\Z)", raw_text, flags=re.S)
        if not section_match:
            break

        lines = [line.strip() for line in section_match.group(1).strip().splitlines() if line.strip()]
        reading_idx = next((idx for idx, line in enumerate(lines) if line.startswith("Leitura:")), None)
        if reading_idx is None:
            raise ValueError(f"Dia {day}: nao foi possivel localizar a leitura.")

        title = to_display_title(" ".join(lines[:reading_idx]))
        reading = lines[reading_idx].replace("Leitura:", "").strip()
        quote_text, ref_token, body_start = extract_quote_and_reference(lines, reading_idx)
        book_raw, chapter, verse_spec = resolve_reference(reading, ref_token)
        canonical_book = resolve_book_key(book_raw, book_index)

        display_book, abbrev = book_index[canonical_book]
        verse_numbers = expand_verse_spec(verse_spec)
        verse_text_parts = [
            verse_index[(canonical_book, chapter, verse_number)]
            for verse_number in verse_numbers
            if (canonical_book, chapter, verse_number) in verse_index
        ]

        if not verse_text_parts:
            verse_text_parts = [quote_text]

        body = extract_body(lines, body_start)
        insight = polish_insight_text(f"{title}\n\n{body}")

        entries.append(
            {
                "version": "NVI",
                "theme": "devocional",
                "book": display_book,
                "abbrev": abbrev,
                "chapter": chapter,
                "verse": verse_numbers[0],
                "reference": f"{display_book} {chapter}:{verse_spec}",
                "text": " ".join(verse_text_parts),
                "insight": insight,
                "display_order": day,
                "is_active": True,
            }
        )

    return entries


def main() -> None:
    entries = build_entries()
    OUTPUT_PATH.write_text(
        json.dumps(entries, ensure_ascii=True, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Biblioteca de devocionais gerada com {len(entries)} registro(s).")


if __name__ == "__main__":
    main()
