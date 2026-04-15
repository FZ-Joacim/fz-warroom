// ─────────────────────────────────────────────
//  Flynn Zito War Room — app.js
//  Quotes: Finnhub direct (no proxy, instant)
//  Chart:  TradingView embedded widget (real-time)
//  News:   Finnhub direct
// ─────────────────────────────────────────────

const FH  = "https://finnhub.io/api/v1";
const KEY = CONFIG.FINNHUB_API_KEY;

let currentTV    = CONFIG.CHART_TICKERS[0].tv;
let countdownTimer = null;
let secondsLeft    = CONFIG.REFRESH_INTERVAL_MS / 1000;

// ── Utility ─────────────────────────────────────

function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ── Clock ────────────────────────────────────────

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
    const el = document.getElementById("countdown");
    if (el) el.textContent = secondsLeft;
    if (secondsLeft <= 0) secondsLeft = CONFIG.REFRESH_INTERVAL_MS / 1000;
  }, 1000);
}

// ── Market status ────────────────────────────────

function updateMarketStatus() {
  const el  = document.getElementById("market-status");
  if (!el) return;
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const et  = new Date(utc - 4 * 3600000);
  const min = et.getHours() * 60 + et.getMinutes();
  const day = et.getDay();
  if (day >= 1 && day <= 5 && min >= 570 && min < 960) {
    el.textContent = "Market Open";  el.className = "panel-badge badge-open";
  } else {
    el.textContent = "Market Closed"; el.className = "panel-badge badge-closed";
  }
}

// ── Finnhub quote (direct, no proxy) ────────────

async function fhQuote(symbol) {
  const res = await fetch(`${FH}/quote?symbol=${symbol}&token=${KEY}`);
  return res.json();
}

// ── Indices bar — each card loads independently ──

function buildIndicesBar() {
  const row = document.getElementById("indices-row");
  row.innerHTML = "";
  CONFIG.INDEX_TICKERS.forEach((idx) => {
    const div = document.createElement("div");
    div.className = "index-card loading";
    div.id = `idx-${idx.symbol}`;
    div.innerHTML = `
      <div class="idx-name">${idx.label} <span class="idx-ticker">${idx.sub}</span></div>
      <div class="idx-price"><div class="shimmer shimmer-sm"></div></div>
      <div class="idx-change"><div class="shimmer shimmer-xs"></div></div>
    `;
    row.appendChild(div);
  });

  // Each card fetches and renders independently — no waiting on others
  CONFIG.INDEX_TICKERS.forEach(async (idx) => {
    try {
      const q   = await fhQuote(idx.symbol);
      const card = document.getElementById(`idx-${idx.symbol}`);
      if (!card || q.c == null) return;
      const chg  = q.c - q.pc;
      const pct  = (chg / q.pc) * 100;
      const dir  = chg >= 0 ? "up" : "down";
      const sign = chg >= 0 ? "+" : "";
      card.classList.remove("loading");
      card.querySelector(".idx-price").textContent = `$${fmt(q.c)}`;
      const chgEl = card.querySelector(".idx-change");
      chgEl.textContent = `${sign}$${fmt(Math.abs(chg))} (${sign}${fmt(pct)}%)`;
      chgEl.className   = `idx-change ${dir}`;
      card.classList.add(dir === "up" ? "card-up" : "card-down");
    } catch (e) {
      console.warn("Index failed:", idx.symbol, e);
    }
  });
}

function refreshIndices() {
  CONFIG.INDEX_TICKERS.forEach(async (idx) => {
    try {
      const q    = await fhQuote(idx.symbol);
      const card = document.getElementById(`idx-${idx.symbol}`);
      if (!card || q.c == null) return;
      const chg  = q.c - q.pc;
      const pct  = (chg / q.pc) * 100;
      const dir  = chg >= 0 ? "up" : "down";
      const sign = chg >= 0 ? "+" : "";
      card.querySelector(".idx-price").textContent = `$${fmt(q.c)}`;
      const chgEl = card.querySelector(".idx-change");
      chgEl.textContent = `${sign}$${fmt(Math.abs(chg))} (${sign}${fmt(pct)}%)`;
      chgEl.className   = `idx-change ${dir}`;
      card.classList.remove("card-up", "card-down");
      card.classList.add(dir === "up" ? "card-up" : "card-down");
    } catch (e) { /* silent */ }
  });
}

// ── TradingView chart widget ─────────────────────

function loadTVChart(tvSymbol) {
  const wrap = document.getElementById("tv-chart-wrap");
  wrap.innerHTML = "";

  const container = document.createElement("div");
  container.id = "tv_chart_container";
  wrap.appendChild(container);

  const script = document.createElement("script");
  script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
  script.async = true;
  script.innerHTML = JSON.stringify({
    autosize: true,
    symbol: tvSymbol,
    interval: "D",
    timezone: "America/New_York",
    theme: "dark",
    style: "2",
    locale: "en",
    backgroundColor: "#0a1c35",
    gridColor: "rgba(74,144,217,0.06)",
    hide_top_toolbar: false,
    hide_legend: false,
    save_image: false,
    calendar: false,
    support_host: "https://www.tradingview.com",
  });
  container.appendChild(script);
}

// ── Watchlist — rows appear as each quote arrives ─

function buildWatchlist() {
  const tbody = document.getElementById("watchlist-body");
  updateMarketStatus();

  // First pass: create placeholder rows immediately
  tbody.innerHTML = "";
  CONFIG.WATCHLIST.forEach((item) => {
    const tr = document.createElement("tr");
    tr.id = `wl-${item.ticker}`;
    tr.innerHTML = `
      <td class="td-ticker">${item.ticker}</td>
      <td class="td-name">${item.name}</td>
      <td colspan="6"><div class="shimmer" style="height:14px;border-radius:4px;"></div></td>
      <td><span class="signal-pill ${item.signal === "buy" ? "sig-buy" : item.signal === "hold" ? "sig-hold" : "sig-watch"}">${item.signal}</span></td>
    `;
    tbody.appendChild(tr);
  });

  // Each row fetches and fills independently
  CONFIG.WATCHLIST.forEach(async (item) => {
    try {
      const q   = await fhQuote(item.ticker);
      const tr  = document.getElementById(`wl-${item.ticker}`);
      if (!tr || q.c == null) return;
      const chg  = q.c - q.pc;
      const pct  = (chg / q.pc) * 100;
      const dir  = chg >= 0 ? "up" : "down";
      const sign = chg >= 0 ? "+" : "";
      const sigClass = item.signal === "buy" ? "sig-buy" : item.signal === "hold" ? "sig-hold" : "sig-watch";
      tr.innerHTML = `
        <td class="td-ticker">${item.ticker}</td>
        <td class="td-name">${item.name}</td>
        <td class="td-price">$${fmt(q.c)}</td>
        <td class="td-change ${dir}">${sign}$${fmt(Math.abs(chg))}</td>
        <td class="td-pct ${dir}">${sign}${fmt(pct)}%</td>
        <td class="td-hl">$${fmt(q.h)}</td>
        <td class="td-hl">$${fmt(q.l)}</td>
        <td class="td-hl">$${fmt(q.o)}</td>
        <td><span class="signal-pill ${sigClass}">${item.signal}</span></td>
      `;
    } catch (e) {
      console.warn("Watchlist row failed:", item.ticker, e);
    }
  });
}

function refreshWatchlist() {
  CONFIG.WATCHLIST.forEach(async (item) => {
    try {
      const q  = await fhQuote(item.ticker);
      const tr = document.getElementById(`wl-${item.ticker}`);
      if (!tr || q.c == null) return;
      const chg  = q.c - q.pc;
      const pct  = (chg / q.pc) * 100;
      const dir  = chg >= 0 ? "up" : "down";
      const sign = chg >= 0 ? "+" : "";
      const sigClass = item.signal === "buy" ? "sig-buy" : item.signal === "hold" ? "sig-hold" : "sig-watch";
      tr.innerHTML = `
        <td class="td-ticker">${item.ticker}</td>
        <td class="td-name">${item.name}</td>
        <td class="td-price">$${fmt(q.c)}</td>
        <td class="td-change ${dir}">${sign}$${fmt(Math.abs(chg))}</td>
        <td class="td-pct ${dir}">${sign}${fmt(pct)}%</td>
        <td class="td-hl">$${fmt(q.h)}</td>
        <td class="td-hl">$${fmt(q.l)}</td>
        <td class="td-hl">$${fmt(q.o)}</td>
        <td><span class="signal-pill ${sigClass}">${item.signal}</span></td>
      `;
    } catch (e) { /* silent */ }
  });
}

// ── News ─────────────────────────────────────────

async function loadNews() {
  const list = document.getElementById("news-list");
  try {
    const res      = await fetch(`${FH}/news?category=general&minId=0&token=${KEY}`);
    const articles = await res.json();
    if (!articles?.length) { list.innerHTML = "<div class='news-loading'>No news available.</div>"; return; }
    list.innerHTML = "";
    articles.slice(0, CONFIG.NEWS_COUNT).forEach((a) => {
      const age    = Math.floor((Date.now() / 1000 - a.datetime) / 3600);
      const ageStr = age < 1 ? "< 1h ago" : age < 24 ? `${age}h ago` : `${Math.floor(age / 24)}d ago`;
      const div    = document.createElement("div");
      div.className = "news-item";
      div.innerHTML = `
        <div class="news-source">${a.source || "News"} <span class="news-age">${ageStr}</span></div>
        <a class="news-headline" href="${a.url}" target="_blank" rel="noopener">${a.headline}</a>
        <div class="news-summary">${(a.summary || "").slice(0, 120)}${(a.summary?.length > 120) ? "…" : ""}</div>
      `;
      list.appendChild(div);
    });
  } catch (e) {
    list.innerHTML = "<div class='news-loading'>Failed to load news.</div>";
  }
}

// ── Chart dropdown ────────────────────────────────

function buildChartDropdown() {
  const sel = document.getElementById("ticker-select");
  sel.innerHTML = "";
  CONFIG.CHART_TICKERS.forEach((t) => {
    const opt = document.createElement("option");
    opt.value       = t.tv;
    opt.textContent = t.label;
    if (t.tv === currentTV) opt.selected = true;
    sel.appendChild(opt);
  });
}

document.getElementById("ticker-select").addEventListener("change", (e) => {
  currentTV = e.target.value;
  loadTVChart(currentTV);
});

// ── Last updated ──────────────────────────────────

function setLastUpdated() {
  const el = document.getElementById("last-updated");
  if (el) el.textContent = "Last updated: " + new Date().toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

// ── Periodic refresh (quotes + news only, chart stays) ──

function periodicRefresh() {
  refreshIndices();
  refreshWatchlist();
  loadNews();
  setLastUpdated();
  updateMarketStatus();
}

// ── Boot ──────────────────────────────────────────

buildChartDropdown();
buildIndicesBar();
buildWatchlist();
loadTVChart(currentTV);
loadNews();
setLastUpdated();
startClock();
startCountdown();

setInterval(() => {
  periodicRefresh();
  startCountdown();
}, CONFIG.REFRESH_INTERVAL_MS);
