/* Informativo: resalta en "En esta guía" la sección que se está leyendo */
(function() {
  var links = [].slice.call(document.querySelectorAll('.toc a'));
  var secs = links.map(function(a) {
    try {
      return document.querySelector(a.getAttribute('href'));
    } catch (e) {
      return null;
    }
  });

  function mark(i) {
    links.forEach(function(a, j) {
      a.classList.toggle('on', i === j);
    });
  }

  links.forEach(function(a, i) {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      if (secs[i]) {
        secs[i].scrollIntoView({
          behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth',
          block: 'start'
        });
        mark(i);
      }
    });
  });

  function onScroll() {
    var y = window.scrollY + 140, c = 0;
    secs.forEach(function(s, i) {
      if (s && (s.getBoundingClientRect().top + window.scrollY <= y)) {
        c = i;
      }
    });
    mark(c);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
