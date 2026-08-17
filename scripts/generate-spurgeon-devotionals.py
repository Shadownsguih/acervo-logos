from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from pypdf import PdfReader


PDF_PATH = Path("public/pdfs/devocional-dia-a-dia-.pdf")
NVI_PATH = Path("temp-bible-data/NVI-flat.json")
OUTPUT_PATH = Path("data/daily-bible-verse-library.json")
SOURCE_NAME = "Spurgeon"

MONTH_ORDER = {
    "janeiro": 1,
    "fevereiro": 2,
    "marco": 3,
    "abril": 4,
    "maio": 5,
    "junho": 6,
    "julho": 7,
    "agosto": 8,
    "setembro": 9,
    "outubro": 10,
    "novembro": 11,
    "dezembro": 12,
}

MONTH_LENGTHS = {
    1: 31,
    2: 28,
    3: 31,
    4: 30,
    5: 31,
    6: 30,
    7: 31,
    8: 31,
    9: 30,
    10: 31,
    11: 30,
    12: 31,
}

DATE_PATTERN = re.compile(
    r"(?P<day>\d{1,2})\s+de\s+(?P<month>[A-Za-zÀ-ÿ]+)",
    re.I,
)

REFERENCE_PATTERN = re.compile(
    r"\((?P<book>[1-3]?\s*[A-Za-zÀ-ÿ\.]+)\s+(?P<chapter>\d+):(?P<verse>\d+(?:[-,]\d+)*)\)"
)

BOOK_ALIASES = {
    "js": "josue",
    "josue": "josue",
    "gn": "genesis",
    "genesis": "genesis",
    "cl": "colossenses",
    "col": "colossenses",
    "is": "isaias",
    "isa": "isaias",
    "fp": "filipenses",
    "filipenses": "filipenses",
    "ez": "ezequiel",
    "ezequiel": "ezequiel",
    "lc": "lucas",
    "mt": "mateus",
    "mc": "marcos",
    "jo": "joao",
    "joao": "joao",
    "ct": "canticos",
    "canticos": "canticos",
    "pv": "proverbios",
    "proverbios": "proverbios",
    "sl": "salmos",
    "salmos": "salmos",
    "rm": "romanos",
    "romanos": "romanos",
    "hb": "hebreus",
    "hebreus": "hebreus",
    "2co": "2corintios",
    "1co": "1corintios",
    "1pe": "1pedro",
    "2pe": "2pedro",
    "1tm": "1timoteo",
    "2tm": "2timoteo",
    "ap": "apocalipse",
    "jl": "joel",
    "jz": "juizes",
    "jó": "jo",
    "jó": "jo",
}

CHAR_REPLACEMENTS = str.maketrans(
    {
        "\xa0": " ",
        "ă": "ã",
        "Ă": "Ã",
        "ş": "ç",
        "Ş": "Ç",
        "ţ": "ç",
        "Ţ": "Ç",
        "ĕ": "ê",
        "Ĕ": "Ê",
        "ĭ": "í",
        "Ĭ": "Í",
        "ŏ": "ó",
        "Ŏ": "Ó",
        "ŭ": "ú",
        "Ŭ": "Ú",
    }
)


def canonicalize(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    stripped = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]", "", stripped.lower())


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_pdf_text(value: str) -> str:
    value = value.translate(CHAR_REPLACEMENTS)
    value = value.replace("\r", "\n")
    value = value.replace("\ufb01", "fi").replace("\ufb02", "fl")
    value = value.replace("-\n", "")
    value = re.sub(r"[ \t]+\n", "\n", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value


def clean_body_text(value: str) -> str:
    value = re.sub(r"\n{2,}", "\n\n", value)
    paragraphs: list[str] = []

    for block in value.split("\n\n"):
        lines = [normalize_spaces(line) for line in block.splitlines() if normalize_spaces(line)]
        if not lines:
            continue
        joined = " ".join(lines)

        if "(N.T.)" in joined:
            continue

        if joined.startswith("http"):
            continue

        if joined.lower().startswith("nota do tradutor"):
            continue

        paragraphs.append(joined)

    cleaned = "\n\n".join(paragraphs)
    cleaned = cleaned.replace(" ,", ",").replace(" .", ".")
    cleaned = cleaned.replace(" ;", ";").replace(" :", ":")
    cleaned = cleaned.replace(" !", "!").replace(" ?", "?")
    cleaned = cleaned.replace(" n Ele", " nEle")
    cleaned = cleaned.replace(" d Ele", " dEle")
    cleaned = cleaned.replace(" por que ", " porque ")
    return cleaned.strip()


def load_nvi_data() -> tuple[
    dict[tuple[str, int, int], str],
    dict[str, tuple[str, str | None]],
]:
    raw = json.loads(NVI_PATH.read_text(encoding="utf-8"))
    verse_index: dict[tuple[str, int, int], str] = {}
    book_index: dict[str, tuple[str, str | None]] = {}

    for entry in raw:
        canonical_book = canonicalize(entry["book"])
        verse_index[(canonical_book, int(entry["chapter"]), int(entry["verse"]))] = entry[
            "text"
        ].strip()

        if canonical_book not in book_index:
            book_index[canonical_book] = (entry["book"], entry.get("abbrev"))

        if entry.get("abbrev"):
            book_index[canonicalize(entry["abbrev"])] = (
                entry["book"],
                entry.get("abbrev"),
            )

    return verse_index, book_index


def verse_numbers_from_spec(spec: str) -> list[int]:
    verses: list[int] = []
    for part in spec.split(","):
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


def normalize_verse_spec(spec: str) -> str:
    compact = spec.replace(" ", "")

    if compact.isdigit() and len(compact) == 4:
        first = int(compact[:2])
        second = int(compact[2:])
        if first < second:
            return f"{first}-{second}"

    return compact


def get_day_of_year(month_number: int, day_number: int) -> int:
    total = 0
    for month in range(1, month_number):
        total += MONTH_LENGTHS[month]
    return total + day_number


def resolve_book_name(
    raw_book: str, book_index: dict[str, tuple[str, str | None]]
) -> tuple[str, str | None] | None:
    raw_lower = normalize_spaces(raw_book).lower().replace(".", "")
    raw_compact = raw_lower.replace(" ", "")

    if raw_compact in {"jó", "job"}:
        return ("Jó", "Jó")

    canonical = canonicalize(raw_book)
    alias = BOOK_ALIASES.get(canonical, canonical)
    return book_index.get(alias)


def extract_morning_block(day_segment: str) -> tuple[str, str] | None:
    morning_match = re.search(r"Manh\S*", day_segment, re.I)
    if not morning_match:
        return None

    morning_index = morning_match.start()
    night_match = re.search(r"^\s*Noite\s*$", day_segment[morning_index:], re.I | re.M)
    night_index = morning_index + night_match.start() if night_match else -1
    block = day_segment[morning_index:night_index] if night_index >= 0 else day_segment[morning_index:]

    quote_match = REFERENCE_PATTERN.search(block)
    if not quote_match:
        return None

    quote_line_start = block.rfind("\n", 0, quote_match.start())
    quote_line_end = block.find("\n", quote_match.end())

    if quote_line_start < 0:
        quote_line_start = 0
    if quote_line_end < 0:
        quote_line_end = len(block)

    quote_line = block[quote_line_start:quote_line_end].strip()
    body = block[quote_line_end:].strip()
    body = clean_body_text(body)

    if len(body) < 220:
        return None

    return quote_line, body


def extract_entries() -> list[dict[str, object]]:
    verse_index, book_index = load_nvi_data()
    raw_text = "\n".join((page.extract_text() or "") for page in PdfReader(str(PDF_PATH)).pages)
    text = normalize_pdf_text(raw_text)

    start_index = text.find("01 de janeiro")
    if start_index < 0:
        raise RuntimeError("Nao foi possivel localizar o inicio dos devocionais no PDF.")

    devotional_text = text[start_index:]
    matches = list(DATE_PATTERN.finditer(devotional_text))
    entries: list[dict[str, object]] = []

    for index, match in enumerate(matches):
        day_number = int(match.group("day"))
        month_name = canonicalize(match.group("month"))
        month_number = MONTH_ORDER.get(month_name)

        if month_number is None:
            continue

        segment_end = matches[index + 1].start() if index + 1 < len(matches) else len(devotional_text)
        day_segment = devotional_text[match.start():segment_end]
        extracted = extract_morning_block(day_segment)

        if not extracted:
            continue

        quote_line, body = extracted
        reference_match = REFERENCE_PATTERN.search(quote_line)

        if not reference_match:
            continue

        book_result = resolve_book_name(reference_match.group("book"), book_index)
        if not book_result:
            continue

        display_book, abbrev = book_result
        chapter = int(reference_match.group("chapter"))
        verse_spec = normalize_verse_spec(reference_match.group("verse"))
        canonical_book = canonicalize(display_book)
        verses = verse_numbers_from_spec(verse_spec)
        verse_text_parts = [
            verse_index[(canonical_book, chapter, verse)]
            for verse in verses
            if (canonical_book, chapter, verse) in verse_index
        ]

        if not verse_text_parts:
            continue

        display_order = 1000 + get_day_of_year(month_number, day_number)
        entries.append(
            {
                "source": SOURCE_NAME,
                "version": "NVI",
                "theme": "devocional",
                "book": display_book,
                "abbrev": abbrev,
                "chapter": chapter,
                "verse": verses[0],
                "reference": f"{display_book} {chapter}:{verse_spec}",
                "text": " ".join(verse_text_parts),
                "insight": body,
                "prayer": None,
                "closing_thought": None,
                "display_order": display_order,
                "is_active": True,
            }
        )

    unique_entries: list[dict[str, object]] = []
    seen_display_orders: set[int] = set()

    for item in sorted(entries, key=lambda entry: int(entry["display_order"])):
        display_order = int(item["display_order"])
        if display_order in seen_display_orders:
            continue
        seen_display_orders.add(display_order)
        unique_entries.append(item)

    return unique_entries


def merge_with_existing(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    existing = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    preserved = [
        item
        for item in existing
        if normalize_spaces(str(item.get("source", ""))).lower() != SOURCE_NAME.lower()
    ]
    return preserved + entries


def main() -> None:
    entries = extract_entries()
    merged = merge_with_existing(entries)
    OUTPUT_PATH.write_text(
        json.dumps(merged, ensure_ascii=True, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Biblioteca combinada gerada com {len(entries)} devocional(is) de {SOURCE_NAME} e {len(merged)} registro(s) no total."
    )


if __name__ == "__main__":
    main()
