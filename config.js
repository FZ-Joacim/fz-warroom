// ─────────────────────────────────────────────
//  Flynn Zito War Room — config.js
//  Edit tickers, signals, and refresh interval here
// ─────────────────────────────────────────────

const CONFIG = {
  FINNHUB_API_KEY: "d7fpi59r01qqb8rh50g0d7fpi59r01qqb8rh50gg",

  // Top indices bar — uses real Yahoo Finance symbols
  // %5E = encoded ^ for index symbols
  INDEX_TICKERS: [
    { symbol: "%5EGSPC",  label: "S&P 500",       display: "^GSPC"  },
    { symbol: "%5EDJI",   label: "Dow Jones",      display: "^DJI"   },
    { symbol: "%5EIXIC",  label: "Nasdaq",         display: "^IXIC"  },
    { symbol: "%5ERUT",   label: "Russell 2000",   display: "^RUT"   },
    { symbol: "VYM",      label: "High Div Yield", display: "VYM"    },
    { symbol: "AAPL",     label: "Apple",          display: "AAPL"   },
  ],

  // Watchlist — FZ core holdings
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

  // Chart dropdown — what tickers are available to chart
  CHART_TICKERS: [
    { symbol: "%5EGSPC", label: "^GSPC — S&P 500 Index"       },
    { symbol: "%5EDJI",  label: "^DJI  — Dow Jones Index"      },
    { symbol: "%5EIXIC", label: "^IXIC — Nasdaq Composite"     },
    { symbol: "SPY",     label: "SPY   — S&P 500 ETF"          },
    { symbol: "IWF",     label: "IWF   — Russell 1000 Growth"  },
    { symbol: "VYM",     label: "VYM   — High Dividend Yield"  },
    { symbol: "PRF",     label: "PRF   — RAFI US 1000"         },
    { symbol: "AAPL",    label: "AAPL  — Apple Inc."           },
    { symbol: "GLD",     label: "GLD   — Gold ETF"             },
    { symbol: "AGG",     label: "AGG   — US Agg Bond"          },
  ],

  // Auto-refresh interval in milliseconds (60000 = 1 min)
  REFRESH_INTERVAL_MS: 60000,

  // Number of news articles to show
  NEWS_COUNT: 12,
};
