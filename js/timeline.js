/* Vertical scroll drives a horizontal track. Desktop only, motion allowed only.
   Adapted from the design mockup to run after the track is rendered from trips.json. */
(function (global) {
  var scroller, sticky, track, layers, jumps;
  var wide = window.matchMedia("(min-width: 700px)");
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  var distance = 0, ticking = false, tiles = [];

  function active() { return !!(scroller && track && wide.matches && !calm.matches); }

  function measure() {
    if (!scroller || !track) return;
    if (!active()) {
      scroller.style.height = "";
      track.style.transform = "";
      document.body.classList.remove("is-pinned");
      return;
    }
    distance = Math.max(0, track.scrollWidth - window.innerWidth);
    scroller.style.height = (distance + window.innerHeight) + "px";
    update();
  }

  function progress() {
    var top = scroller.getBoundingClientRect().top;
    return Math.min(1, Math.max(0, -top / (distance || 1)));
  }

  function update() {
    ticking = false;
    if (!active()) { document.body.classList.remove("is-pinned"); return; }
    var top = scroller.getBoundingClientRect().top;
    document.body.classList.toggle("is-pinned", top <= 0 && top > -distance);
    var x = progress() * distance;
    track.style.transform = "translate3d(" + (-x) + "px,0,0)";
    layers.forEach(function (layer) {
      var depth = parseFloat(layer.getAttribute("data-depth") || "0.15");
      layer.style.transform = "translate3d(" + (x * depth) + "px,0,0)";
    });
  }

  function markYear() {
    if (!jumps.length) return;
    var mid = window.innerWidth / 2, current = null;
    jumps.forEach(function (link) {
      var target = document.querySelector(link.getAttribute("href"));
      if (target && target.getBoundingClientRect().left < mid) current = link;
    });
    jumps.forEach(function (link) {
      link.setAttribute("aria-current", link === (current || jumps[0]) ? "true" : "false");
    });
  }

  function scrollToItem(el, smooth) {
    if (!el) return;
    if (!active()) {
      el.scrollIntoView({ block: "nearest", inline: "center" });
      return;
    }
    var x = el.offsetLeft + el.offsetWidth / 2 - window.innerWidth / 2;
    x = Math.min(distance, Math.max(0, x));
    var y = scroller.offsetTop + x;
    window.scrollTo({ top: y, behavior: smooth && !calm.matches ? "smooth" : "auto" });
  }

  function bind() {
    window.addEventListener("scroll", function () {
      requestAnimationFrame(markYear);
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", measure);
    if (wide.addEventListener) wide.addEventListener("change", measure);
    if (calm.addEventListener) calm.addEventListener("change", measure);
    if (document.fonts) document.fonts.ready.then(measure);
    window.addEventListener("load", measure);

    if (track) {
      track.addEventListener("focusin", function (event) {
        var card = event.target.closest(".home-card, .home-year");
        if (card) scrollToItem(card, false);
      });
      track.addEventListener("keydown", function (event) {
        var index = tiles.indexOf(document.activeElement);
        if (index < 0) return;
        var next = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") next = tiles[index + 1];
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = tiles[index - 1];
        if (event.key === "Home") next = tiles[0];
        if (event.key === "End") next = tiles[tiles.length - 1];
        if (next) {
          event.preventDefault();
          next.focus();
        }
      });
    }

    jumps.forEach(function (link) {
      link.addEventListener("click", function (event) {
        var target = document.querySelector(link.getAttribute("href"));
        if (!target) return;
        event.preventDefault();
        scrollToItem(target, true);
      });
    });
  }

  function stampVisited() {
    var key = "lw-visited";
    var seen = {};
    try { seen = JSON.parse(localStorage.getItem(key) || "{}"); } catch (err) {}
    function mark(tile, visiting) {
      var note = tile.querySelector(".visually-hidden");
      if (visiting) tile.classList.add("is-visited");
      if (note) note.textContent = tile.classList.contains("is-visited") ? " (visited)" : "";
    }
    tiles.forEach(function (tile) {
      var id = tile.getAttribute("href") || "";
      mark(tile, !!seen[id]);
      tile.addEventListener("click", function () {
        seen[id] = 1;
        try { localStorage.setItem(key, JSON.stringify(seen)); } catch (err) {}
        if (!tile.classList.contains("is-visited")) tile.classList.add("is-pressing");
        mark(tile, true);
      });
    });
  }

  var bound = false;

  function init() {
    scroller = document.querySelector(".timeline-scroller");
    sticky = document.querySelector(".timeline-sticky");
    track = document.querySelector(".home-track");
    if (!scroller || !track) return;
    layers = Array.prototype.slice.call(document.querySelectorAll(".ink-layer"));
    jumps = Array.prototype.slice.call(document.querySelectorAll(".year-jump a"));
    tiles = Array.prototype.slice.call(track.querySelectorAll(".tile"));
    if (!bound) {
      bind();
      bound = true;
    }
    stampVisited();
    measure();
    if (location.hash) {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) scrollToItem(target, false);
    }
  }

  global.LamTimeline = { init: init, measure: measure, scrollToItem: scrollToItem };
})(window);
