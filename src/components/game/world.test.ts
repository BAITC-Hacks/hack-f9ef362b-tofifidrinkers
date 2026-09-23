import assert from "node:assert/strict";
import test from "node:test";
import { calculateScenario } from "../../lib/engine";
import { EXAMPLE, planIssue, sameDecision } from "./useGame";
import {
  distance,
  isRoad,
  nearbyPlace,
  PLACES,
  project,
  route,
  unproject,
} from "./world";

test("all 36 destination pairs have continuous, road-only routes", () => {
  for (const from of Object.values(PLACES)) {
    for (const to of Object.values(PLACES)) {
      let previous = from;
      for (const step of route(from, to)) {
        assert.ok(isRoad(step.x, step.y));
        assert.equal(distance(previous, step), 1);
        previous = step;
      }
      assert.deepEqual(previous, to);
    }
  }
});

test("tapping a building or outside the island ends on an accessible road", () => {
  for (const destination of [
    { x: 10, y: 10 },
    { x: -200, y: 200 },
    { x: 17.3, y: 8.7 },
  ]) {
    const path = route(PLACES.city, destination);
    assert.ok(path.length);
    let previous = PLACES.city;
    for (const point of path) {
      assert.ok(isRoad(point.x, point.y));
      assert.equal(distance(previous, point), 1);
      previous = point;
    }
  }
});

test("projection used for pointer navigation is reversible", () => {
  for (const p of [...Object.values(PLACES), { x: 7.25, y: 14.5 }]) {
    const restored = unproject(project(p));
    assert.ok(distance(p, restored) < 1e-10);
  }
});

test("interaction appears only in proximity of a destination", () => {
  for (const [id, point] of Object.entries(PLACES))
    assert.equal(nearbyPlace(point), id);
  assert.equal(nearbyPlace({ x: 13, y: 18 }), null);
});

test("partial plan reports missing districts, duplicate measures, budget and conflicts", () => {
  assert.match(planIssue([{ measureId: "M7" }])!, /район/);
  assert.match(
    planIssue([
      { measureId: "M7", districtId: "nura" },
      { measureId: "M7", districtId: "esil" },
    ])!,
    /уже выбрана/,
  );
  assert.match(
    planIssue([
      ...EXAMPLE.filter((d) => d.measureId !== "M8"),
      { measureId: "M13", districtId: "saryarka" },
    ])!,
    /Не хватает 3/,
  );
  assert.match(
    planIssue([
      { measureId: "M4", districtId: "nura" },
      { measureId: "M7", districtId: "nura" },
    ])!,
    /участок/,
  );
  assert.match(
    planIssue([
      { measureId: "M7", districtId: "nura" },
      { measureId: "M8", districtId: "nura" },
      { measureId: "M9", districtId: "esil" },
    ])!,
    /не более 2/,
  );
});

test("demo remains a normal valid engine input", () => {
  assert.equal(planIssue(EXAMPLE), null);
  const result = calculateScenario(EXAMPLE);
  assert.ok(result.valid);
  assert.equal(result.cost, 95);
  assert.equal(result.score.toFixed(5), "56.54307");
  assert.ok(
    result.synergiesApplied.some(
      (s) => s.district === "Нура" && s.pair.join("+") === "M10+M12",
    ),
  );
});

test("advisor replacement identity includes the district", () => {
  assert.equal(
    sameDecision(
      { measureId: "M5", districtId: "saryarka" },
      { measureId: "M5", districtId: "nura" },
    ),
    false,
  );
  assert.equal(
    sameDecision({ measureId: "M12" }, { measureId: "M12", districtId: null }),
    true,
  );
});
