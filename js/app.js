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
  wireNav();
  wireReveals();
  wireCounters();
  wireStudioSwiper();
  wireSensorDemo();
  wireContactForm();
});

/* ------------------------------------------------------------------ */
/* Brand accent                                                        */
/* ------------------------------------------------------------------ */
function applyAccent(accent) {
  const root = document.querySelector("[data-curio-root]");
  if (root) root.style.setProperty("--accent", accent || "#4A75D1");
}

/* ------------------------------------------------------------------ */
/* Sticky nav — mobile hamburger toggle + scrolled shadow              */
/* ------------------------------------------------------------------ */
function wireNav() {
  const nav = document.querySelector(".nav");
  const toggle = document.getElementById("nav-toggle");
  const links = document.getElementById("nav-links");
  if (!nav) return;

  const setShadow = () => {
    nav.classList.toggle("nav--scrolled", window.scrollY > 4);
  };
  setShadow();
  window.addEventListener("scroll", setShadow, { passive: true });

  if (!toggle || !links) return;

  const closeMenu = () => {
    toggle.setAttribute("aria-expanded", "false");
    links.classList.remove("is-open");
  };
  const openMenu = () => {
    toggle.setAttribute("aria-expanded", "true");
    links.classList.add("is-open");
  };

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    if (isOpen) closeMenu();
    else openMenu();
  });

  links.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 880) closeMenu();
  });
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

/* ------------------------------------------------------------------ */
/* Contact form — sends live via EmailJS (https://www.emailjs.com).    */
/* Fill in the three IDs below from your EmailJS dashboard:            */
/*   1. Add an Email Service pointed at sales@curiomaker.ai's inbox    */
/*      → gives you EMAILJS_SERVICE_ID                                 */
/*   2. Create a Template with {{name}} {{email}} {{phone}}            */
/*      {{message}} placeholders → gives you EMAILJS_TEMPLATE_ID       */
/*   3. Account → General → Public Key → EMAILJS_PUBLIC_KEY            */
/* Until all three are filled in, the form falls back to opening the   */
/* visitor's own email client with the message pre-filled.             */
/* ------------------------------------------------------------------ */
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";

function wireContactForm() {
  const form = document.querySelector(".contact-form");
  if (!form) return;

  const submitBtn = form.querySelector(".btn-form-submit");
  const statusEl = form.querySelector(".form-status");

  const isConfigured =
    EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY" &&
    EMAILJS_SERVICE_ID !== "YOUR_SERVICE_ID" &&
    EMAILJS_TEMPLATE_ID !== "YOUR_TEMPLATE_ID";

  if (isConfigured && window.emailjs) {
    window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!isConfigured || !window.emailjs) {
      sendViaMailto(form);
      return;
    }

    setFormStatus(statusEl, "Sending…", "");
    if (submitBtn) submitBtn.disabled = true;

    window.emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, form).then(
      () => {
        setFormStatus(statusEl, "Message sent — we’ll get back to you soon.", "ok");
        form.reset();
        if (submitBtn) submitBtn.disabled = false;
      },
      (err) => {
        console.error("EmailJS error:", err);
        setFormStatus(
          statusEl,
          "Couldn’t send that — email us directly at sales@curiomaker.ai.",
          "error"
        );
        if (submitBtn) submitBtn.disabled = false;
      }
    );
  });
}

function setFormStatus(el, text, kind) {
  if (!el) return;
  el.textContent = text;
  el.className = "form-status" + (kind ? " form-status--" + kind : "");
}

/* Fallback used until EmailJS is configured (see constants above), or  */
/* if the EmailJS request itself fails to load.                        */
function sendViaMailto(form) {
  const name = (form.querySelector("#contact-name") || {}).value || "";
  const phone = (form.querySelector("#contact-phone") || {}).value || "";
  const email = (form.querySelector("#contact-email") || {}).value || "";
  const message = (form.querySelector("#contact-message") || {}).value || "";

  const subject = "Website enquiry from " + (name || "a visitor");
  const bodyLines = [
    "Name: " + name,
    "Phone: " + (phone || "-"),
    "Email: " + email,
    "",
    message,
  ];

  const mailto =
    "mailto:sales@curiomaker.ai" +
    "?subject=" + encodeURIComponent(subject) +
    "&body=" + encodeURIComponent(bodyLines.join("\n"));

  window.location.href = mailto;
}
