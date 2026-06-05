(function () {
  "use strict";

  var hoursEl = document.getElementById("hours");
  var minutesEl = document.getElementById("minutes");
  var secondsEl = document.getElementById("seconds");
  var statusEl = document.getElementById("status");
  var quipEl = document.getElementById("quip");
  var subtitleEl = document.getElementById("subtitle");
  var fillEl = document.getElementById("hungerFill");

  // Quips shuffle through while we wait.
  var quips = [
    "She said she's \"not even that hungry.\" The clock disagrees.",
    "Oliver has been advised to pre-heat the oven. Now.",
    "Somewhere, a fridge is being opened and closed for the 9th time.",
    "Snacks are a delaying tactic. They will not work.",
    "Dinner reservations are not a suggestion tonight.",
    "The hangriness is approaching. Resistance is futile.",
    "Tip: have the pasta water boiling by 6:45.",
    "Scientists call this the 'Pre-Dinner Threat Window.'",
    "Oliver, this is your reminder to NOT say 'in a minute.'",
    "Current snack reserves: critically low.",
  ];
  var quipIndex = 0;

  // Build today's 7:00 PM US Eastern as an absolute instant, robust to DST.
  function get7pmEasternToday() {
    var now = new Date();
    // Find the Eastern wall-clock date components for "now".
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    var parts = fmt.formatToParts(now);
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    var y = map.year, m = map.month, d = map.day;

    // Determine Eastern's UTC offset right now by comparing the same instant
    // formatted in UTC vs Eastern.
    var offsetHours = getEasternOffsetHours(now);

    // 7 PM Eastern in UTC = 19:00 - offset (offset is negative, e.g. -4 or -5).
    var utcHour = 19 - offsetHours;
    // Construct the target as a UTC instant.
    var target = new Date(Date.UTC(
      parseInt(y, 10),
      parseInt(m, 10) - 1,
      parseInt(d, 10),
      utcHour, 0, 0
    ));
    return target;
  }

  // Returns Eastern's offset from UTC in hours (e.g. -4 for EDT, -5 for EST).
  function getEasternOffsetHours(date) {
    var dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      hour12: false,
      timeZoneName: "shortOffset",
    });
    var parts = dtf.formatToParts(date);
    var tzName = "";
    parts.forEach(function (p) {
      if (p.type === "timeZoneName") tzName = p.value;
    });
    // tzName like "GMT-4" or "GMT-5"
    var match = /GMT([+-]\d+)/.exec(tzName);
    if (match) return parseInt(match[1], 10);
    // Fallback: assume EST
    return -5;
  }

  var target = get7pmEasternToday();
  var prev = { h: null, m: null, s: null };
  var dayStartGap = null; // total seconds from first render to target, for meter

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function setDigit(el, value) {
    var str = pad(value);
    if (el.textContent !== str) {
      el.textContent = str;
      el.classList.remove("tick");
      // force reflow to restart animation
      void el.offsetWidth;
      el.classList.add("tick");
    }
  }

  function rotateQuip() {
    quipEl.style.opacity = "0";
    setTimeout(function () {
      quipIndex = (quipIndex + 1) % quips.length;
      quipEl.textContent = quips[quipIndex];
      quipEl.style.opacity = "1";
    }, 300);
  }

  function tick() {
    var now = new Date();
    var diff = Math.floor((target - now) / 1000);

    if (diff <= 0) {
      hoursEl.textContent = "00";
      minutesEl.textContent = "00";
      secondsEl.textContent = "00";
      statusEl.innerHTML = "<span class=\"emph\">IT IS 7 PM.</span> The hunger has arrived. 🚨";
      subtitleEl.textContent = "This is not a drill. Feed her immediately.";
      quipEl.textContent = "Oliver — go. Go now. 🏃‍♂️🍽️";
      fillEl.style.width = "100%";
      document.body.classList.add("hangry");
      return false; // stop
    }

    var h = Math.floor(diff / 3600);
    var m = Math.floor((diff % 3600) / 60);
    var s = diff % 60;

    setDigit(hoursEl, h);
    setDigit(minutesEl, m);
    setDigit(secondsEl, s);

    // Hunger meter: scaled against a 12-hour runway, capped.
    var runway = 12 * 3600;
    var elapsedRatio = 1 - Math.min(diff, runway) / runway;
    fillEl.style.width = (elapsedRatio * 100).toFixed(1) + "%";

    // Status text by how close we are.
    if (diff <= 60) {
      statusEl.innerHTML = "<span class=\"emph\">FINAL MINUTE.</span> Brace for hanger.";
      document.body.classList.add("hangry");
    } else if (diff <= 600) {
      statusEl.innerHTML = "until peak hunger — <span class=\"emph\">danger zone</span> 🥵";
    } else if (diff <= 3600) {
      statusEl.innerHTML = "until peak hunger — <span class=\"emph\">under an hour!</span>";
    } else {
      statusEl.textContent = "until Oliver's wife reaches peak hunger";
    }

    return true; // continue
  }

  // Initial paint + quip.
  quipEl.textContent = quips[0];
  if (!tick()) return;

  setInterval(tick, 1000);
  setInterval(rotateQuip, 5000);
})();
