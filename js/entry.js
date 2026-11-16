
(function () {
  var params = new URLSearchParams(location.search);
  var slug = params.get("trip") || params.get("slug") || "";
  var requestedId = params.get("entry") || params.get("id") || "";
  var missingEl = document.getElementById("entry-missing");
  var entryEl = document.getElementById("entry");
  var galleryEl = document.getElementById("gallery");

  function showMissing() {
    missingEl.hidden = false;
    entryEl.hidden = true;
    document.title = "Entry not found — Lam Wanders";
  }

  function findEntry(trips) {
    var trip = trips.filter(function (item) { return item && item.slug === slug; })[0];
    if (!trip) return null;
    var list = trip.entries || [];
    var match = list.filter(function (item) {
      return Diary.entryId(item, trip) === requestedId;
    })[0];
    if (!match && list.length === 1 && !requestedId) match = list[0];
    if (!match) return null;
    return { trip: trip, entry: Diary.decorateEntry(match, trip) };
  }

  function galleryItem(photo, place) {
    var kind = photo.kind || "photo";
    var kindLabel = Diary.photoKindLabel(photo);
    var caption = photo.caption || photo.alt || place;
    var alt = photo.alt || (place + " (" + kindLabel + ")");
    var land = "";
    return (
      '<figure class="photo-frame ' + Diary.escapeHtml(kind) + land + '">' +
        '<button type="button" data-full="' + Diary.escapeHtml(photo.src) + '" aria-label="Open photo: ' + Diary.escapeHtml(caption) + '">' +
          '<img src="' + Diary.escapeHtml(photo.src) + '" alt="' + Diary.escapeHtml(alt) + '" loading="lazy">' +
        "</button>" +
        "<figcaption><span><b>" + Diary.escapeHtml(caption) + "</b></span>" +
        '<span class="kind">' + Diary.escapeHtml(kindLabel) + "</span></figcaption>" +
      "</figure>"
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

  function drawMap(entry) {
    var wrap = document.getElementById("map-wrap");
    var coords = Diary.entryCoords(entry);
    if (!coords || typeof L === "undefined") {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    var map = L.map("map", { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    var marker = L.marker([coords.lat, coords.lng], { icon: pinIcon() }).addTo(map);
    var label = Diary.escapeHtml(entry.place || "Stop");
    var loc = Diary.locationLabel(entry);
    if (loc) label += "<br>" + Diary.escapeHtml(loc);
    marker.bindPopup(label);
    map.setView([coords.lat, coords.lng], 8);
    setTimeout(function () { map.invalidateSize(); }, 200);
  }

  function render(found) {
    var entry = found.entry;
    var trip = found.trip;
    var place = entry.place || "A stop along the way";
    var photos = Diary.entryPhotos(entry);
    document.title = place + " — Lam Wanders";
    document.getElementById("entry-title").textContent = place;
    var dateEl = document.getElementById("entry-date");
    var day = Diary.tripDayLabel(entry, trip);
    var dateLabel = Diary.formatTileDate(entry.date);
    if (dateLabel && day) dateEl.textContent = dateLabel + " · " + day;
    else if (dateLabel) dateEl.textContent = dateLabel;
    else dateEl.hidden = true;

    var summaryEl = document.getElementById("entry-summary");
    var loc = Diary.locationLabel(entry);
    if (loc) {
      summaryEl.hidden = false;
      summaryEl.textContent = loc;
    }

    var meta = [];
    var count = photos.length;
    if (count) meta.push(count === 1 ? "1 photo" : count + " photos");
    if (entry.type) meta.push(Diary.escapeHtml(entry.type));
    var coords = Diary.entryCoords(entry);
    if (coords) {
      var href = "https://www.google.com/maps?q=" + coords.lat.toFixed(4) + "," + coords.lng.toFixed(4);
      var label = coords.lat.toFixed(4) + ", " + coords.lng.toFixed(4);
      meta.push('<a class="maps-link" href="' + Diary.escapeHtml(href) + '" target="_blank" rel="noopener">Open in Maps</a> (' + Diary.escapeHtml(label) + ")");
    }
    document.getElementById("entry-meta").innerHTML = meta.join('<span aria-hidden="true"> · </span>');

    var tripEl = document.getElementById("entry-trip");
    if (trip.title) {
      tripEl.hidden = false;
      var tripLead = Diary.isGroup(trip) ? "In " : "From the trip ";
      tripEl.innerHTML = tripLead + '<a href="' + Diary.escapeHtml(Diary.tripHref(entry)) + '">' +
        Diary.escapeHtml(trip.title) + "</a>";
    }

    var back = document.getElementById("entry-back");
    var hash = encodeURIComponent(entry.entryId);
    back.innerHTML =
      '<a href="index.html#' + hash + '"><svg viewBox="0 0 22 12" aria-hidden="true"><path d="M21 6.4C15 5.6 8 6.2 2 6.1M6 1.5 1.5 6 6 10.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>Back to the timeline</a>' +
      (trip.slug
        ? '<a href="trip.html?trip=' + encodeURIComponent(trip.slug) + '">' +
          Diary.escapeHtml(trip.title || "This trip") + "</a>"
        : "");

    if (photos.length) {
      galleryEl.hidden = false;
      galleryEl.innerHTML = photos.map(function (photo) { return galleryItem(photo, place); }).join("");
    } else {
      galleryEl.hidden = true;
    }
    var text = entry.text || entry.caption || "";
    var textEl = document.getElementById("entry-text");
    if (text) {
      textEl.hidden = false;
      textEl.textContent = text;
    }
    missingEl.hidden = true;
    entryEl.hidden = false;
    if (window.LamLightbox) window.LamLightbox.init();
    drawMap(entry);
  }

  Diary.loadTrips()
    .then(function (trips) {
      var found = findEntry(trips);
      if (!found) {
        showMissing();
        return;
      }
      render(found);
    })
    .catch(showMissing);
})();
