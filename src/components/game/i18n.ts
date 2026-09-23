import type {
  DistrictId,
  IndicatorCode,
  MeasureId,
  Direction,
} from "@/lib/data";
export type Locale = "ru" | "kk" | "en";
export const LOCALES = { ru: "ru-KZ", kk: "kk-KZ", en: "en-KZ" };
type Text = readonly [string, string, string];
const index = { ru: 0, kk: 1, en: 2 };
export const select = (text: Text, locale: Locale) => text[index[locale]];
export const messages = {
  swapConcentration: [
    "Максимальная доля одного района во всех расходах: {before}% → {after}%.",
    "Бір ауданның жалпы шығындардағы ең үлкен үлесі: {before}% → {after}%.",
    "Largest single-district share of total spending: {before}% → {after}%.",
  ],
  moreConcentrated: [
    "Эта замена сильнее сосредоточит расходы в одном районе. Сравните его исходные потребности с потерями других районов перед применением.",
    "Бұл ауыстыру шығындарды бір ауданда көбірек шоғырландырады. Қолданар алдында оның бастапқы қажеттілігін басқа аудандардағы жоғалтулармен салыстырыңыз.",
    "This swap concentrates more spending in one district. Compare its initial needs with losses elsewhere before applying it.",
  ],
  mayor: ["АКИМ", "ӘКІМ", "MAYOR"],
  fiveHours: ["НА 5 ЧАСОВ", "5 САҒАТҚА", "FOR 5 HOURS"],
  demo: ["Загрузить пример", "Мысалды жүктеу", "Load example"],
  language: ["Язык игры", "Ойын тілі", "Game language"],
  budget: ["Бюджет города", "Қала бюджеті", "City budget"],
  remaining: ["Осталось", "Қалды", "Remaining"],
  of: ["из", "/", "of"],
  planned: ["В плане", "Жоспарда", "Planned"],
  decisions: ["Решения", "Шешімдер", "Decisions"],
  ready: ["Расчёт готов", "Есеп дайын", "Results ready"],
  planning: ["Планирование", "Жоспарлау", "Planning"],
  index: [
    "Индекс качества жизни",
    "Өмір сапасының индексі",
    "Quality of life index",
  ],
  indexHelp: [
    "Показатель учебной модели, не оценка реального города. Выше — лучше.",
    "Оқу моделінің көрсеткіші, нақты қаланың бағасы емес. Жоғары болғаны жақсы.",
    "A learning-model indicator, not a rating of the real city. Higher is better.",
  ],
  chooseFive: [
    "Выберите {count} проектов и рассчитайте последствия.",
    "{count} жобаны таңдап, нәтижесін есептеңіз.",
    "Choose {count} projects and calculate their impact.",
  ],
  change: ["Изменение", "Өзгеріс", "Change"],
  city: ["Акимат", "Әкімдік", "City hall"],
  citywide: [
    "Общегородские проекты",
    "Жалпықалалық жобалар",
    "Citywide projects",
  ],
  entireCity: ["Весь город", "Бүкіл қала", "Whole city"],
  travelling: ["В пути", "Жолда", "On the way"],
  world: ["Игровой город", "Ойын қаласы", "Game city"],
  legend: [
    "! критично · ✦ совместный эффект",
    "! сыни · ✦ бірлескен әсер",
    "! critical · ✦ combined effect",
  ],
  mission: ["Ваша миссия", "Сіздің міндетіңіз", "Your mission"],
  missionTitle: [
    "Улучшайте город для всех.",
    "Қаланы баршаға жақсартыңыз.",
    "Build a better city for everyone.",
  ],
  tutorial: [
    "Посетите район → изучите проблемы → выберите проект → рассчитайте результат.",
    "Ауданға барыңыз → мәселелерді зерттеңіз → жобаны таңдаңыз → нәтижені есептеңіз.",
    "Visit a district → explore its needs → choose a project → calculate the result.",
  ],
  controls: [
    "Стрелки и WASD: движение по экрану. Две клавиши — по диагонали. Клик — маршрут. E — открыть объект рядом.",
    "Бағыттауыштар мен WASD: экран бағытымен жүру. Екі перне — қиғаш жүру. Шерту — бағыт. E — жақын нысанды ашу.",
    "Arrows and WASD move in screen directions. Two keys move diagonally. Click to navigate. E opens a nearby place.",
  ],
  controlsShort: [
    "WASD / стрелки · клик для маршрута",
    "WASD / бағыттауыштар · бағытты шертіңіз",
    "WASD / arrows · click to navigate",
  ],
  understood: ["Понятно", "Түсінікті", "Got it"],
  map: ["Схематическая карта", "Сызбалық карта", "Schematic map"],
  visit: [
    "Изучить район {place}",
    "{place} ауданын зерттеу",
    "Explore {place}",
  ],
  enterCity: ["Войти в акимат", "Әкімдікке кіру", "Enter city hall"],
  startNotice: [
    "Посетите Нуру и узнайте, где нужна помощь.",
    "Нұраға барып, қай жерде көмек қажет екенін біліңіз.",
    "Visit Nura to discover where help is needed.",
  ],
  routeNotice: [
    "Маршрут: {place}. Можно перехватить управление стрелками.",
    "Бағыт: {place}. Бағыттауыштармен басқаруды қолға алуға болады.",
    "Heading to {place}. Use the arrows to take control.",
  ],
  arrivalNotice: [
    "Вы прибыли: {place}. Откройте объект рядом.",
    "Сіз келдіңіз: {place}. Жақын нысанды ашыңыз.",
    "Arrived at {place}. Open the nearby place.",
  ],
  addedNotice: [
    "Проект добавлен. Рассчитайте последствия обновлённого плана.",
    "Жоба қосылды. Жаңартылған жоспардың нәтижесін есептеңіз.",
    "Project added. Calculate the impact of your updated plan.",
  ],
  resetNotice: [
    "План очищен. Показано исходное состояние города.",
    "Жоспар тазартылды. Қаланың бастапқы күйі көрсетілген.",
    "Plan cleared. The city shows its initial state.",
  ],
  readyNotice: [
    "Расчёт готов. Изучите пользу и компромиссы по районам.",
    "Есеп дайын. Аудандардағы пайда мен ымыраларды зерттеңіз.",
    "Results ready. Explore benefits and trade-offs by district.",
  ],
  where: ["Куда отправимся?", "Қайда барамыз?", "Where shall we go?"],
  routeHelp: [
    "Выберите пункт — аким дойдёт сам.",
    "Нүктені таңдаңыз — әкім өзі барады.",
    "Choose a destination and the mayor will walk there.",
  ],
  plan: ["Ваш план", "Сіздің жоспарыңыз", "Your plan"],
  impact: ["Последствия", "Нәтижелер", "Impact"],
  emptyTitle: [
    "Пять решений. Один город.",
    "Бес шешім. Бір қала.",
    "Five decisions. One city.",
  ],
  emptyHelp: [
    "Начните с района, которому нужна помощь, или загрузите пример.",
    "Көмек қажет ауданнан бастаңыз немесе мысалды жүктеңіз.",
    "Start with a district that needs help, or load an example.",
  ],
  goNura: ["Отправиться в Нуру", "Нұраға бару", "Go to Nura"],
  remove: ["Отменить", "Бас тарту", "Remove"],
  clear: ["Очистить план", "Жоспарды тазарту", "Clear plan"],
  needsCalculation: [
    "После изменения плана нужен новый расчёт. На карте исходные показатели.",
    "Жоспар өзгерген соң қайта есептеу қажет. Картада бастапқы көрсеткіштер берілген.",
    "The plan changed. Calculate again; the map shows initial indicators.",
  ],
  calculate: ["Рассчитать последствия", "Нәтижені есептеу", "Calculate impact"],
  currentResult: [
    "Результат соответствует текущему плану",
    "Нәтиже ағымдағы жоспарға сәйкес",
    "Results match the current plan",
  ],
  pendingPlan: [
    "Выбрано {count} из {required}. Результат ещё не рассчитан.",
    "{required} жобаның {count} жобасы таңдалды. Нәтиже әлі есептелмеді.",
    "{count} of {required} selected. Not calculated yet.",
  ],
  disclaimer: [
    "Учебная симуляция на синтетических данных. Результаты не являются прогнозом развития города.",
    "Жасанды деректерге негізделген оқу симуляциясы. Нәтижелер қаланың даму болжамы емес.",
    "A learning simulation using synthetic data. Results are not forecasts for the real city.",
  ],
  beforeConfirm: [
    "Перед включением в план",
    "Жоспарға қоспас бұрын",
    "Before adding to the plan",
  ],
  arrived: ["Вы на месте", "Сіз келдіңіз", "You have arrived"],
  invest: [
    "Инвестируем в город?",
    "Қалаға қаржы бөлеміз бе?",
    "Invest in the city?",
  ],
  close: ["Закрыть", "Жабу", "Close"],
  back: ["Назад", "Артқа", "Back"],
  cost: ["Стоимость", "Құны", "Cost"],
  afterwards: [
    "Останется после выбора",
    "Таңдаудан кейін қалады",
    "Remaining after selection",
  ],
  include: ["Включить в план", "Жоспарға қосу", "Add to plan"],
  timing: [
    "Начинает работать с квартала {lag}. Результат оценивается через {horizon} кварталов.",
    "{lag}-тоқсаннан бастап іске қосылады. Нәтиже {horizon} тоқсаннан кейін бағаланады.",
    "Starts working in quarter {lag}. Results are evaluated over {horizon} quarters.",
  ],
  effects: ["Что может измениться", "Не өзгеруі мүмкін", "What may change"],
  helps: [
    "Помогает улучшить: {indicator}.",
    "Жақсартуға көмектеседі: {indicator}.",
    "Helps improve: {indicator}.",
  ],
  harms: [
    "Компромисс: может ухудшиться {indicator}.",
    "Ымыра: {indicator} нашарлауы мүмкін.",
    "Trade-off: {indicator} may worsen.",
  ],
  effectHelp: [
    "Это направление воздействия проекта. Точный итог с учётом сроков и сочетаний появится после расчёта.",
    "Бұл — жобаның ықпал ету бағыты. Мерзімдер мен үйлесімдерді ескерген нақты нәтиже есептеуден кейін шығады.",
    "These are the project's intended effects. Calculate to see the exact result, including timing and interactions.",
  ],
  details: [
    "Подробности расчёта",
    "Есептеу мәліметтері",
    "Calculation details",
  ],
  parameters: [
    "Внутренние коды и изменения до учёта правил модели",
    "Модель ережелеріне дейінгі ішкі кодтар мен өзгерістер",
    "Internal codes and effects before model rules",
  ],
  projects: ["Проекты", "Жобалар", "Projects"],
  allIndicators: ["Все показатели", "Барлық көрсеткіштер", "All indicators"],
  before: ["Было", "Бұрын", "Before"],
  after: ["Стало", "Кейін", "After"],
  initial: ["Исходное состояние", "Бастапқы күй", "Initial state"],
  afterCalculation: ["После расчёта", "Есептеуден кейін", "After calculation"],
  critical: ["Критический показатель", "Сыни көрсеткіш", "Critical indicator"],
  explore: ["Изучить проект", "Жобаны зерттеу", "Explore project"],
  cityHelp: [
    "Здесь выбирают проекты для всего города. Отдельный район указывать не нужно.",
    "Мұнда бүкіл қалаға арналған жобалар таңдалады. Жеке ауданды белгілеу қажет емес.",
    "Choose projects for the whole city here. No individual district is required.",
  ],
  coverage: ["Где: {place}", "Қайда: {place}", "Where: {place}"],
  synergy: ["Совместный эффект", "Бірлескен әсер", "Combined effect"],
  possibleSynergy: [
    "Вместе с проектом «{project}» возможен дополнительный эффект. Проверяется при расчёте.",
    "«{project}» жобасымен бірге қосымша әсер болуы мүмкін. Есептеу кезінде тексеріледі.",
    "Combining with “{project}” may add a benefit. Verified during calculation.",
  ],
  conflictTransport: [
    "По правилам игры нужно выбрать один подход: выделенные автобусные полосы или линию лёгкого рельсового транспорта.",
    "Ойын ережесі бойынша бір тәсілді таңдаңыз: арнайы автобус жолағы немесе жеңіл рельсті көлік желісі.",
    "The simulation requires one transport approach: dedicated bus lanes or light rail.",
  ],
  conflictLand: [
    "В одном районе парк и школа с детсадом претендуют на один участок. Выберите один проект или разные районы.",
    "Бір ауданда саябақ пен мектеп-балабақша бір жер теліміне жоспарланған. Бір жобаны немесе әртүрлі аудандарды таңдаңыз.",
    "In one district, the park and school project compete for the same site. Choose one or use different districts.",
  ],
  conflictHeat: [
    "В одном районе чистое топливо и модернизация сетей дублируют программу. Выберите один проект или разные районы.",
    "Бір ауданда таза отын мен желілерді жаңарту бағдарламалары қайталанады. Бір жобаны немесе әртүрлі аудандарды таңдаңыз.",
    "Clean heating and utility renewal overlap in the same district. Choose one or use different districts.",
  ],
  tooMany: [
    "Можно выбрать {count} проектов. Сначала отмените один.",
    "{count} жобаны таңдауға болады. Алдымен біреуінен бас тартыңыз.",
    "You can choose {count} projects. Remove one first.",
  ],
  duplicate: [
    "Этот проект уже в плане. Отмените его, чтобы выбрать другой район.",
    "Бұл жоба жоспарда бар. Басқа ауданға таңдау үшін оны алып тастаңыз.",
    "This project is already planned. Remove it before choosing another district.",
  ],
  districtRequired: [
    "Выберите район для проекта.",
    "Жобаға аудан таңдаңыз.",
    "Choose a district for this project.",
  ],
  insufficient: [
    "Не хватает {money}. Отмените или замените проект.",
    "{money} жетіспейді. Жобаны алып тастаңыз немесе ауыстырыңыз.",
    "You need {money} more. Remove or replace a project.",
  ],
  directionLimit: [
    "В направлении «{direction}» допустимо не более {count} проектов.",
    "«{direction}» бағыты бойынша ең көбі {count} жобаға рұқсат етіледі.",
    "At most {count} projects are allowed in {direction}.",
  ],
  countError: [
    "Нужно выбрать ровно {required} проектов. Сейчас: {count}.",
    "Дәл {required} жоба таңдау керек. Қазір: {count}.",
    "Choose exactly {required} projects. Currently: {count}.",
  ],
  invalid: [
    "План не прошёл проверку. Проверьте проекты и районы.",
    "Жоспар тексеруден өтпеді. Жобалар мен аудандарды тексеріңіз.",
    "The plan could not be validated. Check projects and districts.",
  ],
  serviceError: [
    "Сервис временно недоступен. Повторите запрос.",
    "Қызмет уақытша қолжетімсіз. Қайталап көріңіз.",
    "The service is temporarily unavailable. Try again.",
  ],
  timeout: [
    "Сервис не ответил вовремя. Повторите запрос.",
    "Қызмет уақытында жауап бермеді. Қайталап көріңіз.",
    "The service timed out. Try again.",
  ],
  stale: [
    "Проект для замены уже изменился. Повторите поиск.",
    "Ауыстырылатын жоба өзгерді. Іздеуді қайталаңыз.",
    "The project to replace has changed. Search again.",
  ],
  advisor: ["Советник акима", "Әкім кеңесшісі", "Mayor's advisor"],
  advisorHelp: [
    "Советник ищет рост индекса одной заменой. Это не оптимизация равенства расходов между районами.",
    "Кеңесші бір ауыстыру арқылы индексті арттыруды іздейді. Бұл аудандардың шығынын теңестіру емес.",
    "The advisor seeks a higher index with one swap. It does not optimise equal spending across districts.",
  ],
  searching: ["Ищем замену…", "Ауыстыру ізделуде…", "Finding a swap…"],
  retry: ["Повторить запрос", "Қайталау", "Try again"],
  improve: ["Найти улучшение", "Жақсарту табу", "Find an improvement"],
  apply: ["Применить замену", "Ауыстыруды қолдану", "Apply swap"],
  noImprovement: [
    "Среди допустимых замен одного решения улучшение не найдено. Это не доказательство глобального оптимума.",
    "Бір шешімді рұқсат етілген ауыстырулар арасында жақсарту табылмады. Бұл жалпы ең жақсы шешім табылды дегенді білдірмейді.",
    "No improvement was found among valid single-project swaps. This does not prove a global optimum.",
  ],
  explain: ["Объяснить результат", "Нәтижені түсіндіру", "Explain results"],
  explaining: [
    "Объяснение загружается…",
    "Түсіндірме жүктелуде…",
    "Loading explanation…",
  ],
  why: ["Почему так получилось?", "Неге бұлай болды?", "Why did this happen?"],
  offline: [
    "Объяснение по данным · без AI",
    "Деректер бойынша түсіндірме · ЖИ қолданылмаған",
    "Data-based explanation · no AI",
  ],
  aiReady: [
    "AI-объяснение готово",
    "ЖИ түсіндірмесі дайын",
    "AI explanation ready",
  ],
  offlineHelp: [
    "Готово объяснение по шаблону. Анализ тех же результатов приведён выше на выбранном языке, без генерации AI.",
    "Үлгілік түсіндірме дайын. Жоғарыда сол нәтижелер таңдалған тілде талданған, ЖИ генерациясы қолданылмаған.",
    "A template explanation is ready. The same results are analysed above in your selected language, without AI generation.",
  ],
  aiLanguage: [
    "AI-объяснение пока доступно только на русском. Анализ данных выше доступен на выбранном языке.",
    "ЖИ түсіндірмесі әзірге тек орыс тілінде. Жоғарыдағы деректер талдауы таңдалған тілде қолжетімді.",
    "AI explanations are currently available only in Russian. The data analysis above is available in your selected language.",
  ],
  aiOriginal: [
    "Ответ AI на русском",
    "ЖИ жауабы орыс тілінде",
    "AI response in Russian",
  ],
  aiMoneyHidden: [
    "Денежные фрагменты ответа скрыты, чтобы не смешивать разные шкалы. Суммы в выбранном масштабе показаны в таблице бюджета.",
    "Әртүрлі шкалаларды араластырмау үшін жауаптың ақша туралы бөліктері жасырылған. Таңдалған масштабтағы сомалар бюджет кестесінде көрсетілген.",
    "Financial passages are hidden to avoid mixing scales. Amounts in the selected scale are shown in the budget table.",
  ],
  analysis: [
    "Как ваш бюджет изменил город",
    "Бюджетіңіз қаланы қалай өзгертті",
    "How your budget changed the city",
  ],
  allocation: [
    "Куда направлены деньги",
    "Қаржы қайда бөлінді",
    "Where the money goes",
  ],
  directSpending: ["Районные проекты", "Аудандық жобалар", "District projects"],
  noDoubleCount: [
    "Общегородские расходы учтены отдельно один раз. Их влияние уже включено в показатели районов.",
    "Жалпықалалық шығындар бөлек, бір рет есептелген. Олардың әсері аудан көрсеткіштеріне енгізілген.",
    "Citywide spending is counted separately once. Its effects are already included in district indicators.",
  ],
  concentration: [
    "На район {place} направлено {percent}% всех расходов. Это описание распределения, а не оценка справедливости.",
    "Барлық шығынның {percent}%-ы {place} ауданына бөлінген. Бұл — бөліністің сипаттамасы, әділдік бағасы емес.",
    "{place} receives {percent}% of total spending. This describes concentration, not fairness.",
  ],
  priorityContext: [
    "До решений: индекс района {score}, критических показателей {count}. Учитывайте исходную потребность вместе с пользой для других районов.",
    "Шешімдерге дейін: аудан индексі {score}, сыни көрсеткіштер саны {count}. Бастапқы қажеттілікпен бірге басқа аудандардың пайдасын да ескеріңіз.",
    "Before decisions: district index {score}, critical indicators {count}. Consider initial need alongside benefits to other districts.",
  ],
  gains: ["Рост индекса", "Индекс өсті", "Index increased"],
  unchanged: [
    "Небольшое изменение индекса",
    "Индекс аз өзгерді",
    "Small index change",
  ],
  drops: ["Снижение индекса", "Индекс төмендеді", "Index decreased"],
  thresholdHelp: [
    "«Небольшое изменение»: индекс изменился менее чем на 1 балл по модулю. Изменения отдельных показателей доступны в паспорте района.",
    "«Аз өзгерді»: индекс өзгерісінің модулі 1 балдан аз. Жеке көрсеткіштерді аудан паспортынан көруге болады.",
    "“Small change” means an absolute index change below 1 point. Individual indicators are available in district details.",
  ],
  criticalLeft: [
    "Осталось критических показателей: {count}.",
    "Қалған сыни көрсеткіштер: {count}.",
    "Critical indicators remaining: {count}.",
  ],
  allImproved: [
    "Индекс вырос во всех пяти районах. Размер улучшения различается — сравните значения ниже.",
    "Индекс бес ауданның бәрінде өсті. Өсу мөлшері әртүрлі — төмендегі мәндерді салыстырыңыз.",
    "The index increased in all five districts. Gains differ; compare the values below.",
  ],
  uneven: [
    "Не во всех районах вырос индекс. Посмотрите, где сохраняются проблемы.",
    "Индекс барлық ауданда өскен жоқ. Мәселелер қай жерде сақталғанын қараңыз.",
    "Not every district's index improved. Review where problems remain.",
  ],
  tradeoffs: [
    "Побочные эффекты и компромиссы",
    "Жанама әсерлер мен ымыралар",
    "Side effects and trade-offs",
  ],
  noDrops: [
    "Движок не показал снижения отдельных показателей. Это не означает отсутствия любых рисков в реальном городе.",
    "Есептеуде жеке көрсеткіштер төмендеген жоқ. Бұл нақты қалада ешқандай тәуекел жоқ деген сөз емес.",
    "The engine found no individual indicator declines. This does not imply that real-world risks are absent.",
  ],
  swapImpact: [
    "Что изменится по сравнению с вашим планом",
    "Жоспарыңызбен салыстырғанда не өзгереді",
    "What changes compared with your plan",
  ],
  swapHelp: [
    "Сравните пользу по районам, а не только общий индекс. Расходы могут стать более или менее сосредоточенными.",
    "Тек жалпы индексті емес, аудандарға тигізетін пайданы салыстырыңыз. Шығындар көбірек не азырақ шоғырлануы мүмкін.",
    "Compare district benefits, not just the overall index. Spending may become more or less concentrated.",
  ],
  simulationMoney: [
    "Учебные суммы, не реальные сметы.",
    "Оқу сомалары, нақты смета емес.",
    "Learning amounts, not real-world estimates.",
  ],
  proposedScale: [
    "Предлагаемый масштаб: 1 внутренняя единица = {money}. Требует согласования.",
    "Ұсынылған масштаб: 1 ішкі бірлік = {money}. Келісу қажет.",
    "Proposed scale: 1 internal unit = {money}. Awaiting agreement.",
  ],
  approvedScale: [
    "Масштаб отображения: 1 внутренняя единица = {money}.",
    "Көрсету масштабы: 1 ішкі бірлік = {money}.",
    "Display scale: 1 internal unit = {money}.",
  ],
  canvasError: [
    "Для игры нужен браузер с Canvas 2D.",
    "Ойынға Canvas 2D қолдайтын браузер қажет.",
    "This game requires a browser with Canvas 2D.",
  ],
  move: ["Двигаться {arrow}", "{arrow} бағытына жүру", "Move {arrow}"],
  funded: ["Учтено в расчёте", "Есепке алынды", "Included in results"],
} satisfies Record<string, Text>;
export type MessageKey = keyof typeof messages;
export function translator(locale: Locale) {
  return (key: MessageKey, values: Record<string, string | number> = {}) =>
    select(messages[key], locale).replace(/\{(\w+)\}/g, (_, k) =>
      String(values[k] ?? `{${k}}`),
    );
}
export type Translate = ReturnType<typeof translator>;
export const districtNames: Record<DistrictId, Text> = {
  esil: ["Есиль", "Есіл", "Esil"],
  almaty: ["Алматы", "Алматы", "Almaty"],
  saryarka: ["Сарыарка", "Сарыарқа", "Saryarka"],
  baikonur: ["Байконур", "Байқоңыр", "Baikonur"],
  nura: ["Нура", "Нұра", "Nura"],
};
export const districtName = (id: DistrictId, locale: Locale) =>
  select(districtNames[id], locale);
export const directions: Record<Direction, Text> = {
  Транспорт: ["Транспорт", "Көлік", "Transport"],
  Экология: ["Экология", "Экология", "Environment"],
  Соцсфера: [
    "Социальная инфраструктура",
    "Әлеуметтік инфрақұрылым",
    "Social infrastructure",
  ],
  Безопасность: ["Безопасность", "Қауіпсіздік", "Safety"],
  Сервисы: ["Городские службы", "Қалалық қызметтер", "City services"],
};
export const measureNames: Record<MeasureId, Text> = {
  M1: [
    "Выделенная полоса для автобусов",
    "Автобустарға арналған арнайы жолақ",
    "Dedicated bus lane",
  ],
  M2: ["Умные светофоры", "Ақылды бағдаршамдар", "Smart traffic lights"],
  M3: [
    "Новая линия лёгкого рельсового транспорта",
    "Жеңіл рельсті көліктің жаңа желісі",
    "New light rail line",
  ],
  M4: [
    "Парк или сквер рядом с домом",
    "Үй маңындағы саябақ немесе гүлбақ",
    "Neighbourhood park",
  ],
  M5: [
    "Чистое топливо для частных домов",
    "Жеке үйлерге арналған таза отын",
    "Cleaner heating for private homes",
  ],
  M6: [
    "Озеленение и защита от ветра",
    "Көгалдандыру және желден қорғау",
    "City greening and windbreaks",
  ],
  M7: [
    "Школа и детский сад",
    "Мектеп пен балабақша",
    "School and kindergarten",
  ],
  M8: [
    "Поликлиника рядом с домом",
    "Үй маңындағы емхана",
    "Neighbourhood health centre",
  ],
  M9: [
    "Спортивные площадки во дворах",
    "Ауладағы спорт алаңдары",
    "Courtyard sports spaces",
  ],
  M10: [
    "Освещение улиц и камеры",
    "Көшелерді жарықтандыру және камералар",
    "Street lighting and cameras",
  ],
  M11: [
    "Безопасные переходы рядом со школами",
    "Мектеп маңындағы қауіпсіз өткелдер",
    "Safer crossings near schools",
  ],
  M12: [
    "Единая служба обращений жителей",
    "Тұрғындар өтініштерінің бірыңғай қызметі",
    "Unified resident request service",
  ],
  M13: [
    "Обновление сетей тепла и воды",
    "Жылу және су желілерін жаңарту",
    "Heating and water network renewal",
  ],
  M14: [
    "Аварийные бригады и раннее оповещение",
    "Апаттық бригадалар және ерте хабарлау",
    "Emergency crews and early warnings",
  ],
};
export const measureDescriptions: Record<MeasureId, Text> = {
  M1: [
    "Автобусам выделяют полосу, чтобы улучшить движение и доступность транспорта.",
    "Қозғалыс пен көлік қолжетімділігін жақсарту үшін автобустарға арнайы жолақ бөлінеді.",
    "A dedicated lane helps buses move and improves public transport access.",
  ],
  M2: [
    "Светофоры подстраивают под дорожную ситуацию.",
    "Бағдаршамдар жол жағдайына бейімделеді.",
    "Traffic signals adapt to road conditions.",
  ],
  M3: [
    "Создают или расширяют линию лёгкого рельсового транспорта.",
    "Жеңіл рельсті көлік желісі салынады немесе кеңейтіледі.",
    "Build or extend a light rail route.",
  ],
  M4: [
    "Создают зелёное общественное пространство для жителей района.",
    "Аудан тұрғындарына арналған жасыл қоғамдық кеңістік жасалады.",
    "Create green public space for district residents.",
  ],
  M5: [
    "Частные дома переводят на более чистое топливо.",
    "Жеке үйлер таза отынға көшіріледі.",
    "Switch private homes to cleaner fuel.",
  ],
  M6: [
    "Высаживают зелёные насаждения и создают ветрозащитные полосы.",
    "Жасыл желек отырғызылып, желден қорғайтын белдеулер жасалады.",
    "Plant greenery and create wind-protection belts.",
  ],
  M7: [
    "Модульное строительство помогает расширить доступ к школе и детсаду.",
    "Модульдік құрылыс мектеп пен балабақшаға қолжетімділікті арттырады.",
    "Modular construction expands access to school and kindergarten.",
  ],
  M8: [
    "Развивают первичную медицинскую помощь в районе.",
    "Ауданда алғашқы медициналық көмек дамытылады.",
    "Expand primary healthcare in the district.",
  ],
  M9: [
    "Оборудуют места для занятий спортом во дворах.",
    "Аулаларда спортпен айналысатын орындар жабдықталады.",
    "Equip courtyards with spaces for exercise.",
  ],
  M10: [
    "Расширяют уличное освещение и сеть камер безопасности.",
    "Көше жарығы мен қауіпсіздік камераларының желісі кеңейтіледі.",
    "Expand street lighting and the safety camera network.",
  ],
  M11: [
    "Улучшают переходы и безопасность школьных зон; возможен компромисс в скорости дорожного движения.",
    "Өткелдер мен мектеп аймақтарының қауіпсіздігі жақсарады; жол қозғалысына кері әсер болуы мүмкін.",
    "Improve crossings and school-zone safety, with a possible trade-off in traffic flow.",
  ],
  M12: [
    "Обращения жителей обрабатываются через единую цифровую платформу.",
    "Тұрғындардың өтініштері бірыңғай цифрлық платформа арқылы өңделеді.",
    "Handle residents' requests through one digital platform.",
  ],
  M13: [
    "Модернизируют системы теплоснабжения и водоснабжения.",
    "Жылу және сумен жабдықтау жүйелері жаңартылады.",
    "Modernise heating and water supply systems.",
  ],
  M14: [
    "Усиливают аварийное реагирование и раннее предупреждение о проблемах ЖКХ.",
    "Коммуналдық апаттарға әрекет ету мен ерте ескерту күшейтіледі.",
    "Strengthen utility emergency response and early warnings.",
  ],
};
export const indicatorNames: Record<IndicatorCode, Text> = {
  T1: [
    "Свободное движение на дорогах",
    "Жолдардағы еркін қозғалыс",
    "Traffic flow",
  ],
  T2: [
    "Доступность общественного транспорта",
    "Қоғамдық көліктің қолжетімділігі",
    "Public transport access",
  ],
  E1: ["Зелёные пространства", "Жасыл кеңістіктер", "Green spaces"],
  E2: ["Качество воздуха", "Ауа сапасы", "Air quality"],
  S1: [
    "Доступность школ и детсадов",
    "Мектептер мен балабақшалардың қолжетімділігі",
    "School and kindergarten access",
  ],
  S2: [
    "Доступность поликлиник",
    "Емханалардың қолжетімділігі",
    "Primary healthcare access",
  ],
  B1: ["Безопасность улиц", "Көше қауіпсіздігі", "Street safety"],
  B2: [
    "Безопасность дорожного движения",
    "Жол қозғалысының қауіпсіздігі",
    "Road safety",
  ],
  C1: [
    "Надёжность коммунальных сетей",
    "Коммуналдық желілердің сенімділігі",
    "Utility reliability",
  ],
  C2: [
    "Скорость решения обращений",
    "Өтініштерді шешу жылдамдығы",
    "Resident request resolution",
  ],
};
export const indicatorMeanings: Record<IndicatorCode, Text> = {
  T1: [
    "100 — нет пробок в час пик; 0 — движение стоит.",
    "100 — қарбалас уақытта кептеліс жоқ; 0 — қозғалыс тоқтаған.",
    "100: no rush-hour congestion; 0: traffic is at a standstill.",
  ],
  T2: [
    "100 — у всех жителей остановка в пределах 500 м, интервал не более 10 минут.",
    "100 — барлық тұрғынға 500 м ішінде аялдама бар, аралық 10 минуттан аспайды.",
    "100: every resident has a stop within 500 m, with services at least every 10 minutes.",
  ],
  E1: [
    "100 — не менее 20 м² зелени на жителя.",
    "100 — әр тұрғынға кемінде 20 м² жасыл желек.",
    "100: at least 20 m² of greenery per resident.",
  ],
  E2: [
    "100 — зимний индекс качества воздуха AQI не выше 50; 0 — постоянный смог.",
    "100 — қыста ауа сапасының AQI индексі 50-ден аспайды; 0 — тұрақты түтін.",
    "100: winter air-quality index AQI at or below 50; 0: persistent smog.",
  ],
  S1: [
    "100 — нормативная потребность покрыта полностью, без второй смены.",
    "100 — нормативтік қажеттілік толық қамтылған, екінші ауысым жоқ.",
    "100: standard capacity needs fully met, without a second school shift.",
  ],
  S2: [
    "100 — норматив первичной медицинской помощи на жителя выполнен.",
    "100 — әр тұрғынға алғашқы медициналық көмек нормативі орындалған.",
    "100: primary healthcare provision meets the per-resident standard.",
  ],
  B1: [
    "100 — улицы освещены и охвачены камерами, минимум происшествий.",
    "100 — көшелер жарықтандырылған, камералармен қамтылған, оқиғалар аз.",
    "100: lighting and camera coverage everywhere, with minimal incidents.",
  ],
  B2: [
    "100 — минимум ДТП с пострадавшими.",
    "100 — зардап шеккендер бар жол апаттары барынша аз.",
    "100: minimal road accidents involving injuries.",
  ],
  C1: [
    "100 — за год нет аварий отопления и водоснабжения.",
    "100 — жыл ішінде жылу мен су жүйесінде апат жоқ.",
    "100: no heating or water supply failures during the year.",
  ],
  C2: [
    "100 — все обращения закрыты в срок.",
    "100 — барлық өтініш уақытында шешілген.",
    "100: all requests resolved on time.",
  ],
};
