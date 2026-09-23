// Проверки советника. Запуск: npx tsx src/lib/verify-improve.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { DISTRICTS, MEASURES } from "./data";
import { calculateScenario } from "./engine";
import type { Decision, ScenarioResult } from "./engine";
import { findBestSingleSwap } from "./improve";
import type { SwapSuggestion } from "./improve";

const EPS = 1e-8;
let checks = 0;
function test(name: string, body: () => void) {
  body();
  checks++;
  console.log(`OK ${name}`);
}
function close(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) <= EPS, `${actual} != ${expected}`);
}
function ordered(input: Decision[]): Decision[] {
  return [...input].sort((a, b) => Number(a.measureId.slice(1)) - Number(b.measureId.slice(1)) ||
    ((a.districtId ?? "") < (b.districtId ?? "") ? -1 : (a.districtId ?? "") > (b.districtId ?? "") ? 1 : 0));
}
function signature(input: Decision[]): string {
  return ordered(input).map((d) => `${d.measureId.slice(1).padStart(2, "0")}:${d.districtId ?? ""}`).join("|");
}
function result(input: Decision[]): ScenarioResult {
  const calculated = calculateScenario(input);
  assert.ok(calculated.valid, calculated.valid ? "" : calculated.reason);
  return calculated;
}
function apply(input: Decision[], suggestion: SwapSuggestion): Decision[] {
  const index = input.findIndex((d) => d.measureId === suggestion.removed.measureId &&
    (d.districtId ?? null) === (suggestion.removed.districtId ?? null));
  assert.ok(index >= 0, "Удаляемое решение должно присутствовать во входе");
  return input.map((d, i) => i === index ? { ...suggestion.added } : { ...d });
}

// Независимый тестовый перебор: в отличие от production-кода, не исключает
// дубликаты и неизменные варианты заранее. Все кандидаты проверяет общий движок.
function neighbors(input: Decision[]) {
  const options: Decision[] = MEASURES.flatMap((m): Decision[] => m.scope === "Город"
    ? [{ measureId: m.id }]
    : DISTRICTS.map((d) => ({ measureId: m.id, districtId: d.id })));
  const found: { decisions: Decision[]; outcome: ScenarioResult }[] = [];
  for (const replacement of options) {
    for (let i = 0; i < input.length; i++) {
      const decisions = input.map((d, j) => j === i ? replacement : d);
      const outcome = calculateScenario(decisions);
      if (outcome.valid) found.push({ decisions, outcome });
    }
  }
  return found;
}
function checkBest(input: Decision[]) {
  const before = JSON.stringify(input);
  const current = result(input);
  const actual = findBestSingleSwap(input);
  assert.equal(JSON.stringify(input), before, "Советник изменил вход");
  const improvements = neighbors(input).filter((n) => n.outcome.score - current.score > EPS);
  if (improvements.length === 0) {
    assert.equal(actual, null);
    return { ties: 0, costTie: false };
  }
  assert.ok(actual, "Должно быть найдено улучшение");
  const maximum = Math.max(...improvements.map((n) => n.outcome.score));
  const tied = improvements.filter((n) => maximum - n.outcome.score <= EPS);
  const cheapest = Math.min(...tied.map((n) => n.outcome.cost));
  const key = tied.filter((n) => n.outcome.cost === cheapest).map((n) => signature(n.decisions)).sort()[0];
  const changed = apply(input, actual);
  assert.equal(changed.length, 5);
  assert.equal(new Set(changed.map((d) => d.measureId)).size, 5);
  assert.equal(signature(changed), key, "Не лучшая замена или нарушено разрешение равенств");
  const recalculated = result(ordered(changed));
  assert.deepEqual(actual.scenario, recalculated);
  close(actual.scoreDelta, recalculated.score - current.score);
  assert.equal(actual.costDelta, recalculated.cost - current.cost);
  assert.ok(actual.scoreDelta > EPS);
  assert.ok(actual.scenario.cost <= 100);
  if (MEASURES.find((m) => m.id === actual.added.measureId)?.scope === "Город") {
    assert.equal(actual.added.districtId, undefined, "У городской рекомендации нет района");
  }
  return { ties: new Set(tied.map((n) => signature(n.decisions))).size, costTie: new Set(tied.map((n) => n.outcome.cost)).size > 1 };
}

interface Fixture {
  id: string;
  input: { decisions: Decision[] };
  expected: { valid: boolean };
}
const fixtures = JSON.parse(readFileSync(new URL("../../fixtures/daniyal/scenario-fixtures.json", import.meta.url), "utf8")) as { scenarios: Fixture[] };
const example = fixtures.scenarios.find((f) => f.id === "official-example")!.input.decisions;
let tiedCases = 0;
let costTieCases = 0;
for (const fixture of fixtures.scenarios) {
  test(`fixture ${fixture.id}`, () => {
    if (!fixture.expected.valid) assert.equal(findBestSingleSwap(fixture.input.decisions), null);
    else {
      const stats = checkBest(fixture.input.decisions);
      if (stats.ties > 1) tiedCases++;
      if (stats.costTie) costTieCases++;
    }
  });
}

test("null и отсутствие района у городской меры эквивалентны", () => {
  const withoutNull = example.map((d) => d.districtId === null ? { measureId: d.measureId } : { ...d });
  assert.deepEqual(findBestSingleSwap(example), findBestSingleSwap(withoutNull));
});

function* permutations<T>(items: T[]): Generator<T[]> {
  if (items.length === 0) { yield []; return; }
  for (let i = 0; i < items.length; i++) {
    for (const rest of permutations(items.filter((_, j) => j !== i))) yield [items[i], ...rest];
  }
}
test("120 перестановок дают одну и ту же рекомендацию", () => {
  const expected = findBestSingleSwap(example);
  for (const permutation of permutations(example)) {
    const actual = findBestSingleSwap(permutation);
    assert.ok(expected && actual);
    assert.deepEqual(actual.removed, expected.removed);
    assert.deepEqual(actual.added, expected.added);
    assert.deepEqual(actual.scenario, expected.scenario);
    close(actual.scoreDelta, expected.scoreDelta);
    assert.equal(actual.costDelta, expected.costDelta);
  }
});

test("замороженный вход не изменяется; возвращённые решения не ссылаются на вход", () => {
  const input = example.map((d) => ({ ...d }));
  input.forEach(Object.freeze);
  Object.freeze(input);
  const suggestion = findBestSingleSwap(input);
  assert.ok(suggestion);
  assert.ok(!input.includes(suggestion.removed) && !input.includes(suggestion.added));
});

// Повторяемые дополнительные сценарии без случайности времени/окружения.
let seed = 20260923;
function random(length: number): number {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed % length;
}
let sampled = 0;
let moves = 0;
let cityReplacements = 0;
test("городская замена возвращается без districtId", () => {
  const input: Decision[] = [
    { measureId: "M7", districtId: "nura" }, { measureId: "M5", districtId: "esil" },
    { measureId: "M11", districtId: "almaty" }, { measureId: "M12" },
    { measureId: "M9", districtId: "esil" },
  ];
  checkBest(input);
  const suggestion = findBestSingleSwap(input)!;
  assert.deepEqual(suggestion.added, { measureId: "M14" });
  assert.equal(suggestion.removed.measureId, "M11");
  close(suggestion.scenario.score, 55.44384125);
  cityReplacements++;
});
for (let attempt = 0; attempt < 3000 && sampled < 40; attempt++) {
  const remaining = [...MEASURES];
  const input: Decision[] = [];
  for (let i = 0; i < 5; i++) {
    const m = remaining.splice(random(remaining.length), 1)[0];
    input.push(m.scope === "Город" ? { measureId: m.id } : { measureId: m.id, districtId: DISTRICTS[random(5)].id });
  }
  if (!calculateScenario(input).valid) continue;
  sampled++;
  test(`полный перебор соседей дополнительного сценария ${sampled}`, () => {
    const stats = checkBest(input);
    if (stats.ties > 1) tiedCases++;
    if (stats.costTie) costTieCases++;
    const suggestion = findBestSingleSwap(input);
    if (suggestion?.removed.measureId === suggestion?.added.measureId && suggestion) moves++;
    if (suggestion && MEASURES.find((m) => m.id === suggestion.added.measureId)?.scope === "Город") cityReplacements++;
  });
}
assert.equal(sampled, 40);
assert.ok(moves > 0, "Выборка должна проверять перенос той же меры");
assert.ok(cityReplacements > 0, "Выборка должна проверять городские рекомендации");

test("последовательные улучшения заканчиваются локальным максимумом без фиктивного совета", () => {
  let input = example.map((d) => ({ ...d }));
  let stopped = false;
  for (let step = 0; step < 100; step++) {
    const suggestion = findBestSingleSwap(input);
    if (!suggestion) {
      checkBest(input);
      stopped = true;
      break;
    }
    const before = result(input);
    input = apply(input, suggestion);
    assert.ok(result(input).score - before.score > EPS);
  }
  assert.ok(stopped, "Ожидалась остановка за 100 шагов");
});

// Искусственные равенства: изолированно исполняем тот же production-модуль
// с управляемым ответом движка. Официальный датасет и его объекты не изменяются.
function tieHarness(six: { score: number; cost: number }, seven: { score: number; cost: number }) {
  const source = readFileSync(new URL("./improve.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const input: Decision[] = ["M1", "M2", "M3", "M4", "M5"].map((measureId) => ({ measureId } as Decision));
  const exports: { findBestSingleSwap?: typeof findBestSingleSwap } = {};
  runInNewContext(compiled, {
    exports,
    require: (name: string) => {
      if (name === "./data") return {
        DISTRICTS: [],
        MEASURES: [...input.map((d) => d.measureId), "M6", "M7"].map((id) => ({ id, scope: "Город" })),
      };
      if (name === "./engine") return {
        calculateScenario: (decisions: Decision[]) => {
          const ids = new Set(decisions.map((d) => d.measureId));
          if (ids.size !== 5) return { valid: false };
          if (!ids.has("M1") && ids.has("M6")) return { valid: true, ...six };
          if (!ids.has("M1") && ids.has("M7")) return { valid: true, ...seven };
          return { valid: true, score: 50, cost: 100 };
        },
      };
      throw new Error(`Неожиданный импорт ${name}`);
    },
  });
  return exports.findBestSingleSwap!(input);
}
test("равный Score: меньшая стоимость важнее лексикографического порядка", () => {
  const suggestion = tieHarness({ score: 60, cost: 98 }, { score: 60, cost: 90 });
  assert.equal(suggestion?.added.measureId, "M7");
  assert.equal(suggestion?.costDelta, -10);
});
test("равные Score и стоимость: стабильный лексикографический выбор", () => {
  const suggestion = tieHarness({ score: 60, cost: 90 }, { score: 60, cost: 90 });
  assert.equal(suggestion?.added.measureId, "M6");
});
test("разница меньше EPS считается равенством при выборе стоимости", () => {
  const suggestion = tieHarness({ score: 60 + 5e-9, cost: 98 }, { score: 60, cost: 90 });
  assert.equal(suggestion?.added.measureId, "M7");
});
test("шум меньше EPS не выдаётся за улучшение", () => {
  assert.equal(tieHarness({ score: 50 + 5e-9, cost: 90 }, { score: 50, cost: 90 }), null);
});
test("улучшение больше EPS сохраняется, даже если на экране округляется до нуля", () => {
  const suggestion = tieHarness({ score: 50 + 3e-8, cost: 90 }, { score: 50, cost: 90 });
  assert.equal(suggestion?.added.measureId, "M6");
  assert.ok(suggestion && suggestion.scoreDelta > EPS);
});

const demo = findBestSingleSwap(example)!;
console.log(`\nВсе ${checks} проверок советника пройдены. Переносов: ${moves}; городских замен: ${cityReplacements}; естественных равенств Score: ${tiedCases}; с разной стоимостью: ${costTieCases}. Равенства и EPS дополнительно проверены на пяти изолированных искусственных случаях.`);
console.log(JSON.stringify({ removed: demo.removed, added: demo.added, score: demo.scenario.score, scoreDelta: demo.scoreDelta, cost: demo.scenario.cost, costDelta: demo.costDelta }, null, 2));
