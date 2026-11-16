/* Reveal the original photo from the styled image. Init after the gallery is rendered. */
(function (global) {
  function initLightbox() {
    var dlg = document.querySelector(".lightbox");
    if (!dlg) return;
    var img = dlg.querySelector("img");
    var cap = dlg.querySelector(".lb-cap");
    var closeBtn = dlg.querySelector(".lb-close");
    var buttons = Array.prototype.slice.call(document.querySelectorAll(".photo-frame button[data-original]"));
    if (!img || !closeBtn) return;
    var opener = null;
    var generation = 0;

    function show(button) {
      var mine = ++generation;
      opener = button;
      img.classList.remove("is-ready");
      img.removeAttribute("src");
      img.alt = button.getAttribute("data-original-alt") || "Original photo";
      var caption = button.getAttribute("data-original-caption") || "";
      if (cap) {
        cap.textContent = caption;
        cap.hidden = !caption;
      }
      function setReady() {
        if (mine !== generation) return;
        img.classList.add("is-ready");
      }
      img.addEventListener("load", setReady, { once: true });
      img.addEventListener("error", setReady, { once: true });
      img.src = button.getAttribute("data-original");
      if (img.complete && img.naturalWidth) setReady();
      if (typeof dlg.showModal === "function") dlg.showModal();
      else dlg.setAttribute("open", "");
      closeBtn.focus();
    }

    function hide() {
      if (dlg.open) dlg.close();
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () { show(button); });
    });

    closeBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      hide();
    });
    dlg.addEventListener("click", function (event) {
      if (event.target === closeBtn || closeBtn.contains(event.target)) return;
      hide();
    });
    dlg.addEventListener("close", function () {
      generation += 1;
      img.removeAttribute("src");
      img.classList.remove("is-ready");
      if (opener) opener.focus();
    });
  }

  global.LamLightbox = { init: initLightbox };
})(window);
