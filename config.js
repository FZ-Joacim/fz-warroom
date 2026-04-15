// ─────────────────────────────────────────────
//  Flynn Zito War Room — Configuration
//  Edit this file to change tickers or API key
// ─────────────────────────────────────────────

const CONFIG = {
  FINNHUB_API_KEY: "d7fpi59r01qqb8rh50g0d7fpi59r01qqb8rh50gg",

  // Tickers shown in the top indices bar (max 6)
  INDEX_TICKERS: ["SPY", "DIA", "QQQ", "IWF", "VYM", "AAPL"],

  // Full watchlist shown in the bottom table
  WATCHLIST: [
    { ticker: "SPY",  name: "SPDR S&P 500 ETF",              signal: "hold" },
    { ticker: "DIA",  name: "SPDR Dow Jones ETF",             signal: "hold" },
    { ticker: "QQQ",  name: "Invesco Nasdaq-100 ETF",         signal: "watch" },
    { ticker: "IWF",  name: "iShares Russell 1000 Growth",    signal: "buy"  },
    { ticker: "VYM",  name: "Vanguard High Dividend Yield",   signal: "buy"  },
    { ticker: "PRF",  name: "Invesco RAFI US 1000",           signal: "hold" },
    { ticker: "AAPL", name: "Apple Inc.",                     signal: "watch" },
    { ticker: "FLQM", name: "Franklin US Mid Cap",            signal: "hold" },
    { ticker: "GLD",  name: "SPDR Gold Shares",               signal: "watch" },
    { ticker: "AGG",  name: "iShares Core US Agg Bond",       signal: "hold" },
  ],

  // How often to refresh data (milliseconds). 60000 = 1 minute.
  REFRESH_INTERVAL_MS: 60000,

  // News categories: general, forex, crypto, merger
  NEWS_CATEGORY: "general",

  // Number of news items to show
  NEWS_COUNT: 12,
};
