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
    "JANEIRO": 1,
    "FEVEREIRO": 2,
    "MARCO": 3,
    "MARÇO": 3,
    "ABRIL": 4,
    "MAIO": 5,
    "JUNHO": 6,
    "JULHO": 7,
    "AGOSTO": 8,
    "SETEMBRO": 9,
    "OUTUBRO": 10,
    "NOVEMBRO": 11,
    "DEZEMBRO": 12,
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

HEADING_PATTERN = re.compile(
    r"\b(JANEIRO|FEVEREIRO|MARCO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)\s+([0-3]?\d)\b"
)

SOURCE_BREAK_PATTERNS = [
    re.compile(r"\(\d+\s+of\s+\d+\)\d+/\d+/\s*:?[0-9:]+"),
    re.compile(r"\b\d+\s+Manhã\b", re.I),
    re.compile(r"\b\d+\s+Noite\b", re.I),
    re.compile(r"\b\d+\s+Minha vida\b", re.I),
    re.compile(r"http[s]?://\S+", re.I),
]

BOOK_ALIASES = {
    "can": "canticos",
    "canticos": "canticos",
    "cantico": "canticos",
    "cantares": "canticos",
    "ct": "canticos",
    "job": "jo",
    "jo": "jo",
    "ez": "ezequiel",
    "mat": "mateus",
    "mar": "marcos",
    "joa": "joao",
    "joao": "joao",
    "col": "colossenses",
    "fil": "filipenses",
    "prov": "proverbios",
    "sal": "salmos",
    "is": "isaias",
    "isa": "isaias",
    "2cor": "2corintios",
    "1cor": "1corintios",
    "1ped": "1pedro",
    "2ped": "2pedro",
    "1pedro": "1pedro",
    "2pedro": "2pedro",
    "apoc": "apocalipse",
    "heb": "hebreus",
    "rom": "romanos",
    "ezeq": "ezequiel",
    "lc": "lucas",
    "mt": "mateus",
    "mc": "marcos",
    "js": "josue",
    "pv": "proverbios",
    "sl": "salmos",
    "rm": "romanos",
    "fp": "filipenses",
    "cl": "colossenses",
    "2tm": "2timoteo",
}

GLOBAL_TEXT_REPLACEMENTS = {
    " em ouviu ": " me ouviu ",
    " por nos": " por nós",
    " n Ele": " nEle",
    " d Ele": " dEle",
    " duma ": " duma ",
    " frequencia ": " frequência ",
    " referencias ": " referências ",
    " necessáriamente ": " necessariamente ",
    " quela grande visão": " aquela grande visão",
    " transmitiriamos ": " transmitiríamos ",
    " benção ": " bênção ",
    " toda sua alma": " toda a sua alma",
    " um quadro preciso dea toda a Sua imagem": " um quadro preciso de toda a Sua imagem",
    " estar super-estrutura": " esta super-estrutura",
    " a santidades ": " a santidade ",
    " seu numero ": " seu número ",
    " por todo o mundo, juntamente com quem escreveu Minha alma recorda seu dia de libertação com alegria.":
        ' por todo o mundo, juntamente com quem escreveu: "Minha alma recorda seu dia de libertação com alegria."',
    ' Quem não arrisca, não petisca",': ' "Quem não arrisca, não petisca",',
    " todo conforta da Palavra de Deus": " todo conforto da Palavra de Deus",
    " de toda a Sua imagem": " de toda a sua imagem",
    " Cristo oferecendo-se com sacrifício expiatório no lugar de todos quantos o Pai lhe deu a salvar, os gar de todos quantos o Pai lhe deu a salvar, os quais":
        " Cristo oferecendo-se como sacrifício expiatório no lugar de todos quantos o Pai lhe deu a salvar, os quais",
    " p ra Ele": " para Ele",
    " que busquei ao Senhor e Ele me ouviu": " que busquei ao Senhor e Ele me ouviu",
    " fez urna lista": " fez uma lista",
    " aqui está um o Esposo dormindo": " aqui está um: o Esposo dormindo",
    " suas forças com aconteceu com Sansão": " suas forças como aconteceu com Sansão",
}

ENTRY_PREFIX_REPLACEMENTS = {
    1002: ('na oração." Col 4.2', '"Perseverai na oração."'),
    1072: ("estaremos nós aqui sentados até morrermos?. 2 Reis 7:3", "Por que estaremos nós aqui sentados até morrermos?"),
    1092: ("e nunca um homem manteve seu silêncio como Ele também.", "E nunca um homem manteve seu silêncio como Ele também."),
    1095: ('he a cruz sobre os ombros, para que a levasse após Jesus.", Lucas 23.26', '"Puseram-lhe a cruz sobre os ombros, para que a levasse após Jesus."'),
    1103: (". Com toda a certeza que esta é a verdadeira essência da a natureza da verdadeira fé,", "Com toda a certeza, esta é a verdadeira essência da natureza da verdadeira fé,"),
    1109: (". Caso venha até Ele,", "Caso venha até Ele,"),
    1115: (". Qual o seu maior desejo esta noite?", "Qual é o seu maior desejo esta noite?"),
    1155: (". Ele, cuja luz é como o sol da manhã,", "Ele, cuja luz é como o sol da manhã,"),
    1172: (". O grande facto sobre o qual a fé repousa é também que", "O grande facto sobre o qual a fé repousa é também que"),
    1190: (". Como se dá tal coisa e se ocasiona este estado de coisas?", "Como se dá tal coisa e se ocasiona este estado de coisas?"),
    1199: ("urram uns aos outros; marcham cada um pelo seu carreiro, Joel 2:8", "Não se empurram uns aos outros; marcham cada um pelo seu carreiro."),
    1261: (". Também há aqueles que seguem e perseguem a santidade", "Também há aqueles que seguem e perseguem a santidade"),
    1282: (". Se fossemos fortes, montanhistas de pés seguros,", "Se fôssemos fortes, montanhistas de pés seguros,"),
}


def canonicalize(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    stripped = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]", "", stripped.lower())


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_lookup_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    stripped = "".join(char for char in normalized if not unicodedata.combining(char))
    lowered = stripped.lower()
    lowered = re.sub(r"[^a-z0-9]+", " ", lowered)
    return normalize_spaces(lowered)


def normalize_pdf_text(value: str) -> str:
    value = value.replace("\r", "\n")
    value = value.replace("\ufb01", "fi").replace("\ufb02", "fl")
    value = value.replace("\x00", "ti")
    value = value.replace("-\n", "-")
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value


def polish_text(value: str) -> str:
    cleaned = normalize_spaces(value)
    cleaned = cleaned.replace(" ,", ",")
    cleaned = cleaned.replace(" .", ".")
    cleaned = cleaned.replace(" ;", ";")
    cleaned = cleaned.replace(" :", ":")
    cleaned = cleaned.replace(" !", "!")
    cleaned = cleaned.replace(" ?", "?")
    cleaned = cleaned.replace("“", '"').replace("”", '"')
    cleaned = cleaned.replace(" '", "'")
    return cleaned.strip()


def clean_spurgeon_text(value: str, display_order: int) -> str:
    cleaned = polish_text(value)

    for source, target in GLOBAL_TEXT_REPLACEMENTS.items():
        cleaned = cleaned.replace(source, target)

    prefix_replacement = ENTRY_PREFIX_REPLACEMENTS.get(display_order)
    if prefix_replacement:
        source, target = prefix_replacement
        if cleaned.startswith(source):
            cleaned = target + cleaned[len(source) :]

    cleaned = re.sub(r"^\.\s+", "", cleaned)
    cleaned = cleaned.replace("  ", " ")
    return cleaned.strip()


def load_nvi_data() -> tuple[
    dict[tuple[str, int, int], str],
    dict[str, tuple[str, str | None]],
    dict[str, tuple[str, str | None]],
    dict[str, tuple[str, str | None, int, int]],
]:
    raw = json.loads(NVI_PATH.read_text(encoding="utf-8"))
    verse_index: dict[tuple[str, int, int], str] = {}
    full_book_index: dict[str, tuple[str, str | None]] = {}
    all_book_tokens: dict[str, tuple[str, str | None]] = {}
    quote_lookup: dict[str, tuple[str, str | None, int, int]] = {}

    for entry in raw:
        canonical_book = canonicalize(entry["book"])
        verse_index[(canonical_book, int(entry["chapter"]), int(entry["verse"]))] = entry[
            "text"
        ].strip()

        if canonical_book not in full_book_index:
            full_book_index[canonical_book] = (entry["book"], entry.get("abbrev"))

        all_book_tokens[canonicalize(entry["book"])] = (
            entry["book"],
            entry.get("abbrev"),
        )

        if entry.get("abbrev"):
            all_book_tokens[canonicalize(entry["abbrev"])] = (
                entry["book"],
                entry.get("abbrev"),
            )

        normalized_quote = normalize_lookup_text(entry["text"])
        if normalized_quote and normalized_quote not in quote_lookup:
            quote_lookup[normalized_quote] = (
                entry["book"],
                entry.get("abbrev"),
                int(entry["chapter"]),
                int(entry["verse"]),
            )

    return verse_index, full_book_index, all_book_tokens, quote_lookup


def build_reference_pattern(
    all_book_tokens: dict[str, tuple[str, str | None]],
) -> re.Pattern[str]:
    explicit_tokens = {token[0] for token in all_book_tokens.values()}
    extra_tokens = {
        "Heb",
        "Heb.",
        "Mat",
        "Mt",
        "Mar",
        "Mc",
        "Luc",
        "Lc",
        "João",
        "Joao",
        "Jo",
        "Can",
        "Ct",
        "Apoc",
        "Ap",
        "Ez",
        "Ezeq",
        "1Ped",
        "1Pe",
        "2Cor",
        "2Co",
        "1Cor",
        "1Co",
        "Fil",
        "Fp",
        "Prov",
        "Pv",
        "Sal",
        "Sl",
        "Jos",
        "Js",
        "Joel",
        "Jl",
        "Jud",
        "Jz",
        "Rom",
        "Rm",
        "Is",
        "Isa",
        "Jó",
        "Job",
        "2Tm",
    }
    tokens = sorted(explicit_tokens | extra_tokens, key=len, reverse=True)
    pattern = "|".join(
        re.escape(token).replace(r"\ ", r"\s*").replace(r"\.", r"\.?")
        for token in tokens
    )
    return re.compile(
        rf"(?P<book>{pattern})\.?\s*(?P<chapter>\d+)[\.:](?P<verse>\d+(?:[-,]\d+)*)",
        re.I,
    )


def resolve_book(
    raw_book: str,
    all_book_tokens: dict[str, tuple[str, str | None]],
) -> tuple[str, str | None]:
    normalized = canonicalize(raw_book)

    if normalized in all_book_tokens:
        return all_book_tokens[normalized]

    alias = BOOK_ALIASES.get(normalized)
    if alias and alias in all_book_tokens:
        return all_book_tokens[alias]

    raise ValueError(f"Livro nao encontrado na NVI local: {raw_book}")


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


def get_day_of_year(month_number: int, day_number: int) -> int:
    total = 0
    for month in range(1, month_number):
        total += MONTH_LENGTHS[month]
    return total + day_number


def trim_segment_body(segment: str) -> str:
    segment = segment.replace("\n", " ")

    cut_positions = [len(segment)]
    for pattern in SOURCE_BREAK_PATTERNS:
        match = pattern.search(segment)
        if match:
            cut_positions.append(match.start())

    cleaned = segment[: min(cut_positions)]
    cleaned = re.sub(r"^\s*\d+\s+", "", cleaned)
    cleaned = cleaned.replace(" .", ".")
    return polish_text(cleaned)


def guess_reference_from_quote(
    header_window: str,
    quote_lookup: dict[str, tuple[str, str | None, int, int]],
) -> tuple[str, str | None, int, str] | None:
    candidates = []
    segments = re.split(r"[\"”]|(?:\.\s+)|(?:,\s+)", header_window)
    for candidate in segments:
        cleaned = polish_text(candidate.strip(' ".,;:-'))
        if len(cleaned) < 8:
            continue
        candidates.append(cleaned)

    for candidate in candidates[:8]:
        hit = quote_lookup.get(normalize_lookup_text(candidate))
        if hit:
            book, abbrev, chapter, verse = hit
            return book, abbrev, chapter, str(verse)

    return None


def extract_entries() -> list[dict[str, object]]:
    verse_index, _full_book_index, all_book_tokens, quote_lookup = load_nvi_data()
    precise_reference_pattern = build_reference_pattern(all_book_tokens)
    text = normalize_pdf_text(
        "\n".join((page.extract_text() or "") for page in PdfReader(str(PDF_PATH)).pages)
    )

    matches = list(HEADING_PATTERN.finditer(text))
    entries: list[dict[str, object]] = []

    for index, match in enumerate(matches):
        month_name = match.group(1)
        day_text = match.group(2)
        month_number = MONTH_ORDER[month_name]
        day_number = int(day_text)
        segment_end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        segment = text[match.end() : segment_end]
        header_window = normalize_spaces(segment[:900].replace("\n", " "))

        reference_match = precise_reference_pattern.search(header_window)
        display_book: str | None = None
        abbrev: str | None = None
        chapter: int | None = None
        verse_spec: str | None = None
        body_start = 0

        if reference_match:
            raw_book = reference_match.group("book").strip()
            chapter = int(reference_match.group("chapter"))
            verse_spec = reference_match.group("verse")
            body_start = max(segment.find(reference_match.group(0)), 0) + len(
                reference_match.group(0)
            )

            try:
                display_book, abbrev = resolve_book(raw_book, all_book_tokens)
            except ValueError:
                display_book = None

        if not display_book or chapter is None or not verse_spec:
            guessed = guess_reference_from_quote(header_window, quote_lookup)
            if guessed:
                display_book, abbrev, chapter, verse_spec = guessed

        if not display_book or chapter is None or not verse_spec:
            continue

        canonical_book = canonicalize(display_book)
        verses = verse_numbers_from_spec(verse_spec)
        verse_text_parts = [
            verse_index[(canonical_book, chapter, verse)]
            for verse in verses
            if (canonical_book, chapter, verse) in verse_index
        ]

        if not verse_text_parts:
            continue

        body = trim_segment_body(segment[body_start:])

        if len(body) < 120:
            continue

        body = clean_spurgeon_text(body, 1000 + get_day_of_year(month_number, day_number))

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
                "display_order": 1000 + get_day_of_year(month_number, day_number),
                "is_active": True,
            }
        )

    unique_entries = []
    seen_keys: set[tuple[int, str]] = set()
    for item in sorted(entries, key=lambda entry: entry["display_order"]):
        key = (int(item["display_order"]), str(item["reference"]))
        if key in seen_keys:
            continue
        seen_keys.add(key)
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
