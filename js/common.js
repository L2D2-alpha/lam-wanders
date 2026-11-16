
(function (global) {
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(iso) {
    if (!iso) return "";
    var parts = String(iso).split("-");
    if (parts.length !== 3) return String(iso);
    var date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    if (isNaN(date.getTime())) return String(iso);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    });
  }

  function formatShortDate(iso) {
    if (!iso) return "";
    var parts = String(iso).split("-");
    if (parts.length !== 3) return String(iso);
    var date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    if (isNaN(date.getTime())) return String(iso);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    });
  }

  function formatTileDate(iso) {
    if (!iso) return "";
    var parts = String(iso).split("-");
    if (parts.length !== 3) return String(iso);
    var date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    if (isNaN(date.getTime())) return String(iso);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    });
  }

  function tripDayLabel(entry, trip) {
    var dates = [];
    ((trip && trip.entries) || []).forEach(function (item) {
      if (item && item.date && dates.indexOf(item.date) < 0) dates.push(item.date);
    });
    dates.sort();
    if (!entry || !entry.date || dates.length < 2) return "";
    var index = dates.indexOf(entry.date);
    if (index < 0) return "";
    return "Day " + (index + 1) + " of " + dates.length;
  }

  function formatRange(start, end) {
    if (start && end && start !== end) return formatDate(start) + " – " + formatDate(end);
    return formatDate(start || end);
  }

  function yearOf(iso) {
    if (!iso) return null;
    var year = Number(String(iso).slice(0, 4));
    return year >= 1000 && year <= 9999 ? year : null;
  }

  function tripDates(trip) {
    if (trip.startDate || trip.endDate) return formatRange(trip.startDate, trip.endDate);
    var dates = (trip.entries || []).map(function (e) { return e.date; }).filter(Boolean).sort();
    if (!dates.length) return "";
    return formatRange(dates[0], dates[dates.length - 1]);
  }

  function tripYearSet(trip) {
    var years = {};
    [trip.startDate, trip.endDate].forEach(function (d) {
      var y = yearOf(d);
      if (y) years[y] = true;
    });
    (trip.entries || []).forEach(function (entry) {
      var y = yearOf(entry.date);
      if (y) years[y] = true;
    });
    return years;
  }

  function sortTrips(trips) {
    return (trips || []).slice().sort(function (a, b) {
      var da = a.startDate || latestDate(a.entries) || "";
      var db = b.startDate || latestDate(b.entries) || "";
      return db.localeCompare(da);
    });
  }

  function sortEntriesOldest(entries) {
    return (entries || []).slice().sort(function (a, b) {
      return String(a.date || "").localeCompare(String(b.date || ""));
    });
  }

  function sortEntriesNewest(entries) {
    return (entries || []).slice().sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
  }

  function latestDate(entries) {
    var dates = (entries || []).map(function (e) { return e.date; }).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : "";
  }

  function entryId(entry, trip) {
    if (entry && entry.id) return String(entry.id);
    var raw = [trip && trip.slug, entry && entry.date, entry && entry.place].filter(Boolean).join("-");
    return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "entry";
  }

  function decorateEntry(entry, trip) {
    var copy = {};
    Object.keys(entry || {}).forEach(function (key) { copy[key] = entry[key]; });
    copy.tripSlug = trip && trip.slug;
    copy.tripTitle = trip && trip.title;
    copy.entryId = entryId(entry, trip);
    return copy;
  }

  function flattenEntries(trips) {
    var out = [];
    (trips || []).forEach(function (trip) {
      (trip.entries || []).forEach(function (entry) {
        out.push(decorateEntry(entry, trip));
      });
    });
    return out;
  }

  function shortText(entry) {
    if (entry && entry.shortText) return String(entry.shortText);
    var text = String((entry && (entry.text || entry.caption)) || "").trim();
    if (!text) return "";
    var match = text.match(/^(.+?[.!?])(?:\s+(.+?[.!?]))?/);
    var cut = match ? match[1] + (match[2] ? " " + match[2] : "") : text;
    if (cut.length > 240) cut = cut.slice(0, 220).replace(/\s+\S*$/, "") + "…";
    return cut;
  }

  function locationLabel(entry) {
    if (!entry) return "";
    return entry.area || entry.city || "";
  }

  function whereLine(entry) {
    return [locationLabel(entry), formatDate(entry && entry.date)].filter(Boolean).join(" · ");
  }

  function isGroup(trip) {
    return !!(trip && trip.kind === "group");
  }

  function entryCoords(entry) {
    if (!entry) return null;
    if (entry.lat == null || entry.lng == null || entry.lat === "" || entry.lng === "") return null;
    var lat = Number(entry.lat);
    var lng = Number(entry.lng);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    return { lat: lat, lng: lng };
  }

  function mapsLink(entry) {
    var coords = entryCoords(entry);
    if (!coords) return "";
    var label = coords.lat.toFixed(4) + ", " + coords.lng.toFixed(4);
    var href = "https://www.google.com/maps?q=" + coords.lat.toFixed(4) + "," + coords.lng.toFixed(4);
    return '<a class="maps-link" href="' + escapeHtml(href) + '" target="_blank" rel="noopener">' + escapeHtml(label) + "</a>";
  }

  function whereLineHtml(entry) {
    var line = escapeHtml(whereLine(entry));
    var link = mapsLink(entry);
    if (line && link) return line + " · " + link;
    return line || link;
  }

  function checkInLabel(entry) {
    var place = entry.place || "a new stop";
    var loc = locationLabel(entry);
    return loc ? place + ", " + loc : place;
  }

  function tripHref(entry) {
    if (!entry.tripSlug) return "trips.html";
    return "trip.html?trip=" + encodeURIComponent(entry.tripSlug) + "#" + encodeURIComponent(entry.entryId);
  }

  function entryHref(entry, trip) {
    var slug = (entry && entry.tripSlug) || (trip && trip.slug);
    var id = (entry && entry.entryId) || entryId(entry, trip || { slug: slug });
    if (!slug) return "trips.html";
    return "entry.html?trip=" + encodeURIComponent(slug) + "&entry=" + encodeURIComponent(id);
  }

  function entryPhotos(entry) {
    var photos = [];
    if (entry && Array.isArray(entry.photos) && entry.photos.length) {
      entry.photos.forEach(function (item) {
        if (!item) return;
        if (typeof item === "string") {
          photos.push({ src: item, kind: "photo", alt: "", caption: "" });
          return;
        }
        if (item.src) {
          photos.push({
            src: item.src,
            kind: item.kind || "photo",
            alt: item.alt || "",
            caption: item.caption || ""
          });
        }
      });
      return photos;
    }
    if (entry && entry.styledImage) {
      photos.push({
        src: entry.styledImage,
        kind: "styled",
        alt: (entry.place || "Stop") + " (styled)",
        caption: ""
      });
    }
    if (entry && entry.originalImage) {
      photos.push({
        src: entry.originalImage,
        kind: "original",
        alt: (entry.place || "Stop") + " (original)",
        caption: ""
      });
    }
    return photos;
  }

  function coverImage(entry) {
    if (entry && entry.styledImage) return entry.styledImage;
    var photos = entryPhotos(entry);
    var styled = photos.filter(function (photo) { return photo.kind === "styled"; })[0];
    if (styled) return styled.src;
    return photos[0] ? photos[0].src : "";
  }

  function photoKindLabel(photo) {
    if (!photo) return "Photo";
    if (photo.caption) return photo.caption;
    if (photo.kind === "styled") return "Styled";
    if (photo.kind === "original") return "Original";
    return "Photo";
  }

  function fetchJson(path) {
    return fetch(path, { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error("Could not load " + path);
      return res.json();
    });
  }

  function loadTrips() {
    return fetchJson("data/trips.json").then(function (data) {
      return data && Array.isArray(data.trips) ? data.trips : [];
    });
  }

  function loadYears() {
    return fetchJson("data/years.json").then(function (data) {
      return data && Array.isArray(data.years) ? data.years : [];
    }).catch(function () { return []; });
  }

  function loadAbout() {
    return fetchJson("data/about.json").catch(function () { return null; });
  }

  function yearStats(trips, year) {
    var tripCount = 0;
    var stops = 0;
    var cities = {};
    (trips || []).forEach(function (trip) {
      if (tripYearSet(trip)[year] && !isGroup(trip)) tripCount += 1;
      (trip.entries || []).forEach(function (entry) {
        if (yearOf(entry.date) !== year) return;
        stops += 1;
        if (isGroup(trip)) return;
        var loc = entry.city || entry.area;
        if (loc) cities[String(loc).trim().toLowerCase()] = true;
      });
    });
    return {
      trips: tripCount,
      stops: stops,
      cities: Object.keys(cities).length
    };
  }

  function pluralize(n, one, many) {
    return n + " " + (n === 1 ? one : many);
  }

  function statLine(stats) {
    return [
      pluralize(stats.trips, "trip", "trips"),
      pluralize(stats.stops, "stop", "stops"),
      pluralize(stats.cities, "city", "cities")
    ].join(" · ");
  }

  function yearStatLine(stats) {
    return pluralize(stats.trips, "trip", "trips") + ", " + pluralize(stats.stops, "stop", "stops");
  }

  function photoFigure(src, kind, label) {
    if (!src) return "";
    return (
      '<figure class="photo-frame ' + kind + '">' +
        '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(label) + '" loading="lazy">' +
        "<figcaption>" + (kind === "styled" ? "Styled" : "Original") + "</figcaption>" +
      "</figure>"
    );
  }


  var SEAL_MARKUP = '<span class="seal" aria-hidden="true"><svg viewBox="0 0 40 40"><use href="#seal-lt"/></svg></span>';

  function sealHtml() {
    return SEAL_MARKUP;
  }

  document.querySelectorAll(".site-nav a").forEach(function (link) {
    if (link.getAttribute("data-nav") === document.body.getAttribute("data-page")) {
      link.setAttribute("aria-current", "page");
    }
  });

  global.Diary = {
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    formatShortDate: formatShortDate,
    formatTileDate: formatTileDate,
    tripDayLabel: tripDayLabel,
    formatRange: formatRange,
    yearOf: yearOf,
    tripDates: tripDates,
    sortTrips: sortTrips,
    sortEntries: sortEntriesNewest,
    sortEntriesOldest: sortEntriesOldest,
    sortEntriesNewest: sortEntriesNewest,
    entryId: entryId,
    decorateEntry: decorateEntry,
    flattenEntries: flattenEntries,
    shortText: shortText,
    locationLabel: locationLabel,
    whereLine: whereLine,
    isGroup: isGroup,
    entryCoords: entryCoords,
    mapsLink: mapsLink,
    whereLineHtml: whereLineHtml,
    checkInLabel: checkInLabel,
    tripHref: tripHref,
    entryHref: entryHref,
    entryPhotos: entryPhotos,
    coverImage: coverImage,
    photoKindLabel: photoKindLabel,
    loadTrips: loadTrips,
    loadYears: loadYears,
    loadAbout: loadAbout,
    yearStats: yearStats,
    statLine: statLine,
    yearStatLine: yearStatLine,
    photoFigure: photoFigure,
    sealHtml: sealHtml
  };

  function injectFilters() {
    if (!document.getElementById("deckle")) {
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "0");
      svg.setAttribute("height", "0");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      svg.style.position = "absolute";
      svg.innerHTML =
        '<defs>' +
          '<filter id="deckle" x="-5%" y="-5%" width="110%" height="110%">' +
            '<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="7" result="t"/>' +
            '<feDisplacementMap in="SourceGraphic" in2="t" scale="7" xChannelSelector="R" yChannelSelector="G"/>' +
          '</filter>' +
          '<filter id="rough-edge" x="-10%" y="-10%" width="120%" height="120%">' +
            '<feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="3" result="t"/>' +
            '<feDisplacementMap in="SourceGraphic" in2="t" scale="2.2"/>' +
          '</filter>' +
          '<filter id="ink-bleed" x="-2%" y="-40%" width="104%" height="180%">' +
            '<feTurbulence type="fractalNoise" baseFrequency="0.02 0.4" numOctaves="3" seed="11" result="t"/>' +
            '<feDisplacementMap in="SourceGraphic" in2="t" scale="6"/>' +
          '</filter>' +
        '</defs>';
      document.body.insertBefore(svg, document.body.firstChild);
    }
    if (!document.getElementById("seal-lt")) {
      var host = document.getElementById("deckle") && document.getElementById("deckle").closest("defs");
      if (!host) return;
      host.insertAdjacentHTML("beforeend",
        '<symbol id="seal-lt" viewBox="0 0 40 40">' +
          '<rect x="1" y="1" width="38" height="38" rx="3" fill="#b0242a"/>' +
          '<rect x="4.2" y="4.2" width="31.6" height="31.6" rx="1.2" fill="none" stroke="#fbf6ec" stroke-width="1.5"/>' +
          '<g fill="none" stroke="#fbf6ec" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter">' +
            '<path d="M10.5 9.5 V28.2 Q10.5 30 12.3 30 H18.4 V26.6"/>' +
            '<path d="M20.8 13 V10 H31.4 V13"/>' +
            '<path d="M26.1 10 V30.4"/>' +
          '</g>' +
          '<rect x="16" y="3.2" width="2.4" height="2.2" fill="#b0242a"/>' +
          '<rect x="34.6" y="21" width="2.2" height="2.6" fill="#b0242a"/>' +
        '</symbol>'
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectFilters);
  } else {
    injectFilters();
  }

})(window);
