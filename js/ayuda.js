/* Ayuda: Buscador de FAQ en tiempo real, acordeón accesible y canales de contacto */
(function() {
  var NG = window.NG;
  var q = document.getElementById('q');
  var faqs = [].slice.call(document.querySelectorAll('#ayuda .faq'));

  var counterEl = document.createElement('p');
  counterEl.className = 'mute';
  counterEl.style.margin = '10px 0 16px';
  counterEl.setAttribute('role', 'status');
  counterEl.setAttribute('aria-live', 'polite');

  if (faqs.length && faqs[0].parentNode) {
    faqs[0].parentNode.insertBefore(counterEl, faqs[0]);
  }

  // Toggle de cada FAQ
  faqs.forEach(function(faq) {
    var btn = faq.querySelector('button');
    if (!btn) return;

    btn.addEventListener('click', function() {
      var isOpen = faq.classList.contains('open');
      faq.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      var sign = btn.querySelector('.sign') || btn.querySelector('span:last-child');
      if (sign) sign.textContent = !isOpen ? '−' : '+';
    });
  });

  // Búsqueda en tiempo real
  if (q) {
    q.addEventListener('input', function() {
      var term = q.value.toLowerCase().trim();
      var visibleCount = 0;

      faqs.forEach(function(faq) {
        var text = faq.textContent.toLowerCase();
        var match = !term || text.indexOf(term) > -1;
        faq.style.display = match ? '' : 'none';
        if (match) {
          visibleCount++;
          if (term) {
            faq.classList.add('open');
            var btn = faq.querySelector('button');
            if (btn) {
              btn.setAttribute('aria-expanded', 'true');
              var sign = btn.querySelector('.sign') || btn.querySelector('span:last-child');
              if (sign) sign.textContent = '−';
            }
          }
        }
      });

      if (term) {
        counterEl.textContent = visibleCount > 0 ?
          (visibleCount + ' pregunta(s) encontrada(s) para "' + term + '":') :
          'No se encontraron preguntas para "' + term + '". Intenta con términos como "urocultivo", "fiebre", "arándano" o consulta con tu equipo tratante.';
      } else {
        counterEl.textContent = '';
      }
    });
  }

  // Canales de contacto
  var btnChat = document.getElementById('btn-chat-paciente');
  if (btnChat) {
    btnChat.addEventListener('click', function() {
      var u = NG.get('user');
      if (u && u.role === 'paciente') {
        location.href = 'paciente.html';
      } else if (u && u.role === 'clinico') {
        location.href = 'clinico.html';
      } else {
        location.href = 'acceso.html';
      }
    });
  }

  var btnTriage = document.getElementById('btn-triage-medico');
  if (btnTriage) {
    btnTriage.addEventListener('click', function() {
      var u = NG.get('user');
      if (u && u.role === 'clinico') {
        location.href = 'clinico.html';
      } else {
        location.href = 'acceso.html';
      }
    });
  }

  var btnSoporte = document.getElementById('btn-soporte-correo');
  if (btnSoporte) {
    btnSoporte.addEventListener('click', function() {
      location.href = 'mailto:soporte@nefroguia.cl?subject=Consulta%20Proyecto%20NefroGu%C3%ADa%20COIL';
    });
  }
})();