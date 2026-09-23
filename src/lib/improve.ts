// Зона ответственности: Даниял (см. fixtures/daniyal/IMPROVEMENT_SPEC.md).
// Не дублировать формулу и правила — использовать только calculateScenario/validateScenario из "./engine".
// Не переносить fixtures/daniyal/verify_fixtures.py в backend — это независимая сверка, не реализация.
import { DISTRICTS, MEASURES } from "./data";
import { Decision, ScenarioResult, calculateScenario } from "./engine";

export interface SwapSuggestion {
  removed: Decision;
  added: Decision;
  scenario: ScenarioResult;
  scoreDelta: number;
  costDelta: number;
}

/**
 * Перебирает допустимые замены ОДНОГО из пяти выбранных решений (включая перенос той же меры
 * в другой район) и возвращает лучшую валидную замену по итоговому Score, либо null, если среди
 * проверенных замен строгого улучшения нет. current должен быть уже валидным сценарием (5 решений,
 * calculateScenario(current).valid === true) — вызывающая сторона (API-роут) это гарантирует.
 *
 * Алгоритм (см. IMPROVEMENT_SPEC.md):
 * 1. originalScore = calculateScenario(current).score (current не пересчитывать/не мутировать).
 * 2. Для каждой позиции i из 5: временно убрать decisions[i].
 * 3. Для каждого мероприятия m из MEASURES, не входящего в оставшиеся 4 (включая саму decisions[i].measureId —
 *    разрешена смена района той же меры): если m.scope === "Район" — вариант на каждый из 5 DISTRICTS;
 *    если "Город" — один вариант без districtId. Полностью неизменный вариант (то же measureId и district) пропустить.
 * 4. candidate = [...current без i, вариант]; calculateScenario(candidate); отбросить invalid.
 * 5. Оставить только строго положительное улучшение: candidate.score - originalScore > EPS (1e-8),
 *    не сравнивать уже округлённые до 2 знаков числа.
 * 6. При нескольких кандидатах с (почти) равным лучшим score — меньшая cost; при равной cost —
 *    лексикографически меньший канонический ключ сценария (решения, отсортированные по номеру
 *    после "M", district представлен пустой строкой для городских мер).
 * 7. Вернуть SwapSuggestion { removed: исходное решение i, added: вариант, scenario: calculateScenario(candidate),
 *    scoreDelta: scenario.score - originalScore, costDelta: scenario.cost - current.cost }, либо null.
 *
 * До 54 вариантов меры (10 районных × 5 районов + 4 городских) × 5 позиций ≈ 270 кандидатов до фильтрации.
 */
export function findBestSingleSwap(current: Decision[]): SwapSuggestion | null {
  void DISTRICTS;
  void MEASURES;
  void current;
  void calculateScenario;
  return null;
}
