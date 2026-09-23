"use client";

import { useMemo, useState } from "react";
import {
  BUDGET,
  DECISIONS_REQUIRED,
  DISTRICTS,
  Direction,
  DistrictId,
  MAX_PER_DIRECTION,
  MEASURES,
  Measure,
} from "@/lib/data";
import { calculateScenario, Decision, ScenarioResult } from "@/lib/engine";
import { SwapSuggestion } from "@/lib/improve";

const DIRECTIONS: Direction[] = ["Транспорт", "Экология", "Соцсфера", "Безопасность", "Сервисы"];

type Selection = Record<string, Decision | undefined>;

function toDecisions(selection: Selection): Decision[] {
  return Object.values(selection).filter((d): d is Decision => Boolean(d));
}

export default function Simulator() {
  const [selection, setSelection] = useState<Selection>({});
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationSource, setExplanationSource] = useState<string | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [showReference, setShowReference] = useState(false);
  const [improveResult, setImproveResult] = useState<{ currentScore: number; suggestion: SwapSuggestion | null } | null>(null);
  const [loadingImprove, setLoadingImprove] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);

  const decisions = useMemo(() => toDecisions(selection), [selection]);
  const cost = decisions.reduce((sum, d) => sum + MEASURES.find((m) => m.id === d.measureId)!.cost, 0);
  const perDirection: Record<string, number> = {};
  for (const d of decisions) {
    const dir = MEASURES.find((m) => m.id === d.measureId)!.direction;
    perDirection[dir] = (perDirection[dir] ?? 0) + 1;
  }

  const outcome = useMemo(() => calculateScenario(decisions), [decisions]);
  const scenario: ScenarioResult | null = decisions.length === DECISIONS_REQUIRED && outcome.valid ? outcome : null;
  const reason = decisions.length === DECISIONS_REQUIRED && !outcome.valid ? outcome.reason : null;

  function toggleMeasure(measure: Measure, districtId?: DistrictId) {
    setExplanation(null);
    setExplanationSource(null);
    setExplainError(null);
    setSelection((prev) => {
      const next = { ...prev };
      if (next[measure.id] && (measure.scope === "Город" || next[measure.id]?.districtId === districtId)) {
        delete next[measure.id];
        return next;
      }
      if (!next[measure.id] && Object.keys(next).length >= DECISIONS_REQUIRED) {
        return prev;
      }
      next[measure.id] = { measureId: measure.id, districtId: measure.scope === "Район" ? districtId : undefined };
      return next;
    });
  }

  function setDistrictFor(measure: Measure, districtId: DistrictId) {
    setExplanation(null);
    setExplanationSource(null);
    setSelection((prev) => ({ ...prev, [measure.id]: { measureId: measure.id, districtId } }));
  }

  async function requestExplanation() {
    if (!scenario) return;
    setLoadingExplain(true);
    setExplainError(null);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decisions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось получить объяснение.");
      setExplanation(data.explanation);
      setExplanationSource(data.source);
    } catch (e) {
      setExplainError(e instanceof Error ? e.message : "Ошибка запроса.");
    } finally {
      setLoadingExplain(false);
    }
  }

  async function requestImprove() {
    if (!scenario) return;
    setLoadingImprove(true);
    setImproveError(null);
    try {
      const res = await fetch("/api/improve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decisions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось найти улучшение.");
      setImproveResult(data);
    } catch (e) {
      setImproveError(e instanceof Error ? e.message : "Ошибка запроса.");
    } finally {
      setLoadingImprove(false);
    }
  }

  function reset() {
    setSelection({});
    setExplanation(null);
    setExplanationSource(null);
    setExplainError(null);
    setImproveResult(null);
    setImproveError(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <Header cost={cost} count={decisions.length} onReset={reset} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          {DIRECTIONS.map((dir) => (
            <DirectionSection
              key={dir}
              direction={dir}
              selection={selection}
              count={perDirection[dir] ?? 0}
              onToggle={toggleMeasure}
              onDistrictChange={setDistrictFor}
              decisionsFull={decisions.length >= DECISIONS_REQUIRED}
            />
          ))}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <SelectionPanel selection={selection} reason={reason ?? null} />
          <button
            onClick={() => setShowReference((v) => !v)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {showReference ? "Скрыть" : "Показать"} исходные данные районов
          </button>
        </aside>
      </div>

      {showReference && <ReferenceTable />}

      {scenario && (
        <ResultsPanel
          scenario={scenario}
          explanation={explanation}
          explanationSource={explanationSource}
          loading={loadingExplain}
          error={explainError}
          onExplain={requestExplanation}
          improveResult={improveResult}
          loadingImprove={loadingImprove}
          improveError={improveError}
          onImprove={requestImprove}
        />
      )}
    </div>
  );
}

function Header({ cost, count, onReset }: { cost: number; count: number; onReset: () => void }) {
  const overBudget = cost > BUDGET;
  return (
    <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
          Astana Innovations · HackAlem AI
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Аким на 5 часов</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          AI-симулятор управления городом — распределите бюджет, примите 5 решений, получите Astana Quality of Life Score.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Pill
          label="Бюджет"
          value={`${cost} / ${BUDGET}`}
          tone={overBudget ? "danger" : cost === BUDGET ? "good" : "neutral"}
        />
        <Pill
          label="Решения"
          value={`${count} / ${DECISIONS_REQUIRED}`}
          tone={count === DECISIONS_REQUIRED ? "good" : "neutral"}
        />
        <button
          onClick={onReset}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Сбросить
        </button>
      </div>
    </header>
  );
}

function Pill({ label, value, tone }: { label: string; value: string; tone: "good" | "danger" | "neutral" }) {
  const toneClasses = {
    good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    neutral: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
  }[tone];
  return (
    <div className={`rounded-lg px-3 py-2 text-sm font-medium ${toneClasses}`}>
      <span className="opacity-70">{label}:</span> {value}
    </div>
  );
}

function DirectionSection({
  direction,
  selection,
  count,
  onToggle,
  onDistrictChange,
  decisionsFull,
}: {
  direction: Direction;
  selection: Selection;
  count: number;
  onToggle: (m: Measure, districtId?: DistrictId) => void;
  onDistrictChange: (m: Measure, districtId: DistrictId) => void;
  decisionsFull: boolean;
}) {
  const measures = MEASURES.filter((m) => m.direction === direction);
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{direction}</h2>
        <span
          className={`text-xs font-medium ${count > MAX_PER_DIRECTION ? "text-red-600" : "text-zinc-500"}`}
        >
          {count} / {MAX_PER_DIRECTION} макс.
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {measures.map((measure) => (
          <MeasureCard
            key={measure.id}
            measure={measure}
            decision={selection[measure.id]}
            disabled={!selection[measure.id] && decisionsFull}
            onToggle={onToggle}
            onDistrictChange={onDistrictChange}
          />
        ))}
      </div>
    </section>
  );
}

function effectLabel(measure: Measure): string {
  return measure.effects.map((e) => `${e.indicator} ${e.amount > 0 ? "+" : ""}${e.amount}`).join(", ");
}

function MeasureCard({
  measure,
  decision,
  disabled,
  onToggle,
  onDistrictChange,
}: {
  measure: Measure;
  decision?: Decision;
  disabled: boolean;
  onToggle: (m: Measure, districtId?: DistrictId) => void;
  onDistrictChange: (m: Measure, districtId: DistrictId) => void;
}) {
  const selected = Boolean(decision);
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-3 transition-colors ${
        selected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
          : disabled
            ? "border-zinc-200 opacity-50 dark:border-zinc-800"
            : "border-zinc-200 hover:border-blue-300 dark:border-zinc-800"
      }`}
    >
      <button
        disabled={disabled && !selected}
        onClick={() => onToggle(measure, measure.scope === "Район" ? decision?.districtId ?? DISTRICTS[0].id : undefined)}
        className="flex items-start justify-between gap-2 text-left"
      >
        <div>
          <p className="text-sm font-semibold">
            {measure.id} · {measure.name}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {measure.scope} · стоимость {measure.cost} · лаг {measure.lag} кв. · {effectLabel(measure)}
          </p>
        </div>
        <span
          className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 ${
            selected ? "border-blue-600 bg-blue-600" : "border-zinc-300 dark:border-zinc-600"
          }`}
        />
      </button>
      {selected && measure.scope === "Район" && (
        <select
          value={decision?.districtId ?? DISTRICTS[0].id}
          onChange={(e) => onDistrictChange(measure, e.target.value as DistrictId)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        >
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function SelectionPanel({ selection, reason }: { selection: Selection; reason: string | null }) {
  const decisions = toDecisions(selection);
  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Ваши решения</h3>
      {decisions.length === 0 && <p className="text-sm text-zinc-500">Выберите 5 мероприятий слева.</p>}
      <ul className="flex flex-col gap-2">
        {decisions.map((d) => {
          const measure = MEASURES.find((m) => m.id === d.measureId)!;
          const districtName = d.districtId ? DISTRICTS.find((dd) => dd.id === d.districtId)?.name : "город";
          return (
            <li key={d.measureId} className="text-sm">
              <span className="font-medium">{measure.id}</span> · {measure.name}
              <span className="text-zinc-500"> — {districtName}, {measure.cost} у.е.</span>
            </li>
          );
        })}
      </ul>
      {reason && (
        <p className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
          ⚠ {reason}
        </p>
      )}
    </div>
  );
}

function ReferenceTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
          <tr>
            <th className="p-2">Район</th>
            <th className="p-2">Доля нас.</th>
            <th className="p-2">T1</th>
            <th className="p-2">T2</th>
            <th className="p-2">E1</th>
            <th className="p-2">E2</th>
            <th className="p-2">S1</th>
            <th className="p-2">S2</th>
            <th className="p-2">B1</th>
            <th className="p-2">B2</th>
            <th className="p-2">C1</th>
            <th className="p-2">C2</th>
          </tr>
        </thead>
        <tbody>
          {DISTRICTS.map((d) => (
            <tr key={d.id} className="border-t border-zinc-100 dark:border-zinc-800">
              <td className="p-2 font-medium">
                {d.name}
                <div className="text-xs font-normal text-zinc-500">{d.profile}</div>
              </td>
              <td className="p-2">{(d.populationShare * 100).toFixed(0)}%</td>
              {(["T1", "T2", "E1", "E2", "S1", "S2", "B1", "B2", "C1", "C2"] as const).map((k) => (
                <td key={k} className="p-2">
                  {d.base[k]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultsPanel({
  scenario,
  explanation,
  explanationSource,
  loading,
  error,
  onExplain,
  improveResult,
  loadingImprove,
  improveError,
  onImprove,
}: {
  scenario: ScenarioResult;
  explanation: string | null;
  explanationSource: string | null;
  loading: boolean;
  error: string | null;
  onExplain: () => void;
  improveResult: { currentScore: number; suggestion: SwapSuggestion | null } | null;
  loadingImprove: boolean;
  improveError: string | null;
  onImprove: () => void;
}) {
  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-blue-200 bg-blue-50/40 p-5 dark:border-blue-900 dark:bg-blue-950/20">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-blue-700 dark:text-blue-400">
            Astana Quality of Life Score
          </p>
          <p className="text-5xl font-bold">{scenario.score.toFixed(2)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="D_avg" value={scenario.dAvg.toFixed(2)} />
          <Stat label={`Худший район (${scenario.worstDistrict.name})`} value={scenario.worstDistrict.score.toFixed(2)} />
          <Stat label="Критических пар" value={String(scenario.nCrit)} />
          <Stat label="Остаток бюджета" value={String(scenario.budgetLeft)} />
        </div>
      </div>

      {scenario.synergiesApplied.length > 0 && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          ✓ Сработали синергии:{" "}
          {scenario.synergiesApplied.map((s) => `${s.pair.join("+")} → ${s.indicator} +${s.amount} (${s.district})`).join("; ")}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {scenario.districts.map((d) => (
          <DistrictBar key={d.districtId} name={d.name} before={d.baseScore} after={d.finalScore} />
        ))}
      </div>

      <div>
        <button
          onClick={onExplain}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "AI анализирует…" : explanation ? "Обновить AI-анализ" : "Получить AI-анализ решения"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {explanation && (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-relaxed whitespace-pre-line dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Источник: {sourceLabel(explanationSource)}
            </div>
            {explanation}
          </div>
        )}
      </div>

      <div>
        <button
          onClick={onImprove}
          disabled={loadingImprove}
          className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:text-blue-400 dark:hover:bg-blue-950/40"
        >
          {loadingImprove ? "Ищем замену…" : "Улучшить одной заменой"}
        </button>
        {improveError && <p className="mt-2 text-sm text-red-600">{improveError}</p>}
        {improveResult && (
          <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            {improveResult.suggestion ? (
              <p>
                Замените{" "}
                <span className="font-medium">{improveResult.suggestion.removed.measureId}</span> на{" "}
                <span className="font-medium">{improveResult.suggestion.added.measureId}</span> — новый Score{" "}
                <span className="font-semibold">{improveResult.suggestion.scenario.score.toFixed(2)}</span>{" "}
                ({improveResult.suggestion.scoreDelta >= 0 ? "+" : ""}
                {improveResult.suggestion.scoreDelta.toFixed(2)} к текущему {improveResult.currentScore.toFixed(2)}).
              </p>
            ) : (
              <p className="text-zinc-500">Среди проверенных замен одного решения улучшений не найдено.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function sourceLabel(source: string | null): string {
  if (source === "anthropic") return "Claude (Anthropic API)";
  if (source === "openai") return "GPT (OpenAI API)";
  return "офлайн-шаблон по расчётным данным";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 dark:bg-zinc-950">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function DistrictBar({ name, before, after }: { name: string; before: number; after: number }) {
  const max = 100;
  const delta = after - before;
  return (
    <div className="rounded-lg bg-white p-3 text-xs dark:bg-zinc-950">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-medium">{name}</span>
        <span className={delta >= 0 ? "text-emerald-600" : "text-red-600"}>
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="absolute h-2 rounded-full bg-zinc-300 dark:bg-zinc-700" style={{ width: `${(before / max) * 100}%` }} />
        <div className="absolute h-2 rounded-full bg-blue-600" style={{ width: `${(after / max) * 100}%`, opacity: 0.85 }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
        <span>{before.toFixed(1)}</span>
        <span>{after.toFixed(1)}</span>
      </div>
    </div>
  );
}
