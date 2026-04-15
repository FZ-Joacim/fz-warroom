// ─────────────────────────────────────────────
//  Flynn Zito War Room — app.js
//  Live data: Finnhub REST API + Yahoo Finance
// ─────────────────────────────────────────────

const BASE = "https://finnhub.io/api/v1";
const KEY  = CONFIG.FINNHUB_API_KEY;

let priceChart = null;
let currentChartTicker = "SPY";
let currentRange = 7;
let countdownTimer = null;
let secondsLeft = CONFIG.REFRESH_INTERVAL_MS / 1000;

// Approximate scale multipliers so ETF prices display as recognizable index values
const INDEX_SCALE = {
  "SPY": 10,   // SPY ~530 → shows as ~5300 (S&P 500)
  "DIA": 100,  // DIA ~484 → shows as ~48400 (Dow Jones)
  "QQQ": 40,   // QQQ ~470 → shows as ~18800 (Nasdaq 100 approx)
};

// ── Utility ────────────────────────────────────

function fmt(n, decimals = 2) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtScaled(n, ticker) {
  if (n == null || isNaN(n)) return "—";
  const scale = INDEX_SCALE[ticker] || 1;
  const val   = n * scale;
  return scale > 1
    ? Number(val).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : `$${fmt(val)}`;
}

function tsToDate(ts) {
  return new Date(ts * 1000);
}

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

// ── Clock ──────────────────────────────────────

function startClock() {
  function tick() {
    const now = new Date();
    document.getElementById("clock").textContent = now.toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    document.getElementById("dateline").textContent = now.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  }
  tick();
  setInterval(tick, 1000);
}

function startCountdown() {
  clearInterval(countdownTimer);
  secondsLeft = CONFIG.REFRESH_INTERVAL_MS / 1000;
  countdownTimer = setInterval(() => {
    secondsLeft--;
    document.getElementById("countdown").textContent = secondsLeft;
    if (secondsLeft <= 0) secondsLeft = CONFIG.REFRESH_INTERVAL_MS / 1000;
  }, 1000);
}

// ── API Calls ──────────────────────────────────

async function fetchQuote(ticker) {
  const res = await fetch(`${BASE}/quote?symbol=${ticker}&token=${KEY}`);
  return res.json();
}

async function fetchCandles(ticker, days) {
  const interval = days <= 7 ? "1h" : days <= 30 ? "1d" : "1wk";
  const rangeMap = { 7: "5d", 30: "1mo", 90: "3mo", 365: "1y" };
  const range    = rangeMap[days] || "1mo";

  // allorigins CORS proxy bypasses Yahoo Finance browser restrictions
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${range}&includePrePost=false`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;

  try {
    const res  = await fetch(proxyUrl);
    const wrap = await res.json();
    if (!wrap || !wrap.contents) return { s: "no_data" };

    const json   = JSON.parse(wrap.contents);
    const result = json?.chart?.result?.[0];
    if (!result || !result.timestamp) return { s: "no_data" };

    const timestamps = result.timestamp;
    const closes     = result.indicators.quote[0].close;
    const filtered   = timestamps
      .map((t, i) => ({ t, c: closes[i] }))
      .filter(x => x.c != null);

    if (!filtered.length) return { s: "no_data" };
    return { s: "ok", t: filtered.map(x => x.t), c: filtered.map(x => x.c) };
  } catch (e) {
    console.error("fetchCandles error:", e);
    return { s: "error" };
  }
}

async function fetchNews() {
  const res = await fetch(`${BASE}/news?category=${CONFIG.NEWS_CATEGORY}&minId=0&token=${KEY}`);
  return res.json();
}

// ── Market status ──────────────────────────────

function updateMarketStatus() {
  const el  = document.getElementById("market-status");
  const now = new Date();
  // Convert to Eastern Time (EDT = UTC-4, EST = UTC-5; using -4 for simplicity)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const et  = new Date(utc - 4 * 3600000);
  const totalMin = et.getHours() * 60 + et.getMinutes();
  const day = et.getDay();
  if (day >= 1 && day <= 5 && totalMin >= 570 && totalMin < 960) {
    el.textContent = "Market Open";
    el.className   = "panel-badge badge-open";
  } else {
    el.textContent = "Market Closed";
    el.className   = "panel-badge badge-closed";
  }
}

// ── Indices bar ────────────────────────────────

async function loadIndices() {
  await Promise.all(
    CONFIG.INDEX_TICKERS.map(async (ticker) => {
      try {
        const q    = await fetchQuote(ticker);
        const card = document.getElementById(`idx-${ticker}`);
        if (!card || q.c == null) return;

        const chg   = q.c - q.pc;
        const pct   = (chg / q.pc) * 100;
        const dir   = chg >= 0 ? "up" : "down";
        const sign  = chg >= 0 ? "+" : "";
        const scale = INDEX_SCALE[ticker] || 1;

        card.querySelector(".idx-price").textContent = fmtScaled(q.c, ticker);

        const scaledChg = chg * scale;
        const chgEl     = card.querySelector(".idx-change");
        chgEl.textContent = scale > 1
          ? `${sign}${Number(scaledChg).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (${sign}${fmt(pct)}%)`
          : `${sign}$${fmt(Math.abs(chg))} (${sign}${fmt(pct)}%)`;
        chgEl.className = `idx-change ${dir}`;
        card.classList.remove("card-up", "card-down");
        card.classList.add(dir === "up" ? "card-up" : "card-down");
      } catch (e) {
        console.warn("Index fetch failed:", ticker, e);
      }
    })
  );
}

// ── Watchlist table ────────────────────────────

async function loadWatchlist() {
  const tbody = document.getElementById("watchlist-body");
  tbody.innerHTML = "";
  updateMarketStatus();

  const rows = [];

  await Promise.all(
    CONFIG.WATCHLIST.map(async (item) => {
      try {
        const q = await fetchQuote(item.ticker);
        if (q.c == null) return;
        const chg  = q.c - q.pc;
        const pct  = (chg / q.pc) * 100;
        rows.push({ item, q, chg, pct });
      } catch (e) {
        console.warn("Watchlist fetch failed:", item.ticker, e);
      }
    })
  );

  rows.sort((a, b) => a.item.ticker.localeCompare(b.item.ticker));

  rows.forEach(({ item, q, chg, pct }) => {
    const dir  = chg >= 0 ? "up" : "down";
    const sign = chg >= 0 ? "+" : "";
    const signalClass = item.signal === "buy" ? "sig-buy" : item.signal === "hold" ? "sig-hold" : "sig-watch";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="td-ticker">${item.ticker}</td>
      <td class="td-name">${item.name}</td>
      <td class="td-price">$${fmt(q.c)}</td>
      <td class="td-change ${dir}">${sign}$${fmt(Math.abs(chg))}</td>
      <td class="td-pct ${dir}">${sign}${fmt(pct)}%</td>
      <td class="td-hl">$${fmt(q.h)}</td>
      <td class="td-hl">$${fmt(q.l)}</td>
      <td class="td-hl">$${fmt(q.o)}</td>
      <td><span class="signal-pill ${signalClass}">${item.signal}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Price Chart ────────────────────────────────

async function loadChart(ticker, days) {
  const metaTicker = document.getElementById("chart-ticker-label");
  const metaPrice  = document.getElementById("chart-current-price");
  const metaChg    = document.getElementById("chart-price-change");

  metaTicker.textContent = ticker;
  metaPrice.textContent  = "Loading…";
  metaChg.textContent    = "";

  try {
    const [candles, quote] = await Promise.all([
      fetchCandles(ticker, days),
      fetchQuote(ticker),
    ]);

    if (!candles || candles.s !== "ok" || !candles.c || !candles.c.length) {
      metaPrice.textContent = "No chart data";
      metaChg.textContent   = "Try a different range or check back later";
      return;
    }

    const labels = candles.t.map((ts) => {
      const d = tsToDate(ts);
      return days <= 7
        ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });

    const prices    = candles.c;
    const chg       = quote.c - quote.pc;
    const pct       = (chg / quote.pc) * 100;
    const isUp      = chg >= 0;
    const lineColor = isUp ? "#3ec97e" : "#e05a5a";
    const fillColor = isUp ? "rgba(62,201,126,0.08)" : "rgba(224,90,90,0.08)";

    metaPrice.textContent = `$${fmt(quote.c)}`;
    const sign = isUp ? "+" : "";
    metaChg.textContent = `${sign}${fmt(chg)} (${sign}${fmt(pct)}%)`;
    metaChg.className   = `change-pill ${isUp ? "up" : "down"}`;

    if (priceChart) priceChart.destroy();

    const ctx = document.getElementById("priceChart").getContext("2d");
    priceChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          data: prices,
          borderColor: lineColor,
          borderWidth: 2,
          backgroundColor: fillColor,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: lineColor,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#0a2240",
            titleColor: "#7aa8d4",
            bodyColor: "#e8f0f8",
            borderColor: "#1e4070",
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) => ` $${fmt(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#5a7fa8",
              font: { family: "'DM Mono', monospace", size: 11 },
              maxTicksLimit: 8,
              maxRotation: 0,
            },
            grid: { color: "rgba(255,255,255,0.04)" },
          },
          y: {
            position: "right",
            ticks: {
              color: "#5a7fa8",
              font: { family: "'DM Mono', monospace", size: 11 },
              callback: (v) => `$${fmt(v)}`,
            },
            grid: { color: "rgba(255,255,255,0.04)" },
          },
        },
      },
    });
  } catch (e) {
    console.error("Chart load failed:", e);
    metaPrice.textContent = "Error loading chart";
  }
}

// ── News feed ──────────────────────────────────

async function loadNews() {
  const list = document.getElementById("news-list");
  try {
    const articles = await fetchNews();
    if (!articles || !articles.length) {
      list.innerHTML = "<div class='news-loading'>No news available.</div>";
      return;
    }
    list.innerHTML = "";
    articles.slice(0, CONFIG.NEWS_COUNT).forEach((a) => {
      const age    = Math.floor((Date.now() / 1000 - a.datetime) / 3600);
      const ageStr = age < 1 ? "< 1h ago" : age < 24 ? `${age}h ago` : `${Math.floor(age / 24)}d ago`;
      const div    = document.createElement("div");
      div.className = "news-item";
      div.innerHTML = `
        <div class="news-source">${a.source || "News"} <span class="news-age">${ageStr}</span></div>
        <a class="news-headline" href="${a.url}" target="_blank" rel="noopener">${a.headline}</a>
        <div class="news-summary">${(a.summary || "").slice(0, 120)}${a.summary && a.summary.length > 120 ? "…" : ""}</div>
      `;
      list.appendChild(div);
    });
  } catch (e) {
    list.innerHTML = "<div class='news-loading'>Failed to load news.</div>";
    console.error("News fetch failed:", e);
  }
}

// ── Last updated ───────────────────────────────

function setLastUpdated() {
  document.getElementById("last-updated").textContent =
    "Last updated: " + new Date().toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
}

// ── Full refresh ───────────────────────────────

async function refreshAll() {
  await Promise.all([
    loadIndices(),
    loadWatchlist(),
    loadChart(currentChartTicker, currentRange),
    loadNews(),
  ]);
  setLastUpdated();
}

// ── Chart controls ─────────────────────────────

document.getElementById("ticker-select").addEventListener("change", (e) => {
  currentChartTicker = e.target.value;
  loadChart(currentChartTicker, currentRange);
});

document.querySelectorAll(".range-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".range-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentRange = parseInt(btn.dataset.range, 10);
    loadChart(currentChartTicker, currentRange);
  });
});

// ── Boot ───────────────────────────────────────

startClock();
startCountdown();
refreshAll();
setInterval(() => {
  refreshAll();
  startCountdown();
}, CONFIG.REFRESH_INTERVAL_MS);
