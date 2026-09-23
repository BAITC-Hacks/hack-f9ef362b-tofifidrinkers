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
  districtId?: DistrictId; // обязателен для мер scope="Район", не указывается для scope="Город"
}
```

## Функции

```ts
// src/lib/engine.ts
function validateScenario(decisions: Decision[]): { valid: boolean; reason?: string };

function calculateScenario(decisions: Decision[]):
  | { valid: false; reason?: string }
  | {
      valid: true;
      cost: number;
      budgetLeft: number;
      districts: DistrictOutcome[];   // по каждому из 5 районов: baseScore, finalScore, indicators[]
      dAvg: number;
      worstDistrict: { id: DistrictId; name: string; score: number };
      nCrit: number;
      criticalPairs: { district: string; indicator: IndicatorCode }[];
      score: number;                  // итоговый Astana Quality of Life Score
      directionsUsed: Record<string, number>;
      synergiesApplied: { pair: [MeasureId, MeasureId]; district: string; indicator: IndicatorCode; amount: number }[];
    };
```

`calculateScenario` сам вызывает `validateScenario` — невалидный набор возвращает `{valid:false, reason}` без Score (как требуют правила).

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

## Проверка корректности

```bash
npm run verify
```

29 проверок: контрольные числа из датасета (база 52.56, пример 56.54, синергия, стоимости) + весь чек-лист граничных случаев (бюджет, повторы, направления, несовместимости, порядок решений). Обновляется вместе с `engine.ts`/`data.ts`.
