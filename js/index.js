
(function () {
  var emptyEl = document.getElementById("empty-state");
  var homeEl = document.getElementById("home");
  var checkInEl = document.getElementById("check-in");
  var heroEl = document.getElementById("hero");
  var feedEl = document.getElementById("feed");

  function heroHtml(entry) {
    var img = entry.styledImage
      ? '<img class="hero-image" src="' + Diary.escapeHtml(entry.styledImage) + '" alt="' + Diary.escapeHtml(entry.place || "Latest stop") + '">'
      : '<div class="hero-image hero-image-empty" aria-hidden="true"></div>';
    var place = Diary.escapeHtml(entry.place || "A stop along the way");
    var where = Diary.whereLineHtml(entry);
    var text = Diary.escapeHtml(Diary.shortText(entry));
    var trip = entry.tripTitle
      ? '<p class="hero-trip">From the trip ' + Diary.escapeHtml(entry.tripTitle) + "</p>"
      : "";
    return (
      '<a class="card-link" href="' + Diary.escapeHtml(Diary.tripHref(entry)) + '" aria-label="' + place + '"></a>' +
      img +
      '<div class="hero-copy">' +
        '<h1 class="hero-place">' + place + "</h1>" +
        (where ? '<p class="hero-where">' + where + "</p>" : "") +
        (text ? '<p class="hero-text">' + text + "</p>" : "") +
        trip +
      "</div>"
    );
  }

  function feedCard(entry) {
    var thumb = entry.styledImage
      ? '<img src="' + Diary.escapeHtml(entry.styledImage) + '" alt="' + Diary.escapeHtml(entry.place || "Stop") + '" loading="lazy">'
      : "";
    var badge = entry.highlight ? '<span class="pill">Highlight</span>' : "";
    return (
      '<article class="feed-card">' +
        '<a class="card-link" href="' + Diary.escapeHtml(Diary.tripHref(entry)) + '" aria-label="' + Diary.escapeHtml(entry.place || "A stop along the way") + '"></a>' +
        (thumb ? '<div class="feed-thumb">' + thumb + "</div>" : "") +
        '<div class="feed-copy">' +
          "<h3>" + Diary.escapeHtml(entry.place || "A stop along the way") + badge + "</h3>" +
          '<p class="feed-where">' + Diary.whereLineHtml(entry) + "</p>" +
          (Diary.shortText(entry) ? '<p class="feed-text">' + Diary.escapeHtml(Diary.shortText(entry)) + "</p>" : "") +
        "</div>" +
      "</article>"
    );
  }

  Diary.loadTrips()
    .then(function (trips) {
      var entries = Diary.sortEntriesNewest(Diary.flattenEntries(trips));
      if (!entries.length) {
        emptyEl.hidden = false;
        homeEl.hidden = true;
        return;
      }
      emptyEl.hidden = true;
      homeEl.hidden = false;
      var latest = entries[0];
      checkInEl.textContent = "Now / checking in at " + Diary.checkInLabel(latest);
      heroEl.innerHTML = heroHtml(latest);
      var rest = entries.slice(1);
      feedEl.innerHTML = rest.length
        ? rest.map(feedCard).join("")
        : '<p class="feed-empty">That is the only page in the diary so far.</p>';
    })
    .catch(function () {
      emptyEl.hidden = false;
      homeEl.hidden = true;
    });
})();
