(function () {
  'use strict';
  var input = document.getElementById('chave');
  var warn = document.getElementById('nokey');
  var go = document.getElementById('go');
  function sync() {
    var key = (location.hash || '').slice(1).trim();
    if (key) {
      input.value = key;
      try { sessionStorage.setItem('onia_setup', key); } catch (e) { /* sem ação */ }
      history.replaceState(null, '', location.pathname);
    } else if (!input.value) {
      try { input.value = sessionStorage.getItem('onia_setup') || ''; } catch (e) { /* sem ação */ }
    }
    warn.hidden = !!input.value;
    go.disabled = !input.value;
  }
  window.addEventListener('hashchange', sync);
  sync();
})();
