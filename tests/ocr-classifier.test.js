const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

function loadOcrClassifier() {
  const sandbox = { window: { OCR_CLASSIFIER_ONLY: true }, console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'catalog.js'), 'utf8'), sandbox, { filename: 'catalog.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'ocr.js'), 'utf8'), sandbox, { filename: 'ocr.js' });
  return {
    classify: sandbox.window.ocrClassifyByCode,
    fixName: sandbox.window.ocrFixName,
    catalog: sandbox.window.EB_CATALOG
  };
}

const { classify, fixName, catalog } = loadOcrClassifier();

test('OCR: игнорирование доставки и сборки (HY + RU)', () => {
  for (const s of ['Տեղափոխություն Երևան', 'Հավաքում', 'Доставка и сборка', 'Перевозка мебели']) {
    const r = classify(s);
    assert.equal(r.ignore, true, `Должен игнорироваться: ${s}`);
    assert.equal(r.code, '');
  }
});

test('OCR: недавние регрессионные фиксы (արդուկի սեղան, տակդիր, ջահ)', () => {
  assert.equal(classify('Արդուկի սեղան').code, 'other_d');
  assert.equal(classify('Հյուրասրահի տակդիր 1.8մ').code, 'living_b');
  assert.equal(classify('Հյուրասրահի տակդիր 1.5մ').code, 'living_a');
  assert.equal(classify('Տակդիր հեռուստացույցի').code, 'other_k');
  assert.equal(classify('Ջահ 8 մոմ').code, 'other_f');

  const fixedChandelier = fixName('Զահ 6 մոմ');
  assert.equal(fixedChandelier, 'Ջահ 6 մոմ');
  assert.equal(classify(fixedChandelier).code, 'other_f');
});

test('OCR: шкафы (Форте, 2 м, 1 дверь, 6 дверей, угловой)', () => {
  assert.equal(classify('Պահարան Ֆորտե').code, 'wardrobe_c');
  assert.equal(classify('Шкаф 2 м').code, 'wardrobe_d');
  assert.equal(classify('Պահարան 1 դուռ').code, 'other_f');
  assert.equal(classify('Պահարան 6 դուռ').code, 'wardrobe_e');
  assert.equal(classify('Шкаф угловой').code, 'wardrobe_a');
});

test('OCR: прихожие и ресепшен (Тор прямой vs угловой, размер)', () => {
  assert.equal(classify('Նախասրահ Տոռ').code, 'recep_a');
  assert.equal(classify('Նախասրահ Տոռ անկյունային').code, 'recep_b');
  const fixedTor = fixName('Ընդունարանի կ Տոո');
  assert.equal(fixedTor, 'Ընդունարանի կ. Տոռ');
  assert.equal(classify(fixedTor).code, 'recep_a');
  assert.equal(classify('Прихожая Мальвина 120 см').code, 'recep_a');
});

test('OCR: спальни (0,9*2, количество дверей, модели)', () => {
  assert.equal(classify('Ննջասենյակ Տոսկանա 0,9*2').code, 'bedroom_g');
  assert.equal(classify('Ննջասենյակ 3 դուռ առանց կոմոդ').code, 'bedroom_b');
  assert.equal(classify('Ննջասենյակ 3 դուռ').code, 'bedroom_c');
  assert.equal(classify('Ննջասենյակ 6 դուռ').code, 'bedroom_f');
  assert.equal(classify('Спальня 2 двери').code, 'bedroom_a');
  assert.equal(classify('Ննջասենյակ Ռաֆայել 180').code, 'bedroom_d');
});

test('OCR: мягкая мебель, кухни, цвета и исправление опечаток', () => {
  assert.equal(classify('Բազմոց + 2 բազկաթոռ').code, 'sofas_c');

  const fixedKitchen = fixName('Խոհանոց Կերապատրա 2.4մ');
  assert.equal(fixedKitchen, 'Խոհանոց Կլեոպատրա 2.4մ');
  assert.equal(classify(fixedKitchen).code, 'kitchen_b');

  const fixedBed = fixName('Ննիգա ննջասենյակ սանղմա դուռ կրաֆտ');
  assert.equal(fixedBed, 'Ննիցա ննջասենյակ սանոմա դուբ կրաֆտ');
  assert.equal(classify(fixedBed).code, 'bedroom_d');
});

test('OCR: нечёткая классификация (fuzzyClassify) с опечатками и цветами', () => {
  const cases = [
    ['պահարն Ռիոո', 'wardrobe_b'],
    ['նախասրհ Գալինաա', 'recep_b'],
    ['ննջասենյակի Մոնակօ', 'bedroom_d'],
    ['Պահառան Ռաֆաել դուբ կրաֆտ սպիտակ', 'wardrobe_b']
  ];
  for (const [input, expected] of cases) {
    const r = classify(input);
    assert.equal(r.ignore, false);
    assert.equal(r.code, expected, `Ожидали ${expected} для "${input}", получили "${r.code}"`);
    assert.ok(catalog.BON_BY_CODE[r.code], `Код ${r.code} существует в каталоге`);
  }
});
