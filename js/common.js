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
    if (parts.length !== 3) return escapeHtml(iso);
    var date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    if (isNaN(date.getTime())) return escapeHtml(iso);
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

  function tripDates(trip) {
    if (trip.startDate || trip.endDate) return formatRange(trip.startDate, trip.endDate);
    var dates = (trip.entries || []).map(function (e) { return e.date; }).filter(Boolean).sort();
    if (!dates.length) return "";
    return formatRange(dates[0], dates[dates.length - 1]);
  }

  function sortTrips(trips) {
    return (trips || []).slice().sort(function (a, b) {
      var da = a.startDate || ((a.entries || [])[0] && (a.entries || [])[0].date) || "";
      var db = b.startDate || ((b.entries || [])[0] && (b.entries || [])[0].date) || "";
      return db.localeCompare(da);
    });
  }

  function sortEntries(entries) {
    return (entries || []).slice().sort(function (a, b) {
      return String(a.date || "").localeCompare(String(b.date || ""));
    });
  }

  function loadTrips() {
    return fetch("data/trips.json", { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error("Could not load trips");
      return res.json();
    }).then(function (data) {
      return data && Array.isArray(data.trips) ? data.trips : [];
    });
  }

  global.Diary = {
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    formatRange: formatRange,
    tripDates: tripDates,
    sortTrips: sortTrips,
    sortEntries: sortEntries,
    loadTrips: loadTrips
  };
})(window);
