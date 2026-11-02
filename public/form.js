(function () {
  'use strict';
  var form = document.getElementById('qform');
  if (!form) return;
  var state = document.getElementById('save-state');
  var timer = null, inFlight = false, pending = false, dirty = false;

  function setState(text) { if (state) state.textContent = text; }

  // Contador de caracteres
  function updateCounter(ta) {
    var c = ta.parentNode.querySelector('.counter');
    if (!c) return;
    var max = +ta.getAttribute('data-count');
    var n = ta.value.length;
    c.textContent = n + ' / ' + max;
    c.classList.toggle('over', n > max);
  }
  form.querySelectorAll('textarea[data-count]').forEach(function (ta) {
    updateCounter(ta);
    ta.addEventListener('input', function () { updateCounter(ta); });
  });

  // Limite de escolhas, opção exclusiva e campo "Outro"
  form.querySelectorAll('fieldset[data-field]').forEach(function (fs) {
    var max = +fs.getAttribute('data-max') || 0;
    var excl = fs.getAttribute('data-exclusive');
    var boxes = fs.querySelectorAll('input[type=checkbox], input[type=radio]');
    var other = fs.querySelector('.other-input');
    function sync(changed) {
      if (excl && changed && changed.type === 'checkbox' && changed.checked) {
        boxes.forEach(function (b) {
          if (b === changed) return;
          if (changed.value === excl || b.value === excl) b.checked = false;
        });
      }
      if (max) {
        var count = 0;
        boxes.forEach(function (b) { if (b.checked) count++; });
        boxes.forEach(function (b) { if (!b.checked) b.disabled = count >= max; });
      }
      if (other) {
        var on = false;
        boxes.forEach(function (b) { if (b.checked && b.getAttribute('data-other')) on = true; });
        other.hidden = !on;
      }
    }
    boxes.forEach(function (b) { b.addEventListener('change', function () { sync(b); }); });
    sync(null);
  });

  function showErrors(errors) {
    form.querySelectorAll('[data-field^="pf_"]').forEach(function (el) {
      var key = el.getAttribute('data-field').slice(3);
      var msg = errors && errors[key];
      el.classList.toggle('has-error', !!msg);
      var e = el.querySelector('.error-text');
      if (e) { e.textContent = msg || ''; e.hidden = !msg; }
    });
  }

  function save() {
    if (inFlight) { pending = true; return; }
    inFlight = true; dirty = false;
    setState('Salvando…');
    var body = new URLSearchParams(new FormData(form));
    fetch(form.action, { method: 'POST', body: body, headers: { 'X-Autosave': '1' }, credentials: 'same-origin' })
      .then(function (r) {
        if (r.status === 401) { window.location.href = '/entrar'; return null; }
        if (!r.ok) throw new Error('falha');
        return r.json();
      })
      .then(function (j) {
        if (!j) return;
        var t = new Date();
        var hh = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
        var hasErr = j.errors && Object.keys(j.errors).length;
        setState(hasErr ? 'Corrija os campos destacados' : 'Salvo às ' + hh);
        showErrors(j.errors || {});
      })
      .catch(function () { setState('Sem conexão. Suas respostas serão salvas ao continuar.'); dirty = true; })
      .then(function () {
        inFlight = false;
        if (pending) { pending = false; save(); }
      });
  }

  function schedule(delay) {
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(save, delay);
  }

  form.addEventListener('change', function () { schedule(300); });
  form.addEventListener('input', function (e) {
    if (e.target.matches('textarea, input[type=text], input[type=email]') && !e.target.name.startsWith('pf_')) schedule(1500);
  });
  window.addEventListener('pagehide', function () {
    if (!dirty) return;
    try {
      var body = new URLSearchParams(new FormData(form));
      fetch(form.action, { method: 'POST', body: body, headers: { 'X-Autosave': '1' }, keepalive: true, credentials: 'same-origin' });
    } catch (e) { /* sem ação */ }
  });
})();
