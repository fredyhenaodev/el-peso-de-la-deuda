"""Genera app-asesor/Asesoria.html a partir de asesoria.html, con el puente para guardar en Google Sheets.
Uso: python3 app-asesor/build.py
"""
import pathlib

raiz = pathlib.Path(__file__).resolve().parent.parent
src = (raiz / 'asesoria.html').read_text(encoding='utf8')
assert '<?' not in src, 'asesoria.html no puede tener "<?" (lo usa Apps Script)'

PUENTE = r'''<style>
.ftbar { position: sticky; top: 0; z-index: 40; background: #5A3B25; color: #FFF8EE; font-family: Inter, system-ui, sans-serif; }
.ftbar .in { max-width: 960px; margin: 0 auto; padding: 10px 16px; display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.ftbar a { color: #FFF8EE; font-weight: 700; text-decoration: none; font-size: 15px; }
.ftbar b { font-size: 15px; }
.ftbar .st { font-size: 13px; color: #EBD9C3; }
.ftbar button { border: 0; background: #FFF8EE; color: #5A3B25; font: 700 14px Inter, system-ui, sans-serif; border-radius: 10px; padding: 8px 14px; min-height: 40px; cursor: pointer; }
@media print { .ftbar { display: none !important; } }
</style>
<script>
window.FT_CLIENTE_ID = <?!= JSON.stringify(clienteId) ?>;
window.FT_ESTADO = <?!= estadoJson ?>;
window.FT_BASE = <?!= base ?>;
window.FT_APP_URL = <?!= JSON.stringify(appUrl) ?>;
window.FT_ON_READY = function (api) {
  var GH = 'https://fredyhenaodev.github.io/el-peso-de-la-deuda/';
  var vacio = !window.FT_ESTADO || !Object.keys(window.FT_ESTADO).length;
  api.setState(vacio ? { modo: window.FT_BASE.tipo === 'Persona' ? 'persona' : 'pareja', pareja: window.FT_BASE.nombre || '' } : window.FT_ESTADO);
  // Los enlaces de la página apuntan a GitHub y abren en otra pestaña
  document.querySelectorAll('a[href]').forEach(function (a) {
    var h = a.getAttribute('href');
    if (h && !/^(https?:|#|mailto:)/.test(h)) a.setAttribute('href', GH + h.replace(/^\.\//, ''));
    if (!/^#/.test(a.getAttribute('href'))) a.setAttribute('target', '_blank');
  });
  var intro = document.querySelector('.intro');
  if (intro) intro.innerHTML = intro.innerHTML.replace('Nada se guarda ni se envía.', 'Todo se guarda solo en la ficha del cliente.');
  var bar = document.createElement('div');
  bar.className = 'ftbar noprint';
  bar.innerHTML = '<div class="in"><a target="_top" id="ftBack">← Mis clientes</a><b id="ftNom"></b><span class="st" id="ftSt" aria-live="polite"></span><button type="button" id="ftSave">Guardar</button></div>';
  document.body.insertBefore(bar, document.body.firstChild);
  var back = document.getElementById('ftBack'), st = document.getElementById('ftSt');
  back.href = window.FT_APP_URL + '?id=' + encodeURIComponent(window.FT_CLIENTE_ID);
  document.getElementById('ftNom').textContent = window.FT_BASE.nombre || '';
  st.textContent = vacio ? 'Nueva asesoría · se guarda sola' : 'Guardado';
  var pendiente = false, guardando = false, t = null;
  function hora() { var d = new Date(); return d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' }); }
  function guardar() {
    clearTimeout(t);
    if (guardando) { t = setTimeout(guardar, 800); return; }
    guardando = true; pendiente = false; st.textContent = 'Guardando…';
    var estado = api.getState(), res = api.summary();
    google.script.run
      .withSuccessHandler(function () { guardando = false; st.textContent = pendiente ? 'Cambios sin guardar' : 'Guardado ✓ ' + hora(); document.getElementById('ftNom').textContent = res.nombre || window.FT_BASE.nombre || ''; })
      .withFailureHandler(function (e) { guardando = false; pendiente = true; st.textContent = 'No se guardó: ' + ((e && e.message) || e) + '. Toca Guardar.'; })
      .guardarAsesoria(window.FT_CLIENTE_ID, estado, res);
  }
  api.onChange = function () { pendiente = true; st.textContent = 'Cambios sin guardar'; clearTimeout(t); t = setTimeout(guardar, 1500); };
  document.getElementById('ftSave').addEventListener('click', function (e) { e.stopPropagation(); guardar(); });
  window.addEventListener('beforeunload', function (e) { if (pendiente || guardando) { e.preventDefault(); e.returnValue = ''; } });
};
</script>
'''

marca = '</title>'
assert src.count(marca) == 1
out = src.replace(marca, marca + '\n' + PUENTE, 1)
(raiz / 'app-asesor' / 'Asesoria.html').write_text(out, encoding='utf8')
print('Asesoria.html generado:', len(out), 'caracteres')
