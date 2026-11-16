(function(){
 const LANGS={ru:'Русский',hy:'Հայերեն',en:'English'};
 const SR={ru:'ru-RU',hy:'hy-AM',en:'en-US'};
 let L='ru';try{const v=localStorage.getItem('LANG');if(LANGS[v])L=v}catch(e){}
 // Ключ — русский текст, значение — [армянский, английский]
 const D={
  'Установите приложение на экран':['Տեղադրեք հավելվածը հիմնական էկրանին','Install the app on your home screen'],
  'Установить':['Տեղադրել','Install'],
  'Установить EuroBaza на главный экран':['Տեղադրել EuroBaza-ն հիմնական էկրանին','Install EuroBaza on your home screen'],
  'Чтобы установить на iPhone: нажмите':['iPhone-ում տեղադրելու համար սեղմեք','To install on iPhone, tap'],
  'Поделиться':['Կիսվել','Share'],
  '(квадрат со стрелкой) →':['(քառակուսի սլաքով) →','(square with arrow) →'],
  'На экран «Домой»':['Ավելացնել հիմնական էկրանին','Add to Home Screen'],
  'Доставка EuroBaza':['EuroBaza առաքում','EuroBaza Delivery'],
  'Например: Абовяна 10, Ереван':['Օրինակ՝ Աբովյան 10, Երևան','For example: Abovyan 10, Yerevan'],
  'Добавить адрес':['Ավելացնել հասցե','Add address'],
  'Очистить':['Մաքրել','Clear'],
  'Найти лучший порядок':['Գտնել լավագույն հերթականությունը','Find the best order'],
  'Вернуться на базу':['Վերադառնալ բազա','Return to base'],
  'Маршрут закончится на базе':['Երթուղին կավարտվի բազայում','The route will end at the base'],
  'Точки':['Կետեր','Points'],
  'Бонусы':['Բոնուսներ','Bonuses'],
  'Точки без адреса':['Կետեր առանց հասցեի','Points without address'],
  'Название точки':['Կետի անվանումը','Point name'],
  'Координаты или нажмите 📍':['Կոորդինատներ կամ սեղմեք 📍','Coordinates or tap 📍'],
  'Добавить точку':['Ավելացնել կետ','Add point'],
  'Отмена':['Չեղարկել','Cancel'],
  'Пока нет адресов. Введите адрес выше или нажмите 🎤 и продиктуйте':['Դեռ հասցեներ չկան։ Մուտքագրեք հասցեն վերևում կամ սեղմեք 🎤 և թելադրեք','No addresses yet. Enter an address above or tap 🎤 and speak'],
  'Очистить список адресов?':['Մաքրե՞լ հասցեների ցանկը','Clear the address list?'],
  'Очистить построенный маршрут?':['Մաքրե՞լ կառուցված երթուղին','Clear the built route?'],
  'Список очищен':['Ցանկը մաքրվեց','List cleared'],
  'Маршрут очищен':['Երթուղին մաքրվեց','Route cleared'],
  'Адрес удалён':['Հասցեն ջնջվեց','Address deleted'],
  'Голосовой ввод не поддерживается в этом браузере':['Ձայնային մուտքը չի աջակցվում այս դիտարկիչում','Voice input is not supported in this browser'],
  'Говорите адрес...':['Ասեք հասցեն...','Say the address...'],
  'Не удалось распознать голос':['Չհաջողվեց ճանաչել ձայնը','Could not recognize speech'],
  'Список пуст. Добавьте точку ниже.':['Ցանկը դատարկ է։ Ավելացրեք կետ ներքևում։','The list is empty. Add a point below.'],
  'Определяю геопозицию...':['Որոշում եմ գտնվելու վայրը...','Detecting your location...'],
  'Определяю вашу геопозицию...':['Որոշում եմ ձեր գտնվելու վայրը...','Detecting your location...'],
  'Определяю местоположение...':['Որոշում եմ դիրքը...','Detecting your position...'],
  'Включите геолокацию для расчёта времени':['Միացրեք գեոդիրքավորումը ժամանակը հաշվելու համար','Turn on location to calculate the time'],
  'Поехали':['Գնացինք','Go'],
  'Удалить':['Ջնջել','Delete'],
  'Точка удалена':['Կետը ջնջվեց','Point deleted'],
  'Точка добавлена':['Կետը ավելացվեց','Point added'],
  'Введите название точки':['Մուտքագրեք կետի անվանումը','Enter the point name'],
  'Нужно два числа: 40.1630, 44.3882':['Պետք է երկու թիվ՝ 40.1630, 44.3882','Two numbers needed: 40.1630, 44.3882'],
  'Координаты вне Армении, проверьте':['Կոորդինատները Հայաստանից դուրս են, ստուգեք','Coordinates are outside Armenia, please check'],
  'Нет доступа к геолокации. Введите координаты вручную':['Գեոդիրքավորման հասանելիություն չկա։ Մուտքագրեք կոորդինատները ձեռքով','No location access. Enter the coordinates manually'],
  'Координаты подставлены. Введите название и нажмите «Добавить точку»':['Կոորդինատները տեղադրված են։ Մուտքագրեք անվանումը և սեղմեք «Ավելացնել կետ»','Coordinates filled in. Enter a name and tap “Add point”'],
  'Нет доступа к геолокации. Разрешите её для Chrome':['Գեոդիրքավորման հասանելիություն չկա։ Թույլատրեք այն Chrome-ի համար','No location access. Allow it for Chrome'],
  'Разрешите доступ к геолокации для Chrome':['Թույլատրեք գեոդիրքավորման հասանելիությունը Chrome-ի համար','Allow location access for Chrome'],
  'Нет доступа к геолокации':['Գեոդիրքավորման հասանելիություն չկա','No location access'],
  'Считаю лучший порядок...':['Հաշվում եմ լավագույն հերթականությունը...','Calculating the best order...'],
  'Маршрут построен (время приблизительно)':['Երթուղին կառուցվեց (ժամանակը մոտավոր է)','Route built (time is approximate)'],
  'Маршрут построен':['Երթուղին կառուցվեց','Route built'],
  'Порядок (потяните ☰):':['Հերթականություն (քաշեք ☰)՝','Order (drag ☰):'],
  'Весь путь':['Ամբողջ ճանապարհը','Total trip'],
  'приблизительно':['մոտավորապես','approximate'],
  'Открыть в навигаторе':['Բացել նավիգատորում','Open in navigator'],
  'Возврат на базу (Арин Берд 7)':['Վերադարձ բազա (Առին Բերդ 7)','Return to base (Arin Berd 7)'],
  'Ищу адрес в Яндексе...':['Որոնում եմ հասցեն Yandex-ում...','Searching the address in Yandex...'],
  'Выберите нужный вариант:':['Ընտրեք համապատասխան տարբերակը՝','Choose the right option:'],
  'Из сохранённых адресов:':['Պահպանված հասցեներից՝','From saved addresses:'],
  'Нет интернета. Проверьте сеть и повторите':['Ինտերնետ չկա։ Ստուգեք կապը և կրկնեք','No internet. Check your connection and try again'],
  'Не удалось связаться с Яндексом. Проверьте сеть':['Չհաջողվեց կապ հաստատել Yandex-ի հետ։ Ստուգեք կապը','Could not reach Yandex. Check your connection'],
  'Яндекс отклонил запрос (лимит или ключ API)':['Yandex-ը մերժեց հարցումը (սահմանաչափ կամ API բանալի)','Yandex rejected the request (limit or API key)'],
  'Яндекс временно не отвечает. Попробуйте позже':['Yandex-ը ժամանակավորապես չի պատասխանում։ Փորձեք ավելի ուշ','Yandex is temporarily unavailable. Try again later'],
  'Адрес не найден. Попробуйте написать иначе или добавьте город':['Հասցեն չի գտնվել։ Փորձեք այլ կերպ գրել կամ ավելացրեք քաղաքը','Address not found. Try writing it differently or add the city'],
  'Адрес добавлен':['Հասցեն ավելացվեց','Address added'],
  'Яндекс Навигатор не открылся. Открыть маршрут в Google Maps?':['Yandex Navigator-ը չբացվեց։ Բացե՞լ երթուղին Google Maps-ում','Yandex Navigator did not open. Open the route in Google Maps?'],
  'Открыть':['Բացել','Open'],
  'версия: нет данных':['տարբերակ՝ տվյալներ չկան','version: no data'],
  'Навигатор: по умолчанию':['Նավիգատոր՝ լռելյայն','Navigator: default'],
  'Навигатор: Яндекс':['Նավիգատոր՝ Yandex','Navigator: Yandex'],
  'Откроется Яндекс Навигатор':['Կբացվի Yandex Navigator-ը','Yandex Navigator will open'],
  'Откроется навигатор по умолчанию':['Կբացվի լռելյայն նավիգատորը','The default navigator will open'],
  'Показать на карте':['Ցույց տալ քարտեզի վրա','Show on map'],
  'Карта':['Քարտեզ','Map'],
  'Север':['Հյուսիս','North'],
  'Весь маршрут':['Ամբողջ երթուղին','Whole route'],
  'Сначала постройте маршрут':['Նախ կառուցեք երթուղին','Build a route first'],
  'Загружаю карту...':['Բեռնում եմ քարտեզը...','Loading the map...'],
  'Не удалось загрузить карту. Проверьте интернет':['Չհաջողվեց բեռնել քարտեզը։ Ստուգեք ինտերնետը','Could not load the map. Check your internet'],
  'Точек:':['Կետեր՝','Points:'],
  'Линия по прямой (загружаю дороги...)':['Գիծը ուղիղ է (բեռնում եմ ճանապարհները...)','Straight line (loading roads...)'],
  'Линия построена по дорогам':['Գիծը կառուցված է ճանապարհներով','Line follows the roads'],
  'Дороги не загрузились, линия по прямой':['Ճանապարհները չբեռնվեցին, գիծը ուղիղ է','Roads failed to load, straight line shown'],
  'Вы':['Դուք','You'],
  'Вы здесь':['Դուք այստեղ եք','You are here'],
  'старт маршрута':['երթուղու սկիզբ','route start'],
  'Неточный адрес: Яндекс нашёл только район или город':['Անճշգրիտ հասցե․ Yandex-ը գտել է միայն թաղամասը կամ քաղաքը','Inexact address: Yandex found only a district or city'],
  'Всего штук:':['Ընդամենը հատ՝','Total pieces:'],
  'Общая сумма':['Ընդհանուր գումար','Total amount'],
  'Итоги':['Ամփոփում','Summary'],
  'Обнулить':['Զրոյացնել','Reset'],
  'Обнулить количества':['Զրոյացնել քանակները','Reset quantities'],
  'Обнулить все количества?':['Զրոյացնե՞լ բոլոր քանակները','Reset all quantities?'],
  'Количества обнулены':['Քանակները զրոյացվեցին','Quantities reset'],
  'Скопировать':['Պատճենել','Copy'],
  'Скопировано':['Պատճենվեց','Copied'],
  'Не удалось скопировать':['Չհաջողվեց պատճենել','Could not copy'],
  'Пока ничего не выбрано.':['Դեռ ոչինչ ընտրված չէ։','Nothing selected yet.'],
  'Пока ничего не выбрано':['Դեռ ոչինչ ընտրված չէ','Nothing selected yet'],
  'Город':['Քաղաք','City'],
  'Район':['Մարզ','Region']
 };
 const UN={hy:{h:'ժ',m:'ր',k:'կմ'},en:{h:'h',m:'min',k:'km'}};
 const units=(s,l)=>{const u=UN[l];return s.replace(/(\d) ч(?=\s|$|\))/g,'$1 '+u.h).replace(/(\d) мин(?=\s|$|\))/g,'$1 '+u.m).replace(/(\d) км(?=\s|$|\))/g,'$1 '+u.k)};
 const T=(k,i)=>D[k]?D[k][i]:k;
 const PAT=[
  [/^~(.+)$/,(m,l)=>'~'+units(m[1],l)],
  [/^\(\+(.+)\)$/,(m,l)=>'(+'+units(m[1],l)+')'],
  [/^Весь путь: ~(.+?)(\s*⚠\uFE0F?\s*приблизительно)?$/,(m,l,i)=>T('Весь путь',i)+': ~'+units(m[1],l)+(m[2]?' ⚠ '+T('приблизительно',i):'')],
  [/^версия от (.+)$/,(m,l,i)=>['տարբերակ՝ ','Version from '][i]+m[1]],
  [/^(\d+) поз\.$/,(m,l,i)=>m[1]+[' տեսակ',' items'][i]],
  [/^Выбрано: (.+) шт$/,(m,l,i)=>[ 'Ընտրված՝ '+m[1]+' հատ','Selected: '+m[1]+' pcs'][i]],
  [/^(Город|Район) · (.+)$/,(m,l,i)=>T(m[1],i)+' · '+m[2]],
  [/^Удалить точку «([\s\S]*)»\?$/,(m,l,i)=>['Ջնջե՞լ «'+m[1]+'» կետը','Delete point “'+m[1]+'”?'][i]],
  [/^Неточных адресов: (\d+) \(жёлтые маркеры\)\. Маршрут приведёт в центр района, уточните улицу и дом\.$/,(m,l,i)=>['Անճշգրիտ հասցեներ՝ '+m[1]+' (դեղին նշիչներ)։ Երթուղին կտանի թաղամասի կենտրոն, ճշտեք փողոցը և տունը։','Inexact addresses: '+m[1]+' (yellow markers). The route leads to the district center, so please specify the street and house number.'][i]]
 ];
 function tc(core,l){
  const i=l==='hy'?0:1;
  if(Object.prototype.hasOwnProperty.call(D,core))return D[core][i];
  for(const p of PAT){const m=core.match(p[0]);if(m)return p[1](m,l,i)}
  const e=core.match(/^([^\p{L}\p{N}(«~+]+)([\s\S]+)$/u);
  if(e){const r=tc(e[2],l);if(r!=null)return e[1]+r}
  return null;
 }
 function tx(raw,l){
  if(l==='ru')return null;
  const m=raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if(!m[2])return null;
  const r=tc(m[2],l);
  return r==null?null:m[1]+r+m[3];
 }
 const ORIG=new WeakMap(),OUT=new WeakMap(),AO=new WeakMap();
 function doText(n){
  const cur=n.data;
  if(OUT.get(n)!==cur)ORIG.set(n,cur);
  const o=ORIG.get(n),r=tx(o,L),want=r==null?o:r;
  if(n.data!==want)n.data=want;
  OUT.set(n,want);
 }
 const AT=['placeholder','title','aria-label'];
 function attrs(el){
  for(const a of AT){
   if(!el.hasAttribute||!el.hasAttribute(a))continue;
   let m=AO.get(el);if(!m){m={};AO.set(el,m)}
   const cur=el.getAttribute(a);
   if(!m[a]||m[a].out!==cur)m[a]={o:cur,out:cur};
   const r=tx(m[a].o,L),want=r==null?m[a].o:r;
   if(cur!==want)el.setAttribute(a,want);
   m[a].out=want;
  }
 }
 const FLT={acceptNode:n=>n.nodeType===1&&(n.tagName==='SCRIPT'||n.tagName==='STYLE')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT};
 function walk(root){
  if(root.nodeType===3){doText(root);return}
  if(root.nodeType!==1)return;
  if(root.tagName==='SCRIPT'||root.tagName==='STYLE')return;
  attrs(root);
  const w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,FLT);
  let n;while((n=w.nextNode())){if(n.nodeType===3)doText(n);else attrs(n)}
 }
 new MutationObserver(ms=>{
  if(L==='ru')return;
  for(const m of ms){
   if(m.type==='characterData')doText(m.target);
   else m.addedNodes.forEach(walk);
  }
 }).observe(document.documentElement,{childList:true,subtree:true,characterData:true});

 // Текст для буфера обмена («Итоги → Скопировать»)
 window.i18nCopy=function(s){
  if(L==='ru')return s;
  const i=L==='hy'?0:1,w=k=>D[k][i];
  return s.replace(/^Итоги$/m,w('Итоги'))
   .replace(/^(\s*)Город: /gm,'$1'+w('Город')+': ')
   .replace(/^(\s*)Район: /gm,'$1'+w('Район')+': ')
   .replace(/^Всего штук: /m,w('Всего штук:')+' ')
   .replace(/^Общая сумма: /m,w('Общая сумма')+': ');
 };

 let btn=null;
 const lab=()=>{if(btn)btn.textContent='🌐 '+LANGS[L]};
 function setLang(l){
  if(!LANGS[l])return;
  L=l;try{localStorage.setItem('LANG',l)}catch(e){}
  document.documentElement.lang=l;window.LANG_SR=SR[l];
  walk(document.body);lab();
 }
 function dlg(){
  let m=document.getElementById('lgM');if(m)return m;
  m=document.createElement('div');m.id='lgM';m.className='cm';
  m.innerHTML='<div class="cm-b"><div class="cm-i">🌐</div><div class="cm-t">Язык / Լեզու / Language</div><div class="lg-r">'
   +Object.keys(LANGS).map(k=>'<button data-l="'+k+'">'+LANGS[k]+'</button>').join('')+'</div></div>';
  document.body.appendChild(m);
  m.onclick=e=>{
   const b=e.target.closest('button[data-l]');
   if(b){setLang(b.dataset.l);m.classList.remove('open');return}
   if(e.target===m)m.classList.remove('open');
  };
  return m;
 }
 function openDlg(){
  const m=dlg();
  m.querySelectorAll('button[data-l]').forEach(b=>b.classList.toggle('on',b.dataset.l===L));
  m.classList.add('open');
 }
 const f=document.getElementById('ft');
 btn=document.createElement('button');btn.id='langBtn';btn.onclick=openDlg;
 if(f)f.appendChild(btn);else document.body.appendChild(btn);
 document.documentElement.lang=L;window.LANG_SR=SR[L];
 lab();
 if(L!=='ru')walk(document.body);
})();
