// Зона ответственности: Даниял.
// Не дублировать формулу и правила — использовать только calculateScenario/validateScenario из "./engine".
import { DISTRICTS, MEASURES } from "./data";
import { calculateScenario } from "./engine";
import type { Decision, ScenarioResult } from "./engine";

export interface SwapSuggestion {
  removed: Decision;
  added: Decision;
  scenario: ScenarioResult;
  scoreDelta: number;
  costDelta: number;
}

const SCORE_EPSILON = 1e-8;

function decisionKey(decision: Decision): string {
  return `${decision.measureId.slice(1).padStart(2, "0")}:${decision.districtId ?? ""}`;
}

function compareDecisions(a: Decision, b: Decision): number {
  const ka = decisionKey(a);
  const kb = decisionKey(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

/** Лучшая замена одного решения; не глобальная оптимизация всего бюджета.
 * При равных Score (с точностью 1e-8) выбирается меньшая стоимость,
 * затем канонический порядок мероприятий и районов. Вход не изменяется.
 * Невалидный вход и отсутствие улучшений возвращают null; API валидирует вход отдельно.
 */
export function findBestSingleSwap(current: Decision[]): SwapSuggestion | null {
  const baseline = calculateScenario(current);
  if (!baseline.valid) return null;
  const ordered = current.map((d) => ({ ...d })).sort(compareDecisions);

  const candidates: { suggestion: SwapSuggestion; key: string }[] = [];
  for (let index = 0; index < ordered.length; index++) {
    const removed = ordered[index];
    const remaining = ordered.filter((_, i) => i !== index);
    const usedIds = new Set(remaining.map((d) => d.measureId));

    for (const measure of MEASURES) {
      if (usedIds.has(measure.id)) continue;
      const options: Decision[] = measure.scope === "Район"
        ? DISTRICTS.map((district) => ({ measureId: measure.id, districtId: district.id }))
        : [{ measureId: measure.id }];

      for (const added of options) {
        if (compareDecisions(removed, added) === 0) continue;
        const decisions = [...remaining, added].sort(compareDecisions);
        const scenario = calculateScenario(decisions);
        if (!scenario.valid || scenario.score - baseline.score <= SCORE_EPSILON) continue;
        candidates.push({
          suggestion: {
            removed: { ...removed }, added: { ...added }, scenario,
            scoreDelta: scenario.score - baseline.score,
            costDelta: scenario.cost - baseline.cost,
          },
          key: decisions.map(decisionKey).join("|"),
        });
      }
    }
  }

  if (candidates.length === 0) return null;
  const maximum = Math.max(...candidates.map((c) => c.suggestion.scenario.score));
  // Сначала фиксируем максимум, чтобы допуск сравнения не зависел от порядка перебора.
  const tied = candidates.filter((c) => maximum - c.suggestion.scenario.score <= SCORE_EPSILON);
  tied.sort((a, b) => a.suggestion.scenario.cost - b.suggestion.scenario.cost ||
    (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return tied[0].suggestion;
}
