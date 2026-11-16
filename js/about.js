
(function () {
  var titleEl = document.getElementById("about-title");
  var introEl = document.getElementById("about-intro");
  var bodyEl = document.getElementById("about-body");
  var photosEl = document.getElementById("about-photos");
  var captionEl = document.getElementById("about-caption");

  function paragraphs(text) {
    return String(text).split(/\n{2,}/).map(function (block) {
      return "<p>" + Diary.escapeHtml(block.trim()).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }

  function photoFigure(photo) {
    var kind = photo.kind || "photo";
    var kindLabel = kind === "styled" ? "Styled" : kind === "original" ? "Original" : "Photo";
    var alt = photo.alt || "";
    return (
      '<figure class="photo-frame ' + Diary.escapeHtml(kind) + '">' +
        '<button type="button" data-full="' + Diary.escapeHtml(photo.src) + '" aria-label="Open photo: ' + Diary.escapeHtml(alt) + '">' +
          '<img src="' + Diary.escapeHtml(photo.src) + '" alt="' + Diary.escapeHtml(alt) + '" loading="lazy">' +
        "</button>" +
        '<figcaption><span class="kind">' + Diary.escapeHtml(kindLabel) + "</span></figcaption>" +
      "</figure>"
    );
  }

  Diary.loadAbout().then(function (about) {
    if (!about) return;
    if (about.title) titleEl.textContent = about.title;
    if (about.intro) introEl.textContent = about.intro;
    if (about.body && String(about.body).trim()) {
      bodyEl.hidden = false;
      bodyEl.classList.remove("is-placeholder");
      bodyEl.innerHTML = paragraphs(about.body);
    } else if (bodyEl) {
      bodyEl.hidden = true;
    }
    var photos = Array.isArray(about.photos) ? about.photos.filter(function (item) {
      return item && item.src;
    }) : [];
    if (photosEl && photos.length) {
      photosEl.hidden = false;
      photosEl.innerHTML = photos.map(photoFigure).join("");
    }
    if (captionEl && about.photoCaption) {
      captionEl.hidden = false;
      captionEl.textContent = about.photoCaption;
    }
    if (window.LamLightbox) window.LamLightbox.init();
  });
})();
