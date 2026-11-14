
(function () {
  var emptyEl = document.getElementById("empty-state");
  var homeEl = document.getElementById("home");
  var checkInEl = document.getElementById("check-in");
  var trackEl = document.getElementById("timeline-track");
  var jumpEl = document.getElementById("year-jump");
  var tilts = [-1.2, 0.9, -0.6, 1.3];

  function yearHtml(year, stats) {
    return (
      '<div class="home-year" id="y' + year + '">' +
        "<h2>" + year + '<span class="seal" aria-hidden="true">旅</span></h2>' +
        '<span class="year-stats">' + Diary.escapeHtml(Diary.yearStatLine(stats)) + "</span>" +
      "</div>"
    );
  }

  function tileHtml(entry, index) {
    var place = entry.place || "A stop along the way";
    var href = Diary.entryHref(entry);
    var cover = Diary.coverImage(entry);
    var style = entry.style === "clay" ? "clay" : "ink";
    var tilt = tilts[index % tilts.length];
    var date = Diary.formatTileDate(entry.date);
    var text = Diary.shortText(entry);
    var img = cover
      ? '<img src="' + Diary.escapeHtml(cover) + '" alt="' + Diary.escapeHtml(place) + '" loading="lazy">'
      : "";
    var pin = style === "clay" ? '<span class="clay-pin" aria-hidden="true"></span>' : "";
    return (
      '<article class="home-card" id="' + Diary.escapeHtml(entry.entryId) + '">' +
        '<span class="stem" aria-hidden="true"></span>' +
        '<span class="dot" aria-hidden="true"></span>' +
        '<a class="tile card-link" data-style="' + style + '" href="' + Diary.escapeHtml(href) + '" style="--tilt:' + tilt + 'deg">' +
          pin +
          '<span class="tile-thumb">' + img + "</span>" +
          '<span class="tile-copy">' +
            (entry.date
              ? '<time class="tile-date" datetime="' + Diary.escapeHtml(entry.date) + '">' +
                Diary.escapeHtml(date) + "</time>"
              : "") +
            '<span class="tile-place">' + Diary.escapeHtml(place) + "</span>" +
            (text ? '<span class="tile-text">' + Diary.escapeHtml(text) + "</span>" : "") +
          "</span>" +
          '<span class="seal visited-stamp" aria-hidden="true">旅</span>' +
          '<span class="visually-hidden"></span>' +
        "</a>" +
      "</article>"
    );
  }

  function render(trips) {
    var entries = Diary.sortEntries(Diary.flattenEntries(trips));
    var parts = [];
    var years = [];
    var lastYear = null;
    entries.forEach(function (entry, index) {
      var year = Diary.yearOf(entry.date);
      if (year && year !== lastYear) {
        parts.push(yearHtml(year, Diary.yearStats(trips, year)));
        years.push(year);
        lastYear = year;
      }
      parts.push(tileHtml(entry, index));
    });
    var extras = trackEl.querySelector(".ink-layer");
    var line = trackEl.querySelector(".brush-line");
    trackEl.innerHTML = "";
    if (extras) trackEl.appendChild(extras);
    if (line) trackEl.appendChild(line);
    parts.forEach(function (html) {
      trackEl.insertAdjacentHTML("beforeend", html);
    });
    if (years.length > 1) {
      jumpEl.hidden = false;
      jumpEl.innerHTML = years.map(function (year, index) {
        return '<a href="#y' + year + '"' + (index === 0 ? ' aria-current="true"' : "") + ">" + year + "</a>";
      }).join("");
    } else {
      jumpEl.hidden = true;
      jumpEl.innerHTML = "";
    }
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
      checkInEl.textContent = "Now / checking in at " + Diary.checkInLabel(entries[0]);
      render(trips);
      if (window.LamTimeline) window.LamTimeline.init();
    })
    .catch(function () {
      emptyEl.hidden = false;
      homeEl.hidden = true;
    });
})();
