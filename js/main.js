// main.js - Quiver It CEP panel logic

var cs = new CSInterface();
var BASE_URL = "https://api.quiver.ai/v1";
var currentSVG = null;
var vecSVG = null;
var selectedImageBase64 = null;
var selectedImageMime = null;

// ── Tab switching ──────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(function(tab) {
  tab.addEventListener("click", function() {
    document.querySelectorAll(".tab").forEach(function(t) { t.classList.remove("active"); });
    document.querySelectorAll(".panel").forEach(function(p) { p.classList.add("hidden"); });
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.remove("hidden");
  });
});

// ── API key persistence ────────────────────────────────────────
function getKey() { return localStorage.getItem("quiver_api_key") || ""; }

document.getElementById("btn-save-key").addEventListener("click", function() {
  var key = document.getElementById("api-key").value.trim();
  if (!key) { setStatus("key-status", "error", "Key cannot be empty"); return; }
  localStorage.setItem("quiver_api_key", key);
  setStatus("key-status", "success", "Saved");
  checkCredits(key);
});

window.addEventListener("load", function() {
  var saved = getKey();
  if (saved) {
    document.getElementById("api-key").value = saved;
    checkCredits(saved);
  }
});

// ── Credits check via models endpoint ─────────────────────────
function checkCredits(key) {
  fetch(BASE_URL + "/models", {
    headers: { "Authorization": "Bearer " + key }
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data && data.data && data.data.length) {
      var m = data.data.find(function(x) { return x.id === "arrow-1.1"; }) || data.data[0];
      var gen = m.pricing_credits ? m.pricing_credits.svg_generate : "?";
      var vec = m.pricing_credits ? m.pricing_credits.svg_vectorize : "?";
      document.getElementById("credits-display").textContent =
        "generate: " + gen + " cr  |  vectorize: " + vec + " cr";
    }
  })
  .catch(function() {
    document.getElementById("credits-display").textContent = "could not fetch";
  });
}

// ── Status helper ──────────────────────────────────────────────
function setStatus(id, type, msg) {
  var el = document.getElementById(id);
  el.className = "status " + (type || "");
  el.innerHTML = type === "loading"
    ? '<span class="spinner"></span>' + msg
    : msg;
}

// ── GENERATE ──────────────────────────────────────────────────
document.getElementById("btn-generate").addEventListener("click", function() {
  var key = getKey();
  if (!key) { setStatus("gen-status", "error", "Add API key in Settings"); return; }
  var prompt = document.getElementById("prompt").value.trim();
  if (!prompt) { setStatus("gen-status", "error", "Enter a prompt"); return; }

  var model = document.getElementById("model").value;
  var n = parseInt(document.getElementById("count").value, 10);

  setStatus("gen-status", "loading", "Generating…");
  document.getElementById("btn-generate").disabled = true;
  document.getElementById("btn-insert").disabled = true;
  currentSVG = null;

  fetch(BASE_URL + "/svgs/generations", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt: prompt, model: model, n: n })
  })
  .then(function(r) {
    if (!r.ok) return r.json().then(function(e) { throw new Error(e.message || r.status); });
    return r.json();
  })
  .then(function(data) {
    var svg = data.data && data.data[0] && data.data[0].svg;
    if (!svg) throw new Error("No SVG in response");
    currentSVG = svg;
    showPreview("gen-preview", svg);
    setStatus("gen-status", "success", "Done — " + (data.credits || "?") + " credits used");
    document.getElementById("btn-insert").disabled = false;
  })
  .catch(function(e) {
    setStatus("gen-status", "error", e.message);
  })
  .finally(function() {
    document.getElementById("btn-generate").disabled = false;
  });
});

// ── Insert Generate result ─────────────────────────────────────
document.getElementById("btn-insert").addEventListener("click", function() {
  if (!currentSVG) return;
  cs.evalScript('insertSVG(' + JSON.stringify(currentSVG) + ')', function(result) {
    if (result && result.indexOf("ok:") === 0) {
      setStatus("gen-status", "success", "Inserted: " + result.slice(3));
    } else {
      setStatus("gen-status", "error", result || "Insert failed");
    }
  });
});

// ── VECTORIZE ─────────────────────────────────────────────────
document.getElementById("btn-pick-img").addEventListener("click", function() {
  document.getElementById("img-file").click();
});

document.getElementById("img-file").addEventListener("change", function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var dataUrl = ev.target.result;
    selectedImageMime = file.type || "image/png";
    selectedImageBase64 = dataUrl.split(",")[1];
    var preview = document.getElementById("vec-img-preview");
    preview.innerHTML = '<img src="' + dataUrl + '" style="max-width:100%;max-height:160px;"/>';
  };
  reader.readAsDataURL(file);
});

document.getElementById("btn-vectorize").addEventListener("click", function() {
  var key = getKey();
  if (!key) { setStatus("vec-status", "error", "Add API key in Settings"); return; }
  if (!selectedImageBase64) { setStatus("vec-status", "error", "Choose an image first"); return; }

  var model = document.getElementById("vec-model").value;
  setStatus("vec-status", "loading", "Vectorizing…");
  document.getElementById("btn-vectorize").disabled = true;
  document.getElementById("btn-vec-insert").disabled = true;
  vecSVG = null;

  fetch(BASE_URL + "/svgs/vectorizations", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      image: { base64: selectedImageBase64, media_type: selectedImageMime }
    })
  })
  .then(function(r) {
    if (!r.ok) return r.json().then(function(e) { throw new Error(e.message || r.status); });
    return r.json();
  })
  .then(function(data) {
    var svg = data.data && data.data[0] && data.data[0].svg;
    if (!svg) throw new Error("No SVG in response");
    vecSVG = svg;
    showPreview("vec-preview", svg);
    setStatus("vec-status", "success", "Done — " + (data.credits || "?") + " credits used");
    document.getElementById("btn-vec-insert").disabled = false;
  })
  .catch(function(e) {
    setStatus("vec-status", "error", e.message);
  })
  .finally(function() {
    document.getElementById("btn-vectorize").disabled = false;
  });
});

document.getElementById("btn-vec-insert").addEventListener("click", function() {
  if (!vecSVG) return;
  cs.evalScript('insertSVG(' + JSON.stringify(vecSVG) + ')', function(result) {
    if (result && result.indexOf("ok:") === 0) {
      setStatus("vec-status", "success", "Inserted: " + result.slice(3));
    } else {
      setStatus("vec-status", "error", result || "Insert failed");
    }
  });
});

// ── Preview helper ─────────────────────────────────────────────
function showPreview(containerId, svgString) {
  var box = document.getElementById(containerId);
  // sanitize: remove script tags
  var clean = svgString.replace(/<script[\s\S]*?<\/script>/gi, "");
  box.innerHTML = clean;
  var svgEl = box.querySelector("svg");
  if (svgEl) {
    svgEl.removeAttribute("width");
    svgEl.removeAttribute("height");
    svgEl.style.maxWidth = "100%";
    svgEl.style.maxHeight = "200px";
  }
}
