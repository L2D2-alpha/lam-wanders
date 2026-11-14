
(function () {
  var emptyEl = document.getElementById("empty-state");
  var rootEl = document.getElementById("highlights");
  var timelineEl = document.getElementById("timeline");

  function highlightCard(entry) {
    var thumb = entry.styledImage
      ? '<img src="' + Diary.escapeHtml(entry.styledImage) + '" alt="' + Diary.escapeHtml(entry.place || "Highlight") + '" loading="lazy">'
      : "";
    return (
      '<a class="timeline-card" href="' + Diary.escapeHtml(Diary.tripHref(entry)) + '">' +
        (thumb ? '<div class="timeline-thumb">' + thumb + "</div>" : "") +
        '<div class="timeline-copy">' +
          '<p class="timeline-date">' + Diary.escapeHtml(Diary.formatDate(entry.date)) + "</p>" +
          "<h3>" + Diary.escapeHtml(entry.place || "A favorite stop") + "</h3>" +
          (entry.city ? '<p class="timeline-city">' + Diary.escapeHtml(entry.city) + "</p>" : "") +
          (Diary.shortText(entry) ? '<p class="timeline-text">' + Diary.escapeHtml(Diary.shortText(entry)) + "</p>" : "") +
        "</div>" +
      "</a>"
    );
  }

  function yearBlock(year, summary, stats, entries) {
    var cards = entries.length
      ? entries.map(highlightCard).join("")
      : '<p class="timeline-empty">No highlighted stops in this year yet.</p>';
    var recap = summary
      ? Diary.escapeHtml(summary)
      : "A short yearly summary can go here.";
    return (
      '<section class="timeline-year">' +
        '<div class="timeline-year-head">' +
          "<h2>" + year + "</h2>" +
          '<p class="year-stats">' + Diary.escapeHtml(Diary.statLine(stats)) + "</p>" +
          '<p class="year-summary' + (summary ? "" : " is-placeholder") + '">' + recap + "</p>" +
        "</div>" +
        '<div class="timeline-stops">' + cards + "</div>" +
      "</section>"
    );
  }

  Promise.all([Diary.loadTrips(), Diary.loadYears()])
    .then(function (results) {
      var trips = results[0];
      var yearNotes = results[1];
      var summaries = {};
      yearNotes.forEach(function (item) {
        if (item && item.year) summaries[Number(item.year)] = item.summary || "";
      });
      var highlights = Diary.sortEntriesNewest(
        Diary.flattenEntries(trips).filter(function (entry) { return entry.highlight === true; })
      );
      var years = {};
      highlights.forEach(function (entry) {
        var year = Diary.yearOf(entry.date);
        if (!year) return;
        if (!years[year]) years[year] = [];
        years[year].push(entry);
      });
      Object.keys(summaries).forEach(function (year) {
        year = Number(year);
        if (!years[year]) years[year] = [];
      });
      var yearList = Object.keys(years).map(Number).sort(function (a, b) { return b - a; });
      if (!yearList.length) {
        emptyEl.hidden = false;
        rootEl.hidden = true;
        return;
      }
      emptyEl.hidden = true;
      rootEl.hidden = false;
      timelineEl.innerHTML = yearList.map(function (year) {
        return yearBlock(year, summaries[year], Diary.yearStats(trips, year), years[year]);
      }).join("");
    })
    .catch(function () {
      emptyEl.hidden = false;
      rootEl.hidden = true;
    });
})();
