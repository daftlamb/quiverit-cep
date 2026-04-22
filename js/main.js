// Quiver It CEP panel logic. Internal vector trace workflow only.

window.onerror = function(message, source, lineno) {
  setStatus('Panel JS error: ' + message + ' @ ' + lineno, 'error');
};

var cs = new CSInterface();
var BASE_URL = 'https://api.quiver.ai/v1';
var selectedImageBase64 = null;
var selectedImageDataUrl = null;
var selectedImageMime = null;
var tracedSVG = null;

function el(id) {
  return document.getElementById(id);
}

function setStatus(message, type) {
  var status = el('status');
  status.className = type || '';
  status.textContent = message;
}

function getKey() {
  return localStorage.getItem('quiver_api_key') || '';
}

function saveKey() {
  var key = el('api-key').value.trim();
  if (!key) {
    setStatus('API key cannot be empty.', 'error');
    return;
  }
  localStorage.setItem('quiver_api_key', key);
  setStatus('API key saved locally.', 'success');
  checkCredits(key);
}

function clearKey() {
  localStorage.removeItem('quiver_api_key');
  el('api-key').value = '';
  el('credits-display').textContent = 'Save an internal API key before tracing.';
  setStatus('Saved API key cleared.', 'success');
}

function checkCredits(key) {
  el('credits-display').textContent = 'Checking credits...';
  fetch(BASE_URL + '/models', {
    headers: { Authorization: 'Bearer ' + key }
  })
    .then(function(response) {
      if (!response.ok) throw new Error('Could not verify API key.');
      return response.json();
    })
    .then(function(data) {
      var models = data && data.data ? data.data : [];
      var model = models.filter(function(item) { return item.id === el('vec-model').value; })[0] || models[0];
      var credits = model && model.pricing_credits ? model.pricing_credits.svg_vectorize : '?';
      el('credits-display').textContent = 'Vectorize cost: ' + credits + ' credits';
    })
    .catch(function(err) {
      el('credits-display').textContent = err.message || 'Could not check credits.';
    });
}

function chooseImage() {
  el('img-file').click();
}

function loadImageFile(event) {
  var file = event.target.files && event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var dataUrl = ev.target.result;
    selectedImageMime = file.type || 'image/png';
    tracedSVG = null;
    el('btn-insert').disabled = true;
    el('img-preview').innerHTML = '<img src="' + String(dataUrl) + '" alt="">';
    el('svg-preview').innerHTML = '<span class="preview-placeholder">SVG preview appears here</span>';
    setStatus('Preparing raster image for QuiverIt...', '');

    rasterizeForUpload(String(dataUrl), 2400)
      .then(function(pngDataUrl) {
        selectedImageMime = 'image/png';
        selectedImageDataUrl = pngDataUrl;
        selectedImageBase64 = selectedImageDataUrl.split(',')[1];
        setStatus('Image loaded. Ready to trace.', 'success');
      })
      .catch(function(err) {
        selectedImageDataUrl = null;
        selectedImageBase64 = null;
        setStatus(err.message || 'Could not prepare image.', 'error');
      });
  };
  reader.readAsDataURL(file);
}

function rasterizeForUpload(dataUrl, maxSize) {
  return new Promise(function(resolve, reject) {
    var img = new Image();
    img.onload = function() {
      var width = img.naturalWidth || img.width;
      var height = img.naturalHeight || img.height;
      if (!width || !height) {
        reject(new Error('Could not read image dimensions.'));
        return;
      }

      var scale = Math.min(1, maxSize / Math.max(width, height));
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));

      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      try {
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(new Error('Could not rasterize image for upload.'));
      }
    };
    img.onerror = function() {
      reject(new Error('Could not load selected image.'));
    };
    img.src = dataUrl;
  });
}

function vectorizeImage() {
  var key = getKey();
  if (!key) {
    setStatus('Add API key first.', 'error');
    return;
  }
  if (!selectedImageBase64) {
    setStatus('Choose an image first.', 'error');
    return;
  }

  var button = el('btn-vectorize');
  var insert = el('btn-insert');
  button.disabled = true;
  insert.disabled = true;
  tracedSVG = null;
  setStatus('Tracing image with QuiverIt API...', '');

  postVectorize(key, {
    model: el('vec-model').value,
    stream: false,
    image: { url: selectedImageDataUrl }
  })
    .catch(function(firstError) {
      if (!isInvalidImageError(firstError)) throw firstError;
      setStatus('Retrying with raw base64 payload...', '');
      return postVectorize(key, {
        model: el('vec-model').value,
        stream: false,
        image: { base64: selectedImageBase64 }
      });
    })
    .then(function(data) {
      var svg = data && data.data && data.data[0] && data.data[0].svg;
      if (!svg) throw new Error('No SVG returned by API.');
      tracedSVG = svg;
      showPreview(svg);
      insert.disabled = false;
      var credits = data.credits || data.credits_used || '?';
      setStatus('Trace complete. Credits used: ' + credits, 'success');
    })
    .catch(function(err) {
      setStatus(err.message || 'Vectorize failed.', 'error');
    })
    .finally(function() {
      button.disabled = false;
    });
}

function postVectorize(key, body) {
  return fetch(BASE_URL + '/svgs/vectorizations', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
    .then(function(response) {
      if (!response.ok) {
        return response.text().then(function(text) {
          var errorBody = {};
          try { errorBody = JSON.parse(text); } catch (parseErr) { errorBody.message = text; }
          var err = new Error(errorBody.message || String(response.status));
          err.status = response.status;
          err.code = errorBody.code || '';
          err.request_id = errorBody.request_id || '';
          if (err.request_id) err.message += ' (' + err.request_id + ')';
          throw err;
        });
      }
      return response.json();
    });
}

function isInvalidImageError(err) {
  return err && err.status === 400 && /image/i.test(err.message || '');
}

function showPreview(svgString) {
  var clean = String(svgString || '').replace(/<script[\s\S]*?<\/script>/gi, '');
  el('svg-preview').innerHTML = clean;
  var svg = el('svg-preview').querySelector('svg');
  if (svg) {
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.maxWidth = '100%';
    svg.style.maxHeight = '220px';
  }
}

function insertIntoIllustrator() {
  if (!tracedSVG) return;
  setStatus('Inserting SVG into Illustrator...', '');
  var payload = encodeURIComponent(tracedSVG);
  cs.evalScript('insertEncodedSVG("' + payload + '")', function(result) {
    if (result && result.indexOf('ok:') === 0) {
      setStatus(result.substring(3), 'success');
    } else {
      setStatus(result || 'Insert failed.', 'error');
    }
  });
}

function init() {
  el('btn-save-key').addEventListener('click', saveKey);
  el('btn-clear-key').addEventListener('click', clearKey);
  el('btn-pick-img').addEventListener('click', chooseImage);
  el('img-file').addEventListener('change', loadImageFile);
  el('btn-vectorize').addEventListener('click', vectorizeImage);
  el('btn-insert').addEventListener('click', insertIntoIllustrator);
  el('vec-model').addEventListener('change', function() {
    var key = getKey();
    if (key) checkCredits(key);
  });

  var saved = getKey();
  if (saved) {
    el('api-key').value = saved;
    checkCredits(saved);
  }
  setStatus('Ready');
}

init();
