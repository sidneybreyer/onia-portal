(function () {
  'use strict';
  var input = document.getElementById('file');
  var prev = document.getElementById('preview');
  var go = document.getElementById('go');
  var buf = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function send(modo) {
    return fetch('/gestao/importar?modo=' + modo, { method: 'POST', body: buf, headers: { 'Content-Type': 'application/octet-stream' }, credentials: 'same-origin' })
      .then(function (r) { return r.json(); });
  }
  input.addEventListener('change', function () {
    var f = input.files[0];
    go.hidden = true; prev.innerHTML = '';
    if (!f) return;
    f.arrayBuffer().then(function (b) {
      buf = b;
      prev.innerHTML = '<p class="muted">Lendo a planilha…</p>';
      return send('previa');
    }).then(function (j) {
      if (j.error) { prev.innerHTML = '<div class="notice error"><p>' + esc(j.error) + '</p></div>'; return; }
      var html = '<p><strong>' + j.total + ' pessoas na planilha.</strong> ' + j.novos.length + ' novas, ' + j.existentes + ' já estão no portal.</p>';
      if (j.issues.length) html += '<div class="notice warn"><p><strong>Pontos de atenção</strong></p><ul style="margin:.4rem 0 0;padding-left:1.2rem">' + j.issues.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></div>';
      prev.innerHTML = html;
      if (j.novos.length) { go.hidden = false; go.textContent = 'Importar ' + j.novos.length + (j.novos.length === 1 ? ' pessoa' : ' pessoas'); }
    }).catch(function () { prev.innerHTML = '<div class="notice error"><p>Não consegui enviar o arquivo. Tente de novo.</p></div>'; });
  });
  go.addEventListener('click', function () {
    go.disabled = true;
    send('importar').then(function (j) {
      if (j.error) { prev.innerHTML = '<div class="notice error"><p>' + esc(j.error) + '</p></div>'; go.disabled = false; return; }
      prev.innerHTML = '<div class="notice ok"><p>' + j.created + ' participantes importados. <a href="/gestao/participantes">Ver lista</a></p></div>';
      go.hidden = true;
    });
  });
})();
