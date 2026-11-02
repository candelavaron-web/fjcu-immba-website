/* Midterm deck: keyboard / click navigation, scaling and fullscreen. */
(function () {
  "use strict";
  var slides = [].slice.call(document.querySelectorAll(".slide"));
  var stage = document.getElementById("stage");
  var bar = document.getElementById("bar");
  var counter = document.getElementById("counter");
  var index = 0;

  function hashIndex() {
    var n = parseInt(location.hash.replace("#", ""), 10);
    return isNaN(n) ? 0 : Math.min(Math.max(n - 1, 0), slides.length - 1);
  }

  function show(i) {
    index = Math.min(Math.max(i, 0), slides.length - 1);
    slides.forEach(function (s, n) { s.classList.toggle("active", n === index); });
    bar.style.width = ((index + 1) / slides.length * 100) + "%";
    counter.textContent = (index + 1) + " / " + slides.length;
    history.replaceState(null, "", "#" + (index + 1));
  }

  // Scale the fixed 1280×720 canvas to the window
  function fit() {
    var pad = window.innerWidth < 900 ? 8 : 24;
    var scale = Math.min((window.innerWidth - pad * 2) / 1280, (window.innerHeight - pad * 2) / 720);
    slides.forEach(function (s) {
      s.style.transform = "translate(-50%, -50%) scale(" + scale + ")";
    });
  }

  window.addEventListener("resize", fit);
  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); show(index + 1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); show(index - 1); }
    if (e.key === "Home") show(0);
    if (e.key === "End") show(slides.length - 1);
    if (e.key === "f" || e.key === "F") {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    }
  });
  stage.addEventListener("click", function (e) {
    show(e.clientX < window.innerWidth * 0.3 ? index - 1 : index + 1);
  });

  window.addEventListener("hashchange", function () { show(hashIndex()); });

  fit();
  show(hashIndex());
})();
