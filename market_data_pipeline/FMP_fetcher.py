import yfinance as yf

symbol = "TSLA"

df = yf.download(symbol, period="max", interval="1d")

df.to_csv(f"{symbol}_daily_full.csv")