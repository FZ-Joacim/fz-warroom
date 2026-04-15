// ─────────────────────────────────────────────
//  Flynn Zito War Room — app.js
//  Quotes + Charts: Yahoo Finance via CORS proxy
//  News: Finnhub API
// ─────────────────────────────────────────────

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const FINNHUB_KEY  = CONFIG.FINNHUB_API_KEY;
const PROXY        = "https://api.allorigins.win/get?url=";

let priceChart          = null;
let currentChartSymbol  = "%5EGSPC";
let currentChartLabel   = "^GSPC";
let currentRange        = 7;
let countdownTimer      = null;
let secondsLeft         = CONFIG.REFRESH_INTERVAL_MS / 1000;

// ── Utility ────────────────────────────────────

function fmt(n, decimals = 2) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtAuto(n) {
  // No decimals for large index values, 2 decimals for stocks/ETFs
  if (n == null || isNaN(n)) return "—";
  if (n >= 1000) return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tsToDate(ts) { return new Date(ts * 1000); }

// ── Yahoo Finance fetch ─────────────────────────

async function yahooFetch(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`;
  try {
    const res  = await fetch(PROXY + encodeURIComponent(url));
    const wrap = await res.json();
    if (!wrap?.contents) return null;
    const json   = JSON.parse(wrap.contents);
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    return {
      price:     meta.regularMarketPrice,
      prevClose: meta.chartPreviousClose || meta.previousClose,
      open:      meta.regularMarketOpen,
      high:      meta.regularMarketDayHigh,
      low:       meta.regularMarketDayLow,
      symbol:    meta.symbol,
    };
  } catch (e) {
    console.warn("yahooFetch error:", symbol, e);
    return null;
  }
}

async function yahooCandles(symbol, days) {
  const intervalMap = { 7: "1h", 30: "1d", 90: "1d", 365: "1wk" };
  const rangeMap    = { 7: "5d", 30: "1mo", 90: "3mo", 365: "1y" };
  const interval    = intervalMap[days] || "1d";
  const range       = rangeMap[days]    || "1mo";

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}&includePrePost=false`;
  try {
    const res  = await fetch(PROXY + encodeURIComponent(url));
    const wrap = await res.json();
    if (!wrap?.contents) return null;
    const json   = JSON.parse(wrap.contents);
    const result = json?.chart?.result?.[0];
    if (!result?.timestamp) return null;
    const timestamps = result.timestamp;
    const closes     = result.indicators.quote[0].close;
    const filtered   = timestamps
      .map((t, i) => ({ t, c: closes[i] }))
      .filter(x => x.c != null);
    return filtered.length ? filtered : null;
  } catch (e) {
    console.warn("yahooCandles error:", symbol, e);
    return null;
  }
}

// ── Finnhub news ────────────────────────────────

async function fetchNews() {
  const res = await fetch(`${FINNHUB_BASE}/news?category=general&minId=0&token=${FINNHUB_KEY}`);
  return res.json();
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
  tick(); setInterval(tick, 1000);
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

// ── Market status ──────────────────────────────

function updateMarketStatus() {
  const el  = document.getElementById("market-status");
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const et  = new Date(utc - 4 * 3600000); // EDT
  const totalMin = et.getHours() * 60 + et.getMinutes();
  const day = et.getDay();
  if (day >= 1 && day <= 5 && totalMin >= 570 && totalMin < 960) {
    el.textContent = "Market Open"; el.className = "panel-badge badge-open";
  } else {
    el.textContent = "Market Closed"; el.className = "panel-badge badge-closed";
  }
}

// ── Indices bar ────────────────────────────────

async function loadIndices() {
  await Promise.all(
    CONFIG.INDEX_TICKERS.map(async (idx) => {
      try {
        const q    = await yahooFetch(idx.symbol);
        const card = document.getElementById(`idx-${idx.display}`);
        if (!card || !q) return;

        const chg  = q.price - q.prevClose;
        const pct  = (chg / q.prevClose) * 100;
        const dir  = chg >= 0 ? "up" : "down";
        const sign = chg >= 0 ? "+" : "";

        card.querySelector(".idx-price").textContent = fmtAuto(q.price);
        const chgEl = card.querySelector(".idx-change");
        chgEl.textContent = `${sign}${fmtAuto(Math.abs(chg))} (${sign}${fmt(pct)}%)`;
        if (chg < 0) chgEl.textContent = `-${fmtAuto(Math.abs(chg))} (${fmt(pct)}%)`;
        chgEl.className = `idx-change ${dir}`;
        card.classList.remove("card-up", "card-down");
        card.classList.add(dir === "up" ? "card-up" : "card-down");
      } catch (e) {
        console.warn("Index fetch failed:", idx.display, e);
      }
    })
  );
}

// ── Watchlist ──────────────────────────────────

async function loadWatchlist() {
  const tbody = document.getElementById("watchlist-body");
  updateMarketStatus();
  const rows = [];

  await Promise.all(
    CONFIG.WATCHLIST.map(async (item) => {
      try {
        const q = await yahooFetch(item.ticker);
        if (!q) return;
        const chg = q.price - q.prevClose;
        const pct = (chg / q.prevClose) * 100;
        rows.push({ item, q, chg, pct });
      } catch (e) {
        console.warn("Watchlist error:", item.ticker, e);
      }
    })
  );

  rows.sort((a, b) => a.item.ticker.localeCompare(b.item.ticker));
  tbody.innerHTML = "";

  rows.forEach(({ item, q, chg, pct }) => {
    const dir  = chg >= 0 ? "up" : "down";
    const sign = chg >= 0 ? "+" : "";
    const sigClass = item.signal === "buy" ? "sig-buy" : item.signal === "hold" ? "sig-hold" : "sig-watch";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="td-ticker">${item.ticker}</td>
      <td class="td-name">${item.name}</td>
      <td class="td-price">$${fmt(q.price)}</td>
      <td class="td-change ${dir}">${sign}$${fmt(Math.abs(chg))}</td>
      <td class="td-pct ${dir}">${sign}${fmt(pct)}%</td>
      <td class="td-hl">$${fmt(q.high)}</td>
      <td class="td-hl">$${fmt(q.low)}</td>
      <td class="td-hl">$${fmt(q.open)}</td>
      <td><span class="signal-pill ${sigClass}">${item.signal}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Price Chart ────────────────────────────────

async function loadChart(symbol, label, days) {
  const metaTicker = document.getElementById("chart-ticker-label");
  const metaPrice  = document.getElementById("chart-current-price");
  const metaChg    = document.getElementById("chart-price-change");

  metaTicker.textContent = label;
  metaPrice.textContent  = "Loading…";
  metaChg.textContent    = "";

  const [candles, quote] = await Promise.all([
    yahooCandles(symbol, days),
    yahooFetch(symbol),
  ]);

  if (!candles || !quote) {
    metaPrice.textContent = "No data available";
    metaChg.textContent   = "";
    return;
  }

  const labels = candles.map(({ t }) => {
    const d = tsToDate(t);
    return days <= 7
      ? d.toLocaleTimeString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
  const prices = candles.map(x => x.c);

  const chg       = quote.price - quote.prevClose;
  const pct       = (chg / quote.prevClose) * 100;
  const isUp      = chg >= 0;
  const sign      = isUp ? "+" : "";
  const lineColor = isUp ? "#3ec97e" : "#e05a5a";
  const fillColor = isUp ? "rgba(62,201,126,0.08)" : "rgba(224,90,90,0.08)";

  metaPrice.textContent = fmtAuto(quote.price);
  metaChg.textContent   = `${sign}${fmtAuto(Math.abs(chg))} (${sign}${fmt(pct)}%)`;
  if (!isUp) metaChg.textContent = `-${fmtAuto(Math.abs(chg))} (${fmt(pct)}%)`;
  metaChg.className = `change-pill ${isUp ? "up" : "down"}`;

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
          callbacks: { label: (ctx) => ` ${fmtAuto(ctx.parsed.y)}` },
        },
      },
      scales: {
        x: {
          ticks: { color: "#5a7fa8", font: { family: "'DM Mono', monospace", size: 11 }, maxTicksLimit: 8, maxRotation: 0 },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        y: {
          position: "right",
          ticks: { color: "#5a7fa8", font: { family: "'DM Mono', monospace", size: 11 }, callback: (v) => fmtAuto(v) },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
      },
    },
  });
}

// ── News ───────────────────────────────────────

async function loadNews() {
  const list = document.getElementById("news-list");
  try {
    const articles = await fetchNews();
    if (!articles?.length) { list.innerHTML = "<div class='news-loading'>No news available.</div>"; return; }
    list.innerHTML = "";
    articles.slice(0, CONFIG.NEWS_COUNT).forEach((a) => {
      const age    = Math.floor((Date.now() / 1000 - a.datetime) / 3600);
      const ageStr = age < 1 ? "< 1h ago" : age < 24 ? `${age}h ago` : `${Math.floor(age / 24)}d ago`;
      const div = document.createElement("div");
      div.className = "news-item";
      div.innerHTML = `
        <div class="news-source">${a.source || "News"} <span class="news-age">${ageStr}</span></div>
        <a class="news-headline" href="${a.url}" target="_blank" rel="noopener">${a.headline}</a>
        <div class="news-summary">${(a.summary || "").slice(0, 120)}${a.summary?.length > 120 ? "…" : ""}</div>
      `;
      list.appendChild(div);
    });
  } catch (e) {
    list.innerHTML = "<div class='news-loading'>Failed to load news.</div>";
  }
}

// ── Last updated ───────────────────────────────

function setLastUpdated() {
  document.getElementById("last-updated").textContent =
    "Last updated: " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Full refresh ───────────────────────────────

async function refreshAll() {
  await Promise.all([loadIndices(), loadWatchlist(), loadChart(currentChartSymbol, currentChartLabel, currentRange), loadNews()]);
  setLastUpdated();
}

// ── Build chart dropdown from config ───────────

function buildChartDropdown() {
  const sel = document.getElementById("ticker-select");
  sel.innerHTML = "";
  CONFIG.CHART_TICKERS.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.symbol;
    opt.textContent = t.label;
    if (t.symbol === currentChartSymbol) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ── Build indices bar from config ───────────────

function buildIndicesBar() {
  const row = document.getElementById("indices-row");
  row.innerHTML = "";
  CONFIG.INDEX_TICKERS.forEach((idx) => {
    const div = document.createElement("div");
    div.className = "index-card";
    div.id = `idx-${idx.display}`;
    div.innerHTML = `
      <div class="idx-name">${idx.label} <span class="idx-ticker">${idx.display}</span></div>
      <div class="idx-price">—</div>
      <div class="idx-change">—</div>
    `;
    row.appendChild(div);
  });
}

// ── Controls ───────────────────────────────────

document.getElementById("ticker-select").addEventListener("change", (e) => {
  const opt = e.target.options[e.target.selectedIndex];
  currentChartSymbol = e.target.value;
  currentChartLabel  = opt.textContent.split("—")[0].trim();
  loadChart(currentChartSymbol, currentChartLabel, currentRange);
});

document.querySelectorAll(".range-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".range-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentRange = parseInt(btn.dataset.range, 10);
    loadChart(currentChartSymbol, currentChartLabel, currentRange);
  });
});

// ── Boot ───────────────────────────────────────

buildIndicesBar();
buildChartDropdown();
startClock();
startCountdown();
refreshAll();
setInterval(() => { refreshAll(); startCountdown(); }, CONFIG.REFRESH_INTERVAL_MS);
