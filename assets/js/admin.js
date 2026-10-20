/* =========================================================
   Back office: authentication, roles and faculty management.
   Reads and writes through window.DB (assets/js/supabase-client.js).
   ========================================================= */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
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
