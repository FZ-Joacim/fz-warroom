// ─────────────────────────────────────────────
//  Flynn Zito War Room — config.js
// ─────────────────────────────────────────────

const CONFIG = {
  FINNHUB_API_KEY: "d7fpi59r01qqb8rh50g0d7fpi59r01qqb8rh50gg",

  // Top bar — Finnhub supports these ETF/stock symbols directly
  // Labels show what index/asset each represents
  INDEX_TICKERS: [
    { symbol: "SPY",  label: "S&P 500",       sub: "via SPY"  },
    { symbol: "DIA",  label: "Dow Jones",      sub: "via DIA"  },
    { symbol: "QQQ",  label: "Nasdaq 100",     sub: "via QQQ"  },
    { symbol: "IWM",  label: "Russell 2000",   sub: "via IWM"  },
    { symbol: "VYM",  label: "High Div Yield", sub: "VYM"      },
    { symbol: "AAPL", label: "Apple",          sub: "AAPL"     },
  ],

  // Watchlist
  WATCHLIST: [
    { ticker: "SPY",  name: "SPDR S&P 500 ETF",            signal: "hold"  },
    { ticker: "IWF",  name: "iShares Russell 1000 Growth",  signal: "buy"   },
    { ticker: "PRF",  name: "Invesco RAFI US 1000",         signal: "hold"  },
    { ticker: "VYM",  name: "Vanguard High Dividend Yield", signal: "buy"   },
    { ticker: "FLQM", name: "Franklin US Mid Cap",          signal: "hold"  },
    { ticker: "AGG",  name: "iShares Core US Agg Bond",     signal: "hold"  },
    { ticker: "GLD",  name: "SPDR Gold Shares",             signal: "watch" },
    { ticker: "AAPL", name: "Apple Inc.",                   signal: "watch" },
    { ticker: "QQQ",  name: "Invesco Nasdaq-100 ETF",       signal: "watch" },
    { ticker: "BND",  name: "Vanguard Total Bond Market",   signal: "hold"  },
  ],

  // TradingView chart symbols — these show real index values
  CHART_TICKERS: [
    { tv: "SP:SPX",      label: "S&P 500"           },
    { tv: "DJ:DJI",      label: "Dow Jones"          },
    { tv: "NASDAQ:IXIC", label: "Nasdaq Composite"   },
    { tv: "AMEX:SPY",    label: "SPY — S&P 500 ETF"  },
    { tv: "AMEX:IWF",    label: "IWF — Russell Gr"   },
    { tv: "AMEX:VYM",    label: "VYM — High Div"     },
    { tv: "AMEX:GLD",    label: "GLD — Gold ETF"     },
    { tv: "AMEX:AGG",    label: "AGG — US Bond"      },
    { tv: "NASDAQ:AAPL", label: "AAPL — Apple"       },
    { tv: "NASDAQ:QQQ",  label: "QQQ — Nasdaq ETF"   },
  ],

  REFRESH_INTERVAL_MS: 30000,
  NEWS_COUNT: 12,
};
