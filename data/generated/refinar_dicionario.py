import json
import re
from tqdm import tqdm

# =========================
# FUNÇÕES AUXILIARES
# =========================

def normalizar_texto(texto):
    if not texto:
        return texto

    texto = texto.replace(" ,", ",")
    texto = texto.replace(" .", ".")
    texto = texto.replace(" ;", ";")
    texto = texto.replace("  ", " ")

    # Correções comuns
    correcoes = {
        "E)eus": "Deus",
        "qne": "que",
        "ae entrar": "ao entrar",
        "Teino": "Reino",
        "pastar": "pastor",
        "tomou-se": "tornou-se",
        "léita": "feita",
        "comunciante": "comunicante"
    }

    for errado, certo in correcoes.items():
        texto = texto.replace(errado, certo)

    return texto.strip()


def detectar_idioma(termo):
    termo = termo.lower()

    # heurística simples
    if termo in ["abba", "aba"]:
        return "aramaico"

    return "hebraico"  # padrão AT


def gerar_transliteracao(termo):
    return termo.capitalize()


def gerar_original_fake(termo):
    # placeholder (depois podemos melhorar com base Strong real)
    return ""


def gerar_pronuncia(termo):
    return termo.lower()


# =========================
# PROCESSAMENTO
# =========================

def refinar_entrada(item):
    item["displayTerm"] = item["displayTerm"].capitalize()

    item["shortDefinition"] = normalizar_texto(item.get("shortDefinition", ""))
    item["fullDefinition"] = normalizar_texto(item.get("fullDefinition", ""))

    # Corrigir campo term bugado
    if len(item["term"]) > 40:
        item["term"] = item["displayTerm"].upper()

    # Linguagem
    idioma = detectar_idioma(item["normalizedTerm"])
    item["language"] = idioma

    # Novos campos
    item["transliteration"] = gerar_transliteracao(item["displayTerm"])
    item["original"] = gerar_original_fake(item["displayTerm"])
    item["pronunciation"] = gerar_pronuncia(item["displayTerm"])

    return item


# =========================
# EXECUÇÃO
# =========================

def processar_arquivo(input_path, output_path):
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    novo = []

    for item in tqdm(data):
        novo.append(refinar_entrada(item))

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(novo, f, ensure_ascii=False, indent=2)


# =========================
# RUN
# =========================

if __name__ == "__main__":
    processar_arquivo(
        "wycliffe-dictionary-refined.json",
        "wycliffe-dictionary-final.json"
    )