/* =========================================================
   Shared layout: language init, header/nav, footer, icons.
   Loaded at the very top of <body> on every page:
     <body data-page="about" data-title-zh="...">
       <script src="assets/js/layout.js"></script>
   Edit NAV below to change the menu on every page at once.
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Language (set before anything paints) ---------- */
  function readStoredLang() {
    try { return localStorage.getItem("immba-lang"); } catch (e) { return null; }
  }
  var params = new URLSearchParams(location.search);
  var lang = params.get("lang");
  if (lang !== "en" && lang !== "zh") lang = readStoredLang();
  if (lang !== "en" && lang !== "zh") lang = /^zh/i.test(navigator.language || "") ? "zh" : "en";
  document.documentElement.setAttribute("data-lang", lang);
  document.documentElement.setAttribute("lang", lang === "zh" ? "zh-Hant" : "en");

  /* ---------- Icons (inline SVG, stroke = currentColor) ---------- */
  var s = function (d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  };
  var ICONS = {
    arrow: s('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    external: s('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    chev: '<svg class="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg>',
    info: s('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.2"/>'),
    globe: s('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    mail: s('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    phone: s('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
    pin: s('<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/>'),
    door: s('<path d="M4 21h16M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><circle cx="14.5" cy="12" r=".8" fill="currentColor"/>'),
    award: s('<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>'),
    rank: s('<path d="M8 21V11M16 21V7M12 21V3M4 21h16"/>'),
    users: s('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>'),
    plane: s('<path d="M10.5 13.5 3 11l1.5-1.5 8 1 4-4.5a2.1 2.1 0 0 1 3 3l-4.5 4 1 8L14.5 22l-2.5-7.5-3 3V20l-2-2-2-2h2.5z"/>'),
    book: s('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7"/>'),
    chart: s('<path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/>'),
    cpu: s('<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/><rect x="9.5" y="9.5" width="5" height="5"/>'),
    megaphone: s('<path d="M3 11v2a1 1 0 0 0 1 1h3l6 5V5L7 10H4a1 1 0 0 0-1 1ZM17 8a5 5 0 0 1 0 8"/>'),
    cap: s('<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6"/>'),
    calendar: s('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    doc: s('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
    search: s('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    coin: s('<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1 1.7 3 2 3 1 3 2.1-1.3 1.9-3 1.9c-1.4 0-2.6-.6-3-1.5M12 6v2M12 16v2"/>'),
    train: s('<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M9 21l1.5-4M15 21l-1.5-4"/><circle cx="9" cy="14" r=".6" fill="currentColor"/><circle cx="15" cy="14" r=".6" fill="currentColor"/>'),
    building: s('<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2 21h20M8 8h3M8 12h3M8 16h3"/>'),
    compass: s('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
    handshake: s('<path d="m11 17 2 2a1.4 1.4 0 0 0 2-2M13 15l2.5 2.5a1.4 1.4 0 0 0 2-2l-3-3M9.5 7.5 12 5a3 3 0 0 1 4 0l5 5M3 10l5-5 4 4-2.5 2.5a1.4 1.4 0 0 1-2-2M3 10l7.5 7.5a1.4 1.4 0 0 0 2-2"/>'),
    check: s('<path d="M20 6 9 17l-5-5"/>'),
    clock: s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5H16l.5-3h-3V8.6c0-.9.3-1.6 1.6-1.6h1.6V4.3c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.2H7.5v3h2.6V21z"/></svg>'
  };

  /* ---------- Navigation ---------- */
  /* Main menu — same tabs as the official imMBA site, in the same order.
     While only the landing page exists, each tab points to its section of
     index.html; when a real page is built, swap "#section" for "page.html". */
  var NAV = [
    { id: "about", en: "About", zh: "簡介", children: [
      { href: "#overview", en: "Overview and Ranking", zh: "特色與排名", den: "AACSB, rankings, history", dzh: "AACSB認證、排名與沿革" },
      { href: "#environment", en: "Our Learning Environment", zh: "學習環境", den: "Campus, facilities, location", dzh: "校園、設施與交通" }
    ]},
    { id: "admissions", en: "Admissions", zh: "招生資訊", children: [
      { href: "#admissions", en: "Apply for Fu Jen imMBA", zh: "MBA招生資訊", den: "International & local tracks", dzh: "外籍生與本地生管道" },
      { href: "#tuition", en: "Tuition & Scholarships", zh: "獎助學金資訊", den: "Fees and funding", dzh: "學雜費與各項獎學金" }
    ]},
    { id: "courses", en: "Courses", zh: "課程資訊", children: [
      { href: "#curriculum", en: "Curriculum and Requirements", zh: "課程與修業規則", den: "Credits, thesis, waivers", dzh: "學分、論文與抵免" }
    ]},
    { id: "faculty", en: "Faculty", zh: "師資介紹", href: "#faculty" },
    { id: "guide", en: "imMBA Guide", zh: "imMBA全攻略", href: "#guide" },
    { id: "graduation", en: "Graduation", zh: "畢業與離校", href: "#graduation" },
    { id: "dual", en: "Dual Degree", zh: "跨國雙碩士", href: "#dual-degree" },
    { id: "exchange", en: "Exchange", zh: "海外交換", href: "#exchange" },
    { id: "highlights", en: "Highlights", zh: "活動集錦", href: "#highlights" },
    { id: "news", en: "News", zh: "公告", href: "#news" },
    { id: "download", en: "Download", zh: "表格下載", href: "#resources" }
  ];

  var EXTERNAL = {
    college: "https://www.management.fju.edu.tw/",
    fjcu: "https://www.fju.edu.tw/",
    isc: "http://isc.oie.fju.edu.tw/generalServices.jsp?labelID=39",
    library: "https://home.lib.fju.edu.tw/TC/essaywriting",
    apply: "http://idsasys.oie.fju.edu.tw/",
    calendar: "http://www.secretariat.fju.edu.tw/article.jsp?articleID=8"
  };

  var bi = function (en, zh) {
    return '<span lang="en">' + en + '</span><span lang="zh-Hant">' + zh + "</span>";
  };

  var page = document.body.getAttribute("data-page") || "";
  var file = location.pathname.split("/").pop() || "index.html";

  function navHTML() {
    return NAV.map(function (item) {
      if (!item.children) {
        var act = item.id === page ? " active" : "";
        return '<li class="nav-item"><a class="nav-link' + act + '" href="' + item.href + '"' + (act ? ' aria-current="page"' : "") + ">" + bi(item.en, item.zh) + "</a></li>";
      }
      var groupActive = item.children.some(function (c) { return c.href === file; });
      var links = item.children.map(function (c) {
        var a = c.href === file;
        return '<li><a href="' + c.href + '"' + (a ? ' class="active" aria-current="page"' : "") + ">" + bi(c.en, c.zh) +
          "<small>" + bi(c.den, c.dzh) + "</small></a></li>";
      }).join("");
      return '<li class="nav-item has-dropdown"><button class="nav-link' + (groupActive ? " active" : "") + '" aria-expanded="false" type="button">' +
        bi(item.en, item.zh) + ICONS.chev + '</button><ul class="dropdown">' + links + "</ul></li>";
    }).join("");
  }

  var langBtn = function (cls) {
    return '<button type="button" class="lang-toggle ' + (cls || "") + '" data-lang-toggle aria-label="Switch language / 切換語言">' +
      ICONS.globe + '<span lang="en">中文</span><span lang="zh-Hant">EN</span></button>';
  };

  /* Shown on the left of the notice bar — put your student ID here. */
  var STUDENT = "Candela Varón · F15381051";

  var LOGO = '<svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true">' +
      '<rect width="64" height="64" rx="15" fill="#0a2342"/>' +
      '<g transform="rotate(-18 32 33)"><ellipse cx="32" cy="33" rx="23" ry="9.5" fill="none" stroke="#d6b25e" stroke-width="1.8"/>' +
      '<circle cx="55" cy="33" r="3.2" fill="#d6b25e"/></g>' +
      '<text x="32" y="42" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-size="27" font-weight="700" fill="#fff">im</text></svg>';

  var header = '' +
    /* 1. Top notice bar: teaching-site notice + official website link */
    '<a class="skip-link" href="#main">' + bi("Skip to content", "跳至主要內容") + "</a>" +
    '<div class="topbar"><div class="container">' +
      '<p class="notice"><span class="student">' + STUDENT + "</span>" + ICONS.info +
        '<span class="full">' + bi("Student project for the AI-Assisted Digital Product Development course — this is not the official website.",
           "本網站為 AI 輔助數位產品開發課程之學生作品，非官方網站。") + "</span>" +
        '<span class="short">' + bi("Student project — not the official website.", "學生課程作品，非官方網站。") + "</span>" +
      "</p>" +
      '<div class="topbar-right">' +
        '<a class="ext" href="https://www.management.fju.edu.tw/esubweb/immbaengindex/" target="_blank" rel="noopener">' +
          bi("Official imMBA website", "官方網站") + "</a>" +
        '<button type="button" class="collapse-menu" data-collapse-menu>' +
          '<span class="when-open">' + bi("Collapse main menu", "收合主選單") + "</span>" +
          '<span class="when-closed">' + bi("Show main menu", "展開主選單") + "</span></button>" +
      "</div>" +
    "</div></div>" +
    /* 2. Branding header: logo + program name */
    '<div class="brandbar"><div class="container">' +
      '<a class="brand" href="index.html" aria-label="FJCU imMBA home">' + LOGO +
        '<span class="brand-text"><span class="brand-name">' +
          bi("Fu Jen Catholic University International MBA", "輔仁大學國際經營管理碩士學位學程") + ' <span class="brand-abbr">(imMBA)</span></span>' +
        '<span class="brand-sub">' + bi("College of Management · AACSB accredited · Taught in English", "管理學院 ・ AACSB 國際認證 ・ 全英語授課") + "</span></span>" +
      "</a>" +
    "</div></div>" +
    /* 3. Navigation bar + 4. action area (language switch + Apply Now) */
    '<header class="site-header" id="site-header"><div class="container header-inner">' +
      '<nav class="main-nav" id="main-nav" aria-label="Main">' +
        '<ul class="nav-list">' + navHTML() + "</ul>" +
        '<a class="nav-secondary ext" href="' + EXTERNAL.college + '" target="_blank" rel="noopener">' +
          bi("College of Management", "管理學院") + "</a>" +
        '<a class="btn btn-gold btn-apply-mobile" href="#admissions">' + bi("Apply Now", "立即申請") + ICONS.arrow + "</a>" +
      "</nav>" +
      '<div class="header-actions">' +
        langBtn() +
        '<a class="btn btn-primary btn-sm btn-apply" href="#admissions">' + bi("Apply Now", "立即申請") + "</a>" +
        '<button class="menu-toggle" type="button" aria-controls="main-nav" aria-expanded="false" aria-label="Menu"><span></span></button>' +
      "</div>" +
    "</div></header>";

  var year = new Date().getFullYear();
  var footer = '' +
    '<div class="container footer-main">' +
      '<div class="footer-brand">' +
        '<a class="brand" href="index.html">' + LOGO + '<span class="brand-text"><span class="brand-name">FJCU imMBA</span>' +
        '<span class="brand-sub">' + bi("College of Management", "管理學院") + "</span></span></a>" +
        "<p>" + bi(
          "An AACSB-accredited, fully English-taught MBA at Fu Jen Catholic University, preparing global business leaders in Taipei since 2006.",
          "輔仁大學國際經營管理碩士學位學程，AACSB 認證、全英語授課，自 2006 年起於台北培育具國際移動力的管理人才。"
        ) + "</p>" +
      "</div>" +
      "<div><h4>" + bi("Program", "學程") + "</h4><ul>" +
        '<li><a href="#overview">' + bi("Overview & Rankings", "特色與排名") + "</a></li>" +
        '<li><a href="#curriculum">' + bi("Curriculum", "課程資訊") + "</a></li>" +
        '<li><a href="#dual-degree">' + bi("Dual Master's Degree", "跨國雙碩士") + "</a></li>" +
        '<li><a href="#faculty">' + bi("Faculty", "師資介紹") + "</a></li>" +
        '<li><a href="#news">' + bi("News", "最新消息") + "</a></li>" +
      "</ul></div>" +
      "<div><h4>" + bi("Resources", "資源") + "</h4><ul>" +
        '<li><a href="#admissions">' + bi("Admissions", "招生資訊") + "</a></li>" +
        '<li><a href="#resources">' + bi("Forms & Downloads", "表格下載") + "</a></li>" +
        '<li><a href="' + EXTERNAL.isc + '" target="_blank" rel="noopener">' + bi("International Student Center", "國際學生中心") + "</a></li>" +
        '<li><a href="' + EXTERNAL.library + '" target="_blank" rel="noopener">' + bi("FJCU Library", "輔大圖書館") + "</a></li>" +
        '<li><a href="' + EXTERNAL.college + '" target="_blank" rel="noopener">' + bi("College of Management", "管理學院") + "</a></li>" +
      "</ul></div>" +
      '<div><h4>' + bi("Contact", "聯絡我們") + '</h4><ul class="footer-contact">' +
        "<li>" + ICONS.pin + "<span>" + bi("Office LM208-1, No. 510 Zhongzheng Rd., Xinzhuang Dist., New Taipei City 24205, Taiwan", "24205 新北市新莊區中正路510號 利瑪竇大樓 LM208-1") + "</span></li>" +
        "<li>" + ICONS.phone + '<a href="tel:+886229052750">+886-2-2905-2750</a></li>' +
        "<li>" + ICONS.mail + '<a href="mailto:imMBA@mail.fju.edu.tw">imMBA@mail.fju.edu.tw</a></li>' +
      "</ul></div>" +
    "</div>" +
    '<div class="footer-bottom"><div class="container">' +
      "<span>© 2012–" + year + " " + bi("College of Management, Fu Jen Catholic University. All rights reserved.", "輔仁大學管理學院 版權所有") + "</span>" +
      '<button type="button" class="footer-lang" data-lang-toggle>' + ICONS.globe + bi("中文版", "English") + "</button>" +
    "</div></div>";

  document.write(header);

  document.addEventListener("DOMContentLoaded", function () {
    var f = document.createElement("footer");
    f.className = "site-footer";
    f.innerHTML = footer;
    document.body.appendChild(f);
  });

  // Expose helpers for main.js and page scripts
  window.IMMBA = { ICONS: ICONS, bi: bi, EXTERNAL: EXTERNAL, NAV: NAV };
})();
