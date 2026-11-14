
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

  function whereLine(entry) {
    return [entry.city, formatDate(entry.date)].filter(Boolean).join(" · ");
  }

  function checkInLabel(entry) {
    var place = entry.place || "a new stop";
    return entry.city ? place + ", " + entry.city : place;
  }

  function tripHref(entry) {
    if (!entry.tripSlug) return "trips.html";
    return "trip.html?trip=" + encodeURIComponent(entry.tripSlug) + "#" + encodeURIComponent(entry.entryId);
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
      if (tripYearSet(trip)[year]) tripCount += 1;
      (trip.entries || []).forEach(function (entry) {
        if (yearOf(entry.date) !== year) return;
        stops += 1;
        if (entry.city) cities[String(entry.city).trim().toLowerCase()] = true;
      });
    });
    return {
      trips: tripCount,
      stops: stops,
      cities: Object.keys(cities).length
    };
  }

  function statLine(stats) {
    function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
    return [
      plural(stats.trips, "trip", "trips"),
      plural(stats.stops, "stop", "stops"),
      plural(stats.cities, "city", "cities")
    ].join(" · ");
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

  document.querySelectorAll(".site-nav a").forEach(function (link) {
    if (link.getAttribute("data-nav") === document.body.getAttribute("data-page")) {
      link.setAttribute("aria-current", "page");
    }
  });

  global.Diary = {
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    formatRange: formatRange,
    yearOf: yearOf,
    tripDates: tripDates,
    sortTrips: sortTrips,
    sortEntries: sortEntriesOldest,
    sortEntriesNewest: sortEntriesNewest,
    entryId: entryId,
    flattenEntries: flattenEntries,
    shortText: shortText,
    whereLine: whereLine,
    checkInLabel: checkInLabel,
    tripHref: tripHref,
    loadTrips: loadTrips,
    loadYears: loadYears,
    loadAbout: loadAbout,
    yearStats: yearStats,
    statLine: statLine,
    photoFigure: photoFigure
  };
})(window);
