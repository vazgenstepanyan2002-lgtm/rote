// CATALOG: единый справочник категорий мебели, тарифов и переводов EuroBaza
(function(){
  const CATEGORIES = [
    {
      pk: 'other', hy: 'Այլ', ru: 'Другое', en: 'Other', ico: '📦',
      hyKw: 'այլ աթոռ դարակաշար սեղան լվացարան կոմոդ մահճակալ մոդուլ ներքնակ պահոց դուռ պուֆ տումբա ջահ արդուկ',
      subs: [
        { sk: 'a', hy: 'Աթոռ, դարակաշար', ru: 'Стулья, стеллажи', en: 'Chairs, shelving', one: 1, p1: 50, pickKw: 'աթոռ դարակաշար աստիճան полка стеллаж стул' },
        { sk: 'b', hy: 'Աթոռ սեղաններ', ru: 'Стулья, столы', en: 'Chairs, tables', one: 1, p1: 100, pickKw: 'աթոռ սեղան գրասեղան стол стул' },
        { sk: 'c', hy: 'Լվացարան', ru: 'Раковина', en: 'Sink', p1: 300, p2: 390, pickKw: 'լվացարան раковина мойка' },
        { sk: 'd', hy: 'Կոմոդներ', ru: 'Комоды', en: 'Dressers', p1: 500, p2: 650, pickKw: 'կոմոդ կոմոդներ զարդասեղան արդուկ комод трюмо гладильная' },
        { sk: 'e', hy: 'Մահճակալ', ru: 'Кровать', en: 'Bed', p1: 500, p2: 650, pickKw: 'մահճակալ кровать' },
        { sk: 'f', hy: 'Մոդուլներ', ru: 'Модули', en: 'Modules', p1: 250, p2: 325, pickKw: 'մոդուլ մոդուլներ ջահ модуль люстра' },
        { sk: 'g', hy: 'Ներքնակներ', ru: 'Матрасы', en: 'Mattresses', p1: 250, p2: 325, pickKw: 'ներքնակ ներքնակներ матрас' },
        { sk: 'h', hy: 'Պահոցներ', ru: 'Системы хранения', en: 'Storage units', p1: 500, p2: 650, pickKw: 'պահոց պահոցներ короб ящик хранения' },
        { sk: 'i', hy: 'դուռ', ru: 'Дверь', en: 'Door', one: 1, p1: 500, pickKw: 'դուռ դռներ дверь' },
        { sk: 'j', hy: 'Պուֆիկներ', ru: 'Пуфы', en: 'Poufs', p1: 50, p2: 65, pickKw: 'պուֆ պուֆիկ պուֆիկներ пуф' },
        { sk: 'k', hy: 'Տումբաներ', ru: 'Тумбы', en: 'Cabinets', p1: 50, p2: 65, pickKw: 'տումբա տումբաներ тумба' }
      ]
    },
    {
      pk: 'sofas', hy: 'Բազմոցներ', ru: 'Диваны', en: 'Sofas', ico: '🛋️',
      hyKw: 'բազմոց բազկաթոռ հավաքածու',
      subs: [
        { sk: 'a', hy: 'Բազկաթոռ', ru: 'Кресло', en: 'Armchair', p1: 500, p2: 650, pickKw: 'բազկաթոռ кресло диваны' },
        { sk: 'b', hy: 'Բազմոց', ru: 'Диван', en: 'Sofa', p1: 1000, p2: 1300, pickKw: 'բազմոց диван' },
        { sk: 'c', hy: 'Հավաքածու', ru: 'Комплект', en: 'Set', ocrRu: 'Комплект мягкой мебели', p1: 1500, p2: 1950, pickKw: 'փափուկ կահույք հավաքածու комплект мягкой мебели диваны' }
      ]
    },
    {
      pk: 'recep', hy: 'Ընդունարան', ru: 'Ресепшен', en: 'Reception desk', ico: '🗄️',
      hyKw: 'ընդունարան ռեսեպշեն նախասրահ',
      subs: [
        { sk: 'a', hy: 'Մինչև 1,6', ru: 'До 1,6', en: 'Up to 1.6', shortRu: 'До 1,6 м', ocrRu: 'Прихожая / ресепшен до 1,6 м', p1: 700, p2: 910, pickKw: 'ընդունարան ռեսեպշեն նախասրահ прихожая ресепшен эконом мини до 1.6' },
        { sk: 'b', hy: '1,6 ից ավել', ru: 'Более 1,6', en: 'Over 1.6', shortRu: 'Более 1,6 м', ocrRu: 'Прихожая / ресепшен более 1,6 м', p1: 1200, p2: 1560, pickKw: 'ընդունարան ռեսեպշեն նախասրահ прихожая ресепшен более 1.6' }
      ]
    },
    {
      pk: 'kitchen', hy: 'Խոհանոցներ', ru: 'Кухни', en: 'Kitchens', ico: '🍳',
      hyKw: 'խոհանոց',
      subs: [
        { sk: 'a', hy: '1,6 մ', ru: '1,6 м', en: '1.6 m', ocrRu: 'Кухня 1,6 м', p1: 1000, p2: 1300, pickKw: 'խոհանոց խոհանոցներ кухня 1.6' },
        { sk: 'b', hy: '2-3 մ', ru: '2–3 м', en: '2–3 m', ocrRu: 'Кухня 2–3 м', p1: 2500, p2: 3250, pickKw: 'խոհանոց խոհանոցներ кухня 2 3 люкс' }
      ]
    },
    {
      pk: 'living', hy: 'Հյուրասրահ', ru: 'Гостиная', en: 'Living room', ico: '📺',
      hyKw: 'հյուրասրահ հյուրասենյակ տակդիր',
      subs: [
        { sk: 'a', hy: 'մինչև 1,7', ru: 'До 1,7', en: 'Up to 1.7', shortRu: 'До 1,7 м', ocrRu: 'Гостиная до 1,7 м', p1: 1000, p2: 1300, pickKw: 'հյուրասրահ հյուրասենյակ տակդիր гостиная до 1.7 мини' },
        { sk: 'b', hy: '1,7 ից ավել', ru: 'Более 1,7', en: 'Over 1.7', shortRu: 'Более 1,7 м', ocrRu: 'Гостиная более 1,7 м', p1: 2000, p2: 2600, pickKw: 'հյուրասրահ հյուրասենյակ гостиная более 1.7' },
        { sk: 'c', hy: 'Էքսկլ.', ru: 'Эксклюзив', en: 'Exclusive', ocrRu: 'Гостиная Эксклюзив', p1: 3000, p2: 3900, pickKw: 'հյուրասրահ հյուրասենյակ էքսկլյուզիվ гостиная эксклюзив' }
      ]
    },
    {
      pk: 'bedroom', hy: 'Ննջասենյակներ', ru: 'Спальни', en: 'Bedrooms', ico: '🛏️',
      hyKw: 'ննջասենյակ ննջարան',
      subs: [
        { sk: 'a', hy: '2 դուռ', ru: '2 двери', en: '2 doors', ocrRu: 'Спальня 2 двери', p1: 1050, p2: 1365, pickKw: 'ննջասենյակ ննջարան 2 դուռ դռնանի спальня двери' },
        { sk: 'b', hy: '3 դուռ առանց կոմոդ', ru: '3 двери без комода', en: '3 doors without dresser', ocrRu: 'Спальня 3 двери без комода', p1: 1550, p2: 2015, pickKw: 'ննջասենյակ ննջարան 3 դուռ առանց կոմոդ спальня без комода' },
        { sk: 'c', hy: '3 դուռ կոմոդով', ru: '3 двери с комодом', en: '3 doors with dresser', ocrRu: 'Спальня 3 двери с комодом', p1: 2050, p2: 2665, pickKw: 'ննջասենյակ ննջարան 3 դուռ կոմոդով րիո էկո спальня с комодом' },
        { sk: 'd', hy: '4 դուռ', ru: '4 двери', en: '4 doors', ocrRu: 'Спальня 4 двери', p1: 2600, p2: 3380, pickKw: 'ննջասենյակ ննջարան 4 դուռ նիցցա ալսու մոնա լիզա спальня' },
        { sk: 'e', hy: '5 դուռ', ru: '5 дверей', en: '5 doors', ocrRu: 'Спальня 5 дверей', p1: 3100, p2: 4030, pickKw: 'ննջասենյակ ննջարան 5 դուռ спальня' },
        { sk: 'f', hy: '6 դուռ', ru: '6 дверей', en: '6 doors', ocrRu: 'Спальня 6 дверей', p1: 3600, p2: 4680, pickKw: 'ննջասենյակ ննջարան 6 դուռ պրեստիժ спальня' },
        { sk: 'g', hy: '0,9*2', ru: '0,9*2', en: '0,9*2', ocrRu: 'Спальня 0,9*2', p1: 3100, p2: 4030, pickKw: 'ննջասենյակ սենյակ 0.9*2 0,9*2 կասկադ ռիտա տոսկանա спальня' }
      ]
    },
    {
      pk: 'wardrobe', hy: 'Պահարաններ', ru: 'Шкафы', en: 'Wardrobes', ico: '🚪',
      hyKw: 'պահարան',
      subs: [
        { sk: 'a', hy: '2 դուռ', ru: '2 двери', en: '2 doors', ocrRu: 'Шкаф 2 двери', p1: 500, p2: 650, pickKw: 'պահարան 2 դուռ դռնանի шкаф двери' },
        { sk: 'b', hy: '3 դուռ', ru: '3 двери', en: '3 doors', ocrRu: 'Шкаф 3 двери', p1: 1000, p2: 1300, pickKw: 'պահարան 3 դուռ դռնանի ատլանտա 1600 1800 160 180 ստանդարտ шкаф двери' },
        { sk: 'c', hy: '4 դուռ', ru: '4 двери', en: '4 doors', ocrRu: 'Шкаф 4 двери', p1: 1500, p2: 1950, pickKw: 'պահարան 4 դուռ դռնանի шкаф двери' },
        { sk: 'd', hy: '5 դուռ', ru: '5 дверей', en: '5 doors', ocrRu: 'Шкаф 5 дверей', p1: 2000, p2: 2600, pickKw: 'պահարան 5 դուռ դռնանի шкаф двери' },
        { sk: 'e', hy: '6 դուռ', ru: '6 дверей', en: '6 doors', ocrRu: 'Шкаф 6 дверей', p1: 2500, p2: 3250, pickKw: 'պահարան 6 դուռ դռնանի шкаф двери' }
      ]
    }
  ];

  const PRE = CATEGORIES.map(c => ({
    pk: c.pk,
    name: c.hy,
    subs: c.subs.map(s => s.one
      ? { sk: s.sk, name: s.hy, one: 1, price: s.p1 }
      : { sk: s.sk, name: s.hy, price: s.p1, price2: s.p2 })
  }));

  const CAR_CATALOG = CATEGORIES.map(c => ({
    pk: c.pk,
    name: c.hy,
    subs: c.subs.map(s => s.one
      ? { sk: s.sk, name: s.hy, one: 1, p1: s.p1 }
      : { sk: s.sk, name: s.hy, p1: s.p1, p2: s.p2 })
  }));

  const BON_ITEMS = [];
  const OCR_CAT_NAMES = {};
  const HY_PICK_KW = {};
  const OCR_HY_KW = {};
  const ICO = {};
  const CAT_ICO = {};
  const FURNITURE_NAMES_I18N = {};
  const RU = {};

  CATEGORIES.forEach(c => {
    ICO[c.pk] = c.ico;
    CAT_ICO[c.ru] = c.ico;
    OCR_HY_KW[c.pk] = c.hyKw;
    FURNITURE_NAMES_I18N[c.hy] = [c.ru, c.en];
    RU[c.hy] = c.ru;
    c.subs.forEach(s => {
      const code = c.pk + '_' + s.sk;
      const item = { code: code, cat: c.ru, name: s.ocrRu || s.ru, p1: s.p1, p2: s.one ? s.p1 : s.p2 };
      if (s.one) item.one = 1;
      BON_ITEMS.push(item);
      OCR_CAT_NAMES[code] = c.ru + ' · ' + (s.shortRu || s.ru);
      HY_PICK_KW[code] = s.pickKw;
      if (s.hy !== s.ru || s.hy !== s.en) {
        FURNITURE_NAMES_I18N[s.hy] = [s.ru, s.en];
        RU[s.hy] = s.ru;
      }
    });
  });

  const BON_BY_CODE = Object.fromEntries(BON_ITEMS.map(x => [x.code, x]));
  const DEFAULT_TARIFFS = {};
  CATEGORIES.forEach(c => {
    c.subs.forEach(s => {
      const code = c.pk + '_' + s.sk;
      DEFAULT_TARIFFS[code] = { p1: s.p1, p2: s.one ? s.p1 : s.p2, one: !!s.one };
    });
  });

  const TARIFFS_LS_KEY = 'BON_TARIFFS_V1';
  let _activeTariffs = {};
  const _tariffListeners = [];

  function sanitizeTariffsMap(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(DEFAULT_TARIFFS).forEach(code => {
      const rec = raw[code];
      if (!rec || typeof rec !== 'object') return;
      const def = DEFAULT_TARIFFS[code];
      const p1Raw = Number(rec.p1);
      const p1 = Number.isFinite(p1Raw) && p1Raw >= 0 && p1Raw <= 1000000 ? Math.round(p1Raw) : def.p1;
      if (def.one) {
        if (p1 !== def.p1) out[code] = { p1: p1 };
      } else {
        const p2Raw = Number(rec.p2);
        const p2 = Number.isFinite(p2Raw) && p2Raw >= 0 && p2Raw <= 1000000 ? Math.round(p2Raw) : def.p2;
        if (p1 !== def.p1 || p2 !== def.p2) out[code] = { p1: p1, p2: p2 };
      }
    });
    return out;
  }

  function applyTariffs(rawMap, opts) {
    const clean = sanitizeTariffsMap(rawMap);
    _activeTariffs = clean;
    let itemIdx = 0;
    CATEGORIES.forEach((c, ci) => {
      c.subs.forEach((s, si) => {
        const code = c.pk + '_' + s.sk;
        const def = DEFAULT_TARIFFS[code];
        const ov = clean[code];
        const p1 = ov && typeof ov.p1 === 'number' ? ov.p1 : def.p1;
        const p2 = def.one ? p1 : (ov && typeof ov.p2 === 'number' ? ov.p2 : def.p2);
        s.p1 = p1;
        if (!def.one) s.p2 = p2;
        if (PRE[ci] && PRE[ci].subs[si]) {
          PRE[ci].subs[si].price = p1;
          if (!def.one) PRE[ci].subs[si].price2 = p2;
        }
        if (CAR_CATALOG[ci] && CAR_CATALOG[ci].subs[si]) {
          CAR_CATALOG[ci].subs[si].p1 = p1;
          if (!def.one) CAR_CATALOG[ci].subs[si].p2 = p2;
        }
        if (BON_ITEMS[itemIdx]) {
          BON_ITEMS[itemIdx].p1 = p1;
          BON_ITEMS[itemIdx].p2 = p2;
        }
        itemIdx++;
      });
    });
    if (!(opts && opts.skipSave) && typeof localStorage !== 'undefined') {
      try {
        if (Object.keys(clean).length) localStorage.setItem(TARIFFS_LS_KEY, JSON.stringify(clean));
        else localStorage.removeItem(TARIFFS_LS_KEY);
      } catch (e) {}
    }
    if (!(opts && opts.silent)) {
      _tariffListeners.forEach(fn => { try { fn(clean); } catch (e) {} });
    }
    return clean;
  }

  function getTariff(code) {
    const def = DEFAULT_TARIFFS[code];
    if (!def) return null;
    const ov = _activeTariffs[code];
    const p1 = ov && typeof ov.p1 === 'number' ? ov.p1 : def.p1;
    const p2 = def.one ? p1 : (ov && typeof ov.p2 === 'number' ? ov.p2 : def.p2);
    return { p1: p1, p2: p2, one: def.one, defP1: def.p1, defP2: def.p2, custom: !!ov };
  }

  function getActiveTariffs() {
    return Object.assign({}, _activeTariffs);
  }

  function getCustomTariffsCount() {
    return Object.keys(_activeTariffs).length;
  }

  function onTariffsChange(fn) {
    if (typeof fn === 'function' && !_tariffListeners.includes(fn)) _tariffListeners.push(fn);
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(TARIFFS_LS_KEY);
      if (saved) applyTariffs(JSON.parse(saved), { skipSave: true, silent: true });
    } catch (e) {}
  }

  const nm = v => RU[v] || v;
  const furnitureName = value => {
    const pair = FURNITURE_NAMES_I18N[value];
    if (!pair) return value;
    const lang = window.getLang ? window.getLang() : 'ru';
    return lang === 'hy' ? value : pair[lang === 'en' ? 1 : 0];
  };

  window.EB_CATALOG = {
    CATEGORIES: CATEGORIES,
    PRE: PRE,
    CAR_CATALOG: CAR_CATALOG,
    BON_ITEMS: BON_ITEMS,
    BON_BY_CODE: BON_BY_CODE,
    DEFAULT_TARIFFS: DEFAULT_TARIFFS,
    OCR_CAT_NAMES: OCR_CAT_NAMES,
    HY_PICK_KW: HY_PICK_KW,
    OCR_HY_KW: OCR_HY_KW,
    ICO: ICO,
    CAT_ICO: CAT_ICO,
    FURNITURE_NAMES_I18N: FURNITURE_NAMES_I18N,
    RU: RU,
    nm: nm,
    furnitureName: furnitureName,
    sanitizeTariffsMap: sanitizeTariffsMap,
    applyTariffs: applyTariffs,
    getTariff: getTariff,
    getActiveTariffs: getActiveTariffs,
    getCustomTariffsCount: getCustomTariffsCount,
    onTariffsChange: onTariffsChange
  };
})();
