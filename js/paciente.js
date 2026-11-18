/* Vista paciente: Semáforo validado por el equipo médico, Tendencias de Hidratación y Síntomas, Chequeo Diario, Controles y Educación */
(function() {
  var NG = window.NG;
  var U = NG.get('user', { email: 'ana@email.com', name: 'Ana Martínez (P01)' });
  var userEmail = (U.email || 'ana@email.com').toLowerCase();
  var K = function(k) { return k + ':' + userEmail; };

  var log = NG.get(K('log'), []);
  var water = NG.get(K('water'), {});
  var appts = NG.get(K('appts'), [
    { d: '2026-11-20', t: 'Urocultivo de control y evaluación médica' },
    { d: '2026-12-05', t: 'Control presencial de función renal y prevención' }
  ]);

  function getPatientRecord() {
    var pts = NG.getPts();
    for (var i = 0; i < pts.length; i++) {
      if (pts[i].email && pts[i].email.toLowerCase() === userEmail) {
        return pts[i];
      }
    }
    var baseline = {
      id: 'P01',
      n: U.name || 'Ana Martínez (P01)',
      email: userEmail,
      c6: 2,
      c12: 2,
      ad: 93,
      cu: 'E. coli sensible a Ciprofloxacino; pendiente de revisión',
      f: 38.2,
      p: 6,
      dolorLoc: 'Flanco derecho',
      escalofrios: 1,
      vom: 0,
      vasos: 4,
      ml: 1000,
      ctl: '2026-11-20',
      dm: 0, hta: 0, ob: 0, lit: 0, inm: 0, inst: 0, emb: 0, son: 0, er: 0,
      tr: 'Ciprofloxacino 500 mg c/12h',
      waterCeiling: 8,
      waterLimit: null,
      nutriNotes: 'Meta individual: 8 vasos (2000 mL/día). Extracto de arándano rojo 36 mg PAC/día como apoyo coadyuvante en recurrencia.',
      hist: [3, 4, 5, 6, 7, 6, 6]
    };
    pts.push(baseline);
    NG.savePts(pts);
    return baseline;
  }

  var ptRecord = getPatientRecord();
  var waterGoal = ptRecord.waterCeiling || 8;
  var hasWaterRestriction = (ptRecord.waterLimit != null) || (ptRecord.er && ptRecord.estadioERC && ptRecord.estadioERC.indexOf('3') > -1);

  function dl(d) {
    if (!d) return '';
    return new Date(d + 'T00:00').toLocaleDateString('es-CL', { weekday: 'narrow' }).toUpperCase();
  }

  function last() {
    return log[log.length - 1] || null;
  }

  // Evaluación del Semáforo según las Reglas Validadas por el Equipo Médico (Pág. 6 y 10 del PDF)
  function state() {
    var e = last();
    if (!e) return 'insufficient'; // Si faltan datos esenciales -> Información insuficiente

    // 1. Urgencias inmediatas (911 / 131)
    if (e.confusion || e.desmayo || e.disnea || (e.vom && e.inabilityToDrink)) {
      return 'urgencia';
    }

    // 2. Rojo («Revisión profesional hoy»)
    // Valoración presencial el mismo día ante fiebre >=38°C, escalofríos intensos con temblor,
    // dolor nuevo o creciente en flanco o región lumbar, dolor intenso >=7/10, o vómitos persistentes.
    // (Las náuseas aisladas NO deben activar rojo automáticamente).
    if (e.t >= 38.0 || e.escalofrios || (e.p >= 7) || (e.p >= 4 && (e.dolorLoc === 'Flanco' || e.dolorLoc === 'Lumbar')) || (e.vom && e.vomPersistente) || (ptRecord.emb && (e.t >= 37.8 || e.p >= 4))) {
      return 'r';
    }

    // 3. Amarillo («Vigilar y registrar»)
    // Síntomas urinarios sin criterios rojos, temperatura de 37.5–37.9 °C o dolor moderado 4–6/10.
    // (Beber menos de 6 vasos NO debe activar una alerta clínica por sí solo).
    if (e.t >= 37.5 || e.p >= 4 || e.sintomasBajos) {
      return 'a';
    }

    // 4. Verde («Sin señales de alarma registradas»)
    return 'g';
  }

  // Componente visual del Semáforo
  function lamp() {
    var s = state();
    var e = last();
    var desc = '';
    var badgeClass = '';
    var badgeText = '';

    if (s === 'urgencia') {
      badgeClass = 'r';
      badgeText = 'Urgencias inmediatas (Llamar al 911 / 131)';
      desc = '<b style="color:var(--red)">Atención de emergencia inmediata:</b> Presencia de signos de alarma de gravedad sistémica (confusión/somnolencia nueva, dificultad respiratoria, desmayo o vómitos continuos con incapacidad de retener líquidos). No esperes una consulta ambulatoria.';
    } else if (s === 'r') {
      badgeClass = 'r';
      badgeText = 'Revisión profesional hoy';
      desc = '<b>Valoración presencial el mismo día requerida:</b> Tus registros muestran signos de compromiso renal o sistémico (temperatura ' + (e ? e.t : '≥38') + ' °C, dolor en flanco/lumbar ' + (e ? e.p : '') + '/10, escalofríos con temblor o vómitos). Esto no confirma diagnóstico ni curación; contacta hoy a tu equipo de salud.';
    } else if (s === 'a') {
      badgeClass = 'a';
      badgeText = 'Vigilar y registrar';
      desc = '<b>Vigilar y registrar:</b> Síntomas urinarios o febrícula (37.5–37.9 °C) / molestia moderada (dolor 4–6/10) sin criterios de gravedad inmediata. Registra tu evolución y contacta al equipo tratante si no hay mejoría en 48–72 horas.';
    } else if (s === 'g') {
      badgeClass = '';
      badgeText = 'Sin señales de alarma registradas';
      desc = '<b>Sin señales de alarma registradas:</b> No se registran criterios de alarma en tu último chequeo. Este nivel permite continuar tu seguimiento y tratamiento prescrito, pero <i>no confirma curación ni descarta infección activa</i> ante reaparición de síntomas.';
    } else {
      badgeClass = 'a';
      badgeText = 'Información insuficiente';
      desc = '<b>Información insuficiente:</b> Aún no has completado tu chequeo clínico del día. Para clasificar el semáforo y orientar a tu equipo tratante, completa los datos esenciales de hoy.';
    }

    // Alerta glucémica paralela en diabetes (Pág. 10)
    var metabolicAlert = '';
    if (e && e.g != null && e.g !== '' && (ptRecord.dm || e.g > 180)) {
      var gVal = +e.g;
      if (gVal < 70) {
        metabolicAlert = '<div class="nudge r" style="margin-top:8px"><b>Alerta metabólica (Hipoglucemia ' + gVal + ' mg/dL):</b> Sigue de inmediato el plan de hipoglucemia de tu equipo. Si presentas confusión o dificultad para tragar, requiere urgencias.</div>';
      } else if (gVal >= 300 || (gVal >= 250 && e.vom)) {
        metabolicAlert = '<div class="nudge r" style="margin-top:8px"><b>Alerta metabólica urgente (Glucosa ' + gVal + ' mg/dL):</b> Hiperglucemia marcada con síntomas. Requiere valoración médica urgente para descartar cetoacidosis / descompensación.</div>';
      } else if (gVal >= 250) {
        metabolicAlert = '<div class="nudge a" style="margin-top:8px"><b>Alerta metabólica (Glucosa ' + gVal + ' mg/dL en enfermedad):</b> Activa el plan individual de días de enfermedad indicado por tu médico y monitorea cetonas si persiste.</div>';
      }
    }

    return '<div class="card sem" style="border-left:5px solid ' + (s === 'urgencia' || s === 'r' ? 'var(--red)' : s === 'a' || s === 'insufficient' ? 'var(--amb)' : 'var(--acc)') + '">' +
      '<div class="lamp">' +
        '<i class="g' + (s === 'g' ? ' on' : '') + '"></i>' +
        '<i class="a' + (s === 'a' || s === 'insufficient' ? ' on' : '') + '"></i>' +
        '<i class="r' + (s === 'r' || s === 'urgencia' ? ' on' : '') + '"></i>' +
      '</div>' +
      '<div style="flex:1">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">' +
          '<h3 style="font-size:17px;font-weight:600">Semáforo de Seguimiento Clínico</h3>' +
          '<span class="pill ' + badgeClass + '">' + badgeText + '</span>' +
        '</div>' +
        '<p class="mute" style="margin-top:6px;font-size:13px;line-height:1.4">' + desc + '</p>' +
        metabolicAlert +
      '</div>' +
    '</div>';
  }

  // Sección corregida: «Tendencias de hidratación y síntomas» (Pág. 11 del PDF)
  function tendenciasHidratacion() {
    var dToday = NG.today();
    var d1 = new Date(); d1.setDate(d1.getDate() - 1); var d1Str = d1.toISOString().slice(0, 10);
    var d2 = new Date(); d2.setDate(d2.getDate() - 2); var d2Str = d2.toISOString().slice(0, 10);

    var w0 = water[dToday] != null ? water[dToday] : 0;
    var w1 = water[d1Str] != null ? water[d1Str] : (w0 > 2 ? w0 - 1 : 4);
    var w2 = water[d2Str] != null ? water[d2Str] : (w0 > 3 ? w0 - 2 : 3);

    var e = last();
    var ml0 = w0 * 250;
    var ml1 = w1 * 250;
    var ml2 = w2 * 250;

    var restrictionNotice = '';
    if (hasWaterRestriction) {
      restrictionNotice = '<div class="nudge a" style="margin-top:10px">' +
        '<b>Restricción de líquidos individualizada:</b> Tienes una indicación clínica de balance de líquidos ' +
        (ptRecord.waterLimit ? '(Límite prescrito: ' + ptRecord.waterLimit + ' mL/día)' : 'por tu condición renal/cardíaca') +
        '. <b>No aumentes líquidos automáticamente.</b> Registra tu volumen consumido y sigue estrictamente el plan prescrito por tu médico tratante.' +
        '</div>';
    } else {
      restrictionNotice = '<div class="nudge" style="margin-top:10px">' +
        '<b>Registro descriptivo de tendencias:</b> La plataforma registra tu consumo de líquidos en vasos de referencia (1 vaso = 250 mL) y su correspondencia con tus síntomas reportados. ' +
        '<i>Nota clínica: No hay evidencia que valide un desfase causal directo de 24–48 horas; la hidratación es una medida de apoyo y no sustituye el tratamiento antibiótico ni la evaluación médica de la pielonefritis.</i>' +
        '</div>';
    }

    return '<div class="card">' +
      '<div class="head">' +
        '<div>' +
          '<h3>Tendencias de Hidratación y Síntomas</h3>' +
          '<small class="mute">Registro descriptivo de ingesta hídrica (1 vaso de referencia = 250 mL) y evolución de molestias.</small>' +
        '</div>' +
        '<span class="pill"><i data-i="clock"></i>Registro descriptivo</span>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:14px">' +
        '<div style="background:var(--neu);padding:12px;border-radius:12px;text-align:center">' +
          '<span class="mute" style="font-size:11px;font-weight:600;text-transform:uppercase">Hace 48 horas (' + d2Str + ')</span>' +
          '<b style="display:block;font-size:22px;color:var(--hl);margin:4px 0">' + w2 + ' vasos</b>' +
          '<small class="mute">≈ ' + ml2 + ' mL (' + (ml2 / 1000).toFixed(2) + ' L)</small>' +
        '</div>' +
        '<div style="background:var(--neu);padding:12px;border-radius:12px;text-align:center">' +
          '<span class="mute" style="font-size:11px;font-weight:600;text-transform:uppercase">Hace 24 horas (' + d1Str + ')</span>' +
          '<b style="display:block;font-size:22px;color:var(--hl);margin:4px 0">' + w1 + ' vasos</b>' +
          '<small class="mute">≈ ' + ml1 + ' mL (' + (ml1 / 1000).toFixed(2) + ' L)</small>' +
        '</div>' +
        '<div style="background:var(--mint);padding:12px;border-radius:12px;text-align:center;border:1.5px solid var(--acc)">' +
          '<span style="font-size:11px;font-weight:700;color:var(--acc);text-transform:uppercase">Hoy (' + dToday + ')</span>' +
          '<b style="display:block;font-size:22px;color:var(--ink);margin:4px 0">' + w0 + ' vasos</b>' +
          '<small style="color:var(--mute)">≈ ' + ml0 + ' mL (' + (ml0 / 1000).toFixed(2) + ' L) · Dolor: ' + (e ? e.p : '0') + '/10</small>' +
        '</div>' +
      '</div>' +
      restrictionNotice +
    '</div>';
  }

  // Micro-Nudges y Consejos Automáticos Corregidos (Pág. 16 del PDF)
  function nudges() {
    var e = last(), w = water[NG.today()] || 0, n = [];
    var s = state();

    if (s === 'urgencia') {
      n.push(['r', '<b>Urgencias médicas inmediatas:</b> Tus respuestas indican que necesitas valoración profesional de urgencias hoy. Esto no es un diagnóstico. Si presentas confusión nueva, desmayo, dificultad respiratoria o empeoras rápido, acude a urgencias o llama al 911 / 131.']);
    } else if (s === 'r') {
      n.push(['r', '<b>Valoración médica prioritaria:</b> Tus respuestas indican que necesitas valoración profesional presencial hoy (fiebre ≥38 °C, dolor en flanco o vómitos). Si tienes intolerancia oral a líquidos o medicamentos, acude a valoración sin demora.']);
    }

    if (hasWaterRestriction) {
      n.push(['a', '<b>Hidratación individualizada:</b> Registra tu volumen en mL y sigue la meta prescrita por tu equipo médico. Si tienes restricción de líquidos por condición renal o cardíaca, no la modifiques.']);
    } else {
      n.push(['', '<b>Hidratación de apoyo:</b> Llevas ' + w + ' vasos (≈' + (w * 250) + ' mL). Sigue la meta individual de tu equipo tratante (' + waterGoal + ' vasos = ' + (waterGoal * 250) + ' mL/día).']);
    }

    if (e && !e.ok) {
      n.push(['a', '<b>Adherencia estricta:</b> No suspendas ni cambies antibióticos sin indicación médica, ni uses sobrantes de tratamientos previos. Si tienes efectos adversos, contacta a tu equipo.']);
    }

    n.push(['', '<b>Hábito urogenital:</b> No evites orinar cuando tengas ganas de hacerlo. Orinar después de relaciones sexuales es una medida de bajo riesgo, aunque su eficacia preventiva tiene evidencia limitada.']);

    if (ptRecord.c6 >= 2 || ptRecord.c12 >= 3) {
      n.push(['', '<b>Apoyo en recurrencia:</b> La evidencia científica apoya el uso de extractos de arándano rojo estandarizado (36 mg PAC/día) para reducir recurrencias sintomáticas en mujeres; no trata una infección aguda activa.']);
    }

    return n.map(function(x) {
      return '<div class="nudge ' + x[0] + '">' + x[1] + '</div>';
    }).join('');
  }

  // Renderizado del Panel 0 (Hoy)
  function renderHoy() {
    var p0 = document.querySelector('[data-panel="0"]');
    var h = document.getElementById('hy');
    var w = water[NG.today()] || 0;
    var mlTotal = w * 250;
    var e = last();
    var s = state();

    // Banner de emergencia si es 'r' o 'urgencia'
    var emergencyBanner = document.getElementById('emergency-banner');
    if (emergencyBanner) {
      if (s === 'urgencia' || s === 'r') {
        emergencyBanner.hidden = false;
        var title = document.getElementById('emergency-title');
        var desc = document.getElementById('emergency-desc');
        if (s === 'urgencia') {
          title.textContent = 'URGENCIA INMEDIATA: Requiere atención médica de emergencia (Llamar al 911 / 131)';
          desc.textContent = 'Presencia de signos de alarma de gravedad (confusión nueva, dificultad respiratoria, desmayo o incapacidad para beber líquidos). Acude de inmediato al servicio de urgencias.';
        } else {
          title.textContent = 'Alerta Clínica: Se requiere valoración médica presencial hoy';
          desc.textContent = 'Tus registros autorreportados muestran fiebre ≥38 °C, dolor en flanco o vómitos. Esto no es un diagnóstico. Contacta hoy a tu equipo de salud tratante.';
        }
      } else {
        emergencyBanner.hidden = true;
      }
    }

    // Tarjeta de hidratación con convención: 1 vaso = 250 mL
    var pctHydra = Math.min(100, Math.round(w / waterGoal * 100));
    var hydraCard = '<div class="card">' +
      '<div class="head">' +
        '<div>' +
          '<h3>Ingesta de líquidos de hoy</h3>' +
          '<small class="mute">Convención de la plataforma: 1 vaso de referencia = 250 mL. Meta: ' + waterGoal + ' vasos (' + (waterGoal * 250) + ' mL · ' + (waterGoal * 0.25).toFixed(1) + ' L)</small>' +
        '</div>' +
        '<span class="pill ' + (w >= waterGoal ? '' : 'a') + '">' + pctHydra + '% de meta</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;justify-content:center;gap:18px;margin:18px 0">' +
        '<button class="btn o" id="wm" aria-label="Quitar un vaso" style="width:44px;height:44px;border-radius:50%;font-size:22px;padding:0">−</button>' +
        '<div style="text-align:center">' +
          '<b style="font-size:36px;color:var(--hl);display:block;line-height:1">' + w + ' vasos</b>' +
          '<span class="mute" style="font-size:13px">≈ ' + mlTotal + ' mL (' + (mlTotal / 1000).toFixed(2) + ' Litros)</span>' +
        '</div>' +
        '<button class="btn" id="wp" aria-label="Agregar un vaso" style="width:44px;height:44px;border-radius:50%;font-size:22px;padding:0">+</button>' +
      '</div>' +
      '<div class="pws" style="height:10px;margin-bottom:8px">' +
        '<i style="width:' + pctHydra + '%;background:' + (w >= waterGoal ? 'var(--acc)' : 'var(--hl)') + '"></i>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--mute)">' +
        '<span>0 mL</span>' +
        '<span>Meta individual: ' + (waterGoal * 250) + ' mL</span>' +
      '</div>' +
    '</div>';

    var tipsCard = '<div class="card">' +
      '<h3>Micro-Nudges y Consejos Preventivos Validados</h3>' +
      '<div style="margin-top:10px">' + nudges() + '</div>' +
    '</div>';

    h.innerHTML = lamp() +
      '<div class="two">' + hydraCard + tipsCard + '</div>' +
      tendenciasHidratacion();

    // Eventos de stepper de agua
    var wm = h.querySelector('#wm');
    var wp = h.querySelector('#wp');
    if (wm) wm.onclick = function() {
      water[NG.today()] = Math.max(0, w - 1);
      NG.set(K('water'), water);
      renderHoy();
    };
    if (wp) wp.onclick = function() {
      water[NG.today()] = w + 1;
      NG.set(K('water'), water);
      renderHoy();
    };

    // Actualizar KPIs de cabecera
    var todayLogs = log.filter(function(x) { return x.d === NG.today(); });
    var l7 = log.slice(-7);
    var nextAppt = appts.filter(function(a) { return a.d >= NG.today(); }).sort(function(a, b) { return a.d < b.d ? -1 : 1; })[0];

    var elChequeoCount = document.getElementById('kpi-chequeo-count');
    var elChequeoTime = document.getElementById('kpi-chequeo-time');
    if (elChequeoCount) elChequeoCount.textContent = todayLogs.length + (todayLogs.length === 1 ? ' chequeo' : ' chequeos');
    if (elChequeoTime) elChequeoTime.textContent = todayLogs.length ? 'Último: ' + todayLogs[todayLogs.length - 1].h : 'Pendiente hoy';

    var elAdh = document.getElementById('kpi-adherencia-val');
    if (elAdh) elAdh.textContent = l7.length ? Math.round(l7.reduce(function(acc, x) { return acc + x.ok; }, 0) / l7.length * 100) + '%' : '100%';

    var elControlDate = document.getElementById('kpi-control-date');
    var elControlDesc = document.getElementById('kpi-control-desc');
    if (elControlDate) elControlDate.textContent = nextAppt ? new Date(nextAppt.d + 'T00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) : '—';
    if (elControlDesc) elControlDesc.textContent = nextAppt ? nextAppt.t : 'Sin citas agendadas';

    var elHidraVal = document.getElementById('kpi-hidra-val');
    var elHidraMeta = document.getElementById('kpi-hidra-meta');
    if (elHidraVal) elHidraVal.textContent = w + ' vasos (' + mlTotal + ' mL)';
    if (elHidraMeta) elHidraMeta.textContent = 'Meta: ' + (waterGoal * 250) + ' mL/día';

    // Píldora de estado de chequeo
    var stPill = document.getElementById('st-pill');
    if (stPill) {
      if (!todayLogs.length) {
        stPill.className = 'pill a';
        stPill.textContent = 'Información insuficiente';
      } else if (s === 'r' || s === 'urgencia') {
        stPill.className = 'pill r';
        stPill.textContent = 'Alerta activa hoy';
      } else if (s === 'a') {
        stPill.className = 'pill a';
        stPill.textContent = 'Vigilar evolución';
      } else {
        stPill.className = 'pill';
        stPill.textContent = 'Sin señales de alarma';
      }
    }

    // Lista resumen del chequeo diario en la tarjeta inferior
    var summaryBox = document.getElementById('today-summary-list');
    if (summaryBox) {
      if (e) {
        summaryBox.innerHTML = [
          ['Temperatura corporal', e.t + ' °C', e.t >= 38.0],
          ['Dolor en flanco/lumbar (EVA)', e.p + ' / 10 (' + (e.dolorLoc || 'Flanco') + ')', e.p >= 7],
          ['Escalofríos intensos con temblor', e.escalofrios ? 'Sí, presentes' : 'No', e.escalofrios],
          ['Vómitos o intolerancia oral', e.vom ? (e.inabilityToDrink ? 'Vómitos persistentes sin retención' : 'Vómitos reportados') : 'No presenta', e.vom],
          ['Tratamiento antibiótico', e.ok ? 'Tomado según indicación' : 'Dosis omitida o suspendida', !e.ok]
        ].concat(e.g ? [['Glucemia capilar', e.g + ' mg/dL', e.g >= 250 || e.g < 70]] : []).map(function(item) {
          return '<div class="row' + (item[2] ? ' w' : '') + '">' +
            '<span class="rl"><b>' + item[0] + '</b></span>' +
            '<span>' + NG.esc(item[1]) + '</span>' +
          '</div>';
        }).join('');
      } else {
        summaryBox.innerHTML = '<p class="mute" style="padding:10px 0">Aún no completas tu chequeo de hoy. Tarda menos de 2 minutos.</p>';
      }
    }

    // Gráfico de dolor rápido
    var painChartQuick = document.getElementById('pain-chart-quick');
    if (painChartQuick) {
      var last7 = log.slice(-7);
      if (last7.length) {
        painChartQuick.innerHTML = NG.bars(last7.map(function(x) { return x.p * 10; }), last7.map(function(x) { return dl(x.d); }));
      } else {
        painChartQuick.innerHTML = '<p class="mute" style="margin:auto;font-size:12px">Sin registros recientes de dolor</p>';
      }
    }

    // Indicaciones nutricionales médicas
    var docNotes = document.getElementById('doc-nutri-notes');
    if (docNotes) {
      docNotes.textContent = ptRecord.nutriNotes || 'Meta hídrica de 8 vasos diarios (2.0 L). Coadyuvante de arándano rojo estandarizado (36 mg PAC/día).';
    }
  }

  // Configuración de pestañas
  var tabHandler = NG.tabs(['Hoy', 'Evolución y Chequeo', 'Historial Clínico', 'Controles', 'Educación y Hábitos', 'Resumen y Chat']);

  var btnQuick = document.getElementById('btn-quick-check');
  if (btnQuick) btnQuick.onclick = function() { tabHandler.go(1); };
  var btnGoSum = document.getElementById('btn-go-summary');
  if (btnGoSum) btnGoSum.onclick = function() { tabHandler.go(5); };
  var btnGoChat = document.getElementById('btn-go-chat');
  if (btnGoChat) btnGoChat.onclick = function() { tabHandler.go(5); };

  // Renderizado de paneles
  NG.render = function(idx, el) {
    ptRecord = getPatientRecord();
    waterGoal = ptRecord.waterCeiling || 8;

    // ==========================================
    // PANEL 1: EVOLUCIÓN Y CHEQUEO DIARIO AMPLIADO
    // ==========================================
    if (idx === 1) {
      var wToday = water[NG.today()] || 0;
      el.innerHTML = '<div class="head">' +
        '<div>' +
          '<h2>Evolución y Chequeo Diario</h2>' +
          '<p class="mute" style="font-size:13px">Registra tus parámetros para evaluar la respuesta clínica y prevenir complicaciones.</p>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:16px">' +
        '<h3>Registrar chequeo del día</h3>' +
        '<div class="fg" style="margin-top:10px">' +
          '<div><label for="ft">Temperatura corporal (°C) *</label><input id="ft" type="number" step="0.1" min="34" max="42" value="36.6"></div>' +
          '<div><label for="fp">Dolor lumbar/flanco (EVA 0–10) *</label><input id="fp" type="number" min="0" max="10" value="0"></div>' +
          '<div>' +
            '<label for="fpl">Localización del dolor</label>' +
            '<select id="fpl">' +
              '<option>Flanco derecho</option>' +
              '<option>Flanco izquierdo</option>' +
              '<option>Región lumbar bilateral</option>' +
              '<option>Dolor pélvico / suprapúbico</option>' +
              '<option>Sin dolor</option>' +
            '</select>' +
          '</div>' +
          '<div><label for="fv">Líquidos consumidos hoy (Vasos de 250 mL) *</label><input id="fv" type="number" min="0" max="30" value="' + wToday + '"></div>' +
          '<div><label for="fdiu">Volumen aproximado de orina (mL o micciones)</label><input id="fdiu" placeholder="Ej. 1200 mL o 5 veces"></div>' +
          '<div><label for="fg">Glucemia mg/dL (si tienes diabetes)</label><input id="fg" type="number" min="0" placeholder="Ej. 110"></div>' +
        '</div>' +
        '<div class="ck" style="margin-top:10px">' +
          '<label><input type="checkbox" id="fesc"> Escalofríos intensos con temblor</label>' +
          '<label><input type="checkbox" id="fconf"> Confusión, somnolencia o mareo intenso</label>' +
          '<label><input type="checkbox" id="fvo"> Náuseas o vómitos</label>' +
          '<label><input type="checkbox" id="finab"> Incapacidad para retener líquidos por vómitos</label>' +
          '<label><input type="checkbox" id="fok" checked> Tomé mi antibiótico prescrito a la hora exacta</label>' +
        '</div>' +
        '<div style="margin-top:10px">' +
          '<label for="fcom">Efectos adversos o notas sobre el tratamiento</label>' +
          '<input id="fcom" placeholder="Ej. ligera molestia gástrica tras la toma / sin efectos">' +
        '</div>' +
        '<button class="btn" id="fs" style="margin-top:16px"><i data-i="arrow"></i>Guardar chequeo diario</button>' +
      '</div>' +
      '<div class="card" style="margin-top:16px">' +
        '<div class="head">' +
          '<h3>Evolución de dolor y síntomas (Últimos registros)</h3>' +
          '<span class="pill">Escala EVA (0–10)</span>' +
        '</div>' +
        (log.length ? '<div class="bars">' + NG.bars(log.slice(-7).map(function(e) { return e.p * 10; }), log.slice(-7).map(function(e) { return dl(e.d); })) + '</div>' : '<p class="mute">Aún no hay chequeos registrados.</p>') +
      '</div>' +
      '<div class="card tw" style="margin-top:16px">' +
        '<h3 style="margin-bottom:12px">Historial de registros diarios</h3>' +
        '<table>' +
          '<tr><th>Fecha</th><th>Hora</th><th>Temperatura</th><th>Dolor</th><th>Líquidos</th><th>Escalofríos</th><th>Vómitos</th><th>Tratamiento</th><th>Glucosa</th><th>Acción</th></tr>' +
          (log.length ? log.slice().reverse().map(function(e) {
            return '<tr>' +
              '<td>' + e.d + '</td>' +
              '<td>' + (e.h || '—') + '</td>' +
              '<td><span class="pill ' + (e.t >= 38 ? 'r' : e.t >= 37.5 ? 'a' : '') + '">' + e.t + ' °C</span></td>' +
              '<td>' + e.p + ' / 10 <small class="mute">(' + (e.dolorLoc || 'Flanco') + ')</small></td>' +
              '<td>' + e.v + ' vasos (' + (e.v * 250) + ' mL)</td>' +
              '<td>' + (e.escalofrios ? '<b style="color:var(--red)">Sí</b>' : 'No') + '</td>' +
              '<td>' + (e.vom ? '<b style="color:var(--red)">Sí</b>' : 'No') + '</td>' +
              '<td>' + (e.ok ? 'Tomado' : '<b style="color:var(--red)">Omitido</b>') + '</td>' +
              '<td>' + (e.g ? e.g + ' mg/dL' : '—') + '</td>' +
              '<td><button class="pill r" data-del="' + e.id + '" type="button">Borrar</button></td>' +
            '</tr>';
          }).join('') : '<tr><td colspan="10">No hay registros guardados.</td></tr>') +
        '</table>' +
      '</div>';

      el.querySelector('#fs').onclick = function() {
        var t = +el.querySelector('#ft').value;
        var p = +el.querySelector('#fp').value;
        var v = +el.querySelector('#fv').value;
        if (!(t >= 34 && t <= 42) || !(p >= 0 && p <= 10)) {
          return NG.toast('Revisa los valores de temperatura (34–42) y dolor (0–10)');
        }
        var newEntry = {
          d: NG.today(),
          h: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
          id: Date.now(),
          t: t,
          p: p,
          dolorLoc: el.querySelector('#fpl').value,
          escalofrios: el.querySelector('#fesc').checked ? 1 : 0,
          confusion: el.querySelector('#fconf').checked ? 1 : 0,
          v: v,
          ml: v * 250,
          diuresis: el.querySelector('#fdiu').value,
          g: el.querySelector('#fg').value,
          vom: el.querySelector('#fvo').checked ? 1 : 0,
          inabilityToDrink: el.querySelector('#finab').checked ? 1 : 0,
          ok: el.querySelector('#fok').checked ? 1 : 0,
          comentario: el.querySelector('#fcom').value.trim()
        };
        log.push(newEntry);
        water[NG.today()] = v;
        NG.set(K('water'), water);
        NG.set(K('log'), log);

        // Sincronizar en la cohorte local de pacientes
        var currentAdh = Math.round(log.reduce(function(acc, q) { return acc + q.ok; }, 0) / log.length * 100);
        NG.updatePatient(userEmail, {
          f: t,
          p: p,
          ad: currentAdh,
          hist: log.slice(-7).map(function(q) { return q.p; })
        });

        NG.toast('Chequeo guardado exitosamente');
        renderHoy();
        NG.render(1, el);
      };

      el.onclick = function(e) {
        var delId = e.target.dataset.del;
        if (delId) {
          log = log.filter(function(x) { return String(x.id) !== delId; });
          NG.set(K('log'), log);
          NG.toast('Registro eliminado');
          renderHoy();
          NG.render(1, el);
        }
      };
    }

    // ==========================================
    // PANEL 2: HISTORIAL CLÍNICO Y FACTORES DE RIESGO
    // ==========================================
    if (idx === 2) {
      var isRec = (ptRecord.c6 >= 2 || ptRecord.c12 >= 3);
      el.innerHTML = '<div class="head">' +
        '<div>' +
          '<h2>Historial Clínico y Factores de Riesgo</h2>' +
          '<p class="mute" style="font-size:13px">Antecedentes médicos, episodios previos y estado del urocultivo.</p>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:16px">' +
        '<h3>Evaluación de Riesgo y Recurrencias</h3>' +
        '<div class="nudge ' + (isRec ? 'r' : '') + '" style="margin-top:10px">' +
          '<b>Frecuencia documentada de IVU:</b> ' + ptRecord.c6 + ' en los últimos 6 meses · ' + ptRecord.c12 + ' en los últimos 12 meses.<br>' +
          (isRec ? '<span style="color:var(--red);font-weight:600">Cumple criterio de recurrencia clínica (≥2 en 6 meses o ≥3 en 12 meses). Se clasifica como episodio de seguimiento prioritario / potencialmente complicado.</span>' : 'Frecuencia no recurrente.') +
        '</div>' +
        '<div class="grid" style="margin-top:12px">' +
          '<div class="row"><span>Diabetes Mellitus</span><b>' + (ptRecord.dm ? 'Sí' : 'No') + '</b></div>' +
          '<div class="row"><span>Enfermedad Renal Crónica</span><b>' + (ptRecord.er ? 'Sí (Estadio ' + (ptRecord.estadioERC || '2/3') + ')' : 'No') + '</b></div>' +
          '<div class="row"><span>Cálculos renales (Litiasis)</span><b>' + (ptRecord.lit ? 'Sí' : 'No') + '</b></div>' +
          '<div class="row"><span>Embarazo</span><b>' + (ptRecord.emb ? 'Sí (' + (ptRecord.semEmb || '20+') + ' semanas)' : 'No') + '</b></div>' +
          '<div class="row"><span>Inmunosupresión / Trasplante</span><b>' + (ptRecord.inm ? 'Sí' : 'No') + '</b></div>' +
          '<div class="row"><span>Sonda o instrumentación reciente</span><b>' + (ptRecord.son || ptRecord.inst ? 'Sí' : 'No') + '</b></div>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:16px">' +
        '<h3>Tratamiento Prescrito y Urocultivo</h3>' +
        '<div class="row" style="margin-top:10px"><span>Tratamiento antibiótico actual:</span><b>' + NG.esc(ptRecord.tr || 'En seguimiento') + '</b></div>' +
        '<div class="row"><span>Estado de urocultivo:</span><b>' + NG.esc(ptRecord.cuEstado || ptRecord.cu || 'Pendiente') + '</b></div>' +
        (ptRecord.bacteria ? '<div class="row"><span>Microorganismo aislado:</span><b>' + NG.esc(ptRecord.bacteria) + ' (' + NG.esc(ptRecord.ufc || '>100,000 UFC/mL') + ')</b></div>' : '') +
        (ptRecord.antibiograma ? '<div class="row"><span>Antibiograma:</span><b>' + NG.esc(ptRecord.antibiograma) + '</b></div>' : '') +
        '<div class="row"><span>Meta hídrica prescrita:</span><b>' + waterGoal + ' vasos/día (≈' + (waterGoal * 250) + ' mL)</b></div>' +
        (hasWaterRestriction ? '<div class="row" style="background:var(--ambbg);color:var(--amb)"><span>Restricción hídrica:</span><b>Límite prescrito activo (No aumentar líquidos)</b></div>' : '') +
      '</div>';
    }

    // ==========================================
    // PANEL 3: CONTROLES MÉDICOS
    // ==========================================
    if (idx === 3) {
      el.innerHTML = '<div class="head">' +
        '<div>' +
          '<h2>Controles Médicos y Citas</h2>' +
          '<p class="mute" style="font-size:13px">Programa tus controles de seguimiento y urocultivos con tu equipo de salud.</p>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:16px">' +
        '<h3>Controles programados</h3>' +
        '<div style="margin-top:10px">' +
          (appts.length ? appts.map(function(a, j) {
            return '<div class="row"><span>' + NG.esc(a.d) + ' · <b>' + NG.esc(a.t) + '</b></span><button class="pill r" data-rx="' + j + '">Quitar</button></div>';
          }).join('') : '<p class="mute">No tienes controles agendados.</p>') +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:16px">' +
        '<h3>Agendar nuevo control</h3>' +
        '<div class="fg" style="margin-top:10px">' +
          '<div><label for="ad">Fecha del control</label><input id="ad" type="date"></div>' +
          '<div><label for="at">Motivo / Examen</label><input id="at" placeholder="Ej. Urocultivo de control o consulta nefrólogo"></div>' +
        '</div>' +
        '<button class="btn" id="btn-add-appt" style="margin-top:10px"><i data-i="cal"></i>Agregar control</button>' +
      '</div>';

      el.querySelector('#btn-add-appt').onclick = function() {
        var d = el.querySelector('#ad').value;
        var t = el.querySelector('#at').value.trim();
        if (!d || !t) return NG.toast('Completa fecha y motivo del control');
        appts.push({ d: d, t: t });
        appts.sort(function(a, b) { return a.d < b.d ? -1 : 1; });
        NG.set(K('appts'), appts);
        NG.toast('Control agendado');
        renderHoy();
        NG.render(3, el);
      };

      el.onclick = function(e) {
        var rx = e.target.dataset.rx;
        if (rx != null) {
          appts.splice(+rx, 1);
          NG.set(K('appts'), appts);
          NG.toast('Control eliminado');
          renderHoy();
          NG.render(3, el);
        }
      };
    }

    // ==========================================
    // PANEL 4: EDUCACIÓN Y HÁBITOS PREVENTIVOS (Pág. 15 del PDF)
    // ==========================================
    if (idx === 4) {
      el.innerHTML = '<div class="head">' +
        '<div>' +
          '<h2>Módulo Educativo y Prevención</h2>' +
          '<p class="mute" style="font-size:13px">Información clínica validada por el equipo médico del Tecnológico de Monterrey y Duoc UC.</p>' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;gap:16px;margin-top:16px">' +
        '<div class="card" style="border-left:5px solid var(--acc)">' +
          '<h3 style="display:flex;align-items:center;gap:8px"><i data-i="shield"></i> ¿Qué es la Pielonefritis?</h3>' +
          '<p class="mute" style="margin:8px 0;font-size:13px;line-height:1.5">' +
            'La <b>pielonefritis</b> es una infección del riñón, generalmente causada por bacterias que ascienden desde la vejiga por los uréteres. <i>Escherichia coli</i> es la causa más frecuente, pero no la única. A diferencia de la cistitis (infección limitada a la vejiga), la pielonefritis compromete el parénquima renal y puede presentar repercusión sistémica.' +
          '</p>' +
        '</div>' +
        '<div class="card" style="border-left:5px solid var(--hl)">' +
          '<h3 style="display:flex;align-items:center;gap:8px"><i data-i="pill"></i> Consumo de Arándano Rojo (Evidencia Científica)</h3>' +
          '<p class="mute" style="margin:8px 0;font-size:13px;line-height:1.5">' +
            'La evidencia científica apoya el uso de productos de arándano rojo estandarizado (con <b>36 mg de proantocianidinas PAC</b> al día) para <b>reducir la recurrencia</b> de infecciones urinarias sintomáticas confirmadas por cultivo en mujeres con episodios repetidos. Actúa impidiendo la adhesión bacteriana al urotelio.<br>' +
            '<b>Aclaración médica esencial:</b> El arándano rojo <i>no trata una infección activa ni sustituye el tratamiento antibiótico</i>. No cuenta con respaldo de eficacia en mujeres embarazadas, adultos mayores ni pacientes con vaciamiento vesical alterado.' +
          '</p>' +
        '</div>' +
        '<div class="card" style="border-left:5px solid var(--bar)">' +
          '<h3 style="display:flex;align-items:center;gap:8px"><i data-i="droplet"></i> Higiene y Vaciamiento Vesical</h3>' +
          '<ul class="ls" style="font-size:13px">' +
            '<li><b>Limpieza suave:</b> Realizar higiene en sentido de adelante hacia atrás. Evitar duchas vaginales y desodorantes íntimos que alteren la microbiota protectora.</li>' +
            '<li><b>No postergar la micción:</b> No evites orinar cuando tengas ganas de hacerlo. El vaciamiento regular previene el sobrecrecimiento bacteriano.</li>' +
            '<li><b>Micción postcoital:</b> Orinar después de relaciones sexuales es un hábito de bajo riesgo que puede recomendarse, aunque su eficacia preventiva tiene evidencia científica limitada.</li>' +
            '<li><b>Control en diabetes:</b> El control adecuado de la glucosa reduce la glucosuria que favorece el crecimiento bacteriano.</li>' +
          '</ul>' +
        '</div>' +
        '<div class="card" style="border-left:5px solid var(--amb)">' +
          '<h3 style="display:flex;align-items:center;gap:8px"><i data-i="siren"></i> Diferencia de Síntomas: Cistitis vs Pielonefritis</h3>' +
          '<div class="two2" style="margin-top:10px">' +
            '<div class="mini bl">' +
              '<h4>Cistitis (Infección baja)</h4>' +
              '<p style="font-size:13px">Dolor o molestia al orinar (disuria), aumento en la frecuencia miccional, urgencia y dolor en el área pélvica/suprapúbica. No presenta fiebre alta ni dolor lumbar.</p>' +
            '</div>' +
            '<div class="mini pk">' +
              '<h4>Pielonefritis (Infección renal)</h4>' +
              '<p style="font-size:13px">Fiebre (≥38 °C), escalofríos intensos con temblor, dolor en flanco o región lumbar, náuseas o vómitos. Puede haber también dolor al orinar. <b>Requiere evaluación médica presencial el mismo día.</b></p>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    // ==========================================
    // PANEL 5: RESUMEN CLÍNICO Y CHAT CON EL MÉDICO
    // ==========================================
    if (idx === 5) {
      var chatList = NG.getChat(userEmail);

      el.innerHTML = '<div class="head">' +
        '<div>' +
          '<h2>Resumen Clínico y Mensajería Segura</h2>' +
          '<p class="mute" style="font-size:13px">Descarga tu historial clínico para la consulta y mantén comunicación directa con tu médico.</p>' +
        '</div>' +
      '</div>' +
      '<div class="grid" style="margin:16px 0">' +
        '<div class="card kpi"><span class="mute">Chequeos registrados</span><b>' + log.length + '</b></div>' +
        '<div class="card kpi"><span class="mute">Adherencia antibiótica</span><b>' + (log.length ? Math.round(log.reduce(function(a, e) { return a + e.ok; }, 0) / log.length * 100) + '%' : '100%') + '</b></div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<button class="btn" id="btn-dl-csv"><i data-i="dl"></i>Descargar Registro en CSV</button>' +
        '<button class="btn o" onclick="window.print()"><i data-i="file"></i>Imprimir / Guardar Resumen en PDF</button>' +
      '</div>' +
      '<div class="card" style="margin-top:20px">' +
        '<h3>Mensajes con tu equipo médico tratante</h3>' +
        '<div class="chat" id="patient-chat-box" style="margin-top:12px;max-height:300px;overflow-y:auto">' +
          (chatList.length ? chatList.map(function(m) {
            var isMe = m.role === 'paciente';
            return '<div class="msg ' + (isMe ? 'me' : '') + '">' +
              '<div style="font-size:11px;font-weight:600;opacity:.8;margin-bottom:2px">' + NG.esc(m.name) + ' (' + (isMe ? 'Paciente' : 'Médico') + ')</div>' +
              '<div>' + NG.esc(m.text) + '</div>' +
              '<small>' + (m.time || '') + ' · ' + (m.date || '') + '</small>' +
            '</div>';
          }).join('') : '<p class="mute">No hay mensajes previos.</p>') +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:12px">' +
          '<input id="pat-msg-input" placeholder="Escribe tu consulta o actualización a tu médico..." style="margin:0">' +
          '<button class="btn" id="btn-pat-send"><i data-i="arrow"></i>Enviar</button>' +
        '</div>' +
        '<small class="mute" style="display:block;margin-top:8px">Nota de seguridad: Si presentas vómitos continuos, confusión o desmayo, llama de inmediato a emergencias (911 / 131) o acude a urgencias. Evita enviar fotos que sean identificables por canales inseguros.</small>' +
      '</div>';

      el.querySelector('#btn-dl-csv').onclick = function() {
        NG.csv('nefroguia-seguimiento-' + userEmail + '.csv', [
          ['Fecha', 'Hora', 'Temperatura_C', 'Dolor_EVA', 'Localizacion', 'Escalofrios', 'Vasos_250mL', 'Volumen_mL', 'Vomitos', 'Tratamiento_Tomado', 'Glucosa_mgdL']
        ].concat(log.map(function(e) {
          return [e.d, e.h || '', e.t, e.p, e.dolorLoc || 'Flanco', e.escalofrios ? 'Sí' : 'No', e.v, (e.v * 250), e.vom ? 'Sí' : 'No', e.ok ? 'Sí' : 'No', e.g || ''];
        })));
      };

      el.querySelector('#btn-pat-send').onclick = function() {
        var inp = el.querySelector('#pat-msg-input');
        var text = inp.value.trim();
        if (!text) return;
        NG.sendChat(userEmail, 'paciente', U.name || 'Paciente', text);
        inp.value = '';
        NG.render(5, el);
      };

      var inpBox = el.querySelector('#pat-msg-input');
      if (inpBox) {
        inpBox.onkeydown = function(e) {
          if (e.key === 'Enter') el.querySelector('#btn-pat-send').click();
        };
      }
    }
  };

  renderHoy();
})();
