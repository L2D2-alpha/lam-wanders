
(function () {
  var titleEl = document.getElementById("about-title");
  var introEl = document.getElementById("about-intro");
  var bodyEl = document.getElementById("about-body");

  function paragraphs(text) {
    return String(text).split(/\n{2,}/).map(function (block) {
      return "<p>" + Diary.escapeHtml(block.trim()).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }

  Diary.loadAbout().then(function (about) {
    if (!about) return;
    if (about.title) titleEl.textContent = about.title;
    if (about.intro) introEl.textContent = about.intro;
    if (about.body && String(about.body).trim()) {
      bodyEl.classList.remove("is-placeholder");
      bodyEl.innerHTML = paragraphs(about.body);
    }
  });
})();
