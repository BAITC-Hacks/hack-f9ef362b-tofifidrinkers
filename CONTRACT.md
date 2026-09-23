# Контракт между частями приложения

Единый источник правды по данным и расчёту — `src/lib/data.ts` и `src/lib/engine.ts`.
Никто не копирует формулу или датасет к себе — все части импортируют эти файлы.

## Владение файлами

| Файл / зона | Владелец | Статус |
|---|---|---|
| `src/lib/data.ts` — районы, показатели, мероприятия, синергии, несовместимости | Ильяс (перенесено из датасета, сверено с контрольными числами) | Готово. Даниял: сверь построчно с «Датасет районов.docx», если найдёшь расхождение — правь только этот файл и сообщи. |
| `src/lib/engine.ts` — `validateScenario`, `calculateScenario` | Ильяс | Готово и покрыто тестами. Не менять без согласования. |
| `src/lib/improve.ts` — `findBestSingleSwap` | **Даниял** | Заглушка (возвращает `null`). Реализовать перебор замен, используя только `calculateScenario`/`validateScenario`. |
| `src/lib/explain.ts` — вызов LLM + офлайн-шаблон | Ильяс | Готово, работает на OpenAI (`OPENAI_API_KEY` в `.env.local`, на сервере). |
| `src/app/api/*` — серверные роуты | Ильяс | Готово: `/api/scenario`, `/api/explain`, `/api/improve`. |
| `src/components/Simulator.tsx` — интерфейс | Ильяс сделал рабочий MVP интерфейса (3 экрана слиты в один поток: район → выбор → результат) | **Дилара: дорабатывай/меняй свободно** — стили, тексты объяснений, README, структуру страниц. Только не считай Score внутри компонентов — бери готовые данные из `calculateScenario`. |
| `README.md` | Дилара | Обновить под финальный запуск и демо. |

## Типы (см. `src/lib/data.ts` и `src/lib/engine.ts`)

```ts
type DistrictId = "esil" | "almaty" | "saryarka" | "baikonur" | "nura";
type MeasureId = "M1" ... "M14";

interface Decision {
  measureId: MeasureId;
  districtId?: DistrictId | null; // обязателен (не null/undefined) для scope="Район"; для scope="Город" — не указывать или null
}
```

Пустой массив решений — **не** допустимый пользовательский сценарий (`DECISION_COUNT`), даже несмотря на то что внутренний `computeBaseline()` использует пустой набор как точку отсчёта в обход валидатора.

## Функции

```ts
// src/lib/engine.ts
type ViolationCode =
  | "DECISION_COUNT" | "DUPLICATE_MEASURE" | "UNKNOWN_MEASURE" | "UNKNOWN_DISTRICT"
  | "DISTRICT_REQUIRED" | "CITY_DISTRICT_FORBIDDEN" | "BUDGET_EXCEEDED"
  | "DIRECTION_LIMIT" | "INCOMPATIBLE_SCENARIO" | "INCOMPATIBLE_DISTRICT";

function validateScenario(decisions: Decision[]): { valid: boolean; reason?: string; code?: ViolationCode };

function calculateScenario(decisions: Decision[]):
  | { valid: false; reason?: string; code?: ViolationCode }
  | {
      valid: true;
      cost: number;
      budgetLeft: number;
      districts: DistrictOutcome[];   // по каждому из 5 районов: baseScore, finalScore, indicators[]
      dAvg: number;
      worstDistrict: { id: DistrictId; name: string; score: number };   // первый из районов-худших (совместимость)
      worstDistrictIds: DistrictId[]; // все районы, делящие минимальный finalScore
      nCrit: number;
      criticalPairs: { district: string; indicator: IndicatorCode }[];
      score: number;                  // итоговый Astana Quality of Life Score
      directionsUsed: Record<string, number>;
      synergiesApplied: { id: string; pair: [MeasureId, MeasureId]; district: string; indicator: IndicatorCode; amount: number }[];
    };
```

`code` — коды нарушений, предложенные Даниялом в `fixtures/daniyal/DATA_CONTRACT.md`, приняты как общий формат.
`calculateScenario` сам вызывает `validateScenario` — невалидный набор возвращает `{valid:false, reason, code}` без Score (как требуют правила).

## API-роуты

- `POST /api/scenario` `{decisions}` → тот же результат, что и `calculateScenario` (для случаев, когда расчёт нужен не в браузере).
- `POST /api/explain` `{decisions}` → `{explanation: string, source: "openai" | "anthropic" | "offline-template"}`. Пересчитывает сценарий на сервере (не доверяет цифрам из браузера), передаёт LLM только уже посчитанные числа. При ошибке LLM — детерминированный офлайн-текст на тех же цифрах, а не выдумка.
- `POST /api/improve` `{decisions}` → `{currentScore: number, suggestion: SwapSuggestion | null}`. Пока `suggestion` всегда `null` (заглушка `findBestSingleSwap`).

## Для Данияла — `findBestSingleSwap`

Файл `src/lib/improve.ts` уже содержит сигнатуру и псевдокод. Кратко:

1. Перебрать 5 текущих решений; для каждого — перебрать все мероприятия, которых нет в оставшихся 4, включая варианты района для районных мер.
2. Для каждой замены собрать новый `Decision[]`, прогнать через `calculateScenario`.
3. Пропускать невалидные (`valid: false`).
4. Вернуть валидную замену с максимальным `score`, если он выше текущего; иначе `null`.
5. Не копировать формулу — только импортировать `calculateScenario`.

Интерфейс `SwapSuggestion` уже объявлен в файле, UI и API-роут (`/api/improve`) уже подключены и ждут реализацию — после того как функция начнёт возвращать реальные подсказки, кнопка «Улучшить одной заменой» в интерфейсе заработает без дополнительных изменений.

## Для Дилары — интерфейс

`src/components/Simulator.tsx` — рабочий MVP уже есть (каталог мер по направлениям, счётчик бюджета/решений, причины невалидности, результат до/после по районам, AI-объяснение, кнопка улучшения). Свободно меняй вёрстку/тексты/структуру — контракт только один: не считать Score самому, использовать `calculateScenario`.

## Данные и контрольные сценарии Данияла

`fixtures/daniyal/` — независимый пакет Данияла (city-data.json, DATA_CONTRACT.md, scenario-fixtures.json:
23 сценария + база + 6 unit-проверок, IMPROVEMENT_SPEC.md, verify_fixtures.py). Числа и правила в
`data.ts`/`engine.ts` сверены с ним автоматически, см. ниже.

## Проверка корректности

```bash
npm run verify           # контрольные числа + чек-лист граничных случаев (свой набор)
npm run verify:daniyal   # 100% сверка со всеми 23 сценариями + базой + 6 unit-проверками Данияла,
                          # допуск 1e-8, полностью независимо перепроверено на Python: fixtures/daniyal/verify_fixtures.py
```

Оба скрипта зелёные. `verify:daniyal` — самая сильная гарантия корректности: два независимо
написанных набора проверок (мой TS-движок и Python-скрипт Данияла) сходятся на всех значениях,
включая полные `finalIndicators` по всем 5 районам × 10 показателям для каждого сценария.
