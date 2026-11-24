/* Utilidades compartidas: almacenamiento, tema, sesión, avisos, inicialización y validación */
var NG = window.NG = (function() {
  var P = 'ng_';
  function get(k, d) {
    try {
      var v = localStorage.getItem(P + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  }
  function set(k, v) {
    try {
      localStorage.setItem(P + k, JSON.stringify(v));
    } catch (e) {}
  }
  function toast(t) {
    var e = document.createElement('div');
    e.className = 'toast';
    e.setAttribute('role', 'status');
    e.textContent = t;
    document.body.appendChild(e);
    setTimeout(function() { e.remove(); }, 2800);
  }
  function today() {
    return new Date().toISOString().slice(0, 10);
  }
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function csv(name, rows) {
    var t = rows.map(function(r) {
      return r.map(function(c) {
        return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + t], { type: 'text/csv;charset=utf-8;' }));
    a.download = name;
    a.click();
  }
  function tabs(labels, init) {
    var links = [].slice.call(document.querySelectorAll('.side a')).filter(function(a) {
      return labels.indexOf(a.textContent.trim()) > -1;
    });
    var main = document.querySelector('.main'), panels = [main.querySelector('[data-panel="0"]')];
    var host = document.getElementById('panels');
    labels.forEach(function(l, i) {
      if (i) {
        var d = document.createElement('div');
        d.dataset.panel = i;
        d.hidden = true;
        host.appendChild(d);
        panels.push(d);
      }
    });
    function go(i) {
      links.forEach(function(a, j) { a.classList.toggle('on', i === j); });
      panels.forEach(function(p, j) { p.hidden = i !== j; });
      if (i > 0 && window.NG.render) NG.render(i, panels[i]);
    }
    links.forEach(function(a, i) {
      a.addEventListener('click', function(e) {
        e.preventDefault();
        go(i);
      });
    });
    go(init || 0);
    return { go: go, panels: panels };
  }
  function hash(s) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
    h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  /* Validación de correo abierta a dominios institucionales y comerciales */
  var POPULAR_DOMAINS = ['gmail.com','googlemail.com','outlook.com','outlook.es','outlook.cl','hotmail.com','hotmail.es','hotmail.cl','live.com','live.cl','msn.com','yahoo.com','yahoo.es','yahoo.cl','icloud.com','me.com','proton.me','protonmail.com','duocuc.cl','profesor.duoc.cl','tec.mx','med.tecmx.mx','nefroguia.cl','clinica.com','hospital.cl','minsal.cl'];
  var COMMON = ['12345678','123456789','1234567890','password','password1','qwerty123','abcd1234','abc12345','contrasena','contrasena1','admin123','iloveyou1'];

  function lev(a, b) {
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) d[i] = [i];
    for (j = 1; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) {
      for (j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[a.length][b.length];
  }

  function vEmail(m) {
    m = String(m || '').trim().toLowerCase();
    if (!m) return 'Ingresa tu correo';
    if (m.length > 254 || !/^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(m) || /\.\./.test(m) || !/\.[a-z]{2,}$/.test(m)) {
      return 'Correo no válido (ejemplo: usuario@correo.com)';
    }
    var d = m.split('@')[1];
    if (POPULAR_DOMAINS.indexOf(d) > -1) return '';
    var near = POPULAR_DOMAINS.filter(function(x) { return lev(d, x) === 1; })[0];
    return near ? '¿Quisiste decir @' + near + '?' : '';
  }

  function pRules(p, mail) {
    p = String(p || '');
    var u = String(mail || '').split('@')[0].toLowerCase();
    return [
      ['8 caracteres o más', p.length >= 8],
      ['Una mayúscula', /[A-ZÁÉÍÓÚÑ]/.test(p)],
      ['Una minúscula', /[a-záéíóúñ]/.test(p)],
      ['Un número', /\d/.test(p)],
      ['Sin espacios', p.length > 0 && !/\s/.test(p)],
      ['No es una clave común ni tu correo', p.length > 0 && COMMON.indexOf(p.toLowerCase()) < 0 && !(u.length >= 4 && p.toLowerCase().indexOf(u) > -1)]
    ];
  }

  function vPass(p, mail) {
    var r = pRules(p, mail), f = r.filter(function(x) { return !x[1]; })[0];
    return f ? 'Falta: ' + f[0].toLowerCase() : '';
  }

  function pStrength(p, mail) {
    var r = pRules(p, mail), ok = r.filter(function(x) { return x[1]; }).length;
    var s = ok + (/[^A-Za-z0-9\s]/.test(p) ? 1 : 0) + (String(p).length >= 12 ? 1 : 0);
    return { ok: ok === r.length, pct: Math.min(100, Math.round(s / 8 * 100)), lvl: ok < r.length ? 'd' : (s >= 7 ? 'f' : 'm') };
  }

  function vName(n) {
    n = String(n || '').trim().replace(/\s+/g, ' ');
    if (n.length < 3) return 'Ingresa tu nombre completo';
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñüÜ'’.-]+(?: [A-Za-zÁÉÍÓÚáéíóúÑñüÜ'’.-]+)+$/.test(n)) {
      return 'Escribe tu nombre y apellido, usando solo letras';
    }
    return '';
  }

  function vPhone(t) {
    t = String(t || '').trim();
    if (!t) return '';
    var n = t.replace(/\D/g, '').length;
    if (!/^\+?[\d\s()-]+$/.test(t) || n < 8 || n > 15) return 'Teléfono no válido (8 a 15 dígitos)';
    return '';
  }

  /* 3 Perfiles Médicos Oficiales del Proyecto COIL */
  var DOCTORS = [
    {
      id: 'DOC01',
      email: 'laura.gomez@nefroguia.cl',
      alias: 'laura@clinica.com',
      name: 'Dra. Laura Gómez',
      role: 'clinico',
      specialty: 'Nefróloga Clínica · Docente COIL Tec de Monterrey / Hosp. San José',
      regNumber: 'MED-84920-CL'
    },
    {
      id: 'DOC02',
      email: 'carlos.mendoza@nefroguia.cl',
      name: 'Dr. Carlos Mendoza',
      role: 'clinico',
      specialty: 'Urólogo · Infecciones Urinarias Complejas Duoc UC / Red UC',
      regNumber: 'MED-71503-CL'
    },
    {
      id: 'DOC03',
      email: 'valentina.soto@nefroguia.cl',
      name: 'Dra. Valentina Soto',
      role: 'clinico',
      specialty: 'Médica Cirujana · Coordinadora de Triage y Prevención Renal COIL',
      regNumber: 'MED-93214-CL'
    }
  ];

  /* 20 Casos Sintéticos Oficiales de Pacientes Ficticios (P01 a P20 del PDF) */
  var SYNTHETIC_PATIENTS = [
    {
      id: 'P01',
      n: 'Ana Martínez (P01)',
      email: 'ana@email.com',
      tel: '+56 9 8765 4321',
      edad: 34,
      sex: 'F',
      nacionalidad: 'Chile',
      antecedentes: '—',
      c6: 2,
      c12: 2,
      f: 38.2,
      p: 6,
      dolorLoc: 'Flanco derecho',
      escalofrios: 1,
      confusion: 0,
      vom: 0,
      vasos: 4,
      ml: 1000,
      ad: 93,
      cuEstado: 'Resultado disponible: pendiente de revisión',
      cu: 'E. coli sensible a Ciprofloxacino; pendiente de revisión',
      bacteria: 'Escherichia coli',
      ufc: '>100,000 UFC/mL',
      antibiograma: 'Sensible: Ciprofloxacino, Ceftriaxona. Resistente: Ampicilina',
      priorityExpected: 'Revisar ahora',
      desc: 'Recurrencia con fiebre; sospecha de IVU sistémica.',
      tr: 'Ciprofloxacino 500 mg c/12h',
      trVia: 'Oral',
      trDosisOmitidas: 0,
      ctl: '2026-11-20',
      dm: 0, hta: 0, ob: 0, lit: 0, inm: 0, inst: 0, emb: 0, son: 0, er: 0,
      waterCeiling: 8,
      waterLimit: null,
      nutriSodio: 'Normal (<2000 mg)',
      nutriNotes: 'Meta de 8 vasos (2000 mL/día). Extracto de arándano rojo 36 mg PAC/día como apoyo coadyuvante.',
      hist: [3, 4, 5, 6, 7, 6, 6]
    },
    {
      id: 'P02',
      n: 'Beatriz Soto (P02)',
      email: 'p02@nefroguia.cl',
      tel: '+56 9 2233 4455',
      edad: 28,
      sex: 'F',
      nacionalidad: 'Chile',
      antecedentes: '—',
      c6: 0,
      c12: 0,
      f: 36.7,
      p: 1,
      dolorLoc: 'Sin dolor específico',
      escalofrios: 0,
      confusion: 0,
      vom: 0,
      vasos: 7,
      ml: 1750,
      ad: 100,
      cuEstado: 'No solicitado',
      cu: 'No solicitado',
      priorityExpected: 'Estable',
      desc: 'Sin síntomas actuales ni antecedentes; control preventivo.',
      tr: 'Ninguno',
      ctl: '2026-12-15',
      dm: 0, hta: 0, ob: 0, lit: 0, inm: 0, inst: 0, emb: 0, son: 0, er: 0,
      waterCeiling: 8,
      waterLimit: null,
      nutriNotes: 'Mantener hidratación habitual saludable (1.5–2 L).',
      hist: [0, 0, 0, 1, 1, 1, 1]
    },
    {
      id: 'P03',
      n: 'Carla Morales (P03)',
      email: 'p03@nefroguia.cl',
      tel: '+56 9 3344 5566',
      edad: 25,
      sex: 'F',
      nacionalidad: 'Chile',
      antecedentes: '—',
      c6: 0,
      c12: 1,
      f: 36.8,
      p: 2,
      dolorLoc: 'Suprapúbico leve',
      escalofrios: 0,
      confusion: 0,
      vom: 0,
      vasos: 8,
      ml: 2000,
      ad: 100,
      cuEstado: 'Revisado: conducta documentada',
      cu: 'E. coli sensible; revisado',
      bacteria: 'Escherichia coli',
      ufc: '>100,000 UFC/mL',
      antibiograma: 'Sensible: Fosfomicina, Nitrofurantoína',
      priorityExpected: 'Estable',
      desc: 'Cistitis baja no complicada, sin fiebre ni dolor en flanco.',
      tr: 'Fosfomicina trometamol 3g completada',
      ctl: '2026-12-01',
      dm: 0, hta: 0, ob: 0, lit: 0, inm: 0, inst: 0, emb: 0, son: 0, er: 0,
      waterCeiling: 8,
      waterLimit: null,
      nutriNotes: 'Hidratación óptima; micción postcoital.',
      hist: [1, 2, 2, 2, 2, 2, 2]
    },
    {
      id: 'P04',
      n: 'Diana Ramos (P04)',
      email: 'p04@nefroguia.cl',
      tel: '+52 81 1234 5678',
      edad: 46,
      sex: 'F',
      nacionalidad: 'México',
      antecedentes: 'DM',
      dm: 1,
      glucosa: 286,
      c6: 0,
      c12: 1,
      f: 38.6,
      p: 8,
      dolorLoc: 'Flanco izquierdo intenso',
      escalofrios: 1,
      confusion: 0,
      vom: 1,
      vasos: 2,
      ml: 500,
      ad: 80,
      cuEstado: 'Resultado disponible: pendiente de revisión',
      cu: 'E. coli BLEE; pendiente',
      bacteria: 'E. coli (productora de BLEE)',
      ufc: '>100,000 UFC/mL',
      antibiograma: 'Resistente: Quinolonas, Cefalosporinas. Sensible: Amikacina, Meropenem',
      priorityExpected: 'Revisar ahora',
      desc: 'Pielonefritis febril, diabetes y vómitos; valoración urgente.',
      tr: 'Ajuste urgente por resistencia BLEE',
      ctl: '2026-11-17',
      hta: 0, ob: 0, lit: 0, inm: 0, inst: 0, emb: 0, son: 0, er: 0,
      waterCeiling: 8,
      waterLimit: null,
      nutriNotes: 'Plan de días de enfermedad por hiperglucemia (286 mg/dL). Rehidratación parenteral urgente si vómitos persistentes.',
      hist: [4, 5, 6, 7, 7, 8, 8]
    },
    {
      id: 'P05',
      n: 'Elena Castillo (P05)',
      email: 'p05@nefroguia.cl',
      tel: '+52 55 9876 5432',
      edad: 31,
      sex: 'F',
      nacionalidad: 'México',
      antecedentes: 'EMB',
      emb: 1,
      semEmb: 22,
      c6: 0,
      c12: 1,
      f: 38.1,
      p: 5,
      dolorLoc: 'Lumbar bilateral',
      escalofrios: 1,
      confusion: 0,
      vom: 1,
      vasos: 5,
      ml: 1250,
      ad: 100,
      cuEstado: 'Muestra recolectada/en proceso',
      cu: 'Muestra recolectada; en proceso',
      priorityExpected: 'Revisar ahora',
      desc: 'Embarazo con fiebre y dolor lumbar; evaluación hospitalaria/obstétrica.',
      tr: 'Cefuroxima axetil 500 mg c/12h',
      ctl: '2026-11-17',
      dm: 0, hta: 0, ob: 0, lit: 0, inm: 0, inst: 0, son: 0, er: 0,
      waterCeiling: 8,
      waterLimit: null,
      nutriNotes: 'Gestación 22 semanas: valoración obstétrica prioritaria; no restringir líquidos.',
      hist: [2, 3, 3, 4, 4, 5, 5]
    },
    {
      id: 'P06',
      n: 'Fernando Ortiz (P06)',
      email: 'p06@nefroguia.cl',
      tel: '+56 9 6677 8899',
      edad: 58,
      sex: 'M',
      nacionalidad: 'Chile',
      antecedentes: 'LIT',
      lit: 1,
      c6: 0,
      c12: 1,
      f: 39.0,
      p: 8,
      dolorLoc: 'Fosa renal derecha cólico',
      escalofrios: 1,
      confusion: 0,
      vom: 1,
      vasos: 3,
      ml: 750,
      ad: 90,
      cuEstado: 'Muestra recolectada/en proceso',
      cu: 'Pendiente',
      priorityExpected: 'Revisar ahora',
      desc: 'Fiebre, litiasis y posible obstrucción; descartar urgencia urológica.',
      tr: 'Ceftriaxona EV',
      ctl: '2026-11-17',
      dm: 0, hta: 0, ob: 0, inm: 0, inst: 0, emb: 0, son: 0, er: 0,
      waterCeiling: 8,
      waterLimit: null,
      nutriNotes: 'Sospecha de litiasis obstructiva infectada: urgencia urológica (descompresión).',
      hist: [3, 4, 5, 6, 7, 8, 8]
    },
    {
      id: 'P07',
      n: 'Gloria Méndez (P07)',
      email: 'p07@nefroguia.cl',
      tel: '+52 33 4455 6677',
      edad: 72,
      sex: 'F',
      nacionalidad: 'México',
      antecedentes: 'SON',
      son: 1,
      c6: 0,
      c12: 1,
      f: 38.3,
      p: 4,
      dolorLoc: 'Lumbar difuso',
      escalofrios: 1,
      confusion: 0,
      vom: 0,
      vasos: 6,
      ml: 1500,
      ad: 100,
      cuEstado: 'Muestra recolectada/en proceso',
      cu: 'E. coli; pendiente',
      priorityExpected: 'Revisar ahora',
      desc: 'Adulto mayor con sonda y fiebre; posible IVU asociada a catéter.',
      tr: 'Ciprofloxacino 500 mg c/12h',
      ctl: '2026-11-18',
      dm: 0, hta: 0, ob: 0, lit: 0, inm: 0, inst: 0, emb: 0, er: 0,
      waterCeiling: 7,
      waterLimit: null,
      nutriNotes: 'Revisar recambio de sonda Foley y circuito cerrado.',
      hist: [2, 2, 3, 3, 4, 4, 4]
    },
    {
      id: 'P08',
      n: 'Hugo Valenzuela (P08)',
      email: 'p08@nefroguia.cl',
      tel: '+56 9 8899 0011',
      edad: 40,
      sex: 'M',
      nacionalidad: 'Chile',
      antecedentes: 'INS',
      inst: 1,
      c6: 0,
      c12: 1,
      f: 37.8,
      p: 5,
      dolorLoc: 'Perineal y lumbar bajo',
      escalofrios: 0,
      confusion: 0,
      vom: 0,
      vasos: 6,
      ml: 1500,
      ad: 100,
      cuEstado: 'Muestra recolectada/en proceso',
      cu: 'Pendiente',
      priorityExpected: 'Hoy',
      desc: 'Síntomas tras instrumentación urinaria reciente, sin inestabilidad.',
      tr: 'Cefadroxilo 500 mg c/12h',
      ctl: '2026-11-18',
      dm: 0, hta: 0, ob: 0, lit: 0, inm: 0, emb: 0, son: 0, er: 0,
      waterCeiling: 8,
      waterLimit: null,
      nutriNotes: 'Vigilar diuresis y chorro miccional post cistoscopia.',
      hist: [2, 3, 4, 4, 5, 5, 5]
    },
    {
      id: 'P09',
      n: 'Ignacio Fuentes (P09)',
      email: 'p09@nefroguia.cl',
      tel: '+56 9 9900 1122',
      edad: 51,
      sex: 'M',
      nacionalidad: 'Chile',
      antecedentes: 'INM',
      inm: 1,
      c6: 0,
      c12: 1,
      f: 38.4,
      p: 6,
      dolorLoc: 'Fosa renal derecha',
      escalofrios: 1,
      confusion: 0,
      vom: 1,
      vasos: 4,
      ml: 1000,
      ad: 100,
      cuEstado: 'Muestra recolectada/en proceso',
      cu: 'Pendiente',
      priorityExpected: 'Revisar ahora',
      desc: 'Inmunosupresión y fiebre con síntomas urinarios.',
      tr: 'Tratamiento intrahospitalario',
      ctl: '2026-11-17',
      dm: 0, hta: 0, ob: 0, lit: 0, inst: 0, emb: 0, son: 0, er: 0,
      waterCeiling: 8,
      waterLimit: null,
      nutriNotes: 'Trasplantado renal / Inmunodeprimido: umbral bajo de hospitalización.',
      hist: [3, 4, 5, 5, 6, 6, 6]
    },
    {
      id: 'P10',
      n: 'Juana Pérez (P10)',
      email: 'p10@nefroguia.cl',
      tel: '+56 9 1234 5670',
      edad: 37,
      sex: 'F',
      nacionalidad: 'Chile',
      antecedentes: '—',
      c6: 1,
      c12: 2,
      f: 37.0,
      p: 2,
      dolorLoc: 'Disuria y pélvico',
      escalofrios: 0,
      confusion: 0,
      vom: 0,
      vasos: 5,
      ml: 1250,
      ad: 55,
      cuEstado: 'Revisado: conducta documentada',
      cu: 'E. coli; revisado',
      bacteria: 'Escherichia coli',
      priorityExpected: 'Hoy',
      desc: 'Adherencia baja por efectos adversos; requiere contacto para revisar plan.',
      tr: 'Nitrofurantoína 100 mg (náuseas/intolerancia)',
      ctl: '2026-11-19',
      dm: 0, hta: 0, ob: 0, lit: 0, inm: 0, inst: 0, emb: 0, son: 0, er: 0,
      waterCeiling: 8,
      waterLimit: null,
      nutriNotes: 'Revisar alternativa antibiótica oral mejor tolerada gástricamente.',
      hist: [2, 2, 2, 2, 2, 2, 2]
    },
    {
      id: 'P11',
      n: 'Klaus Schmidt (P11)',
      email: 'p11@nefroguia.cl',
      tel: '+56 9 2345 6781',
      edad: 66,
      sex: 'M',
      nacionalidad: 'Chile',
      antecedentes: 'DM, ER',
      dm: 1,
      er: 1,
      estadioERC: '3b',
      creatinina: 1.9,
      egfr: 38,
      c6: 0,
      c12: 1,
      f: 38.2,
      p: 5,
      dolorLoc: 'Flanco derecho',
      escalofrios: 1,
      confusion: 0,
      vom: 0,
      vasos: 4,
      ml: 1000,
      ad: 100,
      cuEstado: 'Resultado disponible: pendiente de revisión',
      cu: 'Klebsiella; pendiente',
      bacteria: 'Klebsiella pneumoniae',
      antibiograma: 'Sensible: Ceftriaxona, Cefepima. Ajuste por ERC',
      priorityExpected: 'Revisar ahora',
      desc: 'Diabetes y enfermedad renal con fiebre; valorar función renal y complicación.',
      tr: 'Ceftriaxona con ajuste a TFG 38 mL/min',
      ctl: '2026-11-18',
      hta: 0, ob: 0, lit: 0, inm: 0, inst: 0, emb: 0, son: 0,
      waterCeiling: 6,
      waterLimit: 1500,
      nutriSodio: 'Restricción moderada (1500 mg)',
      nutriNotes: 'Límite hídrico prescrito: Máximo 1500 mL/día por ERC 3b.',
      hist: [3, 3, 4, 4, 5, 5, 5]
    },
    {
      id: 'P12',
      n: 'Leonor Véliz (P12)',
      email: 'p12@nefroguia.cl',
      tel: '+56 9 3456 7892',
      edad: 83,
      sex: 'F',
      nacionalidad: 'Chile',
      antecedentes: '—',
      c6: 0,
      c12: 1,
      f: 37.2,
      p: 0,
      dolorLoc: 'Sin dolor referido',
      escalofrios: 0,
      confusion: 1,
      vom: 1,
      vasos: 5,
      ml: 1250,
      ad: 100,
      cuEstado: 'Muestra recolectada/en proceso',
      cu: 'Pendiente',
      priorityExpected: 'Revisar ahora',
      desc: 'Confusión aguda y probable infección; urgencias inmediatas aunque no tenga fiebre.',
      tr: 'Evaluación urgente en servicio de urgencias',
      ctl: '2026-11-17',
      dm: 0, hta: 0, ob: 0, lit: 0, inm: 0, inst: 0, emb: 0, son: 0, er: 0,
      waterCeiling: 6,
      waterLimit: null,
      nutriNotes: 'Adulto mayor con confusión aguda: descartar sepsis/delirium asociado a IVU.',
      hist: [0, 0, 0, 0, 0, 0, 0]
    },
    {
      id: 'P13',
      n: 'Mariana Silva (P13)',
      email: 'p13@nefroguia.cl',
      tel: '+56 9 4567 8903',
      edad: 29,
      sex: 'F',
      nacionalidad: 'Chile',
      antecedentes: '—',
      c6: 0,
      c12: 1,
      f: 36.9,
      p: 3,
      dolorLoc: 'Disuria moderada',
      escalofrios: 0,
      confusion: 0,
      vom: 0,
      vasos: 6,
      ml: 1500,
      ad: 100,
      cuEstado: 'Revisado: conducta documentada',
      cu: 'E. coli sensible; revisado',
      bacteria: 'Escherichia coli',
      priorityExpected: 'Estable',
      desc: 'Cistitis con mejoría tras valoración y tratamiento prescrito.',
      tr: 'Cefadroxilo 500 mg c/12h',
      ctl: '2026-11-24',
      dm: 0, hta: 0, ob: 0, lit: 0, inm: 0, inst: 0, emb: 0, son: 0, er: 0,
      waterCeiling: 8,
      waterLimit: null,
      nutriNotes: 'Buena respuesta; continuar antibiótico hasta completar prescripción.',
      hist: [4, 4, 3, 3, 3, 3, 3]
    },
    {
      id: 'P14',
      n: 'Nora Álvarez (P14)',
      email: 'p14@nefroguia.cl',
      tel: '+52 81 2345 6789',
      edad: 54,
      sex: 'F',
      nacionalidad: 'México',
      antecedentes: 'OB, HTA',
      ob: 1,
      hta: 1,
      c6: 0,
      c12: 1,
      f: 37.6,
      p: 4,
      dolorLoc: 'Molestia lumbar baja y tenesmo',
      escalofrios: 0,
      confusion: 0,
      vom: 0,
      vasos: 5,
      ml: 1250,
      ad: 100,
      cuEstado: 'Solicitado: pendiente de toma',
      cu: 'Solicitado: pendiente de toma',
      priorityExpected: 'Hoy',
      desc: 'Síntomas urinarios y febrícula; sin signos sistémicos claros, revisión hoy/seguimiento.',
      tr: 'Cefuroxima 250 mg c/12h',
      ctl: '2026-11-19',
      dm: 0, lit: 0, inm: 0, inst: 0, emb: 0, son: 0, er: 0,
      waterCeiling: 8,
      waterLimit: null,
      nutriNotes: 'Mantener control de presión arterial y consumo hídrico de 2 L.',
      hist: [2, 3, 3, 4, 4, 4, 4]
    },
    {
      id: 'P15',
      n: 'Óscar Navarro (P15)',
      email: 'p15@nefroguia.cl',
      tel: '+52 55 3456 7890',
      edad: 62,
      sex: 'M',
      nacionalidad: 'México',
      antecedentes: 'LIT, ER',
      lit: 1,
      er: 1,
      estadioERC: '2',
      c6: 0,
      c12: 1,
      f: 37.1,
      p: 2,
      dolorLoc: 'Flanco derecho intermitente',
      escalofrios: 0,
      confusion: 0,
      vom: 0,
      vasos: 6,
      ml: 1500,
      ad: 100,
      cuEstado: 'Solicitado: pendiente de toma',
      cu: 'Solicitado: pendiente de toma',
      priorityExpected: 'Hoy',
      desc: 'Dolor tipo cólico y antecedente de litiasis; descartar obstrucción.',
      tr: 'Observación y analgesia',
      ctl: '2026-11-20',
      dm: 0, hta: 0, ob: 0, inm: 0, inst: 0, emb: 0, son: 0,
      waterCeiling: 8,
      waterLimit: null,
      nutriNotes: 'Valorar ecografía renal para descartar litiasis obstructiva residual.',
      hist: [2, 2, 2, 2, 2, 2, 2]
    },
    {
      id: 'P16',
      n: 'Patricia Delgado (P16)',
      email: 'p16@nefroguia.cl',
      tel: '+56 9 5678 9014',
      edad: 43,
      sex: 'F',
      nacionalidad: 'Chile',
      antecedentes: 'DM',
      dm: 1,
      glucosa: 260,
      c6: 0,
      c12: 1,
      f: 37.4,
      p: 3,
      dolorLoc: 'Disuria y ardor',
      escalofrios: 0,
      confusion: 0,
      vom: 0,
      vasos: 7,
      ml: 1750,
      ad: 100,
      cuEstado: 'Revisado: conducta documentada',
      cu: 'E. coli; revisado',
      bacteria: 'Escherichia coli',
      priorityExpected: 'Hoy',
      desc: 'Hiperglucemia persistente reportada (260 mg/dL) con IVU; contacto clínico hoy.',
      tr: 'Nitrofurantoína 100 mg c/12h',
      ctl: '2026-11-18',
      hta: 0, ob: 0, lit: 0, inm: 0, inst: 0, emb: 0, son: 0, er: 0,
      waterCeiling: 8,
      waterLimit: null,
      nutriNotes: 'Plan para días de enfermedad: hiperglucemia 260 mg/dL; evitar descompensación cetoacidótica.',
      hist: [3, 3, 3, 3, 3, 3, 3]
    },
    {
      id: 'P17',
      n: 'Quena Bustos (P17)',
      email: 'p17@nefroguia.cl',
      tel: '+56 9 6789 0125',
      edad: 22,
      sex: 'F',
      nacionalidad: 'Chile',
      antecedentes: '—',
      c6: 0,
      c12: 1,
      f: 36.8,
      p: 1,
      dolorLoc: 'Asintomática hoy',
      escalofrios: 0,
      confusion: 0,
      vom: 0,
      vasos: 8,
      ml: 2000,
      ad: 100,
      cuEstado: 'No solicitado',
      cu: 'No solicitado',
      priorityExpected: 'Estable',
      desc: 'Síntomas bajos leves resueltos; no hay datos actuales de infección alta.',
      tr: 'Completado',
      ctl: '2026-12-10',
      dm: 0, hta: 0, ob: 0, lit: 0, inm: 0, inst: 0, emb: 0, son: 0, er: 0,
      waterCeiling: 8,
      waterLimit: null,
      nutriNotes: 'Seguimiento preventivo. Medidas de higiene y micción postcoital.',
      hist: [1, 1, 1, 1, 1, 1, 1]
    },
    {
      id: 'P18',
      n: 'Rodrigo Vega (P18)',
      email: 'p18@nefroguia.cl',
      tel: '+56 9 7890 1236',
      edad: 76,
      sex: 'M',
      nacionalidad: 'Chile',
      antecedentes: 'HTA, ER',
      hta: 1,
      er: 1,
      estadioERC: '3a',
      creatinina: 1.6,
      egfr: 44,
      c6: 0,
      c12: 1,
      f: 38.1,
      p: 7,
      dolorLoc: 'Flanco y fosa lumbar izquierda',
      escalofrios: 1,
      confusion: 0,
      vom: 1,
      vasos: 2,
      ml: 500,
      ad: 70,
      cuEstado: 'Muestra recolectada/en proceso',
      cu: 'Muestra recolectada; en proceso',
      priorityExpected: 'Revisar ahora',
      desc: 'Adulto mayor con fiebre, vómitos y baja tolerancia oral.',
      tr: 'Ciprofloxacino (vómitos impiden absorción)',
      ctl: '2026-11-17',
      dm: 0, ob: 0, lit: 0, inm: 0, inst: 0, emb: 0, son: 0,
      waterCeiling: 6,
      waterLimit: 1500,
      nutriNotes: 'Incapacidad para tolerar vía oral y antibióticos: requiere valoración urgente e hidratación endovenosa.',
      hist: [4, 5, 5, 6, 6, 7, 7]
    },
    {
      id: 'P19',
      n: 'Silvia Contreras (P19)',
      email: 'p19@nefroguia.cl',
      tel: '+52 33 6789 0123',
      edad: 33,
      sex: 'F',
      nacionalidad: 'México',
      antecedentes: '—',
      c6: 2,
      c12: 3,
      f: 36.9,
      p: 2,
      dolorLoc: 'Molestia uretral leve',
      escalofrios: 0,
      confusion: 0,
      vom: 0,
      vasos: 7,
      ml: 1750,
      ad: 100,
      cuEstado: 'Revisado: conducta documentada',
      cu: 'E. coli; revisado',
      bacteria: 'Escherichia coli',
      priorityExpected: 'Hoy',
      desc: 'Recurrencia documentada sin fiebre; necesita evaluación programada y plan preventivo.',
      tr: 'Plan profiláctico no antibiótico / PAC',
      ctl: '2026-11-22',
      dm: 0, hta: 0, ob: 0, lit: 0, inm: 0, inst: 0, emb: 0, son: 0, er: 0,
      waterCeiling: 8,
      waterLimit: null,
      nutriNotes: 'Recurrencia documentada: indicar extracto de arándano rojo 36 mg PAC/día e hidratación de 2 L.',
      hist: [2, 2, 2, 2, 2, 2, 2]
    },
    {
      id: 'P20',
      n: 'Teresa Miranda (P20)',
      email: 'p20@nefroguia.cl',
      tel: '+52 55 7890 1234',
      edad: 49,
      sex: 'F',
      nacionalidad: 'México',
      antecedentes: 'INM, DM',
      inm: 1,
      dm: 1,
      c6: 0,
      c12: 1,
      f: 39.1,
      p: 9,
      dolorLoc: 'Lumbar bilateral severo',
      escalofrios: 1,
      confusion: 1,
      vom: 1,
      vasos: 2,
      ml: 500,
      ad: 60,
      cuEstado: 'Muestra recolectada/en proceso',
      cu: 'Pendiente',
      priorityExpected: 'Revisar ahora',
      desc: 'Inmunosupresión, diabetes y deterioro sistémico; valoración urgente.',
      tr: 'Hospitalización inmediata en urgencias',
      ctl: '2026-11-17',
      hta: 0, ob: 0, lit: 0, inst: 0, emb: 0, son: 0, er: 0,
      waterCeiling: 8,
      waterLimit: null,
      nutriNotes: 'Sospecha de sepsis de origen urinario en paciente diabética inmunodeprimida.',
      hist: [4, 5, 6, 7, 8, 9, 9]
    }
  ];

  /* Evolución Diaria de 7 Días Ficticios para P01 y P04 (Pág. 13 del PDF) */
  var SEVEN_DAY_LOGS = {
    'ana@email.com': [
      { d: '2026-11-10', dia: 1, t: 38.4, p: 7, v: 3, ml: 750, vom: 1, ok: 1, g: null, h: '08:30', com: 'Inicio de tratamiento prescrito; valoración presencial.' },
      { d: '2026-11-11', dia: 2, t: 38.1, p: 6, v: 4, ml: 1000, vom: 0, ok: 1, g: null, h: '09:00', com: 'Persiste fiebre; revisar evolución y cultivo.' },
      { d: '2026-11-12', dia: 3, t: 37.8, p: 5, v: 5, ml: 1250, vom: 0, ok: 1, g: null, h: '09:15', com: 'Mejoría parcial; continuar seguimiento.' },
      { d: '2026-11-13', dia: 4, t: 37.2, p: 3, v: 6, ml: 1500, vom: 0, ok: 1, g: null, h: '08:45', com: 'Afebril, dolor en descenso.' },
      { d: '2026-11-14', dia: 5, t: 36.9, p: 2, v: 7, ml: 1750, vom: 0, ok: 1, g: null, h: '10:00', com: 'Mejoría sostenida.' },
      { d: '2026-11-15', dia: 6, t: 36.8, p: 1, v: 7, ml: 1750, vom: 0, ok: 1, g: null, h: '09:30', com: 'Sin fiebre; completar esquema indicado.' },
      { d: '2026-11-16', dia: 7, t: 36.7, p: 0, v: 7, ml: 1750, vom: 0, ok: 1, g: null, h: '08:30', com: 'Asintomático; cierre según indicación clínica.' }
    ],
    'p04@nefroguia.cl': [
      { d: '2026-11-10', dia: 1, t: 38.6, p: 8, v: 2, ml: 500, vom: 1, ok: 1, g: 286, h: '08:00', com: 'Diabetes, vómitos; valoración hospitalaria.' },
      { d: '2026-11-11', dia: 2, t: 38.2, p: 7, v: 3, ml: 750, vom: 1, ok: 1, g: 254, h: '09:00', com: 'Continúa fiebre; revisar cultivo, función renal y respuesta.' },
      { d: '2026-11-12', dia: 3, t: 37.8, p: 5, v: 4, ml: 1000, vom: 0, ok: 1, g: 218, h: '09:30', com: 'Mejoría parcial; control glucémico y reevaluación.' },
      { d: '2026-11-13', dia: 4, t: 37.2, p: 3, v: 5, ml: 1250, vom: 0, ok: 1, g: 190, h: '10:00', com: 'Afebril, tolera vía oral.' },
      { d: '2026-11-14', dia: 5, t: 36.9, p: 2, v: 6, ml: 1500, vom: 0, ok: 1, g: 166, h: '09:00', com: 'Mejoría sostenida.' },
      { d: '2026-11-15', dia: 6, t: 36.8, p: 1, v: 6, ml: 1500, vom: 0, ok: 1, g: 150, h: '08:45', com: 'Sin fiebre; continuar indicación.' },
      { d: '2026-11-16', dia: 7, t: 36.7, p: 0, v: 7, ml: 1750, vom: 0, ok: 1, g: 142, h: '09:15', com: 'Asintomática; completar tratamiento indicado y seguimiento.' }
    ]
  };

  /* Inicialización de LocalStorage con versión 4 */
  function initSeed() {
    var SEED_VER = 4;
    var currentVer = get('seed_v', 0);

    if (currentVer < SEED_VER) {
      var acc = {};

      // 1. Cargar Médicos
      DOCTORS.forEach(function(doc) {
        var h = hash('NefroGuia2026!');
        acc[doc.email.toLowerCase()] = {
          name: doc.name,
          role: 'clinico',
          specialty: doc.specialty,
          reg: doc.regNumber,
          h: h
        };
        if (doc.alias) {
          acc[doc.alias.toLowerCase()] = {
            name: doc.name,
            role: 'clinico',
            specialty: doc.specialty,
            reg: doc.regNumber,
            h: h
          };
        }
      });

      // 2. Cargar Pacientes (P01 a P20)
      SYNTHETIC_PATIENTS.forEach(function(p) {
        acc[p.email.toLowerCase()] = {
          name: p.n,
          role: 'paciente',
          h: hash('Paciente2026!')
        };
      });
      set('accounts', acc);
      set('pts', SYNTHETIC_PATIENTS);

      // 3. Cargar Evolución de 7 Días de P01 y P04
      Object.keys(SEVEN_DAY_LOGS).forEach(function(email) {
        set('log:' + email, SEVEN_DAY_LOGS[email]);
        var waterLog = {};
        SEVEN_DAY_LOGS[email].forEach(function(item) {
          waterLog[item.d] = item.v;
        });
        set('water:' + email, waterLog);
      });

      // 4. Chat inicial bidireccional entre Dra. Laura Gómez y Ana Martínez (P01)
      var anaEmail = 'ana@email.com';
      var anaChat = [
        {
          id: 1,
          role: 'clinico',
          name: 'Dra. Laura Gómez',
          text: 'Hola Ana, revisé tu registro y observo que tu temperatura subió a 38.2 °C con dolor en flanco 6/10. He solicitado urocultivo y antibiograma; mantén reposo e hidratación.',
          time: '08:40',
          date: '2026-11-15'
        },
        {
          id: 2,
          role: 'paciente',
          name: 'Ana Martínez (P01)',
          text: 'Buenos días Dra. Laura. He tomado el antibiótico puntual, pero sentí náuseas ayer. Agradezco las indicaciones.',
          time: '09:05',
          date: '2026-11-15'
        },
        {
          id: 3,
          role: 'clinico',
          name: 'Dra. Laura Gómez',
          text: 'Tu cultivo está disponible; contacta al profesional si no mejoras en 48–72 h o empeoras. Si presentas vómitos persistentes o incapacidad para beber, acude a urgencias.',
          time: '09:15',
          date: '2026-11-16'
        }
      ];
      set('chat:' + anaEmail, anaChat);

      set('seed_v', SEED_VER);
    }
  }

  initSeed();

  /* Registro de actividad de la plataforma (lo lee el panel /admin) */
  function log(type, text) {
    var list = get('activity', []);
    list.push({ t: Date.now(), type: type, text: text });
    if (list.length > 300) list = list.slice(list.length - 300);
    set('activity', list);
  }

  /* Gestión unificada de Mensajería Bidireccional Local */
  function getChat(email) {
    if (!email) return [];
    return get('chat:' + email.toLowerCase(), []);
  }

  function sendChat(email, senderRole, senderName, text) {
    if (!email || !text || !text.trim()) return [];
    var key = 'chat:' + email.toLowerCase();
    var list = get(key, []);
    var now = new Date();
    var msg = {
      id: Date.now(),
      role: senderRole,
      name: senderName,
      text: text.trim(),
      time: now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      date: today()
    };
    list.push(msg);
    set(key, list);
    return list;
  }

  /* Gestión de Pacientes */
  function getPts() {
    return get('pts', SYNTHETIC_PATIENTS);
  }

  function savePts(pts) {
    set('pts', pts);
  }

  function updatePatient(email, updates) {
    var pts = getPts();
    var found = false;
    for (var i = 0; i < pts.length; i++) {
      if (pts[i].email && pts[i].email.toLowerCase() === email.toLowerCase()) {
        Object.assign(pts[i], updates);
        found = true;
        break;
      }
    }
    if (found) savePts(pts);
    return found;
  }

  return {
    hash: hash,
    get: get,
    set: set,
    toast: toast,
    log: log,
    today: today,
    esc: esc,
    csv: csv,
    tabs: tabs,
    val: {
      email: vEmail,
      pass: vPass,
      rules: pRules,
      strength: pStrength,
      name: vName,
      phone: vPhone
    },
    doctors: DOCTORS,
    syntheticPatients: SYNTHETIC_PATIENTS,
    getChat: getChat,
    sendChat: sendChat,
    getPts: getPts,
    savePts: savePts,
    updatePatient: updatePatient,
    initSeed: initSeed
  };
})();

/* Manejo de Sesión, Tema, Accesibilidad y Navegación Inteligente */
(function() {
  var NG = window.NG;
  var t = NG.get('theme');
  if (t) document.documentElement.dataset.theme = t;
  var b = document.createElement('button');
  b.className = 'theme';
  b.setAttribute('aria-label', 'Cambiar tema claro u oscuro');
  b.textContent = '◐';
  b.onclick = function() {
    var d = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = d;
    NG.set('theme', d);
  };
  document.body.appendChild(b);

  var g = document.body.dataset.guard, u = NG.get('user');
  if (u && u.temp) {
    try {
      if (!sessionStorage.getItem('ng_tab')) {
        localStorage.removeItem('ng_user');
        u = null;
      }
    } catch (e) {}
  }

  // Si un administrador desactivó la cuenta, se cierra la sesión
  if (u && u.email) {
    var accNow = NG.get('accounts', {})[String(u.email).toLowerCase()];
    if (accNow && accNow.disabled) {
      localStorage.removeItem('ng_user');
      u = null;
      if (!g) { /* página pública: nada más que hacer */ }
    }
  }

  // Protección de rutas por rol
  if (g && (!u || u.role !== g)) {
    location.replace('acceso.html?role=' + encodeURIComponent(g));
    return;
  }

  // Actualizar datos del usuario logueado en la interfaz
  if (u && u.name) {
    document.querySelectorAll('.rc b').forEach(function(b) {
      b.textContent = u.name;
    });

    var hh = document.querySelector('.main h2');
    if (hh && /^Hola/.test(hh.textContent)) {
      hh.textContent = 'Hola, ' + u.name.split(' ')[0];
    }

    var pd = document.querySelector('.head p.mute');
    if (pd && /^(Martes|Lunes|Miércoles|Jueves|Viernes|Sábado|Domingo|Seguimiento|Hola)/i.test(pd.textContent)) {
      pd.textContent = new Date().toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  }

  // Cierre de sesión
  document.querySelectorAll('.side a.out, .side a[href="index.html"], .side a[href$="index.html"]').forEach(function(a) {
    a.addEventListener('click', function() {
      localStorage.removeItem('ng_user');
    });
  });
})();
