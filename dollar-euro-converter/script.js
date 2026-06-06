// ---- USD → EUR Converter ----
// Fetches the real, live mid-market USD→EUR rate client-side from the free,
// no-key Frankfurter.app API (https://api.frankfurter.app). If the network
// call fails we fall back to a sensible cached rate so the tool stays usable,
// and the UI makes the state (loading / live / fallback / error) explicit.

// Frankfurter is a free, no-key public FX API. The legacy api.frankfurter.app
// host now 301-redirects to api.frankfurter.dev; we call the canonical endpoint
// directly to avoid redirect/CORS edge cases. Same JSON shape, ECB mid rates.
const API_URL = "https://api.frankfurter.dev/v1/latest?from=USD&to=EUR";

// Used only if the live fetch fails. Clearly labelled in the UI as a fallback.
const FALLBACK_RATE = 0.9215;
const FALLBACK_DATE = "2024-05-01";

let midRate = FALLBACK_RATE; // current working rate
let rateState = "loading"; // loading | live | fallback | error

const els = {
  usd: document.getElementById("usdInput"),
  quick: document.getElementById("quickAmounts"),
  spread: document.getElementById("spread"),
  spreadValue: document.getElementById("spreadValue"),
  effRate: document.getElementById("effRate"),
  effMid: document.getElementById("effMid"),
  midRate: document.getElementById("midRate"),
  eurOut: document.getElementById("eurOut"),
  barNet: document.getElementById("barNet"),
  barFee: document.getElementById("barFee"),
  netVal: document.getElementById("netVal"),
  feeVal: document.getElementById("feeVal"),
  feeNote: document.getElementById("feeNote"),
  rateChip: document.getElementById("rateChip"),
  rateLabel: document.getElementById("rateLabel"),
  source: document.getElementById("source"),
  sourceText: document.getElementById("sourceText"),
  retryBtn: document.getElementById("retryBtn"),
};

const eur = (n) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n) => `${n.toFixed(1)}%`;

// Format an ISO date (YYYY-MM-DD) into something friendly. Parsed as UTC to
// avoid off-by-one shifts from the local timezone.
function prettyDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Parse the loosely-formatted USD input into a number.
function parseUSD(str) {
  const cleaned = String(str).replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const normalized = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
  const val = parseFloat(normalized);
  return isNaN(val) || val < 0 ? 0 : val;
}

function render() {
  const usd = parseUSD(els.usd.value);
  const spread = parseFloat(els.spread.value);

  // Mid-market conversion (no fee)
  const grossEur = usd * midRate;
  // Effective rate after the exchange skims its spread
  const effective = midRate * (1 - spread / 100);
  const netEur = usd * effective;
  const feeEur = grossEur - netEur;

  // Labels
  els.spreadValue.textContent = pct(spread);
  els.midRate.textContent = midRate.toFixed(4);
  els.effRate.textContent = effective.toFixed(4);
  els.effMid.textContent = midRate.toFixed(4);
  els.eurOut.textContent = eur(netEur);
  els.netVal.textContent = "€" + eur(netEur);
  els.feeVal.textContent = "€" + eur(feeEur);

  // Bar widths — guard against the zero-amount case.
  const netPctWidth = grossEur > 0 ? (netEur / grossEur) * 100 : 100;
  els.barNet.style.width = netPctWidth + "%";
  els.barFee.style.width = 100 - netPctWidth + "%";

  // Note
  if (usd === 0) {
    els.feeNote.textContent = "Enter an amount to see the breakdown.";
  } else if (spread === 0) {
    els.feeNote.innerHTML =
      "At a 0% spread you receive the full mid-market value — no cut taken. Most real exchanges hide a markup here.";
  } else {
    els.feeNote.innerHTML =
      `On $${eur(usd)} the exchange quietly keeps <strong>€${eur(feeEur)}</strong> ` +
      `(${pct(spread)} of the mid-market value) through its spread. ` +
      `You'd lose roughly <strong>€${eur(feeEur)}</strong> versus the true rate.`;
  }
}

// ---- Rate fetching & state ----
function setChipState(state) {
  rateState = state;
  els.rateChip.classList.remove("is-loading", "is-live", "is-fallback", "is-error");
  els.rateChip.classList.add("is-" + state);
}

function setStatus(html, { showRetry = false } = {}) {
  els.sourceText.innerHTML = html;
  els.retryBtn.hidden = !showRetry;
}

async function fetchRate() {
  setChipState("loading");
  els.rateLabel.textContent = "Loading…";
  els.midRate.textContent = "—";
  setStatus("Fetching the latest USD&nbsp;→&nbsp;EUR rate…");

  try {
    // Guard against a hanging request so we don't sit on "Loading…" forever.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const rate = data && data.rates && data.rates.EUR;
    if (typeof rate !== "number" || !isFinite(rate)) {
      throw new Error("Malformed response");
    }

    // Success — go live.
    midRate = rate;
    setChipState("live");
    els.rateLabel.textContent = "Live";
    setStatus(
      `Live mid-market rate from ` +
        `<a href="https://frankfurter.dev/" target="_blank" rel="noopener">Frankfurter</a> ` +
        `· as of <strong>${prettyDate(data.date)}</strong>`
    );
  } catch (err) {
    // Network/parse failure — fall back to the cached rate but be transparent.
    midRate = FALLBACK_RATE;
    setChipState("fallback");
    els.rateLabel.textContent = "Offline";
    const reason = err && err.name === "AbortError" ? "the request timed out" : "the live rate couldn’t be reached";
    setStatus(
      `Couldn’t fetch a live rate — ${reason}. Showing a cached fallback ` +
        `(${FALLBACK_RATE.toFixed(4)}, as of ${prettyDate(FALLBACK_DATE)}). `,
      { showRetry: true }
    );
  }
  render();
}

// ---- Input formatting ----
els.usd.addEventListener("input", render);

els.usd.addEventListener("blur", () => {
  const val = parseUSD(els.usd.value);
  els.usd.value = val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  syncQuickActive(val);
  render();
});

els.spread.addEventListener("input", render);

// ---- Quick amounts ----
function syncQuickActive(val) {
  [...els.quick.children].forEach((b) =>
    b.classList.toggle("active", parseFloat(b.dataset.amt) === val)
  );
}
els.quick.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const amt = parseFloat(btn.dataset.amt);
  els.usd.value = amt.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  syncQuickActive(amt);
  render();
});

// ---- Refresh triggers ----
els.rateChip.addEventListener("click", fetchRate);
els.retryBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  fetchRate();
});

// Init
syncQuickActive(parseUSD(els.usd.value));
render();
fetchRate();
