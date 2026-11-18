/* Vista profesional: Triage por reglas validadas, gestión de los 20 pacientes sintéticos (P01-P20), prescripción de techos nutricionales y reporte clínico oficial */
(function() {
  var NG = window.NG;
  var user = NG.get('user', { name: 'Dra. Laura Gómez', role: 'clinico' });
  var docName = user.name || 'Dra. Laura Gómez';
  var sel = 0; // Índice de paciente seleccionado
  var currentFilter = 'all';

  function getP() {
    return NG.getPts();
  }

  // Techos y umbrales globales de alerta
  var th = NG.get('th', { temp: 38.0, dolor: 7, adh: 80 });

  // Algoritmo clínico de prioridad de triage validado con el equipo médico (Págs. 7 y 8 del PDF)
  function calcPriority(x) {
    if (x.priorityExpected) {
      if (x.priorityExpected === 'Revisar ahora') return ['r', 'Revisar ahora'];
      if (x.priorityExpected === 'Hoy') return ['a', 'Hoy'];
      return ['', 'Estable'];
    }

    // Reglas directas que prevalecen sobre el puntaje
    if (x.confusion || (x.f >= th.temp) || (x.p >= th.dolor) || (x.vom && x.inabilityToDrink) ||
        (x.emb && (x.f >= 38.0 || x.p >= 4)) || (x.lit && x.f >= 38.0) || (x.inm && x.f >= 38.0)) {
      return ['r', 'Revisar ahora'];
    }

    // Modificadores de seguimiento y contacto clínico
    if ((x.c6 >= 2 || x.c12 >= 3) || (x.ad < th.adh) || (x.f >= 37.5) || (x.p >= 4) || x.inst || (x.glucosa >= 250)) {
      return ['a', 'Hoy'];
    }

    return ['', 'Estable'];
  }

  function why(x) {
    var w = [];
    if (x.confusion) w.push('Confusión / Sospecha de sepsis');
    if (x.f >= th.temp) w.push('Fiebre ' + x.f + ' °C');
    if (x.p >= th.dolor) w.push('Dolor severo (' + x.p + '/10)');
    if (x.vom) w.push('Vómitos / Intolerancia');
    if (x.emb) w.push('Embarazo (valoración obstétrica)');
    if (x.lit) w.push('Litiasis (descartar obstrucción)');
    if (x.inm) w.push('Inmunodeprimido / trasplante');
    if (x.c6 >= 2 || x.c12 >= 3) w.push('Recurrencia (' + x.c6 + '/6m · ' + x.c12 + '/12m)');
    if (x.ad < th.adh) w.push('Baja adherencia (' + x.ad + '%)');
    if (x.glucosa >= 250) w.push('Hiperglucemia (' + x.glucosa + ' mg/dL)');
    if (x.er) w.push('ERC Estadio ' + (x.estadioERC || '3'));
    if (x.inst) w.push('Instrumentación urológica');
    return w.join(' · ') || 'Control preventivo sin factores de riesgo';
  }

  // Generador de filas para la tabla de Triage
  function rows(list) {
    var allPts = getP();
    return list.map(function(x) {
      var l = calcPriority(x);
      var origIndex = allPts.indexOf(x);
      var isRec = (x.c6 >= 2 || x.c12 >= 3);
      var cuBadge = x.cuEstado || x.cu || 'Pendiente';
      var cuClass = (cuBadge.indexOf('disponible') > -1 || cuBadge.indexOf('revisado') > -1) ? '' : (cuBadge.indexOf('proceso') > -1 || cuBadge.indexOf('Pendiente') > -1 ? 'a' : '');

      return '<tr data-p="' + (l[0] || 'e') + '" data-idx="' + origIndex + '" style="cursor:pointer" class="' + (origIndex === sel ? 'row-selected' : '') + '">' +
        '<td>' +
          '<div class="pn">' +
            '<em class="av2 ' + (l[0] || '') + '">' + (x.id || NG.ini(x.n)) + '</em>' +
            '<div>' +
              '<b>' + NG.esc(x.n) + '</b> <small class="mute">(' + (x.edad || '—') + ' a · ' + (x.sex || 'F') + ')</small>' +
              '<br><small class="mute">' + NG.esc(why(x)) + '</small>' +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td>' +
          '<b>' + x.c6 + ' / 6 m</b> · ' + x.c12 + ' / 12 m ' +
          (isRec ? '<span class="pill r" style="font-size:10px;margin-left:4px">Recurrente</span>' : '') +
        '</td>' +
        '<td>' +
          '<span class="pill ' + (x.ad < 80 ? 'a' : '') + '">' + x.ad + '%</span>' +
        '</td>' +
        '<td><span class="pill ' + cuClass + '">' + NG.esc(cuBadge) + '</span></td>' +
        '<td>' + (x.ctl || 'No programado') + '</td>' +
        '<td>' +
          '<span class="pill ' + l[0] + '">' + l[1] + '</span>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  // Actualizar dashboard y KPIs del panel 0
  function refreshKpi() {
    var P = getP();
    var p0 = document.querySelector('[data-panel="0"]');
    if (!p0) return;

    var alertsList = P.filter(function(x) { return calcPriority(x)[0] === 'r'; });
    var hoyList = P.filter(function(x) { return calcPriority(x)[0] === 'a'; });
    var estList = P.filter(function(x) { return calcPriority(x)[0] === ''; });
    var lowAdhList = P.filter(function(x) { return x.ad < 80; });
    var culturesPending = P.filter(function(x) {
      var s = (x.cuEstado || x.cu || '');
      return s.indexOf('proceso') > -1 || s.indexOf('Pendiente') > -1 || s.indexOf('pendiente') > -1 || s.indexOf('Sin muestra') > -1;
    });

    var nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    var nextWeekStr = nextWeek.toISOString().slice(0, 10);
    var controlsNextWeek = P.filter(function(x) { return x.ctl >= NG.today() && x.ctl <= nextWeekStr; });

    var avgAdh = P.length ? Math.round(P.reduce(function(a, x) { return a + (x.ad || 0); }, 0) / P.length) : 0;

    var elAlertas = document.getElementById('kpi-alertas');
    if (elAlertas) elAlertas.textContent = alertsList.length;
    var elCultivos = document.getElementById('kpi-cultivos');
    if (elCultivos) elCultivos.textContent = culturesPending.length;
    var elAdh = document.getElementById('kpi-adherencia');
    if (elAdh) elAdh.textContent = avgAdh + '%';
    var elControles = document.getElementById('kpi-controles');
    if (elControles) elControles.textContent = controlsNextWeek.length;

    // Filtros de botones
    var displayList = P.slice();
    if (currentFilter === 'r') displayList = alertsList;
    else if (currentFilter === 'hoy') displayList = hoyList;
    else if (currentFilter === 'est') displayList = estList;
    else if (currentFilter === 'adh') displayList = lowAdhList;

    var tbody = p0.querySelector('#triage-table tbody');
    if (tbody) {
      tbody.innerHTML = rows(displayList) || '<tr><td colspan="6" style="text-align:center;padding:16px" class="mute">No se encontraron pacientes con este filtro.</td></tr>';

      tbody.querySelectorAll('tr[data-idx]').forEach(function(tr) {
        tr.onclick = function() {
          sel = +tr.dataset.idx;
          updateSelectedPatientUI();
          refreshKpi();
        };
      });
    }

    updateSelectedPatientUI();
  }

  function updateSelectedPatientUI() {
    var P = getP();
    if (!P.length) return;
    if (sel >= P.length) sel = 0;
    var t = P[sel];
    if (!t) return;

    var p0 = document.querySelector('[data-panel="0"]');
    if (!p0) return;

    var nameEl = document.getElementById('sel-p-name');
    if (nameEl) nameEl.textContent = (t.id ? t.id + ' · ' : '') + t.n + ' (' + (t.desc || 'Evolución clínica') + ')';

    var prioEl = document.getElementById('sel-p-priority');
    if (prioEl) {
      var l = calcPriority(t);
      prioEl.className = 'pill ' + l[0];
      prioEl.textContent = l[1];
    }

    var chartBox = document.getElementById('sel-p-chart');
    if (chartBox) {
      var histData = (t.hist && t.hist.length) ? t.hist : [2, 3, 3, 4, 4, 5, (t.p || 4)];
      chartBox.innerHTML = NG.bars(histData.map(function(h) { return h * 10; }), NG.wk(histData.length));
    }

    var pPain = document.getElementById('sel-pill-pain');
    if (pPain) pPain.textContent = 'Dolor EVA: ' + (t.p || 0) + ' / 10 (' + (t.dolorLoc || 'Flanco') + ')';
    var pAdh = document.getElementById('sel-pill-adh');
    if (pAdh) pAdh.textContent = 'Adherencia: ' + t.ad + '%';
    var pRec = document.getElementById('sel-pill-rec');
    if (pRec) pRec.textContent = t.c6 + ' / 6m · ' + t.c12 + ' / 12m';
    var pG = document.getElementById('sel-pill-g');
    if (pG) {
      if (t.glucosa) {
        pG.style.display = 'inline-block';
        pG.textContent = 'Glucemia: ' + t.glucosa + ' mg/dL';
        pG.className = 'pill ' + (t.glucosa >= 250 ? 'r' : 'a');
      } else {
        pG.style.display = 'none';
      }
    }

    var cuRow = document.getElementById('sel-p-cu-row');
    if (cuRow) {
      cuRow.textContent = 'Urocultivo: ' + (t.cuEstado || t.cu || 'No solicitado') + (t.bacteria ? ' · Germen: ' + t.bacteria : '');
      cuRow.style.background = (t.cuEstado && t.cuEstado.indexOf('revisado') > -1) ? 'var(--mint)' : 'var(--redbg)';
      cuRow.style.color = (t.cuEstado && t.cuEstado.indexOf('revisado') > -1) ? 'var(--acc)' : 'var(--red)';
    }

    var notesRow = document.getElementById('sel-p-notes-row');
    if (notesRow) {
      notesRow.textContent = 'Tratamiento: ' + (t.tr || 'En seguimiento') + ' · Próximo control: ' + (t.ctl || 'No agendado');
    }

    // Alerta de sugerencia de estudio de imagen (Pág. 10 del PDF)
    var imgAlert = document.getElementById('sel-p-image-alert');
    if (imgAlert) {
      var reqImage = (t.lit || t.dm || t.inm || (t.f >= 38.0 && t.p >= 6) || (t.c6 >= 2 && t.f >= 38.0));
      if (reqImage) {
        imgAlert.style.display = 'block';
        imgAlert.innerHTML = '<b>Alerta clínica de estudio de imagen:</b> ' +
          (t.lit ? 'Sospecha de litiasis/obstrucción: valorar ecografía renal urgente para descartar uropatía obstructiva infectada.' :
          t.emb ? 'Embarazo con sospecha de pielonefritis: indicar ecografía obstétrica y renal.' :
          t.dm || t.inm ? 'Diabetes/Inmunosupresión con síntomas agudos: valorar ecografía/TAC temprano para descartar colecciones o necrosis papilar.' :
          'Persistencia de fiebre o dolor sin mejoría en 48–72h: justificada la reevaluación por imágenes.');
      } else {
        imgAlert.style.display = 'none';
      }
    }
  }

  // Filtros interactivos
  document.querySelectorAll('[data-f]').forEach(function(b) {
    b.addEventListener('click', function() {
      document.querySelectorAll('[data-f]').forEach(function(x) { x.classList.remove('on'); });
      b.classList.add('on');
      currentFilter = b.dataset.f;
      refreshKpi();
    });
  });

  // Pestañas
  var tabHandler = NG.tabs(['Resumen y Triage', 'Pacientes y Cohorte', 'Revisión y Techos', 'Comunicación Clínica']);

  var btnMsgs = document.getElementById('msgs');
  if (btnMsgs) btnMsgs.onclick = function() { tabHandler.go(3); };
  var btnAddP = document.getElementById('addp');
  if (btnAddP) btnAddP.onclick = function() { tabHandler.go(1); };
  var btnOpenRev = document.getElementById('btn-open-review');
  if (btnOpenRev) btnOpenRev.onclick = function() { tabHandler.go(2); };
  var btnOpenChat = document.getElementById('btn-open-chat');
  if (btnOpenChat) btnOpenChat.onclick = function() { tabHandler.go(3); };

  // Renderizado dinámico de paneles secundarios
  NG.render = function(idx, el) {
    var P = getP();
    if (sel >= P.length) sel = 0;
    var curPatient = P[sel] || P[0];

    // ==========================================
    // PANEL 1: PACIENTES Y COHORTE SINTÉTICA (P01-P20)
    // ==========================================
    if (idx === 1) {
      el.innerHTML = '<div class="head">' +
        '<div>' +
          '<h2>Cohorte de Pacientes Sintéticos (P01 a P20)</h2>' +
          '<p class="mute" style="font-size:13px">Base de 20 casos ficticios validados bajo la Ley N.º 20.584 para pruebas del semáforo y triage.</p>' +
        '</div>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn o" id="btn-export-csv"><i data-i="dl"></i>Exportar Cohorte CSV</button>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:16px">' +
        '<div class="fg">' +
          '<div><label for="sq">Buscar por ID, nombre o condición</label><input id="sq" placeholder="Ej. P04, diabetes, embarazo, litiasis"></div>' +
          '<div>' +
            '<label for="so">Ordenar por</label>' +
            '<select id="so">' +
              '<option value="id">ID de Paciente (P01–P20)</option>' +
              '<option value="p">Prioridad Triage (Revisar ahora / Hoy)</option>' +
              '<option value="a">Adherencia al tratamiento</option>' +
              '<option value="c">Próximo control clínico</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="tw" style="margin-top:12px"><table id="pt-table"></table></div>' +
      '</div>' +
      '<div class="card" style="margin-top:20px">' +
        '<h3>Registrar un nuevo paciente clínico en el sistema</h3>' +
        '<div class="fg" style="margin-top:10px">' +
          '<div><label for="nn">Nombre completo *</label><input id="nn" placeholder="Ej. Marcela González"></div>' +
          '<div><label for="ne">Correo electrónico *</label><input id="ne" type="email" placeholder="marcela@email.com"></div>' +
          '<div><label for="nt">Teléfono</label><input id="nt" placeholder="+56 9 ..."></div>' +
          '<div><label for="nc">Próximo control</label><input id="nc" type="date"></div>' +
          '<div><label for="n6">Infecciones confirmadas (6 m)</label><input id="n6" type="number" min="0" value="0"></div>' +
          '<div><label for="n12">Infecciones confirmadas (12 m)</label><input id="n12" type="number" min="0" value="0"></div>' +
        '</div>' +
        '<div class="ck" style="margin-top:12px">' +
          '<label><input type="checkbox" id="nd"> Diabetes Mellitus</label>' +
          '<label><input type="checkbox" id="nl"> Litiasis renal</label>' +
          '<label><input type="checkbox" id="nem"> Embarazo actual</label>' +
          '<label><input type="checkbox" id="ner"> Enfermedad Renal Crónica</label>' +
          '<label><input type="checkbox" id="nin"> Inmunosupresión</label>' +
        '</div>' +
        '<button class="btn" id="btn-save-new-pt" style="margin-top:16px"><i data-i="userplus"></i>Guardar en la cohorte local</button>' +
      '</div>';

      var table = el.querySelector('#pt-table');
      function drawPatientsList() {
        var q = el.querySelector('#sq').value.toLowerCase().trim();
        var o = el.querySelector('#so').value;
        var list = P.filter(function(x) {
          return (x.id && x.id.toLowerCase().indexOf(q) > -1) ||
                 x.n.toLowerCase().indexOf(q) > -1 ||
                 (x.desc && x.desc.toLowerCase().indexOf(q) > -1) ||
                 (x.antecedentes && x.antecedentes.toLowerCase().indexOf(q) > -1);
        }).sort(function(a, b) {
          if (o === 'id') return (a.id || '').localeCompare(b.id || '');
          if (o === 'a') return a.ad - b.ad;
          if (o === 'c') return (a.ctl || '').localeCompare(b.ctl || '');
          var prioOrder = { 'r': 3, 'a': 2, '': 1 };
          return (prioOrder[calcPriority(b)[0]] || 0) - (prioOrder[calcPriority(a)[0]] || 0);
        });

        table.innerHTML = '<thead><tr><th>ID / Paciente</th><th>Recurrencias</th><th>Adherencia</th><th>Urocultivo</th><th>Control</th><th>Prioridad</th></tr></thead>' +
          '<tbody>' + (rows(list) || '<tr><td colspan="6" style="text-align:center;padding:14px" class="mute">Sin resultados</td></tr>') + '</tbody>';

        table.querySelectorAll('tr[data-idx]').forEach(function(tr) {
          tr.onclick = function() {
            sel = +tr.dataset.idx;
            tabHandler.go(0);
          };
        });
      }

      drawPatientsList();
      el.querySelector('#sq').oninput = drawPatientsList;
      el.querySelector('#so').onchange = drawPatientsList;

      // Exportar CSV
      el.querySelector('#btn-export-csv').onclick = function() {
        NG.csv('nefroguia-cohorte-p01-p20.csv', [
          ['ID', 'Nombre', 'Edad', 'Sexo', 'Nacionalidad', 'Antecedentes', 'Confirmadas_6m', 'Confirmadas_12m', 'Temperatura_C', 'Dolor_EVA', 'Vomitos', 'Vasos_al_dia', 'Adherencia_Pct', 'Urocultivo_Estado', 'Germen', 'Prioridad_Triage', 'Descripcion_Caso', 'Tratamiento_Prescrito']
        ].concat(P.map(function(x) {
          return [
            x.id || '', x.n, x.edad || '', x.sex || '', x.nacionalidad || 'Chile', x.antecedentes || '',
            x.c6, x.c12, x.f, x.p, x.vom ? 'Sí' : 'No', x.vasos || x.v || 4, x.ad, x.cuEstado || x.cu || '',
            x.bacteria || 'Sin aislamiento', calcPriority(x)[1], x.desc || '', x.tr || ''
          ];
        })));
        NG.toast('Archivo CSV descargado correctamente con los 20 pacientes ficticios');
      };

      // Guardar nuevo paciente
      el.querySelector('#btn-save-new-pt').onclick = function() {
        var nom = el.querySelector('#nn').value.trim();
        var mail = el.querySelector('#ne').value.trim().toLowerCase();
        if (!nom) return NG.toast('Ingresa el nombre del paciente');
        if (!mail || !/^\S+@\S+\.\S+$/.test(mail)) return NG.toast('Ingresa un correo electrónico válido');

        var newPt = {
          id: 'P' + (P.length + 1),
          n: nom,
          email: mail,
          tel: el.querySelector('#nt').value.trim(),
          c6: +el.querySelector('#n6').value || 0,
          c12: +el.querySelector('#n12').value || 0,
          ad: 100,
          cuEstado: 'Solicitado: pendiente de toma',
          cu: 'Solicitado: pendiente de toma',
          f: 36.6,
          p: 0,
          ctl: el.querySelector('#nc').value || NG.today(),
          dm: el.querySelector('#nd').checked ? 1 : 0,
          lit: el.querySelector('#nl').checked ? 1 : 0,
          emb: el.querySelector('#nem').checked ? 1 : 0,
          er: el.querySelector('#ner').checked ? 1 : 0,
          inm: el.querySelector('#nin').checked ? 1 : 0,
          tr: 'En evaluación ambulatoria',
          hist: [0, 0, 0, 0, 0, 0, 0],
          waterCeiling: 8,
          nutriNotes: 'Meta hídrica de 8 vasos (2000 mL/día). Indicación de arándano rojo coadyuvante en caso de recurrencias.'
        };

        P.push(newPt);
        NG.savePts(P);

        var accs = NG.get('accounts', {});
        if (!accs[mail]) {
          accs[mail] = { name: nom, role: 'paciente', h: NG.hash('Paciente2026!') };
          NG.set('accounts', accs);
        }

        NG.toast('Paciente guardado en la cohorte');
        refreshKpi();
        NG.render(1, el);
      };
    }

    // ==========================================
    // PANEL 2: REVISIÓN CLÍNICA, TECHOS Y REPORTE
    // ==========================================
    if (idx === 2) {
      var x = curPatient;
      var isRec = (x.c6 >= 2 || x.c12 >= 3);
      var reqImage = (x.lit || x.dm || x.inm || (x.f >= 38.0 && x.p >= 6) || (isRec && x.f >= 38.0));

      el.innerHTML = '<div class="head">' +
        '<div>' +
          '<h2>Revisión Clínica y Techos Nutricionales</h2>' +
          '<p class="mute" style="font-size:13px">Evaluación de cultivo, prescripción de metas hídricas/nutricionales y generación de reporte clínico.</p>' +
        '</div>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn" id="btn-print-report"><i data-i="file"></i>Generar Reporte Oficial (PDF / Imprimir)</button>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:16px">' +
        '<div style="margin-bottom:12px">' +
          '<label for="ps" style="font-size:14px;font-weight:700">Seleccionar Paciente para Revisión</label>' +
          '<select id="ps" style="font-size:15px;padding:10px">' +
            P.map(function(p, j) {
              return '<option value="' + j + '"' + (j === sel ? ' selected' : '') + '>' + (p.id ? p.id + ' · ' : '') + NG.esc(p.n) + ' (' + (p.desc || p.email) + ')</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="grid">' +
          '<div class="row"><span>Prioridad Triage:</span><b>' + calcPriority(x)[1] + ' (' + NG.esc(why(x)) + ')</b></div>' +
          '<div class="row"><span>Criterio de Recurrencia:</span><b>' + (isRec ? '<span style="color:var(--red)">CUMPLE (≥2 en 6m o ≥3 en 12m)</span>' : 'No cumple criterio de recurrencia') + '</b></div>' +
          '<div class="row"><span>Estudio de Imagen (Eco/TAC):</span><b>' + (reqImage ? '<span style="color:var(--amb)">Recomendado valorar según protocolo</span>' : 'No indicado por protocolo') + '</b></div>' +
          '<div class="row"><span>Estado de Urocultivo:</span><b>' + NG.esc(x.cuEstado || x.cu || 'No solicitado') + '</b></div>' +
        '</div>' +
        (x.bacteria ? '<div class="row" style="margin-top:8px"><span>Microorganismo / Recuento:</span><b>' + NG.esc(x.bacteria) + ' (' + NG.esc(x.ufc || '>100,000 UFC/mL') + ')</b></div>' : '') +
        (x.antibiograma ? '<div class="row"><span>Antibiograma:</span><b>' + NG.esc(x.antibiograma) + '</b></div>' : '') +
      '</div>' +
      '<div class="card" style="margin-top:16px">' +
        '<h3>Prescripción de Techos Nutricionales y Metas Clínicas para ' + NG.esc(x.n) + '</h3>' +
        '<p class="mute" style="font-size:13px;margin:4px 0 14px">Registra metas o límites de líquidos totales, sodio, proteínas y carbohidratos (Pág. 11 del PDF).</p>' +
        '<div class="fg">' +
          '<div>' +
            '<label for="nutri-water">Meta de Ingesta Hídrica (vasos de 250 mL)</label>' +
            '<input id="nutri-water" type="number" min="4" max="20" value="' + (x.waterCeiling || 8) + '">' +
          '</div>' +
          '<div>' +
            '<label for="nutri-limit">Límite Máximo Hídrico si hay Restricción (mL/día)</label>' +
            '<input id="nutri-limit" type="number" placeholder="Ej. 1500 (vacío si no hay restricción)" value="' + (x.waterLimit || '') + '">' +
          '</div>' +
          '<div>' +
            '<label for="nutri-sodio">Límite de Sodio (mg/día)</label>' +
            '<input id="nutri-sodio" placeholder="Ej. <2000 mg/día" value="' + NG.esc(x.nutriSodio || '<2000 mg') + '">' +
          '</div>' +
        '</div>' +
        '<div class="fg" style="margin-top:8px">' +
          '<div>' +
            '<label for="nutri-pac">Coadyuvante Arándano Rojo (PAC 36 mg/día)</label>' +
            '<select id="nutri-pac">' +
              '<option value="1">Prescrito (Extracto estandarizado 36 mg/día en recurrencia)</option>' +
              '<option value="0">No indicado / sin recurrencia confirmada</option>' +
            '</select>' +
          '</div>' +
          '<div>' +
            '<label for="nutri-irri">Restricción de Irritantes Vesicales</label>' +
            '<select id="nutri-irri">' +
              '<option value="estricta">Estricta (Suspender café, picantes, alcohol)</option>' +
              '<option value="moderada">Moderada (Limitar a 1 café/día, no alcohol)</option>' +
              '<option value="ninguna">Sin restricciones específicas</option>' +
            '</select>' +
          '</div>' +
          '<div><label for="th-temp">Umbral Alerta Fiebre (°C ≥)</label><input id="th-temp" type="number" step="0.1" value="' + th.temp + '"></div>' +
        '</div>' +
        '<div style="margin-top:10px">' +
          '<label for="nutri-notes">Indicaciones Nutricionales y Clínicas Individualizadas</label>' +
          '<textarea id="nutri-notes" rows="3" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;font:inherit">' +
            NG.esc(x.nutriNotes || 'Meta hídrica de 8 vasos (2000 mL/día). Extracto de arándano rojo 36 mg PAC/día en ayunas.') +
          '</textarea>' +
        '</div>' +
        '<button class="btn" id="btn-save-nutri" style="margin-top:14px"><i data-i="save"></i>Guardar Prescripción y Techos</button>' +
      '</div>' +
      '<div id="report-modal-container"></div>';

      el.querySelector('#ps').onchange = function(e) {
        sel = +e.target.value;
        updateSelectedPatientUI();
        NG.render(2, el);
      };

      el.querySelector('#btn-save-nutri').onclick = function() {
        var wCeil = +el.querySelector('#nutri-water').value || 8;
        var wLimit = el.querySelector('#nutri-limit').value ? +el.querySelector('#nutri-limit').value : null;
        var nSodio = el.querySelector('#nutri-sodio').value.trim();
        var nNotes = el.querySelector('#nutri-notes').value.trim();

        th.temp = +el.querySelector('#th-temp').value || 38.0;
        NG.set('th', th);

        x.waterCeiling = wCeil;
        x.waterLimit = wLimit;
        x.nutriSodio = nSodio;
        x.nutriNotes = nNotes;
        NG.savePts(P);

        NG.toast('Prescripción y techos guardados con éxito');
        refreshKpi();
        NG.render(2, el);
      };

      // Generar Reporte Clínico Oficial
      el.querySelector('#btn-print-report').onclick = function() {
        var repContainer = document.getElementById('report-modal-container');
        if (!repContainer) return;
        var nowStr = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

        repContainer.innerHTML = '<div class="card report-card" style="margin-top:24px;border:2px solid var(--hl);padding:28px;background:var(--card)">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid var(--line);padding-bottom:16px;margin-bottom:16px">' +
            '<div>' +
              '<h2 style="font-size:22px;color:var(--hl);margin-bottom:4px">INFORME CLÍNICO DE SEGUIMIENTO Y TRIAGE</h2>' +
              '<span class="mute" style="font-size:12px">Proyecto NefroGuía · Experiencia COIL Duoc UC (Chile) & Tecnológico de Monterrey (México)</span>' +
            '</div>' +
            '<div style="text-align:right;font-size:12px">' +
              '<b>Folio:</b> NG-' + (x.id || 'P01') + '-' + Math.floor(1000 + Math.random() * 9000) + '<br>' +
              '<b>Fecha de Emisión:</b> ' + nowStr +
            '</div>' +
          '</div>' +
          '<div class="grid" style="margin-bottom:16px">' +
            '<div><b>Paciente:</b> ' + NG.esc(x.n) + '<br><b>Edad/Sexo:</b> ' + (x.edad || '—') + ' años · ' + (x.sex || 'F') + '<br><b>Nacionalidad:</b> ' + (x.nacionalidad || 'Chile') + '</div>' +
            '<div><b>Próximo Control:</b> ' + (x.ctl || 'No programado') + '<br><b>Estado Urocultivo:</b> ' + NG.esc(x.cuEstado || x.cu || 'No solicitado') + '<br><b>Tratamiento:</b> ' + NG.esc(x.tr || 'En seguimiento') + '</div>' +
          '</div>' +
          '<div style="background:var(--neu);padding:14px;border-radius:10px;margin-bottom:16px">' +
            '<h4 style="margin:0 0 6px">EVALUACIÓN DE TRIAGE Y RECURRENCIAS</h4>' +
            '<div><b>Clasificación de Prioridad:</b> ' + calcPriority(x)[1] + '</div>' +
            '<div><b>Criterio de Recurrencia:</b> ' + (isRec ? 'POSITIVO (≥2 infecciones en 6m o ≥3 en 12m) - Seguimiento prioritario' : 'Negativo') + ' (' + x.c6 + ' en 6m / ' + x.c12 + ' en 12m)</div>' +
            '<div><b>Factores de Riesgo / Antecedentes:</b> ' + NG.esc(why(x)) + '</div>' +
          '</div>' +
          (x.bacteria ? '<div style="margin-bottom:16px"><b>Informe microbiológico:</b> Aislamiento de <i>' + NG.esc(x.bacteria) + '</i> (' + NG.esc(x.ufc || '>100,000 UFC/mL') + '). Antibiograma: ' + NG.esc(x.antibiograma || 'Sensible según cultivo.') + '</div>' : '') +
          '<div style="background:var(--mint);padding:14px;border-radius:10px;margin-bottom:20px;border:1px solid var(--line)">' +
            '<h4 style="margin:0 0 6px;color:var(--hl)">PRESCRIPCIÓN DE TECHOS NUTRICIONALES Y RECOMENDACIONES</h4>' +
            '<div><b>Meta hídrica diaria:</b> ' + (x.waterCeiling || 8) + ' vasos de 250 mL (≈' + ((x.waterCeiling || 8) * 250) + ' mL/día).' + (x.waterLimit ? ' <b>Límite máximo por restricción: ' + x.waterLimit + ' mL/día.</b>' : '') + '</div>' +
            '<div><b>Sodio prescrito:</b> ' + NG.esc(x.nutriSodio || '<2000 mg/día') + ' · <b>Coadyuvante arándano:</b> Extracto estandarizado 36 mg PAC/día en recurrencia.</div>' +
            '<div><b>Indicaciones de autocuidado:</b> ' + NG.esc(x.nutriNotes || 'Seguir indicaciones de higiene y no postergar la micción.') + '</div>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:32px;padding-top:16px;border-top:1px dashed var(--line)">' +
            '<div>' +
              '<small class="mute" style="display:block;max-width:440px;line-height:1.4">' +
                'Este informe utiliza datos sintéticos estructurados para la experiencia COIL en conformidad con la Ley N.º 20.584 y Ley N.º 19.628 de Chile. No sustituye la atención presencial de urgencias.' +
              '</small>' +
            '</div>' +
            '<div style="text-align:center">' +
              '<div style="border-bottom:1px solid var(--ink);width:200px;margin-bottom:4px"></div>' +
              '<b>' + NG.esc(docName) + '</b><br>' +
              '<small class="mute">' + NG.esc(user.specialty || 'Equipo Médico Colaborador COIL') + '</small>' +
            '</div>' +
          '</div>' +
          '<div style="margin-top:18px;text-align:right">' +
            '<button class="btn" onclick="window.print()"><i data-i="file"></i>Imprimir / Guardar en PDF</button>' +
          '</div>' +
        '</div>';

        repContainer.scrollIntoView({ behavior: 'smooth' });
        NG.toast('Informe generado');
      };
    }

    // ==========================================
    // PANEL 3: COMUNICACIÓN Y MENSAJERÍA SEGURA
    // ==========================================
    if (idx === 3) {
      var x = curPatient;
      var pEmail = (x.email || 'ana@email.com').toLowerCase();
      var chatList = NG.getChat(pEmail);

      el.innerHTML = '<div class="head">' +
        '<div>' +
          '<h2>Canal de Comunicación y Mensajería Segura</h2>' +
          '<p class="mute" style="font-size:13px">Envío de orientaciones y micro-nudges preventivos validados (Pág. 16 del PDF).</p>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:16px">' +
        '<div style="margin-bottom:14px">' +
          '<label for="mp" style="font-weight:700">Seleccionar Paciente Destinatario</label>' +
          '<select id="mp" style="padding:10px;font-size:15px">' +
            P.map(function(p, j) {
              return '<option value="' + j + '"' + (j === sel ? ' selected' : '') + '>' + (p.id ? p.id + ' · ' : '') + NG.esc(p.n) + ' (' + (p.desc || p.email) + ')</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="chat" id="doc-chat-box" style="margin-top:10px;max-height:300px;overflow-y:auto">' +
          (chatList.length ? chatList.map(function(m) {
            var isDoc = m.role === 'clinico';
            return '<div class="msg ' + (isDoc ? 'me' : '') + '">' +
              '<div style="font-size:11px;font-weight:600;opacity:.8;margin-bottom:2px">' + NG.esc(m.name) + ' (' + (isDoc ? 'Profesional' : 'Paciente') + ')</div>' +
              '<div>' + NG.esc(m.text) + '</div>' +
              '<small>' + (m.time || '') + ' · ' + (m.date || '') + '</small>' +
            '</div>';
          }).join('') : '<p class="mute">No hay mensajes registrados con esta paciente.</p>') +
        '</div>' +
        '<div class="qr" style="margin-top:12px">' +
          [
            'Tu cultivo está disponible; contacta al profesional',
            'Si no mejoras en 48–72 h o empeoras, solicita reevaluación',
            'No cambies ni suspendas el antibiótico sin indicación',
            'Si no toleras líquidos o medicamentos por vómitos, acude a valoración urgente',
            'Solicito que asistas a control presencial en policlínico',
            'Recuerda registrar tu chequeo diario e hidratación en mL',
            'Evita enviar fotos que sean identificables por canales de comunicación inseguros'
          ].map(function(q) {
            return '<button type="button" data-q="' + q + '">' + q + '</button>';
          }).join('') +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:12px">' +
          '<input id="doc-msg-input" placeholder="Escribe un mensaje clínico o indicación..." style="margin:0">' +
          '<button class="btn" id="btn-doc-send"><i data-i="arrow"></i>Enviar mensaje</button>' +
        '</div>' +
      '</div>';

      el.querySelector('#mp').onchange = function(e) {
        sel = +e.target.value;
        updateSelectedPatientUI();
        NG.render(3, el);
      };

      var inp = el.querySelector('#doc-msg-input');
      el.querySelectorAll('[data-q]').forEach(function(b) {
        b.onclick = function() {
          inp.value = b.dataset.q;
        };
      });

      el.querySelector('#btn-doc-send').onclick = function() {
        var text = inp.value.trim();
        if (!text) return;
        NG.sendChat(pEmail, 'clinico', docName, text);
        inp.value = '';
        NG.render(3, el);
      };

      if (inp) {
        inp.onkeydown = function(e) {
          if (e.key === 'Enter') el.querySelector('#btn-doc-send').click();
        };
      }
    }
  };

  refreshKpi();
})();
