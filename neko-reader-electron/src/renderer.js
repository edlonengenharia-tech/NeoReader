/* NekoReader v2 - Renderer
   PDF rendering uses browser canvas (via pdf.js) - NO native deps! */
'use strict';

const $ = (s) => document.querySelector(s);
const el = {
  body: document.body,
  dropzone: $('#dropzone'), pages: $('#pages'), empty: $('#empty-state'),
  loading: $('#loading'), loadingText: $('#loading-text'), loadingFill: $('#loading-fill'),
  slot0: $('#slot0'), slot1: $('#slot1'),
  img0: $('#slot0 img'), img1: $('#slot1 img'),
  ind: $('#page-ind'), hud: $('#hud'), hudPage: $('#hud-page'), progFill: $('#progress-fill'),
  err: $('#error-banner'), bookTitle: $('#book-title'), sidebar: $('#sidebar'),
  libGrid: $('#lib-grid'), contRow: $('#continue-row'), search: $('#search'),
  btnManga: $('#btn-manga'), btnDouble: $('#btn-double'), btnFit: $('#btn-fit'),
  zoomPct: $('#zoom-pct'),
};

// Configure pdf.js worker
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ---- State ----
let S = null;
let positions = {};
let libraryFolders = [];
let excluded = [];
let libItems = []; // { file, name, type }
let book = null;   // { file, pages:[dataUrl], count }
let view = 0;
let manga = false, dbl = false, fit = 'width', zoom = 1;
let pageCache = new Map();
let filter = 'all';

const FIT_LABEL = { width: 'Largura', height: 'Altura', page: 'Página' };

// ---- RTL helpers ----
const phys = (v) => manga ? (book.count - 1 - v) : v;
const disp = (p) => manga ? (book.count - 1 - p) : p;

// ---- Persistence ----
async function loadState() {
  const st = await neko.getState();
  S = st.settings;
  positions = st.positions || {};
  libraryFolders = st.libraryFolders || [];
  excluded = st.excluded || [];
  el.body.dataset.theme = S.theme;
  document.documentElement.style.setProperty('--side', S.sidebarWidth + 'px');
  manga = !!S.mangaByDefault;
  dbl = !!S.doublePageByDefault;
  fit = S.fit || 'width';
  syncToggles();
}

async function saveState(partial) {
  await neko.setState(partial);
}

let saveTimer = null;
function debouncedSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveState({ positions, libraryFolders, excluded }), 400);
}

// ---- Open book ----
async function openPath(filePath) {
  hideError();
  showLoading('Abrindo arquivo…');

  try {
    const info = await neko.openBook(filePath);
    const fileName = filePath.split(/[\\/]/).pop();

    if (info.type === 'cbz') {
      // CBZ: pages are base64 images
      book = {
        file: filePath,
        name: fileName,
        pages: info.pages.map(p => `data:${p.mime};base64,${p.data}`),
        count: info.pages.length,
      };
      hideLoading();
    } else if (info.type === 'pdf') {
      // PDF: render using pdf.js in the renderer (browser canvas!)
      book = {
        file: filePath,
        name: fileName,
        pages: [],
        count: 0,
      };
      await renderPDFPages(info.data);
      hideLoading();
    }

    el.bookTitle.textContent = fileName;
    const pos = positions[filePath];
    view = pos ? Math.min(Math.max(0, disp(pos.page)), book.count - 1) : 0;

    el.empty.hidden = true;
    el.pages.hidden = false;
    el.hud.hidden = false;
    ensureClickZones();
    render(true);
    prefetch();
    applyKeepAwake();

    // Add to library
    const ext = filePath.split('.').pop().toLowerCase();
    const libItem = { file: filePath, name: fileName, type: ext };
    if (!libItems.find(i => i.file === filePath)) {
      libItems.unshift(libItem);
    }
    renderLibrary();

  } catch (e) {
    hideLoading();
    showError(e.message || String(e));
  }
}

// ---- PDF rendering using browser canvas (NO native deps!) ----
async function renderPDFPages(base64Data) {
  showLoading('Renderizando PDF…', 0);

  // Convert base64 to Uint8Array
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  book.count = pdf.numPages;
  book.pages = [];

  const RENDER_SCALE = 2.0;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });

    // Create offscreen canvas (browser native - no node-canvas needed!)
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    book.pages.push(dataUrl);

    // Update progress
    const pct = Math.round((i / pdf.numPages) * 100);
    showLoading(`Renderizando PDF… ${i}/${pdf.numPages}`, pct);

    // Free memory
    page.cleanup();

    // Yield to UI thread every 3 pages
    if (i % 3 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }
}

// ---- Loading UI ----
function showLoading(text, pct) {
  el.loading.hidden = false;
  el.empty.hidden = true;
  if (text) el.loadingText.textContent = text;
  if (pct !== undefined) el.loadingFill.style.width = pct + '%';
}
function hideLoading() {
  el.loading.hidden = true;
  el.loadingFill.style.width = '0%';
}

// ---- Close book ----
function closeBook() {
  book = null; view = 0; pageCache.clear();
  el.pages.hidden = true; el.hud.hidden = true; el.bookTitle.textContent = '';
  el.empty.hidden = false;
  removeClickZones();
  applyKeepAwake();
}

// ---- Render pages ----
async function render(animate) {
  if (!book) return;
  const pair = dbl ? [view, view + 1] : [view];
  const slots = [el.slot0, el.slot1];

  for (let i = 0; i < 2; i++) {
    const v = pair[i];
    if (v === undefined || v >= book.count) { slots[i].hidden = true; continue; }
    slots[i].hidden = false;
    const img = slots[i].querySelector('img');
    const url = getPage(phys(v));
    if (img.src !== url) img.src = url;
    applyFit(img);

    if (animate && S.flipAnimation) {
      const slot = slots[i];
      slot.setAttribute('dir', manga ? 'rtl' : 'ltr');
      slot.classList.remove('turning');
      void slot.offsetWidth;
      slot.classList.add('turning');
      setTimeout(() => slot.classList.remove('turning'), 360);
    } else {
      slots[i].classList.remove('turning');
    }
  }

  el.pages.style.flexDirection = (manga && dbl) ? 'row-reverse' : 'row';

  const cur = Math.min(phys(view), book.count - 1);
  el.ind.textContent = `${cur + 1} / ${book.count}`;
  el.hudPage.textContent = `${cur + 1} / ${book.count}`;
  el.progFill.style.width = ((cur + 1) / book.count * 100) + '%';
  el.progFill.parentElement.style.transform = manga ? 'scaleX(-1)' : '';

  positions[book.file] = { page: cur, total: book.count, ts: Date.now() };
  debouncedSave();
}

function getPage(idx) {
  if (!book || idx < 0 || idx >= book.count) return '';
  return book.pages[idx];
}

function prefetch() {
  // Pages are already loaded in memory for CBZ/PDF
  // This is a no-op in this version since all pages are pre-rendered
}

function applyFit(img) {
  img.style.width = ''; img.style.height = '';
  img.style.maxWidth = ''; img.style.maxHeight = '';
  const zone = el.dropzone.getBoundingClientRect();
  const maxH = zone.height - 40;
  const maxW = (dbl ? zone.width / 2 : zone.width) - 40;

  img.onload = () => {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    let scale = 1;
    if (fit === 'width') scale = maxW / iw;
    else if (fit === 'height') scale = maxH / ih;
    else scale = Math.min(maxW / iw, maxH / ih);
    scale = Math.max(0.05, scale) * zoom;
    img.style.width = Math.round(iw * scale) + 'px';
    img.style.height = Math.round(ih * scale) + 'px';
  };
  if (img.complete && img.naturalWidth) img.onload();
}

// ---- Navigation ----
function go(delta) {
  if (!book) return;
  const step = dbl ? 2 : 1;
  view = Math.min(Math.max(0, view + delta * step), book.count - (dbl ? 2 : 1));
  render(true);
}
function goFirst() { if (book) { view = 0; render(true); } }
function goLast() { if (book) { view = book.count - (dbl ? 2 : 1); render(true); } }

$('#btn-prev').onclick = () => go(-1);
$('#btn-next').onclick = () => go(+1);
$('#btn-first').onclick = goFirst;
$('#btn-last').onclick = goLast;

// ---- Toggles ----
function syncToggles() {
  el.btnManga.classList.toggle('on', manga);
  el.btnDouble.classList.toggle('on', dbl);
  el.btnFit.textContent = 'Ajuste: ' + FIT_LABEL[fit];
  el.zoomPct.textContent = Math.round(zoom * 100) + '%';
  removeClickZones();
  ensureClickZones();
}

el.btnManga.onclick = () => { manga = !manga; if (book) view = disp(phys(view)); syncToggles(); render(false); };
el.btnDouble.onclick = () => { dbl = !dbl; syncToggles(); if (book) render(false); };
el.btnFit.onclick = () => { fit = fit === 'width' ? 'height' : fit === 'height' ? 'page' : 'width'; syncToggles(); if (book) render(false); };
$('#btn-zin').onclick = () => { zoom = Math.min(4, zoom * 1.25); syncToggles(); if (book) render(false); };
$('#btn-zout').onclick = () => { zoom = Math.max(.25, zoom / 1.25); syncToggles(); if (book) render(false); };
$('#btn-close-book').onclick = closeBook;

// ---- Fullscreen ----
let fs = false;
function setFS(on) {
  fs = on;
  neko.setFullScreen(on);
  $('#btn-fs').classList.toggle('on', on);
  $('#titlebar').style.visibility = on ? 'hidden' : '';
  $('#bottombar').style.visibility = on ? 'hidden' : '';
  setTimeout(() => book && render(false), 120);
}
$('#btn-fs').onclick = () => setFS(!fs);
$('#tb-min').onclick = () => neko.winMinimize();
$('#tb-max').onclick = () => neko.winMaximize();
$('#tb-close').onclick = () => neko.winClose();

// ---- Keyboard ----
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  switch (e.key) {
    case 'ArrowRight': go(manga ? -1 : +1); e.preventDefault(); break;
    case 'ArrowLeft': go(manga ? +1 : -1); e.preventDefault(); break;
    case 'Home': goFirst(); break;
    case 'End': goLast(); break;
    case 'f': case 'F': setFS(!fs); break;
    case 'm': case 'M': el.btnManga.click(); break;
    case 'd': case 'D': el.btnDouble.click(); break;
    case 'w': case 'W': el.btnFit.click(); break;
    case 'Tab': toggleSidebar(); e.preventDefault(); break;
    case 'Escape': if (fs) setFS(false); break;
    case '+': case '=': $('#btn-zin').click(); break;
    case '-': $('#btn-zout').click(); break;
    case ',': if (e.ctrlKey) openOptions(); break;
    case 'i': case 'I': if (e.ctrlKey) { aiDrawer.hidden = !aiDrawer.hidden; e.preventDefault(); } break;
  }
});

// Ctrl+Wheel zoom
el.dropzone.addEventListener('wheel', (e) => {
  if (!e.ctrlKey || !book) return;
  e.preventDefault();
  zoom = Math.min(4, Math.max(.25, zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
  syncToggles(); render(false);
}, { passive: false });

// ---- Click zones ----
let zones = [];
function ensureClickZones() {
  if (!S?.clickZones || !book || zones.length) return;
  const mk = (side) => {
    const z = document.createElement('div');
    z.className = 'click-zone ' + side;
    z.onclick = () => {
      const forward = (side === 'right') !== manga;
      go(forward ? +1 : -1);
    };
    el.dropzone.appendChild(z);
    zones.push(z);
  };
  mk('left'); mk('right');
}
function removeClickZones() { zones.forEach(z => z.remove()); zones = []; }

// ---- Drag & Drop ----
['dragenter', 'dragover'].forEach(ev => el.dropzone.addEventListener(ev, (e) => {
  e.preventDefault(); el.dropzone.classList.add('dragover');
}));
['dragleave', 'drop'].forEach(ev => el.dropzone.addEventListener(ev, (e) => {
  e.preventDefault(); el.dropzone.classList.remove('dragover');
}));
el.dropzone.addEventListener('drop', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (!f) return;
  const p = f.path; // Electron exposes .path
  if (/\.(cbz|cbr|cbt|cb7|zip|rar|7z|tar|pdf)$/i.test(p)) {
    openPath(p);
  } else {
    showError('Formato não suportado. Use .cbz, .cbr, .zip ou .pdf');
  }
});

$('#btn-open').onclick = async () => {
  const files = await neko.openFiles();
  if (files.length) openPath(files[0]);
};

// ---- Sidebar ----
function toggleSidebar() { el.sidebar.classList.toggle('hidden'); }
$('#btn-lib').onclick = toggleSidebar;

// Resizer
(function setupResizer() {
  const rz = $('#resizer');
  if (!rz) return;
  let startX = 0, startW = 0, dragging = false;
  rz.addEventListener('mousedown', (e) => {
    dragging = true; startX = e.clientX;
    startW = el.sidebar.getBoundingClientRect().width;
    document.body.classList.add('resizing'); rz.classList.add('active');
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const w = Math.min(720, Math.max(200, Math.round(startW + (e.clientX - startX))));
    document.documentElement.style.setProperty('--side', w + 'px');
  });
  window.addEventListener('mouseup', async () => {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove('resizing'); rz.classList.remove('active');
    const w = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--side'), 10) || 300;
    S.sidebarWidth = w;
    await saveState({ settings: S });
    if (book) render(false);
  });
})();

// ---- Library ----
function renderLibrary() {
  el.libGrid.innerHTML = '';
  const q = el.search.value.trim().toLowerCase();
  let items = libItems.filter(i => !excluded.includes(i.file));
  if (q) items = items.filter(i => i.name.toLowerCase().includes(q));
  if (filter === 'unread') items = items.filter(i => !positions[i.file]);
  if (filter === 'recent') items = items.filter(i => !!positions[i.file]);

  const cnt = $('#lib-count');
  if (cnt) cnt.textContent = `(${items.length})`;

  for (const it of items.slice(0, 200)) {
    const card = document.createElement('div');
    card.className = 'lib-item';
    const icon = it.type === 'pdf' ? '📄' : '📕';
    card.innerHTML = `<div class="cover">${icon}</div><div class="t" title="${esc(it.name)}">${esc(it.name)}</div>`;
    card.onclick = () => openPath(it.file);
    el.libGrid.appendChild(card);
  }

  // Continue reading
  el.contRow.innerHTML = '';
  const recent = Object.entries(positions)
    .sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0)).slice(0, 6);
  $('#continue-wrap').style.display = recent.length ? '' : 'none';
  for (const [file, pos] of recent) {
    const item = libItems.find(i => i.file === file);
    if (!item) continue;
    const name = item.name;
    const card = document.createElement('div');
    card.className = 'cont-card';
    const icon = item.type === 'pdf' ? '📄' : '📕';
    card.innerHTML = `<div class="cover">${icon}</div><div class="t">${esc(name)}</div>
      <div class="bar"><i style="width:${Math.round((pos.page + 1) / pos.total * 100)}%"></i></div>`;
    card.onclick = () => openPath(file);
    el.contRow.appendChild(card);
  }
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

el.search.addEventListener('input', renderLibrary);
document.querySelectorAll('.chip').forEach(c => c.onclick = () => {
  document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
  c.classList.add('active');
  filter = c.dataset.filter;
  renderLibrary();
});

$('#btn-addfolder').onclick = async () => {
  const f = await neko.openFolder();
  if (f && !libraryFolders.includes(f)) {
    libraryFolders.push(f);
    await saveState({ libraryFolders });
  }
};

// ---- Options ----
const dlg = $('#options');
function openOptions() {
  $('#opt-manga').checked = S.mangaByDefault;
  $('#opt-double').checked = S.doublePageByDefault;
  $('#opt-fit').value = S.fit;
  $('#opt-flip').checked = S.flipAnimation;
  $('#opt-zones').checked = S.clickZones;
  $('#opt-keepawake').checked = S.keepAwake !== false;
  $('#opt-theme').value = S.theme;
  $('#opt-showlib').checked = S.showLibraryOnStart;
  $('#opt-side').value = S.sidebarWidth;
  $('#opt-aiprov').value = S.aiProvider || 'qwen';
  $('#opt-aikey').value = S.aiKey || '';
  $('#opt-aibase').value = S.aiBaseUrl || '';
  $('#opt-aimodel').value = S.aiModel || '';
  dlg.showModal();
}
$('#btn-opts').onclick = openOptions;
$('#opt-cancel').onclick = () => dlg.close();

dlg.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  dlg.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  dlg.querySelectorAll('section[data-pane]').forEach(s => s.hidden = s.dataset.pane !== t.dataset.tab);
});

function collectOptions() {
  S.mangaByDefault = $('#opt-manga').checked;
  S.doublePageByDefault = $('#opt-double').checked;
  S.fit = $('#opt-fit').value;
  S.flipAnimation = $('#opt-flip').checked;
  S.clickZones = $('#opt-zones').checked;
  S.keepAwake = $('#opt-keepawake').checked;
  S.theme = $('#opt-theme').value;
  S.showLibraryOnStart = $('#opt-showlib').checked;
  S.sidebarWidth = parseInt($('#opt-side').value, 10) || 300;
  S.aiProvider = $('#opt-aiprov').value;
  S.aiKey = $('#opt-aikey').value.trim();
  S.aiBaseUrl = $('#opt-aibase').value.trim();
  S.aiModel = $('#opt-aimodel').value.trim();
  return S;
}

$('#options form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  collectOptions();
  await saveState({ settings: S });

  el.body.dataset.theme = S.theme;
  document.documentElement.style.setProperty('--side', S.sidebarWidth + 'px');
  el.sidebar.classList.toggle('hidden', !S.showLibraryOnStart);

  manga = S.mangaByDefault || manga;
  dbl = S.doublePageByDefault || dbl;
  fit = S.fit;
  removeClickZones();
  ensureClickZones();
  syncToggles();
  if (book) render(false);
  applyKeepAwake();

  dlg.close();
});

// ---- AI Panel ----
const aiDrawer = $('#ai-drawer');
$('#btn-ai').onclick = () => { aiDrawer.hidden = !aiDrawer.hidden; };
$('#ai-close').onclick = () => { aiDrawer.hidden = true; };

$('#opt-aitest').onclick = async () => {
  collectOptions();
  await saveState({ settings: S });
  const out = $('#ai-test-out');
  out.textContent = 'Testando…';
  try {
    const result = await neko.aiTest(S);
    out.textContent = '[OK] ' + result;
  } catch (e) {
    out.textContent = '[ERRO] ' + (e.message || e);
  }
};

async function aiRun(kind) {
  if (!book) { aiSay('Abra um livro primeiro.'); return; }
  const out = $('#ai-out');
  out.innerHTML = '<p class="hint">🤔 Consultando IA…</p>';
  try {
    const messages = [];
    if (kind === 'summary') {
      messages.push({ role: 'user', content: `Resuma o conteúdo da página ${phys(view) + 1} de "${book.name}".` });
    } else if (kind === 'summary-doc') {
      messages.push({ role: 'user', content: `Resuma o documento "${book.name}" (${book.count} páginas).` });
    } else {
      const q = $('#ai-question').value.trim() || 'Explique o conteúdo.';
      messages.push({ role: 'user', content: q });
    }
    const reply = await neko.aiAsk({ messages, settings: S });
    out.innerHTML = '<div>' + esc(reply).replace(/\n/g, '<br/>') + '</div>';
  } catch (e) {
    out.innerHTML = '<p style="color:var(--danger)">⚠ ' + esc(e.message || String(e)) + '</p>';
  }
}
function aiSay(msg) { $('#ai-out').innerHTML = '<p class="hint">' + esc(msg) + '</p>'; }

$('#ai-sum-page').onclick = () => aiRun('summary');
$('#ai-sum-doc').onclick = () => aiRun('summary-doc');
$('#ai-send').onclick = () => aiRun('ask');
$('#ai-question').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) aiRun('ask');
  e.stopPropagation();
});

// ---- Keep awake ----
function applyKeepAwake() {
  neko.setKeepAwake(!!(S.keepAwake !== false && book));
}

// ---- Error ----
function showError(msg) { el.err.textContent = '⚠ ' + msg; el.err.hidden = false; }
function hideError() { el.err.hidden = true; }

// ---- Listen for open-path from main ----
neko.onOpenPath(openPath);

// ---- Boot ----
(async function boot() {
  await loadState();
  renderLibrary();
  if (!S.showLibraryOnStart) el.sidebar.classList.add('hidden');
})();
