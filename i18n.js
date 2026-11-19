(function(){
 const LANGS={ru:'Русский',hy:'Հայերեն',en:'English'};
 const SR={ru:'ru-RU',hy:'hy-AM',en:'en-US'};
 let L='ru';try{const v=localStorage.getItem('LANG');if(LANGS[v])L=v}catch(e){}
 window.getLang=()=>L;
 // Ключ — русский текст, значение — [армянский, английский]
 const D={
  'Настройки':['Կարգավորումներ','Settings'],
  'Маршрут и навигация':['Երթուղի և նավիգացիա','Route & Navigation'],
  'Приложение для ведения':['Նավիգացիայի հավելված','Navigation app'],
  'Системный':['Համակարգային','System'],
  'Смена':['Հերթափոխ','Shift'],
  'Объезд Покр Кентрона днём':['Փոքր Կենտրոնի շրջանցում ցերեկը','Bypass Pokr Kentron by day'],
  'День':['Ցերեկ','Day'],
  'Ночь':['Գիշեր','Night'],
  'Интерфейс':['Ինտերֆեյս','Interface'],
  'Тактильный отклик':['Հպման արձագանք','Haptic feedback'],
  'Вибрация при нажатиях':['Թրթռում սեղմելիս','Vibration on tap'],
  'Безопасность':['Անվտանգություն','Security'],
  'Старый ПИН':['Հին PIN','Old PIN'],
  'Новый ПИН':['Նոր PIN','New PIN'],
  'Изменить':['Փոխել','Change'],
  'Обновить версию приложения':['Թարմացնել հավելվածի տարբերակը','Update app version'],
  'Личный чат с админом':['Անձնական չատ ադմինի հետ','Direct chat with admin'],
  'Выйти из аккаунта':['Դուրս գալ հաշվից','Log out'],
  'Общий чат':['Ընդհանուր չատ','General chat'],
  'Сообщение...':['Հաղորդագրություն...','Message...'],
  'Нет соединения с сервером':['Չկա կապ սերվերի հետ','No connection to server'],
  'Ошибка:':['Սխալ՝','Error:'],
  'Введите имя':['Մուտքագրեք անունը','Enter a name'],
  'Ваше имя':['Ձեր անունը','Your name'],
  'Сохранить':['Պահպանել','Save'],
  'Имя сохранено':['Անունը պահպանվեց','Name saved'],
  'Нет интернета':['Ինտերնետ չկա','No internet'],
  'Сменить имя':['Փոխել անունը','Change name'],
  'Не удалось загрузить чат':['Չհաջողվեց բեռնել չատը','Could not load chat'],
  'Например: Артак':['Օրինակ՝ Արտակ','For example: Artak'],
  'Сохранённые итоги':['Պահպանված ամփոփումներ','Saved totals'],
  'Все итоги':['Բոլոր ամփոփումները','All totals'],
  'Итоги сохранены':['Ամփոփումը պահպանվեց','Totals saved'],
  'Итоги удалены':['Ամփոփումը ջնջվեց','Totals deleted'],
  'Нажмите «💾 Сохранить», когда захотите зафиксировать итоги. Количества тогда обнулятся.':['Սեղմեք «💾 Պահպանել», երբ ուզենաք ամփոփել։ Քանակները կզրոյացվեն։','Tap «💾 Save» when you want to record the totals. Quantities will then reset.'],
  'Выберите месяц и год':['Ընտրեք ամիսը և տարին','Choose month and year'],
  'Укажите год от 2000 до 2100':['Նշեք տարին 2000-ից 2100','Enter a year from 2000 to 2100'],
  'Сохранить итоги за выбранный месяц и обнулить количества?':['Պահպանե՞լ ամփոփումը և զրոյացնե՞լ քանակները','Save totals for the chosen month and reset quantities?'],
  'Удалить эти итоги? Это действие нельзя отменить.':['Ջնջե՞լ այս ամփոփումը։ Չեղարկել հնարավոր չէ։','Delete these totals? This cannot be undone.'],
  'Установите приложение на экран':['Տեղադրեք հավելվածը հիմնական էկրանին','Install the app on your home screen'],
  'Установить':['Տեղադրել','Install'],
  'Для установки: откройте в':['Տեղադրելու համար բացեք','To install, open in'],
  '→ меню':['→ մենյու','→ menu'],
  '→':['→','→'],
  'На главный экран':['Ավելացնել հիմնական էկրանին','Add to Home screen'],
  'Установите приложение на экран для быстрого входа':['Տեղադրեք հավելվածը էկրանին՝ արագ մուտքի համար','Install the app on your screen for quick access'],
  'Для установки: нажмите':['Տեղադրելու համար սեղմեք','To install, tap'],
  '(□↑) →':['(□↑) →','(□↑) →'],
  'Установить EuroBaza на главный экран':['Տեղադրել EuroBaza-ն հիմնական էկրանին','Install EuroBaza on your home screen'],
  'Чтобы установить на iPhone: нажмите':['iPhone-ում տեղադրելու համար սեղմեք','To install on iPhone, tap'],
  'Поделиться':['Կիսվել','Share'],
  '(квадрат со стрелкой) →':['(քառակուսի սլաքով) →','(square with arrow) →'],
  'На экран «Домой»':['Ավելացնել հիմնական էկրանին','Add to Home Screen'],
  'Доставка EuroBaza':['EuroBaza առաքում','EuroBaza Delivery'],
  'Введите адрес или продиктуйте':['Մուտքագրեք հասցեն կամ թելադրեք','Enter address or dictate'],
  'Добавить адрес':['Ավելացնել հասցե','Add address'],
  'Очистить':['Մաքրել','Clear'],
  'Найти лучший порядок':['Գտնել լավագույն հերթականությունը','Find the best order'],
  'Вернуться на базу':['Վերադառնալ բազա','Return to base'],
  'Дневная смена':['Ցերեկային հերթափոխ','Day shift'],
  'Ночная смена':['Գիշերային հերթափոխ','Night shift'],
  'Считаю маршрут в объезд Кентрона...':['Հաշվում եմ երթուղին Կենտրոնի շրջանցմամբ...','Calculating route bypassing Kentron...'],
  'Маршрут закончится на базе':['Երթուղին կավարտվի բազայում','The route will end at the base'],
  'Точки':['Կետեր','Points'],
  'Бонусы':['Բոնուսներ','Bonuses'],
  'Расчёт по категориям мебели':['Հաշվարկ ըստ կահույքի կատեգորիաների','Calculation by furniture category'],
  'Сводка и история начислений':['Ամփոփում և պատմություն','Summary and history'],

  'Админ':['Ադմին','Admin'],
  'Точки без адреса':['Կետեր առանց հասցեի','Points without address'],
  'Быстрый запуск навигатора':['Նավիգատորի արագ գործարկում','Quick navigator launch'],
  'Название точки':['Կետի անվանումը','Point name'],
  'Координаты или нажмите 📍':['Կոորդինատներ կամ սեղմեք 📍','Coordinates or tap 📍'],
  'Добавить точку':['Ավելացնել կետ','Add point'],
  'Новая точка':['Նոր կետ','New point'],
  'Укажите название и координаты':['Նշեք անվանումը և կոորդինատները','Enter name and coordinates'],
  'Координаты или кнопка справа':['Կոորդինատներ կամ աջ կոճակը','Coordinates or button on the right'],
  'Координаты подставлены. Введите название и нажмите «Сохранить»':['Կոորդինատները տեղադրված են։ Մուտքագրեք անվանումը և սեղմեք «Պահպանել»','Coordinates filled in. Enter a name and tap “Save”'],

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
  'Навигатор':['Նավիգատոր','Navigator'],
  'Яндекс':['Yandex','Yandex'],
  'По умолчанию':['Լռելյայն','Default'],
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
  'Месяц':['Ամիս','Month'],
  'Штук':['Հատ','Pcs'],
  'Сумма':['Գումար','Amount'],
  'Текущий месяц':['Ընթացիկ ամիս','Current month'],
  'Все месяцы':['Բոլոր ամիսները','All months'],
  'Закрытых месяцев пока нет. Итоги сохранятся, когда начнётся новый месяц.':['Փակված ամիսներ դեռ չկան։ Ամփոփումը կպահպանվի նոր ամսվա սկզբին։','No closed months yet. Totals will be saved when a new month starts.'],
  'Ничего не выбрано.':['Ոչինչ ընտրված չէ։','Nothing selected.'],
  'Город':['Քաղաք','City'],
  'Район':['Մարզ','Region'],
 'Интернет восстановлен':['Ինտերնետը վերականգնվեց','Internet restored'],
 'Нет интернета. Работаю в офлайн-режиме':['Ինտերնետ չկա։ Աշխատում եմ անցանց ռեժիմում','No internet. Working offline'],
 'Введите имя и 4-значный код.':['Մուտքագրեք անունը և 4-նիշ կոդը։','Enter your name and 4-digit code.'],
 'Новый профиль создастся автоматически.':['Նոր պրոֆիլը կստեղծվի ավտոմատ կերպով։','A new profile will be created automatically.'],
 'Ваше имя (например: Артак)':['Ձեր անունը (օրինակ՝ Արտակ)','Your name (e.g. Artak)'],
 '4-значный ПИН-код':['4-նիշ PIN-կոդ','4-digit PIN code'],
 'Продолжить':['Շարունակել','Continue'],
 'Проверка...':['Ստուգում...','Checking...'],
 'Введите имя (минимум 2 буквы)':['Մուտքագրեք անունը (առնվազն 2 տառ)','Enter your name (at least 2 letters)'],
 'Введите ровно 4 цифры кода':['Մուտքագրեք կոդի ճիշտ 4 թիվ','Enter exactly 4 digits'],
 'Нет связи с сервером. Проверьте интернет':['Չկա կապ սերվերի հետ։ Ստուգեք ինտերնետը','No connection to server. Check your internet'],
 'Ошибка соединения. Попробуйте ещё раз':['Միացման սխալ։ Փորձեք ևս մեկ անգամ','Connection error. Please try again'],
 'Выйти':['Դուրս գալ','Log out'],
 'Ваш профиль заблокирован администратором':['Ձեր պրոֆիլը արգելափակված է ադմինիստրատորի կողմից','Your profile has been blocked by the administrator'],
 'Личный чат':['Անձնական չատ','Direct chat'],
 'Личная переписка с админом':['Անձնական նամակագրություն ադմինի հետ','Direct chat with admin'],
 'Прямая связь с администратором':['Ուղիղ կապ ադմինիստրատորի հետ','Direct line with administrator'],
 'Сообщение админу...':['Հաղորդագրություն ադմինին...','Message to admin...'],
 'Личных сообщений с админом пока нет. Напишите первым!':['Ադմինի հետ անձնական հաղորդագրություններ դեռ չկան։ Գրեք առաջինը։','No direct messages with admin yet. Write first!'],
 'Это устройство заблокировано администратором':['Այս սարքը արգելափակված է ադմինիստրատորի կողմից','This device has been blocked by the administrator'],
 'Профиль водителя':['Վարորդի պրոֆիլ','Driver profile'],
 'Канал водителей EuroBaza':['EuroBaza վարորդների ալիք','EuroBaza drivers channel'],
 'Сменить водителя на телефоне':['Փոխել վարորդին հեռախոսում','Switch driver on this phone'],
 'Сообщений пока нет. Напишите первым!':['Հաղորդագրություններ դեռ չկան։ Գրեք առաջինը։','No messages yet. Write first!'],
  'Распознаю текст с фото...':['Ճանաչում եմ տեքստը լուսանկարից...','Recognizing text from photo...'],
 'Текст на фото не найден':['Լուսանկարում տեքստ չի գտնվել','No text found in photo'],
 'Текст распознан':['Տեքստը ճանաչվեց','Text recognized'],
 'Не удалось распознать фото':['Չհաջողվեց ճանաչել լուսանկարը','Could not recognize photo'],
 'Сканировать адрес с фото':['Սկանավորել հասցեն լուսանկարից','Scan address from photo'],
 'Открыть камеру':['Բացել տեսախցիկը','Open camera'],
 'Выбрать из галереи':['Ընտրել պատկերասրահից','Choose from gallery'],
 'Не удалось отправить сообщение':['Չհաջողվեց ուղարկել հաղորդագրությունը','Failed to send message'],
 'Адреса в Покр Кентроне удалены':['Փոքր Կենտրոնի հասցեները ջնջվեցին','Pokr Kentron addresses removed'],
 'Продолжить':['Շարունակել','Continue'],
 };

 // AUTO_I18N_TRANSLATIONS
 fetch('./auto-translations.json')
  .then(r => { if (!r.ok) throw new Error('translation file'); return r.json(); })
  .then(extra => {
   if (extra && typeof extra === 'object') {
    Object.keys(extra).forEach(k => {
     if (!Object.prototype.hasOwnProperty.call(D, k)) D[k] = extra[k];
    });
    if (L !== 'ru') walk(document.body);
   }
  })
  .catch(e => console.warn('Auto translations unavailable:', e));

 const UN={hy:{h:'ժ',m:'ր',k:'կմ'},en:{h:'h',m:'min',k:'km'}};
 const units=(s,l)=>{const u=UN[l];return s.replace(/(\d) ч(?=\s|$|\))/g,'$1 '+u.h).replace(/(\d) мин(?=\s|$|\))/g,'$1 '+u.m).replace(/(\d) км(?=\s|$|\))/g,'$1 '+u.k)};
 const T=(k,i)=>D[k]?D[k][i]:k;
 const PAT=[
  [/^([\d\s.,]+)\s*шт(.*)$/,(m,l,i)=>m.at(1)+[' հատ',' pcs'].at(i)+(m.at(2)||'')],
  [/^~(.+)$/,(m,l)=>'~'+units(m[1],l)],
  [/^\(\+(.+)\)$/,(m,l)=>'(+'+units(m[1],l)+')'],
  [/^Весь путь: ~(.+?)(\s*⚠\uFE0F?\s*приблизительно)?$/,(m,l,i)=>T('Весь путь',i)+': ~'+units(m[1],l)+(m[2]?' ⚠ '+T('приблизительно',i):'')],
  [/^версия от (.+)$/,(m,l,i)=>['տարբերակ՝ ','Version from '][i]+m[1]],
  [/^(\d+) поз\.$/,(m,l,i)=>m[1]+[' տեսակ',' items'][i]],
  [/^Выбрано: (.+) шт$/,(m,l,i)=>[ 'Ընտրված՝ '+m[1]+' հատ','Selected: '+m[1]+' pcs'][i]],
  [/^(Город|Район) · (.+)$/,(m,l,i)=>T(m[1],i)+' · '+m[2]],
  [/^Удалить точку «([\s\S]*)»\?$/,(m,l,i)=>['Ջնջե՞լ «'+m[1]+'» կետը','Delete point “'+m[1]+'”?'][i]],
  [/^Неточных адресов: (\d+) \(жёлтые маркеры\)\. Маршрут приведёт в центр района, уточните улицу и дом\.$/,(m,l,i)=>['Անճշգրիտ հասցեներ՝ '+m[1]+' (դեղին նշիչներ)։ Երթուղին կտանի թաղամասի կենտրոն, ճշտեք փողոցը և տունը։','Inexact addresses: '+m[1]+' (yellow markers). The route leads to the district center, so please specify the street and house number.'][i]],
  [/^Неверный 4-значный код для имени «([\s\S]*)»$/,(m,l,i)=>['Սխալ 4-նիշ կոդ «'+m[1]+'» անվան համար','Wrong 4-digit code for “'+m[1]+'”'][i]],
  [/^С возвращением, ([\s\S]*)!$/,(m,l,i)=>['Բարի վերադարձ, '+m[1]+'!','Welcome back, '+m[1]+'!'][i]],
  [/^Профиль создан: ([\s\S]*)$/,(m,l,i)=>['Պրոֆիլը ստեղծվեց՝ '+m[1],'Profile created: '+m[1]][i]],
  [/^Выйти из профиля «([\s\S]*)» на этом телефоне\? Данные останутся в облаке\.$/,(m,l,i)=>['Դուրս գա՞լ «'+m[1]+'» պրոֆիլից այս հեռախոսում։ Տվյալները կմնան ամպում։','Log out of profile “'+m[1]+'” on this phone? Data will stay in the cloud.'][i]],
  [/^⛔ В дневную смену \(до 21:00\) въезд грузовым в Покр Кентрон запрещён \(камеры\)\.\n\nАдреса в зоне: ([\s\S]*)\n\nПродолжить с этими адресами или удалить их\?$/,(m,l,i)=>['⛔ Ցերեկային հերթափոխին (մինչև 21:00) բեռնատարների մուտքը Փոքր Կենտրոն արգելված է (տեսախցիկներ)։\n\nԳոտում գտնվող հասցեները՝ '+m[1]+'\n\nՇարունակե՞լ այս հասցեներով, թե՞ ջնջել դրանք։','⛔ During the day shift (until 21:00), truck entry into Pokr Kentron is prohibited (cameras).\n\nAddresses in zone: '+m[1]+'\n\nContinue with these addresses or delete them?'][i]]
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
  if(raw.trim()==='Русский'||raw.trim()==='Հայերեն'||raw.trim()==='English')return null;
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
 const lab=()=>{if(btn){btn.title='Язык: '+LANGS[L];btn.setAttribute('aria-label','Язык: '+LANGS[L]);}};
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
 btn=document.createElement('button');btn.id='lgBtn';btn.type='button';btn.className='hdr-lg';btn.innerHTML='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';btn.onclick=openDlg;
 const hdr=document.querySelector('h2');
 if(hdr)hdr.appendChild(btn);else document.body.appendChild(btn);
 document.documentElement.lang=L;window.LANG_SR=SR[L];
 lab();
 if(L!=='ru')walk(document.body);
window.openLang = openDlg;
window.setAppLang = setLang;
})();
