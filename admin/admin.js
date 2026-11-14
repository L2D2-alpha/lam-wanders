/* Lam Wanders admin. Token is only stored in this browser and only sent to api.github.com. */
(function () {
  "use strict";

  var OWNER = "L2D2-alpha";
  var REPO = "lam-wanders";
  var API = "https://api.github.com";
  var SESSION_KEY = "lw-admin-token";
  var LOCAL_KEY = "lw-admin-token";
  var BRANCH_KEY = "lw-admin-branch";
  var LONG_SIDE = 1600;
  var JPEG_QUALITY = 0.82;

  var state = {
    token: "",
    branch: "main",
    trips: { trips: [] },
    years: { years: [] },
    about: { title: "About Me", intro: "", body: "" },
    snapshot: "",
    headSha: "",
    pending: {},
    selected: null,
    dirty: false
  };

  var els = {};

  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "entry";
  }

  /* ---- token storage (never log the value) ---- */

  function readStoredToken() {
    try {
      var session = sessionStorage.getItem(SESSION_KEY);
      if (session) return session;
    } catch (err) {}
    try {
      return localStorage.getItem(LOCAL_KEY) || "";
    } catch (err) {
      return "";
    }
  }

  function storeToken(token, remember) {
    try { sessionStorage.setItem(SESSION_KEY, token); } catch (err) {}
    try {
      if (remember) localStorage.setItem(LOCAL_KEY, token);
      else localStorage.removeItem(LOCAL_KEY);
    } catch (err) {}
  }

  function clearToken() {
    state.token = "";
    try { sessionStorage.removeItem(SESSION_KEY); } catch (err) {}
    try { localStorage.removeItem(LOCAL_KEY); } catch (err) {}
  }

  function storeBranch(branch) {
    try { sessionStorage.setItem(BRANCH_KEY, branch); } catch (err) {}
  }

  function readStoredBranch() {
    try { return sessionStorage.getItem(BRANCH_KEY) || "main"; } catch (err) { return "main"; }
  }

  /* ---- GitHub API (Authorization header only; token never in URLs or logs) ---- */

  function apiHeaders() {
    return {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + state.token,
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function apiMessage(status, payload) {
    if (status === 401) return "That token was not accepted. Check that it is a fine-grained token for this repository and has not expired.";
    if (status === 403) return "This token does not have permission to use this repository. It needs Contents read and write access to L2D2-alpha/lam-wanders.";
    if (status === 404) return "The Lam Wanders repository was not found with this token. Check that the token is limited to L2D2-alpha/lam-wanders.";
    if (status === 409 || status === 422) return "This page is out of date because something else was saved first. Reload and try again.";
    if (payload && payload.message) return payload.message;
    if (!status) return "Could not reach GitHub. Check your connection and try again.";
    return "GitHub returned an error (" + status + "). Please try again.";
  }

  function api(path, options) {
    options = options || {};
    var headers = apiHeaders();
    if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    return fetch(API + path, {
      method: options.method || "GET",
      headers: headers,
      body: options.body || undefined,
      credentials: "omit",
      cache: "no-store"
    }).then(function (res) {
      return res.text().then(function (text) {
        var payload = null;
        if (text) {
          try { payload = JSON.parse(text); } catch (err) { payload = null; }
        }
        if (!res.ok) {
          var error = new Error(apiMessage(res.status, payload));
          error.status = res.status;
          throw error;
        }
        return payload;
      });
    });
  }

  function verifyToken() {
    return api("/repos/" + OWNER + "/" + REPO);
  }

  function contentsPath(path) {
    return "/repos/" + OWNER + "/" + REPO + "/contents/" + path.split("/").map(encodeURIComponent).join("/") +
      "?ref=" + encodeURIComponent(state.branch);
  }

  function decodeBase64(content) {
    var clean = String(content || "").replace(/\s/g, "");
    var binary = atob(clean);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function bytesToBase64(bytes) {
    var chunk = 0x8000;
    var parts = [];
    for (var i = 0; i < bytes.length; i += chunk) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)));
    }
    return btoa(parts.join(""));
  }

  function utf8ToBase64(text) {
    return bytesToBase64(new TextEncoder().encode(text));
  }

  function loadJsonFile(path) {
    return api(contentsPath(path)).then(function (file) {
      var text = new TextDecoder().decode(decodeBase64(file.content));
      return JSON.parse(text);
    });
  }

  function snapshotOf() {
    return JSON.stringify({
      trips: state.trips,
      years: state.years,
      about: state.about
    });
  }

  function markDirty() {
    var pending = Object.keys(state.pending).length > 0;
    state.dirty = pending || snapshotOf() !== state.snapshot;
    if (els.saveBtn) els.saveBtn.disabled = !state.dirty;
  }

  /* ---- Tiny JPEG EXIF parser (GPS + date only, no libraries) ---- */

  function isExifHeader(view, offset) {
    return offset + 6 <= view.byteLength &&
      view.getUint8(offset) === 0x45 &&
      view.getUint8(offset + 1) === 0x78 &&
      view.getUint8(offset + 2) === 0x69 &&
      view.getUint8(offset + 3) === 0x66 &&
      view.getUint8(offset + 4) === 0 &&
      view.getUint8(offset + 5) === 0;
  }

  function readJpegExif(buffer) {
    var view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) return {};
    var offset = 2;
    while (offset + 4 <= view.byteLength) {
      if (view.getUint8(offset) !== 0xFF) break;
      var marker = view.getUint8(offset + 1);
      if (marker === 0xDA || marker === 0xD9) break;
      var size = view.getUint16(offset + 2);
      if (size < 2) break;
      if (marker === 0xE1 && isExifHeader(view, offset + 4)) {
        return parseExifTiff(view, offset + 10);
      }
      offset += 2 + size;
    }
    return {};
  }

  function parseExifTiff(view, start) {
    if (start + 8 > view.byteLength) return {};
    var le;
    var order = view.getUint16(start);
    if (order === 0x4949) le = true;
    else if (order === 0x4D4D) le = false;
    else return {};
    if (view.getUint16(start + 2, le) !== 42) return {};
    var ifd0 = start + view.getUint32(start + 4, le);
    var tags = readIfd(view, start, ifd0, le);
    if (tags[0x8769]) Object.assign(tags, readIfd(view, start, start + tags[0x8769], le));
    var gps = tags[0x8825] ? readIfd(view, start, start + tags[0x8825], le) : {};
    var out = {};
    var date = tags[0x9003] || tags[0x9004] || tags[0x0132];
    if (typeof date === "string") {
      var match = date.match(/^(\d{4}):(\d{2}):(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
      if (match) {
        out.date = match[1] + "-" + match[2] + "-" + match[3];
        if (match[4]) {
          var hour = Number(match[4]);
          var minute = match[5];
          var ampm = hour >= 12 ? "PM" : "AM";
          var hour12 = hour % 12;
          if (hour12 === 0) hour12 = 12;
          out.time = hour12 + ":" + minute + " " + ampm;
        }
      }
    }
    var lat = gpsCoord(gps[0x0002], gps[0x0001]);
    var lng = gpsCoord(gps[0x0004], gps[0x0003]);
    if (lat != null) out.lat = lat;
    if (lng != null) out.lng = lng;
    return out;
  }

  function readIfd(view, tiffStart, ifdOffset, le) {
    var tags = {};
    if (ifdOffset < tiffStart || ifdOffset + 2 > view.byteLength) return tags;
    var count = view.getUint16(ifdOffset, le);
    for (var i = 0; i < count; i++) {
      var entry = ifdOffset + 2 + i * 12;
      if (entry + 12 > view.byteLength) break;
      var tag = view.getUint16(entry, le);
      var type = view.getUint16(entry + 2, le);
      var num = view.getUint32(entry + 4, le);
      var valueOffset = entry + 8;
      var unit = typeSize(type);
      var size = unit * num;
      var dataAt = size > 4 ? tiffStart + view.getUint32(valueOffset, le) : valueOffset;
      tags[tag] = readTagValue(view, dataAt, type, num, le, tiffStart);
    }
    return tags;
  }

  function typeSize(type) {
    return ({ 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 })[type] || 1;
  }

  function readTagValue(view, offset, type, num, le) {
    if (offset < 0 || offset >= view.byteLength) return null;
    try {
      if (type === 2) {
        var chars = [];
        for (var i = 0; i < num && offset + i < view.byteLength; i++) {
          var c = view.getUint8(offset + i);
          if (c === 0) break;
          chars.push(c);
        }
        return String.fromCharCode.apply(null, chars);
      }
      if (type === 3) {
        if (num === 1) return view.getUint16(offset, le);
        var shorts = [];
        for (var s = 0; s < num && offset + 2 * s + 2 <= view.byteLength; s++) shorts.push(view.getUint16(offset + 2 * s, le));
        return shorts;
      }
      if (type === 4) {
        if (num === 1) return view.getUint32(offset, le);
        var longs = [];
        for (var l = 0; l < num && offset + 4 * l + 4 <= view.byteLength; l++) longs.push(view.getUint32(offset + 4 * l, le));
        return longs;
      }
      if (type === 5 || type === 10) {
        var rat = [];
        for (var r = 0; r < num && offset + 8 * r + 8 <= view.byteLength; r++) {
          var numv = type === 10 ? view.getInt32(offset + 8 * r, le) : view.getUint32(offset + 8 * r, le);
          var den = type === 10 ? view.getInt32(offset + 8 * r + 4, le) : view.getUint32(offset + 8 * r + 4, le);
          rat.push(den ? numv / den : 0);
        }
        return num === 1 ? rat[0] : rat;
      }
      if (type === 1 && num === 1) return view.getUint8(offset);
    } catch (err) {
      return null;
    }
    return null;
  }

  function gpsCoord(values, ref) {
    if (!values) return null;
    var parts = Array.isArray(values) ? values : [values];
    var deg = Number(parts[0]) || 0;
    var min = Number(parts[1]) || 0;
    var sec = Number(parts[2]) || 0;
    var dec = deg + min / 60 + sec / 3600;
    var hemi = Array.isArray(ref) ? String.fromCharCode.apply(null, ref) : String(ref || "");
    if (/[SW]/i.test(hemi)) dec = -dec;
    if (!isFinite(dec)) return null;
    return Math.round(dec * 1e6) / 1e6;
  }

  /* ---- image encode ---- */

  function loadBitmap(file) {
    if (typeof createImageBitmap === "function") {
      return createImageBitmap(file, { imageOrientation: "from-image" }).catch(function () {
        return createImageBitmap(file);
      });
    }
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that image."));
      };
      img.src = url;
    });
  }

  function encodePhoto(file) {
    return file.arrayBuffer().then(function (buffer) {
      var exif = readJpegExif(buffer);
      return loadBitmap(file).then(function (bitmap) {
        var width = bitmap.width;
        var height = bitmap.height;
        var scale = Math.max(width, height) > LONG_SIDE ? LONG_SIDE / Math.max(width, height) : 1;
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        var ctx = canvas.getContext("2d");
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        if (bitmap.close) bitmap.close();
        return new Promise(function (resolve, reject) {
          canvas.toBlob(function (blob) {
            if (!blob) {
              reject(new Error("Could not encode that photo as JPEG."));
              return;
            }
            blob.arrayBuffer().then(function (out) {
              resolve({
                bytes: new Uint8Array(out),
                exif: exif,
                width: canvas.width,
                height: canvas.height
              });
            }).catch(reject);
          }, "image/jpeg", JPEG_QUALITY);
        });
      });
    });
  }

  function uniqueImagePath(tripSlug, baseName) {
    var safe = slugify(baseName.replace(/\.[^.]+$/, ""));
    var path = "images/" + tripSlug + "/" + safe + ".jpg";
    var n = 2;
    while (pathExists(path)) {
      path = "images/" + tripSlug + "/" + safe + "-" + n + ".jpg";
      n += 1;
    }
    return path;
  }

  function pathExists(path) {
    if (state.pending[path]) return true;
    var found = false;
    (state.trips.trips || []).forEach(function (trip) {
      (trip.entries || []).forEach(function (entry) {
        if (entry.styledImage === path || entry.originalImage === path) found = true;
        (entry.photos || []).forEach(function (photo) {
          if (photo === path || (photo && photo.src === path)) found = true;
        });
      });
    });
    return found;
  }

  /* ---- data helpers ---- */

  function parseTime(value) {
    var text = String(value || "").trim();
    var match = text.match(/^(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*(.*)$/i);
    if (match) return { time: match[1].replace(/\s+/g, " ").trim(), zone: (match[2] || "").trim() };
    return { time: text, zone: "" };
  }

  function joinTime(time, zone) {
    return [time, zone].map(function (v) { return String(v || "").trim(); }).filter(Boolean).join(" ");
  }

  function numOrBlank(value) {
    if (value === "" || value == null) return "";
    var n = Number(value);
    return isFinite(n) ? n : "";
  }

  /* ---- rendering ---- */

  function showSignIn(message) {
    els.signIn.hidden = false;
    els.editor.hidden = true;
    els.signedInActions.hidden = true;
    if (message) {
      els.signInError.hidden = false;
      els.signInError.textContent = message;
    } else {
      els.signInError.hidden = true;
      els.signInError.textContent = "";
    }
  }

  function showEditor() {
    els.signIn.hidden = true;
    els.editor.hidden = false;
    els.signedInActions.hidden = false;
    els.repoLabel.textContent = OWNER + "/" + REPO + " (" + state.branch + ")";
    renderNav();
    renderYears();
    renderAbout();
    renderDetail();
    markDirty();
  }

  function renderNav() {
    var trips = state.trips.trips || [];
    if (!trips.length) {
      els.tripNav.innerHTML = '<p class="admin-hint">No trips yet.</p>';
      return;
    }
    els.tripNav.innerHTML = trips.map(function (trip, ti) {
      var currentTrip = state.selected && state.selected.type === "trip" && state.selected.tripIndex === ti;
      var entries = (trip.entries || []).map(function (entry, ei) {
        var current = state.selected && state.selected.type === "entry" && state.selected.tripIndex === ti && state.selected.entryIndex === ei;
        return (
          '<button type="button" class="trip-nav-entry' + (current ? " is-current" : "") + '" data-act="entry" data-trip="' + ti + '" data-entry="' + ei + '">' +
            escapeHtml(entry.place || "Untitled stop") +
          "</button>"
        );
      }).join("");
      return (
        '<div class="trip-nav-trip">' +
          '<button type="button" class="trip-nav-title' + (currentTrip ? " is-current" : "") + '" data-act="trip" data-trip="' + ti + '">' +
            escapeHtml(trip.title || trip.slug || "Untitled trip") +
          "</button>" +
          entries +
          '<button type="button" class="trip-nav-entry" data-act="new-entry" data-trip="' + ti + '">+ New entry</button>' +
        "</div>"
      );
    }).join("");
  }

  function renderYears() {
    var years = (state.years.years || []).slice().sort(function (a, b) {
      return Number(b.year) - Number(a.year);
    });
    state.years.years = years;
    els.yearsEditor.innerHTML = years.map(function (item, index) {
      return (
        '<div class="years-row" data-year-index="' + index + '">' +
          '<label><span>Year</span><input type="number" data-field="year" value="' + escapeHtml(item.year || "") + '"></label>' +
          '<label><span>Summary</span><textarea data-field="summary" rows="2">' + escapeHtml(item.summary || "") + "</textarea></label>" +
          '<button type="button" class="admin-btn admin-btn-quiet" data-act="remove-year">Remove</button>' +
        "</div>"
      );
    }).join("") || '<p class="admin-hint">No yearly summaries yet.</p>';
  }

  function renderAbout() {
    var about = state.about || {};
    els.aboutEditor.innerHTML =
      '<div class="admin-fields">' +
        '<label><span>Title</span><input type="text" data-about="title" value="' + escapeHtml(about.title || "") + '"></label>' +
        '<label><span>Intro</span><textarea data-about="intro" rows="3">' + escapeHtml(about.intro || "") + "</textarea></label>" +
        '<label><span>Body</span><textarea data-about="body" rows="5">' + escapeHtml(about.body || "") + "</textarea></label>" +
      "</div>";
  }

  function renderDetail() {
    var sel = state.selected;
    if (!sel) {
      els.detail.innerHTML = '<p class="admin-hint">Pick a trip or entry, or add a new one.</p>';
      return;
    }
    if (sel.type === "trip") renderTripForm(sel.tripIndex);
    else renderEntryForm(sel.tripIndex, sel.entryIndex);
  }

  function renderTripForm(index) {
    var trip = state.trips.trips[index];
    if (!trip) {
      els.detail.innerHTML = '<p class="admin-hint">That trip is gone.</p>';
      return;
    }
    els.detail.innerHTML =
      '<div class="detail-head"><h2>Trip</h2>' +
        '<div class="admin-btn-row"><button type="button" class="admin-btn admin-btn-danger" data-act="delete-trip">Delete trip</button></div>' +
      "</div>" +
      '<div class="admin-fields" data-form="trip" data-trip="' + index + '">' +
        '<label><span>Title</span><input type="text" data-field="title" value="' + escapeHtml(trip.title || "") + '"></label>' +
        '<label><span>Slug (folder name)</span><input type="text" data-field="slug" value="' + escapeHtml(trip.slug || "") + '" spellcheck="false" autocapitalize="off"></label>' +
        '<div class="admin-row admin-row-2">' +
          '<label><span>Start date</span><input type="date" data-field="startDate" value="' + escapeHtml(trip.startDate || "") + '"></label>' +
          '<label><span>End date</span><input type="date" data-field="endDate" value="' + escapeHtml(trip.endDate || "") + '"></label>' +
        "</div>" +
        '<label><span>Summary</span><textarea data-field="summary" rows="3">' + escapeHtml(trip.summary || "") + "</textarea></label>" +
        '<p class="admin-note">Image files for this trip go in images/' + escapeHtml(trip.slug || "…") + "/. Changing a slug later does not move existing photos.</p>" +
      "</div>";
  }

  function photoKind(photo) {
    if (typeof photo === "string") return "photo";
    return (photo && photo.kind) || "photo";
  }

  function photoSrc(photo) {
    return typeof photo === "string" ? photo : (photo && photo.src) || "";
  }

  function renderEntryForm(ti, ei) {
    var trip = state.trips.trips[ti];
    var entry = trip && trip.entries && trip.entries[ei];
    if (!entry) {
      els.detail.innerHTML = '<p class="admin-hint">That entry is gone.</p>';
      return;
    }
    var split = parseTime(entry.time);
    var area = entry.area != null ? entry.area : "";
    var city = entry.city != null ? entry.city : "";
    var photos = (entry.photos || []).map(function (photo, pi) {
      var src = photoSrc(photo);
      var preview = state.pending[src]
        ? ""
        : (src ? "../" + escapeHtml(src) : "");
      var pendingSrc = state.pending[src] ? state.pending[src].preview : preview;
      var alt = typeof photo === "object" ? (photo.alt || "") : "";
      var caption = typeof photo === "object" ? (photo.caption || "") : "";
      return (
        '<div class="photo-row" data-photo-index="' + pi + '">' +
          (pendingSrc ? '<img alt="" src="' + escapeHtml(pendingSrc) + '">' : "<div></div>") +
          '<div class="admin-fields">' +
            '<label><span>File path</span><input type="text" data-photo="src" value="' + escapeHtml(src) + '" spellcheck="false"></label>' +
            '<label><span>Kind</span><select data-photo="kind">' +
              ["styled", "original", "photo"].map(function (kind) {
                return '<option value="' + kind + '"' + (photoKind(photo) === kind ? " selected" : "") + ">" + kind + "</option>";
              }).join("") +
            "</select></label>" +
            '<label><span>Alt text</span><input type="text" data-photo="alt" value="' + escapeHtml(alt) + '"></label>' +
            '<label><span>Caption</span><input type="text" data-photo="caption" value="' + escapeHtml(caption) + '"></label>' +
            '<button type="button" class="admin-btn admin-btn-quiet" data-act="remove-photo">Remove photo</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");
    els.detail.innerHTML =
      '<div class="detail-head"><h2>Entry in ' + escapeHtml(trip.title || trip.slug || "trip") + "</h2>" +
        '<div class="admin-btn-row"><button type="button" class="admin-btn admin-btn-danger" data-act="delete-entry">Delete entry</button></div>' +
      "</div>" +
      '<div class="admin-fields" data-form="entry" data-trip="' + ti + '" data-entry="' + ei + '">' +
        '<label><span>Place name</span><input type="text" data-field="place" value="' + escapeHtml(entry.place || "") + '"></label>' +
        '<div class="admin-row admin-row-2">' +
          '<label><span>Area / city</span><input type="text" data-field="area" value="' + escapeHtml(area || city) + '"></label>' +
          '<label><span>Type</span><input type="text" data-field="type" value="' + escapeHtml(entry.type || "") + '"></label>' +
        "</div>" +
        '<div class="admin-row admin-row-3">' +
          '<label><span>Date</span><input type="date" data-field="date" value="' + escapeHtml(entry.date || "") + '"></label>' +
          '<label><span>Time</span><input type="text" data-field="timePart" value="' + escapeHtml(split.time) + '" placeholder="5:18 PM"></label>' +
          '<label><span>Timezone</span><input type="text" data-field="timeZone" value="' + escapeHtml(split.zone) + '" placeholder="PDT"></label>' +
        "</div>" +
        '<div class="admin-row admin-row-2">' +
          '<label><span>Latitude</span><input type="number" step="0.0001" data-field="lat" value="' + escapeHtml(entry.lat == null ? "" : entry.lat) + '"></label>' +
          '<label><span>Longitude</span><input type="number" step="0.0001" data-field="lng" value="' + escapeHtml(entry.lng == null ? "" : entry.lng) + '"></label>' +
        "</div>" +
        '<p class="admin-note" id="exif-note">Use a place-level pin (a landmark, neighborhood, or city), never a home or work address. If you upload a photo that still has GPS or a date in its EXIF, those can prefill the fields above. The published file is re-encoded and will have no location data.</p>' +
        '<div class="admin-row admin-row-2">' +
          '<label><span>Style</span><select data-field="style">' +
            '<option value="ink"' + (entry.style !== "clay" ? " selected" : "") + ">ink</option>" +
            '<option value="clay"' + (entry.style === "clay" ? " selected" : "") + ">clay</option>" +
          "</select></label>" +
          '<label class="admin-check">' +
            '<input type="checkbox" data-field="highlight"' + (entry.highlight ? " checked" : "") + ">" +
            "<span>Highlight this stop</span>" +
          "</label>" +
        "</div>" +
        '<label><span>Text</span><textarea data-field="text" rows="6">' + escapeHtml(entry.text || "") + "</textarea></label>" +
        '<label><span>Short text</span><textarea data-field="shortText" rows="3">' + escapeHtml(entry.shortText || "") + "</textarea></label>" +
        '<label><span>Styled image path</span><input type="text" data-field="styledImage" value="' + escapeHtml(entry.styledImage || "") + '" spellcheck="false"></label>' +
        '<label><span>Original image path</span><input type="text" data-field="originalImage" value="' + escapeHtml(entry.originalImage || "") + '" spellcheck="false"></label>' +
        "<h3>Photos</h3>" +
        '<div class="photo-list" id="photo-list">' + (photos || '<p class="admin-hint">No photos yet.</p>') + "</div>" +
        '<label><span>Upload a photo</span><input type="file" id="photo-file" accept="image/*"></label>' +
        '<div class="admin-btn-row">' +
          '<button type="button" class="admin-btn" data-act="add-photo">Add photo row</button>' +
        "</div>" +
      "</div>";
    /* highlight checkbox is inside a label that I accidentally left an empty style attr on — remove if present via CSS only; fix below if needed */
  }

  /* ---- form writeback ---- */

  function currentEntry() {
    var sel = state.selected;
    if (!sel || sel.type !== "entry") return null;
    var trip = state.trips.trips[sel.tripIndex];
    return trip && trip.entries ? trip.entries[sel.entryIndex] : null;
  }

  function currentTrip() {
    var sel = state.selected;
    if (!sel) return null;
    return state.trips.trips[sel.tripIndex] || null;
  }

  function writeEntryFromForm() {
    var form = els.detail.querySelector('[data-form="entry"]');
    var entry = currentEntry();
    if (!form || !entry) return;
    function val(name) {
      var field = form.querySelector('[data-field="' + name + '"]');
      return field ? field.value : "";
    }
    entry.place = val("place");
    entry.area = val("area");
    delete entry.city;
    entry.type = val("type");
    entry.date = val("date");
    entry.time = joinTime(val("timePart"), val("timeZone"));
    var lat = numOrBlank(val("lat"));
    var lng = numOrBlank(val("lng"));
    if (lat === "") delete entry.lat; else entry.lat = lat;
    if (lng === "") delete entry.lng; else entry.lng = lng;
    entry.style = val("style") === "clay" ? "clay" : "ink";
    var highlight = form.querySelector('[data-field="highlight"]');
    entry.highlight = !!(highlight && highlight.checked);
    entry.text = val("text");
    entry.shortText = val("shortText");
    entry.styledImage = val("styledImage");
    entry.originalImage = val("originalImage");
    var rows = form.querySelectorAll(".photo-row");
    entry.photos = Array.prototype.map.call(rows, function (row) {
      function pval(name) {
        var field = row.querySelector('[data-photo="' + name + '"]');
        return field ? field.value : "";
      }
      var photo = { src: pval("src"), kind: pval("kind") || "photo" };
      if (pval("alt")) photo.alt = pval("alt");
      if (pval("caption")) photo.caption = pval("caption");
      return photo;
    });
    if (!entry.area) delete entry.area;
    if (!entry.type) delete entry.type;
    if (!entry.time) delete entry.time;
    if (!entry.shortText) delete entry.shortText;
    if (!entry.styledImage) delete entry.styledImage;
    if (!entry.originalImage) delete entry.originalImage;
    if (!entry.photos.length) delete entry.photos;
    markDirty();
  }

  function writeTripFromForm() {
    var form = els.detail.querySelector('[data-form="trip"]');
    var trip = currentTrip();
    if (!form || !trip || state.selected.type !== "trip") return;
    function val(name) {
      var field = form.querySelector('[data-field="' + name + '"]');
      return field ? field.value.trim() : "";
    }
    trip.title = val("title");
    trip.slug = slugify(val("slug") || val("title"));
    trip.startDate = val("startDate");
    trip.endDate = val("endDate");
    trip.summary = val("summary");
    if (!trip.summary) delete trip.summary;
    if (!trip.startDate) delete trip.startDate;
    if (!trip.endDate) delete trip.endDate;
    markDirty();
  }

  function writeYearsFromForm() {
    var rows = els.yearsEditor.querySelectorAll(".years-row");
    state.years.years = Array.prototype.map.call(rows, function (row) {
      return {
        year: Number(row.querySelector('[data-field="year"]').value),
        summary: row.querySelector('[data-field="summary"]').value
      };
    }).filter(function (item) { return item.year; });
    markDirty();
  }

  function writeAboutFromForm() {
    els.aboutEditor.querySelectorAll("[data-about]").forEach(function (field) {
      state.about[field.getAttribute("data-about")] = field.value;
    });
    markDirty();
  }

  /* ---- actions ---- */

  function newTrip() {
    flush();
    var trip = { slug: "", title: "", entries: [] };
    state.trips.trips.push(trip);
    state.selected = { type: "trip", tripIndex: state.trips.trips.length - 1 };
    markDirty();
    renderNav();
    renderDetail();
    var title = els.detail.querySelector('[data-field="title"]');
    if (title) title.focus();
  }

  function newEntry(ti) {
    flush();
    var trip = state.trips.trips[ti];
    if (!trip) return;
    if (!trip.entries) trip.entries = [];
    trip.entries.push({ place: "", style: "ink", highlight: false });
    state.selected = { type: "entry", tripIndex: ti, entryIndex: trip.entries.length - 1 };
    markDirty();
    renderNav();
    renderDetail();
  }

  function deleteTrip(index) {
    var trip = state.trips.trips[index];
    if (!trip) return;
    if (!window.confirm("Delete the trip “" + (trip.title || trip.slug || "untitled") + "” and all of its entries? Photos already on GitHub will be left in place.")) return;
    state.trips.trips.splice(index, 1);
    state.selected = null;
    markDirty();
    renderNav();
    renderDetail();
  }

  function deleteEntry(ti, ei) {
    var trip = state.trips.trips[ti];
    var entry = trip && trip.entries && trip.entries[ei];
    if (!entry) return;
    if (!window.confirm("Delete the entry “" + (entry.place || "untitled") + "”?")) return;
    trip.entries.splice(ei, 1);
    state.selected = { type: "trip", tripIndex: ti };
    markDirty();
    renderNav();
    renderDetail();
  }

  function addPhotoRow() {
    writeEntryFromForm();
    var entry = currentEntry();
    if (!entry) return;
    if (!entry.photos) entry.photos = [];
    entry.photos.push({ src: "", kind: "photo" });
    markDirty();
    renderDetail();
  }

  function removePhoto(index) {
    writeEntryFromForm();
    var entry = currentEntry();
    if (!entry || !entry.photos) return;
    entry.photos.splice(index, 1);
    markDirty();
    renderDetail();
  }

  function applyExif(exif, entry) {
    if (!exif || !entry) return;
    if (exif.date && !entry.date) entry.date = exif.date;
    if (exif.time && !entry.time) entry.time = exif.time;
    if (exif.lat != null && entry.lat == null) entry.lat = Math.round(exif.lat * 10000) / 10000;
    if (exif.lng != null && entry.lng == null) entry.lng = Math.round(exif.lng * 10000) / 10000;
  }

  function handlePhotoFile(file) {
    var trip = currentTrip();
    var entry = currentEntry();
    if (!trip || !entry || !file) return;
    if (!trip.slug) {
      setBanner("Add a slug to this trip before uploading photos.", "error");
      return;
    }
    writeEntryFromForm();
    els.saveStatus.textContent = "Encoding photo…";
    encodePhoto(file).then(function (result) {
      var path = uniqueImagePath(trip.slug, file.name);
      var blob = new Blob([result.bytes], { type: "image/jpeg" });
      state.pending[path] = {
        base64: bytesToBase64(result.bytes),
        preview: URL.createObjectURL(blob)
      };
      applyExif(result.exif, entry);
      if (!entry.photos) entry.photos = [];
      var kind = "photo";
      if (/-styled/i.test(file.name) || /styled/i.test(file.name)) kind = "styled";
      else if (!entry.originalImage) kind = "original";
      entry.photos.push({ src: path, kind: kind, alt: entry.place || "" });
      if (kind === "styled" && !entry.styledImage) entry.styledImage = path;
      if (kind === "original" && !entry.originalImage) entry.originalImage = path;
      markDirty();
      renderDetail();
      var note = $("exif-note");
      if (note) {
        var bits = [];
        if (result.exif.lat != null) bits.push("GPS");
        if (result.exif.date) bits.push("date");
        note.textContent = bits.length
          ? "Read " + bits.join(" and ") + " from this photo’s EXIF and used it to prefill empty fields. The published file is re-encoded as JPEG and will have no location data."
          : "No GPS or date was found in this photo’s EXIF. The published file is re-encoded as JPEG and will have no location data.";
      }
      els.saveStatus.textContent = "";
    }).catch(function (err) {
      els.saveStatus.textContent = err.message || "Could not encode that photo.";
    });
  }

  function flush() {
    writeTripFromForm();
    writeEntryFromForm();
    writeYearsFromForm();
    writeAboutFromForm();
  }

  function setBanner(text, kind) {
    if (!text) {
      els.banner.hidden = true;
      els.banner.textContent = "";
      els.banner.className = "admin-banner";
      return;
    }
    els.banner.hidden = false;
    els.banner.textContent = text;
    els.banner.className = "admin-banner" + (kind === "error" ? " is-error" : kind === "ok" ? " is-ok" : "");
  }

  function tidyTripDates() {
    (state.trips.trips || []).forEach(function (trip) {
      var dates = (trip.entries || []).map(function (e) { return e.date; }).filter(Boolean).sort();
      if (!dates.length) return;
      if (!trip.startDate) trip.startDate = dates[0];
      if (!trip.endDate) trip.endDate = dates[dates.length - 1];
    });
  }

  function prettyJson(value) {
    return JSON.stringify(value, null, 2) + "\n";
  }

  function save() {
    flush();
    tidyTripDates();
    markDirty();
    if (!state.dirty) return;
    els.saveBtn.disabled = true;
    els.saveStatus.textContent = "Saving…";
    setBanner("");
    var files = [];
    var current = snapshotOf();
    var was = JSON.parse(state.snapshot || '{"trips":{"trips":[]},"years":{"years":[]},"about":{}}');
    if (JSON.stringify(state.trips) !== JSON.stringify(was.trips)) {
      files.push({ path: "data/trips.json", content: utf8ToBase64(prettyJson(state.trips)) });
    }
    if (JSON.stringify(state.years) !== JSON.stringify(was.years)) {
      files.push({ path: "data/years.json", content: utf8ToBase64(prettyJson(state.years)) });
    }
    if (JSON.stringify(state.about) !== JSON.stringify(was.about)) {
      files.push({ path: "data/about.json", content: utf8ToBase64(prettyJson(state.about)) });
    }
    Object.keys(state.pending).forEach(function (path) {
      files.push({ path: path, content: state.pending[path].base64 });
    });
    if (!files.length) {
      els.saveStatus.textContent = "Nothing to save.";
      els.saveBtn.disabled = true;
      return;
    }
    var message = commitMessage(files);
    commitFiles(files, message).then(function () {
      Object.keys(state.pending).forEach(function (path) {
        var item = state.pending[path];
        if (item && item.preview) URL.revokeObjectURL(item.preview);
      });
      state.pending = {};
      state.snapshot = snapshotOf();
      state.dirty = false;
      els.saveBtn.disabled = true;
      els.saveStatus.textContent = "Saved, live in about a minute";
      setBanner("Saved, live in about a minute", "ok");
    }).catch(function (err) {
      els.saveBtn.disabled = false;
      els.saveStatus.textContent = "";
      setBanner(err.message || "Save failed.", "error");
    });
  }

  function commitMessage(files) {
    var paths = files.map(function (f) { return f.path; });
    var hasTrips = paths.indexOf("data/trips.json") >= 0;
    var photos = paths.filter(function (p) { return p.indexOf("images/") === 0; }).length;
    var parts = [];
    if (hasTrips) parts.push("Update trip data");
    if (paths.indexOf("data/years.json") >= 0) parts.push("update year summaries");
    if (paths.indexOf("data/about.json") >= 0) parts.push("update About");
    if (photos) parts.push("add " + (photos === 1 ? "a photo" : photos + " photos"));
    return parts.join(", ").replace(/^./, function (c) { return c.toUpperCase(); }) || "Update Lam Wanders";
  }

  function commitFiles(files, message) {
    var repo = "/repos/" + OWNER + "/" + REPO;
    var refPath = repo + "/git/refs/heads/" + encodeURIComponent(state.branch);
    return api(refPath).then(function (ref) {
      var headSha = ref.object.sha;
      if (state.headSha && state.headSha !== headSha) {
        var conflict = new Error("This page is out of date because something else was saved first. Reload and try again.");
        conflict.status = 409;
        throw conflict;
      }
      return api(repo + "/git/commits/" + headSha).then(function (commit) {
        var ops = files.map(function (file) {
          return api(repo + "/git/blobs", {
            method: "POST",
            body: JSON.stringify({ content: file.content, encoding: "base64" })
          }).then(function (blob) {
            return { path: file.path, mode: "100644", type: "blob", sha: blob.sha };
          });
        });
        return Promise.all(ops).then(function (treeItems) {
          return api(repo + "/git/trees", {
            method: "POST",
            body: JSON.stringify({ base_tree: commit.tree.sha, tree: treeItems })
          }).then(function (tree) {
            return api(repo + "/git/commits", {
              method: "POST",
              body: JSON.stringify({ message: message, tree: tree.sha, parents: [headSha] })
            });
          }).then(function (newCommit) {
            return api(refPath, {
              method: "PATCH",
              body: JSON.stringify({ sha: newCommit.sha, force: false })
            }).then(function () {
              state.headSha = newCommit.sha;
            });
          });
        });
      });
    });
  }

  function loadWorkspace() {
    return api("/repos/" + OWNER + "/" + REPO + "/git/refs/heads/" + encodeURIComponent(state.branch)).then(function (ref) {
      state.headSha = ref.object.sha;
      return Promise.all([
        loadJsonFile("data/trips.json"),
        loadJsonFile("data/years.json"),
        loadJsonFile("data/about.json")
      ]).then(function (parts) {
        state.trips = parts[0] && parts[0].trips ? parts[0] : { trips: [] };
        state.years = parts[1] && parts[1].years ? parts[1] : { years: [] };
        state.about = parts[2] || { title: "About Me", intro: "", body: "" };
        state.snapshot = snapshotOf();
        state.pending = {};
        state.dirty = false;
      });
    });
  }

  function signIn(token, branch, remember) {
    token = String(token || "").trim();
    branch = String(branch || "main").trim() || "main";
    if (!token) {
      showSignIn("Paste a GitHub token to sign in.");
      return Promise.resolve();
    }
    state.token = token;
    state.branch = branch;
    els.signInError.hidden = true;
    return verifyToken().then(function () {
      storeToken(token, remember);
      storeBranch(branch);
      return loadWorkspace();
    }).then(function () {
      var field = $("token-input");
      if (field) field.value = "";
      showEditor();
    }).catch(function (err) {
      clearToken();
      showSignIn(err.message || "Could not sign in.");
    });
  }

  function signOut() {
    flush();
    Object.keys(state.pending).forEach(function (path) {
      var item = state.pending[path];
      if (item && item.preview) URL.revokeObjectURL(item.preview);
    });
    clearToken();
    state.headSha = "";
    state.trips = { trips: [] };
    state.selected = null;
    if ($("token-input")) $("token-input").value = "";
    if ($("remember-input")) $("remember-input").checked = false;
    showSignIn();
  }

  /* ---- events ---- */

  function onNavClick(event) {
    var btn = event.target.closest("button[data-act]");
    if (!btn || !els.tripNav.contains(btn)) return;
    flush();
    var act = btn.getAttribute("data-act");
    var ti = Number(btn.getAttribute("data-trip"));
    if (act === "trip") state.selected = { type: "trip", tripIndex: ti };
    if (act === "entry") state.selected = { type: "entry", tripIndex: ti, entryIndex: Number(btn.getAttribute("data-entry")) };
    if (act === "new-entry") newEntry(ti);
    else {
      renderNav();
      renderDetail();
    }
  }

  function bind() {
    els.signInForm.addEventListener("submit", function (event) {
      event.preventDefault();
      signIn($("token-input").value, $("branch-input").value, $("remember-input").checked);
    });
    els.signOut.addEventListener("click", signOut);
    $("new-trip").addEventListener("click", newTrip);
    $("new-year").addEventListener("click", function () {
      writeYearsFromForm();
      if (!state.years.years) state.years.years = [];
      state.years.years.unshift({ year: new Date().getFullYear(), summary: "" });
      markDirty();
      renderYears();
    });
    els.yearsEditor.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-act='remove-year']");
      if (!btn) return;
      writeYearsFromForm();
      var row = btn.closest(".years-row");
      var index = Number(row.getAttribute("data-year-index"));
      state.years.years.splice(index, 1);
      markDirty();
      renderYears();
    });
    els.yearsEditor.addEventListener("input", writeYearsFromForm);
    els.aboutEditor.addEventListener("input", writeAboutFromForm);
    els.tripNav.addEventListener("click", onNavClick);
    els.detail.addEventListener("input", function (event) {
      if (event.target.closest('[data-form="trip"]')) writeTripFromForm();
      if (event.target.closest('[data-form="entry"]')) writeEntryFromForm();
      if (event.target.id === "photo-file") return;
    });
    els.detail.addEventListener("change", function (event) {
      if (event.target.id === "photo-file" && event.target.files && event.target.files[0]) {
        handlePhotoFile(event.target.files[0]);
        event.target.value = "";
        return;
      }
      if (event.target.closest('[data-form="trip"]')) writeTripFromForm();
      if (event.target.closest('[data-form="entry"]')) writeEntryFromForm();
    });
    els.detail.addEventListener("click", function (event) {
      var btn = event.target.closest("button[data-act]");
      if (!btn) return;
      var act = btn.getAttribute("data-act");
      if (act === "delete-trip" && state.selected) deleteTrip(state.selected.tripIndex);
      if (act === "delete-entry" && state.selected) deleteEntry(state.selected.tripIndex, state.selected.entryIndex);
      if (act === "add-photo") addPhotoRow();
      if (act === "remove-photo") {
        var row = btn.closest(".photo-row");
        if (row) removePhoto(Number(row.getAttribute("data-photo-index")));
      }
    });
    els.saveBtn.addEventListener("click", save);
  }

  function boot() {
    var path = location.pathname;
    if (/\/admin$/.test(path)) {
      location.replace(path + "/" + location.search + location.hash);
      return;
    }
    els.signIn = $("sign-in");
    els.editor = $("editor");
    els.signInForm = $("sign-in-form");
    els.signInError = $("sign-in-error");
    els.signedInActions = $("signed-in-actions");
    els.signOut = $("sign-out");
    els.repoLabel = $("repo-label");
    els.tripNav = $("trip-nav");
    els.yearsEditor = $("years-editor");
    els.aboutEditor = $("about-editor");
    els.detail = $("detail");
    els.saveBtn = $("save-btn");
    els.saveStatus = $("save-status");
    els.banner = $("banner");
    bind();
    var branchField = $("branch-input");
    if (branchField) branchField.value = readStoredBranch();
    var token = readStoredToken();
    var remembered = false;
    try { remembered = !!localStorage.getItem(LOCAL_KEY); } catch (err) {}
    if (token) signIn(token, branchField ? branchField.value : "main", remembered);
  }

  boot();
})();
