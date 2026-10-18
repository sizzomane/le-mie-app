/* Backup condiviso per le tre app (Esami, Piano studio, Conti).
   Tutte stanno sullo stesso indirizzo (sizzomane.github.io), quindi un solo file
   salva e ripristina i dati di tutte. Si include con:
   <script src="backup.js" data-base="./"></script>
   data-base = percorso della cartella principale (serve per i link alle altre app). */
(function () {
  'use strict';
  var KEYS = [
    'pianificatore-esami-v1',
    'pianificatore-esami-materie-v1',
    'pianoStudio.v1',
    'divisore-conti:v1'
  ];
  var LAST = 'le-mie-app:ultimo-backup';
  var SAFETY = 'le-mie-app:prima-ripristino';
  var GIORNI_AVVISO = 14;

  var script = document.currentScript;
  var base = (script && script.getAttribute('data-base')) || './';
  var setItemOriginale = Storage.prototype.setItem;

  function ls(op, k, v) {
    try { return op === 'get' ? localStorage.getItem(k) : setItemOriginale.call(localStorage, k, v); }
    catch (e) { return null; }
  }

  function costruisci() {
    var data = {};
    KEYS.forEach(function (k) { var v = ls('get', k); if (v !== null) data[k] = v; });
    return { app: 'le-mie-app', versione: 1, data: new Date().toISOString(), dati: data };
  }
  function testo() { return JSON.stringify(costruisci(), null, 1); }

  function giorniDalBackup() {
    var t = ls('get', LAST);
    if (!t) return null;
    var d = new Date(t);
    if (isNaN(d)) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }
  function haDati() { return KEYS.some(function (k) { return ls('get', k) !== null; }); }


  /* ---------- schermo acceso durante il Pomodoro ---------- */
  var wakeVoluto = false, wakeLock = null;
  function wakeRichiedi() {
    if (!wakeVoluto || !navigator.wakeLock || document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then(function (l) {
      wakeLock = l;
      l.addEventListener('release', function () { if (wakeLock === l) wakeLock = null; });
    }, function () {});
  }
  window.lmaWake = function (on) {
    wakeVoluto = !!on;
    if (on) { if (!wakeLock) wakeRichiedi(); }
    else if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
  };
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') wakeRichiedi(); });

  /* ---------- esami nel Calendario dell'iPhone (.ics) ---------- */
  function esamiDaCalendario() {
    var out = [];
    try {
      var o = JSON.parse(ls('get', 'pianificatore-esami-v1') || '{}');
      Object.keys(o).forEach(function (k) {
        var v = o[k];
        if (!v || v.type !== 'exam') return;
        var p = k.split('-').map(Number);
        if (p.length !== 3 || p.some(isNaN)) return;
        out.push({ y: p[0], m: p[1], d: p[2], nome: v.examName || 'Esame' });
      });
    } catch (e) {}
    return out;
  }
  function due(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + due(d.getMonth() + 1) + due(d.getDate()); }
  function esc(t) { return String(t).replace(/([,;\\])/g, '\\$1').replace(/\n/g, ' '); }
  function costruisciIcs(es) {
    var righe = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//le-mie-app//Esami//IT', 'CALSCALE:GREGORIAN'];
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    es.forEach(function (e) {
      var inizio = new Date(e.y, e.m, e.d), fine = new Date(e.y, e.m, e.d + 1);
      righe.push('BEGIN:VEVENT', 'UID:esame-' + e.y + '-' + e.m + '-' + e.d + '-' + encodeURIComponent(e.nome) + '@le-mie-app',
        'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + ymd(inizio), 'DTEND;VALUE=DATE:' + ymd(fine),
        'SUMMARY:' + esc('Esame: ' + e.nome),
        'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc('Domani: ' + e.nome), 'END:VALARM',
        'END:VEVENT');
    });
    righe.push('END:VCALENDAR');
    return righe.join('\r\n') + '\r\n';
  }
  function esportaIcs() {
    var es = esamiDaCalendario();
    if (!es.length) { msg('Nessun esame segnato nel calendario (tipo "Esame").', false); return; }
    var t = costruisciIcs(es), nome = 'esami.ics';
    var file = null;
    try { file = new File([t], nome, { type: 'text/calendar' }); } catch (e) {}
    function giu() {
      try {
        var url = URL.createObjectURL(new Blob([t], { type: 'text/calendar' }));
        var a = document.createElement('a');
        a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        msg(es.length + (es.length === 1 ? ' esame esportato.' : ' esami esportati.'), true);
      } catch (e) { msg('Esportazione non riuscita.', false); }
    }
    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      navigator.share({ files: [file], title: 'Esami' }).then(function () { msg('Esami esportati.', true); },
        function (e) { if (!e || e.name !== 'AbortError') giu(); });
    } else giu();
  }

  /* ---------- interfaccia ---------- */
  var css = [
    ':root{--lma-bg:#fff;--lma-ink:#1c1c1e;--lma-mut:#6b6b70;--lma-line:#e2e2e7;--lma-fill:#f2f2f7;--lma-acc:#0a64d8;--lma-bad:#c62828;--lma-ok:#2e7d32}',
    '@media(prefers-color-scheme:dark){:root{--lma-bg:#1c1c1e;--lma-ink:#f2f2f7;--lma-mut:#9a9aa1;--lma-line:#38383a;--lma-fill:#2c2c2e;--lma-acc:#4c9bff;--lma-bad:#ff7b72;--lma-ok:#6fcf7f}}',
    '#lma-btn{position:fixed;z-index:2147483000;right:10px;top:calc(env(safe-area-inset-top,0px) + 8px);width:34px;height:34px;border-radius:50%;border:1px solid var(--lma-line);background:var(--lma-bg);color:var(--lma-ink);opacity:.82;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.15)}',
    '#lma-btn svg{width:18px;height:18px}',
    '#lma-btn.avviso::after{content:"";position:absolute;top:-1px;right:-1px;width:10px;height:10px;border-radius:50%;background:#e5484d;border:2px solid var(--lma-bg)}',
    '#lma-ov{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}',
    '#lma-ov[hidden]{display:none}',
    '#lma-sheet{box-sizing:border-box;width:100%;max-width:560px;max-height:88vh;overflow:auto;background:var(--lma-bg);color:var(--lma-ink);border-radius:18px 18px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));font:15px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}',
    '#lma-sheet h2{margin:0 0 4px;font-size:20px}',
    '#lma-sheet p{margin:6px 0;color:var(--lma-mut);font-size:14px}',
    '#lma-sheet .r{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}',
    '#lma-sheet button.b,#lma-sheet label.b{font:inherit;font-weight:600;padding:10px 14px;border-radius:12px;border:1px solid var(--lma-line);background:var(--lma-fill);color:var(--lma-ink);cursor:pointer}',
    '#lma-sheet .p{background:var(--lma-acc);border-color:var(--lma-acc);color:#fff}',
    '#lma-sheet textarea{box-sizing:border-box;width:100%;min-height:90px;font:12px/1.3 ui-monospace,Menlo,monospace;border:1px solid var(--lma-line);border-radius:10px;padding:8px;background:var(--lma-fill);color:var(--lma-ink)}',
    '#lma-sheet h3{margin:16px 0 0;font-size:15px}',
    '#lma-msg{min-height:20px;font-size:14px;margin-top:6px}',
    '#lma-sheet a{color:var(--lma-acc);text-decoration:none;font-weight:600}',
    '#lma-sheet .app{display:flex;gap:14px;flex-wrap:wrap;margin-top:6px}'
  ].join('');

  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var btn = document.createElement('button');
  btn.id = 'lma-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Backup e ripristino dei dati');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3"/></svg>';

  var ov = document.createElement('div');
  ov.id = 'lma-ov';
  ov.hidden = true;
  ov.innerHTML =
    '<div id="lma-sheet" role="dialog" aria-modal="true" aria-label="Backup">' +
      '<h2>Backup dei dati</h2>' +
      '<p id="lma-info"></p>' +
      '<div class="r"><button class="b p" id="lma-save" type="button">Salva backup</button>' +
      '<button class="b" id="lma-copy" type="button">Copia testo</button>' +
      '<button class="b" id="lma-ics" type="button">Esami nel Calendario</button></div>' +
      '<h3>Ripristina</h3>' +
      '<p>Sostituisce i dati di tutte e tre le app con quelli del backup.</p>' +
      '<div class="r"><label class="b" for="lma-file">Scegli file</label>' +
      '<input id="lma-file" type="file" accept=".json,application/json,text/plain" hidden>' +
      '<button class="b" id="lma-paste" type="button">Incolla testo</button></div>' +
      '<textarea id="lma-txt" hidden spellcheck="false" autocapitalize="off" autocorrect="off" placeholder="Incolla qui il backup"></textarea>' +
      '<div class="r" id="lma-go-row" hidden><button class="b p" id="lma-go" type="button">Ripristina dal testo</button></div>' +
      '<div id="lma-msg" role="status"></div>' +
      '<h3>Le tue app</h3>' +
      '<div class="app"><a href="' + base + '">Esami</a><a href="' + base + 'piano-studio.html">Piano studio</a><a href="' + base + 'conti/">Conti</a><a href="' + base + 'home/">Home</a></div>' +
      '<div class="r"><button class="b" id="lma-close" type="button">Chiudi</button></div>' +
    '</div>';

  function $(id) { return document.getElementById(id); }
  function msg(t, ok) {
    var m = $('lma-msg');
    m.textContent = t;
    m.style.color = ok === false ? 'var(--lma-bad)' : ok ? 'var(--lma-ok)' : 'inherit';
  }

  function aggiornaStato() {
    var g = giorniDalBackup();
    var info;
    if (g === null) info = 'Non hai ancora fatto nessun backup. I dati stanno solo su questo telefono: se Safari li cancella, si perdono.';
    else if (g === 0) info = 'Ultimo backup: oggi.';
    else info = 'Ultimo backup: ' + g + (g === 1 ? ' giorno fa.' : ' giorni fa.');
    var persist = window.__lmaPersist;
    if (persist === true) info += ' Memoria protetta dal browser.';
    else if (persist === false) info += ' Il browser potrebbe cancellare i dati se manca spazio: fai un backup ogni tanto.';
    $('lma-info').textContent = info;
    btn.classList.toggle('avviso', haDati() && (g === null || g >= GIORNI_AVVISO));
  }

  function segnaFatto() { ls('set', LAST, new Date().toISOString()); aggiornaStato(); }

  function salva() {
    var t = testo();
    var nome = 'backup-le-mie-app-' + new Date().toISOString().slice(0, 10) + '.json';
    var file = null;
    try { file = new File([t], nome, { type: 'application/json' }); } catch (e) {}
    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      navigator.share({ files: [file], title: 'Backup le mie app' }).then(function () {
        segnaFatto(); msg('Backup salvato.', true);
      }, function (e) {
        if (e && e.name === 'AbortError') msg('Salvataggio annullato.');
        else scarica(t, nome);
      });
    } else scarica(t, nome);
  }
  function scarica(t, nome) {
    try {
      var url = URL.createObjectURL(new Blob([t], { type: 'application/json' }));
      var a = document.createElement('a');
      a.href = url; a.download = nome;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      segnaFatto(); msg('Backup scaricato.', true);
    } catch (e) { msg('Download non riuscito: usa "Copia testo".', false); }
  }
  function copia() {
    var t = testo();
    function ok() { segnaFatto(); msg('Backup copiato: incollalo in Note o in un messaggio a te stesso.', true); }
    function ripiego() {
      var ta = $('lma-txt');
      ta.hidden = false; ta.value = t; ta.focus(); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { msg('Seleziona il testo e copialo a mano.'); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, ripiego);
    else ripiego();
  }

  function ripristina(raw) {
    var o;
    try { o = JSON.parse(raw); } catch (e) { msg('Il testo non è un backup valido.', false); return; }
    if (!o || o.app !== 'le-mie-app' || !o.dati || typeof o.dati !== 'object') {
      msg('Questo file non è un backup di le-mie-app.', false); return;
    }
    var chiavi = KEYS.filter(function (k) { return typeof o.dati[k] === 'string'; });
    if (!chiavi.length) { msg('Il backup non contiene dati.', false); return; }
    for (var i = 0; i < chiavi.length; i++) {
      try { JSON.parse(o.dati[chiavi[i]]); } catch (e) { msg('Backup danneggiato (' + chiavi[i] + ').', false); return; }
    }
    var quando = o.data ? new Date(o.data).toLocaleString('it-IT') : 'data sconosciuta';
    if (!window.confirm('Sostituire i dati attuali con il backup del ' + quando + '?')) return;
    ls('set', SAFETY, JSON.stringify(costruisci()));
    chiavi.forEach(function (k) { ls('set', k, o.dati[k]); });
    // Le app salvano da sole quando si chiude la pagina: blocco le scritture prima di ricaricare.
    Storage.prototype.setItem = function () {};
    location.reload();
  }

  function apri() { aggiornaStato(); msg(''); ov.hidden = false; }
  function chiudi() { ov.hidden = true; }

  function avvia() {
    document.body.appendChild(btn);
    document.body.appendChild(ov);
    btn.addEventListener('click', apri);
    $('lma-close').addEventListener('click', chiudi);
    ov.addEventListener('click', function (e) { if (e.target === ov) chiudi(); });
    $('lma-save').addEventListener('click', salva);
    $('lma-copy').addEventListener('click', copia);
    $('lma-ics').addEventListener('click', esportaIcs);
    $('lma-paste').addEventListener('click', function () {
      var ta = $('lma-txt');
      ta.hidden = false; ta.value = ''; $('lma-go-row').hidden = false; ta.focus();
    });
    $('lma-go').addEventListener('click', function () { ripristina($('lma-txt').value); });
    $('lma-file').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { ripristina(String(r.result)); };
      r.onerror = function () { msg('Non riesco a leggere il file.', false); };
      r.readAsText(f);
      e.target.value = '';
    });
    aggiornaStato();
    if (navigator.storage && navigator.storage.persist) {
      var p = navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false);
      p.then(function (gia) { return gia || navigator.storage.persist(); })
        .then(function (v) { window.__lmaPersist = !!v; aggiornaStato(); }, function () {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();
})();
