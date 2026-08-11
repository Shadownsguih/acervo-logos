import pandas as pd
import pandas_datareader.data as web
from datetime import datetime

start = "2020-01-01"
end = datetime.today()

series = {
    "fed_assets": "WALCL",
    "tga": "WTREGEN",
    "rrp": "RRPONTSYD",
    "dxy": "DTWEXBGS",
    "dgs10": "DGS10",
    "breakeven_10y": "T10YIE",
    "hy_spread": "BAMLH0A0HYM2"
}

data = pd.DataFrame()

for name, code in series.items():
    data[name] = web.DataReader(code, "fred", start, end)[code]

data = data.resample("W").last().ffill()

data["fed_net_liquidity"] = data["fed_assets"] - data["tga"] - data["rrp"]
data["real_yield"] = data["dgs10"] - data["breakeven_10y"]

def normalize(series, invert=False):
    score = (series - series.rolling(156).min()) / (
        series.rolling(156).max() - series.rolling(156).min()
    ) * 100

    if invert:
        score = 100 - score

    return score

data["score_fed"] = normalize(data["fed_net_liquidity"])
data["score_dxy"] = normalize(data["dxy"], invert=True)
data["score_real_yield"] = normalize(data["real_yield"], invert=True)
data["score_credit"] = normalize(data["hy_spread"], invert=True)

# v1 simplificado: sem BCE/BoJ/PBoC/BoE ainda
data["bolinha_proxy_v1"] = (
    data["score_fed"] * 0.40 +
    data["score_dxy"] * 0.20 +
    data["score_real_yield"] * 0.20 +
    data["score_credit"] * 0.20
)

latest = data.dropna().iloc[-1]

print("Bolinha Proxy v1:", round(latest["bolinha_proxy_v1"], 2))

if latest["bolinha_proxy_v1"] <= 30:
    regime = "liquidez restritiva"
elif latest["bolinha_proxy_v1"] <= 50:
    regime = "neutra/frágil"
elif latest["bolinha_proxy_v1"] <= 70:
    regime = "favorável"
elif latest["bolinha_proxy_v1"] <= 85:
    regime = "forte para ativos de risco"
else:
    regime = "euforia/liquidez extrema"

print("Regime:", regime)