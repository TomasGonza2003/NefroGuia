/* Panel de administración básico (proyecto académico: sin seguridad real).
   Todo vive en localStorage del navegador; no hay servidor. */
(function() {
  var NG = window.NG;
  var ADMIN_EMAIL = 'admin@nefroguia.cl';   // ← cambia aquí las credenciales de demo
  var ADMIN_PASS = 'Admin2026!';
  var $ = function(i) { return document.getElementById(i); };
  var esc = NG.esc;

  /* ---------- Sesión admin (se cierra al cerrar la pestaña) ---------- */
  function isAdmin() {
    try { return sessionStorage.getItem('ng_admin') === '1'; } catch (e) { return false; }
  }
  function showApp(on) {
    $('ad-login').classList.toggle('on', !on);
    $('ad-app').classList.toggle('on', on);
    if (on) { route(); }
  }
  $('ad-go').onclick = function() {
    var e = $('ad-err');
    if ($('ad-em').value.trim().toLowerCase() === ADMIN_EMAIL && $('ad-pw').value === ADMIN_PASS) {
      try { sessionStorage.setItem('ng_admin', '1'); } catch (x) {}
      e.hidden = true;
      NG.log('admin', 'Administrador inició sesión');
      showApp(true);
    } else {
      e.textContent = 'Correo o contraseña incorrectos.';
      e.hidden = false;
    }
  };
  [$('ad-em'), $('ad-pw')].forEach(function(i) {
    i.addEventListener('keydown', function(e) { if (e.key === 'Enter') $('ad-go').click(); });
  });
  $('ad-out').onclick = function() {
    try { sessionStorage.removeItem('ng_admin'); } catch (e) {}
    showApp(false);
  };

  /* ---------- Datos ---------- */
  function accounts() { return NG.get('accounts', {}); }
  function reqs() { return NG.get('pro_requests', []); }
  function fdate(ts) {
    return new Date(ts).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // Profesionales: agrupa las claves de cuenta que son la misma persona (p. ej. un alias de correo)
  function pros() {
    var A = accounts(), groups = {}, order = [];
    Object.keys(A).forEach(function(email) {
      var a = A[email];
      if (a.role !== 'clinico') return;
      var key = (a.reg || '') + '|' + a.name;
      if (!groups[key]) {
        groups[key] = { name: a.name, specialty: a.specialty || '—', reg: a.reg || '—', emails: [], disabled: !!a.disabled, at: a.at };
        order.push(key);
      }
      groups[key].emails.push(email);
    });
    return order.map(function(k) { return groups[k]; });
  }

  function storageInfo() {
    var bytes = 0, keys = 0, chats = 0, logs = 0, profiles = 0;
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.indexOf('ng_') !== 0) continue;
      var v = localStorage.getItem(k) || '';
      bytes += (k.length + v.length) * 2;
      keys++;
      try {
        if (k.indexOf('ng_chat:') === 0) chats += JSON.parse(v).length;
        if (k.indexOf('ng_log:') === 0) logs += JSON.parse(v).length;
      } catch (e) {}
      if (k.indexOf('ng_profile:') === 0) profiles++;
    }
    return { kb: bytes / 1024, keys: keys, chats: chats, logs: logs, profiles: profiles };
  }

  function kpi(label, value, sub) {
    return '<div class="card kpi"><span class="mute">' + label + '</span><b>' + value + '</b><small class="mute">' + sub + '</small></div>';
  }
  function table(head, rows, empty) {
    if (!rows.length) return '<p class="empty">' + empty + '</p>';
    return '<table><thead><tr>' + head.map(function(h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table>';
  }
  function actList(list, n) {
    var items = list.slice().reverse().slice(0, n);
    if (!items.length) return '<p class="empty">Aún no hay actividad registrada.</p>';
    return items.map(function(a) {
      return '<div class="act-i"><time>' + fdate(a.t) + '</time><span><span class="pill ' + (a.type === 'solicitud' ? 'a' : '') + '">' + esc(a.type) + '</span> ' + esc(a.text) + '</span></div>';
    }).join('');
  }

  /* ---------- Render de cada sección ---------- */
  function pendRows(list, withHist) {
    return list.map(function(r) {
      var acts = r.status === 'pendiente'
        ? '<div class="row2"><button class="btn sm" data-act="ok" data-id="' + r.id + '">Aprobar</button><button class="btn sm r" data-act="no" data-id="' + r.id + '">Rechazar</button></div>'
        : (r.status === 'rechazada' ? '<button class="btn o sm" data-act="reopen" data-id="' + r.id + '">Reabrir</button>' : '');
      return '<tr><td><b>' + esc(r.name) + '</b><br><small class="mute">' + esc(r.email) + (r.tel ? ' · ' + esc(r.tel) : '') + '</small></td>' +
        '<td>' + esc(r.specialty) + '<br><small class="mute">' + esc(r.inst || '') + '</small></td>' +
        '<td>' + esc(r.reg) + '</td><td>' + fdate(r.at) + '</td>' +
        (withHist ? '<td><span class="pill ' + (r.status === 'aprobada' ? '' : 'r') + '">' + r.status + '</span>' + (r.note ? '<br><small class="mute">' + esc(r.note) + '</small>' : '') + '</td>' : '') +
        '<td>' + acts + '</td></tr>';
    });
  }

  function renderResumen() {
    var pts = NG.getPts(), R = reqs(), P = pros(), A = accounts();
    var pend = R.filter(function(r) { return r.status === 'pendiente'; });
    var off = Object.keys(A).filter(function(k) { return A[k].disabled; }).length;
    $('ad-date').textContent = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    $('r-kpis').innerHTML =
      kpi('Pacientes', pts.length, 'En la cohorte de la plataforma') +
      kpi('Profesionales activos', P.filter(function(p) { return !p.disabled; }).length, 'Con acceso al panel clínico') +
      kpi('Solicitudes pendientes', pend.length, 'Esperan aprobación') +
      kpi('Cuentas desactivadas', off, 'Sin acceso a la plataforma');
    $('r-pend').innerHTML = table(['Profesional', 'Especialidad', 'Registro', 'Fecha', ''], pendRows(pend, false), 'No hay solicitudes pendientes.');
    $('r-act').innerHTML = actList(NG.get('activity', []), 6);
  }

  function renderSolicitudes() {
    var R = reqs().slice().reverse();
    var pend = R.filter(function(r) { return r.status === 'pendiente'; });
    var hist = R.filter(function(r) { return r.status !== 'pendiente'; });
    $('s-pend').innerHTML = table(['Profesional', 'Especialidad', 'Registro', 'Fecha', ''], pendRows(pend, false), 'No hay solicitudes pendientes.');
    $('s-hist').innerHTML = table(['Profesional', 'Especialidad', 'Registro', 'Fecha', 'Estado', ''], pendRows(hist, true), 'Todavía no has resuelto solicitudes.');
  }

  function renderPros() {
    var rows = pros().map(function(p) {
      return '<tr><td><b>' + esc(p.name) + '</b><br><small class="mute">' + p.emails.map(esc).join(' · ') + '</small></td>' +
        '<td>' + esc(p.specialty) + '</td><td>' + esc(p.reg) + '</td>' +
        '<td><span class="pill ' + (p.disabled ? 'r' : '') + '">' + (p.disabled ? 'Desactivado' : 'Activo') + '</span></td>' +
        '<td><button class="btn o sm" data-act="toggle" data-em="' + esc(p.emails[0]) + '">' + (p.disabled ? 'Reactivar' : 'Desactivar') + '</button></td></tr>';
    });
    $('p-list').innerHTML = table(['Profesional', 'Especialidad', 'Registro', 'Estado', ''], rows, 'No hay profesionales registrados.');
  }

  function ptsFiltered() {
    var q = ($('pa-q').value || '').trim().toLowerCase();
    return NG.getPts().filter(function(p) {
      return !q || (p.n || '').toLowerCase().indexOf(q) > -1 || (p.id || '').toLowerCase().indexOf(q) > -1 || (p.email || '').toLowerCase().indexOf(q) > -1;
    });
  }
  function renderPacientes() {
    var A = accounts();
    $('pa-sub').textContent = NG.getPts().length + ' pacientes en la plataforma';
    var rows = ptsFiltered().map(function(p) {
      var em = (p.email || '').toLowerCase(), acc = A[em];
      return '<tr><td>' + esc(p.id || '—') + '</td><td><b>' + esc(p.n) + '</b><br><small class="mute">' + esc(p.email || '—') + '</small></td>' +
        '<td>' + (p.edad || '—') + '</td><td>' + esc(p.sex || '—') + '</td>' +
        '<td>' + (acc ? '<span class="pill ' + (acc.disabled ? 'r' : '') + '">' + (acc.disabled ? 'Desactivada' : 'Activa') + '</span>' : '<span class="pill a">Sin cuenta</span>') + '</td>' +
        '<td>' + (acc ? '<button class="btn o sm" data-act="toggle" data-em="' + esc(em) + '">' + (acc.disabled ? 'Reactivar' : 'Desactivar') + '</button>' : '') + '</td></tr>';
    });
    $('pa-list').innerHTML = table(['ID', 'Paciente', 'Edad', 'Sexo', 'Cuenta', ''], rows, 'Sin resultados.');
  }

  function renderMonitoreo() {
    var s = storageInfo(), act = NG.get('activity', []), P = pros();
    var pct = Math.min(100, Math.round(s.kb / 5120 * 100));
    $('m-kpis').innerHTML =
      kpi('Almacenamiento', s.kb.toFixed(1) + ' KB', pct + '% de ~5 MB del navegador') +
      kpi('Mensajes de chat', s.chats, 'Entre pacientes y profesionales') +
      kpi('Registros diarios', s.logs, 'Evolución cargada por pacientes') +
      kpi('Perfiles completados', s.profiles, 'Fichas clínicas de 5 pasos');

    // Ingresos por día (últimos 7)
    var days = [], counts = [];
    for (var k = 6; k >= 0; k--) {
      var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - k);
      var from = d.getTime(), to = from + 86400000;
      days.push(from);
      counts.push(act.filter(function(a) { return a.type === 'login' && a.t >= from && a.t < to; }).length);
    }
    var max = Math.max.apply(null, counts.concat([1]));
    $('m-bars').innerHTML = NG.bars(counts.map(function(c) { return c / max * 100; }), counts.map(function(c, i) {
      return new Date(days[i]).toLocaleDateString('es', { weekday: 'narrow' }).toUpperCase() + ' ' + c;
    }));

    var ok = true;
    try { localStorage.setItem('ng__t', '1'); localStorage.removeItem('ng__t'); } catch (e) { ok = false; }
    var last = act.filter(function(a) { return a.type === 'login'; }).pop();
    $('m-status').innerHTML =
      '<div class="meter"><i style="width:' + pct + '%"></i></div>' +
      '<div class="st-row"><span>Almacenamiento local</span><span class="pill ' + (ok ? '' : 'r') + '">' + (ok ? 'Operativo' : 'Con errores') + '</span></div>' +
      '<div class="st-row"><span>Datos de demo cargados</span><span class="pill ' + (NG.get('seed_v', 0) ? '' : 'a') + '">' + (NG.get('seed_v', 0) ? 'Versión ' + NG.get('seed_v', 0) : 'No') + '</span></div>' +
      '<div class="st-row"><span>Claves guardadas</span><b>' + s.keys + '</b></div>' +
      '<div class="st-row"><span>Profesionales activos</span><b>' + P.filter(function(p) { return !p.disabled; }).length + ' de ' + P.length + '</b></div>' +
      '<div class="st-row"><span>Último ingreso</span><b>' + (last ? fdate(last.t) : '—') + '</b></div>';

    $('m-act').innerHTML = act.length
      ? table(['Fecha', 'Tipo', 'Detalle'], act.slice().reverse().slice(0, 60).map(function(a) {
          return '<tr><td>' + fdate(a.t) + '</td><td><span class="pill ' + (a.type === 'solicitud' ? 'a' : '') + '">' + esc(a.type) + '</span></td><td>' + esc(a.text) + '</td></tr>';
        }), '')
      : '<p class="empty">Aún no hay actividad registrada.</p>';
  }

  function badge() {
    var n = reqs().filter(function(r) { return r.status === 'pendiente'; }).length;
    $('nb-req').textContent = n;
    $('nb-req').hidden = !n;
  }

  /* ---------- Navegación por hash ---------- */
  var VIEWS = { resumen: renderResumen, solicitudes: renderSolicitudes, profesionales: renderPros, pacientes: renderPacientes, monitoreo: renderMonitoreo };
  function route() {
    var v = (location.hash || '').replace('#', '');
    if (!VIEWS[v]) v = 'resumen';
    document.querySelectorAll('[data-panel]').forEach(function(p) { p.hidden = p.dataset.panel !== v; });
    document.querySelectorAll('.side a[data-go]').forEach(function(a) { a.classList.toggle('on', a.dataset.go === v); });
    VIEWS[v]();
    badge();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', function() { if (isAdmin()) route(); });
  document.querySelectorAll('.side a[data-go]').forEach(function(a) {
    a.onclick = function() {
      if (location.hash === '#' + a.dataset.go) route(); else location.hash = a.dataset.go;
    };
  });

  /* ---------- Acciones (aprobar, rechazar, desactivar, herramientas) ---------- */
  document.addEventListener('click', function(e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.dataset.act, R, r, A;

    if (act === 'ok' || act === 'no' || act === 'reopen') {
      R = reqs();
      r = R.filter(function(x) { return x.id === b.dataset.id; })[0];
      if (!r) return;
      if (act === 'ok') {
        A = accounts();
        if (A[r.email]) return NG.toast('Ya existe una cuenta con ese correo');
        A[r.email] = { name: r.name, role: 'clinico', specialty: r.specialty, reg: r.reg, h: r.h, approved: true, at: Date.now() };
        NG.set('accounts', A);
        r.status = 'aprobada';
        r.resolvedAt = Date.now();
        NG.log('admin', 'Aprobó a ' + r.name + ' (' + r.email + ')');
        NG.toast('Profesional aprobado');
      } else if (act === 'no') {
        var note = prompt('Motivo del rechazo (opcional):', '');
        if (note === null) return;
        r.status = 'rechazada';
        r.note = note.trim();
        r.resolvedAt = Date.now();
        NG.log('admin', 'Rechazó a ' + r.name + ' (' + r.email + ')');
        NG.toast('Solicitud rechazada');
      } else {
        r.status = 'pendiente';
        delete r.note;
        NG.log('admin', 'Reabrió la solicitud de ' + r.name);
      }
      NG.set('pro_requests', R);
      route();
      return;
    }

    if (act === 'toggle') {
      A = accounts();
      var acc = A[b.dataset.em];
      if (!acc) return;
      var off = !acc.disabled;
      // Si es profesional, afecta a todas las claves de la misma persona (alias de correo)
      Object.keys(A).forEach(function(k) {
        if (k === b.dataset.em || (acc.role === 'clinico' && A[k].role === 'clinico' && A[k].name === acc.name && (A[k].reg || '') === (acc.reg || ''))) {
          A[k].disabled = off;
        }
      });
      NG.set('accounts', A);
      NG.log('admin', (off ? 'Desactivó' : 'Reactivó') + ' la cuenta de ' + acc.name);
      NG.toast(off ? 'Cuenta desactivada' : 'Cuenta reactivada');
      route();
      return;
    }
  });

  $('pa-q').addEventListener('input', renderPacientes);
  $('pa-csv').onclick = function() {
    var rows = [['ID', 'Nombre', 'Correo', 'Edad', 'Sexo']].concat(ptsFiltered().map(function(p) {
      return [p.id, p.n, p.email, p.edad, p.sex];
    }));
    NG.csv('pacientes_nefroguia.csv', rows);
  };
  $('m-refresh').onclick = function() { route(); NG.toast('Datos actualizados'); };

  $('t-export').onclick = function() {
    var out = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.indexOf('ng_') === 0) out[k] = localStorage.getItem(k);
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
    a.download = 'respaldo_nefroguia_' + NG.today() + '.json';
    a.click();
    NG.log('admin', 'Descargó un respaldo de datos');
  };
  $('t-clear').onclick = function() {
    if (!confirm('¿Vaciar el registro de actividad?')) return;
    NG.set('activity', []);
    route();
  };
  $('t-reset').onclick = function() {
    if (!confirm('Esto borra TODOS los datos de la plataforma en este navegador (cuentas nuevas, solicitudes, registros, chats) y vuelve a los datos de demo. ¿Continuar?')) return;
    var drop = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.indexOf('ng_') === 0 && k !== 'ng_theme') drop.push(k);
    }
    drop.forEach(function(k) { localStorage.removeItem(k); });
    NG.initSeed();
    NG.log('admin', 'Restableció los datos de demo');
    NG.toast('Datos de demo restablecidos');
    route();
  };

  showApp(isAdmin());
})();
