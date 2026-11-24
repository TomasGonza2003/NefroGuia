/* Solicitud de cuenta profesional: queda "pendiente" hasta que un administrador la apruebe en /admin */
(function() {
  var NG = window.NG;
  var $ = function(i) { return document.getElementById(i); };

  function err(el, m) {
    var p = el.parentNode.querySelector('.err-' + el.id);
    if (p) p.remove();
    if (m) {
      var d = document.createElement('div');
      d.className = 'err err-' + el.id;
      d.textContent = m;
      el.after(d);
      return false;
    }
    return true;
  }

  // Si el campo ya muestra error, se revalida y se borra al corregirlo
  var CHK = {
    p_nom: function() { return NG.val.name($('p_nom').value); },
    p_mail: function() {
      var m = $('p_mail').value.trim().toLowerCase();
      var e = NG.val.email(m);
      if (e) return e;
      if (NG.get('accounts', {})[m]) return 'Ya existe una cuenta con este correo';
      var pend = NG.get('pro_requests', []).some(function(r) { return r.email === m && r.status === 'pendiente'; });
      return pend ? 'Ya hay una solicitud pendiente con este correo' : '';
    },
    p_tel: function() { return NG.val.phone($('p_tel').value); },
    p_esp: function() { return $('p_esp').value.trim().length < 3 ? 'Indica tu especialidad' : ''; },
    p_reg: function() { return $('p_reg').value.trim().length < 4 ? 'Indica tu número de registro profesional' : ''; },
    p_pass: function() { return NG.val.pass($('p_pass').value, $('p_mail').value.trim().toLowerCase()); },
    p_pass2: function() { return $('p_pass2').value !== $('p_pass').value ? 'Las contraseñas no coinciden' : ''; }
  };

  Object.keys(CHK).forEach(function(id) {
    var el = $(id);
    el.addEventListener('input', function() {
      if (el.parentNode.querySelector('.err-' + id)) err(el, CHK[id]());
      if (id === 'p_pass' && $('p_pass2').parentNode.querySelector('.err-p_pass2')) err($('p_pass2'), CHK.p_pass2());
    });
  });

  $('p_send').addEventListener('click', function() {
    var ok = true;
    Object.keys(CHK).forEach(function(id) {
      if (!err($(id), CHK[id]())) ok = false;
    });
    if (!ok) return NG.toast('Por favor completa o corrige los campos requeridos');

    var list = NG.get('pro_requests', []);
    var email = $('p_mail').value.trim().toLowerCase();
    list.push({
      id: 'S' + Date.now(),
      name: $('p_nom').value.trim().replace(/\s+/g, ' '),
      email: email,
      tel: $('p_tel').value.trim(),
      specialty: $('p_esp').value.trim(),
      reg: $('p_reg').value.trim(),
      inst: $('p_inst').value.trim(),
      h: NG.hash($('p_pass').value),
      status: 'pendiente',
      at: Date.now()
    });
    NG.set('pro_requests', list);
    NG.log('solicitud', 'Nueva solicitud profesional: ' + $('p_nom').value.trim() + ' (' + email + ')');

    $('form-box').hidden = true;
    $('done-box').hidden = false;
    window.scrollTo(0, 0);
  });
})();
