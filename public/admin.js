(function () {
  'use strict';

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('on'); }, 2200);
  }

  function copy(text, okMsg) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, function () { fallback(); });
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(okMsg); } catch (e) { toast('Não foi possível copiar.'); }
      ta.remove();
    }
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (b) copy(b.getAttribute('data-copy'), 'Copiado');
  });

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  // ---------- Lista ----------
  var app = document.getElementById('list-app');
  if (app) {
    var rows = JSON.parse(document.getElementById('data').textContent);
    var stages = JSON.parse(document.getElementById('stages').textContent);
    var tbody = document.getElementById('rows');
    var q = document.getElementById('q');
    var selects = Array.prototype.slice.call(document.querySelectorAll('#filters select'));
    var sortKey = 'name', sortDir = 1;
    var selected = new Set();
    var visible = [];
    var STATUS = { nao_acessou: ['Não acessou', ''], nao_iniciado: ['Acessou, não iniciou', 'warn'], em_andamento: ['Em andamento', 'prog'], enviado: ['Enviado', 'ok'] };

    function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

    // Lê filtros da URL
    var params = new URLSearchParams(location.search);
    selects.forEach(function (s) { if (params.get(s.name)) s.value = params.get(s.name); });
    if (params.get('q')) q.value = params.get('q');
    if (params.get('ordem')) { sortKey = params.get('ordem'); sortDir = params.get('dir') === '-1' ? -1 : 1; }

    function matches(r) {
      var term = norm(q.value.trim());
      if (term && norm([r.name, r.pref, r.school, r.city, r.email, r.uf].join(' ')).indexOf(term) < 0) return false;
      for (var i = 0; i < selects.length; i++) {
        var s = selects[i], v = s.value;
        if (!v) continue;
        switch (s.name) {
          case 'medalha': if (r.medal !== v) return false; break;
          case 'uf': if (r.uf !== v) return false; break;
          case 'idade':
            if (v === 'menor16') { if (!(r.age < 16)) return false; }
            else if (v === 'menor18') { if (!(r.age < 18)) return false; }
            else if (v === 'maior18') { if (!(r.age >= 18)) return false; }
            else if (String(r.age) !== v) return false;
            break;
          case 'status': if (r.status !== v) return false; break;
          case 'etapa': if (String(r.stage) !== v) return false; break;
          case 'caminho': if (r.caminho !== v) return false; break;
          case 'programacao': if (r.programacao !== v) return false; break;
          case 'horas': if (r.horas !== v) return false; break;
          case 'computador': if (r.computador !== v) return false; break;
          case 'tag': if (r.tags.indexOf(v) < 0) return false; break;
          case 'alerta':
            if (v === 'telefone' && r.phoneOk) return false;
            if (v === 'computador' && !r.flags.computador) return false;
            if (v === 'conversa' && !r.flags.conversa) return false;
            if (v === 'corrigido' && !r.corrected) return false;
            break;
        }
      }
      return true;
    }

    function cmp(a, b) {
      var x = a[sortKey], y = b[sortKey];
      var ex = x === '' || x == null, ey = y === '' || y == null;
      if (ex && ey) return a.name.localeCompare(b.name, 'pt');
      if (ex) return 1;
      if (ey) return -1;
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * sortDir || a.name.localeCompare(b.name, 'pt');
      return String(x).localeCompare(String(y), 'pt') * sortDir || a.name.localeCompare(b.name, 'pt');
    }

    function syncUrl() {
      var p = new URLSearchParams();
      if (q.value.trim()) p.set('q', q.value.trim());
      selects.forEach(function (s) { if (s.value) p.set(s.name, s.value); s.classList.toggle('active', !!s.value); });
      if (sortKey !== 'name' || sortDir !== 1) { p.set('ordem', sortKey); p.set('dir', String(sortDir)); }
      var qs = p.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
      return qs;
    }

    function render() {
      visible = rows.filter(matches).sort(cmp);
      var qs = syncUrl();
      try { sessionStorage.setItem('onia_ids', JSON.stringify(visible.map(function (r) { return r.id; }))); sessionStorage.setItem('onia_back', location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* sem ação */ }
      document.querySelectorAll('th[data-sort]').forEach(function (th) {
        if (th.getAttribute('data-sort') === sortKey) th.setAttribute('aria-sort', sortDir === 1 ? 'ascending' : 'descending');
        else th.removeAttribute('aria-sort');
      });
      if (!visible.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="10">Ninguém com esses filtros. <button class="btn quiet small" type="button" id="clear2">Limpar filtros</button></td></tr>';
        var c2 = document.getElementById('clear2'); if (c2) c2.onclick = clearAll;
      } else {
        tbody.innerHTML = visible.map(function (r) {
          var st = STATUS[r.status];
          var stLabel = st[0] + (r.status === 'em_andamento' ? ' ' + r.pct + '%' : '');
          return '<tr>' +
            '<td class="check"><input type="checkbox" data-id="' + r.id + '"' + (selected.has(r.id) ? ' checked' : '') + ' aria-label="Selecionar ' + esc(r.name) + '"></td>' +
            '<td><a class="name" href="/gestao/p/' + r.id + '">' + esc(r.pref ? r.pref + ' (' + r.name + ')' : r.name) + '</a><span class="sub">' + esc(r.school) + '</span>' +
              (r.tags.length ? '<span>' + r.tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</span>' : '') + '</td>' +
            '<td class="num">' + (r.age == null ? '' : r.age) + '</td>' +
            '<td>' + esc(r.uf) + '<span class="sub">' + esc(r.city) + '</span></td>' +
            '<td><span class="medal ' + r.medalClass + '">' + esc(r.medal) + '</span></td>' +
            '<td><span class="pill ' + st[1] + '">' + esc(stLabel) + '</span>' + (!r.phoneOk ? '<span class="sub" style="color:var(--danger)">Telefone inválido</span>' : '') + (!r.active ? '<span class="sub">Desativado</span>' : '') + '</td>' +
            '<td>' + r.stage + '. ' + esc(stages[r.stage - 1]) + (r.referral ? '<span class="sub">' + esc(r.referral) + '</span>' : '') + '</td>' +
            '<td>' + esc(r.caminho) + '</td>' +
            '<td>' + esc(r.programacao) + '</td>' +
            '<td>' + esc(r.horas) + '</td>' +
            '</tr>';
        }).join('');
      }
      document.getElementById('count').textContent = visible.length === rows.length ? rows.length + ' participantes' : visible.length + ' de ' + rows.length + ' participantes';
      document.getElementById('export-all').href = '/gestao/exportar.xlsx' + (visible.length !== rows.length ? '?ids=' + visible.map(function (r) { return r.id; }).join(',') : '');
      document.getElementById('export-all').textContent = visible.length !== rows.length ? 'Exportar estes ' + visible.length + ' em Excel' : 'Exportar lista em Excel';
      updateSel();
    }

    function updateSel() {
      var bar = document.getElementById('selbar');
      bar.classList.toggle('on', selected.size > 0);
      document.getElementById('selcount').textContent = selected.size + (selected.size === 1 ? ' selecionado' : ' selecionados');
      var all = document.getElementById('all');
      var visIds = visible.map(function (r) { return r.id; });
      var n = visIds.filter(function (id) { return selected.has(id); }).length;
      all.checked = n > 0 && n === visIds.length;
      all.indeterminate = n > 0 && n < visIds.length;
    }

    function clearAll() {
      q.value = ''; selects.forEach(function (s) { s.value = ''; });
      render();
    }

    q.addEventListener('input', render);
    selects.forEach(function (s) { s.addEventListener('change', render); });
    document.getElementById('clear').addEventListener('click', clearAll);
    document.querySelectorAll('th[data-sort] button').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.parentNode.getAttribute('data-sort');
        if (k === sortKey) sortDir = -sortDir; else { sortKey = k; sortDir = 1; }
        render();
      });
    });
    tbody.addEventListener('change', function (e) {
      var id = Number(e.target.getAttribute('data-id'));
      if (!id) return;
      if (e.target.checked) selected.add(id); else selected.delete(id);
      updateSel();
    });
    document.getElementById('all').addEventListener('change', function (e) {
      visible.forEach(function (r) { if (e.target.checked) selected.add(r.id); else selected.delete(r.id); });
      render();
    });
    document.getElementById('selbar').addEventListener('click', function (e) {
      var act = e.target.getAttribute('data-act');
      if (!act) return;
      var list = rows.filter(function (r) { return selected.has(r.id); });
      if (act === 'emails') copy(list.map(function (r) { return r.email; }).join(', '), list.length + ' e-mails copiados');
      if (act === 'phones') copy(list.map(function (r) { return r.name + ': ' + r.phoneFmt; }).join('\n'), list.length + ' telefones copiados');
      if (act === 'export') location.href = '/gestao/exportar.xlsx?ids=' + list.map(function (r) { return r.id; }).join(',');
    });

    // Filtros salvos (ficam neste navegador)
    var KEY = 'onia_filtros';
    function loadSaved() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
    function storeSaved(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* sem ação */ } }
    function renderSaved() {
      var box = document.getElementById('saved');
      var list = loadSaved();
      box.innerHTML = list.map(function (f, i) {
        return '<span class="chip"><a href="?' + esc(f.qs) + '" style="color:inherit;text-decoration:none">' + esc(f.name) + '</a><button type="button" data-del="' + i + '" aria-label="Apagar filtro ' + esc(f.name) + '">×</button></span>';
      }).join('');
    }
    document.getElementById('saved').addEventListener('click', function (e) {
      var i = e.target.getAttribute('data-del');
      if (i === null) return;
      var list = loadSaved(); list.splice(Number(i), 1); storeSaved(list); renderSaved();
    });
    document.getElementById('saved').addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      var p = new URLSearchParams(a.getAttribute('href').slice(1));
      q.value = p.get('q') || '';
      selects.forEach(function (s) { s.value = p.get(s.name) || ''; });
      render();
    });
    document.getElementById('save-filter').addEventListener('click', function () {
      var qs = syncUrl();
      if (!qs) { toast('Escolha algum filtro antes de salvar.'); return; }
      var name = window.prompt('Nome do filtro');
      if (!name) return;
      var list = loadSaved(); list.push({ name: name.slice(0, 40), qs: qs }); storeSaved(list); renderSaved();
      toast('Filtro salvo');
    });

    renderSaved();
    render();
  }

  // ---------- Ficha ----------
  var head = document.querySelector('.ficha-head');
  if (head) {
    var id = Number(head.getAttribute('data-id'));
    try {
      var ids = JSON.parse(sessionStorage.getItem('onia_ids') || '[]');
      var back = sessionStorage.getItem('onia_back');
      if (back) document.getElementById('back').href = back;
      var i = ids.indexOf(id);
      if (i >= 0) {
        document.getElementById('pos').textContent = (i + 1) + ' de ' + ids.length;
        if (i > 0) { var pv = document.getElementById('prev'); pv.href = '/gestao/p/' + ids[i - 1]; pv.hidden = false; }
        if (i < ids.length - 1) { var nx = document.getElementById('next'); nx.href = '/gestao/p/' + ids[i + 1]; nx.hidden = false; }
      }
    } catch (e) { /* sem ação */ }

    var tpls = JSON.parse(document.getElementById('templates').textContent);
    var mail = document.getElementById('mail');
    var base = mail.getAttribute('href');
    var tplSel = document.getElementById('tpl');
    function setMail() {
      var t = tpls[tplSel.value];
      mail.href = t ? base + '?subject=' + encodeURIComponent(t.s) + '&body=' + encodeURIComponent(t.b) : base;
    }
    tplSel.addEventListener('change', setMail);
    setMail();

    document.querySelectorAll('[data-log]').forEach(function (a) {
      a.addEventListener('click', function () {
        var body = new URLSearchParams({ kind: a.getAttribute('data-log'), tpl: a.id === 'mail' && tplSel.value ? tplSel.options[tplSel.selectedIndex].text : '' });
        fetch('/gestao/p/' + id + '/contato', { method: 'POST', body: body, credentials: 'same-origin', keepalive: true });
      });
    });

    // Atalhos: setas esquerda/direita navegam entre fichas
    document.addEventListener('keydown', function (e) {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowLeft') { var p = document.getElementById('prev'); if (!p.hidden) location.href = p.href; }
      if (e.key === 'ArrowRight') { var n = document.getElementById('next'); if (!n.hidden) location.href = n.href; }
    });
  }
})();
