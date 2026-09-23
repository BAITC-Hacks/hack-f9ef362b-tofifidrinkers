import { select, type Locale } from "./i18n";
const text = {
  open: [
    "Получить оценку советника",
    "Кеңесшінің бағасын алу",
    "Get advisor assessment",
  ],
  title: [
    "Как вы справились с управлением городом",
    "Қаланы басқару нәтижелеріңіз",
    "How your city plan performed",
  ],
  facts: ["Результаты расчёта", "Есептеу нәтижелері", "Calculated results"],
  interpretation: [
    "Интерпретация AI · проверьте по фактам ниже",
    "AI түсіндірмесі · төмендегі деректермен салыстырыңыз",
    "AI interpretation · check against the facts below",
  ],
  quality: ["Качество жизни", "Өмір сапасы", "Quality of life"],
  priority: [
    "Помощь районам с исходными проблемами",
    "Бастапқы мәселелері бар аудандарға көмек",
    "Support for districts with initial needs",
  ],
  reach: [
    "Распределение пользы",
    "Пайданың таралуы",
    "Distribution of benefits",
  ],
  budget: ["Использование бюджета", "Бюджетті пайдалану", "Budget use"],
  strengths: ["Что получилось", "Сәтті шешімдер", "What worked"],
  tradeoffs: [
    "Компромиссы и упущенные возможности",
    "Ымыралар мен пайдаланылмаған мүмкіндіктер",
    "Tradeoffs and missed opportunities",
  ],
  nextStep: [
    "Что улучшить следующим шагом",
    "Келесі қадамда нені жақсартуға болады",
    "What to improve next",
  ],
  offline: [
    "Объяснение по данным, без AI",
    "AI қолданбай, деректер бойынша түсіндірме",
    "Data-based explanation, without AI",
  ],
  unavailable: [
    "AI недоступен или вернул неподходящий ответ. Расчёт доступен; запрос можно повторить.",
    "AI қолжетімсіз немесе жауап пішімі сәйкес емес. Есеп дайын; сұрауды қайталауға болады.",
    "AI is unavailable or returned an unsuitable response. Calculated results remain available; you can retry.",
  ],
  noKey: [
    "AI не настроен на сервере. Ниже — факты расчёта без AI.",
    "Серверде AI бапталмаған. Төменде AI қолданбай есептелген деректер көрсетілген.",
    "AI is not configured on the server. Calculated facts are shown below without AI.",
  ],
  fairness: [
    "Справедливость — не равные расходы. Сравните исходные проблемы, полученную пользу и оставшиеся трудности каждого района. Общегородские расходы учтены один раз.",
    "Әділдік шығындарды тең бөлу ғана емес. Әр ауданның бастапқы мәселелерін, алған пайдасын және қалған қиындықтарын салыстырыңыз. Жалпы қалалық шығын бір рет есептеледі.",
    "Fairness does not mean equal spending. Compare initial needs, actual benefits and remaining problems in each district. Citywide costs are counted once.",
  ],
  initialCritical: [
    "Критических показателей до → после",
    "Сындарлы көрсеткіштер: дейін → кейін",
    "Critical indicators before → after",
  ],
  changed: [
    "Изменения показателей",
    "Көрсеткіштердің өзгеруі",
    "Indicator changes",
  ],
  checked: [
    "Проверенная замена",
    "Тексерілген ауыстыру",
    "Verified replacement",
  ],
  scope: [
    "Советник ищет рост общего индекса одной заменой. Он не оптимизирует справедливость и не доказывает глобальный оптимум.",
    "Кеңесші бір шешімді ауыстырып, жалпы индексті арттыруды іздейді. Ол әділдікті оңтайландырмайды және жаһандық оңтайлылықты дәлелдемейді.",
    "The advisor seeks an overall index gain through one replacement. It does not optimize fairness or prove a global optimum.",
  ],
  compare: [
    "Текущий план → предложенный",
    "Қазіргі жоспар → ұсынылған жоспар",
    "Current plan → proposed plan",
  ],
  growth: [
    "Общий индекс вырос. Посмотрите, кому помог план и где остались проблемы.",
    "Жалпы индекс өсті. Жоспар кімге көмектескенін және қандай мәселелер қалғанын қараңыз.",
    "The overall index rose. Review who benefited and where problems remain.",
  ],
  noGrowth: [
    "Общий индекс не вырос. Сравните изменения районов и пересмотрите выбор проектов.",
    "Жалпы индекс өскен жоқ. Аудандардағы өзгерістерді салыстырып, жобаларды қайта қараңыз.",
    "The overall index did not rise. Compare district changes and reconsider your projects.",
  ],
  needsAttention: [
    "Наименьший исходный индекс",
    "Ең төмен бастапқы индекс",
    "Lowest initial index",
  ],
  spread: [
    "Разрыв между лучшим и худшим районами до → после",
    "Ең жоғары және ең төмен аудан арасындағы айырма: дейін → кейін",
    "Gap between highest and lowest district scores before → after",
  ],
} satisfies Record<string, readonly [string, string, string]>;
export const reportText = (locale: Locale) => (key: keyof typeof text) =>
  select(text[key], locale);
