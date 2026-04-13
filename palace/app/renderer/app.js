/* ═══════════════════════════════════════════════════
   PALACE  ·  Claude Code 记忆宫殿  ·  renderer
═══════════════════════════════════════════════════ */

let projects = [];
let activeProject = null;
let authTerm = null;
let isDirty = false;

/* ── xterm ─────────────────────────────────────── */
const THEME = {
  background:'#0a0e1a',foreground:'#ccd6f6',cursor:'#00d4ff',cursorAccent:'#0a0e1a',
  black:'#0a0e1a',red:'#ff4d6d',green:'#00ff9f',yellow:'#ffd166',
  blue:'#00d4ff',magenta:'#7c3aed',cyan:'#00ffff',white:'#ccd6f6',
  brightBlack:'#4a5568',brightRed:'#ff6b81',brightGreen:'#00ffa3',
  brightYellow:'#ffe08a',brightBlue:'#33ddff',brightMagenta:'#9d4edd',
  brightCyan:'#00ffff',brightWhite:'#e2e8f0',
};
const term = new Terminal({ fontFamily:"'JetBrains Mono','Fira Code',Menlo,monospace",
  fontSize:13, theme:THEME, cursorBlink:true, allowTransparency:true, scrollback:5000 });
const fit = new FitAddon.FitAddon();
term.loadAddon(fit);
term.open(document.getElementById('terminal'));
fit.fit();

window.palace.onPtyData(d => { term.write(d); authTerm?.write(d); });
window.palace.onPtyExit(() => {
  term.write('\r\n\x1b[33m[session ended]\x1b[0m\r\n');
  authTerm?.write('\r\n\x1b[33m[session ended]\x1b[0m\r\n');
});
term.onData(d => window.palace.sendInput(d));
new ResizeObserver(() => {
  requestAnimationFrame(() => {
    try { fit.fit(); } catch {}
    window.palace.sendResize(term.cols, term.rows);
    term.scrollToBottom();
  });
}).observe(document.getElementById('terminal'));
window.addEventListener('resize', () => {
  requestAnimationFrame(() => {
    try { fit.fit(); } catch {}
    window.palace.sendResize(term.cols, term.rows);
    term.scrollToBottom();
  });
});
window.palace.createPty(null);

/* ═══════════════════════════════════════════════════
   AUTH SCREEN
═══════════════════════════════════════════════════ */
async function initAuth() {
  const dot = document.getElementById('auth-dot');
  const txt = document.getElementById('auth-status-text');
  dot.className = 'auth-dot checking';
  txt.textContent = '检测 Claude 登录状态…';

  authTerm = new Terminal({ fontFamily:"'JetBrains Mono',Menlo,monospace",
    fontSize:12, theme:THEME, cursorBlink:true, allowTransparency:true, scrollback:200 });
  const af = new FitAddon.FitAddon();
  authTerm.loadAddon(af);
  authTerm.open(document.getElementById('auth-terminal'));
  af.fit();
  authTerm.onData(d => window.palace.sendInput(d));

  const auth = await window.palace.checkClaudeAuth();

  if (!auth.installed) {
    dot.className = 'auth-dot fail';
    txt.textContent = '未找到 claude 命令 — 请先安装 Claude Code CLI';
    document.getElementById('btn-auth-login').textContent = '▶ npm install -g @anthropic-ai/claude-code';
    document.getElementById('btn-auth-login').onclick = () => {
      authTerm.focus(); window.palace.sendInput('npm install -g @anthropic-ai/claude-code\r');
    };
  } else if (auth.authenticated) {
    dot.className = 'auth-dot ok';
    txt.textContent = 'Claude 已登录 ✓';
    document.getElementById('auth-hint').textContent = '正在加载项目列表…';
    setTimeout(showPicker, 500);
    return;
  } else {
    dot.className = 'auth-dot fail';
    txt.textContent = '未检测到登录状态 — 请在终端中完成授权';
    authTerm.write('\x1b[33m  运行 claude 完成登录：\x1b[0m\r\n\r\n');
  }

  document.getElementById('btn-auth-login').onclick = () => { authTerm.focus(); window.palace.sendInput('claude\r'); };
  document.getElementById('btn-auth-skip').onclick = showPicker;
}

/* ═══════════════════════════════════════════════════
   PROJECT PICKER
═══════════════════════════════════════════════════ */
function relTime(iso) {
  if (!iso) return '';
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d/60000), h = Math.floor(m/60), day = Math.floor(h/24);
  const zh = currentLang === 'zh', ja = currentLang === 'ja', ko = currentLang === 'ko';
  if (m < 1)  return zh?'刚刚': ja?'たった今': ko?'방금': 'just now';
  if (m < 60) return zh?`${m}分前`: ja?`${m}分前`: ko?`${m}분 전`:`${m}m ago`;
  if (h < 24) return zh?`${h}小时前`: ja?`${h}時間前`: ko?`${h}시간 전`:`${h}h ago`;
  if (day< 7) return zh?`${day}天前`: ja?`${day}日前`: ko?`${day}일 전`:`${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function showPicker() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('picker-screen').classList.remove('hidden');
  const s = document.getElementById('picker-search');
  s.value = '';
  s.focus();
  renderPicker();
}

function renderPicker() {
  const grid = document.getElementById('picker-grid');
  const count = document.getElementById('picker-count');
  const query = (document.getElementById('picker-search')?.value || '').trim().toLowerCase();
  const filtered = query
    ? projects.filter(p => p.name.toLowerCase().includes(query) || (p.path||'').toLowerCase().includes(query))
    : projects;

  grid.innerHTML = '';
  count.textContent = currentLang==='zh' ? `${projects.length} 个` : `${projects.length}`;

  const nc = document.createElement('div');
  nc.className = 'proj-card new-card';
  nc.innerHTML = `<div class="card-new-icon">＋</div><div class="card-new-label">${currentLang==='zh'?'新建项目':currentLang==='ja'?'新規作成':currentLang==='ko'?'새 프로젝트':'New Project'}</div>`;
  nc.onclick = () => openAddModal();
  grid.appendChild(nc);

  for (const p of filtered) {
    const fieldCount = Object.values(p.fields||{}).filter(v=>v&&v.trim()).length;
    const badge = fieldCount ? `<span class="card-field-count">${fieldCount}f</span>` : '';
    const c = document.createElement('div');
    c.className = 'proj-card';
    c.innerHTML = `
      <div class="card-name">${esc(p.name)}${badge}</div>
      <div class="card-path">${esc(p.path || '')}</div>
      <div class="card-time">${relTime(p.last_active)}</div>
      <button class="card-del" title="${currentLang==='zh'?'从列表移除':'Remove'}">✕</button>
    `;
    c.querySelector('.card-del').onclick = async e => {
      e.stopPropagation();
      if (await confirmDialog(`${currentLang==='zh'?'从列表移除':'Remove'} 「${p.name}」？`)) {
        await window.palace.deleteProject(p.id);
        projects = projects.filter(x => x.id !== p.id);
        renderPicker();
      }
    };
    c.onclick = () => pickProject(p);
    grid.appendChild(c);
  }

  if (query && !filtered.length) {
    const msg = document.createElement('div');
    msg.style.cssText = 'color:var(--muted);font-size:11px;padding:20px;text-align:center;grid-column:1/-1';
    msg.textContent = currentLang==='zh'?'没有匹配的项目':'No matching projects';
    grid.appendChild(msg);
  }
}

async function pickProject(p) {
  document.getElementById('picker-screen').classList.add('hidden');
  document.getElementById('btn-picker-back').style.display = 'none';
  document.getElementById('topbar').classList.remove('hidden');
  document.getElementById('info-panel').classList.remove('hidden');
  document.getElementById('term-panel').classList.remove('hidden');
  await selectProject(p);
}

/* ═══════════════════════════════════════════════════
   PROJECT MANAGEMENT
═══════════════════════════════════════════════════ */
function buildTabs() {
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = '';
  for (const p of projects) {
    const b = document.createElement('button');
    b.className = 'tab-btn' + (activeProject?.id === p.id ? ' active' : '');
    b.textContent = p.name.length > 11 ? p.name.slice(0,10)+'…' : p.name;
    b.onclick = () => selectProject(p);
    tabs.appendChild(b);
  }
}

function renderFields(fields) {
  const list = document.getElementById('fields-list');
  list.innerHTML = '';
  const entries = Object.entries(fields || {});
  const ph = t('fieldPlaceholders');
  if (entries.length === 0) {
    for (let i = 0; i < 6; i++) addFieldRow('', '', ph[i] || 'Key');
  } else {
    for (const [k, v] of entries) addFieldRow(k, v);
    for (let i = entries.length; i < 6; i++) addFieldRow('', '', ph[i] || 'Key');
  }
}

function addFieldRow(k='', v='', hint='Key') {
  const list = document.getElementById('fields-list');
  const row = document.createElement('div');
  row.className = 'field-row';
  row.innerHTML = `
    <input class="field-key" type="text" value="${esc(k)}" placeholder="${esc(hint)}"/>
    <span class="field-sep">│</span>
    <input class="field-val" type="text" value="${esc(v)}" placeholder="value…"/>
    <button class="field-del">✕</button>
  `;
  row.querySelector('.field-del').onclick = () => row.remove();
  list.appendChild(row);
}

function collectFields() {
  const fields = {};
  for (const row of document.querySelectorAll('.field-row')) {
    const k = row.querySelector('.field-key').value.trim();
    const v = row.querySelector('.field-val').value.trim();
    if (k) fields[k] = v;
  }
  return fields;
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function selectProject(p) {
  if (activeProject && activeProject.id !== p.id && isDirty) {
    await saveActive();
  }
  activeProject = p;
  setDirty(false);
  buildTabs();
  document.getElementById('proj-name').textContent = p.name;
  const pathEl = document.getElementById('proj-path');
  pathEl.textContent = p.path || '';
  pathEl.onclick = p.path ? () => window.palace.openInFinder(p.path) : null;
  const mem = await window.palace.loadMemory(p.id);
  document.getElementById('memory-area').value = mem;
  if (p.path) {
    term.write(`\r\n\x1b[36m  ▸ cd ${p.path}\x1b[0m\r\n`);
    window.palace.sendInput(`cd ${JSON.stringify(p.path)}\r`);
  }
  renderFields(p.fields || {});
  const hasFilledValues = Object.values(p.fields || {}).some(v => v && v.trim());
  if (!hasFilledValues && p.path) autoFillLocal(p);
}

async function autoFillLocal(p) {
  if (!p.path) return;
  showAnalyzeBadge(true);
  const data = await window.palace.analyzeProjectLocal(p.path);
  showAnalyzeBadge(false);
  if (!data || Object.keys(data).length === 0) return;
  const current = collectFields();
  const merged = { ...data };
  for (const [k, v] of Object.entries(current)) {
    if (k && v.trim()) merged[k] = v;
  }
  renderFields(merged);
  term.write(`\r\x1b[36m  ▸ 已扫描项目信息 (${Object.keys(data).length} 项)\x1b[0m\r\n`);
}

function showAnalyzeBadge(show) {
  document.getElementById('analyze-status').classList.toggle('hidden', !show);
}

function setDirty(dirty) {
  isDirty = dirty;
  document.getElementById('dirty-dot').classList.toggle('hidden', !dirty);
}

async function saveActive() {
  if (!activeProject) return null;
  const fields = collectFields();
  const memory = document.getElementById('memory-area').value;
  activeProject.fields = fields;
  activeProject.last_active = new Date().toISOString();
  await window.palace.saveProject(activeProject);
  await window.palace.saveMemory(activeProject.id, memory);
  setDirty(false);
  return { fields, memory };
}

/* ═══════════════════════════════════════════════════
   CONFIRM DIALOG
═══════════════════════════════════════════════════ */
function confirmDialog(msg) {
  return new Promise(resolve => {
    document.getElementById('confirm-msg').textContent = msg;
    document.getElementById('confirm-overlay').classList.remove('hidden');
    const ok = document.getElementById('confirm-ok');
    const cancel = document.getElementById('confirm-cancel');
    const cleanup = result => {
      document.getElementById('confirm-overlay').classList.add('hidden');
      ok.onclick = null; cancel.onclick = null;
      resolve(result);
    };
    ok.onclick = () => cleanup(true);
    cancel.onclick = () => cleanup(false);
  });
}

/* ═══════════════════════════════════════════════════
   BUTTON HANDLERS
═══════════════════════════════════════════════════ */
document.getElementById('memory-area').addEventListener('input', () => setDirty(true));
document.getElementById('fields-list').addEventListener('input', () => setDirty(true));

document.getElementById('btn-add-field').onclick = () => {
  addFieldRow('', '', t('fieldPlaceholders')[document.querySelectorAll('.field-row').length] || 'Key');
  setDirty(true);
};

document.getElementById('btn-save').onclick = async () => {
  await saveActive(); term.write('\r\x1b[32m  ▸ 已保存\x1b[0m\r\n');
};

document.getElementById('btn-launch').onclick = async () => {
  if (!activeProject) return;
  const saved = await saveActive(); if (!saved) return;
  const proj = { ...activeProject, fields: saved.fields };
  term.write('\r\n\x1b[36m  ▸ injecting memory → CLAUDE.md …\x1b[0m\r\n');
  term.write(`\x1b[36m  ▸ launching claude in ${proj.path}\x1b[0m\r\n\r\n`);
  await window.palace.launchClaude(proj);
};

document.getElementById('btn-ai-local').onclick = async () => {
  if (!activeProject?.path) return;
  const btn = document.getElementById('btn-ai-local');
  btn.disabled = true; btn.textContent = '…';
  const data = await window.palace.analyzeProjectLocal(activeProject.path);
  btn.disabled = false; btn.textContent = '⚡ 扫描';
  if (data) {
    const existing = collectFields();
    const merged = { ...data, ...Object.fromEntries(Object.entries(existing).filter(([,v])=>v)) };
    renderFields(merged);
    term.write(`\r\x1b[36m  ▸ 本地扫描完成 (${Object.keys(data).length} 项)\x1b[0m\r\n`);
  } else {
    term.write('\r\x1b[33m  ▸ 未找到可识别的项目配置\x1b[0m\r\n');
  }
};

document.getElementById('btn-ai-analyze').onclick = async () => {
  if (!activeProject?.path) return;
  const btn = document.getElementById('btn-ai-analyze');
  btn.disabled = true; btn.textContent = '🤖 分析中…';
  showAnalyzeBadge(true);
  term.write('\r\n\x1b[36m  ▸ AI 分析项目中（约 15-30 秒）…\x1b[0m\r\n');
  const data = await window.palace.analyzeProjectAI(activeProject.path);
  btn.disabled = false; btn.textContent = '🤖 AI分析';
  showAnalyzeBadge(false);
  if (data) {
    renderFields(data);
    term.write(`\r\x1b[32m  ▸ AI 分析完成，已填写 ${Object.keys(data).length} 个字段\x1b[0m\r\n`);
  } else {
    term.write('\r\x1b[33m  ▸ AI 分析未返回结果\x1b[0m\r\n');
  }
};

document.getElementById('btn-close-proj').onclick = async () => {
  if (!activeProject) return;
  await saveActive();
  goToPicker();
};
document.getElementById('btn-change-proj').onclick = () => goToPicker();

function goToPicker() {
  document.getElementById('picker-screen').classList.remove('hidden');
  document.getElementById('btn-picker-back').style.display = '';
  const s = document.getElementById('picker-search');
  s.value = '';
  renderPicker();
  s.focus();
}

document.getElementById('btn-picker-back').onclick = () => {
  document.getElementById('picker-screen').classList.add('hidden');
  document.getElementById('btn-picker-back').style.display = 'none';
};

/* ── add project modal ── */
function openAddModal() {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-name').focus();
}
document.getElementById('btn-new').onclick = openAddModal;
document.getElementById('btn-picker-new').onclick = () => openAddModal();
document.getElementById('modal-cancel').onclick = () =>
  document.getElementById('modal-overlay').classList.add('hidden');
document.getElementById('btn-browse').onclick = async () => {
  const dir = await window.palace.selectDirectory();
  if (dir) {
    document.getElementById('modal-path').value = dir;
    if (!document.getElementById('modal-name').value)
      document.getElementById('modal-name').value = dir.split('/').filter(Boolean).pop() || '';
  }
};
document.getElementById('modal-ok').onclick = async () => {
  const name = document.getElementById('modal-name').value.trim();
  const ppath = document.getElementById('modal-path').value.trim();
  if (!name || !ppath) return;
  const id = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const p = { id, name, path: ppath, fields: {}, last_active: new Date().toISOString() };
  await window.palace.saveProject(p);
  if (!projects.find(x => x.id === id)) projects.unshift(p);
  buildTabs();
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('picker-screen').classList.add('hidden');
  document.getElementById('btn-picker-back').style.display = 'none';
  document.getElementById('modal-name').value = '';
  document.getElementById('modal-path').value = '';
  await pickProject(p);
};

/* ── scan modal ── */
function openScanModal() { document.getElementById('scan-overlay').classList.remove('hidden'); document.getElementById('scan-dir').focus(); }
document.getElementById('btn-scan').onclick = openScanModal;
document.getElementById('btn-picker-scan').onclick = openScanModal;
document.getElementById('btn-scan-cancel').onclick = () => document.getElementById('scan-overlay').classList.add('hidden');
document.getElementById('btn-scan-browse').onclick = async () => {
  const dir = await window.palace.selectDirectory(); if (dir) document.getElementById('scan-dir').value = dir;
};
document.getElementById('btn-scan-run').onclick = async () => {
  const dir = document.getElementById('scan-dir').value.trim(); if (!dir) return;
  const btn = document.getElementById('btn-scan-run'); btn.disabled = true; btn.textContent = '…';
  const found = await window.palace.scanProjects(dir);
  btn.disabled = false; btn.textContent = '[ 扫描 ]';
  renderScanResults(found);
};
document.getElementById('btn-scan-all').onclick = () => {
  const bs = document.querySelectorAll('#scan-results .scan-check');
  const all = [...bs].every(b=>b.checked); bs.forEach(b=>b.checked=!all);
};
document.getElementById('btn-scan-import').onclick = async () => {
  let n = 0;
  for (const row of document.querySelectorAll('#scan-results .scan-row')) {
    if (!row.querySelector('.scan-check').checked) continue;
    const name = row.querySelector('.scan-name').value.trim();
    const ppath = row.dataset.path; if (!name||!ppath) continue;
    const id = name.toLowerCase().replace(/[^a-z0-9_-]/g,'-');
    const p = { id, name, path:ppath, fields:{}, last_active:new Date().toISOString() };
    await window.palace.saveProject(p);
    if (!projects.find(x=>x.id===id)) projects.unshift(p);
    n++;
  }
  buildTabs(); renderPicker();
  document.getElementById('scan-overlay').classList.add('hidden');
  if (n) term.write(`\r\x1b[32m  ▸ 已导入 ${n} 个项目\x1b[0m\r\n`);
};
function renderScanResults(items) {
  const c = document.getElementById('scan-results');
  c.innerHTML = '';
  const emptyMsg = {zh:'未发现项目',ja:'プロジェクトなし',ko:'프로젝트 없음',de:'Keine Projekte gefunden',fr:'Aucun projet trouvé'};
  if (!items?.length) { c.innerHTML = `<div class="scan-empty">— ${emptyMsg[currentLang]||'no projects found'} —</div>`; return; }
  for (const item of items) {
    const row = document.createElement('div'); row.className='scan-row'; row.dataset.path=item.path;
    const name = item.path.split('/').filter(Boolean).pop()||item.path;
    row.innerHTML = `<input type="checkbox" class="scan-check" checked/><input type="text" class="scan-name" value="${esc(name)}"/><span class="scan-path">${esc(item.path)}</span><span class="scan-badge">${item.type}</span>`;
    c.appendChild(row);
  }
}

/* ── keyboard shortcuts ── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('scan-overlay').classList.add('hidden');
    document.getElementById('confirm-overlay').classList.add('hidden');
    const backBtn = document.getElementById('btn-picker-back');
    if (backBtn.style.display !== 'none') {
      document.getElementById('picker-screen').classList.add('hidden');
      backBtn.style.display = 'none';
    }
  }
  if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
    if (!document.getElementById('modal-overlay').classList.contains('hidden'))
      document.getElementById('modal-ok').click();
    else if (!document.getElementById('scan-overlay').classList.contains('hidden'))
      document.getElementById('btn-scan-run').click();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') document.getElementById('btn-launch').click();
  if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); document.getElementById('btn-save').click(); }
});

/* ── lang switcher ── */
for (const btn of document.querySelectorAll('.lang-btn')) {
  btn.onclick = () => {
    currentLang = btn.dataset.lang;
    localStorage.setItem('palace-lang', currentLang);
    applyLang();
    if (activeProject) renderFields(activeProject.fields || {});
  };
}

document.getElementById('picker-search').addEventListener('input', renderPicker);

/* ═══════════════════════════════════════════════════
   CONTEXT MENU
═══════════════════════════════════════════════════ */
let ctxSelection = '';

function showCtxMenu(x, y, sel) {
  ctxSelection = sel || '';
  const menu = document.getElementById('ctx-menu');
  const hasSel = !!ctxSelection.trim();
  document.getElementById('ctx-explain').style.display = hasSel ? '' : 'none';
  document.getElementById('ctx-fix').style.display = hasSel ? '' : 'none';
  document.getElementById('ctx-copy').style.display = hasSel ? '' : 'none';
  menu.style.left = Math.min(x, window.innerWidth - 180) + 'px';
  menu.style.top  = Math.min(y, window.innerHeight - 100) + 'px';
  menu.classList.remove('hidden');
}
function hideCtxMenu() { document.getElementById('ctx-menu').classList.add('hidden'); }

document.getElementById('terminal').addEventListener('contextmenu', e => {
  e.preventDefault();
  const sel = term.getSelection();
  showCtxMenu(e.clientX, e.clientY, sel);
});
document.addEventListener('click', () => hideCtxMenu());
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideCtxMenu(); }, true);

document.getElementById('ctx-explain').onclick = () => {
  if (!ctxSelection.trim()) return;
  window.palace.sendInput(`\r\n解释以下内容：\r\n\`\`\`\r\n${ctxSelection.trim()}\r\n\`\`\`\r\n`);
  hideCtxMenu();
};
document.getElementById('ctx-fix').onclick = () => {
  if (!ctxSelection.trim()) return;
  window.palace.sendInput(`\r\n修复以下问题：\r\n\`\`\`\r\n${ctxSelection.trim()}\r\n\`\`\`\r\n`);
  hideCtxMenu();
};
document.getElementById('ctx-copy').onclick = () => {
  if (ctxSelection) window.palace.copyToClipboard(ctxSelection);
  hideCtxMenu();
};

/* ═══════════════════════════════════════════════════
   MEMORY INJECT TOAST
═══════════════════════════════════════════════════ */
let toastTimer = null;

window.palace.onMemoryInjected(({ memLines, fieldCount }) => {
  const toast = document.getElementById('inject-toast');
  toast.textContent = `✓ 注入 ${memLines} 行记忆 · ${fieldCount} 个字段 → CLAUDE.md`;
  toast.classList.remove('hidden', 'fade-out');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.classList.add('hidden'), 450);
  }, 3000);
});

/* ═══════════════════════════════════════════════════
   SESSION TIMELINE
═══════════════════════════════════════════════════ */
function openTimeline() {
  if (!activeProject) return;
  document.getElementById('timeline-proj-name').textContent = activeProject.name;
  document.getElementById('timeline-panel').classList.remove('hidden');
  loadTimeline();
}

function closeTimeline() {
  document.getElementById('timeline-panel').classList.add('hidden');
}

async function loadTimeline() {
  if (!activeProject) return;
  const list = document.getElementById('timeline-list');
  list.innerHTML = '<div class="tl-empty">加载中…</div>';
  const checkpoints = await window.palace.loadCheckpoints(activeProject.id);
  list.innerHTML = '';
  if (!checkpoints.length) {
    list.innerHTML = '<div class="tl-empty">— 暂无会话记录 —<br/><span style="font-size:9px;opacity:0.5">启动 Claude 后自动保存</span></div>';
    return;
  }
  for (const cp of checkpoints) {
    const dt = new Date(cp.ts);
    const dateStr = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    const timeStr = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
    const el = document.createElement('div');
    el.className = 'tl-item';
    el.innerHTML = `
      <div class="tl-item-time">${dateStr} ${timeStr}</div>
      <div class="tl-item-name">${esc(cp.name || activeProject.name)}</div>
      <div class="tl-badges">
        ${cp.memLines  ? `<span class="tl-badge mem">📝 ${cp.memLines}行</span>` : ''}
        ${cp.fieldCount ? `<span class="tl-badge fld">⚙ ${cp.fieldCount}字段</span>` : ''}
      </div>
    `;
    list.appendChild(el);
  }
}

document.getElementById('btn-timeline').onclick = () => {
  const panel = document.getElementById('timeline-panel');
  panel.classList.contains('hidden') ? openTimeline() : closeTimeline();
};
document.getElementById('btn-timeline-close').onclick = closeTimeline;

/* ═══════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════ */
(async () => {
  applyLang();
  projects = await window.palace.loadProjects();
  await initAuth();
  term.write('\x1b[36m┌────────────────────────────────────┐\x1b[0m\r\n');
  term.write('\x1b[36m│  PALACE · Claude Code 记忆宫殿      │\x1b[0m\r\n');
  term.write('\x1b[36m└────────────────────────────────────┘\x1b[0m\r\n');
})();
