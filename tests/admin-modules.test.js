const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const ADMIN_MODULES = [
  'admin-core.js',
  'admin-map.js',
  'admin-bonuses.js',
  'admin-ocr.js',
  'admin-att.js',
  'admin-comms.js',
  'admin-main.js'
];

function createMockEnv() {
  const els = {};
  const makeEl = id => {
    const el = {
      id: id || '',
      hidden: false,
      value: '',
      textContent: '',
      innerHTML: '',
      className: '',
      style: {},
      dataset: {},
      classList: {
        _set: new Set(),
        add(c) { this._set.add(c); },
        remove(c) { this._set.delete(c); },
        toggle(c, f) { if (f === undefined) { if (this._set.has(c)) this._set.delete(c); else this._set.add(c); } else if (f) this._set.add(c); else this._set.delete(c); },
        contains(c) { return this._set.has(c); }
      },
      addEventListener() {},
      removeEventListener() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      appendChild() {},
      remove() {},
      closest() { return null; },
      focus() {},
      click() {}
    };
    if (id) els[id] = el;
    return el;
  };

  ['panel', 'login', 'who', 'err', 'toast', 'view', 'admMenuBtn', 'admChatBtn', 'lgGo', 'lgPw', 'lgEm', 'lgMsg', 'admNick', 'admAttBtn', 'ocrTabBdg', 'admMenuBdg', 'admChatBdg', 'diagBtn'].forEach(makeEl);
  els.panel.hidden = true;

  let authCb = null;
  const listenedPaths = [];
  const authObj = {
    currentUser: null,
    onAuthStateChanged(cb) { authCb = cb; return () => {}; },
    signOut() { authObj.currentUser = null; if (authCb) authCb(null); return Promise.resolve(); }
  };
  const dbObj = {
    ref(p) {
      return {
        on(ev, cb) { listenedPaths.push(p); return cb; },
        off() {},
        once() { return Promise.resolve({ val: () => ({}) }); },
        set() { return Promise.resolve(); },
        update() { return Promise.resolve(); },
        remove() { return Promise.resolve(); },
        push() { return Promise.resolve(); }
      };
    }
  };
  const lsData = {};
  const ls = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(lsData, k) ? lsData[k] : null; },
    setItem(k, v) { lsData[k] = String(v); },
    removeItem(k) { delete lsData[k]; }
  };

  const doc = {
    hidden: false,
    body: makeEl('body'),
    head: makeEl('head'),
    documentElement: makeEl('html'),
    getElementById(id) { return els[id] || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement(tag) { return makeEl(tag); },
    addEventListener() {}
  };

  const win = {
    OCR_CLASSIFIER_ONLY: true,
    scrollY: 0,
    scrollTo() {},
    location: { href: 'https://eurobaza.web.app/admin.html', reload() {} },
    history: { state: null, pushState() {}, back() {} },
    navigator: { userAgent: 'Mozilla/5.0 Android Chrome/120', clipboard: { writeText: () => Promise.resolve() } },
    localStorage: ls,
    sessionStorage: ls,
    document: doc,
    firebase: {
      apps: [],
      initializeApp() { this.apps.push({}); },
      auth: () => authObj,
      database: () => dbObj
    },
    MutationObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    addEventListener() {},
    setTimeout: () => 1,
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    fetch: () => Promise.resolve({ json: () => Promise.resolve({ v: '20261127000000' }) }),
    performance: { now: () => 0 },
    console
  };
  win.window = win;

  const sandbox = Object.assign({}, win);
  vm.createContext(sandbox);

  for (const dep of ['catalog.js', 'bonus-engine.js', 'ocr.js', ...ADMIN_MODULES]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, dep), 'utf8'), sandbox, { filename: dep });
  }

  return { sandbox, els, authObj, listenedPaths, triggerAuth: u => { authObj.currentUser = u; if (authCb) authCb(u); } };
}

test('admin-*.js: все 7 модулей загружаются без ошибок и экспортируют полный API Adm', () => {
  const { sandbox } = createMockEnv();
  const Adm = sandbox.window.Adm;
  assert.ok(Adm && Adm.S, 'window.Adm и Adm.S должны существовать');

  const expectedFns = [
    // core
    'g', 'esc', 'nm', 'toast', 'ask', 'askInput', 'openDialog', 'isSubAdm', 'logSubAct', 'devs', 'syncCrewsFromLabels',
    // map
    'destroyMap', 'fitAllDrivers', 'syncMapMarkers', 'drawSubMap', 'drawMap',
    // bonuses
    'parseCar', 'allCars', 'aggCarMonths', 'admFbKey', 'findAffectedDocsByRule', 'findAffectedDocsByAllRules', 'openRecalcModal', 'openAdmSumModal', 'openTariffsModal', 'drawTariffs', 'hasUnsavedTariffs', 'resetTariffsDraft', 'drawTotals', 'migrateDevToCar',
    // ocr
    'pruneStaleOcrPending', 'updOcrTabBdg', 'drawOcr', 'openOcrRuleModal', 'ocrNorm',
    // att
    'attCurYm', 'attShiftYm', 'drawAtt', 'attAddWorker', 'attToggle', 'attMergeManualToApp', 'openAttWorkerModal', 'openCrewOffModal', 'attExportCsv', 'attCopyReport',
    // comms
    'admNotify', 'dmUnread', 'markAdmDmSeen', 'updAdmDmTabBadges', 'onDmSnap', 'updAdmChatBdg', 'markAdmChatSeen', 'renderAdmChat', 'openAdmChat', 'openAdmDm', 'renderSubLog', 'drawSubLog', 'openSubLogModal', 'drawDiag', 'openAdmMenu',
    // main
    'draw', 'scheduleDraw', 'drawOnline', 'drawVer', 'drawCrews', 'refreshCrewsMgr', 'openCrewsManagerModal', 'loadPub'
  ];
  for (const fn of expectedFns) {
    assert.equal(typeof Adm[fn], 'function', `Adm.${fn} должна быть функцией`);
  }
  assert.equal(typeof sandbox.window._admPushErr, 'function');
  assert.equal(typeof sandbox.window._openAdmDiag, 'function');
  assert.ok(Adm.OCR_HY_KW && typeof Adm.OCR_HY_KW === 'object');
});

test('admin-*.js: рендер основных вкладок (online, totals, ocr, att, ver) не падает', () => {
  const env = createMockEnv();
  const Adm = env.sandbox.window.Adm;
  env.triggerAuth({ isAnonymous: false, email: 'vazgenstepanyan2002@gmail.com', uid: 'adm1' });
  Adm.S.USERS = { u1: { uname: 'Тест', car: 'BB', t: Date.now(), v: '20261127134810', lang: 'ru' } };
  Adm.S.CARS = { BB: { qty: { other_a: 2 }, docs: {}, hist: {} } };
  Adm.S.OCR_MAP = { komod: 'other_d' };
  Adm.drawOnline();
  Adm.drawTotals();
  Adm.drawOcr();
  Adm.drawAtt();
  Adm.drawVer();
  Adm.drawCrews();
  Adm.drawTariffs();
  Adm.drawSubLog();
  Adm.drawDiag();
  Adm.onDmSnap({});
  assert.ok(env.els.view.innerHTML.length > 0);
});

test('admin-*.js: анонимная сессия НЕ пускает в админку', () => {
  const { els, listenedPaths, triggerAuth } = createMockEnv();
  triggerAuth({ isAnonymous: true, email: null, uid: 'anon123' });
  assert.equal(els.panel.hidden, true);
  assert.equal(els.login.hidden, false);
  assert.equal(listenedPaths.length, 0, 'При анонимной сессии не должно быть подписок RTDB');
});

test('admin-*.js: субадмин изолирован от accounts и subadminLog, главный админ подписывается на оба', () => {
  const envSub = createMockEnv();
  envSub.triggerAuth({ isAnonymous: false, email: 'diannakirakosyan@gmail.com', uid: 'sub1' });
  assert.equal(envSub.els.panel.hidden, false);
  assert.equal(envSub.sandbox.window.Adm.isSubAdm(), true);
  assert.ok(!envSub.listenedPaths.includes('accounts'), 'Субадмин не должен подписываться на accounts');
  assert.ok(!envSub.listenedPaths.includes('subadminLog'), 'Субадмин не должен подписываться на subadminLog');
  assert.ok(envSub.listenedPaths.includes('attendance'), 'Субадмин должен видеть attendance');
  assert.ok(envSub.listenedPaths.includes('config/tariffs'), 'Субадмин должен получать актуальные тарифы для расчётов');
  envSub.sandbox.window.Adm.drawTariffs();
  assert.equal(envSub.sandbox.window.Adm.S.TAB, 'online', 'Субадмин не должен попадать на вкладку тарифов');
  assert.ok(!envSub.els.view.innerHTML.includes('id="tarList"'), 'У субадмина не должен рендериться редактор тарифов');

  const envMain = createMockEnv();
  envMain.triggerAuth({ isAnonymous: false, email: 'vazgenstepanyan2002@gmail.com', uid: 'adm1' });
  assert.equal(envMain.els.panel.hidden, false);
  assert.equal(envMain.sandbox.window.Adm.isSubAdm(), false);
  assert.ok(envMain.listenedPaths.includes('accounts'), 'Главный админ должен подписываться на accounts');
  assert.ok(envMain.listenedPaths.includes('subadminLog'), 'Главный админ должен подписываться на subadminLog');
  assert.ok(envMain.listenedPaths.includes('config/tariffs'), 'Главный админ должен подписываться на config/tariffs');
  envMain.sandbox.window.Adm.drawTariffs();
  assert.ok(envMain.els.view.innerHTML.includes('id="tarList"'), 'У главного админа должен рендериться редактор тарифов');
});

test('admin-*.js: серверная роль S.MY_ROLE управляет isSubAdm() приоритетно', () => {
  const env = createMockEnv();
  const Adm = env.sandbox.window.Adm;
  env.triggerAuth({ isAnonymous: false, email: 'other@example.com', uid: 'u99' });
  assert.equal(Adm.isSubAdm(), false);
  Adm.S.MY_ROLE = 'subadmin';
  assert.equal(Adm.isSubAdm(), true);
  Adm.S.MY_ROLE = 'admin';
  assert.equal(Adm.isSubAdm(), false);
});

test('admin-*.js: нет системных alert/confirm/prompt', () => {
  for (const f of ADMIN_MODULES) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!/(^|[^\w.$])(alert|confirm|prompt)\s*\(/.test(code), `Найден системный диалог в ${f}`);
  }
});
