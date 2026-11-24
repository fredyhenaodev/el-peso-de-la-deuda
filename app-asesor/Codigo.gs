/**
 * F&T Asesorías · Mis clientes
 * App para el asesor: lista de clientes, su asesoría guardada y el registro de cada encuentro.
 * Los datos quedan en esta hoja de cálculo (pestañas "Clientes" y "Encuentros").
 *
 * Instalación: ver LEEME.md. Publicar como aplicación web con
 *   Ejecutar como: Yo   ·   Quién tiene acceso: Solo yo
 */

const HOJA_CLIENTES = 'Clientes';
const HOJA_ENCUENTROS = 'Encuentros';

const COL_CLIENTES = ['ID', 'Nombre', 'Tipo', 'Teléfono', 'Estado', 'Fecha asesoría', 'Próximo encuentro',
  'Deuda inicial', 'Deuda actual', '% pagado', 'Abono extra', 'Primera deuda', 'Libres hacia',
  'Notas', 'Actualizado', 'Resumen', 'Datos'];
const COL_ENCUENTROS = ['ID', 'Cliente ID', 'Cliente', 'Fecha', 'Encuentro', 'Deuda hoy',
  'Compromisos', 'Deuda nueva', 'Ánimo', 'Notas', 'Nuevos compromisos', 'Próximo encuentro', 'Creado'];

// ---------- Páginas ----------
function doGet(e) {
  const p = (e && e.parameter) || {};
  const url = ScriptApp.getService().getUrl();
  let t;
  if (p.page === 'asesoria' && p.id) {
    const c = buscarFila_(HOJA_CLIENTES, p.id);
    if (!c) return HtmlService.createHtmlOutput('Cliente no encontrado. <a target="_top" href="' + url + '">Volver</a>');
    t = HtmlService.createTemplateFromFile('Asesoria');
    t.clienteId = p.id;
    t.estadoJson = seguro_(c.obj['Datos'] || '{}');
    t.base = seguro_(JSON.stringify({ nombre: c.obj['Nombre'], tipo: c.obj['Tipo'] }));
    t.appUrl = url;
    return t.evaluate()
      .setTitle('Asesoría · ' + (c.obj['Nombre'] || 'cliente'))
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  t = HtmlService.createTemplateFromFile('Index');
  t.appUrl = url;
  t.abrirId = p.id || '';
  return t.evaluate()
    .setTitle('F&T Asesorías · Mis clientes')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------- API (google.script.run) ----------
function listarClientes() {
  prepararHojas_();
  return leerTodo_(HOJA_CLIENTES).map(o => limpiarCliente_(o));
}

function obtenerCliente(id) {
  prepararHojas_();
  const c = buscarFila_(HOJA_CLIENTES, id);
  if (!c) throw new Error('Cliente no encontrado');
  const enc = leerTodo_(HOJA_ENCUENTROS).filter(o => String(o['Cliente ID']) === String(id))
    .sort((a, b) => String(b['Fecha']).localeCompare(String(a['Fecha'])));
  const cli = limpiarCliente_(c.obj);
  cli['Resumen'] = c.obj['Resumen'] || '';
  cli.tieneAsesoria = !!(c.obj['Datos'] && c.obj['Datos'] !== '{}');
  return { cliente: cli, encuentros: enc };
}

function guardarCliente(datos) {
  prepararHojas_();
  return conCandado_(() => {
    const permitidos = ['Nombre', 'Tipo', 'Teléfono', 'Estado', 'Próximo encuentro', 'Notas'];
    if (!datos.ID) {
      const id = nuevoId_();
      const obj = { 'ID': id, 'Estado': 'Asesoría', 'Tipo': 'Pareja', 'Actualizado': ahora_() };
      permitidos.forEach(k => { if (datos[k] != null) obj[k] = texto_(datos[k]); });
      agregarFila_(HOJA_CLIENTES, obj);
      return id;
    }
    const c = buscarFila_(HOJA_CLIENTES, datos.ID);
    if (!c) throw new Error('Cliente no encontrado');
    permitidos.forEach(k => { if (datos[k] != null) c.obj[k] = texto_(datos[k]); });
    c.obj['Actualizado'] = ahora_();
    escribirFila_(HOJA_CLIENTES, c.fila, c.obj);
    return datos.ID;
  });
}

function guardarAsesoria(id, estado, resumen) {
  prepararHojas_();
  return conCandado_(() => {
    const c = buscarFila_(HOJA_CLIENTES, id);
    if (!c) throw new Error('Cliente no encontrado');
    const json = JSON.stringify(estado || {});
    if (json.length > 45000) throw new Error('La asesoría es demasiado grande para guardarla.');
    const r = resumen || {};
    c.obj['Datos'] = json;
    c.obj['Resumen'] = texto_(r.resumen || '');
    if (r.nombre) c.obj['Nombre'] = texto_(r.nombre);
    c.obj['Tipo'] = r.modo === 'persona' ? 'Persona' : 'Pareja';
    if (!c.obj['Fecha asesoría']) c.obj['Fecha asesoría'] = hoy_();
    c.obj['Deuda inicial'] = Number(r.deuda) || 0;
    if (!tieneEncuentros_(id)) c.obj['Deuda actual'] = Number(r.deuda) || 0;
    c.obj['Abono extra'] = Number(r.extra) || 0;
    c.obj['Primera deuda'] = texto_(r.primera || '');
    c.obj['Libres hacia'] = texto_(r.libreHacia || '');
    if (estado && estado.cita && !c.obj['Próximo encuentro']) c.obj['Próximo encuentro'] = estado.cita;
    c.obj['% pagado'] = pct_(c.obj['Deuda inicial'], c.obj['Deuda actual']);
    c.obj['Actualizado'] = ahora_();
    escribirFila_(HOJA_CLIENTES, c.fila, c.obj);
    return c.obj['Actualizado'];
  });
}

function guardarEncuentro(e) {
  prepararHojas_();
  return conCandado_(() => {
    const c = buscarFila_(HOJA_CLIENTES, e['Cliente ID']);
    if (!c) throw new Error('Cliente no encontrado');
    const campos = ['Fecha', 'Encuentro', 'Deuda hoy', 'Compromisos', 'Deuda nueva', 'Ánimo', 'Notas', 'Nuevos compromisos', 'Próximo encuentro'];
    let obj;
    if (e.ID) {
      const f = buscarFila_(HOJA_ENCUENTROS, e.ID);
      if (!f) throw new Error('Encuentro no encontrado');
      obj = f.obj;
      campos.forEach(k => { if (e[k] != null) obj[k] = k === 'Deuda hoy' ? (Number(e[k]) || 0) : texto_(e[k]); });
      escribirFila_(HOJA_ENCUENTROS, f.fila, obj);
    } else {
      obj = { 'ID': nuevoId_(), 'Cliente ID': c.obj['ID'], 'Cliente': c.obj['Nombre'], 'Creado': ahora_() };
      campos.forEach(k => { if (e[k] != null) obj[k] = k === 'Deuda hoy' ? (Number(e[k]) || 0) : texto_(e[k]); });
      agregarFila_(HOJA_ENCUENTROS, obj);
    }
    actualizarDesdeEncuentros_(c);
    return obj['ID'];
  });
}

function eliminarEncuentro(id) {
  return conCandado_(() => {
    const f = buscarFila_(HOJA_ENCUENTROS, id);
    if (!f) return false;
    const clienteId = f.obj['Cliente ID'];
    SpreadsheetApp.getActive().getSheetByName(HOJA_ENCUENTROS).deleteRow(f.fila);
    const c = buscarFila_(HOJA_CLIENTES, clienteId);
    if (c) actualizarDesdeEncuentros_(c);
    return true;
  });
}

// ---------- Internos ----------
function actualizarDesdeEncuentros_(c) {
  const enc = leerTodo_(HOJA_ENCUENTROS).filter(o => String(o['Cliente ID']) === String(c.obj['ID']))
    .sort((a, b) => String(a['Fecha']).localeCompare(String(b['Fecha'])));
  const ult = enc[enc.length - 1];
  if (ult) {
    if (ult['Deuda hoy'] !== '' && ult['Deuda hoy'] != null) c.obj['Deuda actual'] = Number(ult['Deuda hoy']) || 0;
    if (ult['Próximo encuentro']) c.obj['Próximo encuentro'] = ult['Próximo encuentro'];
    if (c.obj['Estado'] === 'Asesoría') c.obj['Estado'] = 'Acompañamiento';
  }
  c.obj['% pagado'] = pct_(c.obj['Deuda inicial'], c.obj['Deuda actual']);
  c.obj['Actualizado'] = ahora_();
  escribirFila_(HOJA_CLIENTES, c.fila, c.obj);
}

function tieneEncuentros_(id) {
  return leerTodo_(HOJA_ENCUENTROS).some(o => String(o['Cliente ID']) === String(id) && o['Deuda hoy'] !== '');
}

function limpiarCliente_(o) {
  const r = {};
  COL_CLIENTES.forEach(k => { if (k !== 'Datos' && k !== 'Resumen') r[k] = o[k] == null ? '' : o[k]; });
  return r;
}

function prepararHojas_() {
  const ss = SpreadsheetApp.getActive();
  [[HOJA_CLIENTES, COL_CLIENTES], [HOJA_ENCUENTROS, COL_ENCUENTROS]].forEach(([nombre, cols]) => {
    let h = ss.getSheetByName(nombre);
    if (!h) h = ss.insertSheet(nombre);
    if (h.getLastRow() === 0) {
      h.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#efe4d3');
      h.setFrozenRows(1);
      h.getRange('A:Z').setNumberFormat('@'); // todo como texto: fechas y números no se convierten solos
    } else {
      const actuales = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0];
      cols.forEach(k => { if (actuales.indexOf(k) < 0) h.getRange(1, h.getLastColumn() + 1).setValue(k).setFontWeight('bold').setBackground('#efe4d3'); });
    }
  });
}

function encabezados_(h) { return h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0]; }

function leerTodo_(nombre) {
  const h = SpreadsheetApp.getActive().getSheetByName(nombre);
  if (!h || h.getLastRow() < 2) return [];
  const enc = encabezados_(h);
  return h.getRange(2, 1, h.getLastRow() - 1, enc.length).getValues()
    .filter(r => r[0] !== '')
    .map(r => { const o = {}; enc.forEach((k, i) => { o[k] = r[i] instanceof Date ? Utilities.formatDate(r[i], Session.getScriptTimeZone(), 'yyyy-MM-dd') : r[i]; }); return o; });
}

function buscarFila_(nombre, id) {
  const h = SpreadsheetApp.getActive().getSheetByName(nombre);
  if (!h || h.getLastRow() < 2 || !id) return null;
  const ids = h.getRange(2, 1, h.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      const enc = encabezados_(h);
      const fila = i + 2, vals = h.getRange(fila, 1, 1, enc.length).getValues()[0];
      const obj = {}; enc.forEach((k, j) => { obj[k] = vals[j] instanceof Date ? Utilities.formatDate(vals[j], Session.getScriptTimeZone(), 'yyyy-MM-dd') : vals[j]; });
      return { fila, obj };
    }
  }
  return null;
}

function agregarFila_(nombre, obj) {
  const h = SpreadsheetApp.getActive().getSheetByName(nombre);
  const enc = encabezados_(h);
  h.appendRow(enc.map(k => obj[k] == null ? '' : obj[k]));
}

function escribirFila_(nombre, fila, obj) {
  const h = SpreadsheetApp.getActive().getSheetByName(nombre);
  const enc = encabezados_(h);
  h.getRange(fila, 1, 1, enc.length).setValues([enc.map(k => obj[k] == null ? '' : obj[k])]);
}

function conCandado_(fn) {
  const l = LockService.getScriptLock();
  l.waitLock(20000);
  try { return fn(); } finally { l.releaseLock(); }
}

function nuevoId_() { return Utilities.getUuid().slice(0, 8); }
function ahora_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'); }
function hoy_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function pct_(ini, act) { ini = Number(ini) || 0; act = Number(act) || 0; return ini > 0 ? Math.max(0, Math.round((ini - act) / ini * 100)) : 0; }
// Evita que una celda se lea como fórmula (=, +, -, @) y limita el largo
function texto_(v) { let s = String(v == null ? '' : v).slice(0, 5000); if (/^[=+\-@]/.test(s)) s = "'" + s; return s; }
// Para insertar JSON dentro de <script> sin romperlo
function seguro_(json) {
  return String(json).replace(/</g, '\\u003c')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
}

function include(nombre) { return HtmlService.createHtmlOutputFromFile(nombre).getContent(); }
