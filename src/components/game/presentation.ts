import {
  BUDGET,
  DECISIONS_REQUIRED,
  DISTRICTS,
  MAX_PER_DIRECTION,
  MEASURE_MAP,
} from "@/lib/data";
import type { Decision, ScenarioResult, ViolationCode } from "@/lib/engine";
import {
  districtName,
  directions,
  indicatorNames,
  LOCALES,
  measureNames,
  select,
  translator,
  type Locale,
  type MessageKey,
} from "./i18n";
// Presentation only. Internal costs and every engine calculation remain unchanged.
// Pending explicit scale agreement; this status must remain visible in the game.
export const MONEY_SCALE = {
  tengePerUnit: 10_000_000,
  approved: false,
} as const;
export const money = (units: number, locale: Locale) =>
  new Intl.NumberFormat(LOCALES[locale], {
    style: "currency",
    currency: "KZT",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(units * MONEY_SCALE.tengePerUnit);
export const number = (value: number, locale: Locale, digits = 2) =>
  new Intl.NumberFormat(LOCALES[locale], {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
export const signed = (value: number, locale: Locale) =>
  `${value >= 0 ? "+" : ""}${number(value, locale)}`;
export const locationOf = (d: Decision, locale: Locale) =>
  d.districtId
    ? districtName(d.districtId, locale)
    : translator(locale)("entireCity");
export type Issue = {
  key: MessageKey;
  amount?: number;
  direction?: keyof typeof directions;
  count?: number;
  required?: number;
};
export function issueText(issue: Issue, locale: Locale) {
  return translator(locale)(issue.key, {
    money: money(issue.amount ?? 0, locale),
    direction: issue.direction
      ? select(directions[issue.direction], locale)
      : "",
    count: issue.count ?? MAX_PER_DIRECTION,
    required: issue.required ?? DECISIONS_REQUIRED,
  });
}
export function engineIssue(
  code: ViolationCode | undefined,
  decisions: Decision[],
): Issue {
  if (code === "DECISION_COUNT")
    return {
      key: "countError",
      count: decisions.length,
      required: DECISIONS_REQUIRED,
    };
  if (code === "BUDGET_EXCEEDED")
    return {
      key: "insufficient",
      amount:
        decisions.reduce((n, d) => n + MEASURE_MAP[d.measureId].cost, 0) -
        BUDGET,
    };
  if (code === "DISTRICT_REQUIRED" || code === "UNKNOWN_DISTRICT")
    return { key: "districtRequired" };
  return { key: "invalid" };
}
export function analyse(decisions: Decision[], scenario: ScenarioResult) {
  const spending = DISTRICTS.map((d) => ({
    id: d.id,
    cost: decisions
      .filter((p) => p.districtId === d.id)
      .reduce((sum, p) => sum + MEASURE_MAP[p.measureId].cost, 0),
  }));
  const citywide = decisions
    .filter((d) => !d.districtId)
    .reduce((sum, d) => sum + MEASURE_MAP[d.measureId].cost, 0);
  const maximum = Math.max(0, ...spending.map((d) => d.cost));
  const concentrated = spending.filter(
    (d) => d.cost === maximum && maximum > 0,
  );
  const districts = scenario.districts.map((d) => ({
    ...d,
    change: d.finalScore - d.baseScore,
    category: (d.finalScore - d.baseScore >= 1
      ? "gains"
      : d.finalScore - d.baseScore <= -1
        ? "drops"
        : "unchanged") as "gains" | "drops" | "unchanged",
  }));
  const losses = districts.flatMap((d) =>
    d.indicators
      .filter((i) => i.delta < -1e-8)
      .map((i) => ({
        districtId: d.districtId,
        indicator: i.indicator,
        delta: i.delta,
      })),
  );
  return {
    spending,
    citywide,
    concentrated,
    districts,
    losses,
    allImproved:
      districts.length === DISTRICTS.length &&
      districts.every((d) => d.change > 1e-8),
  };
}
/** Unstructured provider prose has no monetary metadata. Do not guess which numbers to convert.
 * Exclude financial paragraphs; the structured local budget always supplies the amounts.
 * Offline-template responses are presented from local structured data, never relabelled as AI.
 */
export function nonFinancialRussianExplanation(text: string) {
  const paragraphs = text.split(/\n\s*\n/);
  const financial =
    /у\.?\s*е\.?|тенге|₸|KZT|бюджет|стоим|потрат|потрач|расход|сумм|ден[еь]г|финанс|миллион|миллиард|\bмлн\b|\bмлрд\b|обош|стоит|остаток|дешев|дорог|budget|cost|spent|spend|remaining|million|billion/i;
  const kept = paragraphs.filter((p) => !financial.test(p));
  const humanised = kept
    .join("\n\n")
    .replace(/\bM(?:1[0-4]|[1-9])\b/g, (id) =>
      select(measureNames[id as keyof typeof measureNames], "ru"),
    )
    .replace(/\b[TESBC][12]\b/g, (id) =>
      select(indicatorNames[id as keyof typeof indicatorNames], "ru"),
    )
    .replace(
      /Astana Quality of Life Score|\bScore\b/g,
      "Индекс качества жизни",
    );
  return { text: humanised, hidden: kept.length !== paragraphs.length };
}
