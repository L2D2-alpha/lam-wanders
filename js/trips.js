
(function () {
  var emptyEl = document.getElementById("empty-state");
  var tripsEl = document.getElementById("trips");
  var listEl = document.getElementById("trip-list");

  function stopItem(entry) {
    var place = Diary.escapeHtml(entry.place || "A stop along the way");
    var loc = Diary.locationLabel(entry);
    var city = loc ? '<span class="stop-city">' + Diary.escapeHtml(loc) + "</span>" : "";
    var date = '<span class="stop-date">' + Diary.escapeHtml(Diary.formatDate(entry.date)) + "</span>";
    var sep = loc ? ", " : "";
    return "<li>" + date + '<span class="stop-place">' + place + "</span>" + sep + city + "</li>";
  }

  function tripCard(trip) {
    var slug = encodeURIComponent(trip.slug || "");
    var title = Diary.escapeHtml(trip.title || "Untitled trip");
    var entries = Diary.sortEntries(trip.entries);
    var dates = Diary.tripDates(trip);
    var count = entries.length;
    var stopWord = count === 1 ? "stop" : "stops";
    var meta = [dates, count ? count + " " + stopWord : "No stops yet"].filter(Boolean).join(" · ");
    var stops = entries.length
      ? '<ul class="stop-list">' + entries.map(stopItem).join("") + "</ul>"
      : "";
    return (
      '<a class="trip-card" href="trip.html?trip=' + slug + '">' +
        "<h2>" + title + "</h2>" +
        '<p class="trip-meta">' + Diary.escapeHtml(meta) + "</p>" +
        stops +
      "</a>"
    );
  }

  Diary.loadTrips()
    .then(function (trips) {
      var list = Diary.sortTrips(trips).filter(function (t) { return t && t.slug; });
      if (!list.length) {
        emptyEl.hidden = false;
        tripsEl.hidden = true;
        return;
      }
      emptyEl.hidden = true;
      tripsEl.hidden = false;
      listEl.innerHTML = list.map(tripCard).join("");
    })
    .catch(function () {
      emptyEl.hidden = false;
      tripsEl.hidden = true;
    });
})();
