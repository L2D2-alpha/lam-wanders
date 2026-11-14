
(function () {
  var params = new URLSearchParams(location.search);
  var slug = params.get("trip") || params.get("slug") || "";
  var missingEl = document.getElementById("trip-missing");
  var tripEl = document.getElementById("trip");

  function showMissing() {
    missingEl.hidden = false;
    tripEl.hidden = true;
    document.title = "Trip not found — Lam Wanders";
  }

  function entryHtml(entry, trip) {
    var decorated = Diary.decorateEntry(entry, trip);
    var place = decorated.place || "A stop along the way";
    var where = Diary.whereLineHtml(decorated);
    var href = Diary.entryHref(decorated);
    var cover = Diary.coverImage(decorated);
    var count = Diary.entryPhotos(decorated).length;
    var text = decorated.text || decorated.caption || "";
    var badge = decorated.highlight ? '<span class="pill">Highlight</span>' : "";
    var moreLabel = count > 1 ? "Open this stop · " + count + " photos" : "Open this stop";
    var preview = cover
      ? '<a class="entry-preview" href="' + Diary.escapeHtml(href) + '">' +
          '<img src="' + Diary.escapeHtml(cover) + '" alt="' + Diary.escapeHtml(place) + '">' +
        "</a>"
      : "";
    return (
      '<article class="entry" id="' + Diary.escapeHtml(decorated.entryId) + '">' +
        '<header class="entry-header">' +
          '<h2 class="entry-place"><a href="' + Diary.escapeHtml(href) + '">' + Diary.escapeHtml(place) + "</a>" + badge + "</h2>" +
          (where ? '<p class="entry-where">' + where + "</p>" : "") +
        "</header>" +
        preview +
        (text ? '<p class="entry-text">' + Diary.escapeHtml(text) + "</p>" : "") +
        '<p class="entry-more"><a href="' + Diary.escapeHtml(href) + '">' + Diary.escapeHtml(moreLabel) + "</a></p>" +
      "</article>"
    );
  }

  function pinIcon() {
    return L.divIcon({
      className: "clay-pin",
      html: '<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14 1c7.2 0 13 5.7 13 12.8 0 9.2-13 21.2-13 21.2S1 23 1 13.8C1 6.7 6.8 1 14 1z" fill="#b5432b" stroke="#8a2e1c" stroke-width="1.2"/><circle cx="14" cy="13.5" r="5.2" fill="#fbf6ec"/></svg>',
      iconSize: [28, 36],
      iconAnchor: [14, 36],
      popupAnchor: [0, -30]
    });
  }

  function drawMap(entries) {
    var points = entries.filter(function (e) {
      return typeof e.lat === "number" && typeof e.lng === "number" && isFinite(e.lat) && isFinite(e.lng);
    });
    var wrap = document.getElementById("map-wrap");
    if (!points.length || typeof L === "undefined") {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    var map = L.map("map", { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    var icon = pinIcon();
    var bounds = [];
    points.forEach(function (e) {
      var marker = L.marker([e.lat, e.lng], { icon: icon }).addTo(map);
      var loc = Diary.locationLabel(e);
      var href = Diary.entryHref(Diary.decorateEntry(e, { slug: slug, title: document.getElementById("trip-title").textContent }));
      var label = '<a href="' + Diary.escapeHtml(href) + '">' + Diary.escapeHtml(e.place || "Stop") + "</a>";
      if (loc) label += "<br>" + Diary.escapeHtml(loc);
      marker.bindPopup(label);
      bounds.push([e.lat, e.lng]);
    });
    if (bounds.length === 1) {
      map.setView(bounds[0], 12);
    } else {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 12 });
    }
    setTimeout(function () { map.invalidateSize(); }, 200);
  }

  Diary.loadTrips()
    .then(function (trips) {
      var trip = trips.filter(function (t) { return t && t.slug === slug; })[0];
      if (!trip) {
        showMissing();
        return;
      }
      missingEl.hidden = true;
      tripEl.hidden = false;
      var entries = Diary.sortEntries(trip.entries);
      var title = trip.title || "Untitled trip";
      document.title = title + " — Lam Wanders";
      document.getElementById("trip-title").textContent = title;
      var dates = Diary.tripDates(trip);
      var dateEl = document.getElementById("trip-dates");
      if (dates) dateEl.textContent = dates;
      else dateEl.hidden = true;
      var summaryEl = document.getElementById("trip-summary");
      if (trip.summary) {
        summaryEl.hidden = false;
        summaryEl.textContent = trip.summary;
      }
      document.getElementById("entries").innerHTML = entries.length
        ? entries.map(function (entry) { return entryHtml(entry, trip); }).join("")
        : '<p class="trip-summary">No entries on this trip yet.</p>';
      drawMap(entries);
      if (location.hash) {
        var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target) target.scrollIntoView();
      }
    })
    .catch(showMissing);
})();
