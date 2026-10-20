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
  var NEWS_BUCKET = "news-images";

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

  // Upload a file to a public bucket and return its public URL.
  function uploadTo(bucket, file) {
    var ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    var path = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    return client.storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: false })
      .then(function (res) {
        if (res.error) throw res.error;
        return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      });
  }

  function uploadPhoto(file) { return uploadTo(PHOTO_BUCKET, file); }
  function uploadNewsImage(file) { return uploadTo(NEWS_BUCKET, file); }

  function deletePhoto(url) {
    if (!url || url.indexOf(PHOTO_BUCKET) === -1) return Promise.resolve();
    var path = url.split("/" + PHOTO_BUCKET + "/").pop();
    return client.storage.from(PHOTO_BUCKET).remove([path]);
  }

  /* ---------- Announcements (news) ----------
     One record holds both languages: Chinese and English titles,
     summaries and bodies, plus the shared date, link and status. */

  function newsToView(row) {
    return {
      id: row.id,
      date: row.published_on,
      category: row.category,
      link: row.link_url || "",
      image: row.image_url || "",
      status: row.status,
      title: { en: row.title_en || "", zh: row.title_zh || row.title_en || "" },
      summary: { en: row.summary_en || "", zh: row.summary_zh || row.summary_en || "" },
      body: { en: row.body_en || "", zh: row.body_zh || row.body_en || "" }
    };
  }

  // Public list: published announcements, newest first. Falls back to
  // assets/js/data/news.js when the backend is unreachable.
  function listNews(limit) {
    if (!client) return Promise.resolve({ rows: fallbackNews(limit), source: "local" });
    var query = client.from("news").select("*").eq("status", "published")
      .order("published_on", { ascending: false });
    if (limit) query = query.limit(limit);
    return query.then(function (res) {
      if (res.error || !res.data || !res.data.length) {
        return { rows: fallbackNews(limit), source: res.error ? "local" : "cloud" };
      }
      return { rows: res.data.map(newsToView), source: "cloud" };
    }).catch(function () { return { rows: fallbackNews(limit), source: "local" }; });
  }

  function fallbackNews(limit) {
    var rows = (window.NEWS || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    return (limit ? rows.slice(0, limit) : rows).map(function (n) {
      return {
        id: n.id, date: n.date, category: n.category, link: "", image: n.image,
        status: "published", title: n.title, summary: n.summary,
        body: { en: (n.body.en || []).join("\n\n"), zh: (n.body.zh || []).join("\n\n") }
      };
    });
  }

  // Admin list: everything, drafts included.
  function listNewsRaw() {
    return client.from("news").select("*")
      .order("published_on", { ascending: false })
      .order("sort_order", { ascending: true });
  }

  function createNews(row) { return client.from("news").insert(row).select().single(); }
  function updateNews(id, row) { return client.from("news").update(row).eq("id", id).select().single(); }
  function deleteNews(id) { return client.from("news").delete().eq("id", id); }

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
    uploadNewsImage: uploadNewsImage,
    newsToView: newsToView,
    listNews: listNews,
    listNewsRaw: listNewsRaw,
    createNews: createNews,
    updateNews: updateNews,
    deleteNews: deleteNews,
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
