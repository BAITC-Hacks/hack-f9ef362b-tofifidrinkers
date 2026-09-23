import {
  BUDGET,
  CRITICAL_THRESHOLD,
  DISTRICTS,
  MEASURES,
  MEASURE_MAP,
} from "./data";
import { computeBaseline, type Decision, type ScenarioResult } from "./engine";
import { findBestSingleSwap } from "./improve";
import { buildSummary, callAnthropic, callOpenAI } from "./explain";
import {
  districtName,
  indicatorNames,
  measureNames,
  select,
  type Locale,
} from "@/components/game/i18n";

import { parseReport, type FinalReportResult } from "./reportContract";

export function buildReportContext(
  decisions: Decision[],
  scenario: ScenarioResult,
  language: Locale,
) {
  const baseline = computeBaseline();
  const suggestion = findBestSingleSwap(decisions);
  const allocation = (plan: Decision[]) => ({
    districts: DISTRICTS.map((d) => ({
      districtId: d.id,
      cost: plan
        .filter((p) => p.districtId === d.id)
        .reduce((sum, p) => sum + MEASURE_MAP[p.measureId].cost, 0),
    })),
    citywide: plan
      .filter((p) => MEASURE_MAP[p.measureId].scope === "Город")
      .reduce((sum, p) => sum + MEASURE_MAP[p.measureId].cost, 0),
  });
  const nextPlan = suggestion
    ? decisions.map((d) =>
        d.measureId === suggestion.removed.measureId &&
        (d.districtId ?? null) === (suggestion.removed.districtId ?? null)
          ? suggestion.added
          : d,
      )
    : null;
  return {
    ...buildSummary(decisions, scenario),
    language,
    budget: BUDGET,
    criticalThreshold: CRITICAL_THRESHOLD,
    monetaryUnits:
      "Internal simulation units. Do not quote monetary amounts in narrative; the interface formats all amounts separately in KZT.",
    baseline,
    scenario,
    allocation: allocation(decisions),
    verifiedSwap: suggestion
      ? { ...suggestion, allocation: allocation(nextPlan!) }
      : null,
    names: {
      districts: DISTRICTS.map((d) => ({
        id: d.id,
        name: districtName(d.id, language),
      })),
      indicators: Object.entries(indicatorNames).map(([id, names]) => ({
        id,
        name: select(names, language),
      })),
      projects: MEASURES.map((m) => ({
        id: m.id,
        name: select(measureNames[m.id], language),
      })),
    },
  };
}

export async function explainReport(
  decisions: Decision[],
  scenario: ScenarioResult,
  language: Locale,
): Promise<FinalReportResult> {
  const context = buildReportContext(decisions, scenario, language);
  const prompt = `You explain a synthetic city-budget game to residents respectfully. Write entirely in ${{ ru: "Russian", kk: "Kazakh", en: "English" }[language]} using supplied localized names, never technical identifiers. Evaluate the PLAN, never the player's character or intelligence.
Return ONLY a JSON object: summary, quality, priority, reach, budget, nextStep (short strings), strengths and tradeoffs (arrays of one to four short strings). No markdown fences.
All numbers shown to players come directly from the engine in a separate UI. Your prose MUST contain NO numerals, numeric ratings, monetary amounts, project codes or invented facts. Explain only the supplied baseline, scenario, allocation and verifiedSwap. Do not recompute quality scores.
quality: whether life improved; priority: initial needs and critical conditions versus support; reach: which districts benefited or barely changed; budget: spending versus benefits and constraints. Fairness is not equal expenditure. Concentrated spending may be justified by severe initial need. Citywide spending is counted ONCE; its district effects are already in scenario. Highlight any losses and remaining critical indicators even if overall score rose. Never invent fairness scores or real-world forecasts.
nextStep: a concrete reconsideration based ONLY on verifiedSwap. That swap maximizes the overall index, NOT fairness; explain distribution tradeoffs using both scenarios. If null, no improving single swap was found, not a global optimum. Other suggestions must be clearly ideas needing a new calculation, without guaranteed effects. Do not invent projects or substitutions. Keep each field to one or two plain sentences.`;
  const base = { format: "report" as const, language };
  for (const [source, key, call] of [
    ["anthropic", process.env.ANTHROPIC_API_KEY, callAnthropic],
    ["openai", process.env.OPENAI_API_KEY, callOpenAI],
  ] as const) {
    if (!key) continue;
    try {
      return {
        ...base,
        source,
        narrative: parseReport(await call(context, prompt)),
      };
    } catch {
      // Provider payloads can contain credentials or user data; never log them.
    }
  }
  return {
    ...base,
    source: "offline-template",
    narrative: null,
    fallbackReason:
      process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY
        ? "provider-unavailable"
        : "not-configured",
  };
}
