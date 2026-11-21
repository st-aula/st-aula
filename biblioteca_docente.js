/* ============================================================
 * Biblioteca · módulo del docente para la página de notas (v1.0)
 * - «📲 Enviar a representante» en la ficha del estudiante
 * - Sección «Biblioteca» (#bib): materiales, actividades del curso y códigos
 * Solo LEE los datos de la página de notas. No escribe en sus cuadros.
 * Habla únicamente con el servidor de la BIBLIOTECA (config_biblioteca.js).
 * No guarda teléfonos ni correos.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.BIB_CONFIG || {};
  var URL_BIB = String(CFG.url || '').trim();
  var WEB_BIB = String(CFG.web || '').trim().replace(/\/?$/, '/');
  var DIAS_OP = [[1, '1 día'], [3, '3 días'], [7, '7 días'], [15, '15 días'], [30, '30 días'], [60, '60 días']];
  var EST_TXT = { INA: 'por inasistencia', CLASE: 'no la presentó en clase', VENC: 'plazo vencido', PLAZO: 'aún en plazo' };
  var ESTADO = null, MODAL = null;

  function q(id) { return document.getElementById(id); }
  function e(s) { return (window.esc || function (x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); })(s); }
  function aviso(t, ms) { if (window.toast) window.toast(t, ms); }
  function dm(s) { if (!/^\d{4}-\d\d-\d\d$/.test(s || '')) return ''; var p = s.split('-'); return p[2] + '/' + p[1]; }
  function hoyISO() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function titulo(n) { return String(n || '').toLowerCase().replace(/(^|[\s'-])([a-záéíóúñü])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  function listo() { return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(URL_BIB); }
  function docente() { var m = (window.DB && DB.meta) || {}; return String(m.docente || 'su docente'); }

  function token() {
    var U = window.USER;
    if (U && typeof U.getIdToken === 'function') return U.getIdToken();
    return Promise.reject(new Error('Ingrese con su cuenta de Google para usar la biblioteca.'));
  }
  function servidor(accion, datos) {
    if (!listo()) return Promise.reject(new Error('Falta configurar la biblioteca (config_biblioteca.js).'));
    return token().then(function (tk) {
      return fetch(URL_BIB, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: 'doc', token: tk, accion: accion, datos: datos || {} }), redirect: 'follow' })
        .then(function (r) { if (!r.ok) throw new Error('red'); return r.json(); }, function () { throw new Error('No se pudo conectar con la biblioteca. Revise su internet.'); })
        .then(function (j) { if (!j || typeof j !== 'object') throw new Error('No se pudo conectar con la biblioteca.'); if (!j.ok) throw new Error(j.mensaje || 'No se pudo completar.'); return j.datos; },
          function (er) { throw new Error(er && er.message && er.message !== 'red' ? er.message : 'No se pudo conectar con la biblioteca. Revise su internet.'); });
    });
  }

  /* Actividades del curso tomadas de la foto de la página de notas (solo datos del curso) */
  function actsCurso(C) {
    var L = (C && C.rp && Array.isArray(C.rp.acts)) ? C.rp.acts : [];
    return L.map(function (a) { return { a: String(a.asignatura || ''), comp: String(a.componente || ''), tit: String(a.titulo || ''), envio: String(a.envio || ''), entrega: String(a.entrega || ''), enlace: String(a.enlace || ''), tr: Number(a.trimestre) || 0 }; })
      .filter(function (a) { return a.tit; });
  }

  /* ───────── Estilos propios (no cambian los de la página) ───────── */
  var css = document.createElement('style');
  css.textContent = '.bibOv{position:fixed;inset:0;background:rgba(11,37,69,.45);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:14px;overflow:auto}' +
    '.bibMo{background:#fff;border-radius:18px;max-width:560px;width:100%;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.25);border-top:5px solid #FFC000}' +
    '.bibMo h3{margin:0;color:#0B3D91;font-size:17px}.bibSub{font-size:12px;font-weight:bold;color:#5B6577;margin:12px 0 4px;text-transform:uppercase;letter-spacing:.3px}' +
    '.bibChk{display:flex;gap:10px;align-items:flex-start;padding:8px 6px;border-bottom:1px solid #EEF1F6;cursor:pointer}.bibChk input{margin-top:3px;width:18px;height:18px;flex:none}' +
    '.bibChk small{display:block;color:#5B6577}.bibMsg{background:#EAF6EE;border:1px solid #CDE9D6;border-radius:12px;padding:10px;font-size:13.5px;white-space:pre-wrap;max-height:220px;overflow:auto;color:#0B2545}' +
    '.bibCod{font-family:Consolas,monospace;font-size:20px;font-weight:bold;color:#0B3D91;letter-spacing:2px}.bibRow{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
    '.bibBtns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.bibBtns .btn{flex:1;min-width:120px}.bibX{border:0;background:#EEF3FB;border-radius:10px;width:34px;height:34px;font-size:18px;cursor:pointer}' +
    '.bibF input,.bibF select,.bibF textarea{width:100%;font-size:15px;padding:9px 10px;border:1.5px solid #D5E0F2;border-radius:12px;font-family:inherit;margin-bottom:8px;box-sizing:border-box}' +
    '.bibG2{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}';
  document.head.appendChild(css);

  /* ───────── 📲 Enviar a representante ───────── */
  window.bibEnviar = function (cid, i) {
    var C = window.DB && DB.cursos && DB.cursos[cid], E = C && C.e[i];
    if (!E) { aviso('No se encontró el estudiante.'); return; }
    var hoy = hoyISO();
    var pend = (E.pe || []).filter(function (p) { return p.st !== 'REC'; });
    var prox = actsCurso(C).filter(function (a) { return a.entrega && a.entrega >= hoy; }).sort(function (a, b) { return a.entrega.localeCompare(b.entrega); }).slice(0, 15);
    MODAL = { C: C, E: E, i: i, pend: pend, prox: prox, selP: {}, selA: {}, incluir: listo(), dias: 7, codigo: '', caduca: '', estado: listo() ? 'creando' : 'sin', usado: false, err: '' };
    pend.forEach(function (p, k) { if (p.st !== 'PLAZO') MODAL.selP[k] = 1; });
    pintarModal();
    if (MODAL.incluir) crearCodigoModal();
  };

  function crearCodigoModal() {
    var M = MODAL; M.estado = 'creando'; M.err = ''; pintarModal();
    servidor('crearCodigo', { curso_id: M.C.id, curso: M.C.c, estudiante: M.E.n, dias: M.dias, acts: actsCurso(M.C) }).then(function (r) {
      if (MODAL !== M) { servidor('anularCodigo', { codigo: r.codigo }).catch(function () {}); return; }
      M.codigo = r.codigo; M.caduca = r.caduca; M.estado = 'listo'; ESTADO = null; pintarModal();
    }, function (er) { if (MODAL !== M) return; M.estado = 'error'; M.err = er.message; pintarModal(); });
  }

  function cambiarDias(d) {
    var M = MODAL; M.dias = d;
    if (!M.codigo) { if (M.incluir) crearCodigoModal(); else pintarModal(); return; }
    M.estado = 'creando'; pintarModal();
    servidor('cambiarCaducidad', { codigo: M.codigo, dias: d }).then(function (r) { if (MODAL !== M) return; M.caduca = r.caduca; M.estado = 'listo'; ESTADO = null; pintarModal(); },
      function (er) { if (MODAL !== M) return; M.estado = 'error'; M.err = er.message; pintarModal(); });
  }

  function mensaje(M) {
    var est = titulo(M.E.n), L = [];
    L.push(window.saludo ? window.saludo() + '.' : 'Buenos días.');
    L.push('Estimado/a representante de ' + est + ' (' + M.C.c + '): le saluda ' + docente() + '.');
    var P = M.pend.filter(function (p, k) { return M.selP[k]; });
    if (P.length) {
      L.push(''); L.push('Trabajos pendientes:');
      P.forEach(function (p) { L.push('• ' + p.t + ' (' + p.a + ') – ' + (EST_TXT[p.st] || 'pendiente') + (p.st === 'PLAZO' && p.h ? ', puede entregarla hasta el ' + dm(p.h) : (p.ent ? ', entrega ' + dm(p.ent) : ''))); });
    }
    var A = M.prox.filter(function (a, k) { return M.selA[k]; });
    if (A.length) {
      L.push(''); L.push('Próximas actividades del curso:');
      A.forEach(function (a) { L.push('• ' + a.tit + ' (' + a.a + ') – entrega ' + dm(a.entrega)); });
    }
    if (M.incluir && M.codigo) {
      L.push(''); L.push('Puede ver las actividades y materiales del curso aquí:');
      L.push(WEB_BIB + '?c=' + M.codigo);
      L.push('Su código personal: ' + M.codigo + ' (válido hasta el ' + M.caduca + ')');
    }
    L.push(''); L.push('Saludos cordiales.');
    return L.join('\n');
  }

  function pintarModal() {
    var M = MODAL; if (!M) return;
    var ov = q('bibOv');
    if (!ov) { ov = document.createElement('div'); ov.id = 'bibOv'; ov.className = 'bibOv noprint'; ov.addEventListener('click', function (ev) { if (ev.target === ov) cerrarModal(); }); document.body.appendChild(ov); }
    var esperando = M.incluir && M.estado === 'creando';
    var h = '<div class="bibMo" role="dialog" aria-modal="true" aria-labelledby="bibT"><div class="bibRow" style="justify-content:space-between"><h3 id="bibT">Enviar a representante</h3><button class="bibX" type="button" aria-label="Cerrar" onclick="bibCerrar()">×</button></div>' +
      '<div class="muted" style="margin-top:2px">' + e(M.E.n) + ' · ' + e(M.C.c) + (M.E.r ? ' · Representante: ' + e(M.E.r) : '') + '</div>';
    h += '<div class="bibSub">Lo que no ha entregado</div>';
    h += M.pend.length ? M.pend.map(function (p, k) { return '<label class="bibChk"><input type="checkbox" ' + (M.selP[k] ? 'checked' : '') + ' onchange="bibMarca(\'P\',' + k + ',this.checked)"><span><b>' + e(p.t) + '</b><small>' + e(p.a) + ' · ' + e(EST_TXT[p.st] || 'pendiente') + (p.ent ? ' · entrega ' + dm(p.ent) : '') + '</small></span></label>'; }).join('') : '<div class="muted" style="padding:6px">No tiene trabajos pendientes. ✅</div>';
    h += '<div class="bibSub">Próximas actividades del curso (marque las que quiera)</div>';
    h += M.prox.length ? M.prox.map(function (a, k) { return '<label class="bibChk"><input type="checkbox" ' + (M.selA[k] ? 'checked' : '') + ' onchange="bibMarca(\'A\',' + k + ',this.checked)"><span><b>' + e(a.tit) + '</b><small>' + e(a.a) + ' · entrega ' + dm(a.entrega) + '</small></span></label>'; }).join('') : '<div class="muted" style="padding:6px">No hay actividades próximas registradas en este curso.</div>';
    h += '<div class="bibSub">Acceso a la biblioteca</div>';
    if (!listo()) h += '<div class="muted">La biblioteca aún no está configurada: el mensaje se enviará sin código.</div>';
    else {
      h += '<label class="bibChk" style="border:0"><input type="checkbox" ' + (M.incluir ? 'checked' : '') + ' onchange="bibIncluir(this.checked)"><span><b>Incluir enlace y código personal</b><small>El representante verá las actividades y materiales del curso, sin notas.</small></span></label>';
      if (M.incluir) {
        h += '<div class="bibRow"><span class="muted">Válido por</span><select style="width:auto;flex:1;min-width:120px;padding:8px" onchange="bibDias(this.value)" ' + (esperando ? 'disabled' : '') + '>' + DIAS_OP.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === M.dias ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
          '<span class="bibCod">' + (M.codigo ? e(M.codigo) : (esperando ? '…' : '—')) + '</span></div>';
        if (esperando) h += '<div class="muted" style="margin-top:4px">Preparando el código…</div>';
        else if (M.estado === 'error') h += '<div style="color:#C00000;margin-top:4px">' + e(M.err) + ' <a href="javascript:void 0" onclick="bibReintentar()">Reintentar</a></div>';
        else if (M.caduca) h += '<div class="muted" style="margin-top:4px">Válido hasta el ' + e(M.caduca) + '</div>';
      }
    }
    h += '<div class="bibSub">Mensaje</div><div class="bibMsg" id="bibMsgT">' + e(mensaje(M)) + '</div>';
    var bloq = esperando ? ' disabled style="opacity:.55"' : '';
    h += '<div class="bibBtns"><button type="button" class="btn bw" onclick="bibMandar(\'wa\')"' + bloq + '>💬 WhatsApp</button><button type="button" class="btn bp" onclick="bibMandar(\'gm\')"' + bloq + '>✉️ Gmail</button><button type="button" class="btn bo" onclick="bibMandar(\'cp\')"' + bloq + '>📋 Copiar</button></div>' +
      '<div class="muted" style="margin-top:8px;text-align:center">WhatsApp y Gmail se abren con el mensaje escrito: usted elige el chat o escribe el correo. <a href="javascript:void 0" onclick="bibMandar(\'mt\')"' + '>Otro correo</a> · <a href="#bib/' + e(M.C.id) + '" onclick="bibCerrar()">Abrir Biblioteca</a></div></div>';
    ov.innerHTML = h;
  }

  window.bibMarca = function (t, k, v) { var M = MODAL; if (!M) return; var s = t === 'P' ? M.selP : M.selA; if (v) s[k] = 1; else delete s[k]; var m = q('bibMsgT'); if (m) m.textContent = mensaje(M); };
  window.bibIncluir = function (v) { var M = MODAL; if (!M) return; M.incluir = !!v; if (v && !M.codigo && M.estado !== 'creando') crearCodigoModal(); else pintarModal(); };
  window.bibDias = function (v) { if (MODAL) cambiarDias(Number(v)); };
  window.bibReintentar = function () { var M = MODAL; if (!M) return; if (M.codigo) cambiarDias(M.dias); else crearCodigoModal(); };
  window.bibMandar = function (tipo) {
    var M = MODAL; if (!M) return;
    if (M.incluir && M.estado === 'creando') return;
    var t = mensaje(M), asunto = 'Información de ' + titulo(M.E.n) + ' · ' + M.C.c;
    if (M.incluir && M.codigo) M.usado = true;
    if (tipo === 'wa') window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener');
    else if (tipo === 'gm') window.open('https://mail.google.com/mail/?view=cm&fs=1&su=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(t), '_blank', 'noopener');
    else if (tipo === 'mt') location.href = 'mailto:?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(t);
    else copiar(t);
  };
  function copiar(t) {
    var ok = function () { aviso('Mensaje copiado. Péguelo en WhatsApp o en el correo.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { copiar2(t, ok); });
    else copiar2(t, ok);
  }
  function copiar2(t, ok) { var x = document.createElement('textarea'); x.value = t; x.style.position = 'fixed'; x.style.opacity = '0'; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); ok(); } catch (er) { aviso('No se pudo copiar.'); } x.remove(); }
  function cerrarModal() {
    var M = MODAL; MODAL = null;
    var ov = q('bibOv'); if (ov) ov.remove();
    if (M && M.codigo && !M.usado) servidor('anularCodigo', { codigo: M.codigo }).then(function () { ESTADO = null; }, function () {});
  }
  window.bibCerrar = cerrarModal;
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && MODAL) cerrarModal(); });

  /* ───────── Sección «Biblioteca» (#bib/curso) ───────── */
  var VB = { cid: '', edit: null, cargando: false, err: '' };
  window.verBiblioteca = function (cid) {
    var L = window.cursos ? window.cursos() : [];
    if (!L.length) { q('app').innerHTML = '<div class="wrap"><div class="card vac">No hay cursos.</div></div>'; return; }
    VB.cid = (cid && DB.cursos[cid]) ? cid : (VB.cid && DB.cursos[VB.cid] ? VB.cid : L[0].id);
    if (q('tt')) q('tt').textContent = 'Biblioteca';
    pintarBib();
    if (!ESTADO && !VB.cargando) cargarEstado();
  };
  function cargarEstado() {
    if (!listo()) { pintarBib(); return; }
    VB.cargando = true; VB.err = ''; pintarBib();
    servidor('estado').then(function (r) { ESTADO = r; VB.cargando = false; if (enBib()) pintarBib(); }, function (er) { VB.cargando = false; VB.err = er.message; if (enBib()) pintarBib(); });
  }
  function enBib() { return /^#bib(\/|$)/.test(location.hash); }
  function pintarBib() {
    var C = DB.cursos[VB.cid], hoy = hoyISO(), L = window.cursos();
    var h = '<div class="wrap"><div class="card"><div class="h">📚 Biblioteca para representantes</div><div class="muted" style="margin-bottom:8px">Lo que publique aquí lo ven los representantes con su código personal. Nunca ven notas ni datos de estudiantes.</div>' +
      '<select onchange="ir(\'bib/\'+encodeURIComponent(this.value))">' + L.map(function (c) { return '<option value="' + e(c.id) + '"' + (c.id === VB.cid ? ' selected' : '') + '>' + e(c.c) + '</option>'; }).join('') + '</select>' +
      (WEB_BIB && listo() ? '<div class="muted" style="margin-top:8px">Página de los representantes: <a href="' + e(WEB_BIB) + '" target="_blank" rel="noopener">' + e(WEB_BIB.replace(/^https:\/\//, '')) + '</a></div>' : '') + '</div>';
    if (!listo()) { h += '<div class="card"><b>Falta configurar la biblioteca.</b><div class="muted">Suba el archivo config_biblioteca.js con el enlace de su servidor de la biblioteca.</div></div></div>'; q('app').innerHTML = h; return; }
    if (VB.err) h += '<div class="card" style="border-color:#F7C9C9;background:#FFF5F5"><b style="color:#C00000">' + e(VB.err) + '</b> <a href="javascript:void 0" onclick="bibRecargar()">Reintentar</a></div>';
    // actividades del curso
    var acts = actsCurso(C), proxN = acts.filter(function (a) { return a.entrega && a.entrega >= hoy; }).length;
    var pub = ESTADO ? (ESTADO.cursos || []).filter(function (x) { return x.curso_id === C.id; })[0] : null;
    h += '<div class="card"><div class="h">Actividades del curso (vienen de su sistema)</div><div class="muted">' + acts.length + ' actividad(es) · ' + proxN + ' próxima(s). ' + (pub ? 'Publicadas: ' + e(pub.actualizado.replace('T', ' ')) : 'Aún no publicadas en la biblioteca.') + '</div>' +
      '<div class="acts" style="margin-top:8px"><button class="btn bo" onclick="bibPublicar()">🔄 Publicar actividades del curso</button></div><div class="muted" style="text-align:center">También se publican solas cada vez que envía un código a un representante.</div></div>';
    // materiales
    var mats = ESTADO ? (ESTADO.materiales || []).filter(function (m) { return m.curso_id === C.id; }) : [];
    var IC = { GUIA: '📄 Guía', VIDEO: '▶️ Video', ENLACE: '🔗 Enlace', TAREA: '✏️ Tarea' };
    h += '<div class="card"><div class="h">Materiales y tareas publicadas</div>' + (VB.cargando && !ESTADO ? '<div class="muted">Cargando…</div>' : (mats.length ? mats.map(function (m) {
      return '<div class="li" style="cursor:default"><div class="x"><b>' + e(m.titulo) + '</b><small>' + e(IC[m.tipo] || m.tipo) + (m.asignatura ? ' · ' + e(m.asignatura) : '') + (m.entrega ? ' · entrega ' + dm(m.entrega) : '') + '</small></div><button class="btn bo" style="flex:0 0 auto;min-width:0;padding:6px 10px" onclick="bibEditar(\'' + e(m.id) + '\')">Editar</button><button class="btn bo" style="flex:0 0 auto;min-width:0;padding:6px 10px;color:#C00000;border-color:#C00000" onclick="bibBorrar(\'' + e(m.id) + '\')">Quitar</button></div>';
    }).join('') : '<div class="muted">Todavía no hay materiales en este curso.</div>'));
    var M = VB.edit || { tipo: 'GUIA' };
    h += '<div class="bibF" style="margin-top:10px"><div class="bibSub">' + (VB.edit && VB.edit.id ? 'Editar material' : 'Agregar material o tarea') + '</div><div class="bibG2"><select id="bmT">' + [['GUIA', '📄 Guía (PDF, documento)'], ['VIDEO', '▶️ Video'], ['ENLACE', '🔗 Enlace'], ['TAREA', '✏️ Tarea con fecha']].map(function (o) { return '<option value="' + o[0] + '"' + (M.tipo === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
      '<select id="bmA"><option value="">Asignatura (opcional)</option>' + (C.as || []).map(function (a) { return '<option' + (M.asignatura === a ? ' selected' : '') + '>' + e(a) + '</option>'; }).join('') + '</select></div>' +
      '<input id="bmTi" maxlength="200" placeholder="Título, por ejemplo: Guía 3 · Potenciación" value="' + e(M.titulo || '') + '">' +
      '<input id="bmE" maxlength="600" placeholder="Enlace (https://…) de Drive o YouTube" value="' + e(M.enlace || '') + '">' +
      '<div class="bibG2"><input id="bmF" type="date" value="' + e(M.entrega || '') + '" aria-label="Fecha de entrega (solo tareas)"><input id="bmD" maxlength="1000" placeholder="Indicación corta (opcional)" value="' + e(M.descripcion || '') + '"></div>' +
      '<div class="acts"><button class="btn bp" onclick="bibGuardarMat()">💾 Guardar</button>' + (VB.edit && VB.edit.id ? '<button class="btn bo" onclick="bibEditar(\'\')">Cancelar</button>' : '') + '</div>' +
      '<div class="muted">Consejo: en Drive, comparta el PDF como «Cualquier persona con el enlace · Lector» y desactive la descarga para lectores.</div></div></div>';
    // códigos
    var cods = ESTADO ? (ESTADO.codigos || []).filter(function (c) { return c.curso_id === C.id; }) : [];
    h += '<div class="card"><div class="h">Códigos de representantes</div>' + (cods.length ? cods.map(function (c) {
      return '<div class="li" style="cursor:default"><div class="x"><b style="font-family:Consolas,monospace;letter-spacing:1px">' + e(c.codigo) + '</b><small>' + e(titulo(c.estudiante)) + ' · ' + (c.vigente ? 'hasta el ' + e(c.caduca) : 'caducó el ' + e(c.caduca)) + ' · ' + c.usos + ' ingreso(s)</small></div><span class="pill ' + (c.vigente ? 'pv' : 'pr') + '">' + (c.vigente ? 'Vigente' : 'Caducado') + '</span>' +
        (c.vigente ? '<button class="btn bo" style="flex:0 0 auto;min-width:0;padding:6px 10px;color:#C00000;border-color:#C00000" onclick="bibAnular(\'' + e(c.codigo) + '\')">Anular</button>' : '') + '</div>';
    }).join('') : '<div class="muted">' + (VB.cargando && !ESTADO ? 'Cargando…' : 'Aún no ha enviado códigos en este curso. Se crean desde la ficha del estudiante con «📲 Enviar a representante».') + '</div>') + '</div></div>';
    q('app').innerHTML = h;
  }
  function trabajando(p, ok) {
    if (window.ocupado) try { window.ocupado(true); } catch (x) {}
    return p.then(function (r) { ESTADO = r; VB.err = ''; if (ok) aviso(ok); if (enBib()) pintarBib(); }, function (er) { aviso(er.message, 5000); })
      .then(function () { if (window.ocupado) try { window.ocupado(false); } catch (x) {} });
  }
  window.bibRecargar = function () { ESTADO = null; cargarEstado(); };
  window.bibPublicar = function () { var C = DB.cursos[VB.cid]; trabajando(servidor('publicarCurso', { curso_id: C.id, curso: C.c, acts: actsCurso(C) }), 'Actividades publicadas en la biblioteca.'); };
  window.bibEditar = function (id) { VB.edit = id ? ((ESTADO && ESTADO.materiales) || []).filter(function (m) { return m.id === id; })[0] || null : null; pintarBib(); var t = q('bmTi'); if (t && id) t.focus(); };
  window.bibBorrar = function (id) { if (!confirm('¿Quitar este material de la biblioteca? Los representantes ya no lo verán.')) return; trabajando(servidor('eliminarMaterial', { id: id }), 'Material quitado.'); };
  window.bibAnular = function (cod) { if (!confirm('¿Anular el código ' + cod + '? Ese representante ya no podrá entrar.')) return; trabajando(servidor('anularCodigo', { codigo: cod }), 'Código anulado.'); };
  window.bibGuardarMat = function () {
    var C = DB.cursos[VB.cid], tipo = q('bmT').value, tit = q('bmTi').value.trim(), enl = q('bmE').value.trim(), f = q('bmF').value;
    if (!tit) { aviso('Escriba el título.'); q('bmTi').focus(); return; }
    if (enl && !/^https:\/\//i.test(enl)) { aviso('El enlace debe empezar con https://'); q('bmE').focus(); return; }
    if (tipo !== 'TAREA' && !enl) { aviso('Pegue el enlace del material.'); q('bmE').focus(); return; }
    var d = { id: VB.edit && VB.edit.id || '', curso_id: C.id, curso: C.c, tipo: tipo, asignatura: q('bmA').value, titulo: tit, enlace: enl, entrega: f, descripcion: q('bmD').value.trim() };
    trabajando(servidor('guardarMaterial', d).then(function (r) { VB.edit = null; return r; }), 'Material guardado.');
  };
})();
