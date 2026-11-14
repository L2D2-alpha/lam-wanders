
(function () {
  var emptyEl = document.getElementById("empty-state");
  var homeEl = document.getElementById("home");
  var checkInEl = document.getElementById("check-in");
  var hintEl = document.getElementById("timeline-hint");
  var pinEl = document.getElementById("timeline-pin");
  var stickyEl = document.getElementById("timeline-sticky");
  var viewportEl = document.getElementById("timeline-viewport");
  var trackEl = document.getElementById("timeline-track");
  var headerEl = document.querySelector(".site-header");
  var nativeMq = window.matchMedia("(max-width: 700px), (prefers-reduced-motion: reduce)");
  var entries = [];
  var ticking = false;

  function isNative() {
    return nativeMq.matches;
  }

  function headerHeight() {
    return headerEl ? Math.round(headerEl.getBoundingClientRect().height) : 0;
  }

  function setHeaderOffset() {
    document.documentElement.style.setProperty("--home-header-h", headerHeight() + "px");
  }

  function tileHtml(entry, featured, yearStart) {
    var place = entry.place || "A stop along the way";
    var href = Diary.entryHref(entry);
    var cover = Diary.coverImage(entry);
    var photos = Diary.entryPhotos(entry);
    var date = Diary.formatShortDate(entry.date);
    var text = Diary.escapeHtml(Diary.shortText(entry));
    var badge = entry.highlight ? '<span class="pill">Highlight</span>' : "";
    var count = photos.length;
    var countLabel = count > 1
      ? '<span class="photo-count">' + count + " photos</span>"
      : "";
    var img = cover
      ? '<img src="' + Diary.escapeHtml(cover) + '" alt="' + Diary.escapeHtml(place) + '">'
      : '<div class="htimeline-tile-empty" aria-hidden="true"></div>';
    var year = Diary.yearOf(entry.date);
    var dateHtml = yearStart && year
      ? '<span class="htimeline-stop-year">' + Diary.escapeHtml(String(year)) + "</span>" +
        '<span>' + Diary.escapeHtml(date) + "</span>"
      : Diary.escapeHtml(date);
    var klass = "htimeline-stop" + (featured ? " is-featured" : "") + (yearStart ? " is-year-start" : "");
    return (
      '<article class="' + klass + '" role="listitem">' +
        '<div class="htimeline-tick" aria-hidden="true"></div>' +
        '<p class="htimeline-date">' + dateHtml + "</p>" +
        '<a class="htimeline-tile" href="' + Diary.escapeHtml(href) + '">' +
          '<div class="htimeline-thumb">' + img + "</div>" +
          '<div class="htimeline-tile-copy">' +
            "<h2>" + Diary.escapeHtml(place) + badge + "</h2>" +
            (text ? '<p>' + text + "</p>" : "") +
            countLabel +
          "</div>" +
        "</a>" +
      "</article>"
    );
  }

  function renderTrack(list) {
    var html = [];
    var lastYear = null;
    list.forEach(function (entry, index) {
      var year = Diary.yearOf(entry.date);
      var yearStart = !!(year && year !== lastYear);
      if (yearStart) lastYear = year;
      html.push(tileHtml(entry, index === 0, yearStart));
    });
    trackEl.innerHTML = html.join("");
  }

  function setHint() {
    if (!hintEl) return;
    if (entries.length < 2) {
      hintEl.hidden = true;
      hintEl.textContent = "";
      return;
    }
    hintEl.hidden = false;
    if (window.matchMedia("(max-width: 700px)").matches) {
      hintEl.textContent = "Swipe to move through the years";
    } else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      hintEl.textContent = "Scroll sideways to move through the years";
    } else {
      hintEl.textContent = "Scroll to walk back through the years";
    }
  }

  function overflowWidth() {
    return Math.max(0, trackEl.scrollWidth - viewportEl.clientWidth);
  }

  function layout() {
    setHeaderOffset();
    setHint();
    if (isNative()) {
      pinEl.style.height = "";
      trackEl.style.transform = "";
      stickyEl.classList.add("is-compact");
      stickyEl.style.height = "";
      viewportEl.classList.add("is-native");
      return;
    }
    viewportEl.classList.remove("is-native");
    stickyEl.classList.remove("is-compact");
    stickyEl.style.height = "";
    pinEl.style.height = "";
    var overflow = overflowWidth();
    if (overflow === 0) {
      stickyEl.classList.add("is-compact");
      pinEl.style.height = "";
      trackEl.style.transform = "";
      return;
    }
    pinEl.style.height = (stickyEl.offsetHeight + overflow) + "px";
    updateTransform();
  }

  function updateTransform() {
    if (isNative()) return;
    var overflow = overflowWidth();
    var max = Math.max(0, pinEl.offsetHeight - stickyEl.offsetHeight);
    var scrolled = Math.min(max, Math.max(0, headerHeight() - pinEl.getBoundingClientRect().top));
    var progress = max > 0 ? scrolled / max : 0;
    trackEl.style.transform = "translate3d(" + (-progress * overflow) + "px, 0, 0)";
  }

  function onScrollOrResize() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      if (isNative()) {
        pinEl.style.height = "";
        trackEl.style.transform = "";
        viewportEl.classList.add("is-native");
      } else {
        layout();
      }
    });
  }

  function tiles() {
    return Array.prototype.slice.call(trackEl.querySelectorAll(".htimeline-tile"));
  }

  function focusTile(index) {
    var links = tiles();
    if (!links.length) return;
    var next = links[Math.max(0, Math.min(links.length - 1, index))];
    next.focus();
    if (isNative()) {
      var stop = next.closest(".htimeline-stop");
      if (stop) {
        stop.scrollIntoView({ inline: "center", block: "nearest", behavior: "auto" });
      }
      return;
    }
    if (links.length <= 1) return;
    var max = Math.max(0, pinEl.offsetHeight - stickyEl.offsetHeight);
    var pinTop = pinEl.getBoundingClientRect().top + window.scrollY;
    var target = pinTop - headerHeight() + (index / (links.length - 1)) * max;
    window.scrollTo(0, Math.max(0, target));
  }

  function currentIndex() {
    var links = tiles();
    var active = document.activeElement;
    var index = links.indexOf(active);
    if (index >= 0) return index;
    if (isNative()) {
      var snaps = Array.prototype.slice.call(trackEl.querySelectorAll(".htimeline-stop"));
      var left = viewportEl.scrollLeft;
      var best = 0;
      var bestDist = Infinity;
      snaps.forEach(function (stop, i) {
        var dist = Math.abs(stop.offsetLeft - left);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      return best;
    }
    var max = Math.max(0, pinEl.offsetHeight - stickyEl.offsetHeight);
    var scrolled = Math.min(max, Math.max(0, headerHeight() - pinEl.getBoundingClientRect().top));
    var progress = max > 0 ? scrolled / max : 0;
    return Math.round(progress * (links.length - 1));
  }

  function onKey(event) {
    if (!entries.length || emptyEl.hidden === false) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    var target = event.target;
    if (target && target.closest && target.closest("input, textarea, select")) return;
    var links = tiles();
    if (!links.length) return;
    var index = currentIndex();
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTile(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTile(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTile(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTile(links.length - 1);
    }
  }

  Diary.loadTrips()
    .then(function (trips) {
      entries = Diary.sortEntriesNewest(Diary.flattenEntries(trips));
      if (!entries.length) {
        emptyEl.hidden = false;
        homeEl.hidden = true;
        return;
      }
      emptyEl.hidden = true;
      homeEl.hidden = false;
      var latest = entries[0];
      checkInEl.textContent = "Now / checking in at " + Diary.checkInLabel(latest);
      renderTrack(entries);
      layout();
      window.addEventListener("scroll", onScrollOrResize, { passive: true });
      window.addEventListener("resize", onScrollOrResize);
      if (typeof nativeMq.addEventListener === "function") {
        nativeMq.addEventListener("change", layout);
      } else if (typeof nativeMq.addListener === "function") {
        nativeMq.addListener(layout);
      }
      document.addEventListener("keydown", onKey);
      window.addEventListener("load", layout);
    })
    .catch(function () {
      emptyEl.hidden = false;
      homeEl.hidden = true;
    });
})();
