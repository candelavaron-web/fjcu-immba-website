/* =========================================================
   Site behaviour: language toggle, navigation, reveal,
   tabs, lightbox, side-nav scrollspy, [data-icon] placeholders.
   Loaded at the end of <body> on every page (after data files).
   ========================================================= */
(function () {
  "use strict";
  var I = window.IMMBA;
  var root = document.documentElement;

  /* ---------- Language ---------- */
  function currentLang() { return root.getAttribute("data-lang") || "en"; }
  function applyLang(lang) {
    root.setAttribute("data-lang", lang);
    root.setAttribute("lang", lang === "zh" ? "zh-Hant" : "en");
    try { localStorage.setItem("immba-lang", lang); } catch (e) { /* storage unavailable */ }
    var b = document.body;
    var t = lang === "zh" ? b.getAttribute("data-title-zh") : b.getAttribute("data-title-en");
    if (t) document.title = t;
    document.querySelectorAll("[data-ph-en]").forEach(function (el) {
      el.setAttribute("placeholder", el.getAttribute(lang === "zh" ? "data-ph-zh" : "data-ph-en"));
    });
    document.querySelectorAll("[data-aria-en]").forEach(function (el) {
      el.setAttribute("aria-label", el.getAttribute(lang === "zh" ? "data-aria-zh" : "data-aria-en"));
    });
    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: lang } }));
  }
  document.body.setAttribute("data-title-en", document.body.getAttribute("data-title-en") || document.title);
  applyLang(currentLang());

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-lang-toggle]");
    if (!btn) return;
    applyLang(currentLang() === "en" ? "zh" : "en");
  });

  /* ---------- Icons: <span data-icon="award"></span> ---------- */
  document.querySelectorAll("[data-icon]").forEach(function (el) {
    var svg = I.ICONS[el.getAttribute("data-icon")];
    if (svg) el.innerHTML = svg;
  });

  /* ---------- Collapse main menu (notice-bar button, slide 2) ---------- */
  var collapseBtn = document.querySelector("[data-collapse-menu]");
  if (collapseBtn) {
    var setCollapsed = function (on) {
      document.body.classList.toggle("menu-collapsed", on);
      collapseBtn.setAttribute("aria-pressed", String(on));
      try { localStorage.setItem("immba-menu-collapsed", on ? "1" : "0"); } catch (e) { /* ignore */ }
    };
    var stored = null;
    try { stored = localStorage.getItem("immba-menu-collapsed"); } catch (e) { /* ignore */ }
    setCollapsed(stored === "1");
    collapseBtn.addEventListener("click", function () {
      setCollapsed(!document.body.classList.contains("menu-collapsed"));
    });
  }

  /* ---------- Header: scrolled state ---------- */
  var header = document.getElementById("site-header");
  function onScroll() { if (header) header.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu + dropdowns ---------- */
  var toggle = document.querySelector(".menu-toggle");
  var mq = window.matchMedia("(max-width: 980px)");
  if (toggle) {
    // The panel opens right below the header, wherever the header happens to be.
    var placeNav = function () {
      if (!header) return;
      document.documentElement.style.setProperty("--nav-top", Math.max(0, header.getBoundingClientRect().bottom) + "px");
    };
    toggle.addEventListener("click", function () {
      var open = !document.body.classList.contains("nav-open");
      placeNav();
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });
    // Tapping a link closes the menu and lets the page scroll to the section.
    document.querySelectorAll(".main-nav a[href]").forEach(function (a) {
      a.addEventListener("click", function () {
        if (document.body.classList.contains("nav-open")) toggle.click();
      });
    });
    window.addEventListener("resize", placeNav);
    window.addEventListener("scroll", function () {
      if (document.body.classList.contains("nav-open")) placeNav();
    }, { passive: true });
  }
  document.querySelectorAll(".has-dropdown > .nav-link").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.parentElement;
      var open = !item.classList.contains("open");
      document.querySelectorAll(".has-dropdown.open").forEach(function (o) {
        if (o !== item) { o.classList.remove("open"); o.firstElementChild.setAttribute("aria-expanded", "false"); }
      });
      item.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
  });
  document.addEventListener("click", function (e) {
    if (mq.matches || e.target.closest(".has-dropdown")) return;
    document.querySelectorAll(".has-dropdown.open").forEach(function (o) {
      o.classList.remove("open"); o.firstElementChild.setAttribute("aria-expanded", "false");
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".has-dropdown.open").forEach(function (o) {
      o.classList.remove("open"); o.firstElementChild.setAttribute("aria-expanded", "false");
    });
    if (document.body.classList.contains("nav-open") && toggle) toggle.click();
  });
  mq.addEventListener("change", function () {
    if (!mq.matches && document.body.classList.contains("nav-open") && toggle) toggle.click();
  });

  /* ---------- Reveal on scroll ----------
     A plain scroll check: reliable when the page loads on an anchor
     (#admissions) or is scrolled programmatically. */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var checkReveal = function () {
      var h = window.innerHeight || 800;
      reveals = reveals.filter(function (el) {
        if (el.getBoundingClientRect().top > h * 0.92) return true;
        el.classList.add("in");
        return false;
      });
    };
    window.addEventListener("scroll", checkReveal, { passive: true });
    window.addEventListener("resize", checkReveal);
    window.addEventListener("load", checkReveal);
    window.addEventListener("hashchange", checkReveal);
    checkReveal();
    setTimeout(checkReveal, 300);
  }

  /* ---------- Tabs: [data-tabs] > .tabs > button[data-tab=id] + .tab-panel#id ---------- */
  document.querySelectorAll("[data-tabs]").forEach(function (wrap) {
    var btns = wrap.querySelectorAll(".tab-btn");
    function select(id, updateHash) {
      btns.forEach(function (b) {
        var on = b.getAttribute("data-tab") === id;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(b.getAttribute("data-tab"));
        if (panel) panel.hidden = !on;
      });
      if (updateHash) history.replaceState(null, "", "#" + id);
    }
    btns.forEach(function (b, i) {
      b.setAttribute("role", "tab");
      b.addEventListener("click", function () { select(b.getAttribute("data-tab"), true); });
      b.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        var n = btns[(i + (e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length];
        n.focus(); n.click();
      });
    });
    var hash = location.hash.slice(1);
    var match = Array.prototype.some.call(btns, function (b) { return b.getAttribute("data-tab") === hash; });
    select(match ? hash : btns[0].getAttribute("data-tab"), false);
  });

  /* ---------- Side nav scrollspy ---------- */
  var sideLinks = document.querySelectorAll(".side-nav a[href^='#']");
  if (sideLinks.length && "IntersectionObserver" in window) {
    var map = {};
    sideLinks.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        sideLinks.forEach(function (a) { a.classList.remove("active"); });
        var link = map[en.target.id];
        if (link) link.classList.add("active");
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    Object.keys(map).forEach(function (id) { var t = document.getElementById(id); if (t) spy.observe(t); });
  }

  /* ---------- Lightbox: any [data-lightbox] button with data-src / data-caption-en / data-caption-zh ---------- */
  var lb, lbImg, lbCap, lbItems = [], lbIndex = 0;
  function buildLightbox() {
    lb = document.createElement("div");
    lb.className = "lightbox"; lb.hidden = true;
    lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true");
    lb.innerHTML = '<button class="lb-close" type="button" aria-label="Close">&times;</button>' +
      '<button class="lb-prev" type="button" aria-label="Previous">&#8249;</button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button class="lb-next" type="button" aria-label="Next">&#8250;</button>';
    document.body.appendChild(lb);
    lbImg = lb.querySelector("img"); lbCap = lb.querySelector("figcaption");
    lb.querySelector(".lb-close").addEventListener("click", closeLb);
    lb.querySelector(".lb-prev").addEventListener("click", function () { showLb(lbIndex - 1); });
    lb.querySelector(".lb-next").addEventListener("click", function () { showLb(lbIndex + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowRight") showLb(lbIndex + 1);
      if (e.key === "ArrowLeft") showLb(lbIndex - 1);
    });
  }
  function showLb(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    var el = lbItems[lbIndex];
    var zh = currentLang() === "zh";
    lbImg.src = el.getAttribute("data-src");
    lbImg.alt = el.getAttribute(zh ? "data-caption-zh" : "data-caption-en") || "";
    lbCap.textContent = lbImg.alt;
  }
  function closeLb() { lb.hidden = true; document.body.style.overflow = ""; if (lbItems[lbIndex]) lbItems[lbIndex].focus(); }
  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-lightbox]");
    if (!trigger) return;
    if (!lb) buildLightbox();
    lbItems = Array.prototype.filter.call(document.querySelectorAll("[data-lightbox]"), function (el) { return el.offsetParent !== null; });
    lb.hidden = false; document.body.style.overflow = "hidden";
    showLb(lbItems.indexOf(trigger));
    lb.querySelector(".lb-close").focus();
  });

  /* ---------- Link types: mark external links with an icon (slide 32) ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('a[target="_blank"]').forEach(function (a) {
      if (a.classList.contains("btn") || a.classList.contains("brand") || a.querySelector(".ext-icon")) return;
      a.insertAdjacentHTML("beforeend", I.ICONS.external.replace("<svg ", '<svg class="ext-icon" '));
      var en = a.getAttribute("data-aria-en") || (a.textContent.trim() + " (opens in a new tab)");
      a.setAttribute("title", en);
    });
  });

  /* ---------- Landing on a #section: keep it in view while the page settles
     (images loading above would otherwise shift the target away). ---------- */
  if (location.hash.length > 1) {
    var target = document.getElementById(location.hash.slice(1));
    if (target) {
      var tries = 0;
      var keepInView = function () {
        target.scrollIntoView({ block: "start" });
        if (++tries < 8) setTimeout(keepInView, 200);
      };
      setTimeout(keepInView, 50);
    }
  }

  /* ---------- Current year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
