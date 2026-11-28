const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

function loadCatalog(lang = 'ru') {
  const sandbox = { window: { getLang: () => lang }, console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'catalog.js'), 'utf8'), sandbox, { filename: 'catalog.js' });
  return sandbox.window.EB_CATALOG;
}

test('catalog.js: 7 категорий и 33 уникальные позиции', () => {
  const cat = loadCatalog('ru');
  assert.equal(cat.CATEGORIES.length, 7);
  assert.equal(cat.PRE.length, 7);
  assert.equal(cat.CAR_CATALOG.length, 7);
  assert.equal(cat.BON_ITEMS.length, 33);
  assert.equal(Object.keys(cat.BON_BY_CODE).length, 33);
  assert.equal(Object.keys(cat.OCR_CAT_NAMES).length, 33);
  assert.equal(Object.keys(cat.HY_PICK_KW).length, 33);
  assert.equal(Object.keys(cat.OCR_HY_KW).length, 7);
  assert.equal(Object.keys(cat.ICO).length, 7);
  assert.equal(Object.keys(cat.CAT_ICO).length, 7);
});

test('catalog.js: корректные цены и флаг one во всех проекциях', () => {
  const cat = loadCatalog('ru');
  for (const item of cat.BON_ITEMS) {
    assert.ok(item.p1 > 0, `p1 > 0 для ${item.code}`);
    assert.ok(item.p2 > 0, `p2 > 0 для ${item.code}`);
    if (item.one) {
      assert.equal(item.p1, item.p2, `Для one=1 (${item.code}) p1 должен совпадать с p2`);
    } else {
      assert.ok(item.p2 > item.p1, `Для ${item.code} цена Район (p2) должна быть выше Города (p1)`);
    }
    assert.ok(cat.OCR_CAT_NAMES[item.code], `Есть OCR_CAT_NAMES для ${item.code}`);
    assert.ok(cat.HY_PICK_KW[item.code], `Есть HY_PICK_KW для ${item.code}`);
  }

  // Проверка совпадения PRE и CAR_CATALOG
  for (let i = 0; i < cat.PRE.length; i++) {
    const p = cat.PRE[i], c = cat.CAR_CATALOG[i];
    assert.equal(p.pk, c.pk);
    assert.equal(p.name, c.name);
    assert.equal(p.subs.length, c.subs.length);
    for (let j = 0; j < p.subs.length; j++) {
      assert.equal(p.subs[j].sk, c.subs[j].sk);
      assert.equal(p.subs[j].price, c.subs[j].p1);
      if (p.subs[j].one) {
        assert.equal(p.subs[j].price2, undefined);
        assert.equal(c.subs[j].p2, undefined);
      } else {
        assert.equal(p.subs[j].price2, c.subs[j].p2);
      }
    }
  }
});

test('catalog.js: переводы на 3 языка (ru, hy, en) и nm()', () => {
  const ruCat = loadCatalog('ru');
  const hyCat = loadCatalog('hy');
  const enCat = loadCatalog('en');

  assert.equal(ruCat.furnitureName('Կոմոդներ'), 'Комоды');
  assert.equal(hyCat.furnitureName('Կոմոդներ'), 'Կոմոդներ');
  assert.equal(enCat.furnitureName('Կոմոդներ'), 'Dressers');

  assert.equal(ruCat.furnitureName('դուռ'), 'Дверь');
  assert.equal(enCat.furnitureName('դուռ'), 'Door');
  assert.equal(ruCat.furnitureName('0,9*2'), '0,9*2');

  assert.equal(ruCat.nm('Ննջասենյակներ'), 'Спальни');
  assert.equal(ruCat.nm('0,9*2'), '0,9*2');
  assert.equal(ruCat.OCR_CAT_NAMES.recep_a, 'Ресепшен · До 1,6 м');
  assert.equal(ruCat.BON_BY_CODE.recep_a.name, 'Прихожая / ресепшен до 1,6 м');
});

test('catalog.js: applyTariffs синхронно обновляет все проекции, валидирует и сбрасывает к базе', () => {
  const cat = loadCatalog('ru');
  const defBed = cat.DEFAULT_TARIFFS.bedroom_d;
  const defDoor = cat.DEFAULT_TARIFFS.other_i;
  assert.equal(defBed.p1, 2600);
  assert.equal(defBed.p2, 3380);
  assert.equal(defDoor.one, true);
  assert.equal(defDoor.p1, 500);

  let notified = 0;
  cat.onTariffsChange(() => { notified++; });

  // Применяем кастомные тарифы + мусорные/невалидные значения
  const applied = cat.applyTariffs({
    bedroom_d: { p1: 3000, p2: 3900 },
    other_i: { p1: 750, p2: 9999 }, // one=1 -> p2 игнорируется
    other_c: { p1: -100, p2: 'bad' }, // невалидные -> остаются базовыми
    unknown_item: { p1: 999 } // несуществующий код -> отбрасывается
  });

  assert.equal(notified, 1);
  assert.deepEqual(Object.keys(applied).sort(), ['bedroom_d', 'other_i']);
  assert.equal(cat.getCustomTariffsCount(), 2);

  // Все проекции синхронно обновились на месте
  assert.equal(cat.BON_BY_CODE.bedroom_d.p1, 3000);
  assert.equal(cat.BON_BY_CODE.bedroom_d.p2, 3900);
  assert.equal(cat.BON_BY_CODE.other_i.p1, 750);
  assert.equal(cat.BON_BY_CODE.other_i.p2, 750);

  const preBed = cat.PRE.find(c => c.pk === 'bedroom').subs.find(s => s.sk === 'd');
  const carBed = cat.CAR_CATALOG.find(c => c.pk === 'bedroom').subs.find(s => s.sk === 'd');
  assert.equal(preBed.price, 3000);
  assert.equal(preBed.price2, 3900);
  assert.equal(carBed.p1, 3000);
  assert.equal(carBed.p2, 3900);

  const preDoor = cat.PRE.find(c => c.pk === 'other').subs.find(s => s.sk === 'i');
  const carDoor = cat.CAR_CATALOG.find(c => c.pk === 'other').subs.find(s => s.sk === 'i');
  assert.equal(preDoor.price, 750);
  assert.equal(preDoor.price2, undefined);
  assert.equal(carDoor.p1, 750);
  assert.equal(carDoor.p2, undefined);

  // Невалидные значения не сломали other_c
  assert.equal(cat.BON_BY_CODE.other_c.p1, cat.DEFAULT_TARIFFS.other_c.p1);
  assert.equal(cat.BON_BY_CODE.other_c.p2, cat.DEFAULT_TARIFFS.other_c.p2);

  // Сброс к дефолту пустым объектом
  cat.applyTariffs({});
  assert.equal(cat.getCustomTariffsCount(), 0);
  assert.equal(cat.BON_BY_CODE.bedroom_d.p1, 2600);
  assert.equal(cat.BON_BY_CODE.bedroom_d.p2, 3380);
  assert.equal(cat.BON_BY_CODE.other_i.p1, 500);
  assert.equal(notified, 2);
});
