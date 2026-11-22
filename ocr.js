// OCR: автоподсчёт бонусов EuroBaza по накладным (Gemini + облачный словарь)
(function(){
  const GKEY = ['AQ.Ab8RN6LziHiRoI-kFxMOFA', 'FNqH9QT5tjkiqPTvuiHhnkVeFSMg'].join('');
  const g = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const CUR = '֏';
  const fm = n => (Math.round((+n || 0) * 100) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 });

  const BON_ITEMS = [
    { code: 'other_a', cat: 'Другое', name: 'Стулья, стеллажи', one: 1, p1: 50, p2: 50 },
    { code: 'other_b', cat: 'Другое', name: 'Стулья, столы', one: 1, p1: 100, p2: 100 },
    { code: 'other_c', cat: 'Другое', name: 'Раковина', p1: 300, p2: 390 },
    { code: 'other_d', cat: 'Другое', name: 'Комоды', p1: 500, p2: 650 },
    { code: 'other_e', cat: 'Другое', name: 'Кровать', p1: 500, p2: 650 },
    { code: 'other_f', cat: 'Другое', name: 'Модули', p1: 250, p2: 325 },
    { code: 'other_g', cat: 'Другое', name: 'Матрасы', p1: 250, p2: 325 },
    { code: 'other_h', cat: 'Другое', name: 'Системы хранения', p1: 500, p2: 650 },
    { code: 'other_i', cat: 'Другое', name: 'Дверь', one: 1, p1: 500, p2: 500 },
    { code: 'other_j', cat: 'Другое', name: 'Пуфы', p1: 50, p2: 65 },
    { code: 'other_k', cat: 'Другое', name: 'Тумбы', p1: 50, p2: 65 },
    { code: 'sofas_a', cat: 'Диваны', name: 'Кресло', p1: 500, p2: 650 },
    { code: 'sofas_b', cat: 'Диваны', name: 'Диван', p1: 1000, p2: 1300 },
    { code: 'sofas_c', cat: 'Диваны', name: 'Комплект мягкой мебели', p1: 1500, p2: 1950 },
    { code: 'recep_a', cat: 'Ресепшен', name: 'Прихожая / ресепшен до 1,6 м', p1: 700, p2: 910 },
    { code: 'recep_b', cat: 'Ресепшен', name: 'Прихожая / ресепшен более 1,6 м', p1: 1200, p2: 1560 },
    { code: 'kitchen_a', cat: 'Кухни', name: 'Кухня 1,6 м', p1: 1000, p2: 1300 },
    { code: 'kitchen_b', cat: 'Кухни', name: 'Кухня 2–3 м', p1: 2500, p2: 3250 },
    { code: 'living_a', cat: 'Гостиная', name: 'Гостиная до 1,7 м', p1: 1000, p2: 1300 },
    { code: 'living_b', cat: 'Гостиная', name: 'Гостиная более 1,7 м', p1: 2000, p2: 2600 },
    { code: 'living_c', cat: 'Гостиная', name: 'Гостиная Эксклюзив', p1: 3000, p2: 3900 },
    { code: 'bedroom_a', cat: 'Спальни', name: 'Спальня 2 двери', p1: 1050, p2: 1365 },
    { code: 'bedroom_b', cat: 'Спальни', name: 'Спальня 3 двери без комода', p1: 1550, p2: 2015 },
    { code: 'bedroom_c', cat: 'Спальни', name: 'Спальня 3 двери с комодом', p1: 2050, p2: 2665 },
    { code: 'bedroom_d', cat: 'Спальни', name: 'Спальня 4 двери', p1: 2600, p2: 3380 },
    { code: 'bedroom_e', cat: 'Спальни', name: 'Спальня 5 дверей', p1: 3100, p2: 4030 },
    { code: 'bedroom_f', cat: 'Спальни', name: 'Спальня 6 дверей', p1: 3600, p2: 4680 },
    { code: 'bedroom_g', cat: 'Спальни', name: 'Спальня 0,9*2', p1: 3100, p2: 4030 },
    { code: 'wardrobe_a', cat: 'Шкафы', name: 'Шкаф 2 двери', p1: 500, p2: 650 },
    { code: 'wardrobe_b', cat: 'Шкафы', name: 'Шкаф 3 двери', p1: 1000, p2: 1300 },
    { code: 'wardrobe_c', cat: 'Шкафы', name: 'Шкаф 4 двери', p1: 1500, p2: 1950 },
    { code: 'wardrobe_d', cat: 'Шкафы', name: 'Шкаф 5 дверей', p1: 2000, p2: 2600 },
    { code: 'wardrobe_e', cat: 'Шкафы', name: 'Шкаф 6 дверей', p1: 2500, p2: 3250 }
  ];
  const BON_BY_CODE = Object.fromEntries(BON_ITEMS.map(x => [x.code, x]));
  const HY_PICK_KW = {
    other_a: 'աթոռ դարակաշար աստիճան полка стеллаж стул',
    other_b: 'աթոռ սեղան գրասեղան стол стул',
    other_c: 'լվացարան раковина мойка',
    other_d: 'կոմոդ կոմոդներ комод',
    other_e: 'մահճակալ кровать',
    other_f: 'մոդուլ մոդուլներ модуль',
    other_g: 'ներքնակ ներքնակներ матрас',
    other_h: 'պահոց պահոցներ короб ящик хранения',
    other_i: 'դուռ դռներ дверь',
    other_j: 'պուֆ պուֆիկ պուֆիկներ пуф',
    other_k: 'տումբա տումբաներ тумба',
    sofas_a: 'բազկաթոռ кресло диваны',
    sofas_b: 'բազմոց диван',
    sofas_c: 'փափուկ կահույք հավաքածու комплект мягкой мебели диваны',
    recep_a: 'ընդունարան ռեսեպշեն նախասրահ прихожая ресепшен эконом мини до 1.6',
    recep_b: 'ընդունարան ռեսեպշեն նախասրահ прихожая ресепшен более 1.6',
    kitchen_a: 'խոհանոց խոհանոցներ кухня 1.6',
    kitchen_b: 'խոհանոց խոհանոցներ кухня 2 3 люкс',
    living_a: 'հյուրասրահ հյուրասենյակ гостиная до 1.7 мини',
    living_b: 'հյուրասրահ հյուրասենյակ гостиная более 1.7',
    living_c: 'հյուրասրահ հյուրասենյակ էքսկլյուզիվ гостиная эксклюзив',
    bedroom_a: 'ննջասենյակ ննջարան 2 դուռ դռնանի спальня двери',
    bedroom_b: 'ննջասենյակ ննջարան 3 դուռ առանց կոմոդ спальня без комода',
    bedroom_c: 'ննջասենյակ ննջարան 3 դուռ կոմոդով րիո էկո спальня с комодом',
    bedroom_d: 'ննջասենյակ ննջարան 4 դուռ նիցցա ալսու մոնա լիզա спальня',
    bedroom_e: 'ննջասենյակ ննջարան 5 դուռ спальня',
    bedroom_f: 'ննջասենյակ ննջարան 6 դուռ պրեստիժ спальня',
    bedroom_g: 'ննջասենյակ սենյակ 0.9*2 0,9*2 спальня',
    wardrobe_a: 'պահարան 2 դուռ դռնանի шкаф двери',
    wardrobe_b: 'պահարան 3 դուռ դռնանի ատլանտա 1600 1800 160 180 ստանդարտ шкаф двери',
    wardrobe_c: 'պահարան 4 դուռ դռնանի шкаф двери',
    wardrobe_d: 'պահարան 5 դուռ դռնանի шкаф двери',
    wardrobe_e: 'պահարան 6 դուռ դռնանի шкаф двери'
  };
  const normText = s => String(s || '').toLowerCase().replace(/և/g, 'եվ').replace(/ё/g, 'е').replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim();
  const normSearch = s => normText(s).replace(/[,]/g, '.').replace(/["'«»()_\/]+/g, ' ').replace(/(\d)\s*[×xх*]\s*(\d)/g, '$1*$2').replace(/\s+/g, ' ').trim();
  const normRules = s => normText(s).replace(/["'«»()]/g, ' ').replace(/\s+/g, ' ').trim();
  const normModel = s => String(s || '').toLowerCase().replace(/[\"'«»().,]/g, ' ').replace(/\s+/g, ' ').trim();
  const fbKey = k => normModel(k).replace(/[.#$\[\]\/]+/g, '_').slice(0, 120);
  const editDist = (a, b) => {
    const n = a.length, m = b.length;
    if (!n) return m; if (!m) return n;
    if (Math.abs(n - m) > 4) return 99;
    let prev = Array.from({ length: m + 1 }, (_, j) => j), cur = new Array(m + 1);
    for (let i = 1; i <= n; i++) {
      cur[0] = i;
      for (let j = 1; j <= m; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
      }
      const t = prev; prev = cur; cur = t;
    }
    return prev[m];
  };

  let CLOUD_MAP = (() => { try { return JSON.parse(localStorage.getItem('BON_OCR_MAP') || '{}') || {}; } catch (e) { return {}; } })();
  let LOCAL_MAP = (() => { try { return JSON.parse(localStorage.getItem('BON_OCR_LOCAL') || '{}') || {}; } catch (e) { return {}; } })();
  const _cmWait = setInterval(() => {
    if (!window.firebase || !firebase.apps || !firebase.apps.length) return;
    clearInterval(_cmWait);
    firebase.database().ref('config/ocrMap').on('value', s => {
      const val = (s.val() && typeof s.val() === 'object') ? s.val() : {};
      CLOUD_MAP = val;
      Object.keys(val).forEach(k => { if (LOCAL_MAP[k]) delete LOCAL_MAP[k]; });
      try {
        localStorage.setItem('BON_OCR_MAP', JSON.stringify(CLOUD_MAP));
        localStorage.setItem('BON_OCR_LOCAL', JSON.stringify(LOCAL_MAP));
      } catch (e) {}
    }, () => {});
  }, 800);

  function saveCloudModel(rawName, code, isAdminRole, fromCode){
    const fk = fbKey(rawName);
    if (!fk || !code) return;
    if (isAdminRole) {
      CLOUD_MAP[fk] = code;
      try { localStorage.setItem('BON_OCR_MAP', JSON.stringify(CLOUD_MAP)); } catch (e) {}
    } else {
      LOCAL_MAP[fk] = code;
      try { localStorage.setItem('BON_OCR_LOCAL', JSON.stringify(LOCAL_MAP)); } catch (e) {}
    }
    if (!window.firebase || !firebase.apps || !firebase.apps.length) return;
    const db = firebase.database();
    if (isAdminRole) {
      db.ref('config/ocrMap/' + fk).set(code).catch(() => {});
    } else {
      const uid = (() => { try { return localStorage.getItem('ADM_UID') || ''; } catch (e) { return ''; } })();
      const who = (() => { try { return localStorage.getItem('USER_NAME') || 'Водитель'; } catch (e) { return 'Водитель'; } })();
      if (uid) db.ref('users/' + uid + '/ocrPending/' + fk).set({ raw: String(rawName || '').trim(), code, from: fromCode || '', by: who, uid, t: Date.now() }).catch(() => {});
    }
  }

  const RULES = [
    { ignore: true, rx: /(?:տեղափոխու[թտ]յուն|հավաքում|доставк|перевозк|сборк)/i },

    // Спальни: 0,9*2 и явное кол-во дверей, затем модели по категориям
    { code: 'bedroom_g', rx: /(?:^|\s)(?:ննջասենյ?ակ\w*|ննջարան\w*|(?:^|\s)ննջ(?=\s|$)|սենյակ\w*|спальн\w*|[տթ][ոա]սկանա|тоскана).*0[.,\s]+9\s*[*xх×]\s*2/i },
    { code: 'bedroom_f', rx: /(?:ննջասենյ?ակ|ննջարան|(?:^|\s)ննջ(?=\s|$)|спальн).*(?:^|[\s\/(\-])6\s*(?:դուռ|двер)/i },
    { code: 'bedroom_e', rx: /(?:ննջասենյ?ակ|ննջարան|(?:^|\s)ննջ(?=\s|$)|спальн).*(?:^|[\s\/(\-])5\s*(?:դուռ|двер)/i },
    { code: 'bedroom_d', rx: /(?:ննջասենյ?ակ|ննջարան|(?:^|\s)ննջ(?=\s|$)|спальн).*(?:^|[\s\/(\-])4\s*(?:դուռ|двер)/i },
    { code: 'bedroom_b', rx: /(?:ննջասենյ?ակ|ննջարան|(?:^|\s)ննջ(?=\s|$)|спальн).*(?:^|[\s\/(\-])3\s*(?:դուռ|двер).*(?:առանց կոմոդ|без комод)/i },
    { code: 'bedroom_c', rx: /(?:ննջասենյ?ակ|ննջարան|(?:^|\s)ննջ(?=\s|$)|спальн).*(?:^|[\s\/(\-])3\s*(?:դուռ|двер)/i },
    { code: 'bedroom_a', rx: /(?:ննջասենյ?ակ|ննջարան|(?:^|\s)ննջ(?=\s|$)|спальн).*(?:^|[\s\/(\-])2\s*(?:դուռ|двер)/i },
    { code: 'bedroom_a', rx: /(?:ննջասենյ?ակ|ննջարան|(?:^|\s)ննջ(?=\s|$)|спальн).*(?:ջունիոր|джуниор|մանկական|детск)/i },
    { code: 'bedroom_g', rx: /^(?!.*(?:160|180|1[.,\s]*6|1[.,\s]*8)).*(?:ննջասենյ?ակ|ննջարան|(?:^|\s)ննջ(?=\s|$)|спальн).*(?:կասկադ|каскад|ռիտա|рита)/i },
    { code: 'bedroom_b', rx: /(?:ննջասենյ?ակ|ննջարան|(?:^|\s)ննջ(?=\s|$)|спальн).*(?:[կք]ա[տթ]անա\s*մինի|катана\s*мини|լիլյա|лилия)/i },
    { code: 'bedroom_d', rx: /(?:ննջասենյ?ակ|ննջարան|(?:^|\s)ննջ(?=\s|$)|спальн).*(?:մոնա\s*լիզ+ա|мона\s*лиза|ռաֆա[եէ]?լ.*180|рафаэл.*180)/i },
    { code: 'bedroom_f', rx: /(?:ննջասենյ?ակ|ննջարան|(?:^|\s)ննջ(?=\s|$)|спальн).*(?:պ[ռր]եստիժ|престиж|պատրիսիա|патрисия|մոդեռն|модерн|էլեգանտ\s*լյուքս|элегант\s*люкс)/i },
    { code: 'bedroom_e', rx: /(?:ննջասենյ?ակ|ննջարան|(?:^|\s)ննջ(?=\s|$)|спальн).*(?:ռոյալ|роял|լիզ+ա|лиза|մունլայ[տթ]|мунлайт|կարոլինա|каролина|վենեցիա|венеция|վիկտոր[իյ]ա|виктория|գրեյվուդ|грейвуд)/i },
    { code: 'bedroom_d', rx: /(?:ննջասենյ?ակ|ննջարան|(?:^|\s)ննջ(?=\s|$)|спальн).*(?:նից+ա|ницца|ալս?ու|алсу|վի?են+ա|венна|вена|նիրվանա|нирвана|կվադրո|квадро|[կք]ա[տթ]անա|катана|էլեգանտ|элегант|բել+ա|белла|գլամուր|гламур|կոմբի|комби|ալեքսանդր|александр|այսբերգ|айсберг|պրեմիեր|премьер|ժասմին|жасмин|ֆորտե|форте|[տթ][ոա]սկանա|тоскана|ռիտ+եր|риттер|մարոկ+ո|марокко|գլորիա|глория|միրաժ|мираж|սիվիլիա|сивилия|севилия)/i },
    { code: 'bedroom_c', rx: /(?:ննջասենյ?ակ|ննջարան|(?:^|\s)ննջ(?=\s|$)|спальн).*(?:[ռր]իո|рио|էկո|эко|դանա|дана|մոնակո|монако|ռաֆա[եէ]?լ|рафаэл)/i },

    // Прихожие / Ресепшен
    { code: 'recep_b', rx: /(?:ընդունա[ռր]ան|նախասրահ|прихож|ресепш).*(?:անկյունային|углов)/i },
    { code: 'recep_a', rx: /(?:ընդունա[ռր]ան|նախասրահ|прихож|ресепш).*(?:1[.,\s]+[0-5]|(?:^|\s)(?:80|90|100|110|120|130|140|150|155))(?:\s|$|մ|м|սմ|см)/i },
    { code: 'recep_b', rx: /(?:ընդունա[ռր]ան|նախասրահ|прихож|ресепш).*(?:1[.,\s]+[6-9]|2(?:\s*(?:մ|м)|[.,\s]+\d)|(?:^|\s)(?:160|170|180|190|200|210|220|240))(?:\s|$|մ|м|սմ|см)/i },
    { code: 'recep_a', rx: /(?:ընդունա[ռր]ան|նախասրահ|прихож|ресепш).*(?:էմի?լի|эмили|էկո|эко|մինի|мини|մալվինա|мальвина|մաշա|маша|ալինա|алина|միլա|мила|ալիսա|алиса|տո[ռր]|тор|կսենիա|ксения|յանա|яна|[շս]ի[մժ]ո|шимо|шижо|կարոլինա|каролина|էլիզա|элиза)/i },
    { code: 'recep_b', rx: /(?:ընդունա[ռր]ան|նախասրահ|прихож|ресепш).*(?:գալինա|галина|լենա|лена|պ[աո]լինա|палина|полина|գալյա|галя|տրիո|трио|անտոնինա|антонина|ռոյալ|роял|մունլայ[տթ]|мунлайт|վիկտոր[իյ]ա|виктория)/i },

    // Раковины и Кухни
    { code: 'other_c', rx: /(?:լվացարան|раковин|мойк)/i },
    { code: 'kitchen_b', rx: /(?:խոհանո[ցծ]|кухн).*(?:լյուքս|люкс|կլեոպատրա|клеопатра|ռաֆա[եէ]?լ|рафаэл|ալիք|волна|2\s*(?:մ|м)|2[.,\s]+\d|3(?:\s*(?:մ|м)|[.,\s]*0)|2-3|180|200|220|240|250|260|280|300)(?=\s|$|մ|м|սմ|см)/i },
    { code: 'kitchen_a', rx: /(?:խոհանո[ցծ]|кухн).*(?:1[.,\s]+6|160)(?=\s|$|մ|м|սմ|см)/i },

    // Гостиные (комоды и подставки гостиной — отдельно от комплектов)
    { code: 'other_d', rx: /(?:հյուրասենյ?ակ|հյուրասրահ|гостин).*(?:կոմոդ|комод)/i },
    { code: 'other_k', rx: /(?:հյուրասենյ?ակ|հյուրասրահ|гостин).*(?:տակդիր|տումբա|тумб|подставк)/i },
    { code: 'living_c', rx: /(?:հյուրասենյ?ակ|հյուրասրահ|гостин).*(?:էքսկլ|экскл|կլասիկ|классик|պրահա|прага|պեկին|пекин|էլբա|эльба)/i },
    { code: 'living_a', rx: /(?:հյուրասենյ?ակ|հյուրասրահ|гостин).*(?:մինի|мини|ռուբիկոն|рубикон|1[.,\s]+[0-7](?:\s|$|մ|м)|(?:^|\s)(?:120|130|140|150|160|170)(?:\s|$|սմ|см))/i },
    { code: 'living_b', rx: /(?:հյուրասենյ?ակ|հյուրասրահ|гостин).*(?:տրոյա|троя|ապոլ+ո|аполло|նեքսթ|некст|ատլանտիկ|атлантик|անապա|анапа|անիտա|анита|այսբերգ|айсберг|չեստեր|честер|միրաժ|мираж|հարմոնիա|гармония|աֆինա|афина|էնզո|энзо|կոմբի|комби|ֆորտե|форте|կարոլինա|каролина|ամելի|амели|1[.,\s]+[89]|2(?:\s*(?:մ|м)|[.,\s]+\d)|(?:^|\s)(?:180|190|200|210|220|240|250|260)(?:\s|$|սմ|см))/i },

    // Шкафы
    { code: 'other_f', rx: /(?:պահա[ռր]ան|шкаф).*(?:^|[\s\/(\-])1\s*(?:դուռ|двер)/i },
    { code: 'wardrobe_a', rx: /(?:պահա[ռր]ան|шкаф).*(?:անկյունային|углов)/i },
    { code: 'wardrobe_e', rx: /(?:պահա[ռր]ան|шкаф).*(?:^|[\s\/(\-])6\s*(?:դուռ|двер)/i },
    { code: 'wardrobe_d', rx: /(?:պահա[ռր]ան|шкаф).*(?:(?:^|[\s\/(\-])5\s*(?:դուռ|двер)|(?:^|\s)2\s*(?:մ|м)(?:\s|$))/i },
    { code: 'wardrobe_b', rx: /(?:պահա[ռր]ան|шкаф).*(?:ստանդարտ|стандарт).*(?:1600?|1800?)(?:\s|$|սմ|см|մմ|мм)/i },
    { code: 'wardrobe_a', rx: /(?:պահա[ռր]ան|шкаф).*(?:ստանդարտ|стандарт).*(?:1200?|1400?)(?:\s|$|սմ|см|մմ|мм)/i },
    { code: 'wardrobe_c', rx: /(?:պահա[ռր]ան|шкаф).*(?:(?:^|[\s\/(\-])4\s*(?:դուռ|двер)|(?:^|\s)(?:1600|1800|160|180)(?:\s|$|սմ|см|մմ|мм))/i },
    { code: 'wardrobe_b', rx: /(?:պահա[ռր]ան|шкаф).*(?:(?:^|[\s\/(\-])3\s*(?:դուռ|двер)|(?:^|\s)(?:120|140)(?:\s|$|սմ|см))/i },
    { code: 'wardrobe_a', rx: /(?:պահա[ռր]ան|шкаф).*(?:(?:^|[\s\/(\-])2\s*(?:դուռ|двер)|(?:^|\s)(?:80|90|100)(?:\s|$|սմ|см))/i },
    { code: 'wardrobe_d', rx: /(?:պահա[ռր]ան|шкаф).*(?:պրեմիեր|премьер|ֆորտե|форте)/i },
    { code: 'wardrobe_c', rx: /(?:պահա[ռր]ան|шкаф).*(?:գլորիա|глория|վի?են+ա|венна|вена|մունլայ[տթ]|мунлайт|նիրվանա|нирвана)/i },
    { code: 'wardrobe_b', rx: /(?:պահա[ռր]ան|шкаф).*(?:[կք]ա[տթ]անա\s*մինի|катана\s*мини|ատլան[տթ][աի]?|атлант|ռաֆա[եէ]?լ|рафаэл|վարշավա|варшава|[ռր]իո|рио|դանա|дана|ստանդարտ|стандарт|հարմոնիա|гармония)/i },
    { code: 'wardrobe_a', rx: /(?:պահա[ռր]ան|шкаф).*(?:էլեգանտ|элегант|[կք]ա[տթ]անա|катана|կարոլինա|каролина|մոնա\s*լիզ+ա|мона\s*лиза)/i },

    // Мягкая мебель
    { code: 'sofas_c', rx: /^(?!.*(?:ննջասենյ?ակ|ննջարան|(?:^|\s)ննջ(?=\s|$)|խոհանո[ցծ]|հյուրասենյ?ակ|հյուրասրահ|ընդունա[ռր]ան|նախասրահ|պահա[ռր]ան|спальн|кухн|гостин|прихож|шкаф)).*(?:փափուկ կահույք|հավաքածու|комплект|\+\s*(?:\d+\s*)?(?:բազկաթոռ|кресл))/i },
    { code: 'sofas_a', rx: /(?:բազկաթոռ|кресл)/i },
    { code: 'sofas_b', rx: /(?:բազմոց|диван)/i },

    // Прочее
    { code: 'other_g', rx: /(?:ներքնա[կք]|матрас)/i },
    { code: 'other_h', rx: /(?:պահոց|короб|ящик для белья)/i },
    { code: 'other_d', rx: /(?:կ[ոօ]մ[ոօ][դտքգթ]|комод)/i },
    { code: 'other_e', rx: /(?:մահճա[կք]ալ|кроват)/i },
    { code: 'other_k', rx: /(?:տումբա|տակդիր|тумб|подставк)/i },
    { code: 'other_j', rx: /(?:պուֆ|пуф)/i },
    { code: 'other_f', rx: /(?:մոդուլ|модул)/i },
    { code: 'other_i', rx: /^(?!.*(?:պահա|ննջա|(?:^|\s)ննջ(?=\s|$)|ընդուն|խոհան|հյուրա|սենյակ|կոմոդ|մահճակալ|шкаф|спаль|прихож|кухн)).*(?:^|\s)(?:դուռ|дверь)(?:\s|$)/i },
    { code: 'other_a', rx: /(?:դարակաշար|դարակ|ստելլաժ|стеллаж|полк)/i },
    { code: 'other_b', rx: /(?:զարդասեղան|գրասեղան|սեղան|стол|трюмо)/i },
    { code: 'other_a', rx: /(?:աթոռ|стул)/i }
  ];

  const fixOcrName = s => String(s || '')
    .replace(/դուռ(\s+կրաֆտ)/gi, 'դուբ$1')
    .replace(/([Սս])ան[դղօ]մա/g, '$1անոմա')
    .replace(/(^|[\s/])([Շշ])իմ(?=$|[\s/])/g, '$1$2իմո')
    .replace(/(^|[\s/])([Կկ])ոմ[ոօ][քգթլ](?=$|[\s/])/g, '$1$2ոմոդ')
    .replace(/(^|[\s/])([Սս])երի[հղն]ա(?=$|[\s/])/g, '$1$2երիա')
    .replace(/(Ընդունարանի\s+կ)(?=\s)/g, '$1.')
    .replace(/(^|\s)ալու(\s+լայթ)/gi, '$1Ալսու$2');

  const FUZZY_TYPES = [
    ['bed', ['ննջասենյակ', 'ննջասենյակի', 'ննջարան', 'ննջարանի', 'спальня', 'спальный']],
    ['rec', ['ընդունարան', 'ընդունարանի', 'նախասրահ', 'прихожая', 'ресепшен']],
    ['kit', ['խոհանոց', 'խոհանոցի', 'խոհանոցային', 'кухня', 'кухонный']],
    ['liv', ['հյուրասենյակ', 'հյուրասենյակի', 'հյուրասրահ', 'гостиная']],
    ['war', ['պահարան', 'шкаф']],
    ['sof', ['բազմոց', 'բազկաթոռ', 'հավաքածու', 'диван', 'кресло']],
    ['other_g', ['ներքնակ', 'матрас']],
    ['other_h', ['պահոց', 'короб']],
    ['other_d', ['կոմոդ', 'комод']],
    ['other_e', ['մահճակալ', 'кровать']],
    ['other_k', ['տումբա', 'տակդիր', 'тумба']],
    ['other_j', ['պուֆ', 'пуф']],
    ['other_c', ['լվացարան', 'раковина']],
    ['other_b', ['զարդասեղան', 'գրասեղան', 'սեղան', 'стол']],
    ['other_a', ['աթոռ', 'դարակաշար', 'стул', 'стеллаж']]
  ];

  const FUZZY_MODELS = {
    bed: [
      ['ջունիոր', 'bedroom_a'], ['մանկական', 'bedroom_a'], ['джуниор', 'bedroom_a'],
      ['կատանա մինի', 'bedroom_b'], ['катана мини', 'bedroom_b'],
      ['ռիո', 'bedroom_c'], ['րիո', 'bedroom_c'], ['էկո', 'bedroom_c'], ['լիլյա', 'bedroom_b'],
      ['գլորիա', 'bedroom_d'], ['դանա', 'bedroom_c'], ['մոնակո', 'bedroom_c'], ['միրաժ', 'bedroom_d'],
      ['սիվիլիա', 'bedroom_d'], ['сивилия', 'bedroom_d'], ['կասկադ', 'bedroom_g'], ['рио', 'bedroom_c'], ['эко', 'bedroom_c'],
      ['մոնա լիզա', 'bedroom_d'], ['ռաֆայել', 'bedroom_d'], ['նիցցա', 'bedroom_d'], ['ալսու', 'bedroom_d'],
      ['վիեննա', 'bedroom_d'], ['ռիտա', 'bedroom_g'], ['նիրվանա', 'bedroom_d'], ['կվադրո', 'bedroom_d'],
      ['կատանա', 'bedroom_d'], ['էլեգանտ', 'bedroom_d'], ['բելլա', 'bedroom_d'], ['գլամուր', 'bedroom_d'],
      ['կոմբի', 'bedroom_d'], ['ալեքսանդր', 'bedroom_d'], ['այսբերգ', 'bedroom_d'], ['պրեմիեր', 'bedroom_d'],
      ['ժասմին', 'bedroom_d'], ['ֆորտե', 'bedroom_d'], ['տոսկանա', 'bedroom_d'], ['ռիտտեր', 'bedroom_d'],
      ['մարոկո', 'bedroom_d'], ['алсу', 'bedroom_d'], ['ницца', 'bedroom_d'], ['тоскана', 'bedroom_d'],
      ['էլեգանտ լյուքս', 'bedroom_f'], ['ռոյալ', 'bedroom_e'], ['լիզա', 'bedroom_e'], ['մունլայթ', 'bedroom_e'],
      ['կարոլինա', 'bedroom_e'], ['վենեցիա', 'bedroom_e'], ['վիկտորիա', 'bedroom_e'], ['գրեյվուդ', 'bedroom_e'],
      ['պրեստիժ', 'bedroom_f'], ['պատրիսիա', 'bedroom_f'], ['մոդեռն', 'bedroom_f'], ['престиж', 'bedroom_f']
    ],
    rec: [
      ['էմիլի', 'recep_a'], ['էկո', 'recep_a'], ['մինի', 'recep_a'], ['մալվինա', 'recep_a'],
      ['մաշա', 'recep_a'], ['ալինա', 'recep_a'], ['միլա', 'recep_a'], ['ալիսա', 'recep_a'],
      ['տոռ', 'recep_a'], ['կսենիա', 'recep_a'], ['յանա', 'recep_a'], ['շիմո', 'recep_a'],
      ['գալինա', 'recep_b'], ['կարոլինա', 'recep_a'], ['լենա', 'recep_b'], ['պալինա', 'recep_b'],
      ['գալյա', 'recep_b'], ['էլիզա', 'recep_a'], ['տրիո', 'recep_b'], ['անտոնինա', 'recep_b'],
      ['ռոյալ', 'recep_b'], ['մունլայթ', 'recep_b'], ['վիկտորիա', 'recep_b']
    ],
    kit: [
      ['կլեոպատրա', 'kitchen_b'], ['ռաֆայել', 'kitchen_b'], ['ալիք', 'kitchen_b'], ['լյուքս', 'kitchen_b']
    ],
    liv: [
      ['մինի', 'living_a'], ['ռուբիկոն', 'living_a'], ['տրոյա', 'living_b'], ['ապոլո', 'living_b'], ['նեքսթ', 'living_b'], ['ատլանտիկ', 'living_b'],
      ['անապա', 'living_b'], ['անիտա', 'living_b'], ['ատլանտիկ', 'living_b'], ['այսբերգ', 'living_b'],
      ['չեստեր', 'living_b'], ['միրաժ', 'living_b'], ['հարմոնիա', 'living_b'], ['աֆինա', 'living_b'],
      ['էնզո', 'living_b'], ['կոմբի', 'living_b'], ['ֆորտե', 'living_b'], ['կարոլինա', 'living_b'], ['ամելի', 'living_b'],
      ['կլասիկ', 'living_c'], ['պրահա', 'living_c'], ['պեկին', 'living_c'], ['էլբա', 'living_c']
    ],
    war: [
      ['անկյունային', 'wardrobe_a'], ['էլեգանտ', 'wardrobe_a'], ['կատանա', 'wardrobe_a'], ['կարոլինա', 'wardrobe_a'],
      ['կատանա մինի', 'wardrobe_b'], ['катана мини', 'wardrobe_b'], ['ատլանտա', 'wardrobe_b'], ['վարշավա', 'wardrobe_b'], ['ռիո', 'wardrobe_b'], ['րիո', 'wardrobe_b'],
      ['դանա', 'wardrobe_b'], ['ստանդարտ', 'wardrobe_b'], ['հարմոնիա', 'wardrobe_b'],
      ['գլորիա', 'wardrobe_c'], ['վիեննա', 'wardrobe_c'], ['մունլայթ', 'wardrobe_c'], ['նիրվանա', 'wardrobe_c'],
      ['մոնա լիզա', 'wardrobe_a'], ['ռաֆայել', 'wardrobe_b'],
      ['պրեմիեր', 'wardrobe_d'], ['ֆորտե', 'wardrobe_d']
    ]
  };

  function ocrEditDist(a, b){
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return 9;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      let rowMin = i;
      for (let j = 1; j <= n; j++) {
        const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        cur.push(v);
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > 2) return 9;
      prev = cur;
    }
    return prev[n];
  }

  function fuzzyClassify(norm){
    const words = norm.split(/[\s\-_/]+/).filter(w => w.length >= 2);
    if (!words.length) return '';
    const pairs = [];
    for (let i = 0; i < words.length - 1; i++) pairs.push(words[i] + ' ' + words[i + 1]);
    const tokens = words.concat(pairs);

    let grp = '', bestT = 9;
    for (const [gName, kws] of FUZZY_TYPES) {
      for (const w of words) {
        if (w.length < 4) continue;
        for (const kw of kws) {
          const d = ocrEditDist(w, kw);
          if (d <= (kw.length <= 5 ? 1 : 2) && d < bestT) { bestT = d; grp = gName; }
        }
      }
    }
    if (!grp) return '';
    if (grp.startsWith('other_')) return grp;
    if (grp === 'sof') {
      if (tokens.some(t => ocrEditDist(t, 'բազկաթոռ') <= 2)) return 'sofas_a';
      if (tokens.some(t => ocrEditDist(t, 'բազմոց') <= 2)) return 'sofas_b';
      return 'sofas_c';
    }
    if (grp === 'bed') {
      if (/0[.,\s]+9\s*[*xх×]\s*2/i.test(norm)) return 'bedroom_g';
      const dm = norm.match(/(?:^|[\s\/(\-])([2-6])\s*(?:դուռ|двер)/i);
      if (dm) return { '2': 'bedroom_a', '3': /առանց|без/i.test(norm) ? 'bedroom_b' : 'bedroom_c', '4': 'bedroom_d', '5': 'bedroom_e', '6': 'bedroom_f' }[dm[1]];
    }
    if (grp === 'war') {
      const dm = norm.match(/(?:^|[\s\/(\-])([1-6])\s*(?:դուռ|двер)/i);
      if (dm) return { '1': 'other_f', '2': 'wardrobe_a', '3': 'wardrobe_b', '4': 'wardrobe_c', '5': 'wardrobe_d', '6': 'wardrobe_e' }[dm[1]];
    }
    if (grp === 'rec' && /անկյունային|углов/i.test(norm)) return 'recep_b';
    if (grp === 'kit' && /(?:1[.,\s]+6|160)(?=\s|$|մ|м|սմ|см)/i.test(norm)) return 'kitchen_a';

    const models = FUZZY_MODELS[grp] || [];
    let bestCode = '', bestD = 9, bestLen = 0;
    for (const [mdl, cd] of models) {
      const maxD = mdl.length <= 4 ? 1 : 2;
      for (const t of tokens) {
        if (t.length < 3) continue;
        const d = ocrEditDist(t, mdl);
        if (d <= maxD && (d < bestD || (d === bestD && mdl.length > bestLen))) {
          bestD = d; bestCode = cd; bestLen = mdl.length;
        }
      }
    }
    return bestCode;
  }

  function classifyProduct(rawName){
    const clean = fixOcrName(String(rawName || '').replace(/\s+/g, ' ').trim());
    if (!clean) return { ignore: true };
    const norm = normModel(clean);
    if (RULES[0].rx.test(norm)) return { ignore: true };
    const fk = fbKey(clean);
    const mapped = fk && (CLOUD_MAP[fk] || LOCAL_MAP[fk]);
    if (mapped && BON_BY_CODE[mapped]) return { ignore: false, code: mapped };
    for (let i = 1; i < RULES.length; i++) if (RULES[i].rx.test(norm)) return { ignore: false, code: RULES[i].code };
    const fz = fuzzyClassify(norm);
    return { ignore: false, code: fz || '' };
  }

  const normEv = s => String(s || '').toLowerCase().replace(/և|եւ/g, 'եվ');
  const isRegionAddress = s => /(?:կոտայք|քանաք[ե]?ռավան|աբովյան|հրազդան|չարենցավան|եղվարդ|եզվարդ|բյուրեղավան|նոր հաճ[ը]?ն|առինջ|պտղնի|ձորաղբյուր|ջրվեժ|զովունի|պռոշյան|քասախ|բալահովիտ|մայակովսկի|գառնի|արզնի|արարատ|մասիս|արտաշատ|վեդի|նոր խարբերդ|մերձավան|փարաքար|արգավանդ|արմավիր|վաղարշապատ|էջմիածին|մեծամոր|արագածոտն|աշտարակ|ապարան|թալին|օշական|կարբի|բյուրական|շիրակ|գյումրի|արթիկ|մարալիկ|լոռի|վանաձոր|ալավերդի|սպիտակ|ստեփանավան|տաշիր|տավուշ|իջեվան|դիլիջան|բերդ|նոյեմբերյան|գեղարքունիք|գավառ|սեվան|մարտունի|վարդենիս|ճամբարակ|վայոց ձոր|եղեգնաձոր|եզեգնաձոր|ջերմուկ|վայք|սյունիք|կապան|գորիս|սիսիան|մեղրի|քաջարան|մարզ|котайк|канакераван|абовян|раздан|чаренцаван|егвард|бюрегаван|нор ачин|ариндж|пхтни|дзорахпюр|джрвеж|зовуни|прошян|касах|гарни|арзни|арарат|масис|арташат|веди|мердзаван|паракар|аргаванд|армавир|вагаршапат|эчмиадзин|мецамор|арагацотн|аштарак|ширак|гюмри|лори|ванадзор|тавуш|иджеван|дилижан|гегаркуник|гавар|севан|мартуни|вайоц дзор|ехегнадзор|сюник|капан|горис|сисиан|область|марз)/i.test(normEv(s));
  const isYerevanAddress = s => {
    const low = normEv(s);
    if (isRegionAddress(low)) return false;
    return /(?:ереван|երեվան|yerevan|աջափնյակ|արաբկիր|ավան|դավթաշեն|էրեբունի|կենտրոն|մալաթիա|նոր նորք|նորք-մարաշ|նուբարաշեն|շենգավիթ|քանաքեռ-զեյթուն|քանաքեռ|ачапняк|арабкир|аван|давидашен|эребуни|кентрон|малатия|нор норк|норк-мараш|нубарашен|шенгавит|канакер)/i.test(low);
  };

async function compressImage(file){
    if (file && file._preB64) return file._preB64;
    const isCrop = !!(file && file._isCropped);
    const maxSide = isCrop ? 1280 : 1600;
    const q = 0.85;
    const encodeCv = cv => {
      try {
        const wUrl = cv.toDataURL('image/webp', q);
        if (wUrl && wUrl.indexOf('data:image/webp') === 0) return wUrl.split(',').pop();
      } catch (e) {}
      return cv.toDataURL('image/jpeg', q).split(',').pop();
    };
    if (window.createImageBitmap) {
      try {
        const bmp0 = await createImageBitmap(file);
        const w0 = bmp0.width, h0 = bmp0.height;
        let w = w0, h = h0;
        if (w > maxSide || h > maxSide) {
          if (w > h) { h = Math.round(h * maxSide / w); w = maxSide; }
          else { w = Math.round(w * maxSide / h); h = maxSide; }
        }
        bmp0.close();
        const bmp = await createImageBitmap(file, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
        const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height;
        const ctx = cv.getContext('2d');
        if (!isCrop) ctx.filter = 'grayscale(1) contrast(1.18)';
        ctx.drawImage(bmp, 0, 0);
        if (!isCrop) ctx.filter = 'none';
        bmp.close();
        const out = encodeCv(cv);
        cv.width = cv.height = 0;
        return out;
      } catch (e) {}
    }
    const url = URL.createObjectURL(file);
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        if (w > maxSide || h > maxSide) { if (w > h) { h = Math.round(h * maxSide / w); w = maxSide; } else { w = Math.round(w * maxSide / h); h = maxSide; } }
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        if (!isCrop) ctx.filter = 'grayscale(1) contrast(1.18)';
        ctx.drawImage(img, 0, 0, w, h);
        if (!isCrop) ctx.filter = 'none';
        const out = encodeCv(cv);
        cv.width = cv.height = 0;
        res(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Ошибка чтения фото')); };
      img.src = url;
    });
  }

  const warmGeminiHost = () => {
    try {
      const host = ["generativelanguage", "googleapis", "com"].join(".");
      fetch("https" + "://" + host + "/", { mode: "no-cors", keepalive: true }).catch(() => {});
    } catch (e) {}
  };

async function askGemini(b64){
    try { localStorage.removeItem('OCR_FAST_MDL'); } catch (e) {}
    const cleanB64 = String(b64 || '');
    const mime = cleanB64.indexOf('UklGR') === 0 ? 'image/webp' : (cleanB64.indexOf('iVBOR') === 0 ? 'image/png' : 'image/jpeg');
    const host = ['generativelanguage', 'googleapis', 'com'].join('.');
    const prompt = 'Накладная EuroBaza (HY/RU/EN).\nВАЖНО: Если на фото НЕТ накладной, если снимок пустой, черный, темный, смазанный или это не накладная — верни items: [], doc: "", addr: "". Категорически запрещено выдумывать или генерировать несуществующие товары!\ndoc=номер СТРОГО только из строки «Վաճառքի փաստաթուղթ №» или «Վաճառքի փաստաթուղթ:» (цифры и дефис, обычно 0000-XXXXX, если строки нет — пустая строка). КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО брать номер из Բեռնափոխադրման թերթիկ.\naddr=ТОЛЬКО город или область (1-2 слова из Տեղափոխման հասցե, без улицы и телефонов, если нет — пустая строка).\nitems=[{name:ТОЛЬКО РЕАЛЬНЫЙ ТЕКСТ из таблицы Ապրանքի անվանումը, qty:целое число из Քանակ}] без доставки (Տեղափոխություն), сборки (Հավաքում) и фурнитуры. Если таблица с товарами не видна — items=[].';
    const schema = {
      type: 'OBJECT',
      properties: {
        doc: { type: 'STRING' },
        addr: { type: 'STRING' },
        items: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              qty: { type: 'INTEGER' }
            },
            required: ['name', 'qty']
          }
        }
      },
      required: ['doc', 'addr', 'items']
    };
    const baseModels = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-flash-latest'];
    const readSkip = () => {
      try {
        const raw = JSON.parse(localStorage.getItem('OCR_SKIP_MDL') || '{}') || {};
        const now = Date.now(), clean = {};
        for (const k in raw) if (raw[k] > now) clean[k] = raw[k];
        return clean;
      } catch (e) { return {}; }
    };
    const markSkip = (mdl, mins) => {
      try {
        const s = readSkip();
        s[mdl] = Date.now() + mins * 60000;
        localStorage.setItem('OCR_SKIP_MDL', JSON.stringify(s));
      } catch (e) {}
    };
    const getOrderedModels = () => {
      const skip = readSkip();
      let list = baseModels.filter(m => !skip[m]);
      try {
        const fc = JSON.parse(localStorage.getItem('OCR_FAST_MDL_V2') || 'null');
        if (fc && fc.m && /lite/.test(fc.m) && fc.t > Date.now() - 20 * 60000 && list.includes(fc.m)) {
          list = [fc.m].concat(list.filter(x => x !== fc.m));
        }
      } catch (e) {}
      return list;
    };
    const buildBody = (mdl, safeMode) => {
      let genCfg;
      if (safeMode) {
        genCfg = { responseMimeType: 'application/json' };
      } else {
        genCfg = { responseMimeType: 'application/json', responseSchema: schema, maxOutputTokens: 768 };
        if (/gemini-2\.5/.test(mdl)) {
          genCfg.temperature = 0;
          genCfg.thinkingConfig = { thinkingBudget: 0 };
        } else if (/gemini-3\.[15]-flash-lite/.test(mdl)) {
          genCfg.temperature = 0;
          genCfg.thinkingConfig = { thinkingLevel: 'MINIMAL' };
        } else if (/gemini-3\./.test(mdl)) {
          genCfg.temperature = 0;
          genCfg.thinkingConfig = { thinkingLevel: 'LOW' };
        } else {
          genCfg.thinkingConfig = { thinkingLevel: 'LOW' };
        }
      }
      return JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mime_type: mime, data: cleanB64 } }] }],
        generationConfig: genCfg
      });
    };
    const callModel = async (mdl, timeoutMs, extSignal) => {
      for (const safeMode of [false, true]) {
        const ctrl = new AbortController();
        let timedOut = false;
        const onExtAbort = () => { try { ctrl.abort(); } catch (e) {} };
        if (extSignal) {
          if (extSignal.aborted) return { ok: false, err: '' };
          extSignal.addEventListener('abort', onExtAbort, { once: true });
        }
        const tId = setTimeout(() => { timedOut = true; try { ctrl.abort(); } catch (e) {} }, timeoutMs);
        try {
          const res = await fetch('https' + '://' + host + '/v1beta/models/' + mdl + ':generateContent?key=' + encodeURIComponent(GKEY), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: ctrl.signal,
            body: buildBody(mdl, safeMode)
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const msg = (errData.error && errData.error.message) ? errData.error.message : ('HTTP ' + res.status);
            if (res.status === 400 && !safeMode) continue;
            if (res.status === 429) {
              const isDaily = /per\s*day|free\s*tier|limit:\s*0/i.test(msg);
              markSkip(mdl, isDaily ? 60 : 5);
            } else if (res.status === 404) {
              markSkip(mdl, 720);
            }
            return { ok: false, err: msg };
          }
          const data = await res.json();
          if (data && Array.isArray(data.candidates) && data.candidates.length) {
            return { ok: true, json: data };
          }
          return { ok: false, err: 'Пустой ответ модели' };
        } catch (e) {
          if (extSignal && extSignal.aborted) return { ok: false, err: '' };
          return { ok: false, err: timedOut ? 'Таймаут сети' : ((e && e.message) || 'Нет связи') };
        } finally {
          clearTimeout(tId);
          if (extSignal) extSignal.removeEventListener('abort', onExtAbort);
        }
      }
      return { ok: false, err: 'Ошибка параметров запроса' };
    };
    const raceTwo = (m1, m2, timeoutMs) => new Promise(resolve => {
      const c1 = new AbortController(), c2 = new AbortController();
      let timer = null, p2Started = false, settled = false, doneCount = 0, firstErr = '';
      const finish = (ok, payload) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (ok) {
          try { c1.abort(); } catch (e) {}
          try { c2.abort(); } catch (e) {}
          resolve({ ok: true, mdl: payload.mdl, json: payload.json });
        } else {
          resolve({ ok: false, err: payload, p2Tried: p2Started });
        }
      };
      const onFail = (err, isP1) => {
        doneCount++;
        if (!firstErr && err) firstErr = err;
        if (isP1 && !p2Started) { finish(false, firstErr); return; }
        if (doneCount >= 2) finish(false, firstErr);
      };
      callModel(m1, timeoutMs, c1.signal).then(r => {
        if (r.ok) finish(true, { mdl: m1, json: r.json });
        else onFail(r.err, true);
      });
      timer = setTimeout(() => {
        if (settled) return;
        p2Started = true;
        callModel(m2, timeoutMs, c2.signal).then(r => {
          if (r.ok) finish(true, { mdl: m2, json: r.json });
          else onFail(r.err, false);
        });
      }, 2600);
    });

    const passTimeouts = [5200, 7500, 10500];
    const passWaits = [0, 300, 900];
    let j = null, winMdl = '', lastErr = '';
    for (let p = 0; p < passTimeouts.length; p++) {
      if (passWaits[p] > 0) await new Promise(r => setTimeout(r, passWaits[p]));
      const avail = getOrderedModels();
      if (!avail.length) break;
      let startIdx = 0;
      if (p === 0 && avail.length >= 2) {
        const rr = await raceTwo(avail[0], avail[1], passTimeouts[p]);
        if (rr.ok) { j = rr.json; winMdl = rr.mdl; break; }
        if (rr.err) lastErr = rr.err;
        startIdx = rr.p2Tried ? 2 : 1;
      }
      for (let idx = startIdx; idx < avail.length; idx++) {
        const mdl = avail[idx];
        const r = await callModel(mdl, passTimeouts[p], null);
        if (r.ok) { j = r.json; winMdl = mdl; break; }
        if (r.err) lastErr = r.err;
      }
      if (j) break;
    }
    if (!j) throw new Error(lastErr || 'Сервер распознавания не ответил');
    if (winMdl && /lite/.test(winMdl)) {
      try { localStorage.setItem('OCR_FAST_MDL_V2', JSON.stringify({ m: winMdl, t: Date.now() })); } catch (e) {}
    } else {
      try { localStorage.removeItem('OCR_FAST_MDL_V2'); } catch (e) {}
    }
    const cand = Array.isArray(j.candidates) ? j.candidates[0] : null;
    const parts = (cand && cand.content && Array.isArray(cand.content.parts)) ? cand.content.parts : [];
    const ans = parts.find(p => p && !p.thought && typeof p.text === 'string') || parts[parts.length - 1];
    const parsed = JSON.parse(((ans && ans.text) || '{}').replace(/```json|```/gi, '').trim());
    const items = [];
    (Array.isArray(parsed.items) ? parsed.items : []).forEach(x => {
      const name = fixOcrName(String((x && x.name) || '').trim()), qty = Math.max(1, Math.round(+x.qty || 1));
      if (!name) return;
      const cls = classifyProduct(name);
      if (!cls.ignore) items.push({ name, qty, code: cls.code || '' });
    });
    const doc = String((parsed && parsed.doc) || '').replace(/^[^0-9]+/, '').trim();
    return { doc, addr: String((parsed && parsed.addr) || '').trim(), items };
  }
  const saveOcrDraft = (rows, isCity, docNum) => {
    try {
      if (!rows || !rows.length) sessionStorage.removeItem("OCR_BON_DRAFT");
      else sessionStorage.setItem("OCR_BON_DRAFT", JSON.stringify({ rows, isCity: !!isCity, docNum: docNum || '' }));
    } catch (e) {}
  };

  function openBonusInvoiceModal(items, defaultIsCity, docNum, batchOpts){
    const cleanDoc = String(docNum || '').trim();
    const docKey = cleanDoc.replace(/[^0-9A-Za-z_-]+/g, '_').replace(/^_+|_+$/g, '');
    if (!Array.isArray(items) || !items.length) return;
    let m = g('ocrBonMdl'); if (m) m.remove();
    let isCity = !!defaultIsCity;
    const rows = items.map(x => { const c = x.code || classifyProduct(x.name).code || ''; return { name: x.name, qty: x.qty, code: c, origCode: c }; });
    saveOcrDraft(rows, isCity, cleanDoc);
    const CAT_ICO = { 'Другое': '📦', 'Диваны': '🛋️', 'Ресепшен': '🗄️', 'Кухни': '🍳', 'Гостиная': '📺', 'Спальни': '🛏️', 'Шкафы': '🚪' };
    const catsList = Array.from(new Set(BON_ITEMS.map(x => x.cat)));
    const openCatPicker = rowIdx => {
      const r = rows[rowIdx]; if (!r) return;
      let pm = g('ocrCatMdl'); if (pm) pm.remove();
      let selCat = (r.code && BON_BY_CODE[r.code]) ? BON_BY_CODE[r.code].cat : 'all', q = '';
      pm = document.createElement('div'); pm.id = 'ocrCatMdl'; pm.className = 'cm open';
      pm.innerHTML = '<div class="cm-b ob-pk-box"><div class="ob-pk-hd"><div><b>Категория бонусов</b><small>' + esc(r.name) + '</small></div><button type="button" class="pt-x" id="obPkX">✕</button></div><div class="ob-pk-srch"><input id="obPkInp" type="search" placeholder="Поиск мебели..."></div><div class="ob-pk-chips" id="obPkChips"><button type="button" data-c="all" class="' + (selCat === 'all' ? 'on' : '') + '">Все</button>' + catsList.map(c => '<button type="button" data-c="' + esc(c) + '" class="' + (selCat === c ? 'on' : '') + '">' + (CAT_ICO[c] || '📦') + ' ' + esc(c) + '</button>').join('') + '</div><div class="ob-pk-list" id="obPkList"></div></div>';
      document.body.appendChild(pm);
      const closePk = () => pm.remove();
      g('obPkX').onclick = closePk; pm.onclick = ev => { if (ev.target === pm) closePk(); };
      const drawItems = () => {
        const box = g('obPkList');
        const qTokens = normSearch(q).split(' ').filter(Boolean);
        const list = BON_ITEMS.filter(it => {
          if (selCat !== 'all' && it.cat !== selCat) return false;
          if (!qTokens.length) return true;
          const hay = normSearch(it.name + ' ' + it.cat + ' ' + (HY_PICK_KW[it.code] || ''));
          return qTokens.every(t => hay.includes(t));
        });
        if (!list.length) { box.innerHTML = '<div class="pt-empty">Ничего не найдено</div>'; return; }
        box.innerHTML = list.map(it => {
          const on = r.code === it.code, pr = it.one ? it.p1 : (isCity ? it.p1 : it.p2);
          return '<button type="button" class="ob-pk-it' + (on ? ' on' : '') + '" data-code="' + it.code + '"><span>' + (CAT_ICO[it.cat] || '📦') + '</span><span class="ob-pk-tx"><b>' + esc(it.name) + '</b><small>' + esc(it.cat) + '</small></span><span class="ob-pk-pr">' + fm(pr) + ' ' + CUR + '</span></button>';
        }).join('');
      };
      g('obPkChips').onclick = ev => { const b = ev.target.closest('button[data-c]'); if (!b) return; selCat = b.dataset.c; g('obPkChips').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); drawItems(); };
      g('obPkInp').oninput = ev => { q = ev.target.value.trim().toLowerCase(); drawItems(); };
      g('obPkList').onclick = ev => { const it = ev.target.closest('button[data-code]'); if (!it) return; r.code = it.dataset.code; r.edited = true; closePk(); renderRows(); };
      drawItems();
    };

    m = document.createElement('div'); m.id = 'ocrBonMdl'; m.className = 'mdl open';
    m.innerHTML = '<div class="mdl-b pt-box ob-box"><div class="pt-hd"><div class="pt-hd-l"><div class="pt-hd-ic" style="background:rgba(250,204,21,.16);border-color:rgba(250,204,21,.42);color:#fde047">🧮</div><div><div class="pt-hd-t" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span>Бонусы по накладной</span>' + (batchOpts && batchOpts.total > 1 ? '<span class="ob-q-tag">' + batchOpts.idx + ' / ' + batchOpts.total + '</span>' : '') + '</div><div class="pt-hd-s" id="obSub"></div></div></div><button type="button" class="pt-x" id="obX">✕</button></div>'
      + '<div class="ob-zone-w"><div class="ob-seg" id="obZoneSeg"><button type="button" data-z="city" class="' + (isCity ? 'on' : '') + '">🏙️ Город (Ереван)</button><button type="button" data-z="reg" class="' + (!isCity ? 'on' : '') + '">🛣️ Район (Области)</button></div></div>'
      + '<div class="pt-list" id="obList"></div>'
      + '<div class="pt-ft"><div class="ob-tot"><span>Будет начислено:</span><b id="obTotSum">0 ' + CUR + '</b></div><button type="button" class="pt-add" id="obSaveBtn"><span>➕ Добавить в бонусы</span></button></div></div>';
    document.body.appendChild(m);
    let _obDone = false;
    const close = reason => { saveOcrDraft(null); m.remove(); if (!_obDone && batchOpts && typeof batchOpts.onDone === 'function') { _obDone = true; batchOpts.onDone(reason || 'closed'); } };
    g('obX').onclick = () => close('closed'); m.onclick = e => { if (e.target === m) close('closed'); };

    const carCode = (() => { try { return (localStorage.getItem('USER_CAR') || '').trim().toUpperCase(); } catch (e) { return ''; } })();
    const docTag = cleanDoc ? ' · № ' + esc(cleanDoc) : '';
    if (g('obSub')) g('obSub').innerHTML = carCode && carCode !== 'ADMIN' ? 'Экипаж <b style="color:#6ee7b7">' + esc(carCode) + '</b> · ' + (isCity ? 'Ереван → Город' : 'Область → Район') + docTag : (carCode === 'ADMIN' ? 'Режим Админ' + docTag : '<span style="color:#fbbf24">⚠️ Экипаж не назначен</span>');

    const renderRows = () => {
      const box = g('obList');
      if (!rows.length) { box.innerHTML = '<div class="pt-empty">Все позиции удалены</div>'; g('obTotSum').textContent = '0 ' + CUR; return; }
      let tot = 0;
      box.innerHTML = rows.map((r, i) => {
        const info = r.code ? BON_BY_CODE[r.code] : null;
        const up = info ? (info.one ? info.p1 : (isCity ? info.p1 : info.p2)) : 0;
        tot += up * r.qty;
        const pickLabel = info
          ? '<span class="ob-pick-l"><span>' + (CAT_ICO[info.cat] || '📦') + '</span><b>' + esc(info.name) + '</b></span><span class="ob-pick-r"><span class="ob-pick-tag">' + fm(up) + ' ' + CUR + '</span><span>▾</span></span>'
          : '<span class="ob-pick-l"><span>⚠️</span><b style="color:#fbbf24">Выберите категорию бонусов</b></span><span class="ob-pick-r"><span>▾</span></span>';
        return '<div class="ob-card' + (info ? '' : ' unk') + '"><div class="ob-top"><div class="ob-nm">' + esc(r.name) + '</div><button type="button" class="ob-del" data-i="' + i + '">✕</button></div>'
          + '<button type="button" class="ob-pick' + (info ? '' : ' unk') + '" data-pick="' + i + '">' + pickLabel + '</button>'
          + '<div class="ob-bot"><div class="ob-qbox"><button type="button" class="ob-pm" data-act="dec" data-i="' + i + '">−</button><b>' + r.qty + ' шт</b><button type="button" class="ob-pm" data-act="inc" data-i="' + i + '">+</button></div>'
          + '<div class="ob-pr">' + (info ? (fm(up) + ' × ' + r.qty + ' = <b>' + fm(up * r.qty) + ' ' + CUR + '</b>') : '<span style="color:#fbbf24">Не выбрано</span>') + '</div></div></div>';
      }).join('');
      g('obTotSum').textContent = fm(tot) + ' ' + CUR;
      saveOcrDraft(rows, isCity, cleanDoc);
    };

    g('obZoneSeg').onclick = e => { const b = e.target.closest('button[data-z]'); if (!b) return; isCity = b.dataset.z === 'city'; g('obZoneSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); renderRows(); };
    g('obList').onclick = e => {
      const pk = e.target.closest('[data-pick]'); if (pk) { openCatPicker(+pk.dataset.pick); return; }
      const del = e.target.closest('.ob-del'); if (del) { rows.splice(+del.dataset.i, 1); renderRows(); return; }
      const pm = e.target.closest('.ob-pm'); if (pm && rows[+pm.dataset.i]) { rows[+pm.dataset.i].qty = pm.dataset.act === 'inc' ? rows[+pm.dataset.i].qty + 1 : Math.max(1, rows[+pm.dataset.i].qty - 1); renderRows(); }
    };
    g('obSaveBtn').onclick = async () => {
      const valid = rows.filter(r => r.code && BON_BY_CODE[r.code] && r.qty > 0);
      if (!valid.length) { window.toast && toast('Выберите категорию хотя бы для одной позиции', 'err'); return; }
      const code = (() => { try { return (localStorage.getItem('USER_CAR') || '').trim().toUpperCase(); } catch (e) { return ''; } })();
      if (!code || !window.firebase || !firebase.apps.length) { window.toast && toast('Нет связи или не назначен экипаж', 'err'); return; }
      g('obSaveBtn').disabled = true;
      try {
        const db = firebase.database();
        let dup = null, allDocs = {}, sameDocs = [];
        if (docKey) {
          allDocs = (await db.ref('cars/' + code + '/docs').once('value')).val() || {};
          sameDocs = Object.keys(allDocs).filter(k => allDocs[k] && (
            k === docKey || k.indexOf(docKey + '__') === 0 ||
            (cleanDoc && allDocs[k].doc === cleanDoc))).map(k => allDocs[k])
            .sort((a, b) => (+b.t || 0) - (+a.t || 0));
          dup = sameDocs[0] || null;
          if (dup && typeof askC === 'function') {
            const cmEl = g('cm'); if (cmEl) document.body.appendChild(cmEl);
            const byWho = dup.by || (code === 'ADMIN' ? 'админ' : 'коллега');
            const ok = await askC((code === 'ADMIN' ? 'В экипаже ADMIN' : 'Из вашего экипажа') + ' «' + byWho + '» уже добавил эти данные' + (cleanDoc ? ' (№ ' + cleanDoc + ')' : '') + ' в бонусы.\n\nПродолжить или отменить?', 'Продолжить', '⚠️');
            if (!ok) { close(); return; }
          }
        }
        const qRef = db.ref('cars/' + code + '/qty'), cur = (await qRef.once('value')).val() || {}, patch = {}, docP = {};
        let s = 0, q = 0;
        valid.forEach(r => {
          const info = BON_BY_CODE[r.code], k = info.one ? r.code : (isCity ? r.code : r.code + '_2');
          patch[k] = (+cur[k] || 0) + r.qty; docP[k] = (docP[k] || 0) + r.qty;
          s += (info.one ? info.p1 : (isCity ? info.p1 : info.p2)) * r.qty; q += r.qty;
        });
        await qRef.update(patch); await db.ref('cars/' + code + '/t').set(Date.now());
        {
          const meName = (() => { try { return localStorage.getItem('USER_NAME') || (code === 'ADMIN' ? 'Администратор' : 'Водитель'); } catch (e) { return code === 'ADMIN' ? 'Администратор' : 'Водитель'; } })();
          const baseKey = docKey || ('doc_' + Date.now().toString(36));
          const sk = (!allDocs[baseKey] && docKey) ? baseKey : (baseKey + '__' + Date.now().toString(36));
          const rec = { doc: cleanDoc || '—', by: meName, t: Date.now(), sum: s, qty: q, z: isCity ? 1 : 2, p: docP };
          if (sameDocs.length) rec.rep = sameDocs.length + 1;
          await db.ref('cars/' + code + '/docs/' + sk).set(rec);
        }
        const isAdmRole = code === 'ADMIN';
        let sentReq = false;
        valid.forEach(r => {
          if (r.edited && r.code) {
            saveCloudModel(r.name, r.code, isAdmRole, r.origCode || '');
            if (!isAdmRole) sentReq = true;
          }
        });
        close('saved');
        window.toast && toast(sentReq ? 'Начислено: +' + q + ' шт · правило отправлено на проверку админу' : 'Начислено: +' + q + ' шт (' + fm(s) + ' ' + CUR + ')');
      } catch (err) { g('obSaveBtn').disabled = false; window.toast && toast('Ошибка записи в базу', 'err'); }
    };
    renderRows();
  }

  const ensureOcrInputs = () => {
    const mk = (id, cap) => {
      let el = g(id);
      if (!el && document.body) {
        el = document.createElement('input');
        el.type = 'file';
        el.id = id;
        el.accept = 'image/*';
        el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0';
        if (cap) el.setAttribute('capture', 'environment'); else el.multiple = true;
      el.addEventListener('change', () => {
        const files = Array.from(el.files || []);
        el.value = '';
        if (files.length === 1) scanBonusFile(files[0]);
        else if (files.length > 1) scanBonusFiles(files);
      });
        document.body.appendChild(el);
      }
      return el;
    };
    return { cam: mk('bnCamFile', 1), gal: mk('bnGalFile', 0) };
  };
  let _batchTok = 0;
  async function scanBonusFiles(files){
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;
    if (list.length === 1) return scanBonusFile(list[0]);
    const tok = ++_batchTok, total = list.length;
    if (window.openBon && (!g("bnMdl") ||
      !g("bnMdl").classList.contains("open"))) window.openBon(true);
    const btn = g("bnCamBtn"); let busyOn = false;
    const setBusy = on => { const nx = !!on; if (nx === busyOn) return;
      busyOn = nx; window._ocrScanning = nx;
      if (btn) btn.classList.toggle("busy", nx);
      if (typeof busy === "function") busy(nx ? 1 : 0); };
    const slots = new Array(total), waits = new Array(total);
    const wake = i => { if (waits[i]) { const f = waits[i];
      waits[i] = null; f(); } };
    const getSlot = i => slots[i] ? Promise.resolve(slots[i])
      : new Promise(r => { waits[i] = () => r(slots[i]); });
    (async () => { for (let i = 0; i < total; i++) {
      if (tok !== _batchTok) return; let b64 = "";
      try { b64 = await compressImage(list[i]);
        if (tok !== _batchTok) return;
        slots[i] = { ok: true, res: await askGemini(b64) };
      } catch (e) { slots[i] = { ok: false,
        err: (e && e.message) || String(e || ""), b64 }; }
      wake(i); } })();
    let saved = 0;
    const next = async (idx, lastReason) => {
      if (tok !== _batchTok) return;
      if (idx >= total) { setBusy(false);
        if (saved > 1 && lastReason === "saved") setTimeout(() => {
          if (tok === _batchTok && window.toast) toast(
            "Готово: добавлено накладных " + saved + " из " + total);
        }, 2100); else if (lastReason !== "saved" && window.toast)
          toast("Загрузка накладных завершена"); return; }
      if (!slots[idx]) { setBusy(true); window.toast && toast(
        "Распознаю накладную " + (idx + 1) + " из " + total + "..."); }
      let sl = await getSlot(idx);
      if (tok !== _batchTok) return; setBusy(false);
      while (!sl.ok) { const msg = sl.err || "Ошибка";
        const q = /дневной лимит|quota|free.?tier/i.test(msg);
        if (!q && typeof askC === "function") {
          const cm = g("cm"); if (cm) document.body.appendChild(cm);
          const bs = /high demand|503|таймаут|timeout|нет связи|overloaded|unavailable/i.test(msg);
          const qt = (bs ? "Сервер распознавания временно перегружен. Повторить отправку фото " : ("Ошибка распознавания (" + (idx + 1) + "/" + total + "): " + msg + "\n\nПовторить отправку фото ")) + (idx + 1) + " из " + total + "?";
          const ok = await askC(qt, "Повторить", "🔄",
            idx + 1 < total ? "Пропустить" : "Отмена");
          if (tok !== _batchTok) return;
          if (ok) { setBusy(true); window.toast && toast(
            "Повторяю отправку " + (idx + 1) + "/" + total + "...");
            try { const b = sl.b64 || await compressImage(list[idx]);
              sl = { ok: true, res: await askGemini(b) };
            } catch (e2) { sl = { ok: false, b64: sl.b64,
              err: (e2 && e2.message) || String(e2 || "") }; }
            setBusy(false); if (tok !== _batchTok) return; continue;
          } } else window.toast && toast("Ошибка OCR (" +
            (idx + 1) + "/" + total + "): " + msg, "err");
        next(idx + 1, "skip"); return; }
      const { doc, addr, items } = sl.res;
      if (!items.length) { window.toast && toast("Товары в накладной не найдены (" + (idx + 1) + "/" + total + ")", "err");
        next(idx + 1, "empty"); return; }
      openBonusInvoiceModal(items, isYerevanAddress(addr), doc, {
        idx: idx + 1, total, onDone: async rsn => {
          if (tok !== _batchTok) return;
          if (rsn === "saved") { saved++; next(idx + 1, "saved"); return; }
          const rem = total - (idx + 1);
          if (rem > 0 && typeof askC === "function") {
            const cm = g("cm"); if (cm) document.body.appendChild(cm);
            const go = await askC("Пропустить эту накладную и перейти к следующей? (осталось " + rem + ")", "Следующая", "📄", "Остановить все");
            if (tok !== _batchTok) return;
            if (go) next(idx + 1, "skip"); else { _batchTok++;
              window.toast && toast("Загрузка остальных накладных отменена"); }
          } } }); };
    next(0, "");
  }
  let _ebLastOcrB64 = "";
  async function scanBonusFile(file){ _batchTok++;
    if (!file) return;
    if (window.openBon && (!g("bnMdl") || !g("bnMdl").classList.contains("open"))) window.openBon(true);
    const btn = g("bnCamBtn");
    let busyOn = false;
    const setScanBusy = on => {
      const next = !!on;
      if (next === busyOn) return;
      busyOn = next;
      window._ocrScanning = next;
      if (btn) btn.classList.toggle("busy", next);
      if (typeof busy === "function") busy(next ? 1 : 0);
    };

    let b64 = "";
    try {
      setScanBusy(true);
      b64 = await compressImage(file);
      _ebLastOcrB64 = b64;
    } catch (e) {
      setScanBusy(false);
      window.toast && toast("Ошибка OCR: " + ((e && e.message) || e), "err");
      return;
    }

    let firstPass = true;
    try {
      while (b64) {
        setScanBusy(true);
        const _t0 = Date.now();
        window.toast && toast(firstPass ? "Распознаю накладную..." : "Повторяю отправку...");
        firstPass = false;
        try {
          const { doc, addr, items } = await askGemini(b64);
          _ebLastOcrB64 = "";
          setScanBusy(false);
          if (!items.length) {
            window.toast && toast("Товары в накладной не найдены", "err");
            return;
          }
          window.toast && toast("Готово за " + ((Date.now() - _t0) / 1000).toFixed(1) + " сек");
          openBonusInvoiceModal(items, isYerevanAddress(addr), doc);
          return;
        } catch (e) {
          const msg = (e && e.message) || String(e || "");
          const isQuota = /дневной лимит|quota|free.?tier/i.test(msg);
          setScanBusy(false);
          if (!isQuota && typeof askC === "function") {
            const cmEl = g("cm");
            if (cmEl) document.body.appendChild(cmEl);
            const isBusySrv = /high demand|503|таймаут|timeout|нет связи|overloaded|unavailable/i.test(msg);
            const qText = isBusySrv
              ? "Сервер распознавания временно перегружен. Повторить отправку этого же фото?"
              : ("Ошибка распознавания: " + msg + "\n\nПовторить отправку этого же фото?");
            const okRetry = await askC(qText, "Повторить", "🔄");
            if (okRetry && _ebLastOcrB64) {
              b64 = _ebLastOcrB64;
              continue;
            }
          } else {
            window.toast && toast("Ошибка OCR: " + msg, "err");
          }
          _ebLastOcrB64 = "";
          return;
        }
      }
    } finally {
      setScanBusy(false);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureOcrInputs);
  else ensureOcrInputs();

  const CAM_ID_KEY = "OCR_CAM_ID";
  const CAM_CAPS_KEY = "OCR_CAM_CAPS_V1";
  const stopStream = st => { try { if (st) st.getTracks().forEach(t => t.stop()); } catch (e) {} };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const getCaps = tr => { try { return (tr && tr.getCapabilities) ? (tr.getCapabilities() || {}) : {}; } catch (e) { return {}; } };
  const hasTorchCap = tr => {
    const cp = getCaps(tr);
    return !!(cp && (cp.torch || (Array.isArray(cp.fillLightMode) && cp.fillLightMode.includes("torch"))));
  };
  const hasAfCap = tr => {
    const cp = getCaps(tr);
    return !!(cp && Array.isArray(cp.focusMode) && (cp.focusMode.includes("continuous") || cp.focusMode.includes("single-shot")));
  };
  const getMaxRes = tr => {
    const cp = getCaps(tr), st = (tr && tr.getSettings) ? (tr.getSettings() || {}) : {};
    return {
      w: Math.max((cp.width && cp.width.max) || 0, st.width || 0),
      h: Math.max((cp.height && cp.height.max) || 0, st.height || 0)
    };
  };
  const isFrontDev = (label, tr) => {
    const cp = getCaps(tr);
    const fm = Array.isArray(cp.facingMode) ? cp.facingMode[0] : cp.facingMode;
    if (fm === "user") return true;
    return /front|user|selfie|face|фронт|селфи/i.test(String(label || ""));
  };
  const scoreLens = info => {
    let s = 0;
    if (info.hasTorch) s += 1000;
    if (info.hasAF) s += 500;
    if (/ultra|0\.[56]|macro|depth|tele|bokeh|ir\b/i.test(info.label || "")) s -= 180;
    if (/camera2\s*0\b|main|primary|\bback\b|задн/i.test(info.label || "")) s += 120;
    s += Math.min(400, Math.round(((info.w || 0) * (info.h || 0)) / 50000));
    return s;
  };
  async function tryOpenVideo(baseVideo, extraAdv){
    const tiers = [
      Object.assign({ width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } }, baseVideo),
      Object.assign({ width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } }, baseVideo),
      Object.assign({}, baseVideo)
    ];
    for (const c of tiers) {
      if (extraAdv && extraAdv.length) c.advanced = extraAdv;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const st = await navigator.mediaDevices.getUserMedia({ video: c, audio: false });
          const tr = st.getVideoTracks()[0];
          if (tr && tr.applyConstraints) {
            const cp = getCaps(tr);
            const adv = [];
            if (Array.isArray(cp.focusMode) && cp.focusMode.includes("continuous")) adv.push({ focusMode: "continuous" });
            if (extraAdv && extraAdv.length) adv.push(...extraAdv);
            try {
              if (adv.length) await tr.applyConstraints({ advanced: adv });
            } catch (e) {}
          }
          return st;
        } catch (e) {
          if (attempt === 0 && (e && (e.name === "NotReadableError" || e.name === "AbortError"))) {
            await sleep(90);
            continue;
          }
          break;
        }
      }
    }
    return null;
  }
  async function openBestCameraSession(){
    let savedId = "", cached = null;
    try { savedId = localStorage.getItem(CAM_ID_KEY) || ""; } catch (e) {}
    try { cached = JSON.parse(localStorage.getItem(CAM_CAPS_KEY) || "null"); } catch (e) {}

    let stream = null;
    if (savedId) stream = await tryOpenVideo({ deviceId: { exact: savedId } });
    if (!stream) stream = await tryOpenVideo({ facingMode: { exact: "environment" } });
    if (!stream) stream = await tryOpenVideo({ facingMode: { ideal: "environment" } });
    if (!stream) stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });

    let tr = stream.getVideoTracks()[0];
    let curSets = (tr && tr.getSettings) ? (tr.getSettings() || {}) : {};
    let curId = curSets.deviceId || "";
    let curTorch = hasTorchCap(tr), curAF = hasAfCap(tr), curRes = getMaxRes(tr);

    let allVideo = [];
    try {
      if (navigator.mediaDevices.enumerateDevices) {
        allVideo = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput" && d.deviceId);
      }
    } catch (e) {}

    const rearCandidates = allVideo.filter(d => !isFrontDev(d.label, d.deviceId === curId ? tr : null));
    const sig = allVideo.map(d => d.deviceId).sort().join("|");
    const cacheValid = cached && cached.sig === sig && Array.isArray(cached.lenses) && cached.lenses.length;

    // Если текущая камера уже со вспышкой и автофокусом, не тратим время на опрос других камер
    if (curTorch && curAF) {
      let lenses = cacheValid ? cached.lenses.slice() : rearCandidates.map(d => ({
        deviceId: d.deviceId,
        label: d.label || "",
        hasTorch: d.deviceId === curId ? curTorch : null,
        hasAF: d.deviceId === curId ? curAF : null,
        w: d.deviceId === curId ? curRes.w : 0,
        h: d.deviceId === curId ? curRes.h : 0,
        probed: d.deviceId === curId
      }));
      if (!lenses.some(x => x.deviceId === curId) && curId) {
        lenses.unshift({ deviceId: curId, label: (tr && tr.label) || "", hasTorch: curTorch, hasAF: curAF, w: curRes.w, h: curRes.h, probed: true });
      }
      const curIdx = Math.max(0, lenses.findIndex(x => x.deviceId === curId));
      lenses[curIdx] = Object.assign({}, lenses[curIdx], { label: lenses[curIdx].label || (tr && tr.label) || "", hasTorch: curTorch, hasAF: curAF, w: curRes.w, h: curRes.h, probed: true });
      try { localStorage.setItem(CAM_ID_KEY, curId); } catch (e) {}
      return { stream, lenses, curIdx, sig };
    }

    if (cacheValid) {
      const sorted = cached.lenses.slice().sort((a, b) => scoreLens(b) - scoreLens(a));
      const best = sorted[0];
      if (best && best.deviceId && best.deviceId !== curId && (best.hasTorch || best.hasAF)) {
        stopStream(stream);
        await sleep(50);
        const st2 = await tryOpenVideo({ deviceId: { exact: best.deviceId } });
        if (st2) {
          try { localStorage.setItem(CAM_ID_KEY, best.deviceId); } catch (e) {}
          return { stream: st2, lenses: sorted, curIdx: 0, sig };
        }
        stream = await tryOpenVideo({ facingMode: { ideal: "environment" } });
      }
    }

    const tested = [];
    if (curId && !isFrontDev((tr && tr.label) || "", tr)) {
      tested.push({ deviceId: curId, label: (tr && tr.label) || "", hasTorch: curTorch, hasAF: curAF, w: curRes.w, h: curRes.h, probed: true });
    }
    const toProbe = rearCandidates
      .filter(d => d.deviceId !== curId)
      .sort((a, b) => (/camera2\s*0\b|back|rear|\b0\b/i.test(b.label) ? 1 : 0) - (/camera2\s*0\b|back|rear|\b0\b/i.test(a.label) ? 1 : 0));

    // На Android не перебираем все камеры подряд при каждом запуске, если уже есть задняя камера
    if (toProbe.length && (!curId || !curTorch)) {
      stopStream(stream);
      stream = null;
      await sleep(40);
      for (const d of toProbe) {
        const st = await tryOpenVideo({ deviceId: { exact: d.deviceId } });
        if (!st) continue;
        const t0 = st.getVideoTracks()[0];
        if (!isFrontDev(d.label || (t0 && t0.label), t0)) {
          const r = getMaxRes(t0);
          tested.push({
            deviceId: d.deviceId,
            label: d.label || (t0 && t0.label) || "",
            hasTorch: hasTorchCap(t0),
            hasAF: hasAfCap(t0),
            w: r.w,
            h: r.h,
            probed: true
          });
        }
        stopStream(st);
        await sleep(30);
      }
    }

    tested.sort((a, b) => scoreLens(b) - scoreLens(a));
    if (!stream && tested.length) {
      for (let i = 0; i < tested.length; i++) {
        const cand = await tryOpenVideo({ deviceId: { exact: tested[i].deviceId } });
        if (cand) {
          stream = cand;
          if (i !== 0) { const picked = tested.splice(i, 1)[0]; tested.unshift(picked); }
          break;
        }
      }
    }
    if (!stream) stream = await tryOpenVideo({ facingMode: { ideal: "environment" } }) || await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    tr = stream.getVideoTracks()[0];
    curId = (tr && tr.getSettings && tr.getSettings().deviceId) || (tested[0] && tested[0].deviceId) || "";
    if (!tested.length && curId) {
      const r = getMaxRes(tr);
      tested.push({ deviceId: curId, label: (tr && tr.label) || "", hasTorch: hasTorchCap(tr), hasAF: hasAfCap(tr), w: r.w, h: r.h, probed: true });
    }
    if (sig && tested.length) {
      try { localStorage.setItem(CAM_CAPS_KEY, JSON.stringify({ sig, lenses: tested })); } catch (e) {}
    }
    if (curId) { try { localStorage.setItem(CAM_ID_KEY, curId); } catch (e) {} }
    return { stream, lenses: tested, curIdx: Math.max(0, tested.findIndex(x => x.deviceId === curId)), sig };
  }

  function cropToFrame(src, srcW, srcH, vidEl, frameEl){
    const vr = vidEl.getBoundingClientRect();
    const fr = frameEl ? frameEl.getBoundingClientRect() : vr;
    const vw = vidEl.videoWidth || srcW, vh = vidEl.videoHeight || srcH;
    const coverScale = Math.max(vr.width / vw, vr.height / vh);
    const renW = vw * coverScale, renH = vh * coverScale;
    const offX = (vr.width - renW) / 2, offY = (vr.height - renH) / 2;
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const nx1 = clamp01((fr.left - vr.left - offX) / renW);
    const ny1 = clamp01((fr.top - vr.top - offY) / renH);
    const nx2 = clamp01((fr.right - vr.left - offX) / renW);
    const ny2 = clamp01((fr.bottom - vr.top - offY) / renH);

    const vScale = Math.min(srcW / vw, srcH / vh);
    const visW = vw * vScale, visH = vh * vScale;
    const visOffX = (srcW - visW) / 2, visOffY = (srcH - visH) / 2;
    const sx = Math.max(0, Math.round(visOffX + nx1 * visW));
    const sy = Math.max(0, Math.round(visOffY + ny1 * visH));
    const sw = Math.max(20, Math.min(srcW - sx, Math.round((nx2 - nx1) * visW)));
    const sh = Math.max(20, Math.min(srcH - sy, Math.round((ny2 - ny1) * visH)));

    const maxOut = 1440;
    let outW = sw, outH = sh;
    if (outW > maxOut || outH > maxOut) {
      if (outW > outH) { outH = Math.round(outH * maxOut / outW); outW = maxOut; }
      else { outW = Math.round(outW * maxOut / outH); outH = maxOut; }
    }
    const cv = document.createElement('canvas');
    cv.width = outW; cv.height = outH;
    const cx = cv.getContext('2d');
    cx.filter = 'grayscale(1) contrast(1.18)';
    cx.drawImage(src, sx, sy, sw, sh, 0, 0, outW, outH);
    cx.filter = 'none';
    let b64 = '';
    try { const wu = cv.toDataURL('image/webp', 0.85);
      if (wu && wu.indexOf('data:image/webp') === 0) b64 = wu.split(',').pop();
    } catch (e) {}
    if (!b64) b64 = cv.toDataURL('image/jpeg', 0.85).split(',').pop();
    cv.width = cv.height = 0;
    return b64 ? { size: b64.length, _preB64: b64, _isCropped: true } : null;
  }

  async function openLiveCamera(fallbackInput){
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (fallbackInput) fallbackInput.click();
      return;
    }
    window.toast && toast("Загрузка камеры...");
    let sess = null;
    try {
      sess = await openBestCameraSession();
    } catch (e) {
      if (fallbackInput) fallbackInput.click();
      return;
    }
    let stream = sess.stream;
    let lenses = sess.lenses || [];
    let curIdx = Math.max(0, sess.curIdx || 0);
    const sig = sess.sig || "";

    let ov = g("ocrLiveCam"); if (ov) ov.remove();
    ov = document.createElement("div"); ov.id = "ocrLiveCam";
    ov.innerHTML = '<video id="ocrLiveVid" autoplay playsinline muted></video>'
      + '<div id="olcFocusRing" style="position:fixed;width:64px;height:64px;border:2px solid #fde047;border-radius:50%;pointer-events:none;opacity:0;transform:translate(-50%,-50%) scale(1.2);transition:opacity .2s,transform .2s;z-index:3"></div>'
      + '<div class="olc-top"><button type="button" class="olc-btn" id="olcSys">📷 Системная</button><span>Коснитесь текста для фокуса</span><button type="button" class="olc-btn" id="olcClose" aria-label="Закрыть">✕</button></div>'
      + '<div class="olc-frame" id="olcFrame"></div>'
      + '<div class="olc-bot"><button type="button" class="olc-btn" id="olcTorch">🔦 Свет</button><button type="button" class="olc-shot" id="olcShot" aria-label="Снять"></button><button type="button" class="olc-btn" id="olcLens"></button></div>';
    document.body.appendChild(ov);
    const vid = g("ocrLiveVid");
    const frameEl = g("olcFrame");
    const torchBtn = g("olcTorch");
    const lensBtn = g("olcLens");
    vid.srcObject = stream;
    try { await vid.play(); } catch (e) {}
    let track = stream.getVideoTracks()[0];
    let torchOn = false;
    let switching = false;

    const saveCaps = () => {
      if (sig && lenses.length) {
        try { localStorage.setItem(CAM_CAPS_KEY, JSON.stringify({ sig, lenses })); } catch (e) {}
      }
    };
    const updateUi = () => {
      if (torchBtn) torchBtn.classList.toggle("on", !!torchOn);
      if (lensBtn) {
        if (lenses.length > 1) {
          lensBtn.style.display = "";
          lensBtn.textContent = "🔄 " + (curIdx + 1) + "/" + lenses.length;
          lensBtn.setAttribute("aria-label", "Объектив " + (curIdx + 1) + "/" + lenses.length);
        } else {
          lensBtn.style.display = "none";
        }
      }
    };
    const syncCurLensMeta = () => {
      if (!track || !lenses[curIdx]) return;
      const r = getMaxRes(track);
      lenses[curIdx] = Object.assign({}, lenses[curIdx], {
        label: lenses[curIdx].label || track.label || "",
        hasTorch: hasTorchCap(track),
        hasAF: hasAfCap(track),
        w: r.w,
        h: r.h,
        probed: true
      });
      saveCaps();
    };
    const switchToIdx = async (nextIdx, wantTorch) => {
      if (!lenses.length) return false;
      const target = lenses[nextIdx];
      if (!target || !target.deviceId) return false;
      const activeId = (lenses[curIdx] && lenses[curIdx].deviceId) || "";
      try { if (torchOn && track && track.applyConstraints) await track.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {}); } catch (e) {}
      stopStream(stream);
      await sleep(60);
      const st = await tryOpenVideo({ deviceId: { exact: target.deviceId } }, wantTorch ? [{ torch: true }] : null);
      if (!st) return false;
      const tr = st.getVideoTracks()[0];
      if (isFrontDev(target.label || (tr && tr.label), tr)) {
        stopStream(st);
        lenses.splice(nextIdx, 1);
        curIdx = Math.max(0, lenses.findIndex(x => x.deviceId === activeId));
        saveCaps();
        return false;
      }
      stream = st;
      track = tr;
      curIdx = nextIdx;
      vid.srcObject = stream;
      try { await vid.play(); } catch (e) {}
      try { localStorage.setItem(CAM_ID_KEY, target.deviceId); } catch (e) {}
      syncCurLensMeta();
      return true;
    };

    const applyTorch = async (on) => {
      if (!track) return false;
      if (on && !hasTorchCap(track) && lenses.length > 1) {
        let torchIdx = lenses.findIndex((x, idx) => idx !== curIdx && x.hasTorch === true);
        if (torchIdx === -1) {
          for (let i = 0; i < lenses.length; i++) {
            const dev = lenses[i];
            if (!dev || dev.deviceId === (track.getSettings && track.getSettings().deviceId) || dev.probed) continue;
            const okSw = await switchToIdx(i, true);
            if (okSw && hasTorchCap(track)) { torchIdx = curIdx; break; }
          }
        } else {
          await switchToIdx(torchIdx, true);
        }
        if (torchIdx !== -1 && hasTorchCap(track)) {
          window.toast && toast("Переключено на объектив со вспышкой");
        }
      }
      if (track.applyConstraints) {
        const variants = [
          { advanced: [{ torch: on }] },
          { torch: on },
          { advanced: [{ fillLightMode: on ? "torch" : "off" }] }
        ];
        for (const c of variants) {
          try {
            await track.applyConstraints(c);
            const st = track.getSettings ? track.getSettings() : {};
            if (!on || st.torch === true || st.fillLightMode === "torch") return true;
          } catch (e) {}
        }
      }
      try {
        const devId = (track.getSettings && track.getSettings().deviceId) || (lenses[curIdx] && lenses[curIdx].deviceId);
        stopStream(stream);
        await sleep(50);
        const newSt = await tryOpenVideo(devId ? { deviceId: { exact: devId } } : { facingMode: "environment" }, [{ torch: on }]);
        if (!newSt) return false;
        stream = newSt;
        track = stream.getVideoTracks()[0];
        vid.srcObject = stream;
        try { await vid.play(); } catch (e) {}
        const st2 = (track && track.getSettings) ? track.getSettings() : {};
        return !on || st2.torch === true || hasTorchCap(track);
      } catch (e) {
        return false;
      }
    };

    const stopCam = () => {
      try { if (torchOn && track && track.applyConstraints) track.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {}); } catch (e) {}
      stopStream(stream);
      ov.remove();
    };

    syncCurLensMeta();
    updateUi();

    if (torchBtn) {
      torchBtn.onclick = async () => {
        if (switching) return;
        switching = true;
        torchBtn.disabled = true;
        try {
          const next = !torchOn;
          const ok = await applyTorch(next);
          if (!ok && next) {
            window.toast && toast("Вспышка недоступна на этом объективе", "err");
            torchOn = false;
          } else {
            torchOn = next;
          }
          updateUi();
        } finally {
          torchBtn.disabled = false;
          switching = false;
        }
      };
    }

    if (lensBtn) {
      lensBtn.onclick = async () => {
        if (switching || lenses.length < 2) return;
        switching = true;
        lensBtn.disabled = true;
        try {
          const prevTorch = torchOn;
          let switched = false;
          for (let step = 1; step <= lenses.length; step++) {
            const tryIdx = (curIdx + step) % lenses.length;
            if (tryIdx === curIdx && lenses.length > 1) continue;
            if (await switchToIdx(tryIdx, prevTorch)) {
              switched = true;
              break;
            }
          }
          if (!switched) {
            window.toast && toast("Другой задний объектив не найден", "err");
            return;
          }
          if (prevTorch) {
            const tOk = await applyTorch(true);
            torchOn = !!tOk;
          } else {
            torchOn = false;
          }
          updateUi();
          const cur = lenses[curIdx];
          window.toast && toast("Объектив " + (curIdx + 1) + "/" + lenses.length + (cur && cur.hasTorch ? " · вспышка" : ""));
        } finally {
          lensBtn.disabled = false;
          switching = false;
        }
      };
    }

    vid.onclick = async ev => {
      const ring = g("olcFocusRing");
      if (ring) {
        ring.style.left = ev.clientX + "px";
        ring.style.top = ev.clientY + "px";
        ring.style.opacity = "1";
        ring.style.transform = "translate(-50%,-50%) scale(1)";
        clearTimeout(ring._t);
        ring._t = setTimeout(() => { ring.style.opacity = "0"; ring.style.transform = "translate(-50%,-50%) scale(1.2)"; }, 700);
      }
      if (!track || !track.applyConstraints) return;
      const cp = getCaps(track);
      const vr = vid.getBoundingClientRect();
      const px = Math.max(0, Math.min(1, (ev.clientX - vr.left) / (vr.width || 1)));
      const py = Math.max(0, Math.min(1, (ev.clientY - vr.top) / (vr.height || 1)));
      const tryFocus = async c => { try { await track.applyConstraints({ advanced: [c] }); return true; } catch (e) { return false; } };
      const single = cp.pointsOfInterest ? { focusMode: "single-shot", pointsOfInterest: [{ x: px, y: py }] } : { focusMode: "single-shot" };
      if (!(await tryFocus(single))) await tryFocus({ focusMode: "single-shot" });
      setTimeout(() => {
        const adv = [{ focusMode: "continuous" }];
        if (torchOn) adv.push({ torch: true });
        track.applyConstraints({ advanced: adv }).catch(() => {});
      }, 900);
    };

    g("olcClose").onclick = stopCam;
    g("olcSys").onclick = () => { stopCam(); if (fallbackInput) fallbackInput.click(); };
    g("olcShot").onclick = async () => {
      const _sb0 = g('olcShot'); if (_sb0) _sb0.disabled = true;
const _fastShot = () => {
        if (torchOn || !vid || (vid.videoWidth || 0) < 1280 || !vid.videoHeight) return '';
        try {
          const vw = vid.videoWidth, vh = vid.videoHeight;
          const vr = vid.getBoundingClientRect();
          const frEl = g('olcFrame');
          const fr = frEl && frEl.getBoundingClientRect();
          let sx = 0, sy = 0, sw = vw, sh = vh;
          if (vr && vr.width > 20 && vr.height > 20 && fr && fr.width > 20 && fr.height > 20) {
            const sc = Math.max(vr.width / vw, vr.height / vh);
            const ox = (vw * sc - vr.width) / 2, oy = (vh * sc - vr.height) / 2;
            sx = Math.max(0, ((fr.left - vr.left) + ox) / sc);
            sy = Math.max(0, ((fr.top - vr.top) + oy) / sc);
            sw = Math.min(vw - sx, fr.width / sc);
            sh = Math.min(vh - sy, fr.height / sc);
          }
          if (sw < 100 || sh < 100) { sx = 0; sy = 0; sw = vw; sh = vh; }
          let dw = Math.round(sw), dh = Math.round(sh);
          if (dw > 1280 || dh > 1280) {
            if (dw > dh) { dh = Math.round(dh * 1280 / dw); dw = 1280; }
            else { dw = Math.round(dw * 1280 / dh); dh = 1280; }
          }
          const cv = document.createElement('canvas'); cv.width = dw; cv.height = dh;
          const ctx = cv.getContext('2d');
          ctx.filter = 'grayscale(1) contrast(1.18)';
          ctx.drawImage(vid, sx, sy, sw, sh, 0, 0, dw, dh);
          ctx.filter = 'none';
          let out = '';
          try {
            const wu = cv.toDataURL('image/webp', 0.85);
            if (wu && wu.indexOf('data:image/webp') === 0) out = wu.split(',').pop();
          } catch (e) {}
          if (!out) out = cv.toDataURL('image/jpeg', 0.85).split(',').pop();
          cv.width = cv.height = 0;
          return out;
        } catch (e) { return ''; }
      };
      const _fastB64 = _fastShot();
      if (_fastB64) {
        stopCam();
        scanBonusFile({ size: _fastB64.length, _preB64: _fastB64, _isCropped: true });
        return;
      }
      const shotBtn = g("olcShot");
      if (shotBtn) shotBtn.disabled = true;
      const vw = vid.videoWidth || 1920, vh = vid.videoHeight || 1080;
      const vidPort = vh > vw;
      if (window.ImageCapture && track && (torchOn || !vid || (vid.videoWidth || 0) < 1280)) {
        try {
          const ic = new ImageCapture(track);
          let photoOpts = torchOn ? { fillLightMode: "torch" } : {};
          try {
            const pc = await ic.getPhotoCapabilities();
            if (pc && pc.imageWidth && pc.imageWidth.max) {
              photoOpts.imageWidth = Math.min(4096, pc.imageWidth.max);
              photoOpts.imageHeight = Math.min(4096, pc.imageHeight.max);
            }
          } catch (e) {}
          const photoBlob = await Promise.race([
            ic.takePhoto(photoOpts),
            new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3500))
          ]);
          if (photoBlob && photoBlob.size > 10000 && window.createImageBitmap) {
            const bmp = await createImageBitmap(photoBlob);
            const bmpPort = bmp.height > bmp.width;
            if (bmpPort === vidPort) {
              const cropped = await cropToFrame(bmp, bmp.width, bmp.height, vid, frameEl);
              bmp.close();
              stopCam();
              if (cropped) { scanBonusFile(cropped); return; }
            } else {
              bmp.close();
            }
          }
        } catch (e) {}
      }
      const croppedVid = await cropToFrame(vid, vw, vh, vid, frameEl);
      stopCam();
      if (croppedVid) scanBonusFile(croppedVid);
    };
  }

  function showOcrInstructionModal(onDone){
    let hm = g('ocrHelpMdl'); if (hm) hm.remove();
    hm = document.createElement('div'); hm.id = 'ocrHelpMdl'; hm.className = 'cm open';
    hm.innerHTML = '<div class="cm-b ocr-help-box">'
      + '<div class="ocr-help-hd"><b>📄 Как фотографировать</b><button type="button" class="pm-x" id="ocrHelpX">✕</button></div>'
      + '<div class="ocr-sample-wrap">'
      + '  <div class="ocr-sample-cropper">'
      + '    <img class="ocr-sample-img" src="sample-doc.jpg" alt="Образец накладной">'
      + '    <div class="ocr-sample-rect"></div>'
      + '    <div class="ocr-sample-badge">🟢 Фотографируйте весь лист ровно сверху</div>'
      + '  </div>'
      + '</div>'
      + '<div class="ocr-help-rules">'
      + '  <div class="ocr-help-r"><span>1️⃣</span><div><b>Держите телефон ровно сверху</b><br>Лист накладной должен полностью помещаться в кадр.</div></div>'
      + '  <div class="ocr-help-r"><span>2️⃣</span><div><b>Номер «Վաճառքի փաստաթուղթ»</b><br>Убедитесь, что строка номера накладной видна и не обрезана.</div></div>'
      + '  <div class="ocr-help-r"><span>3️⃣</span><div><b>Таблица товаров и количество</b><br>Не закрывайте пальцами колонки товаров и штук.</div></div>'
      + '  <div class="ocr-help-r"><span>4️⃣</span><div><b>Хороший свет / Вспышка</b><br>Если темно, обязательно включите фонарик кнопкой «🔦 Свет».</div></div>'
      + '</div>'
      + '<button type="button" class="ocr-help-btn" id="ocrHelpOk">Понятно, сканировать</button>'
      + '</div>';
    document.body.appendChild(hm);
    const closeH = () => {
      try { localStorage.setItem('OCR_INSTRUCT_SEEN', '1'); } catch (e) {}
      hm.remove();
      if (typeof onDone === 'function') onDone();
    };
    g('ocrHelpX').onclick = closeH;
    g('ocrHelpOk').onclick = closeH;
    hm.onclick = e => { if (e.target === hm) closeH(); };
  }

  window.openBonusScanner = () => {
    warmGeminiHost();
    const { cam, gal } = ensureOcrInputs();

    const openSourcePicker = () => {
      let m = g('ocrSrcMdl'); if (m) m.remove();
      m = document.createElement('div'); m.id = 'ocrSrcMdl'; m.className = 'cm open';
      m.innerHTML = '<div class="cm-b ocr-src-box"><button type="button" class="pm-x" id="ocrPickX">✕</button><div class="ocr-src-top"><div class="ocr-src-ring"><div class="ocr-src-in">📷</div></div><div class="ocr-src-pill"><i></i>Smart OCR</div><div class="ocr-src-t">Сканировать накладную</div><div class="ocr-src-s">Автоподсчёт бонусов по фото документа</div></div><button type="button" id="ocrHelpLink" style="background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.35);color:#7dd3fc;padding:7px 12px;border-radius:12px;font-size:12px;font-weight:700;margin-bottom:14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px">💡 Инструкция: как фотографировать</button><div class="pm-acts"><button type="button" class="pm-btn pm-chat" id="ocrPickCam"><span class="pm-btn-l"><span class="pm-ic">📸</span><span class="pm-tx"><b>Открыть камеру</b><small>Сфотографировать накладную</small></span></span><span class="pm-arr">›</span></button><button type="button" class="pm-btn pm-dm" id="ocrPickGal"><span class="pm-btn-l"><span class="pm-ic">🖼️</span><span class="pm-tx"><b>Выбрать из галереи</b><small>Один или несколько снимков</small></span></span><span class="pm-arr">›</span></button></div><button type="button" class="pm-cls" id="ocrPickNo">Отмена</button></div>';
      document.body.appendChild(m);
      const close = () => m.remove();
      g('ocrPickNo').onclick = close; g('ocrPickX').onclick = close; m.onclick = e => { if (e.target === m) close(); };
      g('ocrHelpLink').onclick = () => { showOcrInstructionModal(); };
      g('ocrPickCam').onclick = () => { close(); openLiveCamera(cam); }; g('ocrPickGal').onclick = () => { close(); gal.click(); };
    };

    let seen = false;
    try { seen = !!localStorage.getItem('OCR_INSTRUCT_SEEN'); } catch (e) {}
    if (!seen) {
      showOcrInstructionModal(() => openSourcePicker());
    } else {
      openSourcePicker();
    }
  };
  window.EUROBAZA_OCR_KEY = GKEY;
  const _ebWarmHook = () => { try { if (typeof warmGeminiHost === 'function') warmGeminiHost(); } catch (e) {} };
  document.addEventListener('pointerdown', ev => { if (ev.target && ev.target.closest && ev.target.closest('#bnCamBtn, .fab-l')) _ebWarmHook(); }, { passive: true });
  setTimeout(() => {
    try {
      const raw = sessionStorage.getItem("OCR_BON_DRAFT");
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.rows) && d.rows.length) {
        if (window.openBon && (!g("bnMdl") || !g("bnMdl").classList.contains("open"))) window.openBon(true);
        openBonusInvoiceModal(d.rows, !!d.isCity, d.docNum || '');
      }
    } catch (e) {}
  }, 350);
})();
