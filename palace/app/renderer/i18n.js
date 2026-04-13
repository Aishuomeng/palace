/* ── i18n ── */
const I18N = {
  zh: {
    logo: '▌记忆宫殿▐',
    newBtn: '＋ 新建',
    addField: '＋ 添加字段',
    save: '保存 ▸',
    launch: '▶ 启动 Claude',
    memoryLabel: '── 记忆',
    memoryHint: '（Claude 启动时读取）',
    termLabel: '── 终端',
    noProjects: '暂无项目',
    modalTitle: '┌─ 添加项目 ──────────────────────┐',
    labelName: '项目名称',
    labelPath: '项目路径',
    placeholderName: 'my-project',
    placeholderPath: '/path/to/project',
    confirm: '[ 确认 ]',
    cancel: '[ 取消 ]',
    scanBtn: '⌕ 扫描目录',
    scanModalTitle: '┌─ 扫描项目目录 ──────────────────┐',
    scanDir: '扫描目录',
    scanDirPlaceholder: '/Users/yourname',
    scanLabel: '发现的项目（含 CLAUDE.md / .git）',
    scanRun: '[ 开始扫描 ]',
    selectAll: '全选',
    importSelected: '[ 导入选中 ]',
    fieldsLabel: '── 关键信息',
    fieldsHint: '（注入 CLAUDE.md，Claude 启动时自动读取）',
    authChecking: '检测 Claude 登录状态…',
    authOk: 'Claude 已登录 ✓',
    authFail: '未检测到登录状态，请在下方终端完成授权',
    authNotInstalled: '未找到 claude 命令，请先安装 Claude Code CLI',
    authEnterApp: '自动进入应用…',
    btnAuthLogin: '▶ 在终端中登录 Claude',
    btnAuthSkip: '已登录，进入应用 →',
    authHint: '登录后点击「已登录，进入应用」',
    fieldPlaceholders: ['API Key', '服务器地址', '数据库 URL', '用户名', '端口', '备注'],
  },
  en: {
    logo: '▌PALACE▐',
    newBtn: '＋ NEW',
    addField: '＋ ADD FIELD',
    save: 'SAVE ▸',
    launch: '▶ LAUNCH CLAUDE',
    memoryLabel: '── MEMORY',
    memoryHint: '(Claude reads this on launch)',
    termLabel: '── TERMINAL',
    noProjects: 'no projects yet',
    modalTitle: '┌─ ADD PROJECT ────────────────────┐',
    labelName: 'NAME',
    labelPath: 'PATH',
    placeholderName: 'my-project',
    placeholderPath: '/path/to/project',
    confirm: '[ CONFIRM ]',
    cancel: '[ CANCEL ]',
    scanBtn: '⌕ SCAN DIR',
    scanModalTitle: '┌─ SCAN FOR PROJECTS ─────────────┐',
    scanDir: 'DIRECTORY',
    scanDirPlaceholder: '/Users/yourname',
    scanLabel: 'Found projects (with CLAUDE.md / .git)',
    scanRun: '[ SCAN ]',
    selectAll: 'ALL',
    importSelected: '[ IMPORT SELECTED ]',
    fieldPlaceholders: ['API Key', 'Server Address', 'Database URL', 'Username', 'Port', 'Notes'],
  },
  ja: {
    logo: '▌パレス▐',
    newBtn: '＋ 新規',
    addField: '＋ フィールド追加',
    save: '保存 ▸',
    launch: '▶ Claude 起動',
    memoryLabel: '── メモリ',
    memoryHint: '（起動時に Claude が読み込む）',
    termLabel: '── ターミナル',
    noProjects: 'プロジェクトなし',
    modalTitle: '┌─ プロジェクト追加 ───────────────┐',
    labelName: '名前',
    labelPath: 'パス',
    placeholderName: 'my-project',
    placeholderPath: '/path/to/project',
    confirm: '[ 確認 ]',
    cancel: '[ キャンセル ]',
    scanBtn: '⌕ スキャン',
    scanModalTitle: '┌─ ディレクトリスキャン ──────────┐',
    scanDir: 'ディレクトリ',
    scanDirPlaceholder: '/Users/yourname',
    scanLabel: '検出したプロジェクト（CLAUDE.md / .git）',
    scanRun: '[ スキャン ]',
    selectAll: '全選択',
    importSelected: '[ 選択をインポート ]',
    fieldPlaceholders: ['API Key', 'サーバーアドレス', 'データベース URL', 'ユーザー名', 'ポート', 'メモ'],
  },
  ko: {
    logo: '▌팔레스▐',
    newBtn: '＋ 새로 만들기',
    addField: '＋ 필드 추가',
    save: '저장 ▸',
    launch: '▶ Claude 실행',
    memoryLabel: '── 메모리',
    memoryHint: '（실행 시 Claude가 읽음）',
    termLabel: '── 터미널',
    noProjects: '프로젝트 없음',
    modalTitle: '┌─ 프로젝트 추가 ──────────────────┐',
    labelName: '이름',
    labelPath: '경로',
    placeholderName: 'my-project',
    placeholderPath: '/path/to/project',
    confirm: '[ 확인 ]',
    cancel: '[ 취소 ]',
    scanBtn: '⌕ 스캔',
    scanModalTitle: '┌─ 프로젝트 디렉터리 스캔 ────────┐',
    scanDir: '디렉터리',
    scanDirPlaceholder: '/Users/yourname',
    scanLabel: '발견된 프로젝트 (CLAUDE.md / .git)',
    scanRun: '[ 스캔 ]',
    selectAll: '전체 선택',
    importSelected: '[ 선택 항목 가져오기 ]',
    fieldPlaceholders: ['API Key', '서버 주소', '데이터베이스 URL', '사용자 이름', '포트', '메모'],
  },
  de: {
    logo: '▌PALAST▐',
    newBtn: '＋ NEU',
    addField: '＋ FELD HINZUFÜGEN',
    save: 'SPEICHERN ▸',
    launch: '▶ CLAUDE STARTEN',
    memoryLabel: '── SPEICHER',
    memoryHint: '(Claude liest beim Start)',
    termLabel: '── TERMINAL',
    noProjects: 'Keine Projekte',
    modalTitle: '┌─ PROJEKT HINZUFÜGEN ─────────────┐',
    labelName: 'NAME',
    labelPath: 'PFAD',
    placeholderName: 'mein-projekt',
    placeholderPath: '/pfad/zum/projekt',
    confirm: '[ BESTÄTIGEN ]',
    cancel: '[ ABBRECHEN ]',
    scanBtn: '⌕ VERZEICHNIS',
    scanModalTitle: '┌─ PROJEKTE SCANNEN ───────────────┐',
    scanDir: 'VERZEICHNIS',
    scanDirPlaceholder: '/Users/yourname',
    scanLabel: 'Gefundene Projekte (CLAUDE.md / .git)',
    scanRun: '[ SCANNEN ]',
    selectAll: 'ALLE',
    importSelected: '[ AUSGEWÄHLTE IMPORTIEREN ]',
    fieldPlaceholders: ['API Key', 'Serveradresse', 'Datenbank-URL', 'Benutzername', 'Port', 'Notizen'],
  },
  fr: {
    logo: '▌PALAIS▐',
    newBtn: '＋ NOUVEAU',
    addField: '＋ AJOUTER CHAMP',
    save: 'ENREGISTRER ▸',
    launch: '▶ LANCER CLAUDE',
    memoryLabel: '── MÉMOIRE',
    memoryHint: '(Claude lit ceci au lancement)',
    termLabel: '── TERMINAL',
    noProjects: 'Aucun projet',
    modalTitle: '┌─ AJOUTER UN PROJET ──────────────┐',
    labelName: 'NOM',
    labelPath: 'CHEMIN',
    placeholderName: 'mon-projet',
    placeholderPath: '/chemin/vers/projet',
    confirm: '[ CONFIRMER ]',
    cancel: '[ ANNULER ]',
    scanBtn: '⌕ SCANNER',
    scanModalTitle: '┌─ SCANNER LES PROJETS ────────────┐',
    scanDir: 'RÉPERTOIRE',
    scanDirPlaceholder: '/Users/yourname',
    scanLabel: 'Projets trouvés (CLAUDE.md / .git)',
    scanRun: '[ LANCER ]',
    selectAll: 'TOUT',
    importSelected: '[ IMPORTER LA SÉLECTION ]',
    fieldPlaceholders: ['Clé API', 'Adresse serveur', 'URL base de données', "Nom d'utilisateur", 'Port', 'Notes'],
  },
};

let currentLang = localStorage.getItem('palace-lang') || 'zh';
function t(key) { return (I18N[currentLang] || I18N.zh)[key] || key; }

function applyLang() {
  // lang buttons (both sets)
  for (const btn of document.querySelectorAll('.lang-btn')) {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  }
  // picker heading (only update the span text, keep picker-count span intact)
  const ph = document.getElementById('picker-heading');
  if (ph) ph.textContent = currentLang === 'zh' ? '选择项目' : currentLang === 'ja' ? 'プロジェクトを選択' : currentLang === 'ko' ? '프로젝트 선택' : currentLang === 'de' ? 'Projekte' : currentLang === 'fr' ? 'Projets' : 'Select Project';

  // modal
  const mt = document.getElementById('modal-title');
  if (mt) mt.textContent = t('modalTitle');
  setIfExists('modal-label-name', t('labelName'));
  setIfExists('modal-label-path', t('labelPath'));
  setPlaceholder('modal-name', t('placeholderName'));
  setPlaceholder('modal-path', t('placeholderPath'));
  setIfExists('modal-ok', t('confirm'));
  setIfExists('modal-cancel', t('cancel'));
  // scan modal
  setIfExists('scan-modal-title', t('scanModalTitle'));
  setIfExists('scan-label-dir', t('scanDir'));
  setPlaceholder('scan-dir', t('scanDirPlaceholder'));
  setIfExists('scan-label-results', t('scanLabel'));
  setIfExists('btn-scan-run', t('scanRun'));
  setIfExists('btn-scan-all', t('selectAll'));
  setIfExists('btn-scan-import', t('importSelected'));
}

function setIfExists(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function setPlaceholder(id, text) {
  const el = document.getElementById(id);
  if (el) el.placeholder = text;
}
