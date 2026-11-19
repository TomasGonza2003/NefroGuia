/* Registro clínico de 5 pasos + creación de cuenta de paciente (almacenamiento local) */
(function() {
  var NG = window.NG;
  var T = [
    ['Datos y contacto', 'Crea tu cuenta con tus datos básicos de identificación.'],
    ['Salud y antecedentes', 'Comorbilidades, líquidos diarios, restricción hídrica y medicamentos.'],
    ['Episodios urinarios', 'Distingue síntomas sin confirmar de episodios confirmados médicamente.'],
    ['Cultivos y hábitos', 'Urocultivos, tratamiento prescrito, efectos adversos y hábitos preventivos.'],
    ['Consentimiento', 'Revisa tu resumen clínico y confirma tu registro en la plataforma.']
  ];

  var D = NG.get('reg_draft', {});
  var eps = NG.get('reg_eps', []);
  var cur = NG.get('reg_step', 0);
  var $ = function(i) { return document.getElementById(i); };

  var steps = [].slice.call(document.querySelectorAll('.stp'));
  var lis = [].slice.call(document.querySelectorAll('#nav li[data-go]'));
  var F = [].slice.call(document.querySelectorAll('[data-k]'));

  function bad(el, m) {
    if (!el) return true;
    var n = el.parentNode.querySelector('.err-' + (el.id || el.dataset.k)) || el.nextElementSibling;
    if (n && n.classList && n.classList.contains('err')) n.remove();
    if (m) {
      var d = document.createElement('div');
      d.className = 'err err-' + (el.id || el.dataset.k);
      d.textContent = m;
      el.after(d);
      return false;
    }
    return true;
  }

  function fmt(d) {
    if (!d) return '';
    return new Date(d + 'T00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function calcAge(dStr) {
    if (!dStr) return null;
    var b = new Date(dStr + 'T00:00');
    if (isNaN(b.getTime())) return null;
    var diff = Date.now() - b.getTime();
    var ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  function updateAgeDisplay() {
    var dStr = v('nac');
    var age = calcAge(dStr);
    var el = $('edad-calc');
    if (el) {
      el.textContent = age !== null ? 'Edad: ' + age + ' años' : 'Edad: —';
    }
  }

  // Cargar borrador previo si existe
  F.forEach(function(f) {
    var k = f.dataset.k, pw = f.type === 'password';
    if (!pw && D[k] != null) {
      if (f.type === 'checkbox') f.checked = !!D[k];
      else f.value = D[k];
    }
    f.addEventListener('input', function() {
      if (!pw) {
        D[k] = f.type === 'checkbox' ? f.checked : f.value;
        NG.set('reg_draft', D);
      }
      $('st').textContent = 'Guardado ' + new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      dep();
    });
    if (f.type === 'change') {
      f.addEventListener('change', dep);
    }
  });

  // Validación en tiempo real: correo, contraseña (reglas y fuerza) y confirmación
  (function() {
    var pw = $('r_pass'), p2 = $('r_pass2'), ml = $('r_mail');
    var ul = document.createElement('ul');
    var mt = document.createElement('div');
    ul.className = 'pwr';
    ul.setAttribute('aria-live', 'polite');
    mt.className = 'pws';
    mt.innerHTML = '<i></i>';
    if (pw) {
      pw.after(ul);
      ul.after(mt);
    }

    function draw() {
      if (!pw || !ml) return;
      var s = NG.val.strength(pw.value, ml.value);
      ul.innerHTML = NG.val.rules(pw.value, ml.value).map(function(r) {
        return '<li' + (r[1] ? ' class="ok"' : '') + '>' + r[0] + '</li>';
      }).join('');
      mt.className = 'pws ' + (s.lvl === 'f' ? 'f' : s.lvl === 'm' ? 'm' : '');
      if (mt.firstChild) mt.firstChild.style.width = s.pct + '%';
    }

    if (pw) {
      pw.addEventListener('input', function() {
        draw();
        if (p2.value) bad(p2, p2.value !== pw.value ? 'Las contraseñas no coinciden' : '');
      });
    }
    if (p2) {
      p2.addEventListener('input', function() {
        bad(p2, p2.value !== pw.value ? 'Las contraseñas no coinciden' : '');
      });
    }
    if (ml) {
      ml.addEventListener('blur', function() {
        if (ml.value.trim()) bad(ml, NG.val.email(ml.value));
      });
      ml.addEventListener('input', function() {
        if (ml.nextElementSibling && ml.nextElementSibling.classList.contains('err')) {
          bad(ml, NG.val.email(ml.value));
        }
        draw();
      });
    }
    if ($('r_nom')) {
      $('r_nom').addEventListener('blur', function() {
        if ($('r_nom').value.trim()) bad($('r_nom'), NG.val.name($('r_nom').value));
      });
    }
    if ($('r_nac')) {
      $('r_nac').addEventListener('change', updateAgeDisplay);
      $('r_nac').addEventListener('input', updateAgeDisplay);
    }
    draw();
    updateAgeDisplay();
  })();

  function dep() {
    var dmEl = document.querySelector('[data-k=dm]');
    if ($('dmw') && dmEl) $('dmw').hidden = !dmEl.checked;

    var ercEl = document.querySelector('[data-k=erc]');
    if ($('erc_wrap') && ercEl) $('erc_wrap').hidden = !ercEl.checked;

    var restrEl = document.querySelector('[data-k=restr_liq]');
    if ($('restr_wrap') && restrEl) $('restr_wrap').hidden = !restrEl.checked;

    var sexVal = v('sex');
    var embWrap = $('emb-wrap');
    var prosLabel = $('pros-label');
    if (sexVal === 'M') {
      if (embWrap) embWrap.hidden = true;
      if ($('r_emb')) $('r_emb').value = 'No aplica';
      if ($('emb-sem-wrap')) $('emb-sem-wrap').hidden = true;
      if (prosLabel) prosLabel.hidden = false;
    } else if (sexVal === 'F') {
      if (embWrap) embWrap.hidden = false;
      if (prosLabel) {
        prosLabel.hidden = true;
        var pCk = prosLabel.querySelector('input');
        if (pCk) pCk.checked = false;
      }
      var embVal = v('emb');
      if ($('emb-sem-wrap')) $('emb-sem-wrap').hidden = embVal !== 'Sí';
    } else {
      if (embWrap) embWrap.hidden = false;
      if (prosLabel) prosLabel.hidden = false;
    }

    if ($('cdw') && $('r_cu')) {
      var cuVal = $('r_cu').value === 'Sí';
      $('cdw').hidden = !cuVal;
      if ($('cug_wrap')) $('cug_wrap').hidden = !cuVal;
    }

    updateAgeDisplay();
  }

  function since(days) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }

  function cnt(days, c) {
    var limit = since(days);
    var t = NG.today();
    return eps.filter(function(e) {
      return e.d >= limit && e.c === c && e.d <= t;
    }).length;
  }

  function drawEps() {
    NG.set('reg_eps', eps);
    var elL = $('e_l');
    if (elL) {
      elL.innerHTML = eps.length ? eps.slice().sort(function(a, b) {
        return a.d < b.d ? 1 : -1;
      }).map(function(e) {
        return '<div class="row"><span>' + fmt(e.d) + ' · ' + (e.c ? '<b style="color:var(--hl)">Confirmado médicamente</b>' : 'Síntomas no confirmados') + (e.n ? ' · ' + NG.esc(e.n) : '') + '</span><button class="pill r" type="button" data-x="' + e.id + '">Quitar</button></div>';
      }).join('') : '<p class="mute">Aún no agregas episodios previos. Si no has tenido episodios de ITU, puedes continuar.</p>';
    }

    var elT = $('e_t');
    if (elT) {
      elT.innerHTML = '<div class="ep"><b>Período</b><span>Síntomas no confirmados</span><span>Episodios confirmados</span></div>' +
        [[30, 'Últimos 30 días'], [90, 'Últimos 3 meses'], [180, 'Últimos 6 meses'], [365, 'Últimos 12 meses']].map(function(p) {
          return '<div class="ep"><b>' + p[1] + '</b><span>' + cnt(p[0], 0) + '</span><span>' + cnt(p[0], 1) + '</span></div>';
        }).join('');
    }

    var rec = cnt(180, 1) >= 2 || cnt(365, 1) >= 3;
    var r = $('e_r');
    if (r) {
      r.className = 'nudge ' + (rec ? 'r' : '');
      r.innerHTML = rec ?
        '<b>Criterio de Recurrencia detectado (≥2 en 6 meses o ≥3 en 12 meses):</b> Tu ficha se priorizará en el panel médico para seguimiento especializado y urocultivo.' :
        'Con los episodios registrados actualmente no cumples el umbral de recurrencia clínica estricta.';
    }
  }

  if ($('e_a')) {
    $('e_a').onclick = function() {
      var d = $('e_d').value;
      if (!bad($('e_d'), !d ? 'Elige la fecha del episodio' : d > NG.today() ? 'La fecha no puede ser futura' : '')) return;
      eps.push({
        id: Date.now(),
        d: d,
        c: +$('e_c').value,
        n: $('e_n').value.trim()
      });
      $('e_n').value = '';
      $('e_d').value = '';
      drawEps();
    };
  }

  if ($('e_l')) {
    $('e_l').onclick = function(e) {
      var x = e.target.dataset.x;
      if (x) {
        eps = eps.filter(function(i) { return String(i.id) !== x; });
        drawEps();
      }
    };
  }

  function v(k) {
    var f = document.querySelector('[data-k=' + k + ']');
    if (!f) return '';
    return f.type === 'checkbox' ? f.checked : f.value.trim();
  }

  function acc() {
    return NG.get('accounts', {});
  }

  function valid(s) {
    var ok = true;
    function f(id, m) {
      var res = bad($(id), m);
      if (!res) ok = false;
    }

    if (s === 0) {
      var m = v('mail').toLowerCase();
      var n = v('nac') ? new Date(v('nac') + 'T00:00') : null;
      var existingAccs = acc();

      f('r_nom', NG.val.name(v('nom')));
      f('r_mail', NG.val.email(m) || (existingAccs[m] ? 'Ya existe una cuenta con este correo' : ''));
      f('r_tel', NG.val.phone(v('tel')));
      f('r_nac', !v('nac') || !n || n > new Date() || n.getFullYear() < 1900 ? 'Ingresa una fecha de nacimiento válida' : '');
      f('r_sex', !v('sex') ? 'Selecciona una opción de sexo biológico' : '');
      if (v('sex') === 'F' && v('emb') === 'Sí' && v('sem_emb')) {
        var sem = +v('sem_emb');
        f('r_sem_emb', (sem < 1 || sem > 42) ? 'Ingresa semanas de gestación válidas (1–42)' : '');
      }
      f('r_pass', NG.val.pass(v('pass'), m));
      f('r_pass2', v('pass2') !== v('pass') ? 'Las contraseñas no coinciden' : '');
    }

    if (s === 1) {
      f('r_dmt', v('dm') && !v('dmt') ? 'Indica el estado de tu tratamiento para la diabetes' : '');
      f('r_liq', v('liq') !== '' && (+v('liq') < 0 || +v('liq') > 30) ? 'Indica una cantidad entre 0 y 30 vasos' : '');
      if (v('restr_liq')) {
        var rml = +v('restr_ml');
        f('r_restr_ml', (!v('restr_ml') || rml < 300 || rml > 5000) ? 'Indica el límite de restricción hídrica en mL (300 a 5000 mL)' : '');
      }
    }

    if (s === 3) {
      f('r_cud', v('cu') === 'Sí' && (!v('cud') || v('cud') > NG.today()) ? 'Indica la fecha del cultivo (no futura)' : '');
    }

    if (s === 4) {
      var c1 = document.querySelector('[data-k=c1]');
      var c2 = document.querySelector('[data-k=c2]');
      if (!bad(c1 ? c1.parentNode : null, !v('c1') ? 'Este consentimiento es obligatorio para continuar' : '')) ok = false;
      if (!bad(c2 ? c2.parentNode : null, !v('c2') ? 'Debes aceptar el almacenamiento local de tus datos' : '')) ok = false;
    }

    return ok;
  }

  function summary() {
    var comorbilidades = [
      'dm:Diabetes Mellitus', 'erc:Enfermedad Renal Crónica', 'lit:Cálculos urinarios (Litiasis)',
      'hta:Hipertensión arterial', 'ob:Obesidad', 'inm:Inmunosupresión/Trasplante',
      'son:Sonda vesical', 'ins:Cirugía urológica reciente', 'pros:Problemas prostáticos'
    ].filter(function(x) { return v(x.split(':')[0]); }).map(function(x) { return x.split(':')[1]; }).join(', ') || 'Ninguna reportada';

    var age = calcAge(v('nac'));
    var r = [
      ['Nombre completo', v('nom')],
      ['Nacionalidad / Correo', (v('pais') || 'Chile') + ' · ' + v('mail')],
      ['Teléfono', v('tel') || 'No informado'],
      ['Fecha de nacimiento / Edad / Sexo', (v('nac') ? fmt(v('nac')) : '') + ' (' + (age !== null ? age + ' años' : '—') + ') · ' + (v('sex') === 'F' ? 'Femenino' : v('sex') === 'M' ? 'Masculino' : 'Otro')],
      ['Gestación', v('sex') === 'F' && v('emb') === 'Sí' ? ('Sí (' + (v('sem_emb') ? v('sem_emb') + ' semanas' : 'Semanas no especificadas') + ')') : (v('sex') === 'M' ? 'No aplica' : v('emb') || 'No')],
      ['Antecedentes médicos', comorbilidades],
      ['Tratamiento diabetes', v('dm') ? v('dmt') : 'No aplica'],
      ['Estadio ERC / Creatinina', v('erc') ? (v('erc_est') || 'Diagnosticada') : 'No aplica'],
      ['Restricción hídrica prescrita', v('restr_liq') ? ('Sí: máximo ' + (v('restr_ml') || '1500') + ' mL/día') : 'Sin restricción formal'],
      ['Consumo diario habitual de líquidos', (v('liq') || '0') + ' vasos al día (≈ ' + ((+v('liq') || 0) * 250) + ' mL)'],
      ['Episodios confirmados (6 m / 12 m)', cnt(180, 1) + ' en 6 meses / ' + cnt(365, 1) + ' en 12 meses'],
      ['Urocultivo reciente', v('cu') === 'Sí' ? ('Sí, realizado el ' + (v('cud') ? fmt(v('cud')) : 'fecha pendiente') + (v('cug') ? ' · Germen: ' + v('cug') : '')) : 'No realizado'],
      ['Tratamiento antibiótico prescrito', v('tr') || 'Ninguno'],
      ['Adherencia antibiótica / Dosis omitidas', v('dom') || 'Sin omisiones'],
      ['Efectos adversos del fármaco', v('efectos') || 'Ninguno reportado'],
      ['Uso previo de antibióticos (3 meses)', v('ant_prev') || 'No'],
      ['Atención médica reciente', v('ur') || 'Consulta habitual'],
      ['Hábitos preventivos (Postcoital / Arándanos)', (v('hp') || 'No informado') + ' / ' + (v('ha') || 'No')]
    ];

    $('sm').innerHTML = r.map(function(x) {
      return '<div class="row"><span>' + x[0] + '</span><b>' + NG.esc(x[1]) + '</b></div>';
    }).join('');
  }

  function go(n) {
    cur = n;
    NG.set('reg_step', n);
    steps.forEach(function(s, i) { s.hidden = i !== n; });
    lis.forEach(function(l, i) {
      l.classList.toggle('on', i === n);
      l.style.cursor = i < n ? 'pointer' : 'default';
      l.classList.toggle('done', i < n);
      l.innerHTML = '<i class="sn">' + (i < n ? '✓' : (i + 1)) + '</i><span>' + T[i][0] + '</span>';
    });
    $('pn').textContent = 'Paso ' + (n + 1) + ' de 5';
    $('pg').textContent = Math.round((n + 1) / 5 * 100) + '% completado';
    $('pt').textContent = T[n][0];
    $('pd').textContent = T[n][1];
    $('bk').style.visibility = n ? 'visible' : 'hidden';
    $('nx').textContent = n === 4 ? 'Crear cuenta y entrar a NefroGuía' : 'Continuar';
    dep();
    if (n === 2) drawEps();
    if (n === 4) summary();
    scrollTo(0, 0);
  }

  lis.forEach(function(l, i) {
    l.onclick = function() {
      if (i < cur) go(i);
    };
  });

  $('bk').onclick = function() {
    if (cur > 0) go(cur - 1);
  };

  $('nx').onclick = function() {
    if (!valid(cur)) {
      return NG.toast('Por favor completa o corrige los campos requeridos');
    }
    if (cur < 4) {
      return go(cur + 1);
    }

    // Validación general previa a finalizar
    for (var s = 0; s < 4; s++) {
      if (!valid(s)) {
        go(s);
        return NG.toast('Falta información en el paso ' + (s + 1));
      }
    }

    var m = v('mail').toLowerCase();
    var A = acc();
    var c6 = cnt(180, 1);
    var c12 = cnt(365, 1);
    var profileData = {};

    F.forEach(function(f) {
      if (f.type !== 'password' && f.dataset.k) {
        profileData[f.dataset.k] = f.type === 'checkbox' ? f.checked : f.value;
      }
    });

    var age = calcAge(v('nac')) || 30;
    var isPregnant = (v('sex') === 'F' && v('emb') === 'Sí') ? 1 : 0;
    var hasRestr = !!v('restr_liq');
    var restrMl = +v('restr_ml') || 0;
    var waterCeil = hasRestr && restrMl > 0 ? Math.max(2, Math.round(restrMl / 250)) : Math.max(8, +v('liq') || 8);

    // Guardar cuenta local
    A[m] = {
      name: v('nom'),
      role: 'paciente',
      h: NG.hash(v('pass'))
    };
    NG.set('accounts', A);

    // Guardar perfil detallado
    NG.set('profile:' + m, {
      d: profileData,
      eps: eps,
      at: Date.now()
    });

    // Añadir a la cohorte local de pacientes clínicos (`ng_pts`)
    var pts = NG.getPts();
    var existingPtIndex = -1;
    for (var i = 0; i < pts.length; i++) {
      if (pts[i].email && pts[i].email.toLowerCase() === m) {
        existingPtIndex = i;
        break;
      }
    }

    var urocultivoEstado = 'Sin muestra';
    if (v('cu') === 'Sí') {
      urocultivoEstado = v('cug') ? 'Disponible: pendiente revisión' : 'Solicitado: pendiente';
    }

    var newPtRecord = {
      id: 'P' + (pts.length + 1 < 10 ? '0' + (pts.length + 1) : (pts.length + 1)),
      n: v('nom'),
      edad: age,
      pais: v('pais') || 'Chile',
      desc: isPregnant ? 'Embarazo ' + (v('sem_emb') || '—') + ' sem' : (v('dm') ? 'Diabetes' : 'Paciente registrado'),
      email: m,
      tel: v('tel') || '',
      sex: v('sex') === 'M' ? 'M' : 'F',
      c6: c6,
      c12: c12,
      ad: v('dom') && v('dom').indexOf('Omití 2') > -1 ? 65 : (v('dom') && v('dom').indexOf('Omití 1') > -1 ? 85 : 100),
      cu: v('cu') === 'Sí' ? ('Urocultivo: ' + (v('cug') || 'En proceso')) : 'Sin muestra',
      cuEstado: urocultivoEstado,
      cuGermen: v('cug') || '',
      f: 36.6,
      p: 0,
      ctl: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      dm: v('dm') ? 1 : 0,
      hta: v('hta') ? 1 : 0,
      ob: v('ob') ? 1 : 0,
      lit: v('lit') ? 1 : 0,
      inm: v('inm') ? 1 : 0,
      inst: v('ins') ? 1 : 0,
      son: v('son') ? 1 : 0,
      er: v('erc') ? 1 : 0,
      estadioERC: v('erc_est') || '',
      pros: v('pros') ? 1 : 0,
      emb: isPregnant,
      semEmb: v('sem_emb') || '',
      restr_liq: hasRestr ? 1 : 0,
      restr_ml: restrMl,
      vom: 0,
      confusion: 0,
      glucosa: v('dm') ? 140 : null,
      tr: v('tr') || 'En seguimiento ambulatorio',
      hist: [0, 0, 0, 0, 0, 0, 0],
      waterCeiling: waterCeil,
      nutriNotes: hasRestr ?
        ('Restricción hídrica activa de ' + restrMl + ' mL/día (≈ ' + waterCeil + ' vasos). No forzar ingesta de líquidos.') :
        ('Meta hídrica recomendada: ' + waterCeil + ' vasos diarios (≈ ' + (waterCeil * 250) + ' mL). Vaciamiento vesical periódico y micción postcoital.')
    };

    if (existingPtIndex > -1) {
      // Conservar el ID existente si ya existía
      newPtRecord.id = pts[existingPtIndex].id || newPtRecord.id;
      pts[existingPtIndex] = newPtRecord;
    } else {
      pts.push(newPtRecord);
    }
    NG.savePts(pts);

    // Inicializar registro de agua y chequeo basal del paciente
    var todayStr = NG.today();
    var waterLog = {};
    waterLog[todayStr] = +v('liq') || 4;
    NG.set('water:' + m, waterLog);

    var dailyLog = [{
      d: todayStr,
      h: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      id: Date.now(),
      t: 36.6,
      p: 0,
      loc: 'Sin dolor',
      escala: 0,
      esc: 0,
      v: +v('liq') || 4,
      vom: 0,
      nausea: 0,
      mic: 4,
      mental: 0,
      ab: 1,
      ab_om: 0,
      ab_efectos: v('efectos') || 'Ninguno',
      g: v('dm') ? 140 : null,
      ok: 1
    }];
    NG.set('log:' + m, dailyLog);

    // Mensaje inicial del equipo de salud
    NG.sendChat(m, 'clinico', 'Equipo Médico NefroGuía', '¡Bienvenida/o a NefroGuía, ' + v('nom').split(' ')[0] + '! Tu ficha clínica ha sido registrada en el sistema. Recuerda registrar tu chequeo diario y tus vasos de agua (250 mL).');

    // Iniciar sesión activa
    NG.set('user', {
      role: 'paciente',
      email: m,
      name: v('nom'),
      at: Date.now()
    });

    // Limpiar borrador temporal
    ['reg_draft', 'reg_eps', 'reg_step'].forEach(function(k) {
      localStorage.removeItem('ng_' + k);
    });

    NG.toast('¡Cuenta creada exitosamente! Ingresando a tu portal...');
    setTimeout(function() {
      location.href = 'paciente.html';
    }, 700);
  };

  drawEps();
  go(Math.min(cur, 4));
})();