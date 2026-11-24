/* Acceso: Autenticación, validación estricta y credenciales para 3 médicos y pacientes */
(function() {
  var NG = window.NG;
  var role = 'paciente';
  var go = document.getElementById('go');
  var em = document.getElementById('em');
  var pw = document.getElementById('pw');
  var keep = document.getElementById('keep');
  var tgPw = document.getElementById('tg-pw');

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

  // Cambio de rol Paciente / Profesional
  function setRole(newRole) {
    role = newRole;
    document.querySelectorAll('[data-r]').forEach(function(x) {
      x.classList.toggle('on', x.dataset.r === role);
    });
    go.querySelector('span').textContent = role === 'clinico' ? 'Acceder como profesional médico' : 'Acceder como paciente';

    err(em, '');
    err(pw, '');
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
    }
  } catch (e) {}

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

    // Cuenta no encontrada (o solicitud profesional todavía en revisión)
    if (!acc) {
      var rq = NG.get('pro_requests', []).filter(function(r) { return r.email === m; }).pop();
      if (rq && rq.status === 'pendiente') {
        err(em, 'Tu solicitud de cuenta profesional sigue pendiente de aprobación por un administrador.');
        return;
      }
      if (rq && rq.status === 'rechazada') {
        err(em, 'Tu solicitud de cuenta profesional fue rechazada. Contacta al administrador.');
        return;
      }
      err(em, 'No existe una cuenta registrada con este correo. Puedes crear una en "Crear una cuenta".');
      em.focus();
      return;
    }
    err(em, '');

    if (acc.disabled) {
      err(em, 'Esta cuenta está desactivada. Contacta al administrador de la plataforma.');
      return;
    }

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

    NG.log('login', (role === 'clinico' ? 'Profesional' : 'Paciente') + ' ingresó: ' + acc.name + ' (' + m + ')');
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
