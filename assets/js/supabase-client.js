/* =========================================================
   Supabase: client, session helpers and the faculty data API.
   Loaded by index.html (read-only) and admin.html (read/write).
   Requires supabase-js v2, loaded from the CDN before this file.
   ========================================================= */
(function () {
  "use strict";

  var cfg = window.SUPABASE_CONFIG || { url: "", anonKey: "" };
  var configured = Boolean(cfg.url && cfg.anonKey);
  var client = null;

  if (configured && window.supabase && window.supabase.createClient) {
    client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  var PHOTO_BUCKET = "faculty-photos";

  /* ---------- Faculty ---------- */

  // Shape a database row like the objects the website already renders.
  function toView(row) {
    var split = function (s, sep) {
      return (s || "").split(sep).map(function (p) { return p.trim(); }).filter(Boolean);
    };
    return {
      id: row.id,
      name: row.name,
      zh: row.name_zh || "",
      type: row.category === "part" ? "part" : "full",
      email: row.email || "",
      ext: row.phone || "",
      web: row.website || "",
      photo: row.image_url || "",
      title: { en: row.title || "", zh: row.title_zh || row.title || "" },
      edu: { en: row.education || "", zh: row.education_zh || row.education || "" },
      areas: {
        en: split(row.research_fields, ","),
        zh: split(row.research_zh || row.research_fields, "、")
      },
      sort_order: row.sort_order || 0
    };
  }

  // Read the faculty list. Falls back to assets/js/data/faculty.js when
  // Supabase is not configured yet or cannot be reached, so the public
  // website never shows an empty page.
  function listFaculty() {
    if (!client) return Promise.resolve({ rows: fallbackRows(), source: "local" });
    return client
      .from("faculty")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) {
          return { rows: fallbackRows(), source: res.error ? "local" : "cloud" };
        }
        return { rows: res.data.map(toView), source: "cloud" };
      })
      .catch(function () { return { rows: fallbackRows(), source: "local" }; });
  }

  function fallbackRows() {
    return (window.FACULTY || []).map(function (f, i) {
      return Object.assign({ id: "local-" + i, photo: "", sort_order: i * 10 }, f);
    });
  }

  function listFacultyRaw() {
    return client
      .from("faculty")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
  }

  function createFaculty(row) { return client.from("faculty").insert(row).select().single(); }
  function updateFaculty(id, row) { return client.from("faculty").update(row).eq("id", id).select().single(); }
  function deleteFaculty(id) { return client.from("faculty").delete().eq("id", id); }

  // Reorder: persist the new sort_order of two swapped rows.
  function saveOrder(pairs) {
    return Promise.all(pairs.map(function (p) {
      return client.from("faculty").update({ sort_order: p.sort_order }).eq("id", p.id);
    }));
  }

  /* ---------- Faculty photos (Supabase Storage) ---------- */

  function uploadPhoto(file) {
    var ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    var path = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    return client.storage.from(PHOTO_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false })
      .then(function (res) {
        if (res.error) throw res.error;
        return client.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
      });
  }

  function deletePhoto(url) {
    if (!url || url.indexOf(PHOTO_BUCKET) === -1) return Promise.resolve();
    var path = url.split("/" + PHOTO_BUCKET + "/").pop();
    return client.storage.from(PHOTO_BUCKET).remove([path]);
  }

  /* ---------- Authentication & roles ---------- */

  function signUp(email, password, fullName) {
    return client.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: location.origin + location.pathname
      }
    });
  }

  function signIn(email, password) { return client.auth.signInWithPassword({ email: email, password: password }); }
  function signOut() { return client.auth.signOut(); }

  function resetPassword(email) {
    return client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  }

  function updatePassword(password) { return client.auth.updateUser({ password: password }); }
  function getSession() { return client.auth.getSession(); }
  function onAuthChange(cb) { return client.auth.onAuthStateChange(cb); }

  function getProfile(userId) {
    return client.from("admin_profiles").select("*").eq("id", userId).maybeSingle();
  }

  function listAdmins() {
    return client.from("admin_profiles").select("*").order("created_at", { ascending: true });
  }

  function setRole(userId, role) {
    return client.from("admin_profiles").update({ role: role }).eq("id", userId).select().single();
  }

  function removeAdmin(userId) { return client.from("admin_profiles").delete().eq("id", userId); }

  window.DB = {
    client: client,
    configured: configured,
    PHOTO_BUCKET: PHOTO_BUCKET,
    toView: toView,
    listFaculty: listFaculty,
    listFacultyRaw: listFacultyRaw,
    createFaculty: createFaculty,
    updateFaculty: updateFaculty,
    deleteFaculty: deleteFaculty,
    saveOrder: saveOrder,
    uploadPhoto: uploadPhoto,
    deletePhoto: deletePhoto,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    resetPassword: resetPassword,
    updatePassword: updatePassword,
    getSession: getSession,
    onAuthChange: onAuthChange,
    getProfile: getProfile,
    listAdmins: listAdmins,
    setRole: setRole,
    removeAdmin: removeAdmin
  };
})();
