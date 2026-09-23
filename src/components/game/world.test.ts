import assert from "node:assert/strict";
import test from "node:test";
import { calculateScenario } from "../../lib/engine";
import { EXAMPLE, planIssue, sameDecision } from "./useGame";
import {
  canWalk,
  distance,
  moveScreen,
  nearbyPlace,
  PLACES,
  project,
  route,
  segmentClear,
  unproject,
  WALK_SPEED,
} from "./world";
import {
  analyse,
  issueText,
  MONEY_SCALE,
  money,
  nonFinancialRussianExplanation,
  signed,
} from "./presentation";
import {
  indicatorMeanings,
  indicatorNames,
  measureDescriptions,
  measureNames,
  messages,
  translator,
  type Locale,
} from "./i18n";

test("all 36 destination routes remain outside building footprints", () => {
  for (const from of Object.values(PLACES))
    for (const to of Object.values(PLACES)) {
      let previous = from;
      for (const step of route(from, to)) {
        assert.ok(canWalk(step));
        assert.ok(segmentClear(previous, step));
        previous = step;
      }
      assert.deepEqual(previous, to);
    }
});
test("single keys move on screen axes; diagonals have exactly the same speed", () => {
  for (const direction of [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
  ]) {
    const start = project(PLACES.city),
      end = project(moveScreen(PLACES.city, direction, 0.025));
    const vector = { x: end.x - start.x, y: end.y - start.y };
    assert.ok(
      Math.abs(Math.hypot(vector.x, vector.y) - WALK_SPEED * 0.025) < 1e-8,
    );
    if (!direction.x) assert.ok(Math.abs(vector.x) < 1e-8);
    if (!direction.y) assert.ok(Math.abs(vector.y) < 1e-8);
    if (direction.x) assert.equal(Math.sign(vector.x), Math.sign(direction.x));
    if (direction.y) assert.equal(Math.sign(vector.y), Math.sign(direction.y));
  }
});
test("large movement steps cannot tunnel through the tower or leave the island", () => {
  const start = { x: 13, y: 13 };
  const moved = moveScreen(start, { x: 0, y: -1 }, 4);
  assert.ok(canWalk(moved));
  assert.ok(segmentClear(start, moved));
  assert.ok(project(start).y - project(moved).y < WALK_SPEED * 4);
  const edge = { x: 1, y: 1 };
  assert.deepEqual(moveScreen(edge, { x: 0, y: -1 }, 1), edge);
});
test("clicking obstacles and rerouting mid-step still gives collision-free segments", () => {
  const from = moveScreen(PLACES.city, { x: 1, y: 0 }, 0.031);
  for (const target of [
    { x: 10, y: 10 },
    { x: -200, y: 200 },
    { x: 17.3, y: 8.7 },
  ]) {
    const path = route(from, target);
    assert.ok(path.length);
    let p = from;
    for (const next of path) {
      assert.ok(segmentClear(p, next));
      p = next;
    }
    assert.ok(canWalk(p));
  }
});
test("pointer projection and interaction proximity remain correct", () => {
  for (const p of Object.values(PLACES))
    assert.ok(distance(p, unproject(project(p))) < 1e-10);
  for (const [id, p] of Object.entries(PLACES))
    assert.equal(nearbyPlace(p), id);
  assert.equal(nearbyPlace({ x: 13, y: 18 }), null);
});
test("validation errors are structured and can change language without recalculating", () => {
  assert.equal(planIssue([{ measureId: "M7" }])?.key, "districtRequired");
  assert.equal(
    planIssue([
      { measureId: "M7", districtId: "nura" },
      { measureId: "M7", districtId: "esil" },
    ])?.key,
    "duplicate",
  );
  const issue = planIssue([
    ...EXAMPLE.filter((d) => d.measureId !== "M8"),
    { measureId: "M13", districtId: "saryarka" },
  ])!;
  assert.equal(issue.key, "insufficient");
  assert.equal(issue.amount, 3);
  for (const locale of ["ru", "kk", "en"] as Locale[]) {
    assert.ok(issueText(issue, locale).includes(money(3, locale)));
    assert.ok(!issueText(issue, locale).includes("у.е."));
  }
  assert.equal(
    planIssue([
      { measureId: "M4", districtId: "nura" },
      { measureId: "M7", districtId: "nura" },
    ])?.key,
    "conflictLand",
  );
});
test("allocation counts citywide costs once; impact uses engine district outcomes", () => {
  const result = calculateScenario(EXAMPLE);
  assert.ok(result.valid);
  assert.equal(result.score.toFixed(5), "56.54307");
  assert.equal(result.cost, 95);
  const analysis = analyse(EXAMPLE, result);
  assert.equal(analysis.citywide, 14);
  assert.equal(
    analysis.spending.reduce((n, d) => n + d.cost, 0) + analysis.citywide,
    95,
  );
  assert.equal(analysis.spending.find((d) => d.id === "nura")?.cost, 56);
  assert.equal(analysis.concentrated[0].id, "nura");
  assert.equal(analysis.allImproved, true);
  analysis.districts.forEach((d) =>
    assert.equal(
      d.change,
      result.districts.find((r) => r.districtId === d.districtId)!.finalScore -
        d.baseScore,
    ),
  );
  assert.equal(planIssue(EXAMPLE), null);
  assert.equal(
    sameDecision(
      { measureId: "M5", districtId: "saryarka" },
      { measureId: "M5", districtId: "nura" },
    ),
    false,
  );
});
test("all messages, project and indicator texts exist in all three languages", () => {
  for (const dict of [
    messages,
    measureNames,
    measureDescriptions,
    indicatorNames,
    indicatorMeanings,
  ])
    for (const texts of Object.values(dict)) {
      assert.equal(texts.length, 3);
      texts.forEach((text) => assert.ok(text.trim().length));
    }
  for (const locale of ["ru", "kk", "en"] as Locale[]) {
    assert.ok(translator(locale)("include"));
    assert.ok(money(24, locale).includes("₸"));
    assert.equal(
      Number(
        new Intl.NumberFormat("en")
          .format(24 * MONEY_SCALE.tengePerUnit)
          .replaceAll(",", ""),
      ),
      240000000,
    );
    assert.ok(!signed(3.99, locale).includes("₸"));
  }
});
test("free-form AI money is not relabelled or mixed with score numbers", () => {
  const source =
    "Потрачено 95 из 100 у.е. бюджета (остаток 5).\n\nScore 56.54. S1 улучшился.\n\nСтоимость замены 100 у.е.";
  const result = nonFinancialRussianExplanation(source);
  assert.equal(result.hidden, true);
  assert.ok(!result.text.includes("95"));
  assert.ok(!result.text.includes("у.е."));
  assert.ok(result.text.includes("56.54"));
  assert.ok(result.text.includes("Доступность школ"));
  assert.ok(!/\bS1\b/.test(result.text));
});
