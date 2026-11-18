const fs = require('fs');
const files = ['index.html', 'informativo.html', 'ayuda.html'];
files.forEach(function(f) {
  const c = fs.readFileSync(f, 'utf8');
  const header = c.match(/<header[^>]*>[\s\S]*?<\/header>/);
  if (!header) return;
  const h = header[0];
  const noIniciar = !h.includes('Iniciar seguimiento');
  const noPortal = !h.includes('clinico.html');
  const hasAcceso = h.includes('acceso.html');
  const btnCount = (h.match(/class="btn"/g) || []).length;
  console.log(f + ': noIniciarSeguimiento=' + noIniciar + ' noPortalLink=' + noPortal + ' hasAcceso=' + hasAcceso + ' btnCount=' + btnCount);
});
