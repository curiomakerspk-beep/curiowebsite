/**
 * Curio Makerlabs — site behaviour.
 * Vanilla JS, no build step. Split into small, independent modules that
 * each wire up one piece of the page: scroll reveals, animated counters,
 * the Studio screenshot carousel, and the interactive sensor demo.
 * Hover states live entirely in css/styles.css (:hover rules) — nothing
 * to wire up here.
 */
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  applyAccent();
  wireReveals();
  wireCounters();
  wireStudioSwiper();
  wireSensorDemo();
});

/* ------------------------------------------------------------------ */
/* Brand accent                                                        */
/* ------------------------------------------------------------------ */
function applyAccent(accent) {
  const root = document.querySelector("[data-curio-root]");
  if (root) root.style.setProperty("--accent", accent || "#4A75D1");
}

/* ------------------------------------------------------------------ */
/* Scroll reveal for [data-reveal] elements                            */
/* ------------------------------------------------------------------ */
function wireReveals() {
  const reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nodes = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if (reduce || !("IntersectionObserver" in window)) return;

  nodes.forEach((el, i) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(22px)";
    el.style.transition =
      "opacity .7s cubic-bezier(.2,.8,.2,1) " + ((i % 4) * 70) + "ms, " +
      "transform .7s cubic-bezier(.2,.8,.2,1) " + ((i % 4) * 70) + "ms";
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.style.opacity = "1";
        entry.target.style.transform = "none";
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
  );
  nodes.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------ */
/* Animated counters for [data-count]                                  */
/* ------------------------------------------------------------------ */
function wireCounters() {
  const reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const counters = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
  if (reduce || !("IntersectionObserver" in window)) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        runCount(entry.target);
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach((el) => io.observe(el));
}

function runCount(el) {
  const target = parseFloat(el.getAttribute("data-count"));
  const suffix = el.getAttribute("data-suffix") || "";
  const duration = 1100;
  const t0 = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased) + (progress === 1 ? suffix : "");
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------ */
/* Studio screenshot carousel                                          */
/* ------------------------------------------------------------------ */
function wireStudioSwiper() {
  const el = document.querySelector(".studio-swiper");
  if (!el) return;

  const tryInit = () => {
    if (!window.Swiper) {
      requestAnimationFrame(tryInit);
      return;
    }
    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    new window.Swiper(el, {
      loop: true,
      speed: 550,
      grabCursor: true,
      pagination: { el: el.querySelector(".swiper-pagination"), clickable: true },
      navigation: {
        nextEl: el.querySelector(".swiper-button-next"),
        prevEl: el.querySelector(".swiper-button-prev"),
      },
      autoplay: reduce ? false : { delay: 3200, disableOnInteraction: false, pauseOnMouseEnter: true },
    });
  };
  tryInit();
}

/* ------------------------------------------------------------------ */
/* Interactive sensor demo                                             */
/* ------------------------------------------------------------------ */
function wireSensorDemo() {
  const root = document.getElementById("demo");
  if (!root) return;

  const sensors = [
    { id: "ir", name: "IR Proximity", mode: "Digital", unit: "cm", min: 2, max: 60, dec: 0, op: "<" },
    { id: "ultra", name: "Ultrasonic", mode: "Analog", unit: "cm", min: 4, max: 240, dec: 0, op: "<" },
    { id: "light", name: "Light (LDR)", mode: "Analog", unit: "lux", min: 12, max: 1100, dec: 0, op: "<" },
    { id: "sound", name: "Sound", mode: "Analog", unit: "dB", min: 32, max: 104, dec: 0, op: ">" },
    { id: "temp", name: "Temperature", mode: "Digital", unit: "°C", min: 16, max: 46, dec: 1, op: ">" },
    { id: "soil", name: "Soil Moisture", mode: "Analog", unit: "%", min: 4, max: 96, dec: 0, op: "<" },
  ];

  const state = { sensorId: "ir", port: "P2", power: true, threshold: 38, phase: 0.6, reading: null };

  const els = {
    sensorName: document.getElementById("demo-sensor-name"),
    sensorMode: document.getElementById("demo-sensor-mode"),
    sensorChips: root.querySelectorAll("[data-sensor-id]"),
    portChips: root.querySelectorAll("[data-port]"),
    powerOnBtn: document.getElementById("power-on-btn"),
    powerOffBtn: document.getElementById("power-off-btn"),
    thresholdRange: document.getElementById("threshold-range"),
    thresholdTextSlider: document.getElementById("threshold-text-slider"),
    livePortLabel: document.getElementById("live-port-label"),
    readingValue: document.getElementById("reading-value"),
    readingUnit: document.getElementById("reading-unit"),
    readingBarFill: document.getElementById("reading-bar-fill"),
    thresholdMarker: document.getElementById("threshold-marker"),
    statusDot: document.getElementById("status-dot"),
    statusText: document.getElementById("status-text"),
    programSensorPort: document.getElementById("program-sensor-port"),
    programCompare: document.getElementById("program-compare"),
    programThreshold: document.getElementById("program-threshold"),
    branchA: document.getElementById("branch-a"),
    branchB: document.getElementById("branch-b"),
  };
  if (!els.sensorName) return; // demo markup not present

  function sensor() {
    return sensors.find((s) => s.id === state.sensorId) || sensors[0];
  }

  function compute(phase) {
    const s = sensor();
    const span = s.max - s.min;
    const v = s.min + span * (0.5 + 0.42 * Math.sin(phase)) + (Math.random() - 0.5) * span * 0.045;
    return Math.max(s.min, Math.min(s.max, v));
  }

  function fmt(v) {
    return v.toFixed(sensor().dec);
  }

  function pctStr(n) {
    return Math.max(0, Math.min(100, n)).toFixed(1) + "%";
  }

  function setActive(list, matchAttr, value) {
    list.forEach((el) => {
      el.classList.toggle("active", el.getAttribute(matchAttr) === value);
    });
  }

  function render() {
    const s = sensor();
    const span = s.max - s.min;
    const thrRaw = state.threshold;
    const thrVal = s.min + span * (thrRaw / 100);
    const reading = state.reading == null ? s.min + span * 0.5 : state.reading;
    const pct = Math.max(2, Math.min(100, ((reading - s.min) / span) * 100));
    const triggered = state.power && (s.op === "<" ? reading < thrVal : reading > thrVal);
    const live = state.power;

    const hot = "#FF7A45", cool = "#4ADE80", off = "#93A0B8";
    const readingColor = !live ? off : triggered ? hot : cool;

    els.sensorName.textContent = s.name;
    els.sensorMode.textContent = s.mode;
    setActive(els.sensorChips, "data-sensor-id", state.sensorId);
    setActive(els.portChips, "data-port", state.port);
    els.powerOnBtn.classList.toggle("active", state.power);
    els.powerOffBtn.classList.toggle("active", !state.power);
    els.thresholdRange.value = String(thrRaw);
    els.livePortLabel.textContent = state.port;

    const thresholdText = fmt(thrVal) + " " + s.unit;
    els.thresholdTextSlider.textContent = thresholdText;
    els.programThreshold.textContent = thresholdText;

    els.readingValue.textContent = live ? fmt(reading) : "—";
    els.readingValue.style.color = readingColor;
    els.readingUnit.textContent = live ? s.unit : "";

    els.readingBarFill.style.background = readingColor;
    els.readingBarFill.style.width = live ? pctStr(pct) : "0%";
    els.thresholdMarker.style.left = pctStr(((thrVal - s.min) / span) * 100);

    els.statusDot.style.background = !live ? off : triggered ? hot : cool;
    els.statusText.style.color = readingColor;
    els.statusText.textContent = !live
      ? "Module powered down"
      : triggered
        ? "Threshold crossed — output high"
        : "Within range — output low";

    els.programSensorPort.textContent = s.name + " @ " + state.port;
    els.programCompare.textContent = s.op === "<" ? "is below" : "is above";

    const branchAbg = triggered ? "rgba(239,68,68,.16)" : "#EEF3FC";
    const branchAborder = triggered ? "rgba(239,68,68,.45)" : "rgba(22,33,62,.08)";
    const branchAtext = triggered ? "#B91C1C" : "#93A0B8";
    els.branchA.style.background = branchAbg;
    els.branchA.style.borderColor = branchAborder;
    els.branchA.style.color = branchAtext;

    const branchBActive = !triggered && live;
    els.branchB.style.background = branchBActive ? "rgba(34,197,94,.14)" : "#EEF3FC";
    els.branchB.style.borderColor = branchBActive ? "rgba(34,197,94,.4)" : "rgba(22,33,62,.08)";
    els.branchB.style.color = branchBActive ? "#15803D" : "#93A0B8";
  }

  els.sensorChips.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.sensorId = btn.getAttribute("data-sensor-id");
      render();
    });
  });
  els.portChips.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.port = btn.getAttribute("data-port");
      render();
    });
  });
  els.powerOnBtn.addEventListener("click", () => {
    state.power = true;
    render();
  });
  els.powerOffBtn.addEventListener("click", () => {
    state.power = false;
    render();
  });
  els.thresholdRange.addEventListener("input", (e) => {
    state.threshold = parseInt(e.target.value, 10);
    render();
  });

  state.reading = compute(state.phase);
  render();

  setInterval(() => {
    if (!state.power) return;
    state.phase += 0.33;
    state.reading = compute(state.phase);
    render();
  }, 640);
}
