// Зона ответственности: Даниял.
// Не дублировать формулу и правила — использовать только calculateScenario/validateScenario из "./engine".
import { DISTRICTS, MEASURES } from "./data";
import { Decision, ScenarioResult, calculateScenario } from "./engine";

export interface SwapSuggestion {
  removed: Decision;
  added: Decision;
  scenario: ScenarioResult;
  scoreDelta: number;
}

/**
 * Перебирает допустимые замены ОДНОГО из пяти выбранных решений (включая варианты района
 * для районных мер) и возвращает лучшую валидную замену по итоговому Score, либо null,
 * если среди проверенных замен улучшений нет.
 *
 * TODO(Даниял): реализовать перебор. Черновой алгоритм:
 * 1. Для каждого i из current: для каждого кандидата m из MEASURES, не входящего в current \ {i}:
 *    - если m.scope === "Район" — перебрать все DISTRICTS как districtId;
 *    - если m.scope === "Город" — один кандидат без districtId;
 * 2. Собрать candidateDecisions = [...current без i, candidate].
 * 3. const result = calculateScenario(candidateDecisions); пропустить, если result.valid === false.
 * 4. Сравнивать result.score с исходным calculateScenario(current).score, взять максимум.
 * 5. Вернуть SwapSuggestion с лучшей найденной валидной заменой, либо null.
 *
 * Требования по плану:
 * - Возвращать только фактически пересчитанный (валидный) результат, без округления в расчётах.
 * - Не называть результат глобальной оптимизацией — это перебор замен одного решения.
 */
export function findBestSingleSwap(current: Decision[]): SwapSuggestion | null {
  void DISTRICTS;
  void MEASURES;
  void current;
  void calculateScenario;
  return null;
}
