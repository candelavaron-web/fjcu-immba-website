/* =========================================================
   Back office: authentication, roles and faculty management.
   Reads and writes through window.DB (assets/js/supabase-client.js).
   ========================================================= */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
  var views = {
    setup: $("view-setup"),
    auth: $("view-auth"),
    pending: $("view-pending"),
    admin: $("view-admin")
  };
  var state = { user: null, profile: null, rows: [], editing: null, pendingFile: null };

  function show(name) {
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== name; });
    $("admin-user").hidden = !(state.user && (name === "admin" || name === "pending"));
  }

  var toastTimer;
  function toast(message, isError) {
    var el = $("toast");
    el.textContent = message;
    el.classList.toggle("error", Boolean(isError));
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, isError ? 6000 : 3200);
  }

  if (!window.DB || !DB.configured || !DB.client) {
    show("setup");
    return;
  }

  /* ---------------------------------------------------------
     Authentication (slide 17: register, verify, login, reset)
     --------------------------------------------------------- */
  /* Show / hide password (the eye) */
  var EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.4 5.3A9.8 9.8 0 0 1 12 5c6.4 0 10 6 10 6a17.6 17.6 0 0 1-3.5 4.1M6.2 7.2A17.4 17.4 0 0 0 2 11s3.6 6 10 6a9.7 9.7 0 0 0 3.2-.5"/></svg>';

  document.querySelectorAll("[data-reveal]").forEach(function (btn) {
    btn.innerHTML = EYE;
    btn.addEventListener("click", function () {
      var input = $(btn.getAttribute("data-reveal"));
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.innerHTML = show ? EYE_OFF : EYE;
      btn.setAttribute("aria-pressed", String(show));
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      input.focus();
    });
  });

  /* The two passwords must match before an account can be created */
  function passwordsMatch() {
    var a = $("auth-password").value;
    var b = $("auth-password-confirm").value;
    var note = $("password-match");
    if (mode !== "signup" || !b) { note.textContent = ""; note.className = "form-note"; return !b ? false : true; }
    var ok = a === b;
    note.textContent = ok ? "Passwords match." : "The two passwords are different.";
    note.className = "form-note " + (ok ? "is-ok" : "is-error");
    return ok;
  }

  var mode = "signin"; // signin | signup | reset

  function setMode(next) {
    mode = next;
    var isSignup = mode === "signup";
    var isReset = mode === "reset";
    $("auth-title").textContent = isSignup ? "Create an account" : isReset ? "Reset your password" : "Sign in";
    $("auth-intro").textContent = isSignup
      ? "New accounts start as pending until a super administrator approves them."
      : isReset
        ? "We will email you a link to choose a new password."
        : "Administrators of the imMBA website only.";
    $("auth-submit").textContent = isSignup ? "Create account" : isReset ? "Send reset link" : "Sign in";
    $("field-name").hidden = !isSignup;
    $("field-password").hidden = isReset;
    $("field-password-confirm").hidden = !isSignup;
    $("auth-password-confirm").required = isSignup;
    $("password-match").textContent = "";
    $("auth-password").required = !isReset;
    $("auth-password").setAttribute("autocomplete", isSignup ? "new-password" : "current-password");
    $("password-hint").hidden = !isSignup;
    document.querySelector('[data-auth-mode="signup"]').hidden = isSignup;
    document.querySelector('[data-auth-mode="signin"]').hidden = mode === "signin";
    document.querySelector('[data-auth-mode="reset"]').hidden = isReset;
  }

  document.querySelectorAll("[data-auth-mode]").forEach(function (btn) {
    btn.addEventListener("click", function () { setMode(btn.getAttribute("data-auth-mode")); });
  });

  $("auth-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("auth-email").value.trim();
    var password = $("auth-password").value;
    var name = $("auth-name").value.trim();
    var submit = $("auth-submit");
    submit.disabled = true;

    var done = function (res) {
      submit.disabled = false;
      if (res && res.error) { toast(res.error.message, true); return false; }
      return true;
    };

    if (mode === "signup") {
      if (password !== $("auth-password-confirm").value) {
        submit.disabled = false;
        passwordsMatch();
        toast("The two passwords are different.", true);
        return;
      }
      DB.signUp(email, password, name).then(function (res) {
        if (!done(res)) return;
        toast("Account created. Check your inbox to verify the email address.");
        setMode("signin");
      });
    } else if (mode === "reset") {
      DB.resetPassword(email).then(function (res) {
        if (!done(res)) return;
        toast("If that address exists, a reset link is on its way.");
        setMode("signin");
      });
    } else {
      DB.signIn(email, password).then(function (res) {
        if (!done(res)) return;
        $("auth-form").reset();
      });
    }
  });

  $("auth-password").addEventListener("input", passwordsMatch);
  $("auth-password-confirm").addEventListener("input", passwordsMatch);

  $("sign-out").addEventListener("click", function () {
    DB.signOut().then(function () { location.reload(); });
  });

  /* ---------------------------------------------------------
     Session → role → which view to show (slide 18)
     --------------------------------------------------------- */
  function applySession(session) {
    state.user = session ? session.user : null;
    if (!state.user) { state.profile = null; show("auth"); return; }

    DB.getProfile(state.user.id).then(function (res) {
      state.profile = res.data || null;
      var role = state.profile ? state.profile.role : "pending";
      $("user-email").textContent = state.user.email;
      $("user-role").textContent = role.replace("_", " ");
      $("user-role").className = "badge " + (role === "pending" ? "gray" : role === "super_admin" ? "gold" : "green");

      if (role === "admin" || role === "super_admin") {
        show("admin");
        $("tab-admins-btn").hidden = role !== "super_admin";
        loadFaculty();
        loadNews();
        resetNewsForm();
        restoreDraft();
        loadAlumni();
        loadAudit();
        if (role === "super_admin") loadAdmins();
      } else {
        show("pending");
      }
    });
  }

  DB.getSession().then(function (res) { applySession(res.data ? res.data.session : null); });
  DB.onAuthChange(function (event, session) {
    if (event === "PASSWORD_RECOVERY") {
      var pwd = prompt("Choose a new password (at least 8 characters):");
      if (pwd) {
        DB.updatePassword(pwd).then(function (r) {
          toast(r.error ? r.error.message : "Password updated.", Boolean(r.error));
        });
      }
    }
    applySession(session);
  });

  /* ---------------------------------------------------------
     Faculty: list, create, update, delete, reorder
     --------------------------------------------------------- */
  function initials(name) {
    return (name || "?").split(" ").map(function (p) { return p[0]; }).slice(0, 2).join("").toUpperCase();
  }

  function loadFaculty() {
    DB.listFacultyRaw().then(function (res) {
      if (res.error) { toast(res.error.message, true); return; }
      state.rows = res.data || [];
      renderFaculty();
    });
  }

  function renderFaculty() {
    var list = $("faculty-list");
    var groups = [
      { key: "full", label: "Full-time faculty" },
      { key: "part", label: "Part-time faculty" }
    ];
    list.innerHTML = "";

    groups.forEach(function (group) {
      var rows = state.rows.filter(function (r) { return r.category === group.key; });
      if (!rows.length) return;
      var label = document.createElement("p");
      label.className = "group-label";
      label.textContent = group.label + " (" + rows.length + ")";
      list.appendChild(label);

      rows.forEach(function (row, i) {
        var el = document.createElement("div");
        el.className = "faculty-row";
        el.innerHTML =
          (row.image_url
            ? '<img class="thumb" src="' + row.image_url + '" alt="">'
            : '<span class="thumb">' + initials(row.name) + "</span>") +
          '<span class="who"><strong></strong><span></span></span>' +
          '<span class="row-actions">' +
            '<button class="icon-btn" type="button" data-act="up" title="Move up"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
            '<button class="icon-btn" type="button" data-act="down" title="Move down"' + (i === rows.length - 1 ? " disabled" : "") + ">↓</button>" +
          "</span>" +
          '<span class="row-actions">' +
            '<button class="icon-btn" type="button" data-act="edit" title="Edit">✎</button>' +
            '<button class="icon-btn danger" type="button" data-act="delete" title="Delete">🗑</button>' +
          "</span>";
        el.querySelector(".who strong").textContent = row.name + (row.name_zh ? " · " + row.name_zh : "");
        el.querySelector(".who span").textContent = [row.title, row.email].filter(Boolean).join(" · ");
        el.addEventListener("click", function (e) {
          var btn = e.target.closest("[data-act]");
          if (!btn) return;
          var act = btn.getAttribute("data-act");
          if (act === "edit") startEdit(row);
          if (act === "delete") removeRow(row, el);
          if (act === "up" || act === "down") move(row, rows, i, act === "up" ? -1 : 1, el);
        });
        list.appendChild(el);
      });
    });

    $("faculty-count").textContent = state.rows.length + " faculty members";
    if (!state.rows.length) {
      list.innerHTML = '<p class="empty-state">No faculty yet. Add the first one with the form above.</p>';
    }
  }

  function move(row, rows, index, delta, el) {
    var other = rows[index + delta];
    if (!other) return;
    el.classList.add("is-busy");
    DB.saveOrder([
      { id: row.id, sort_order: other.sort_order },
      { id: other.id, sort_order: row.sort_order }
    ]).then(function () {
      toast("Order updated.");
      loadFaculty();
    }).catch(function (err) {
      el.classList.remove("is-busy");
      toast(err.message || "Could not reorder.", true);
    });
  }

  function removeRow(row, el) {
    if (!confirm("Delete " + row.name + "? This cannot be undone.")) return;
    el.classList.add("is-busy");
    DB.deleteFaculty(row.id).then(function (res) {
      if (res.error) { el.classList.remove("is-busy"); toast(res.error.message, true); return; }
      return DB.deletePhoto(row.image_url).then(function () {
        toast(row.name + " deleted.");
        if (state.editing === row.id) resetForm();
        loadFaculty();
      });
    });
  }

  /* ---------- Form ---------- */
  var fields = {
    name: "f-name", name_zh: "f-name-zh", title: "f-title", title_zh: "f-title-zh",
    education: "f-education", education_zh: "f-education-zh",
    research_fields: "f-research", research_zh: "f-research-zh",
    email: "f-email", phone: "f-phone", website: "f-website", category: "f-category"
  };

  function resetForm() {
    state.editing = null;
    state.pendingFile = null;
    $("faculty-form").reset();
    $("f-id").value = "";
    $("f-image-url").value = "";
    setPreview("");
    $("form-title").textContent = "Add a faculty member";
    $("faculty-submit").textContent = "Save faculty member";
    $("cancel-edit").hidden = true;
  }

  function startEdit(row) {
    state.editing = row.id;
    state.pendingFile = null;
    Object.keys(fields).forEach(function (key) { $(fields[key]).value = row[key] || ""; });
    $("f-id").value = row.id;
    $("f-image-url").value = row.image_url || "";
    setPreview(row.image_url || "");
    $("form-title").textContent = "Editing " + row.name;
    $("faculty-submit").textContent = "Save changes";
    $("cancel-edit").hidden = false;
    $("faculty-form").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setPreview(url) {
    var box = $("photo-preview");
    box.innerHTML = url ? '<img src="' + url + '" alt="">' : "<span>No photo</span>";
    $("remove-photo").hidden = !url;
  }

  $("cancel-edit").addEventListener("click", resetForm);

  $("f-photo").addEventListener("change", function () {
    var file = this.files && this.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast("That image is larger than 5 MB.", true); this.value = ""; return; }
    state.pendingFile = file;
    setPreview(URL.createObjectURL(file));
  });

  $("remove-photo").addEventListener("click", function () {
    state.pendingFile = null;
    $("f-photo").value = "";
    $("f-image-url").value = "";
    setPreview("");
  });

  $("faculty-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var submit = $("faculty-submit");
    submit.disabled = true;

    var row = {};
    Object.keys(fields).forEach(function (key) {
      var value = $(fields[key]).value.trim();
      row[key] = value || null;
    });
    row.name = $("f-name").value.trim();
    row.category = $("f-category").value;
    row.image_url = $("f-image-url").value || null;

    var upload = state.pendingFile
      ? DB.uploadPhoto(state.pendingFile).then(function (url) { row.image_url = url; })
      : Promise.resolve();

    upload.then(function () {
      if (state.editing) return DB.updateFaculty(state.editing, row);
      // new rows go to the end of their group
      var last = state.rows.filter(function (r) { return r.category === row.category; }).pop();
      row.sort_order = last ? last.sort_order + 10 : 0;
      return DB.createFaculty(row);
    }).then(function (res) {
      submit.disabled = false;
      if (res && res.error) { toast(res.error.message, true); return; }
      toast(state.editing ? "Changes saved." : row.name + " added.");
      resetForm();
      loadFaculty();
    }).catch(function (err) {
      submit.disabled = false;
      toast(err.message || "Something went wrong.", true);
    });
  });

  /* ---------------------------------------------------------
     AdminNews: bilingual announcements (class #5)
     One record holds both languages — created, edited, previewed
     and deleted together.
     --------------------------------------------------------- */
  var newsRows = [];
  var editingNews = null;

  var newsFields = {
    published_on: "n-date", category: "n-category", link_url: "n-link",
    status: "n-status", image_url: "n-image",
    title_en: "n-title-en", title_zh: "n-title-zh",
    summary_en: "n-summary-en", summary_zh: "n-summary-zh",
    body_en: "n-body-en", body_zh: "n-body-zh"
  };

  var CATEGORY_LABEL = {
    admissions: "Admissions", academics: "Academics", partners: "Global partners",
    community: "Student life", notice: "Notices"
  };

  function loadNews() {
    DB.listNewsRaw().then(function (res) {
      if (res.error) { toast(res.error.message, true); return; }
      newsRows = res.data || [];
      renderNews();
    });
  }

  function renderNews() {
    var list = $("news-list");
    list.innerHTML = newsRows.map(function (row) {
      var badge = row.status === "draft" ? "gray" : "green";
      var missing = !row.title_zh || !row.body_zh;
      return '<div class="faculty-row" data-news="' + row.id + '">' +
        '<span class="thumb news-date">' + row.published_on.slice(5).replace("-", "/") + "</span>" +
        '<span class="who"><strong></strong><span></span></span>' +
        '<span class="row-actions">' +
          '<span class="badge ' + badge + '">' + row.status + "</span>" +
          (missing ? '<span class="badge gold" title="The Chinese version is incomplete">中文 ?</span>' : "") +
        "</span>" +
        '<span class="row-actions">' +
          '<button class="icon-btn" type="button" data-nact="edit" title="Edit">✎</button>' +
          '<button class="icon-btn danger" type="button" data-nact="delete" title="Delete">🗑</button>' +
        "</span></div>";
    }).join("");

    // fill text safely and wire the buttons
    newsRows.forEach(function (row) {
      var el = list.querySelector('[data-news="' + row.id + '"]');
      if (!el) return;
      el.querySelector(".who strong").textContent = row.title_en;
      el.querySelector(".who span").textContent =
        [CATEGORY_LABEL[row.category] || row.category, row.title_zh || "—"].join(" · ");
      el.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-nact]");
        if (!btn) return;
        if (btn.getAttribute("data-nact") === "edit") startNewsEdit(row);
        else deleteNewsRow(row, el);
      });
    });

    $("news-count").textContent = newsRows.length + " announcements · " +
      newsRows.filter(function (r) { return r.status === "published"; }).length + " published";
    if (!newsRows.length) {
      list.innerHTML = '<p class="empty-state">No announcements yet.</p>';
    }
  }

  function resetNewsForm() {
    editingNews = null;
    $("news-form").reset();
    $("n-id").value = "";
    $("n-date").value = new Date().toISOString().slice(0, 10);
    $("news-form-title").textContent = "Add an announcement";
    $("news-submit").textContent = "Save announcement";
    $("news-cancel-edit").hidden = true;
    $("news-preview").hidden = true;
    pendingNewsImage = null;
    $("n-image-file").value = "";
    setNewsImagePreview("");
  }

  function startNewsEdit(row) {
    editingNews = row.id;
    Object.keys(newsFields).forEach(function (key) { $(newsFields[key]).value = row[key] || ""; });
    $("n-id").value = row.id;
    pendingNewsImage = null;
    $("n-image-file").value = "";
    setNewsImagePreview(row.image_url || "");
    $("news-form-title").textContent = "Editing “" + row.title_en + "”";
    $("news-submit").textContent = "Save changes";
    $("news-cancel-edit").hidden = false;
    $("news-form").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function deleteNewsRow(row, el) {
    // Deleting once removes both language versions: they are one record.
    if (!confirm("Delete “" + row.title_en + "”? Both the English and Chinese versions are removed.")) return;
    el.classList.add("is-busy");
    DB.deleteNews(row.id).then(function (res) {
      if (res.error) { el.classList.remove("is-busy"); toast(res.error.message, true); return; }
      toast("Announcement deleted.");
      if (editingNews === row.id) resetNewsForm();
      loadNews();
    });
  }

  var pendingNewsImage = null;

  /* Draft autosave: what you type survives a reload or leaving the page.
     (The chosen image file cannot be stored, so it has to be picked again.) */
  var DRAFT_KEY = "immba-news-draft";

  function saveDraft() {
    var draft = { editing: editingNews };
    Object.keys(newsFields).forEach(function (key) { draft[key] = $(newsFields[key]).value; });
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) { /* storage unavailable */ }
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
  }

  function restoreDraft() {
    var raw = null;
    try { raw = localStorage.getItem(DRAFT_KEY); } catch (e) { return; }
    if (!raw) return;
    var draft;
    try { draft = JSON.parse(raw); } catch (e) { return; }

    var hasContent = Object.keys(newsFields).some(function (key) {
      return key !== "published_on" && key !== "category" && key !== "status" && draft[key];
    });
    if (!hasContent) return;

    Object.keys(newsFields).forEach(function (key) {
      if (draft[key]) $(newsFields[key]).value = draft[key];
    });
    editingNews = draft.editing || null;
    if (editingNews) {
      $("n-id").value = editingNews;
      $("news-form-title").textContent = "Editing an announcement (draft restored)";
      $("news-submit").textContent = "Save changes";
      $("news-cancel-edit").hidden = false;
    } else {
      $("news-form-title").textContent = "Add an announcement (draft restored)";
    }
    setNewsImagePreview($("n-image").value);
    toast("Unsaved draft restored.");
  }


  function setNewsImagePreview(url) {
    var box = $("n-image-preview");
    box.innerHTML = url ? '<img src="' + url + '" alt="">' : "<span>No image</span>";
    $("n-image-remove").hidden = !url;
  }

  $("n-image-file").addEventListener("change", function () {
    var file = this.files && this.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast("That image is larger than 5 MB.", true); this.value = ""; return; }
    pendingNewsImage = file;
    setNewsImagePreview(URL.createObjectURL(file));
  });

  $("n-image-remove").addEventListener("click", function () {
    pendingNewsImage = null;
    $("n-image-file").value = "";
    $("n-image").value = "";
    setNewsImagePreview("");
  });

  $("n-image").addEventListener("input", function () { setNewsImagePreview(this.value.trim()); });

  $("news-form").addEventListener("input", saveDraft);
  $("news-form").addEventListener("change", saveDraft);
  $("news-cancel-edit").addEventListener("click", function () { clearDraft(); resetNewsForm(); });

  // "copy from" helpers: a starting point for the other language, then edit it
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var toZh = btn.getAttribute("data-copy") === "en-to-zh";
      [["title", "n-title"], ["summary", "n-summary"], ["body", "n-body"]].forEach(function (pair) {
        var from = $(pair[1] + (toZh ? "-en" : "-zh"));
        var to = $(pair[1] + (toZh ? "-zh" : "-en"));
        if (from.value && !to.value) to.value = from.value;
      });
      toast("Copied across — now edit the translation.");
    });
  });

  // Preview both languages before publishing
  function previewHTML(title, summary, body) {
    var paragraphs = (body || "").split(/\n{2,}/).filter(Boolean)
      .map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
    return "<h3>" + esc(title || "—") + "</h3>" +
      (summary ? '<p class="muted">' + esc(summary) + "</p>" : "") + paragraphs;
  }

  $("news-preview-btn").addEventListener("click", function () {
    $("preview-en").innerHTML = previewHTML($("n-title-en").value, $("n-summary-en").value, $("n-body-en").value);
    $("preview-zh").innerHTML = previewHTML($("n-title-zh").value, $("n-summary-zh").value, $("n-body-zh").value);
    var missing = [];
    if (!$("n-title-zh").value) missing.push("Chinese title");
    if (!$("n-summary-zh").value && $("n-summary-en").value) missing.push("Chinese summary");
    if (!$("n-body-zh").value && $("n-body-en").value) missing.push("Chinese content");
    if (!$("n-body-en").value && $("n-body-zh").value) missing.push("English content");
    $("preview-warning").textContent = missing.length
      ? "The two versions are not synchronised yet — missing: " + missing.join(", ") + "."
      : "Both versions are complete.";
    $("news-preview").hidden = false;
    $("news-preview").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("news-preview-close").addEventListener("click", function () { $("news-preview").hidden = true; });

  $("news-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var submit = $("news-submit");
    submit.disabled = true;

    var row = {};
    Object.keys(newsFields).forEach(function (key) {
      var value = $(newsFields[key]).value.trim();
      row[key] = value || null;
    });
    row.published_on = $("n-date").value;
    row.category = $("n-category").value;
    row.status = $("n-status").value;
    row.title_en = $("n-title-en").value.trim();

    var upload = pendingNewsImage
      ? DB.uploadNewsImage(pendingNewsImage).then(function (url) { row.image_url = url; })
      : Promise.resolve();

    upload.then(function () {
      return editingNews ? DB.updateNews(editingNews, row) : DB.createNews(row);
    }).then(function (res) {
      submit.disabled = false;
      if (res && res.error) { toast(res.error.message, true); return; }
      toast(editingNews ? "Changes saved." : "Announcement published.");
      clearDraft();
      resetNewsForm();
      loadNews();
    }).catch(function (err) {
      submit.disabled = false;
      toast(err.message || "Could not upload the image.", true);
    });
  });


  /* =========================================================
     Alumni database, batch import and audit trail (class #7)
     ========================================================= */
  var FIELDS = DB.ALUMNI_FIELDS;
  var alumniRows = [];
  var editingAlumni = null;
  var validImportRows = [];
  var DEFAULT_COLUMNS = ["full_name", "student_id", "department", "degree_program", "graduation_year", "company", "job_title"];
  var visibleColumns = DEFAULT_COLUMNS.slice();
  try {
    var storedCols = JSON.parse(localStorage.getItem("immba-alumni-columns") || "null");
    if (Array.isArray(storedCols) && storedCols.length) visibleColumns = storedCols;
  } catch (e) { /* storage unavailable */ }

  /* ---------- Form ---------- */
  function buildAlumniForm() {
    var form = $("alumni-form");
    form.innerHTML = '<input type="hidden" id="a-id">' + FIELDS.map(function (f) {
      var id = "a-" + f.key;
      var full = f.key === "notes" ? " full" : "";
      var input;
      if (f.options) {
        input = '<select id="' + id + '">' + f.options.map(function (o) {
          return '<option value="' + o + '"' + (o === "Master" ? " selected" : "") + ">" + o + "</option>";
        }).join("") + "</select>";
      } else if (f.key === "notes") {
        input = '<textarea id="' + id + '" rows="2"></textarea>';
      } else if (f.number) {
        input = '<input type="number" id="' + id + '" min="1950" max="2100" step="1" placeholder="2026">';
      } else {
        input = '<input type="' + (f.key === "email" ? "email" : "text") + '" id="' + id + '">';
      }
      return '<div class="field' + full + '"><label for="' + id + '">' + f.label +
        (f.required ? " *" : "") + "</label>" + input + "</div>";
    }).join("") +
    '<div class="field full btn-row"><button class="btn btn-primary" type="submit" id="alumni-submit">Save alumnus</button></div>';
  }

  function resetAlumniForm() {
    editingAlumni = null;
    $("alumni-form").reset();
    $("a-id").value = "";
    $("a-degree_program").value = "Master";
    $("alumni-form-title").textContent = "Add an alumnus";
    $("alumni-submit").textContent = "Save alumnus";
    $("alumni-cancel-edit").hidden = true;
  }

  function startAlumniEdit(row) {
    editingAlumni = row.id;
    FIELDS.forEach(function (f) { $("a-" + f.key).value = row[f.key] == null ? "" : row[f.key]; });
    $("a-id").value = row.id;
    $("alumni-form-title").textContent = "Editing " + row.full_name;
    $("alumni-submit").textContent = "Save changes";
    $("alumni-cancel-edit").hidden = false;
    $("alumni-form").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function readAlumniForm() {
    var row = {};
    FIELDS.forEach(function (f) {
      var value = $("a-" + f.key).value.trim();
      row[f.key] = value === "" ? null : (f.number ? parseInt(value, 10) : value);
    });
    return row;
  }

  function loadAlumni() {
    DB.listAlumni().then(function (res) {
      if (res.error) { toast(res.error.message, true); return; }
      alumniRows = res.data || [];
      buildFilters();
      renderAlumni();
    });
  }

  /* ---------- Search, filter, columns ---------- */
  function uniqueValues(key) {
    var seen = {};
    alumniRows.forEach(function (r) { if (r[key]) seen[r[key]] = true; });
    return Object.keys(seen).sort();
  }

  function fillSelect(id, values, keepValue) {
    var select = $(id);
    var current = keepValue ? select.value : "";
    var first = select.options[0].outerHTML;
    select.innerHTML = first + values.map(function (v) {
      return '<option value="' + String(v).replace(/"/g, "&quot;") + '">' + esc(v) + "</option>";
    }).join("");
    if (current) select.value = current;
  }

  function buildFilters() {
    fillSelect("filter-degree", DB.DEGREE_PROGRAMS, true);
    fillSelect("filter-year", uniqueValues("graduation_year").sort().reverse(), true);
    fillSelect("filter-department", uniqueValues("department"), true);
    fillSelect("filter-company", uniqueValues("company"), true);
  }

  function filteredAlumni() {
    var q = $("alumni-search").value.trim().toLowerCase();
    var degree = $("filter-degree").value;
    var year = $("filter-year").value;
    var dept = $("filter-department").value;
    var company = $("filter-company").value;
    return alumniRows.filter(function (r) {
      if (degree && r.degree_program !== degree) return false;
      if (year && String(r.graduation_year) !== year) return false;
      if (dept && r.department !== dept) return false;
      if (company && r.company !== company) return false;
      if (!q) return true;
      return FIELDS.some(function (f) {
        return String(r[f.key] == null ? "" : r[f.key]).toLowerCase().indexOf(q) !== -1;
      });
    });
  }

  function buildColumnsMenu() {
    $("columns-menu").innerHTML = FIELDS.map(function (f) {
      var on = visibleColumns.indexOf(f.key) !== -1;
      return '<label><input type="checkbox" value="' + f.key + '"' + (on ? " checked" : "") + "> " + f.label + "</label>";
    }).join("");
  }

  function renderAlumni() {
    var rows = filteredAlumni();
    var cols = FIELDS.filter(function (f) { return visibleColumns.indexOf(f.key) !== -1; });

    $("alumni-head").innerHTML = cols.map(function (f) { return "<th>" + f.label + "</th>"; }).join("") +
      "<th>Actions</th>";

    $("alumni-rows").innerHTML = rows.map(function (r) {
      return '<tr data-alumni="' + r.id + '">' + cols.map(function (f) {
        var v = r[f.key];
        if (f.key === "degree_program") return '<td><span class="badge gray">' + esc(v || "") + "</span></td>";
        if (f.key === "email" && v) return '<td><a href="mailto:' + esc(v) + '">' + esc(v) + "</a></td>";
        return "<td>" + esc(v == null ? "—" : v) + "</td>";
      }).join("") +
      '<td class="row-actions">' +
        '<button class="icon-btn" type="button" data-aact="edit" title="Edit">✎</button>' +
        '<button class="icon-btn danger" type="button" data-aact="delete" title="Delete">🗑</button>' +
      "</td></tr>";
    }).join("");

    if (!rows.length) {
      $("alumni-rows").innerHTML = '<tr><td colspan="' + (cols.length + 1) +
        '"><p class="empty-state mb-0">' +
        (alumniRows.length ? "No alumni match these filters." : "No alumni yet. Add one above or import a CSV.") +
        "</p></td></tr>";
    }

    $("alumni-count").textContent = rows.length === alumniRows.length
      ? alumniRows.length + " alumni"
      : rows.length + " of " + alumniRows.length + " alumni";
  }

  /* ---------- CSV helpers ---------- */
  // Minimal CSV parser: handles quoted fields, embedded commas and newlines.
  function parseCSV(text) {
    text = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    var rows = [], row = [], value = "", quoted = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { value += '"'; i++; } else quoted = false;
        } else value += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { row.push(value); value = ""; }
      else if (c === "\n") { row.push(value); rows.push(row); row = []; value = ""; }
      else value += c;
    }
    if (value !== "" || row.length) { row.push(value); rows.push(row); }
    return rows;
  }

  function toCSV(rows, cols) {
    var escape = function (v) {
      v = v == null ? "" : String(v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    return "﻿" + [cols.map(function (c) { return escape(c.key); }).join(",")].concat(
      rows.map(function (r) { return cols.map(function (c) { return escape(r[c.key]); }).join(","); })
    ).join("\n");
  }

  function download(filename, content, type) {
    var blob = new Blob([content], { type: type || "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- CSV validation (slide 15) ---------- */
  function validateCSV(text) {
    var rows = parseCSV(text);
    var report = { errors: [], warnings: [], valid: [], total: 0 };
    if (!rows.length) { report.errors.push("The file is empty."); return report; }

    var header = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    var known = FIELDS.map(function (f) { return f.key; });
    var unknown = header.filter(function (h) { return h && known.indexOf(h) === -1; });
    if (unknown.length) report.errors.push("Unknown column names: " + unknown.join(", ") + ".");
    if (header.indexOf("full_name") === -1) report.errors.push("The required column full_name is missing.");
    if (report.errors.length) return report;

    var seenIds = {};
    alumniRows.forEach(function (r) { if (r.student_id) seenIds[r.student_id] = "already in the database"; });

    rows.slice(1).forEach(function (cells, index) {
      var line = index + 2;
      if (cells.every(function (c) { return !c.trim(); })) { report.warnings.push("Line " + line + ": empty row, skipped."); return; }
      report.total++;

      var row = {};
      header.forEach(function (key, i) {
        if (!key) return;
        var value = (cells[i] == null ? "" : cells[i]).trim();
        row[key] = value === "" ? null : value;
      });

      if (!row.full_name) { report.errors.push("Line " + line + ": full_name is required."); return; }

      if (row.degree_program) {
        var match = DB.DEGREE_PROGRAMS.filter(function (d) {
          return d.toLowerCase() === String(row.degree_program).trim().toLowerCase();
        })[0];
        if (!match) {
          report.errors.push("Line " + line + ': invalid degree_program "' + row.degree_program +
            '" (use ' + DB.DEGREE_PROGRAMS.join(", ") + ").");
          return;
        }
        row.degree_program = match;
      } else row.degree_program = "Master";

      var badYear = false;
      ["admission_year", "graduation_year"].forEach(function (key) {
        if (row[key] == null) return;
        var n = parseInt(row[key], 10);
        if (isNaN(n) || n < 1950 || n > 2100) {
          report.errors.push("Line " + line + ": " + key + ' must be a year between 1950 and 2100 (got "' + row[key] + '").');
          badYear = true;
        } else row[key] = n;
      });
      if (badYear) return;

      if (row.email && row.email.indexOf("@") === -1) {
        report.warnings.push("Line " + line + ': "' + row.email + '" does not look like an email address.');
      }

      if (row.student_id) {
        if (seenIds[row.student_id]) {
          report.errors.push("Line " + line + ": duplicate student_id " + row.student_id + " (" + seenIds[row.student_id] + ").");
          return;
        }
        seenIds[row.student_id] = "earlier in this file";
      }

      report.valid.push(row);
    });

    return report;
  }

  function showReport(report) {
    var box = $("csv-report");
    var ok = report.valid.length && !report.errors.length;
    box.hidden = false;
    box.className = "import-report " + (report.errors.length ? "has-errors" : "is-ok");
    box.innerHTML =
      "<p><strong>" + report.valid.length + " of " + report.total + " rows are valid.</strong> " +
      (report.errors.length ? report.errors.length + " error(s) must be fixed before importing." : "Ready to import.") + "</p>" +
      (report.errors.length ? "<ul class=\"err\">" + report.errors.slice(0, 12).map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") +
        (report.errors.length > 12 ? "<li>…and " + (report.errors.length - 12) + " more</li>" : "") + "</ul>" : "") +
      (report.warnings.length ? "<ul class=\"warn\">" + report.warnings.slice(0, 8).map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul>" : "");
    validImportRows = ok ? report.valid : [];
    $("csv-import").disabled = !ok;
  }

  /* ---------- Audit trail ---------- */
  function renderChanges(entry) {
    var c = entry.changes || {};
    if (entry.action === "UPDATE") {
      return Object.keys(c).map(function (k) {
        var from = c[k].from == null ? "—" : String(c[k].from).replace(/^"|"$/g, "");
        var to = c[k].to == null ? "—" : String(c[k].to).replace(/^"|"$/g, "");
        return "<li><code>" + esc(k) + "</code> " + esc(from) + " → <strong>" + esc(to) + "</strong></li>";
      }).join("") || "<li>—</li>";
    }
    var summary = ["full_name", "student_id", "degree_program", "graduation_year", "company"]
      .filter(function (k) { return c[k]; })
      .map(function (k) { return "<li><code>" + esc(k) + "</code> " + esc(String(c[k]).replace(/^"|"$/g, "")) + "</li>"; });
    return summary.join("") || "<li>—</li>";
  }

  function loadAudit() {
    DB.listAudit(200).then(function (res) {
      if (res.error) { toast(res.error.message, true); return; }
      auditRows = res.data || [];
      var actors = {};
      auditRows.forEach(function (a) { if (a.actor_email) actors[a.actor_email] = true; });
      fillSelect("audit-actor", Object.keys(actors).sort(), true);
      renderAudit();
    });
  }

  var auditRows = [];
  function renderAudit() {
    var action = $("audit-action").value;
    var actor = $("audit-actor").value;
    var rows = auditRows.filter(function (a) {
      return (!action || a.action === action) && (!actor || a.actor_email === actor);
    });
    $("audit-rows").innerHTML = rows.map(function (a) {
      var when = new Date(a.created_at);
      var badge = a.action === "CREATE" ? "green" : a.action === "DELETE" ? "gold" : "";
      return "<tr>" +
        "<td><time datetime=\"" + a.created_at + "\">" + when.toLocaleDateString("en-GB") +
          "<br><span class=\"muted\">" + when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + "</span></time></td>" +
        "<td>" + esc(a.actor_email || "—") + "</td>" +
        '<td><span class="badge ' + badge + '">' + a.action + "</span></td>" +
        "<td>" + esc(a.record_label || a.record_id || "—") + "</td>" +
        '<td><ul class="changes">' + renderChanges(a) + "</ul></td></tr>";
    }).join("");
    if (!rows.length) {
      $("audit-rows").innerHTML = '<tr><td colspan="5"><p class="empty-state mb-0">No activity recorded yet.</p></td></tr>';
    }
  }

  /* ---------- Wiring ---------- */
  buildAlumniForm();
  buildColumnsMenu();

  $("alumni-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var submit = $("alumni-submit");
    submit.disabled = true;
    var row = readAlumniForm();
    var save = editingAlumni ? DB.updateAlumni(editingAlumni, row) : DB.createAlumni(row);
    save.then(function (res) {
      submit.disabled = false;
      if (res.error) { toast(res.error.message, true); return; }
      toast(editingAlumni ? "Changes saved." : row.full_name + " added.");
      resetAlumniForm();
      loadAlumni();
      loadAudit();
    });
  });

  $("alumni-cancel-edit").addEventListener("click", resetAlumniForm);

  $("alumni-rows").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-aact]");
    if (!btn) return;
    var id = btn.closest("[data-alumni]").getAttribute("data-alumni");
    var row = alumniRows.filter(function (r) { return r.id === id; })[0];
    if (!row) return;
    if (btn.getAttribute("data-aact") === "edit") { startAlumniEdit(row); return; }
    if (!confirm("Delete " + row.full_name + "? The deletion is recorded in the activity log.")) return;
    DB.deleteAlumni(id).then(function (res) {
      if (res.error) { toast(res.error.message, true); return; }
      toast(row.full_name + " deleted.");
      if (editingAlumni === id) resetAlumniForm();
      loadAlumni();
      loadAudit();
    });
  });

  ["alumni-search", "filter-degree", "filter-year", "filter-department", "filter-company"].forEach(function (id) {
    $(id).addEventListener("input", renderAlumni);
    $(id).addEventListener("change", renderAlumni);
  });

  $("clear-filters").addEventListener("click", function () {
    $("alumni-search").value = "";
    ["filter-degree", "filter-year", "filter-department", "filter-company"].forEach(function (id) { $(id).value = ""; });
    renderAlumni();
  });

  $("columns-btn").addEventListener("click", function () {
    var open = $("columns-menu").hidden;
    $("columns-menu").hidden = !open;
    this.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".columns-picker") && !$("columns-menu").hidden) {
      $("columns-menu").hidden = true;
      $("columns-btn").setAttribute("aria-expanded", "false");
    }
  });

  $("columns-menu").addEventListener("change", function () {
    visibleColumns = [].slice.call(this.querySelectorAll("input:checked")).map(function (i) { return i.value; });
    if (!visibleColumns.length) { visibleColumns = ["full_name"]; buildColumnsMenu(); }
    try { localStorage.setItem("immba-alumni-columns", JSON.stringify(visibleColumns)); } catch (err) { /* ignore */ }
    renderAlumni();
  });

  $("export-csv").addEventListener("click", function () {
    var cols = FIELDS.filter(function (f) { return visibleColumns.indexOf(f.key) !== -1; });
    var rows = filteredAlumni();
    if (!rows.length) { toast("Nothing to export with these filters.", true); return; }
    download("immba-alumni-" + new Date().toISOString().slice(0, 10) + ".csv", toCSV(rows, cols));
    toast("Exported " + rows.length + " rows.");
  });

  $("csv-template").addEventListener("click", function () {
    var example = {
      full_name: "Wang Mei-Ling", student_id: "A20260015", department: "imMBA",
      degree_program: "Master", admission_year: 2024, graduation_year: 2026,
      email: "meiling@example.com", phone: "+886-900-000-000",
      company: "ABC Corp", job_title: "Marketing Manager", notes: "Dual degree with KEDGE"
    };
    download("immba-alumni-template.csv", toCSV([example], FIELDS));
    toast("Template downloaded.");
  });

  $("csv-file").addEventListener("change", function () {
    var file = this.files && this.files[0];
    $("csv-import").disabled = true;
    validImportRows = [];
    if (!file) { $("csv-report").hidden = true; return; }
    var reader = new FileReader();
    reader.onload = function () { showReport(validateCSV(String(reader.result))); };
    reader.onerror = function () { toast("Could not read that file.", true); };
    reader.readAsText(file, "utf-8");
  });

  $("csv-import").addEventListener("click", function () {
    if (!validImportRows.length) return;
    var btn = this;
    btn.disabled = true;
    btn.textContent = "Importing…";
    DB.importAlumni(validImportRows).then(function (count) {
      btn.textContent = "Import validated rows";
      toast(count + " alumni imported.");
      $("csv-file").value = "";
      $("csv-report").hidden = true;
      validImportRows = [];
      loadAlumni();
      loadAudit();
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = "Import validated rows";
      toast(err.message || "The import failed.", true);
    });
  });

  $("audit-refresh").addEventListener("click", loadAudit);
  $("audit-action").addEventListener("change", renderAudit);
  $("audit-actor").addEventListener("change", renderAudit);

  /* ---------------------------------------------------------
     Administrators: approve / reject (super_admin only)
     --------------------------------------------------------- */
  function loadAdmins() {
    DB.listAdmins().then(function (res) {
      if (res.error) { toast(res.error.message, true); return; }
      var body = $("admins-rows");
      body.innerHTML = "";
      (res.data || []).forEach(function (a) {
        var tr = document.createElement("tr");
        var isMe = state.user && a.id === state.user.id;
        var badge = a.role === "pending" ? "gray" : a.role === "super_admin" ? "gold" : "green";
        tr.innerHTML =
          "<td></td><td></td>" +
          '<td><span class="badge ' + badge + '">' + a.role.replace("_", " ") + "</span></td>" +
          "<td>" + new Date(a.created_at).toLocaleDateString("en-GB") + "</td>" +
          '<td class="row-actions"></td>';
        tr.children[0].textContent = a.email;
        tr.children[1].textContent = a.full_name || "—";

        var actions = tr.children[4];
        if (isMe) {
          actions.innerHTML = '<span class="muted">That is you</span>';
        } else {
          if (a.role === "pending") {
            actions.appendChild(button("Approve as admin", "btn btn-primary btn-sm", function () { setRole(a, "admin"); }));
            actions.appendChild(button("Reject", "btn btn-outline btn-sm", function () { reject(a); }));
          } else if (a.role === "admin") {
            actions.appendChild(button("Make super admin", "btn btn-outline btn-sm", function () { setRole(a, "super_admin"); }));
            actions.appendChild(button("Revoke", "btn btn-outline btn-sm", function () { setRole(a, "pending"); }));
          } else {
            actions.appendChild(button("Make admin", "btn btn-outline btn-sm", function () { setRole(a, "admin"); }));
          }
        }
        body.appendChild(tr);
      });
    });
  }

  function button(label, className, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = className;
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  function setRole(profile, role) {
    DB.setRole(profile.id, role).then(function (res) {
      toast(res.error ? res.error.message : profile.email + " is now " + role.replace("_", " ") + ".", Boolean(res.error));
      loadAdmins();
    });
  }

  function reject(profile) {
    if (!confirm("Reject " + profile.email + "? Their profile will be removed.")) return;
    DB.removeAdmin(profile.id).then(function (res) {
      toast(res.error ? res.error.message : profile.email + " rejected.", Boolean(res.error));
      loadAdmins();
    });
  }

  /* ---------- Tabs ---------- */
  document.querySelectorAll("[data-tabs] .tab-btn").forEach(function (btn, _, all) {
    btn.addEventListener("click", function () {
      all.forEach(function (b) {
        var on = b === btn;
        b.setAttribute("aria-selected", String(on));
        $(b.getAttribute("data-tab")).hidden = !on;
      });
    });
  });
  var firstTab = document.querySelector("[data-tabs] .tab-btn");
  if (firstTab) firstTab.setAttribute("aria-selected", "true");

  setMode("signin");
})();
