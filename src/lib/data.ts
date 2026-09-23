// Датасет "Аким на 5 часов": районы, показатели, мероприятия, синергии, несовместимости.
// Источник: "Датасет районов.docx", предоставленный организатором (Astana Innovations).

export type IndicatorCode = "T1" | "T2" | "E1" | "E2" | "S1" | "S2" | "B1" | "B2" | "C1" | "C2";
export type Direction = "Транспорт" | "Экология" | "Соцсфера" | "Безопасность" | "Сервисы";
export type MeasureScope = "Район" | "Город";

export interface Indicator {
  code: IndicatorCode;
  direction: Direction;
  name: string;
  meaning: string;
  weight: number;
}

export const INDICATORS: Indicator[] = [
  { code: "T1", direction: "Транспорт", name: "Разгрузка дорог", meaning: "100 = нет пробок в час пик, 0 = стоит всё", weight: 0.10 },
  { code: "T2", direction: "Транспорт", name: "Доступность общественного транспорта", meaning: "100 = все жители в 500 м от остановки с интервалом ≤10 мин", weight: 0.10 },
  { code: "E1", direction: "Экология", name: "Озеленение", meaning: "100 = ≥20 м² зелени на жителя", weight: 0.09 },
  { code: "E2", direction: "Экология", name: "Качество воздуха", meaning: "100 = зимой AQI ≤50, 0 = хронический смог", weight: 0.11 },
  { code: "S1", direction: "Соцсфера", name: "Школы и детсады", meaning: "100 = 100% нормативной потребности, без 2-й смены", weight: 0.11 },
  { code: "S2", direction: "Соцсфера", name: "Поликлиники и первичная медпомощь", meaning: "100 = норматив на жителя выполнен полностью", weight: 0.11 },
  { code: "B1", direction: "Безопасность", name: "Безопасность улиц", meaning: "100 = освещение и камеры везде, минимум происшествий", weight: 0.09 },
  { code: "B2", direction: "Безопасность", name: "Безопасность дорожного движения", meaning: "100 = минимум ДТП с пострадавшими", weight: 0.09 },
  { code: "C1", direction: "Сервисы", name: "Надёжность ЖКХ", meaning: "100 = нет аварий отопления/воды за год", weight: 0.10 },
  { code: "C2", direction: "Сервисы", name: "Скорость решения обращений жителей", meaning: "100 = все обращения закрыты в срок", weight: 0.10 },
];

export const INDICATOR_CODES: IndicatorCode[] = INDICATORS.map((i) => i.code);

export type DistrictId = "esil" | "almaty" | "saryarka" | "baikonur" | "nura";

export interface District {
  id: DistrictId;
  name: string;
  populationShare: number;
  profile: string;
  base: Record<IndicatorCode, number>;
}

export const DISTRICTS: District[] = [
  {
    id: "esil",
    name: "Есиль",
    populationShare: 0.27,
    profile: "богатый, но с пробками на мостах и переполненными школами.",
    base: { T1: 45, T2: 62, E1: 68, E2: 72, S1: 48, S2: 55, B1: 78, B2: 60, C1: 75, C2: 70 },
  },
  {
    id: "almaty",
    name: "Алматы",
    populationShare: 0.24,
    profile: "старый ЖКХ и пробки.",
    base: { T1: 40, T2: 75, E1: 50, E2: 55, S1: 60, S2: 65, B1: 62, B2: 52, C1: 50, C2: 60 },
  },
  {
    id: "saryarka",
    name: "Сарыарка",
    populationShare: 0.20,
    profile: "смог от частного сектора, слабое озеленение.",
    base: { T1: 50, T2: 70, E1: 42, E2: 40, S1: 62, S2: 68, B1: 58, B2: 55, C1: 45, C2: 55 },
  },
  {
    id: "baikonur",
    name: "Байконур",
    populationShare: 0.13,
    profile: "середняк без ярких перекосов.",
    base: { T1: 52, T2: 68, E1: 55, E2: 50, S1: 58, S2: 60, B1: 52, B2: 58, C1: 55, C2: 58 },
  },
  {
    id: "nura",
    name: "Нура",
    populationShare: 0.16,
    profile: "главный «аутсайдер» по соцсфере и транспорту.",
    base: { T1: 55, T2: 40, E1: 45, E2: 65, S1: 38, S2: 35, B1: 55, B2: 50, C1: 60, C2: 50 },
  },
];

export type MeasureId =
  | "M1" | "M2" | "M3" | "M4" | "M5" | "M6" | "M7" | "M8" | "M9" | "M10" | "M11" | "M12" | "M13" | "M14";

export interface MeasureEffect {
  indicator: IndicatorCode;
  amount: number;
}

export interface Measure {
  id: MeasureId;
  direction: Direction;
  name: string;
  scope: MeasureScope;
  cost: number;
  lag: number; // квартал, с которого мера начинает работать
  effects: MeasureEffect[];
}

export const HORIZON_QUARTERS = 8;

export const MEASURES: Measure[] = [
  { id: "M1", direction: "Транспорт", name: "Выделенные полосы для автобусов", scope: "Район", cost: 18, lag: 2, effects: [{ indicator: "T1", amount: 6 }, { indicator: "T2", amount: 9 }] },
  { id: "M2", direction: "Транспорт", name: "Умные светофоры (адаптивное управление)", scope: "Город", cost: 22, lag: 2, effects: [{ indicator: "T1", amount: 4 }, { indicator: "B2", amount: 3 }] },
  { id: "M3", direction: "Транспорт", name: "Линия ЛРТ / расширение", scope: "Район", cost: 30, lag: 4, effects: [{ indicator: "T1", amount: 16 }, { indicator: "T2", amount: 20 }, { indicator: "E2", amount: 4 }] },
  { id: "M4", direction: "Экология", name: "Парк / сквер", scope: "Район", cost: 15, lag: 2, effects: [{ indicator: "E1", amount: 12 }, { indicator: "E2", amount: 3 }, { indicator: "B1", amount: 2 }] },
  { id: "M5", direction: "Экология", name: "Перевод частного сектора на чистое топливо", scope: "Район", cost: 25, lag: 3, effects: [{ indicator: "E2", amount: 14 }, { indicator: "C1", amount: 4 }] },
  { id: "M6", direction: "Экология", name: "Городская программа озеленения и ветрозащитных полос", scope: "Город", cost: 20, lag: 4, effects: [{ indicator: "E1", amount: 5 }, { indicator: "E2", amount: 3 }] },
  { id: "M7", direction: "Соцсфера", name: "Школа + детсад (модульное строительство)", scope: "Район", cost: 24, lag: 3, effects: [{ indicator: "S1", amount: 16 }] },
  { id: "M8", direction: "Соцсфера", name: "Центр семейного здоровья / поликлиника", scope: "Район", cost: 20, lag: 3, effects: [{ indicator: "S2", amount: 14 }] },
  { id: "M9", direction: "Соцсфера", name: "Дворовые спорт-хабы", scope: "Район", cost: 10, lag: 1, effects: [{ indicator: "S1", amount: 3 }, { indicator: "S2", amount: 3 }, { indicator: "B1", amount: 3 }] },
  { id: "M10", direction: "Безопасность", name: "Освещение и камеры (расширение Safe City)", scope: "Район", cost: 12, lag: 1, effects: [{ indicator: "B1", amount: 12 }, { indicator: "B2", amount: 2 }] },
  { id: "M11", direction: "Безопасность", name: "Безопасные переходы и школьные зоны", scope: "Район", cost: 10, lag: 1, effects: [{ indicator: "B2", amount: 12 }, { indicator: "T1", amount: -2 }] },
  { id: "M12", direction: "Сервисы", name: "Единая цифровая платформа обращений", scope: "Город", cost: 14, lag: 1, effects: [{ indicator: "C2", amount: 5 }] },
  { id: "M13", direction: "Сервисы", name: "Модернизация тепло- и водосетей", scope: "Район", cost: 28, lag: 4, effects: [{ indicator: "C1", amount: 18 }, { indicator: "E2", amount: 2 }] },
  { id: "M14", direction: "Сервисы", name: "Аварийные бригады ЖКХ + раннее оповещение", scope: "Город", cost: 16, lag: 1, effects: [{ indicator: "C1", amount: 5 }, { indicator: "C2", amount: 2 }] },
];

export const MEASURE_MAP: Record<MeasureId, Measure> = Object.fromEntries(
  MEASURES.map((m) => [m.id, m])
) as Record<MeasureId, Measure>;

export interface Synergy {
  pair: [MeasureId, MeasureId];
  bonusIndicator: IndicatorCode;
  bonusAmount: number;
  // район, в котором применяется бонус, определяется районом первой (anchor) меры пары
  anchor: MeasureId;
}

export const SYNERGIES: Synergy[] = [
  { pair: ["M1", "M2"], bonusIndicator: "T1", bonusAmount: 2, anchor: "M1" },
  { pair: ["M10", "M12"], bonusIndicator: "B1", bonusAmount: 2, anchor: "M10" },
  { pair: ["M5", "M6"], bonusIndicator: "E2", bonusAmount: 2, anchor: "M5" },
];

export interface Incompatibility {
  pair: [MeasureId, MeasureId];
  sameDistrictOnly: boolean; // true = запрещено только если выбраны в одном районе; false = запрещено в любом случае
  reason: string;
}

export const INCOMPATIBILITIES: Incompatibility[] = [
  { pair: ["M1", "M3"], sameDistrictOnly: false, reason: "M1 и M3: либо BRT, либо ЛРТ, в любом районе." },
  { pair: ["M4", "M7"], sameDistrictOnly: true, reason: "M4 и M7: нельзя в одном районе, конфликт за участок." },
  { pair: ["M5", "M13"], sameDistrictOnly: true, reason: "M5 и M13: нельзя в одном районе, дублирование программы." },
];

export const BUDGET = 100;
export const DECISIONS_REQUIRED = 5;
export const MAX_PER_DIRECTION = 2;
export const CRITICAL_THRESHOLD = 40;
export const SCORE_WEIGHTS = { avg: 0.7, worst: 0.3, critPenalty: 1.0 };
