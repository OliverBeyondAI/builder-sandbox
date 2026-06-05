(function () {
  "use strict";

  const bill = document.getElementById("bill");
  const tip = document.getElementById("tip");
  const tipLabel = document.getElementById("tipLabel");
  const people = document.getElementById("people");
  const peopleLabel = document.getElementById("peopleLabel");
  const presets = document.getElementById("presets");
  const minus = document.getElementById("minus");
  const plus = document.getElementById("plus");
  const reset = document.getElementById("reset");

  const tipTotalEl = document.getElementById("tipTotal");
  const grandTotalEl = document.getElementById("grandTotal");
  const perPersonEl = document.getElementById("perPerson");

  const money = (n) =>
    "$" + (isFinite(n) ? n : 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  function syncPresets(pct) {
    presets.querySelectorAll(".preset").forEach((b) => {
      b.classList.toggle("is-active", Number(b.dataset.tip) === pct);
    });
  }

  function calculate() {
    const billAmt = Math.max(0, parseFloat(bill.value) || 0);
    const tipPct = Math.max(0, parseInt(tip.value, 10) || 0);
    const count = Math.max(1, parseInt(people.value, 10) || 1);

    const tipTotal = billAmt * (tipPct / 100);
    const grandTotal = billAmt + tipTotal;
    const perPerson = grandTotal / count;

    tipLabel.textContent = tipPct;
    peopleLabel.textContent = count;
    tipTotalEl.textContent = money(tipTotal);
    grandTotalEl.textContent = money(grandTotal);
    perPersonEl.textContent = money(perPerson);
  }

  presets.addEventListener("click", (e) => {
    const btn = e.target.closest(".preset");
    if (!btn) return;
    tip.value = btn.dataset.tip;
    syncPresets(Number(btn.dataset.tip));
    calculate();
  });

  tip.addEventListener("input", () => {
    syncPresets(Number(tip.value));
    calculate();
  });

  function bump(delta) {
    const next = Math.max(1, (parseInt(people.value, 10) || 1) + delta);
    people.value = next;
    calculate();
  }
  minus.addEventListener("click", () => bump(-1));
  plus.addEventListener("click", () => bump(1));

  people.addEventListener("input", calculate);
  people.addEventListener("blur", () => {
    if (!people.value || parseInt(people.value, 10) < 1) people.value = 1;
    calculate();
  });
  bill.addEventListener("input", calculate);

  reset.addEventListener("click", () => {
    bill.value = "";
    tip.value = 15;
    people.value = 1;
    syncPresets(15);
    calculate();
    bill.focus();
  });

  calculate();
})();
