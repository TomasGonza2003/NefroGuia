/* Inicio: Autoevaluación rápida de señales de alarma estructurada según protocolo médico COIL (Págs. 15 y 16 del PDF) */
(function() {
  var NG = window.NG;
  var target = document.getElementById('autocheck-container');
  if (!target) return;

  var card = document.createElement('div');
  card.className = 'card';
  card.style.borderRadius = '16px';
  card.style.padding = '24px';
  card.style.marginTop = '20px';

  card.innerHTML = 
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
      '<span class="pill a"><i data-i="steth"></i>Herramienta interactiva</span>' +
      '<h3 style="margin:0;font-size:20px">Autoevaluación rápida de síntomas</h3>' +
    '</div>' +
    '<p class="mute" style="margin:0 0 16px;font-size:14px">Selecciona los síntomas o condiciones que presentas en este momento. La plataforma te indicará el nivel de urgencia recomendado por el equipo clínico (orientativo, no sustituye el diagnóstico médico).</p>' +
    '<div class="ck" id="chk-sintomas" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px">' +
      '<label><input type="checkbox" value="u"> <b>Confusión, somnolencia extrema o dificultad respiratoria</b></label>' +
      '<label><input type="checkbox" value="fv"> <b>Vómitos continuos / No retengo líquidos ni pastillas</b></label>' +
      '<label><input type="checkbox" value="f"> Fiebre igual o mayor a 38 °C</label>' +
      '<label><input type="checkbox" value="e"> Escalofríos intensos con temblor involuntario</label>' +
      '<label><input type="checkbox" value="d"> Dolor agudo en el costado o espalda baja (zona renal)</label>' +
      '<label><input type="checkbox" value="s"> Sangre visible en la orina (color rojizo / hematuria)</label>' +
      '<label><input type="checkbox" value="b"> Ardor al orinar, ganas frecuentes o urgencia miccional</label>' +
      '<label><input type="checkbox" value="emb"> Estoy embarazada o sospecho estarlo</label>' +
    '</div>' +
    '<div id="autocheck-result" class="nudge" style="margin-top:16px;font-size:14px;line-height:1.5" role="status" aria-live="polite">' +
      'Selecciona uno o más síntomas arriba para recibir la orientación del equipo médico.' +
    '</div>';

  target.appendChild(card);

  var resultEl = document.getElementById('autocheck-result');
  var inputs = card.querySelectorAll('input[type="checkbox"]');

  card.addEventListener('change', function() {
    var sel = [];
    inputs.forEach(function(i) {
      if (i.checked) sel.push(i.value);
    });

    if (!sel.length) {
      resultEl.className = 'nudge';
      resultEl.innerHTML = 'Selecciona uno o más síntomas arriba para recibir la orientación del equipo médico.';
      return;
    }

    var hasU = sel.indexOf('u') > -1;
    var hasFV = sel.indexOf('fv') > -1;
    var hasF = sel.indexOf('f') > -1;
    var hasE = sel.indexOf('e') > -1;
    var hasD = sel.indexOf('d') > -1;
    var hasS = sel.indexOf('s') > -1;
    var hasB = sel.indexOf('b') > -1;
    var hasEmb = sel.indexOf('emb') > -1;

    // Regla 1: Urgencia Vital / Inmediata (911 / 131)
    if (hasU || (hasF && hasFV)) {
      resultEl.className = 'nudge r';
      resultEl.innerHTML = 
        '<b style="color:var(--red);font-size:15px">🚨 BUSCA ATENCIÓN DE URGENCIA INMEDIATA</b><br>' +
        (hasU ? '• Presentas señales de alarma neurológica o respiratoria que pueden indicar una complicación sistémica severa (sepsis urinaria).<br>' : '') +
        (hasF && hasFV ? '• La combinación de fiebre con incapacidad de retener líquidos o antibióticos vía oral requiere hidratación y tratamiento intravenoso urgente.<br>' : '') +
        '<b>Indicación:</b> Llama al <b>131 (SAMU en Chile)</b>, o acude al servicio de urgencias más cercano acompañado. <b>No conduzcas tú mismo/a.</b>';
      return;
    }

    // Regla 2: Embarazo con síntomas
    if (hasEmb && (hasF || hasE || hasD || hasFV || hasS || hasB)) {
      resultEl.className = 'nudge r';
      resultEl.innerHTML = 
        '<b style="color:var(--red);font-size:15px">⚠️ ATENCIÓN URGENTE EN EMBARAZO</b><br>' +
        'Durante la gestación, cualquier sospecha de infección urinaria o fiebre requiere <b>valoración médica presencial urgente</b> para realizar urocultivo e indicar un tratamiento seguro que evite contracciones prematuras o compromiso renal materno-fetal.<br>' +
        '<b>Indicación:</b> Acude al servicio de urgencias gineco-obstétricas o a tu centro de salud hoy mismo.';
      return;
    }

    // Regla 3: Sospecha de Pielonefritis (Fiebre, escalofríos con temblor, dolor lumbar o vómitos aislados)
    if (hasF || hasE || hasD || hasFV) {
      resultEl.className = 'nudge a';
      resultEl.innerHTML = 
        '<b style="color:#b45309;font-size:15px">🩺 SOLICITA VALORACIÓN MÉDICA PRESENCIAL EL MISMO DÍA</b><br>' +
        'La fiebre igual o mayor a 38 °C, los escalofríos con temblor y el dolor en la fosa renal son <b>signos característicos de infección renal alta (pielonefritis)</b>.<br>' +
        '<b>Indicación:</b> Acude a una consulta presencial hoy. Se requiere examen físico, toma de urocultivo con antibiograma y prescripción de antibióticos por un médico. <b>No te automediques ni tomes antibióticos sobrantes.</b>';
      return;
    }

    // Regla 4: Hematuria (Sangre en la orina)
    if (hasS) {
      resultEl.className = 'nudge a';
      resultEl.innerHTML = 
        '<b style="color:#b45309;font-size:15px">🩸 VALORACIÓN MÉDICA PRONTA</b><br>' +
        'La presencia de sangre visible en la orina requiere valoración médica pronta para descartar litiasis (cálculos), infección complicada u otras causas urológicas.<br>' +
        '<b>Indicación:</b> Si se acompaña de coágulos, dificultad para orinar o dolor intenso, acude a urgencias. De lo contrario, solicita consulta hoy.';
      return;
    }

    // Regla 5: Síntomas urinarios bajos aislados (Cistitis)
    if (hasB) {
      resultEl.className = 'nudge';
      resultEl.innerHTML = 
        '<b style="font-size:15px">💧 CONSULTA MÉDICA PARA CONFIRMAR CAUSA</b><br>' +
        'El ardor al orinar y la urgencia miccional sin fiebre ni dolor de espalda sugieren una infección urinaria baja (cistitis).<br>' +
        '<b>Indicación:</b> Agenda una consulta médica para estudio y urocultivo. Mantén una buena ingesta de agua (vasos de 250 mL). <b>Si llegaras a presentar fiebre, escalofríos con temblor, vómitos o dolor en la espalda, acude a valoración el mismo día.</b>';
      return;
    }

    // Solo embarazo marcado
    if (hasEmb) {
      resultEl.className = 'nudge';
      resultEl.innerHTML = 
        '<b>Recuerda:</b> En el embarazo se recomienda un urocultivo de tamizaje en las primeras semanas de gestación. Si presentas cualquier molestia al orinar, consúltalo con tu obstetra.';
      return;
    }
  });
})();