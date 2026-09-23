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
export const locationOf = (d: Decision) =>
  DISTRICTS.find((district) => district.id === d.districtId)?.name ??
  "Весь город";
/** Partial-plan feedback from dataset constraints. Final authority is calculateScenario. */
export function planIssue(decisions: Decision[]): string | null {
  if (decisions.length > DECISIONS_REQUIRED)
    return `В плане уже ${DECISIONS_REQUIRED} решений. Сначала отмените одно.`;
  if (new Set(decisions.map((d) => d.measureId)).size !== decisions.length)
    return "Мера уже выбрана. Отмените её, чтобы перенести в другой район.";
  for (const d of decisions)
    if (
      MEASURE_MAP[d.measureId].scope === "Район" &&
      !DISTRICTS.some((district) => district.id === d.districtId)
    )
      return "Выберите район для этой меры.";
  if (costOf(decisions) > BUDGET)
    return `Не хватает ${costOf(decisions) - BUDGET} у.е. бюджета. Отмените или замените решение.`;
  const counts: Record<string, number> = {};
  for (const d of decisions) {
    const direction = MEASURE_MAP[d.measureId].direction;
    counts[direction] = (counts[direction] ?? 0) + 1;
    if (counts[direction] > MAX_PER_DIRECTION)
      return `В направлении «${direction}» допустимо не более ${MAX_PER_DIRECTION} решений.`;
  }
  for (const rule of INCOMPATIBILITIES) {
    const a = decisions.find((d) => d.measureId === rule.pair[0]),
      b = decisions.find((d) => d.measureId === rule.pair[1]);
    if (a && b && (!rule.sameDistrictOnly || a.districtId === b.districtId))
      return rule.reason;
  }
  return null;
}
type RequestState<T> = {
  status: "idle" | "loading" | "ready" | "error";
  data?: T;
  error?: string;
};
export function useGame() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState("");
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
    setError("");
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
      setError(scenario.reason ?? "Не удалось рассчитать сценарий.");
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
    } catch (e) {
      if (version !== revision.current) return;
      const message = controller.signal.aborted
        ? "Сервис не ответил вовремя. Попробуйте ещё раз."
        : e instanceof Error
          ? e.message
          : "Ошибка запроса. Попробуйте ещё раз.";
      if (kind === "improve") setAdvisor({ status: "error", error: message });
      else setExplanation({ status: "error", error: message });
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
        error: "Решение для замены уже изменилось. Повторите поиск.",
      });
      return null;
    }
    const next = decisions.map((d, i) => (i === index ? suggestion.added : d));
    const scenario = calculateScenario(next);
    if (!scenario.valid) {
      setAdvisor({ status: "error", error: scenario.reason });
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
