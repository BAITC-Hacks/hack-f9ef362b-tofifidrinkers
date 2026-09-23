// Кросс-проверка src/lib/engine.ts против независимого пакета Данияла
// (fixtures/daniyal/scenario-fixtures.json + city-data.json).
// Запуск: npm run verify:daniyal
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { calculateScenario, computeBaseline, Decision } from "./engine";
import { DistrictId } from "./data";

const ROOT = join(__dirname, "..", "..", "fixtures", "daniyal");

interface Fixture {
  baseline: { expected: Record<string, unknown> };
  scenarios: {
    id: string;
    input: { decisions: { measureId: string; districtId?: string | null }[] };
    expected: Record<string, unknown>;
    equivalentTo?: string;
  }[];
  unitChecks: { id: string; operation: string; input: unknown; expected: unknown }[];
}

const fixtures: Fixture = JSON.parse(readFileSync(join(ROOT, "scenario-fixtures.json"), "utf-8"));

const TOLERANCE = 1e-8;
let failures = 0;

function approx(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE;
}

function fail(label: string, message: string) {
  console.log(`FAIL ${label}: ${message}`);
  failures++;
}

function ok(label: string) {
  console.log(`OK   ${label}`);
}

/** Приводит ScenarioResult к плоской форме из scenario-fixtures.json для сравнения. */
function toDaniyalShape(decisions: Decision[]) {
  const validation = calculateScenario(decisions);
  if (!validation.valid) {
    return { valid: false, violations: [validation.code], score: null };
  }
  const finalIndicators: Record<string, Record<string, number>> = {};
  const districtScores: Record<string, number> = {};
  const criticalIndicators: { districtId: string; indicatorId: string; value: number }[] = [];
  for (const d of validation.districts) {
    finalIndicators[d.districtId] = {};
    for (const i of d.indicators) {
      finalIndicators[d.districtId][i.indicator] = i.final;
      if (i.critical) criticalIndicators.push({ districtId: d.districtId, indicatorId: i.indicator, value: i.final });
    }
    districtScores[d.districtId] = d.finalScore;
  }
  const baseline = computeBaseline();
  return {
    valid: true,
    violations: [] as string[],
    cost: validation.cost,
    budgetRemaining: validation.budgetLeft,
    finalIndicators,
    districtScores,
    averageScore: validation.dAvg,
    minimumScore: Math.min(...validation.districts.map((d) => d.finalScore)),
    worstDistrictIds: validation.worstDistrictIds,
    criticalIndicators,
    criticalCount: validation.nCrit,
    score: validation.score,
    delta: validation.score - baseline.score,
    appliedSynergies: validation.synergiesApplied.map((s) => s.id),
  };
}

function compareValue(actual: unknown, expected: unknown, path: string): void {
  if (typeof expected === "number" && typeof actual === "number") {
    if (!approx(actual, expected)) fail(path, `${actual} !== ${expected}`);
    return;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      fail(path, `длины не совпадают: ${JSON.stringify(actual)} vs ${JSON.stringify(expected)}`);
      return;
    }
    // Порядок critical/synergies не имеет смыслового значения — сравниваем как множества строк.
    const aStr = actual.map((x) => JSON.stringify(x)).sort();
    const bStr = expected.map((x) => JSON.stringify(x)).sort();
    for (let i = 0; i < aStr.length; i++) {
      if (aStr[i] !== bStr[i]) {
        fail(path, `множества не совпадают: ${JSON.stringify(actual)} vs ${JSON.stringify(expected)}`);
        return;
      }
    }
    return;
  }
  if (expected && typeof expected === "object") {
    const expectedObj = expected as Record<string, unknown>;
    const actualObj = (actual ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(expectedObj)) {
      compareValue(actualObj[key], expectedObj[key], `${path}.${key}`);
    }
    return;
  }
  if (actual !== expected) fail(path, `${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}

function toDecisions(raw: { measureId: string; districtId?: string | null }[]): Decision[] {
  return raw.map((d) => ({
    measureId: d.measureId as Decision["measureId"],
    districtId: (d.districtId ?? undefined) as DistrictId | undefined,
  }));
}

// --- База ---
// computeBaseline не проходит через validateScenario (пустой набор невалиден для пользователя),
// поэтому строим форму сравнения напрямую из ScenarioResult, минуя валидатор.
{
  const before = failures;
  const base = computeBaseline();
  const finalIndicators: Record<string, Record<string, number>> = {};
  const districtScores: Record<string, number> = {};
  const criticalIndicators: { districtId: string; indicatorId: string; value: number }[] = [];
  for (const d of base.districts) {
    finalIndicators[d.districtId] = {};
    for (const i of d.indicators) {
      finalIndicators[d.districtId][i.indicator] = i.final;
      if (i.critical) criticalIndicators.push({ districtId: d.districtId, indicatorId: i.indicator, value: i.final });
    }
    districtScores[d.districtId] = d.finalScore;
  }
  compareValue(
    {
      cost: base.cost,
      budgetRemaining: base.budgetLeft,
      finalIndicators,
      districtScores,
      averageScore: base.dAvg,
      minimumScore: Math.min(...base.districts.map((d) => d.finalScore)),
      worstDistrictIds: base.worstDistrictIds,
      criticalIndicators,
      criticalCount: base.nCrit,
      score: base.score,
      delta: 0,
      appliedSynergies: [],
    },
    fixtures.baseline.expected,
    "baseline"
  );
  if (failures === before) ok("baseline (52.55768)");
}

// --- 23 сценария ---
const results: Record<string, ReturnType<typeof toDaniyalShape>> = {};
for (const scenario of fixtures.scenarios) {
  const before = failures;
  const decisions = toDecisions(scenario.input.decisions);
  const actual = toDaniyalShape(decisions);
  results[scenario.id] = actual;
  compareValue(actual, scenario.expected, scenario.id);
  if (failures === before) ok(scenario.id);
}

// --- Перестановка решений (equivalentTo) ---
for (const scenario of fixtures.scenarios) {
  if (!scenario.equivalentTo) continue;
  const before = failures;
  compareValue(results[scenario.id], results[scenario.equivalentTo], `${scenario.id} == ${scenario.equivalentTo}`);
  if (failures === before) ok(`${scenario.id} эквивалентен ${scenario.equivalentTo}`);
}

// --- Unit-проверки границ (clip / isCritical) ---
function clip(v: number): number {
  return Math.min(100, Math.max(0, v));
}
for (const u of fixtures.unitChecks) {
  const before = failures;
  let actual: number | boolean;
  if (u.operation === "clip") actual = clip(u.input as number);
  else if (u.operation === "clipSum") actual = clip((u.input as number[]).reduce((a, b) => a + b, 0));
  else if (u.operation === "isCritical") actual = (u.input as number) < 40;
  else {
    fail(u.id, `неизвестная операция ${u.operation}`);
    continue;
  }
  compareValue(actual, u.expected, u.id);
  if (failures === before) ok(u.id);
}

if (failures > 0) {
  console.error(`\n${failures} расхождение(й) с пакетом Данияла.`);
  process.exit(1);
} else {
  console.log(`\nВсе ${fixtures.scenarios.length} сценариев, база и ${fixtures.unitChecks.length} unit-проверок Данияла совпали (допуск ${TOLERANCE}).`);
}
