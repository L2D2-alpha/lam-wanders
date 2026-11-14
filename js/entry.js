
(function () {
  var params = new URLSearchParams(location.search);
  var slug = params.get("trip") || params.get("slug") || "";
  var requestedId = params.get("entry") || params.get("id") || "";
  var missingEl = document.getElementById("entry-missing");
  var entryEl = document.getElementById("entry");
  var galleryEl = document.getElementById("gallery");
  var lightbox = document.getElementById("lightbox");
  var lightboxImage = document.getElementById("lightbox-image");
  var lightboxCaption = document.getElementById("lightbox-caption");
  var closeBtn = document.getElementById("lightbox-close");
  var prevBtn = document.getElementById("lightbox-prev");
  var nextBtn = document.getElementById("lightbox-next");
  var photos = [];
  var activeIndex = 0;

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

  function galleryItem(photo, index, place) {
    var kind = photo.kind || "photo";
    var label = photo.alt || (place + " (" + Diary.photoKindLabel(photo) + ")");
    return (
      '<figure class="photo-frame ' + Diary.escapeHtml(kind) + '">' +
        '<button type="button" class="gallery-open" data-index="' + index + '" aria-label="View ' + Diary.escapeHtml(label) + ' larger">' +
          '<img src="' + Diary.escapeHtml(photo.src) + '" alt="' + Diary.escapeHtml(label) + '">' +
        "</button>" +
        "<figcaption>" + Diary.escapeHtml(Diary.photoKindLabel(photo)) + "</figcaption>" +
      "</figure>"
    );
  }

  function render(found) {
    var entry = found.entry;
    var trip = found.trip;
    var place = entry.place || "A stop along the way";
    photos = Diary.entryPhotos(entry);
    document.title = place + " — Lam Wanders";
    document.getElementById("entry-title").textContent = place;
    var dateEl = document.getElementById("entry-date");
    if (entry.date) dateEl.textContent = Diary.formatDate(entry.date);
    else dateEl.hidden = true;
    var whereEl = document.getElementById("entry-where");
    var loc = Diary.locationLabel(entry);
    var maps = Diary.mapsLink(entry);
    var bits = [Diary.escapeHtml(loc), maps].filter(Boolean).join(" · ");
    if (bits) whereEl.innerHTML = bits;
    else whereEl.hidden = true;
    var tripEl = document.getElementById("entry-trip");
    if (trip.title) {
      tripEl.hidden = false;
      tripEl.innerHTML = 'From the trip <a href="' + Diary.escapeHtml(Diary.tripHref(entry)) + '">' +
        Diary.escapeHtml(trip.title) + "</a>";
    }
    var back = document.getElementById("entry-back");
    back.innerHTML =
      '<a href="index.html">← Home</a>' +
      (trip.slug
        ? '<a href="trip.html?trip=' + encodeURIComponent(trip.slug) + '">Back to ' +
          Diary.escapeHtml(trip.title || "this trip") + "</a>"
        : '<a href="trips.html">All trips</a>');
    if (photos.length) {
      galleryEl.innerHTML = photos.map(function (photo, index) {
        return galleryItem(photo, index, place);
      }).join("");
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
  }

  function updateLightbox() {
    if (!photos.length) return;
    var photo = photos[activeIndex];
    lightboxImage.src = photo.src;
    lightboxImage.alt = photo.alt || Diary.photoKindLabel(photo);
    lightboxCaption.textContent = Diary.photoKindLabel(photo);
    var many = photos.length > 1;
    prevBtn.hidden = !many;
    nextBtn.hidden = !many;
    prevBtn.disabled = !many;
    nextBtn.disabled = !many;
  }

  function openLightbox(index) {
    if (!photos.length) return;
    activeIndex = (index + photos.length) % photos.length;
    updateLightbox();
    if (typeof lightbox.showModal === "function") lightbox.showModal();
    else lightbox.setAttribute("open", "");
    closeBtn.focus();
  }

  function closeLightbox() {
    if (typeof lightbox.close === "function" && lightbox.open) lightbox.close();
    else lightbox.removeAttribute("open");
  }

  function step(delta) {
    if (photos.length < 2) return;
    activeIndex = (activeIndex + delta + photos.length) % photos.length;
    updateLightbox();
  }

  galleryEl.addEventListener("click", function (event) {
    var button = event.target.closest(".gallery-open");
    if (!button) return;
    openLightbox(Number(button.getAttribute("data-index")) || 0);
  });

  closeBtn.addEventListener("click", closeLightbox);
  prevBtn.addEventListener("click", function () { step(-1); });
  nextBtn.addEventListener("click", function () { step(1); });
  lightbox.addEventListener("click", function (event) {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", function (event) {
    if (!lightbox.open) return;
    if (event.key === "Escape") {
      closeLightbox();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
  });

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
