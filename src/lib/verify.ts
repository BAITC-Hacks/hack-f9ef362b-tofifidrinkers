// Проверка движка расчёта против контрольных примеров из "Датасет районов.docx"
// и чек-листа граничных случаев (правила раздела 4).
// Запуск: npm run verify
import { computeBaseline, calculateScenario, validateScenario, Decision } from "./engine";

function approxEqual(a: number, b: number, eps = 0.05): boolean {
  return Math.abs(a - b) <= eps;
}

let failures = 0;

function check(label: string, actual: number, expected: number) {
  const ok = approxEqual(actual, expected);
  console.log(`${ok ? "OK  " : "FAIL"} ${label}: actual=${actual.toFixed(2)} expected=${expected.toFixed(2)}`);
  if (!ok) failures++;
}

const baseline = computeBaseline();
check("D_avg (базовый)", baseline.dAvg, 56.86);
check("min(D_d) (базовый, Нура)", baseline.worstDistrict.score, 49.18);
check("N_crit (базовый)", baseline.nCrit, 2);
check("Score (базовый)", baseline.score, 52.56);

const example = calculateScenario([
  { measureId: "M7", districtId: "nura" },
  { measureId: "M8", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12" },
  { measureId: "M5", districtId: "saryarka" },
]);
if (example.valid) {
  check("Стоимость примера из раздела 3", example.cost, 95);
  check("Score примера из раздела 3", example.score, 56.5);
  if (example.synergiesApplied.length !== 1) {
    console.log(`FAIL Синергия M10+M12 должна сработать один раз, получено: ${example.synergiesApplied.length}`);
    failures++;
  } else {
    console.log("OK  Синергия M10 + M12 сработала");
  }
} else {
  console.log("FAIL Пример из раздела 3 признан невалидным:", example.reason);
  failures++;
}

const cheapest = calculateScenario([
  { measureId: "M9", districtId: "nura" },
  { measureId: "M11", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12" },
  { measureId: "M4", districtId: "nura" },
]);
if (cheapest.valid) {
  check("Стоимость самого дешёвого набора", cheapest.cost, 61);
} else {
  console.log("FAIL Самый дешёвый набор признан невалидным:", cheapest.reason);
  failures++;
}

function expectInvalid(label: string, decisions: Decision[]) {
  const result = validateScenario(decisions);
  if (result.valid) {
    console.log(`FAIL ${label}: ожидалась ошибка валидации, набор признан допустимым.`);
    failures++;
  } else {
    console.log(`OK   ${label}: отклонено («${result.reason}»)`);
  }
}

function expectValid(label: string, decisions: Decision[]) {
  const result = validateScenario(decisions);
  if (!result.valid) {
    console.log(`FAIL ${label}: ожидался допустимый набор, получена ошибка («${result.reason}»)`);
    failures++;
  } else {
    console.log(`OK   ${label}: допустимо`);
  }
}

// --- Чек-лист граничных случаев ---

expectInvalid("4 решения вместо 5", [
  { measureId: "M7", districtId: "nura" },
  { measureId: "M8", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12" },
]);

expectInvalid("6 решений вместо 5", [
  { measureId: "M7", districtId: "nura" },
  { measureId: "M8", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12" },
  { measureId: "M5", districtId: "saryarka" },
  { measureId: "M9", districtId: "esil" },
]);

expectInvalid("повтор мероприятия", [
  { measureId: "M7", districtId: "nura" },
  { measureId: "M7", districtId: "almaty" },
  { measureId: "M8", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12" },
]);

expectInvalid("бюджет превышен (>100)", [
  { measureId: "M3", districtId: "esil" },
  { measureId: "M7", districtId: "nura" },
  { measureId: "M8", districtId: "nura" },
  { measureId: "M13", districtId: "almaty" },
  { measureId: "M12" },
]);

expectInvalid("3 меры одного направления (Соцсфера)", [
  { measureId: "M7", districtId: "nura" },
  { measureId: "M8", districtId: "nura" },
  { measureId: "M9", districtId: "nura" },
  { measureId: "M12" },
  { measureId: "M14" },
]);

expectInvalid("M1 и M3 конфликтуют даже в разных районах", [
  { measureId: "M1", districtId: "esil" },
  { measureId: "M3", districtId: "almaty" },
  { measureId: "M9", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12" },
]);

expectInvalid("M4 и M7 конфликтуют в одном районе", [
  { measureId: "M4", districtId: "nura" },
  { measureId: "M7", districtId: "nura" },
  { measureId: "M9", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12" },
]);

expectValid("M4 и M7 допустимы в разных районах", [
  { measureId: "M4", districtId: "nura" },
  { measureId: "M7", districtId: "almaty" },
  { measureId: "M9", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12" },
]);

expectInvalid("M5 и M13 конфликтуют в одном районе", [
  { measureId: "M5", districtId: "esil" },
  { measureId: "M13", districtId: "esil" },
  { measureId: "M9", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12" },
]);

expectValid("M5 и M13 допустимы в разных районах", [
  { measureId: "M5", districtId: "esil" },
  { measureId: "M13", districtId: "almaty" },
  { measureId: "M9", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12" },
]);

{
  const forward: Decision[] = [
    { measureId: "M7", districtId: "nura" },
    { measureId: "M8", districtId: "nura" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12" },
    { measureId: "M5", districtId: "saryarka" },
  ];
  const reversed = [...forward].reverse();
  const a = calculateScenario(forward);
  const b = calculateScenario(reversed);
  if (a.valid && b.valid && approxEqual(a.score, b.score, 1e-9)) {
    console.log("OK   порядок решений не влияет на Score");
  } else {
    console.log("FAIL порядок решений повлиял на Score");
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n${failures} проверка(и) провалены.`);
  process.exit(1);
} else {
  console.log("\nВсе контрольные примеры сошлись.");
}
