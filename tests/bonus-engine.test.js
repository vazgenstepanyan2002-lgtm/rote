const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

function loadBonusEngine() {
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'bonus-engine.js'), 'utf8'), sandbox, { filename: 'bonus-engine.js' });
  return sandbox.window.BonusEngine;
}

test('BonusEngine.num: парсинг запятых, нулей и некорректных значений', () => {
  const E = loadBonusEngine();
  assert.equal(E.num('2,5'), 2.5);
  assert.equal(E.num('12.5'), 12.5);
  assert.equal(E.num(3), 3);
  assert.equal(E.num(0), 0);
  assert.equal(E.num(-5), 0);
  assert.equal(E.num('abc'), 0);
  assert.equal(E.num(null), 0);
  assert.equal(E.num(undefined), 0);
});

test('BonusEngine.computeSummaryRows: Город, Район и фиксированные (one=1) позиции', () => {
  const E = loadBonusEngine();
  const categories = [
    {
      name: 'Այլ',
      subs: [
        { name: 'Աթոռ, դարակաշար', one: 1, qty: 3, price: 50, qty2: 0, price2: 0 },
        { name: 'Կոմոդներ', one: 0, qty: 2, price: 500, qty2: 1, price2: 650 },
        { name: 'Մահճակալ', one: 0, qty: 0, price: 500, qty2: 0, price2: 650 }
      ]
    },
    {
      name: 'Պահարաններ',
      subs: [
        { name: '3 դուռ', one: 0, qty: 0, price: 1000, qty2: 2, price2: 1300 }
      ]
    },
    {
      name: 'Խոհանոցներ',
      subs: [
        { name: '1,6 մ', one: 0, qty: 0, price: 1000, qty2: 0, price2: 1300 }
      ]
    }
  ];

  const rows = E.computeSummaryRows(categories);
  assert.equal(rows.length, 2, 'Пустая категория Кухни должна быть отфильтрована');

  // Այլ: 3*50 + 2*500 + 1*650 = 150 + 1000 + 650 = 1800, qty = 6
  assert.equal(rows[0].name, 'Այլ');
  assert.equal(rows[0].sum, 1800);
  assert.equal(rows[0].items.length, 2);
  assert.equal(rows[0].items[0].parts[0].l, '', 'Для one=1 метка зоны пустая');
  assert.equal(rows[0].items[1].parts.length, 2);
  assert.equal(rows[0].items[1].parts[0].l, 'Город');
  assert.equal(rows[0].items[1].parts[1].l, 'Район');

  // Պահարաններ: 2*1300 = 2600, qty = 2
  assert.equal(rows[1].name, 'Պահարաններ');
  assert.equal(rows[1].sum, 2600);

  assert.equal(E.categoryQuantity(rows[0]), 6);
  assert.equal(E.categoryQuantity(rows[1]), 2);
  assert.equal(E.totalQuantity(rows), 8);
  assert.equal(E.totalSum(rows), 4400);
});

test('BonusEngine: пустой ввод не падает', () => {
  const E = loadBonusEngine();
  assert.equal(E.computeSummaryRows([]).length, 0);
  assert.equal(E.totalQuantity([]), 0);
  assert.equal(E.totalSum([]), 0);
});
