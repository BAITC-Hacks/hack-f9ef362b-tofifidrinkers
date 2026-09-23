import { BUDGET, DECISIONS_REQUIRED, DISTRICTS, INDICATORS, INCOMPATIBILITIES, MAX_PER_DIRECTION, MEASURES, MEASURE_MAP } from "./data";
import { findBestSingleSwap } from "./improve";
import { Decision, ScenarioResult } from "./engine";
import { computeBaseline } from "./engine";

export interface ExplainSummary {
  indicatorDefinitions: typeof INDICATORS;
  availableMeasures: typeof MEASURES;
  rules: { budget: number; decisions: number; maxPerDirection: number; incompatibilities: typeof INCOMPATIBILITIES };
  verifiedImprovement: { removed: string; added: string; score: number; scoreDelta: number; cost: number; costDelta: number } | null;
  score: number;
  baseScore: number;
  scoreDelta: number;
  cost: number;
  budgetLeft: number;
  dAvg: number;
  worstDistrict: { name: string; score: number };
  nCrit: number;
  criticalPairs: { district: string; indicator: string }[];
  directionsUsed: Record<string, number>;
  synergiesApplied: { pair: string[]; district: string; indicator: string; amount: number }[];
  decisions: { measureId: string; name: string; direction: string; district?: string; cost: number }[];
  topGains: { district: string; indicator: string; delta: number }[];
  topDrops: { district: string; indicator: string; delta: number }[];
}

export function buildSummary(decisions: Decision[], scenario: ScenarioResult): ExplainSummary {
  const baseline = computeBaseline();

  const deltas: { district: string; indicator: string; delta: number }[] = [];
  for (const d of scenario.districts) {
    for (const i of d.indicators) {
      if (Math.abs(i.delta) > 0.01) {
        deltas.push({ district: d.name, indicator: i.indicator, delta: Math.round(i.delta * 10) / 10 });
      }
    }
  }
  deltas.sort((a, b) => b.delta - a.delta);
  const topGains = deltas.filter((d) => d.delta > 0).slice(0, 5);
  const topDrops = deltas.slice(-3).filter((d) => d.delta < 0).reverse();
  const improvement = findBestSingleSwap(decisions);
  const label = (d: Decision) => `${MEASURE_MAP[d.measureId].name} — ${DISTRICTS.find((district) => district.id === d.districtId)?.name ?? "Весь город"}`;
  const rounded = (value: number) => Math.round(value * 100) / 100;

  return {
    indicatorDefinitions: INDICATORS,
    availableMeasures: MEASURES,
    rules: { budget: BUDGET, decisions: DECISIONS_REQUIRED, maxPerDirection: MAX_PER_DIRECTION, incompatibilities: INCOMPATIBILITIES },
    verifiedImprovement: improvement ? {
      removed: label(improvement.removed), added: label(improvement.added),
      score: rounded(improvement.scenario.score), scoreDelta: rounded(improvement.scoreDelta),
      cost: improvement.scenario.cost, costDelta: improvement.costDelta,
    } : null,
    score: Math.round(scenario.score * 100) / 100,
    baseScore: Math.round(baseline.score * 100) / 100,
    scoreDelta: Math.round((scenario.score - baseline.score) * 100) / 100,
    cost: scenario.cost,
    budgetLeft: scenario.budgetLeft,
    dAvg: Math.round(scenario.dAvg * 100) / 100,
    worstDistrict: { name: scenario.worstDistrict.name, score: Math.round(scenario.worstDistrict.score * 100) / 100 },
    nCrit: scenario.nCrit,
    criticalPairs: scenario.criticalPairs.map((c) => ({ district: c.district, indicator: c.indicator })),
    directionsUsed: scenario.directionsUsed,
    synergiesApplied: scenario.synergiesApplied.map((s) => ({ pair: s.pair, district: s.district, indicator: s.indicator, amount: s.amount })),
    decisions: decisions.map((d) => {
      const m = MEASURE_MAP[d.measureId];
      return { measureId: m.id, name: m.name, direction: m.direction, district: DISTRICTS.find((district) => district.id === d.districtId)?.name ?? "Весь город", cost: m.cost };
    }),
    topGains,
    topDrops,
  };
}

function fmt(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(1);
}

/** Детерминированное объяснение по шаблону — работает без LLM и без сети, на основе реальных цифр сценария. */
export function buildOfflineExplanation(s: ExplainSummary): string {
  const lines: string[] = [];

  lines.push(
    `Итоговый Astana Quality of Life Score: ${s.score.toFixed(2)} (база без решений — ${s.baseScore.toFixed(2)}, изменение ${s.scoreDelta >= 0 ? "+" : ""}${s.scoreDelta.toFixed(2)}).`
  );
  lines.push(
    `Потрачено ${s.cost} из 100 у.е. бюджета (остаток ${s.budgetLeft}). Средневзвешенная оценка города D_avg = ${s.dAvg.toFixed(2)}, самый слабый район — ${s.worstDistrict.name} (${s.worstDistrict.score.toFixed(2)}).`
  );

  if (s.nCrit > 0) {
    const pairs = s.criticalPairs.map((c) => `${c.district}/${c.indicator}`).join(", ");
    lines.push(`Критических значений (< 40) осталось ${s.nCrit}: ${pairs}. Каждое снимает 1 балл со Score.`);
  } else {
    lines.push("Критических значений (< 40) не осталось — штраф за провалы не начисляется.");
  }

  const directions = Object.entries(s.directionsUsed)
    .map(([dir, n]) => `${dir} (${n})`)
    .join(", ");
  lines.push(`Задействованные направления: ${directions}.`);

  if (s.topGains.length > 0) {
    const gains = s.topGains.map((g) => `${g.district}/${g.indicator} ${fmt(g.delta)}`).join(", ");
    lines.push(`Сильные стороны сценария — наибольший рост показателей: ${gains}.`);
  }

  if (s.topDrops.length > 0) {
    const drops = s.topDrops.map((g) => `${g.district}/${g.indicator} ${fmt(g.delta)}`).join(", ");
    lines.push(`Риски: отдельные показатели просели из-за побочных эффектов мер: ${drops}.`);
  }

  if (s.synergiesApplied.length > 0) {
    const syn = s.synergiesApplied.map((sy) => `${sy.pair.join("+")} → ${sy.indicator} +${sy.amount} в районе ${sy.district}`).join("; ");
    lines.push(`Сработали синергии: ${syn}.`);
  } else {
    lines.push("Ни одна пара синергий не сработала. Добавление мер требует повторной проверки бюджета и совместимости.");
  }

  if (s.budgetLeft > 15) {
    lines.push(`Осталось ${s.budgetLeft} у.е. неиспользованного бюджета — эти деньги не сгорают, но и не приносят пользы; стоит рассмотреть более дорогую меру вместо одной из выбранных.`);
  }

  const recommendation = s.verifiedImprovement;
  lines.push(recommendation
    ? `Проверенная замена: убрать «${recommendation.removed}», добавить «${recommendation.added}». Новый Score ${recommendation.score.toFixed(2)} (+${recommendation.scoreDelta.toFixed(2)}), стоимость ${recommendation.cost} у.е. Это улучшение одной заменой, а не глобальный оптимум.`
    : "Среди допустимых замен одного решения улучшение не найдено. Это не доказывает глобальную оптимальность набора.");
  lines.push("Самый слабый район определяет 30% Score; средний балл города — 70%. Каждое значение ниже 40 дополнительно снижает Score на один балл. Данные синтетические, результат не является прогнозом реального развития города.");

  return lines.join("\n\n");
}

const SYSTEM_PROMPT = `Ты — AI-советник акима в симуляторе управления городом «Аким на 5 часов» (Astana Innovations, HackAlem AI).
Тебе дают уже посчитанный численно результат сценария (JSON): итоговый Astana Quality of Life Score, вклад по районам и показателям, бюджет, критические значения, синергии.
Твоя задача — только объяснять и советовать на основе присланных чисел. Никогда не пересчитывай и не выдумывай цифры, используй ровно те, что даны.
Расшифровывай показатели по indicatorDefinitions. availableMeasures и rules задают каталог и ограничения. Конкретную замену предлагай только из verifiedImprovement: её уже проверил расчётный движок. Если verifiedImprovement=null, скажи, что улучшения одной заменой не найдено; не объявляй глобальный оптимум и не придумывай другие замены. Не давай прогнозов реального города по синтетическим данным.
Пиши по-русски, кратко и по делу, для городского управленца: 1) что получилось и почему (2-3 предложения), 2) сильные стороны сценария, 3) риски и слабые места, 4) 1-2 конкретные рекомендации по улучшению набора решений. Без markdown-заголовков, простым текстом абзацами.`;

export const PROVIDER_TIMEOUT_MS = 8_000;

async function callAnthropic(summary: ExplainSummary): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("no key");
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(summary) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}`);
  const data = await res.json();
  const text = data?.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";
  if (typeof text !== "string" || !text.trim()) throw new Error("Empty response from Anthropic");
  return text;
}

async function callOpenAI(summary: ExplainSummary): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("no key");
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(summary) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (typeof text !== "string" || !text.trim()) throw new Error("Empty response from OpenAI");
  return text;
}

export interface ExplanationResult {
  explanation: string;
  source: "anthropic" | "openai" | "offline-template";
}

export async function explainScenario(decisions: Decision[], scenario: ScenarioResult): Promise<ExplanationResult> {
  const summary = buildSummary(decisions, scenario);

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return { explanation: await callAnthropic(summary), source: "anthropic" };
    } catch (e) {
      console.error("Anthropic explain failed, falling back to offline template:", e);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      return { explanation: await callOpenAI(summary), source: "openai" };
    } catch (e) {
      console.error("OpenAI explain failed, falling back to offline template:", e);
    }
  }

  return { explanation: buildOfflineExplanation(summary), source: "offline-template" };
}
