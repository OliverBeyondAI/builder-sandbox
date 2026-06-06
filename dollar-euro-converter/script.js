// ---- USD → EUR Converter ----
// Indicative mid-market rate. With no backend we simulate a "live" rate that
// wobbles slightly around a base so the UI feels alive, but stays stable
// enough to read. Purely illustrative.

const BASE_RATE = 0.9215; // 1 USD ≈ this many EUR (illustrative)
let midRate = BASE_RATE;

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
};

const eur = (n) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n) => `${n.toFixed(1)}%`;

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

// ---- Input formatting ----
els.usd.addEventListener("input", () => {
  // Track caret distance from end so reformatting doesn't yank the cursor.
  render();
});

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

// ---- Simulated live rate drift ----
// Small, smooth wobble around the base so the "Mid-market" chip feels live.
let t = 0;
setInterval(() => {
  t += 0.5;
  // ±0.15% sinusoidal drift, deterministic and gentle
  midRate = BASE_RATE * (1 + Math.sin(t) * 0.0015 + Math.sin(t * 0.37) * 0.0007);
  render();
}, 2500);

// Init
syncQuickActive(parseUSD(els.usd.value));
render();
