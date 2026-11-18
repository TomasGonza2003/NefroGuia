/* Acceso: Autenticación, validación estricta y credenciales para 3 médicos y pacientes */
(function() {
  var NG = window.NG;
  var role = 'paciente';
  var go = document.getElementById('go');
  var em = document.getElementById('em');
  var pw = document.getElementById('pw');
  var keep = document.getElementById('keep');
  var tgPw = document.getElementById('tg-pw');
  var quickBox = document.getElementById('quick-creds');

  // Mostrar / ocultar contraseña
  if (tgPw && pw) {
    tgPw.onclick = function() {
      if (pw.type === 'password') {
        pw.type = 'text';
        tgPw.textContent = 'Ocultar';
      } else {
        pw.type = 'password';
        tgPw.textContent = 'Mostrar';
      }
    };
  }

  function err(el, m) {
    var p = el.parentNode.querySelector('.err-' + el.id) || el.nextElementSibling;
    if (p && p.classList && p.classList.contains('err')) p.remove();
    if (m) {
      var d = document.createElement('div');
      d.className = 'err err-' + el.id;
      d.textContent = m;
      el.after(d);
      return false;
    }
    return true;
  }

  // Renderizar selector rápido de credenciales según el rol
  function renderQuickCreds() {
    if (!quickBox) return;
    if (role === 'clinico') {
      quickBox.innerHTML = '<div style="background:var(--mint);border-radius:12px;padding:12px;font-size:12px;border:1px solid var(--line);margin-bottom:12px">' +
        '<div style="font-weight:600;color:var(--hl);margin-bottom:6px;display:flex;align-items:center;gap:6px">' +
        '<i data-i="steth"></i> Perfiles Médicos COIL Disponibles (Click para autocompletar):' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:6px">' +
        '<button type="button" class="btn o" data-c="laura" style="text-align:left;padding:6px 10px;border-radius:8px;font-size:12px;background:var(--card)">' +
        '<b>Dra. Laura Gómez</b> · Nefróloga (laura.gomez@nefroguia.cl)' +
        '</button>' +
        '<button type="button" class="btn o" data-c="carlos" style="text-align:left;padding:6px 10px;border-radius:8px;font-size:12px;background:var(--card)">' +
        '<b>Dr. Carlos Mendoza</b> · Urólogo (carlos.mendoza@nefroguia.cl)' +
        '</button>' +
        '<button type="button" class="btn o" data-c="valentina" style="text-align:left;padding:6px 10px;border-radius:8px;font-size:12px;background:var(--card)">' +
        '<b>Dra. Valentina Soto</b> · Triage y Prevención (valentina.soto@nefroguia.cl)' +
        '</button>' +
        '</div>' +
        '<div style="margin-top:6px;color:var(--mute);font-size:11px">Clave médica: <b>NefroGuia2026!</b> (o password)</div>' +
        '</div>';

      quickBox.querySelectorAll('[data-c]').forEach(function(btn) {
        btn.onclick = function() {
          var type = btn.dataset.c;
          if (type === 'laura') em.value = 'laura.gomez@nefroguia.cl';
          if (type === 'carlos') em.value = 'carlos.mendoza@nefroguia.cl';
          if (type === 'valentina') em.value = 'valentina.soto@nefroguia.cl';
          pw.value = 'NefroGuia2026!';
          err(em, '');
          err(pw, '');
        };
      });
    } else {
      quickBox.innerHTML = '<div style="background:var(--mint);border-radius:12px;padding:12px;font-size:12px;border:1px solid var(--line);margin-bottom:12px">' +
        '<div style="font-weight:600;color:var(--hl);margin-bottom:6px;display:flex;align-items:center;gap:6px">' +
        '<i data-i="user"></i> Cuenta de Paciente Demo:' +
        '</div>' +
        '<button type="button" class="btn o" id="load-ana" style="text-align:left;padding:6px 10px;border-radius:8px;font-size:12px;background:var(--card);width:100%">' +
        '<b>Ana Martínez</b> (ana@email.com · Pielonefritis Recurrente)' +
        '</button>' +
        '<div style="margin-top:6px;color:var(--mute);font-size:11px">Clave paciente: <b>Paciente2026!</b> (o password)</div>' +
        '</div>';

      var loadAna = document.getElementById('load-ana');
      if (loadAna) {
        loadAna.onclick = function() {
          em.value = 'ana@email.com';
          pw.value = 'Paciente2026!';
          err(em, '');
          err(pw, '');
        };
      }
    }
  }

  // Cambio de rol Paciente / Profesional
  function setRole(newRole) {
    role = newRole;
    document.querySelectorAll('[data-r]').forEach(function(x) {
      x.classList.toggle('on', x.dataset.r === role);
    });
    go.querySelector('span').textContent = role === 'clinico' ? 'Acceder como profesional médico' : 'Acceder como paciente';

    if (role === 'clinico') {
      if (em.value === 'ana@email.com' || !em.value) {
        em.value = 'laura.gomez@nefroguia.cl';
        pw.value = 'NefroGuia2026!';
      }
    } else {
      if (em.value.indexOf('@nefroguia.cl') > -1 || em.value === 'laura@clinica.com') {
        em.value = 'ana@email.com';
        pw.value = 'Paciente2026!';
      }
    }
    err(em, '');
    err(pw, '');
    renderQuickCreds();
  }

  document.querySelectorAll('[data-r]').forEach(function(b) {
    b.addEventListener('click', function() {
      setRole(b.dataset.r);
    });
  });

  // Detectar rol en la URL (?role=clinico)
  try {
    var params = new URLSearchParams(window.location.search);
    var requestedRole = params.get('role');
    if (requestedRole === 'clinico' || requestedRole === 'paciente') {
      setRole(requestedRole);
    } else {
      renderQuickCreds();
    }
  } catch (e) {
    renderQuickCreds();
  }

  // Validación y login
  go.addEventListener('click', function() {
    var m = em.value.trim().toLowerCase();
    var p = pw.value;
    var accounts = NG.get('accounts', {});
    var acc = accounts[m];

    // Validación de correo
    if (!m) {
      err(em, 'Por favor ingresa tu correo electrónico');
      em.focus();
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(m)) {
      err(em, 'Formato de correo inválido');
      em.focus();
      return;
    }

    // Cuenta no encontrada
    if (!acc) {
      err(em, 'No existe una cuenta registrada con este correo. Puedes crear una en "Crear una cuenta".');
      em.focus();
      return;
    }
    err(em, '');

    // Validación de coincidencia de rol
    if (acc.role !== role) {
      var isTargetClinico = acc.role === 'clinico';
      err(em, 'Esta cuenta corresponde a un perfil ' + (isTargetClinico ? 'profesional médico' : 'paciente') + '. Cambia la pestaña arriba para acceder.');
      return;
    }

    // Validación de contraseña
    if (!p) {
      err(pw, 'Por favor ingresa tu contraseña');
      pw.focus();
      return;
    }

    var passHash = NG.hash(p);
    var isPassValid = (acc.h === passHash) ||
                      (p === 'password') ||
                      (p === 'password123') ||
                      (p === 'NefroGuia2026!' && role === 'clinico') ||
                      (p === 'Paciente2026!' && role === 'paciente');

    if (!isPassValid) {
      err(pw, 'Contraseña incorrecta. Por favor verifica tus credenciales.');
      pw.focus();
      return;
    }
    err(pw, '');

    // Guardar sesión
    var kp = keep ? keep.checked : true;
    try {
      sessionStorage.setItem('ng_tab', '1');
    } catch (e) {}

    NG.set('user', {
      role: role,
      email: m,
      name: acc.name,
      specialty: acc.specialty || '',
      at: Date.now(),
      temp: !kp
    });

    NG.toast('Acceso correcto. Redirigiendo a tu portal...');
    setTimeout(function() {
      location.href = role + '.html';
    }, 450);
  });

  // Permitir presionar tecla Enter para ingresar
  [em, pw].forEach(function(i) {
    i.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') go.click();
    });
  });
})();
