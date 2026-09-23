"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BUDGET,
  DECISIONS_REQUIRED,
  DISTRICTS,
  INCOMPATIBILITIES,
  MAX_PER_DIRECTION,
  MEASURE_MAP,
} from "@/lib/data";
import {
  calculateScenario,
  computeBaseline,
  type Decision,
  type ScenarioResult,
} from "@/lib/engine";
import type { SwapSuggestion } from "@/lib/improve";
import type { ExplanationResult } from "@/lib/explain";
import { engineIssue, type Issue } from "./presentation";

export const EXAMPLE: Decision[] = [
  { measureId: "M7", districtId: "nura" },
  { measureId: "M8", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12" },
  { measureId: "M5", districtId: "saryarka" },
];
export const BASELINE = computeBaseline();
export const costOf = (decisions: Decision[]) =>
  decisions.reduce((sum, d) => sum + MEASURE_MAP[d.measureId].cost, 0);
export const sameDecision = (a: Decision, b: Decision) =>
  a.measureId === b.measureId &&
  (a.districtId ?? null) === (b.districtId ?? null);
/** Partial-plan feedback from dataset constraints. Final authority is calculateScenario. */
export function planIssue(decisions: Decision[]): Issue | null {
  if (decisions.length > DECISIONS_REQUIRED)
    return { key: "tooMany", count: DECISIONS_REQUIRED };
  if (new Set(decisions.map((d) => d.measureId)).size !== decisions.length)
    return { key: "duplicate" };
  for (const d of decisions)
    if (
      MEASURE_MAP[d.measureId].scope === "Район" &&
      !DISTRICTS.some((district) => district.id === d.districtId)
    )
      return { key: "districtRequired" };
  if (costOf(decisions) > BUDGET)
    return { key: "insufficient", amount: costOf(decisions) - BUDGET };
  const counts: Record<string, number> = {};
  for (const d of decisions) {
    const direction = MEASURE_MAP[d.measureId].direction;
    counts[direction] = (counts[direction] ?? 0) + 1;
    if (counts[direction] > MAX_PER_DIRECTION)
      return { key: "directionLimit", direction, count: MAX_PER_DIRECTION };
  }
  for (const rule of INCOMPATIBILITIES) {
    const a = decisions.find((d) => d.measureId === rule.pair[0]),
      b = decisions.find((d) => d.measureId === rule.pair[1]);
    if (a && b && (!rule.sameDistrictOnly || a.districtId === b.districtId))
      return {
        key:
          rule.pair[0] === "M1"
            ? "conflictTransport"
            : rule.pair[0] === "M4"
              ? "conflictLand"
              : "conflictHeat",
      };
  }
  return null;
}
type RequestState<T> = {
  status: "idle" | "loading" | "ready" | "error";
  data?: T;
  error?: Issue;
};
export function useGame() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState<Issue | null>(null);
  const [advisor, setAdvisor] = useState<RequestState<SwapSuggestion | null>>({
    status: "idle",
  });
  const [explanation, setExplanation] = useState<
    RequestState<ExplanationResult>
  >({ status: "idle" });
  const revision = useRef(0),
    active = useRef<Partial<Record<"improve" | "explain", AbortController>>>(
      {},
    );
  const invalidate = useCallback(() => {
    revision.current++;
    Object.values(active.current).forEach((c) => c?.abort());
    active.current = {};
    setResult(null);
    setAdvisor({ status: "idle" });
    setExplanation({ status: "idle" });
    setError(null);
  }, []);
  useEffect(
    () => () => {
      revision.current++;
      Object.values(active.current).forEach((c) => c?.abort());
    },
    [],
  );
  function change(next: Decision[]) {
    invalidate();
    setDecisions(next);
  }
  function add(decision: Decision) {
    const issue = planIssue([...decisions, decision]);
    if (issue) {
      setError(issue);
      return false;
    }
    change([...decisions, decision]);
    return true;
  }
  function calculate(next = decisions) {
    invalidate();
    const scenario = calculateScenario(next);
    if (!scenario.valid) {
      setError(engineIssue(scenario.code, next));
      return false;
    }
    setResult(scenario);
    return true;
  }
  function loadExample() {
    change(EXAMPLE.map((d) => ({ ...d })));
    calculate(EXAMPLE);
  }
  async function request(kind: "improve" | "explain") {
    if (!result || active.current[kind]) return;
    const controller = new AbortController(),
      version = revision.current;
    active.current[kind] = controller;
    const timeout = setTimeout(() => controller.abort(), 25000);
    if (kind === "improve") setAdvisor({ status: "loading" });
    else setExplanation({ status: "loading" });
    try {
      const response = await fetch(`/api/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisions }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Сервис временно недоступен.");
      if (version !== revision.current) return;
      if (kind === "improve") {
        if (!("suggestion" in data))
          throw new Error("Советник временно недоступен.");
        setAdvisor({ status: "ready", data: data.suggestion });
      } else {
        if (
          typeof data.explanation !== "string" ||
          !["offline-template", "openai", "anthropic"].includes(data.source)
        )
          throw new Error("Не удалось прочитать объяснение.");
        setExplanation({ status: "ready", data });
      }
    } catch {
      if (version !== revision.current) return;
      const issue: Issue = {
        key: controller.signal.aborted ? "timeout" : "serviceError",
      };
      if (kind === "improve") setAdvisor({ status: "error", error: issue });
      else setExplanation({ status: "error", error: issue });
    } finally {
      clearTimeout(timeout);
      if (active.current[kind] === controller) delete active.current[kind];
    }
  }
  function applySuggestion() {
    const suggestion = advisor.data;
    if (!suggestion) return null;
    const index = decisions.findIndex((d) =>
      sameDecision(d, suggestion.removed),
    );
    if (index < 0) {
      setAdvisor({
        status: "error",
        error: { key: "stale" },
      });
      return null;
    }
    const next = decisions.map((d, i) => (i === index ? suggestion.added : d));
    const scenario = calculateScenario(next);
    if (!scenario.valid) {
      setAdvisor({ status: "error", error: engineIssue(scenario.code, next) });
      return null;
    }
    change(next);
    setResult(scenario);
    return suggestion.added;
  }
  return {
    decisions,
    result,
    error,
    advisor,
    explanation,
    add,
    calculate,
    loadExample,
    request,
    applySuggestion,
    remove: (decision: Decision) =>
      change(decisions.filter((d) => !sameDecision(d, decision))),
    reset: () => change([]),
  };
}
