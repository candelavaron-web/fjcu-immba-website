/* =========================================================
   Student marketplace (AI-ADPD class #10)
   One page, four roles: visitor, buyer, seller, platform admin.
   What is shown here changes with the role; what is *allowed*
   is decided by the row level security policies and the two
   database functions in supabase/marketplace.sql.
   ========================================================= */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  var I = window.IMMBA || { ICONS: {}, bi: function (a) { return a; } };
  var bi = I.bi;

  var CART_KEY = "immba-cart";

  var state = {
    user: null,
    shop: null,          // row of shop_profiles
    isAdmin: false,
    products: [],        // public listings
    mine: [],            // my own listings (seller)
    purchases: [],       // orders where I am the buyer
    sales: [],           // orders where I am the seller
    cart: [],
    category: "",
    search: "",
    sort: "new",
    editing: null,
    pendingImage: null,
    authMode: "signin"
  };

  /* ---------- small helpers ---------- */
  function money(n) {
    return "NT$" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  function date(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function dateTime(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function icon(name) { return I.ICONS[name] || ""; }

  function lang() { return document.documentElement.getAttribute("data-lang") || "en"; }

  // <select data-opt-en="A|B" data-opt-zh="甲|乙">: the option labels
  // follow the language switch, the values never change.
  function localizeSelects() {
    document.querySelectorAll("select[data-opt-en]").forEach(function (sel) {
      var labels = (sel.getAttribute(lang() === "zh" ? "data-opt-zh" : "data-opt-en") || "").split("|");
      Array.prototype.forEach.call(sel.options, function (opt, i) {
        if (labels[i]) opt.textContent = labels[i];
      });
    });
  }

  function paintIcons(root) {
    (root || document).querySelectorAll("[data-icon]").forEach(function (el) {
      if (!el.innerHTML) el.innerHTML = icon(el.getAttribute("data-icon"));
    });
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

  function errorText(err) {
    if (!err) return "Something went wrong.";
    return err.message || err.error_description || String(err);
  }

  function categoryIcon(key) {
    var c = (DB.CATEGORIES || []).filter(function (x) { return x.key === key; })[0];
    return icon(c ? c.icon : "coin");
  }

  function statusBadge(key) {
    var s = DB.statusInfo(key);
    return '<span class="badge ' + s.tone + '">' + bi(s.en, s.zh) + "</span>";
  }

  if (!window.DB || !DB.configured || !DB.client) {
    $("product-grid").innerHTML = '<p class="empty-state">' +
      bi("The marketplace needs its Supabase backend. See supabase/README.md.",
         "交易平台需連線 Supabase 後端，請參閱 supabase/README.md。") + "</p>";
    return;
  }

  /* =========================================================
     1. Who is looking at the page
     ========================================================= */
  function renderAccount() {
    var box = $("mk-account");
    var roles = [];

    if (!state.user) {
      box.innerHTML =
        '<div class="mk-who">' +
          '<span class="badge gray">' + bi("Visitor", "訪客") + "</span>" +
          "<p>" + bi("You can browse everything. Sign in to add items to your cart, place an order or open your own shop.",
                     "你可以瀏覽所有商品。登入後即可加入購物車、下單或開設自己的商店。") + "</p>" +
        "</div>" +
        '<button class="btn btn-primary btn-sm" type="button" id="mk-signin">' +
          bi("Sign in / Register", "登入／註冊") + "</button>";
      $("mk-signin").addEventListener("click", openAuth);
      return;
    }

    roles.push('<span class="badge green">' + bi("Buyer", "買家") + "</span>");
    var status = state.shop ? state.shop.seller_status : "none";
    if (status === "approved") roles.push('<span class="badge gold">' + bi("Seller", "賣家") + "</span>");
    else if (status === "pending") roles.push('<span class="badge gray">' + bi("Seller — pending", "賣家審核中") + "</span>");
    else if (status === "suspended") roles.push('<span class="badge gray">' + bi("Seller — suspended", "賣家已停權") + "</span>");
    if (state.isAdmin) roles.push('<span class="badge">' + bi("Platform admin", "平台管理者") + "</span>");

    box.innerHTML =
      '<div class="mk-who">' +
        '<div class="mk-roles">' + roles.join("") + "</div>" +
        "<p><strong>" + esc(state.shop && state.shop.display_name ? state.shop.display_name : state.user.email) + "</strong>" +
        (status === "approved" && state.shop.shop_name ? " · " + esc(state.shop.shop_name) : "") + "</p>" +
      "</div>" +
      '<div class="mk-who-actions">' +
        (state.isAdmin ? '<a class="btn btn-outline btn-sm" href="admin.html#tab-market">' + bi("Transaction monitor", "交易監控") + "</a>" : "") +
        '<button class="btn btn-outline btn-sm" type="button" id="mk-signout">' + bi("Sign out", "登出") + "</button>" +
      "</div>";

    $("mk-signout").addEventListener("click", function () {
      DB.signOut().then(function () { location.reload(); });
    });
  }

  function applySession(session) {
    state.user = session ? session.user : null;
    $("btn-orders").hidden = !state.user;
    $("btn-shop").hidden = !state.user;

    if (!state.user) {
      state.shop = null;
      state.isAdmin = false;
      renderAccount();
      renderProducts();
      return;
    }

    Promise.all([
      DB.myShop(state.user.id),
      DB.getProfile(state.user.id)
    ]).then(function (res) {
      state.shop = res[0].data || null;
      var profile = res[1].data;
      state.isAdmin = Boolean(profile && (profile.role === "admin" || profile.role === "super_admin"));
      renderAccount();
      renderProducts();
      loadPurchases();
      loadShop();
    });
  }

  /* =========================================================
     2. Browsing — what a visitor sees
     ========================================================= */
  function loadProducts() {
    return DB.listProducts().then(function (res) {
      if (res.error) { toast(errorText(res.error), true); return; }
      state.products = res.data || [];
      renderCategories();
      renderProducts();
    });
  }

  function renderCategories() {
    var counts = {};
    state.products.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    var chips = ['<button class="chip" type="button" data-cat="" aria-pressed="' + (state.category === "" ? "true" : "false") + '">' +
      bi("All", "全部") + " <small>" + state.products.length + "</small></button>"];
    DB.CATEGORIES.forEach(function (c) {
      if (!counts[c.key]) return;
      chips.push('<button class="chip" type="button" data-cat="' + esc(c.key) + '" aria-pressed="' +
        (state.category === c.key ? "true" : "false") + '">' + bi(c.key, c.zh) + " <small>" + counts[c.key] + "</small></button>");
    });
    var box = $("mk-categories");
    box.innerHTML = chips.join("");
    box.querySelectorAll("[data-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.category = btn.getAttribute("data-cat");
        renderCategories();
        renderProducts();
      });
    });
  }

  function visibleProducts() {
    var q = state.search.trim().toLowerCase();
    var rows = state.products.filter(function (p) {
      if (state.category && p.category !== state.category) return false;
      if (!q) return true;
      return (p.name + " " + (p.description || "") + " " + p.category).toLowerCase().indexOf(q) !== -1;
    });
    rows.sort(function (a, b) {
      if (state.sort === "cheap") return Number(a.price) - Number(b.price);
      if (state.sort === "dear") return Number(b.price) - Number(a.price);
      return a.created_at < b.created_at ? 1 : -1;
    });
    return rows;
  }

  function renderProducts() {
    var rows = visibleProducts();
    var grid = $("product-grid");

    $("mk-count").innerHTML = rows.length === state.products.length
      ? bi(rows.length + " items for sale", rows.length + " 件商品")
      : bi(rows.length + " of " + state.products.length + " items", "共 " + state.products.length + " 件中的 " + rows.length + " 件");

    if (!rows.length) {
      grid.innerHTML = '<p class="empty-state">' +
        bi("Nothing here yet. Be the first to list something.", "目前沒有商品，歡迎成為第一位上架的同學。") + "</p>";
      return;
    }

    grid.innerHTML = rows.map(function (p) {
      var out = Number(p.quantity) <= 0;
      var mine = state.user && p.seller_id === state.user.id;
      return '<article class="product-card' + (out ? " is-out" : "") + '" data-id="' + p.id + '">' +
        '<div class="product-thumb">' +
          (p.image_url
            ? '<img src="' + esc(p.image_url) + '" alt="' + esc(p.name) + '" loading="lazy">'
            : '<span class="thumb-glyph">' + categoryIcon(p.category) + "</span>") +
          (out ? '<span class="thumb-flag">' + bi("Sold out", "已售完") + "</span>" : "") +
          (mine ? '<span class="thumb-flag mine">' + bi("Your listing", "你的商品") + "</span>" : "") +
        "</div>" +
        '<div class="product-body">' +
          '<span class="product-cat">' + esc(p.category) + "</span>" +
          "<h3>" + esc(p.name) + "</h3>" +
          "<p>" + esc((p.description || "").slice(0, 110)) + ((p.description || "").length > 110 ? "…" : "") + "</p>" +
          '<div class="product-foot">' +
            '<span class="price">' + money(p.price) + "</span>" +
            '<span class="stock">' + (out
              ? bi("Sold out", "已售完")
              : bi(p.quantity + " available", "剩 " + p.quantity + " 件")) + "</span>" +
          "</div>" +
        "</div></article>";
    }).join("");

    grid.querySelectorAll(".product-card").forEach(function (card) {
      card.addEventListener("click", function () { openProduct(card.getAttribute("data-id")); });
    });
  }

  /* ---------- product detail ---------- */
  function openProduct(id) {
    var p = state.products.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var out = Number(p.quantity) <= 0;
    var box = $("product-modal-box");

    box.innerHTML =
      '<button class="icon-btn modal-close" type="button" data-close-product aria-label="Close">&times;</button>' +
      '<div class="product-detail">' +
        '<div class="product-thumb big">' +
          (p.image_url ? '<img src="' + esc(p.image_url) + '" alt="' + esc(p.name) + '">'
                       : '<span class="thumb-glyph">' + categoryIcon(p.category) + "</span>") +
        "</div>" +
        "<div>" +
          '<span class="product-cat">' + esc(p.category) + "</span>" +
          "<h2>" + esc(p.name) + "</h2>" +
          '<p class="price big">' + money(p.price) + "</p>" +
          '<p class="muted">' + (out ? bi("Sold out", "已售完")
             : bi(p.quantity + " available · sold " + p.sold_count + " so far",
                  "可售 " + p.quantity + " 件 ・ 已售出 " + p.sold_count + " 件")) + "</p>" +
          "<p>" + esc(p.description || "").replace(/\n/g, "<br>") + "</p>" +
          (state.user
            ? (out ? '<p class="callout">' + bi("This item is sold out.", "這件商品已售完。") + "</p>"
              : '<div class="qty-row">' +
                  '<label for="detail-qty">' + bi("Quantity", "數量") + "</label>" +
                  '<input type="number" id="detail-qty" min="1" max="' + p.quantity + '" value="1">' +
                  '<button class="btn btn-primary" type="button" id="detail-add">' + bi("Add to cart", "加入購物車") + "</button>" +
                "</div>")
            : '<div class="callout"><p>' + bi("Sign in to add this to your cart.", "登入後即可加入購物車。") + "</p>" +
              '<button class="btn btn-primary btn-sm" type="button" id="detail-signin">' + bi("Sign in", "登入") + "</button></div>") +
        "</div>" +
      "</div>";

    openModal("product-modal");
    if ($("detail-add")) {
      $("detail-add").addEventListener("click", function () {
        addToCart(p, parseInt($("detail-qty").value, 10) || 1);
        closeModal("product-modal");
      });
    }
    if ($("detail-signin")) {
      $("detail-signin").addEventListener("click", function () { closeModal("product-modal"); openAuth(); });
    }
  }

  function openModal(id) { $(id).hidden = false; document.body.classList.add("mk-locked"); }
  function closeModal(id) { $(id).hidden = true; document.body.classList.remove("mk-locked"); }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-close-product]") || e.target.id === "product-modal") closeModal("product-modal");
    if (e.target.closest("[data-close-auth]") || e.target.id === "auth-modal") closeModal("auth-modal");
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    closeModal("product-modal"); closeModal("auth-modal"); closeCart();
  });

  /* =========================================================
     3. Cart → order (slide 9)
     The cart lives in this browser only. The order is created by
     rpc_place_order, which re-reads prices and stock from the
     database — the numbers below are only what the buyer sees.
     ========================================================= */
  function readCart() {
    try { state.cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); }
    catch (e) { state.cart = []; }
  }

  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch (e) { /* ignore */ }
    renderCart();
  }

  function addToCart(p, qty) {
    qty = Math.max(1, Math.min(qty, Number(p.quantity)));
    var line = state.cart.filter(function (c) { return c.product_id === p.id; })[0];
    if (line) line.quantity = Math.min(line.quantity + qty, Number(p.quantity));
    else state.cart.push({ product_id: p.id, quantity: qty });
    saveCart();
    toast(p.name + " → " + (window.document.documentElement.getAttribute("data-lang") === "zh" ? "購物車" : "cart"));
    openCart();
  }

  function cartLines() {
    return state.cart.map(function (c) {
      var p = state.products.filter(function (x) { return x.id === c.product_id; })[0];
      return p ? { product: p, quantity: Math.min(c.quantity, Number(p.quantity)) } : null;
    }).filter(Boolean);
  }

  function renderCart() {
    var lines = cartLines();
    var total = lines.reduce(function (sum, l) { return sum + Number(l.product.price) * l.quantity; }, 0);
    $("cart-count").textContent = lines.reduce(function (n, l) { return n + l.quantity; }, 0);
    $("cart-total").textContent = money(total);
    $("cart-submit").disabled = !lines.length || !state.user;

    if (!lines.length) {
      $("cart-body").innerHTML = '<p class="empty-state">' + bi("Your cart is empty.", "購物車是空的。") + "</p>";
      return;
    }

    // group by seller — each seller becomes its own order
    var bySeller = {};
    lines.forEach(function (l) {
      var k = l.product.seller_id;
      (bySeller[k] = bySeller[k] || []).push(l);
    });

    $("cart-body").innerHTML = Object.keys(bySeller).map(function (k, i) {
      return '<div class="cart-group"><h4>' + bi("Order " + (i + 1), "訂單 " + (i + 1)) + "</h4>" +
        bySeller[k].map(function (l) {
          return '<div class="cart-line" data-id="' + l.product.id + '">' +
            "<div><strong>" + esc(l.product.name) + "</strong>" +
            '<span class="muted">' + money(l.product.price) + " × " + l.quantity + "</span></div>" +
            '<div class="cart-line-actions">' +
              '<input type="number" min="1" max="' + l.product.quantity + '" value="' + l.quantity + '" data-qty aria-label="Quantity">' +
              '<button class="icon-btn danger" type="button" data-remove aria-label="Remove">&times;</button>' +
            "</div></div>";
        }).join("") + "</div>";
    }).join("");

    $("cart-body").querySelectorAll(".cart-line").forEach(function (row) {
      var id = row.getAttribute("data-id");
      row.querySelector("[data-qty]").addEventListener("change", function (e) {
        var line = state.cart.filter(function (c) { return c.product_id === id; })[0];
        if (line) line.quantity = Math.max(1, parseInt(e.target.value, 10) || 1);
        saveCart();
      });
      row.querySelector("[data-remove]").addEventListener("click", function () {
        state.cart = state.cart.filter(function (c) { return c.product_id !== id; });
        saveCart();
      });
    });
  }

  function openCart() { $("cart").hidden = false; $("backdrop").hidden = false; document.body.classList.add("mk-locked"); }
  function closeCart() { $("cart").hidden = true; $("backdrop").hidden = true; document.body.classList.remove("mk-locked"); }

  $("mk-cart-open").addEventListener("click", openCart);
  $("cart-close").addEventListener("click", closeCart);
  $("backdrop").addEventListener("click", closeCart);

  $("cart-submit").addEventListener("click", function () {
    if (!state.user) { openAuth(); return; }
    var items = cartLines().map(function (l) {
      return { product_id: l.product.id, quantity: l.quantity };
    });
    if (!items.length) return;

    var btn = $("cart-submit");
    btn.disabled = true;
    DB.placeOrder(items, $("cart-note").value).then(function (res) {
      if (res.error) { toast(errorText(res.error), true); btn.disabled = false; return; }
      var orders = res.data || [];
      state.cart = [];
      $("cart-note").value = "";
      saveCart();
      closeCart();
      toast(orders.length === 1
        ? "Order " + orders[0].order_no + " created. The seller has been notified."
        : orders.length + " orders created, one per seller.");
      loadProducts();
      loadPurchases();
      loadShop();
      selectTab("tab-orders");
    });
  });

  /* =========================================================
     4. The buyer's view of the transaction (slide 12)
     ========================================================= */
  function loadPurchases() {
    if (!state.user) return;
    DB.myPurchases(state.user.id).then(function (res) {
      if (res.error) { toast(errorText(res.error), true); return; }
      state.purchases = res.data || [];
      renderPurchases();
    });
  }

  function orderItemsHTML(o) {
    return '<ul class="order-items">' + (o.order_items || []).map(function (it) {
      return "<li><span>" + esc(it.product_name) + " × " + it.quantity + "</span><span>" + money(it.subtotal) + "</span></li>";
    }).join("") + "</ul>";
  }

  function orderCard(o, side) {
    var actions = [];
    if (side === "buyer") {
      if (o.status === "awaiting_payment") {
        actions.push(btnHTML("cancelled", bi("Cancel order", "取消訂單"), "btn-outline"));
        actions.push('<span class="muted next-step">' + bi("Pay the seller, then they confirm it here.", "請向賣家付款，賣家將在此確認。") + "</span>");
      }
      if (o.status === "ready_to_ship") actions.push('<span class="muted next-step">' + bi("Payment confirmed. Waiting for the seller to ship.", "已確認收款，等待賣家出貨。") + "</span>");
      if (o.status === "shipped") actions.push(btnHTML("completed", bi("I received it", "我已收到"), "btn-primary"));
    } else {
      if (o.status === "awaiting_payment") actions.push(btnHTML("ready_to_ship", bi("Confirm payment received", "確認已收款"), "btn-primary"));
      if (o.status === "ready_to_ship") actions.push(btnHTML("shipped", bi("Mark as shipped", "標記為已出貨"), "btn-primary"));
      if (o.status === "shipped") actions.push('<span class="muted next-step">' + bi("Waiting for the buyer to confirm.", "等待買家確認收到。") + "</span>");
      if (o.status === "awaiting_payment") actions.push(btnHTML("cancelled", bi("Cancel", "取消"), "btn-outline"));
    }

    var who = side === "buyer"
      ? bi("Sold by ", "賣家：") + esc(o.seller_shop || o.seller_name || "—")
      : bi("Bought by ", "買家：") + esc(o.buyer_name || o.buyer_email || "—");

    return '<article class="order-card" data-order="' + o.id + '">' +
      '<header><div><strong>' + esc(o.order_no) + "</strong>" +
        '<span class="muted"> · ' + dateTime(o.created_at) + "</span></div>" +
        statusBadge(o.status) + "</header>" +
      '<p class="order-who">' + who + "</p>" +
      orderItemsHTML(o) +
      (o.buyer_note ? '<p class="order-note">' + bi("Note: ", "備註：") + esc(o.buyer_note) + "</p>" : "") +
      '<footer><span class="order-total">' + bi("Total ", "總計 ") + money(o.total) + "</span>" +
        '<span class="order-actions">' + actions.join("") + "</span></footer>" +
      trailHTML(o) +
      "</article>";
  }

  function btnHTML(to, label, cls) {
    return '<button class="btn ' + cls + ' btn-sm" type="button" data-to="' + to + '">' + label + "</button>";
  }

  // The four timestamps the database wrote: the history of this order.
  function trailHTML(o) {
    var steps = [
      { t: o.created_at, label: bi("Ordered", "已下單") },
      { t: o.paid_at, label: bi("Payment confirmed", "已確認收款") },
      { t: o.shipped_at, label: bi("Shipped", "已出貨") },
      { t: o.completed_at, label: bi("Completed", "已完成") }
    ];
    if (o.cancelled_at) steps.push({ t: o.cancelled_at, label: bi("Cancelled", "已取消") });
    return '<ol class="order-trail">' + steps.map(function (s) {
      return "<li" + (s.t ? ' class="done"' : "") + "><span>" + s.label + "</span><small>" + (s.t ? dateTime(s.t) : "—") + "</small></li>";
    }).join("") + "</ol>";
  }

  function wireOrderActions(container, list) {
    container.querySelectorAll("[data-order]").forEach(function (card) {
      var id = card.getAttribute("data-order");
      card.querySelectorAll("[data-to]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var to = btn.getAttribute("data-to");
          if (to === "cancelled" && !confirm("Cancel this order? The stock goes back to the seller.")) return;
          btn.disabled = true;
          DB.advanceOrder(id, to).then(function (res) {
            if (res.error) { toast(errorText(res.error), true); btn.disabled = false; return; }
            toast(res.data.order_no + " → " + DB.statusInfo(res.data.status).en);
            loadPurchases();
            loadShop();
            loadProducts();
          });
        });
      });
    });
    return list;
  }

  function renderPurchases() {
    var box = $("purchase-list");
    var open = state.purchases.filter(function (o) { return ["awaiting_payment", "ready_to_ship", "shipped"].indexOf(o.status) !== -1; });
    var done = state.purchases.filter(function (o) { return ["completed", "cancelled"].indexOf(o.status) !== -1; });
    var spent = state.purchases
      .filter(function (o) { return o.status !== "cancelled"; })
      .reduce(function (s, o) { return s + Number(o.total); }, 0);

    $("buyer-stats").innerHTML = statHTML([
      [open.length, bi("Orders in progress", "進行中訂單")],
      [done.filter(function (o) { return o.status === "completed"; }).length, bi("Completed", "已完成")],
      [money(spent), bi("Spent in total", "累計消費")]
    ]);

    if (!state.purchases.length) {
      box.innerHTML = '<p class="empty-state">' + bi("You have not ordered anything yet.", "你還沒有任何訂單。") + "</p>";
      return;
    }

    box.innerHTML =
      (open.length ? "<h3>" + bi("In progress", "進行中") + "</h3>" + open.map(function (o) { return orderCard(o, "buyer"); }).join("") : "") +
      (done.length ? "<h3>" + bi("Purchase history", "購買紀錄") + "</h3>" + done.map(function (o) { return orderCard(o, "buyer"); }).join("") : "");
    wireOrderActions(box);
  }

  function statHTML(pairs) {
    return pairs.map(function (p) {
      return '<div class="stat"><span class="stat-num">' + p[0] + '</span><span class="stat-label">' + p[1] + "</span></div>";
    }).join("");
  }

  /* =========================================================
     5. The seller's view of the same transactions (slides 10–15)
     ========================================================= */
  function loadShop() {
    if (!state.user) return;
    var status = state.shop ? state.shop.seller_status : "none";

    $("seller-gate").hidden = status === "approved";
    $("seller-area").hidden = status !== "approved";
    $("seller-pending").hidden = status !== "pending";
    $("seller-request-form").hidden = status === "pending";

    if (status !== "approved") return;

    $("shop-label").innerHTML = esc(state.shop.shop_name || state.shop.display_name || state.user.email);

    DB.listMyProducts(state.user.id).then(function (res) {
      if (res.error) { toast(errorText(res.error), true); return; }
      state.mine = res.data || [];
      renderInventory();
    });

    DB.mySales(state.user.id).then(function (res) {
      if (res.error) { toast(errorText(res.error), true); return; }
      state.sales = res.data || [];
      renderSales();
    });
  }

  /* ---------- becoming a seller ---------- */
  $("seller-request-form").addEventListener("submit", function (e) {
    e.preventDefault();
    DB.requestSeller($("shop-name").value).then(function (res) {
      if (res.error) { toast(errorText(res.error), true); return; }
      toast("Request sent. A platform administrator will approve your shop.");
      DB.myShop(state.user.id).then(function (r) {
        state.shop = r.data;
        renderAccount();
        loadShop();
      });
    });
  });

  /* ---------- listing form ---------- */
  function fillSelects() {
    $("p-category").innerHTML = DB.CATEGORIES.map(function (c) {
      return '<option value="' + esc(c.key) + '">' + esc(c.key) + "</option>";
    }).join("");
    $("p-status").innerHTML = DB.LISTING_STATUS.map(function (s) {
      return '<option value="' + s.key + '">' + (lang() === "zh" ? s.zh : s.en) + "</option>";
    }).join("");
  }

  function setImagePreview(url) {
    $("p-image-preview").innerHTML = url
      ? '<img src="' + esc(url) + '" alt="">'
      : '<span class="thumb-glyph">' + categoryIcon($("p-category").value) + "</span>";
  }

  function resetProductForm() {
    state.editing = null;
    state.pendingImage = null;
    $("product-form").reset();
    $("p-quantity").value = 1;
    $("product-form-title").innerHTML = bi("List a product", "上架商品");
    $("product-submit").innerHTML = bi("Publish listing", "發佈商品");
    $("product-cancel-edit").hidden = true;
    setImagePreview("");
  }

  function startEdit(p) {
    state.editing = p;
    state.pendingImage = null;
    $("p-name").value = p.name;
    $("p-category").value = p.category;
    $("p-status").value = p.status;
    $("p-price").value = Number(p.price);
    $("p-quantity").value = p.quantity;
    $("p-description").value = p.description || "";
    setImagePreview(p.image_url || "");
    $("product-form-title").innerHTML = bi("Edit listing", "編輯商品");
    $("product-submit").innerHTML = bi("Save changes", "儲存變更");
    $("product-cancel-edit").hidden = false;
    $("product-form").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  $("product-cancel-edit").addEventListener("click", resetProductForm);
  $("p-category").addEventListener("change", function () {
    if (!$("p-image-preview").querySelector("img")) setImagePreview("");
  });
  $("p-image").addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    state.pendingImage = file || null;
    if (file) setImagePreview(URL.createObjectURL(file));
  });

  $("product-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var submit = $("product-submit");
    submit.disabled = true;

    var row = {
      name: $("p-name").value.trim(),
      category: $("p-category").value,
      status: $("p-status").value,
      price: Number($("p-price").value || 0),
      quantity: parseInt($("p-quantity").value, 10) || 0,
      description: $("p-description").value.trim() || null
    };

    var work = state.pendingImage
      ? DB.uploadProductImage(state.pendingImage).then(function (url) { row.image_url = url; })
      : Promise.resolve();

    work.then(function () {
      if (state.editing) return DB.updateProduct(state.editing.id, row);
      row.seller_id = state.user.id;
      return DB.createProduct(row);
    }).then(function (res) {
      if (res.error) throw res.error;
      toast(state.editing ? "Listing updated." : "Listing published.");
      resetProductForm();
      loadShop();
      loadProducts();
    }).catch(function (err) {
      toast(errorText(err), true);
    }).then(function () { submit.disabled = false; });
  });

  /* ---------- inventory ---------- */
  function renderInventory() {
    var body = $("inventory-rows");
    $("inventory-count").innerHTML = bi(state.mine.length + " listings", state.mine.length + " 件商品");

    if (!state.mine.length) {
      body.innerHTML = '<tr><td colspan="6"><p class="empty-state">' +
        bi("You have not listed anything yet.", "你尚未上架任何商品。") + "</p></td></tr>";
      return;
    }

    body.innerHTML = state.mine.map(function (p) {
      return '<tr data-id="' + p.id + '">' +
        "<td><strong>" + esc(p.name) + "</strong><br><small class=\"muted\">" + esc(p.category) + "</small></td>" +
        "<td>" + money(p.price) + "</td>" +
        '<td><input class="qty-input" type="number" min="0" value="' + p.quantity + '" data-stock aria-label="Stock"></td>' +
        "<td>" + p.sold_count + "</td>" +
        '<td><select data-status aria-label="Listing status">' + DB.LISTING_STATUS.map(function (s) {
          return '<option value="' + s.key + '"' + (p.status === s.key ? " selected" : "") + ">" + (lang() === "zh" ? s.zh : s.en) + "</option>";
        }).join("") + "</select></td>" +
        '<td class="row-actions">' +
          '<button class="btn btn-outline btn-sm" type="button" data-edit>' + bi("Edit", "編輯") + "</button>" +
          '<button class="icon-btn danger" type="button" data-delete aria-label="Delete">&times;</button>' +
        "</td></tr>";
    }).join("");

    body.querySelectorAll("tr[data-id]").forEach(function (tr) {
      var id = tr.getAttribute("data-id");
      var p = state.mine.filter(function (x) { return x.id === id; })[0];

      tr.querySelector("[data-stock]").addEventListener("change", function (e) {
        var q = Math.max(0, parseInt(e.target.value, 10) || 0);
        DB.updateProduct(id, { quantity: q }).then(function (res) {
          if (res.error) { toast(errorText(res.error), true); return; }
          toast("Stock of " + p.name + " set to " + q + ".");
          loadShop(); loadProducts();
        });
      });

      tr.querySelector("[data-status]").addEventListener("change", function (e) {
        DB.updateProduct(id, { status: e.target.value }).then(function (res) {
          if (res.error) { toast(errorText(res.error), true); return; }
          loadShop(); loadProducts();
        });
      });

      tr.querySelector("[data-edit]").addEventListener("click", function () { startEdit(p); });

      tr.querySelector("[data-delete]").addEventListener("click", function () {
        if (!confirm("Remove “" + p.name + "” from the marketplace?\nOrders that already include it keep their record.")) return;
        DB.deleteProduct(id).then(function (res) {
          if (res.error) { toast(errorText(res.error), true); return; }
          toast("Listing removed.");
          loadShop(); loadProducts();
        });
      });
    });
  }

  /* ---------- seller orders, dashboard and CSV ---------- */
  function renderSales() {
    var open = state.sales.filter(function (o) { return ["awaiting_payment", "ready_to_ship", "shipped"].indexOf(o.status) !== -1; });
    var done = state.sales.filter(function (o) { return ["completed", "cancelled"].indexOf(o.status) !== -1; });

    var now = new Date();
    var monthly = state.sales.filter(function (o) {
      if (o.status !== "completed" || !o.completed_at) return false;
      var d = new Date(o.completed_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).reduce(function (s, o) { return s + Number(o.total); }, 0);

    var waitingPayment = state.sales.filter(function (o) { return o.status === "awaiting_payment"; });
    var toShip = state.sales.filter(function (o) { return o.status === "ready_to_ship"; });

    $("seller-stats").innerHTML = statHTML([
      [money(monthly), bi("Revenue this month", "本月營收")],
      [state.sales.filter(function (o) { return o.status === "completed"; }).length, bi("Completed orders", "已完成訂單")],
      [waitingPayment.length, bi("Waiting for payment", "待付款")],
      [toShip.length, bi("Waiting to be shipped", "待出貨")]
    ]);

    var box = $("sales-open");
    box.innerHTML = open.length
      ? open.map(function (o) { return orderCard(o, "seller"); }).join("")
      : '<p class="empty-state">' + bi("Nothing to do right now.", "目前沒有待處理的訂單。") + "</p>";
    wireOrderActions(box);

    $("sales-history-rows").innerHTML = done.length
      ? done.map(function (o) {
          return "<tr><td>" + esc(o.order_no) + "</td><td>" + date(o.completed_at || o.cancelled_at || o.created_at) + "</td>" +
            "<td>" + esc(o.buyer_name || o.buyer_email || "—") + "</td>" +
            "<td>" + (o.order_items || []).map(function (i) { return esc(i.product_name) + " ×" + i.quantity; }).join("<br>") + "</td>" +
            "<td>" + money(o.total) + "</td><td>" + statusBadge(o.status) + "</td></tr>";
        }).join("")
      : '<tr><td colspan="6"><p class="empty-state">' + bi("No completed sales yet.", "尚無已完成的交易。") + "</p></td></tr>";
  }

  // Same CSV helpers as the alumni module: a BOM so Excel opens the
  // Chinese characters correctly, quotes around anything risky.
  function toCSV(rows, cols) {
    var cell = function (v) {
      v = v == null ? "" : String(v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    return "﻿" + [cols.join(",")].concat(rows.map(function (r) {
      return cols.map(function (c) { return cell(r[c]); }).join(",");
    })).join("\n");
  }

  function download(filename, content) {
    var blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  $("sales-export").addEventListener("click", function () {
    if (!state.sales.length) { toast("No sales to export yet.", true); return; }
    var rows = state.sales.map(function (o) {
      return {
        order_no: o.order_no,
        created_at: o.created_at,
        buyer: o.buyer_name || "",
        buyer_email: o.buyer_email || "",
        items: (o.order_items || []).map(function (i) { return i.product_name + " x" + i.quantity; }).join(" | "),
        units: (o.order_items || []).reduce(function (n, i) { return n + i.quantity; }, 0),
        amount_ntd: Number(o.total),
        status: DB.statusInfo(o.status).en,
        paid_at: o.paid_at || "",
        shipped_at: o.shipped_at || "",
        completed_at: o.completed_at || ""
      };
    });
    download("immba-sales-" + new Date().toISOString().slice(0, 10) + ".csv",
      toCSV(rows, ["order_no", "created_at", "buyer", "buyer_email", "items", "units",
                   "amount_ntd", "status", "paid_at", "shipped_at", "completed_at"]));
    toast(rows.length + " transactions exported.");
  });

  /* =========================================================
     6. Sign in / register (the same accounts as the back office)
     ========================================================= */
  function openAuth() { openModal("auth-modal"); }

  function setAuthMode(mode) {
    state.authMode = mode;
    var signup = mode === "signup";
    $("mk-field-name").hidden = !signup;
    $("auth-heading").innerHTML = signup ? bi("Create your account", "註冊帳號") : bi("Sign in to buy or sell", "登入後即可買賣");
    $("mk-auth-submit").innerHTML = signup ? bi("Create account", "建立帳號") : bi("Sign in", "登入");
    $("mk-password").setAttribute("autocomplete", signup ? "new-password" : "current-password");
    document.querySelector('[data-mk-mode="signup"]').hidden = signup;
    document.querySelector('[data-mk-mode="signin"]').hidden = !signup;
  }

  document.querySelectorAll("[data-mk-mode]").forEach(function (btn) {
    btn.addEventListener("click", function () { setAuthMode(btn.getAttribute("data-mk-mode")); });
  });

  $("mk-auth-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("mk-email").value.trim();
    var password = $("mk-password").value;
    var submit = $("mk-auth-submit");
    submit.disabled = true;

    var work = state.authMode === "signup"
      ? DB.signUp(email, password, $("mk-name").value.trim())
      : DB.signIn(email, password);

    work.then(function (res) {
      submit.disabled = false;
      if (res.error) { toast(errorText(res.error), true); return; }
      if (state.authMode === "signup" && res.data.user && !res.data.session) {
        toast("Check your inbox and confirm the email address, then sign in.");
        setAuthMode("signin");
        return;
      }
      closeModal("auth-modal");
      toast("Signed in.");
    });
  });

  /* =========================================================
     7. Start
     ========================================================= */
  function selectTab(id) {
    var btn = document.querySelector('[data-tabs] .tab-btn[data-tab="' + id + '"]');
    if (btn) btn.click();
  }

  $("mk-search").addEventListener("input", function (e) { state.search = e.target.value; renderProducts(); });
  $("mk-sort").addEventListener("change", function (e) { state.sort = e.target.value; renderProducts(); });
  $("orders-refresh").addEventListener("click", function () { loadPurchases(); loadProducts(); });
  document.addEventListener("langchange", function () {
    localizeSelects();
    var keep = { status: $("p-status").value, category: $("p-category").value };
    fillSelects();
    $("p-status").value = keep.status;
    $("p-category").value = keep.category;
    renderAccount(); renderCategories(); renderProducts(); renderCart();
    if (state.purchases.length) renderPurchases();
    if (state.sales.length) renderSales();
    if (state.mine.length) renderInventory();
  });

  fillSelects();
  localizeSelects();
  resetProductForm();
  readCart();
  renderCart();
  paintIcons();

  loadProducts().then(function () { renderCart(); });

  DB.getSession().then(function (res) { applySession(res.data ? res.data.session : null); });
  DB.onAuthChange(function (_event, session) { applySession(session); });
})();
