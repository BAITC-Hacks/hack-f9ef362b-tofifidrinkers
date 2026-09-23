import {
  BUDGET,
  CRITICAL_THRESHOLD,
  DECISIONS_REQUIRED,
  DISTRICTS,
  DistrictId,
  HORIZON_QUARTERS,
  INCOMPATIBILITIES,
  INDICATOR_CODES,
  IndicatorCode,
  MAX_PER_DIRECTION,
  MEASURE_MAP,
  Measure,
  MeasureId,
  SCORE_WEIGHTS,
  SYNERGIES,
} from "./data";

export interface Decision {
  measureId: MeasureId;
  districtId?: DistrictId;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export interface Contribution {
  source: MeasureId | "synergy";
  synergyWith?: MeasureId;
  amount: number;
}

export interface IndicatorOutcome {
  indicator: IndicatorCode;
  base: number;
  final: number;
  delta: number;
  critical: boolean;
  contributions: Contribution[];
}

export interface DistrictOutcome {
  districtId: DistrictId;
  name: string;
  populationShare: number;
  baseScore: number;
  finalScore: number;
  indicators: IndicatorOutcome[];
}

export interface ScenarioResult {
  valid: true;
  cost: number;
  budgetLeft: number;
  districts: DistrictOutcome[];
  dAvg: number;
  worstDistrict: { id: DistrictId; name: string; score: number };
  nCrit: number;
  criticalPairs: { district: string; indicator: IndicatorCode }[];
  score: number;
  directionsUsed: Record<string, number>;
  synergiesApplied: { pair: [MeasureId, MeasureId]; district: string; indicator: IndicatorCode; amount: number }[];
}

export type ScenarioOutcome = ScenarioResult | (ValidationResult & { valid: false });

function districtScore(values: Record<IndicatorCode, number>): number {
  let sum = 0;
  for (const code of INDICATOR_CODES) {
    const indicator = INDICATOR_DEF(code);
    sum += indicator.weight * values[code];
  }
  return sum;
}

import { INDICATORS } from "./data";
function INDICATOR_DEF(code: IndicatorCode) {
  const found = INDICATORS.find((i) => i.code === code);
  if (!found) throw new Error(`Unknown indicator ${code}`);
  return found;
}

function countCritical(districtsValues: Record<DistrictId, Record<IndicatorCode, number>>): number {
  let n = 0;
  for (const d of DISTRICTS) {
    for (const code of INDICATOR_CODES) {
      if (districtsValues[d.id][code] < CRITICAL_THRESHOLD) n++;
    }
  }
  return n;
}

/** Базовый сценарий (без решений) — точка отсчёта для сравнения. */
export function computeBaseline(): ScenarioResult {
  return calculateScenario([]) as ScenarioResult;
}

export function validateScenario(decisions: Decision[]): ValidationResult {
  if (decisions.length !== DECISIONS_REQUIRED && decisions.length !== 0) {
    return { valid: false, reason: `Нужно выбрать ровно ${DECISIONS_REQUIRED} решений, выбрано ${decisions.length}.` };
  }

  const ids = decisions.map((d) => d.measureId);
  const seen = new Set<MeasureId>();
  for (const id of ids) {
    if (seen.has(id)) return { valid: false, reason: `Мероприятие ${id} выбрано более одного раза — повторы запрещены.` };
    seen.add(id);
  }

  let cost = 0;
  const perDirection: Record<string, number> = {};
  for (const d of decisions) {
    const measure = MEASURE_MAP[d.measureId];
    if (!measure) return { valid: false, reason: `Неизвестное мероприятие ${d.measureId}.` };
    if (measure.scope === "Район" && !d.districtId) {
      return { valid: false, reason: `Для мероприятия ${measure.id} (${measure.name}) нужно указать район.` };
    }
    if (measure.scope === "Город" && d.districtId) {
      return { valid: false, reason: `Мероприятие ${measure.id} (${measure.name}) городское — район указывать не нужно.` };
    }
    cost += measure.cost;
    perDirection[measure.direction] = (perDirection[measure.direction] ?? 0) + 1;
  }

  if (cost > BUDGET) {
    return { valid: false, reason: `Превышен бюджет: стоимость ${cost} > ${BUDGET}.` };
  }

  for (const [direction, count] of Object.entries(perDirection)) {
    if (count > MAX_PER_DIRECTION) {
      return { valid: false, reason: `Направление «${direction}» выбрано ${count} раз(а) — максимум ${MAX_PER_DIRECTION}.` };
    }
  }

  for (const incompat of INCOMPATIBILITIES) {
    const [a, b] = incompat.pair;
    const da = decisions.find((d) => d.measureId === a);
    const db = decisions.find((d) => d.measureId === b);
    if (da && db) {
      if (!incompat.sameDistrictOnly) {
        return { valid: false, reason: incompat.reason };
      }
      if (da.districtId === db.districtId) {
        return { valid: false, reason: incompat.reason };
      }
    }
  }

  return { valid: true };
}

export function calculateScenario(decisions: Decision[]): ScenarioOutcome {
  const validation = validateScenario(decisions);
  if (!validation.valid) return validation as ValidationResult & { valid: false };

  const measures: { measure: Measure; districtId?: DistrictId }[] = decisions.map((d) => ({
    measure: MEASURE_MAP[d.measureId],
    districtId: d.districtId,
  }));

  // districtId -> indicator -> накопленный эффект (до синергий)
  const rawEffects: Record<DistrictId, Record<IndicatorCode, number>> = {} as never;
  // districtId -> indicator -> вклад по источникам
  const contributionsByDistrict: Record<DistrictId, Record<IndicatorCode, Contribution[]>> = {} as never;
  for (const d of DISTRICTS) {
    rawEffects[d.id] = Object.fromEntries(INDICATOR_CODES.map((c) => [c, 0])) as Record<IndicatorCode, number>;
    contributionsByDistrict[d.id] = Object.fromEntries(INDICATOR_CODES.map((c) => [c, [] as Contribution[]])) as Record<IndicatorCode, Contribution[]>;
  }

  const applyEffect = (districtId: DistrictId, indicator: IndicatorCode, amount: number, source: MeasureId | "synergy", synergyWith?: MeasureId) => {
    rawEffects[districtId][indicator] += amount;
    contributionsByDistrict[districtId][indicator].push({ source, synergyWith, amount });
  };

  for (const { measure, districtId } of measures) {
    const realizedFraction = (HORIZON_QUARTERS - measure.lag) / HORIZON_QUARTERS;
    const targets: DistrictId[] = measure.scope === "Город" ? DISTRICTS.map((d) => d.id) : [districtId as DistrictId];
    for (const target of targets) {
      for (const effect of measure.effects) {
        applyEffect(target, effect.indicator, effect.amount * realizedFraction, measure.id);
      }
    }
  }

  const synergiesApplied: ScenarioResult["synergiesApplied"] = [];
  for (const synergy of SYNERGIES) {
    const [a, b] = synergy.pair;
    const decisionA = decisions.find((d) => d.measureId === a);
    const decisionB = decisions.find((d) => d.measureId === b);
    if (decisionA && decisionB) {
      const anchorDecision = synergy.anchor === a ? decisionA : decisionB;
      const measureA = MEASURE_MAP[a];
      const measureB = MEASURE_MAP[b];
      const anchorMeasure = synergy.anchor === a ? measureA : measureB;
      const districtId = anchorMeasure.scope === "Район" ? (anchorDecision.districtId as DistrictId) : DISTRICTS[0].id;
      // Бонус фиксированный, лагом не масштабируется.
      applyEffect(districtId, synergy.bonusIndicator, synergy.bonusAmount, "synergy", synergy.anchor === a ? b : a);
      synergiesApplied.push({
        pair: synergy.pair,
        district: DISTRICTS.find((d) => d.id === districtId)!.name,
        indicator: synergy.bonusIndicator,
        amount: synergy.bonusAmount,
      });
    }
  }

  const finalValues: Record<DistrictId, Record<IndicatorCode, number>> = {} as never;
  for (const d of DISTRICTS) {
    finalValues[d.id] = Object.fromEntries(
      INDICATOR_CODES.map((code) => {
        const raw = d.base[code] + rawEffects[d.id][code];
        const clipped = Math.min(100, Math.max(0, raw));
        return [code, clipped];
      })
    ) as Record<IndicatorCode, number>;
  }

  const districtOutcomes: DistrictOutcome[] = DISTRICTS.map((d) => {
    const baseScore = districtScore(d.base);
    const finalScore = districtScore(finalValues[d.id]);
    const indicators: IndicatorOutcome[] = INDICATOR_CODES.map((code) => ({
      indicator: code,
      base: d.base[code],
      final: finalValues[d.id][code],
      delta: finalValues[d.id][code] - d.base[code],
      critical: finalValues[d.id][code] < CRITICAL_THRESHOLD,
      contributions: contributionsByDistrict[d.id][code],
    }));
    return {
      districtId: d.id,
      name: d.name,
      populationShare: d.populationShare,
      baseScore,
      finalScore,
      indicators,
    };
  });

  const dAvg = districtOutcomes.reduce((sum, d) => sum + d.populationShare * d.finalScore, 0);
  const worst = districtOutcomes.reduce((min, d) => (d.finalScore < min.finalScore ? d : min), districtOutcomes[0]);
  const nCrit = countCritical(finalValues);
  const criticalPairs = districtOutcomes.flatMap((d) =>
    d.indicators.filter((i) => i.critical).map((i) => ({ district: d.name, indicator: i.indicator }))
  );

  const score = SCORE_WEIGHTS.avg * dAvg + SCORE_WEIGHTS.worst * worst.finalScore - SCORE_WEIGHTS.critPenalty * nCrit;

  const directionsUsed: Record<string, number> = {};
  for (const { measure } of measures) {
    directionsUsed[measure.direction] = (directionsUsed[measure.direction] ?? 0) + 1;
  }

  const cost = measures.reduce((sum, m) => sum + m.measure.cost, 0);

  return {
    valid: true,
    cost,
    budgetLeft: BUDGET - cost,
    districts: districtOutcomes,
    dAvg,
    worstDistrict: { id: worst.districtId, name: worst.name, score: worst.finalScore },
    nCrit,
    criticalPairs,
    score,
    directionsUsed,
    synergiesApplied,
  };
}
