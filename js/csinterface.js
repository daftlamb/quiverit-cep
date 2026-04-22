/**
 * Minimal CSInterface bridge for CEP panels.
 */

function CSInterface() {
  this.hostEnvironment = window.__adobe_cep__ ? JSON.parse(window.__adobe_cep__.getHostEnvironment()) : null;
}

CSInterface.prototype.evalScript = function(script, callback) {
  if (!window.__adobe_cep__) {
    if (callback) callback('EvalScript error: CEP not available');
    return;
  }
  window.__adobe_cep__.evalScript(script, callback || null);
};

window.CSInterface = CSInterface;
