const { app, BrowserWindow, ipcMain, shell, dialog, clipboard } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { execFile, execFileSync } = require('child_process');
const pty = require('node-pty');

const PALACE_DIR = path.join(os.homedir(), '.palace');

// ── helpers ──────────────────────────────────────────────────────────────────

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function loadProjects() {
  ensureDir(PALACE_DIR);
  const projects = [];
  for (const entry of fs.readdirSync(PALACE_DIR)) {
    const metaPath = path.join(PALACE_DIR, entry, 'meta.json');
    if (fs.existsSync(metaPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        projects.push(data);
      } catch {}
    }
  }
  return projects.sort((a, b) => {
    const ta = a.last_active || '';
    const tb = b.last_active || '';
    return tb.localeCompare(ta);
  });
}

function saveProject(data) {
  const id = data.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const dir = path.join(PALACE_DIR, id);
  ensureDir(dir);
  data.id = id;
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(data, null, 2));
  return id;
}

function loadMemory(id) {
  const p = path.join(PALACE_DIR, id, 'memory.md');
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  return `# Palace Memory: ${id}\n\n## 项目状态\n_（首次使用）_\n\n## 待办\n_（无）_\n`;
}

function saveMemory(id, content) {
  const dir = path.join(PALACE_DIR, id);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, 'memory.md'), content);
}

const PALACE_START = '<!-- PALACE:START -->';
const PALACE_END = '<!-- PALACE:END -->';

function injectClaudeMd(projectPath, id, fields, memory) {
  const claudeMd = path.join(projectPath, 'CLAUDE.md');
  let fieldsBlock = '';
  if (fields && Object.keys(fields).length > 0) {
    fieldsBlock = '## Project Fields (from Palace)\n\n';
    for (const [k, v] of Object.entries(fields)) {
      fieldsBlock += `- **${k}**: \`${v}\`\n`;
    }
    fieldsBlock += '\n';
  }
  const block = `${PALACE_START}\n${fieldsBlock}${memory}\n${PALACE_END}`;
  let existing = '';
  if (fs.existsSync(claudeMd)) existing = fs.readFileSync(claudeMd, 'utf8');
  let updated;
  if (existing.includes(PALACE_START)) {
    // Use replacement function to prevent $ in block content being interpreted as backreferences
    updated = existing.replace(
      new RegExp(PALACE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + PALACE_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      () => block
    );
  } else {
    updated = (existing.trimEnd() ? existing.trimEnd() + '\n\n' : '') + block + '\n';
  }
  fs.writeFileSync(claudeMd, updated);
}

function removeClaudeMd(projectPath) {
  const claudeMd = path.join(projectPath, 'CLAUDE.md');
  if (!fs.existsSync(claudeMd)) return;
  let content = fs.readFileSync(claudeMd, 'utf8');
  const cleaned = content.replace(
    new RegExp('\n?' + PALACE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + PALACE_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\n?'),
    ''
  ).trim();
  if (cleaned) fs.writeFileSync(claudeMd, cleaned + '\n');
  else fs.unlinkSync(claudeMd);
}

// ── pty ──────────────────────────────────────────────────────────────────────

let ptyProcess = null;
let mainWindow = null;

function createPty(cwd) {
  if (ptyProcess) {
    try { ptyProcess.kill(); } catch {}
    ptyProcess = null;
  }
  const shell = process.env.SHELL || '/bin/zsh';
  ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: cwd || os.homedir(),
    env: process.env,
  });
  ptyProcess.onData(data => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('pty-data', data);
  });
  ptyProcess.onExit(() => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('pty-exit');
  });
}

// ── window ───────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0e1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (ptyProcess) try { ptyProcess.kill(); } catch {}
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC ──────────────────────────────────────────────────────────────────────

ipcMain.handle('load-projects', () => loadProjects());

ipcMain.handle('save-project', (_, data) => saveProject(data));

ipcMain.handle('load-memory', (_, id) => id ? loadMemory(id) : '');

ipcMain.handle('save-memory', (_, id, content) => saveMemory(id, content));

ipcMain.handle('launch-claude', (_, project) => {
  const memory = loadMemory(project.id);
  const memLines = memory.split('\n').filter(l => l.trim()).length;
  const fieldCount = Object.keys(project.fields || {}).filter(k => (project.fields||{})[k]).length;

  injectClaudeMd(project.path, project.id, project.fields || {}, memory);

  // Save session checkpoint
  saveCheckpoint(project.id, {
    ts: new Date().toISOString(),
    name: project.name,
    memLines,
    fieldCount,
  });

  createPty(project.path);
  setTimeout(() => {
    ptyProcess?.write('claude\r');
    mainWindow?.webContents.send('memory-injected', { memLines, fieldCount });
  }, 300);
  return true;
});

ipcMain.handle('create-pty', (_, cwd) => {
  createPty(cwd);
  return true;
});

ipcMain.on('pty-input', (_, data) => {
  ptyProcess?.write(data);
});

ipcMain.on('pty-resize', (_, cols, rows) => {
  ptyProcess?.resize(cols, rows);
});

// ── auth check ───────────────────────────────────────────────────────────────

function findClaudeBin() {
  // Common paths for claude CLI
  const candidates = [
    process.env.CLAUDE_PATH,
    '/usr/local/bin/claude',
    '/usr/bin/claude',
    path.join(os.homedir(), '.local/bin/claude'),
  ].filter(Boolean);
  // Search all nvm node versions
  const nvmVersionsDir = path.join(os.homedir(), '.nvm/versions/node');
  if (fs.existsSync(nvmVersionsDir)) {
    try {
      for (const ver of fs.readdirSync(nvmVersionsDir)) {
        candidates.push(path.join(nvmVersionsDir, ver, 'bin/claude'));
      }
    } catch {}
  }
  // Also search PATH
  const pathDirs = (process.env.PATH || '').split(':');
  for (const d of pathDirs) candidates.push(path.join(d, 'claude'));
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return null;
}

function checkClaudeAuth() {
  const bin = findClaudeBin();
  if (!bin) return { installed: false, authenticated: false };
  try {
    // Run `claude --version` — exits 0 if installed, shows auth prompt only on interactive run
    execFileSync(bin, ['--version'], { timeout: 5000, stdio: 'pipe' });
    // Check for OAuth token in known locations
    const tokenPaths = [
      path.join(os.homedir(), '.claude', '.credentials.json'),
      path.join(os.homedir(), '.config', 'claude', 'credentials.json'),
      path.join(os.homedir(), '.anthropic', 'credentials.json'),
    ];
    const hasCredFile = tokenPaths.some(p => fs.existsSync(p));
    // Also check env
    const hasEnvKey = !!(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY);
    // Check macOS keychain via security command (quick, non-interactive)
    let hasKeychain = false;
    try {
      execFileSync('security', ['find-generic-password', '-s', 'claude', '-w'], { timeout: 2000, stdio: 'pipe' });
      hasKeychain = true;
    } catch {}
    return { installed: true, authenticated: hasCredFile || hasEnvKey || hasKeychain, bin };
  } catch {
    return { installed: true, authenticated: false, bin };
  }
}

ipcMain.handle('check-claude-auth', () => checkClaudeAuth());

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

// ── project analysis ─────────────────────────────────────────────────────────

function analyzeProjectLocal(projectPath) {
  const info = {};
  // package.json
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
    if (pkg.name) info['项目名'] = pkg.name;
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const fw = [];
    if (deps.react) fw.push('React');
    if (deps.next) fw.push('Next.js');
    if (deps.vue || deps['@vue/core']) fw.push('Vue');
    if (deps.express) fw.push('Express');
    if (deps.fastify) fw.push('Fastify');
    if (deps.electron) fw.push('Electron');
    if (deps['@anthropic-ai/sdk'] || deps['@anthropic-ai/claude-code']) fw.push('Anthropic SDK');
    if (deps.openai) fw.push('OpenAI');
    if (deps['better-sqlite3'] || deps.sqlite3) fw.push('SQLite');
    if (deps.mongoose) fw.push('MongoDB');
    if (deps.pg || deps.postgres) fw.push('PostgreSQL');
    if (deps.prisma || deps['@prisma/client']) fw.push('Prisma');
    if (fw.length) info['框架'] = fw.slice(0, 3).join(' + ');
    if (!info['框架']) info['主语言'] = deps.typescript || pkg.devDependencies?.typescript ? 'TypeScript' : 'JavaScript';
  } catch {}
  // Python
  if (fs.existsSync(path.join(projectPath, 'requirements.txt')) ||
      fs.existsSync(path.join(projectPath, 'pyproject.toml'))) info['主语言'] = 'Python';
  if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) info['主语言'] = 'Rust';
  if (fs.existsSync(path.join(projectPath, 'go.mod'))) info['主语言'] = 'Go';
  // .env.example → show key names with empty values for user to fill
  const envEx = path.join(projectPath, '.env.example');
  if (fs.existsSync(envEx)) {
    let count = 0;
    for (const line of fs.readFileSync(envEx, 'utf8').split('\n')) {
      if (count >= 5) break;
      const m = line.match(/^([A-Z][A-Z0-9_]{2,})\s*=\s*(.*)$/);
      if (m) { info[m[1]] = m[2].replace(/^["']|["']$/g, ''); count++; }
    }
  }
  // git remote
  try {
    const gc = fs.readFileSync(path.join(projectPath, '.git', 'config'), 'utf8');
    const u = gc.match(/url\s*=\s*(.+)/);
    if (u) {
      const r = u[1].trim().match(/github\.com[:/](.+?)(?:\.git)?$/);
      if (r) info['GitHub'] = r[1];
    }
  } catch {}
  return Object.keys(info).length > 0 ? info : null;
}

ipcMain.handle('analyze-project-local', (_, projectPath) => analyzeProjectLocal(projectPath));

ipcMain.handle('analyze-project-ai', async (_, projectPath) => {
  const claudeBin = findClaudeBin();
  if (!claudeBin) return null;
  const prompt = 'Analyze this project. Output ONLY a raw JSON object (no markdown, no explanation) with 4-6 entries: tech stack, framework, any API keys or tokens needed (env var name as key, brief description as value), server/database config if present, main purpose. All values max 50 chars. Example: {"Language":"TypeScript","Framework":"Next.js","ANTHROPIC_API_KEY":"Claude API key","Database":"SQLite","Purpose":"AI chat app"}';
  return new Promise(resolve => {
    execFile(claudeBin, ['-p', prompt, '--output-format', 'text'],
      { cwd: projectPath, timeout: 60000, env: process.env },
      (err, stdout) => {
        if (err) { resolve(null); return; }
        const m = stdout.trim().match(/\{[\s\S]*?\}/);
        if (!m) { resolve(null); return; }
        try { resolve(JSON.parse(m[0])); } catch { resolve(null); }
      }
    );
  });
});

// ── delete project ────────────────────────────────────────────────────────────

ipcMain.handle('delete-project', (_, id) => {
  const dir = path.join(PALACE_DIR, id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  return true;
});

ipcMain.handle('open-in-finder', (_, dirPath) => {
  shell.openPath(dirPath);
  return true;
});

ipcMain.handle('copy-to-clipboard', (_, text) => {
  clipboard.writeText(text);
  return true;
});

// ── session checkpoints ──────────────────────────────────────────────────────

function saveCheckpoint(id, data) {
  const dir = path.join(PALACE_DIR, id, 'sessions');
  ensureDir(dir);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  fs.writeFileSync(path.join(dir, `${ts}.json`), JSON.stringify(data, null, 2));
  try {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
    if (files.length > 20) {
      for (const old of files.slice(0, files.length - 20)) {
        try { fs.unlinkSync(path.join(dir, old)); } catch {}
      }
    }
  } catch {}
}

function loadCheckpoints(id) {
  const dir = path.join(PALACE_DIR, id, 'sessions');
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().reverse().slice(0, 20)
      .map(f => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return null; } })
      .filter(Boolean);
  } catch { return []; }
}

ipcMain.handle('save-checkpoint', (_, id, data) => { saveCheckpoint(id, data); return true; });
ipcMain.handle('load-checkpoints', (_, id) => loadCheckpoints(id));

ipcMain.handle('scan-projects', (_, rootDir) => {
  const found = [];
  if (!fs.existsSync(rootDir)) return found;
  let entries;
  try { entries = fs.readdirSync(rootDir); } catch { return found; }
  for (const name of entries) {
    if (name.startsWith('.')) continue;
    const full = path.join(rootDir, name);
    let stat;
    try { stat = fs.statSync(full); } catch { continue; }
    if (!stat.isDirectory()) continue;
    const hasClaudeMd = fs.existsSync(path.join(full, 'CLAUDE.md'));
    const hasGit = fs.existsSync(path.join(full, '.git'));
    if (hasClaudeMd || hasGit) {
      found.push({ path: full, type: hasClaudeMd ? 'CLAUDE.md' : '.git' });
    }
  }
  return found;
});
