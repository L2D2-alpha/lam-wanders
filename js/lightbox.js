/* Native dialog lightbox. Adapted from the design mockup; init after the gallery is rendered. */
(function (global) {
  function initLightbox() {
    var dlg = document.querySelector(".lightbox");
    if (!dlg) return;
    var img = dlg.querySelector("img");
    var cap = dlg.querySelector(".lb-cap");
    var buttons = Array.prototype.slice.call(document.querySelectorAll(".photo-frame button"));
    if (!img || !buttons.length) return;
    var current = 0, opener = null, startX = null;

    function captionText(button, index) {
      var figure = button.closest("figure");
      var bold = figure && figure.querySelector("figcaption b");
      var label = bold ? bold.textContent : (button.getAttribute("aria-label") || "Photo");
      return label + " (" + (index + 1) + " of " + buttons.length + ")";
    }

    function show(i) {
      current = (i + buttons.length) % buttons.length;
      var button = buttons[current];
      img.src = button.getAttribute("data-full") || button.querySelector("img").src;
      img.alt = button.querySelector("img") ? button.querySelector("img").alt : "";
      cap.textContent = captionText(button, current);
    }

    buttons.forEach(function (button, index) {
      button.addEventListener("click", function () {
        opener = button;
        show(index);
        dlg.showModal();
      });
    });
    dlg.querySelector(".lb-prev").addEventListener("click", function () { show(current - 1); });
    dlg.querySelector(".lb-next").addEventListener("click", function () { show(current + 1); });
    dlg.querySelector(".lb-close").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("keydown", function (event) {
      if (event.key === "Escape") dlg.close();
      if (event.key === "ArrowRight") show(current + 1);
      if (event.key === "ArrowLeft") show(current - 1);
    });
    dlg.addEventListener("click", function (event) {
      if (event.target === dlg || event.target.classList.contains("lightbox-inner")) dlg.close();
    });
    dlg.addEventListener("close", function () { if (opener) opener.focus(); });

    dlg.addEventListener("pointerdown", function (event) {
      if (event.target.closest(".lb-btn")) return;
      startX = event.clientX;
    });
    dlg.addEventListener("pointerup", function (event) {
      if (startX == null) return;
      var delta = event.clientX - startX;
      startX = null;
      if (Math.abs(delta) < 40) return;
      show(current + (delta < 0 ? 1 : -1));
    });
  }

  global.LamLightbox = { init: initLightbox };
})(window);
