"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BUDGET, DECISIONS_REQUIRED, DISTRICTS, HORIZON_QUARTERS, INDICATORS, MAX_PER_DIRECTION, MEASURE_MAP,
} from "@/lib/data";
import type { Measure } from "@/lib/data";
import { calculateScenario, computeBaseline } from "@/lib/engine";
import type { Decision, ScenarioResult } from "@/lib/engine";
import type { SwapSuggestion } from "@/lib/improve";

import CityMap, { AkimPortrait } from "./CityMap";
import type { Destination } from "./CityMap";
import DistrictVisit from "./DistrictVisit";
const EXAMPLE: Decision[] = [
  { measureId: "M7", districtId: "nura" },
  { measureId: "M8", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12" },
  { measureId: "M5", districtId: "saryarka" },
];
const BASELINE = computeBaseline();
const EPSILON = 1e-8;
const REQUEST_TIMEOUT = 30_000;
const button = "rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800";
const primaryButton = "rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50";

type Selection = Partial<Record<Decision["measureId"], Decision>>;
type ImproveResponse = { currentScore: number; suggestion: SwapSuggestion | null };
type Explanation = { explanation: string; source: "openai" | "anthropic" | "offline-template" };
type SwapPreview = { decisions: Decision[]; scenario: ScenarioResult };

function toDecisions(selection: Selection): Decision[] {
  return Object.values(selection).filter((d): d is Decision => Boolean(d));
}
function toSelection(decisions: Decision[]): Selection {
  return Object.fromEntries(decisions.map((d) => [d.measureId, { ...d }]));
}
function sameDecision(a: Decision, b: Decision): boolean {
  return a.measureId === b.measureId && (a.districtId ?? null) === (b.districtId ?? null);
}
function districtLabel(decision: Decision): string {
  if (MEASURE_MAP[decision.measureId]?.scope === "Город") return "Весь город";
  return DISTRICTS.find((d) => d.id === decision.districtId)?.name ?? "Район не выбран";
}
function requestError(error: unknown, fallback: string): string {
  // Browser network/JSON errors are often in English; keep recovery messages clear.
  return error instanceof Error && !(error instanceof TypeError) && !(error instanceof SyntaxError)
    ? error.message : fallback;
}
function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

// Reuse the shared engine; only replace the exact measure-and-district pair.
function previewSwap(current: Decision[], response: ImproveResponse): SwapPreview | null {
  const before = calculateScenario(current);
  if (!before.valid || !Number.isFinite(response.currentScore) || Math.abs(before.score - response.currentScore) > EPSILON) {
    throw new Error("Рекомендация относится к другому сценарию. Запросите её ещё раз.");
  }
  const suggestion = response.suggestion;
  if (suggestion === null) return null;
  if (!suggestion?.removed || !suggestion.added || !suggestion.scenario) {
    throw new Error("Советник вернул неполную рекомендацию. Повторите запрос.");
  }
  const matches = current.filter((d) => sameDecision(d, suggestion.removed));
  if (matches.length !== 1) throw new Error("Решение для замены уже изменилось. Запросите новую рекомендацию.");
  const decisions = current.map((d) => sameDecision(d, suggestion.removed) ? { ...suggestion.added } : { ...d });
  const scenario = calculateScenario(decisions);
  if (!scenario.valid) throw new Error(scenario.reason ?? "Предложенная замена недопустима.");
  if (
    !Number.isFinite(suggestion.scenario.score) || !Number.isFinite(suggestion.scoreDelta) ||
    !Number.isFinite(suggestion.costDelta) ||
    Math.abs(scenario.score - suggestion.scenario.score) > EPSILON ||
    scenario.cost !== suggestion.scenario.cost ||
    Math.abs(scenario.score - before.score - suggestion.scoreDelta) > EPSILON ||
    scenario.cost - before.cost !== suggestion.costDelta || scenario.score - before.score <= EPSILON
  ) throw new Error("Результат рекомендации не совпал с расчётом. Запросите её ещё раз.");
  return { decisions, scenario };
}

export default function Simulator() {
  const [destination, setDestination] = useState<Destination>(null);
  const [selection, setSelection] = useState<Selection>({});
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [improvement, setImprovement] = useState<ImproveResponse | null>(null);
  const [loadingImprove, setLoadingImprove] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const revision = useRef(0);
  const explainRequest = useRef<AbortController | null>(null);
  const improveRequest = useRef<AbortController | null>(null);

  useEffect(() => () => {
    explainRequest.current?.abort();
    improveRequest.current?.abort();
  }, []);

  const decisions = useMemo(() => toDecisions(selection), [selection]);
  const outcome = useMemo(() => calculateScenario(decisions), [decisions]);
  const scenario = outcome.valid ? outcome : null;
  const cost = decisions.reduce((sum, d) => sum + MEASURE_MAP[d.measureId].cost, 0);
  const missingDistrict = decisions.some((d) => MEASURE_MAP[d.measureId].scope === "Район" && !d.districtId);
  const reason = cost > BUDGET ? `Превышен бюджет на ${cost - BUDGET} у.е. Уберите или замените мероприятие.`
    : missingDistrict ? "Укажите район для каждого выбранного районного мероприятия."
    : !outcome.valid ? outcome.reason ?? "Проверьте выбранные решения." : null;

  function updateDecisions(next: Decision[], message: string | null = null) {
    // Invalidate synchronously, before React renders the new selection. Aborting alone
    // is insufficient if an older response has already reached response.json().
    revision.current += 1;
    explainRequest.current?.abort();
    improveRequest.current?.abort();
    explainRequest.current = null;
    improveRequest.current = null;
    setExplanation(null);
    setExplainError(null);
    setLoadingExplain(false);
    setImprovement(null);
    setImproveError(null);
    setLoadingImprove(false);
    setNotice(message);
    setSelection(toSelection(next));
  }

  function fundMeasure(measure: Measure, place: Exclude<Destination, null>) {
    const districtId = measure.scope === "Район" && place !== "city" ? place : undefined;
    if (measure.scope === "Район" && !districtId) return;
    const existing = selection[measure.id];
    const decision: Decision = { measureId: measure.id, ...(districtId ? { districtId } : {}) };
    if (existing && sameDecision(existing, decision)) {
      updateDecisions(decisions.filter((d) => d.measureId !== measure.id), "Проект убран из плана. Бюджет возвращён.");
      return;
    }
    if (!existing && (decisions.length >= DECISIONS_REQUIRED || cost + measure.cost > BUDGET ||
      decisions.filter((d) => MEASURE_MAP[d.measureId].direction === measure.direction).length >= MAX_PER_DIRECTION)) return;
    const next = existing ? decisions.map((d) => d.measureId === measure.id ? decision : d) : [...decisions, decision];
    updateDecisions(next, `${measure.name}: ${existing ? "перенесено" : "добавлено в план"} · ${districtLabel(decision)}.`);
  }

  async function requestExplanation() {
    if (!scenario || explainRequest.current) return;
    const controller = new AbortController();
    const startedAt = revision.current;
    explainRequest.current = controller;
    setLoadingExplain(true);
    setExplainError(null);
    setExplanation(null);
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT);
    const isCurrent = () => revision.current === startedAt && explainRequest.current === controller;
    try {
      const res = await fetch("/api/explain", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ decisions }), signal: controller.signal,
      });
      const data = await res.json();
      if (!isCurrent() || controller.signal.aborted) return;
      if (!res.ok) throw new Error(data.error ?? "Не удалось получить объяснение.");
      if (typeof data.explanation !== "string" || !data.explanation.trim() ||
        !["openai", "anthropic", "offline-template"].includes(data.source)) {
        throw new Error("Сервис вернул неполное объяснение. Повторите запрос.");
      }
      setExplanation(data);
    } catch (error) {
      if (isCurrent()) setExplainError(timedOut ? "Сервис не ответил за 30 секунд. Повторите запрос." :
        requestError(error, "Не удалось получить объяснение. Проверьте соединение и повторите запрос."));
    } finally {
      clearTimeout(timeout);
      if (isCurrent()) { explainRequest.current = null; setLoadingExplain(false); }
    }
  }

  async function requestImprove() {
    if (!scenario || improveRequest.current) return;
    const controller = new AbortController();
    const startedAt = revision.current;
    improveRequest.current = controller;
    setLoadingImprove(true);
    setImproveError(null);
    setImprovement(null);
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT);
    const isCurrent = () => revision.current === startedAt && improveRequest.current === controller;
    try {
      const res = await fetch("/api/improve", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ decisions }), signal: controller.signal,
      });
      const data = await res.json();
      if (!isCurrent() || controller.signal.aborted) return;
      if (!res.ok) throw new Error(data.error ?? "Советник временно недоступен. Повторите запрос.");
      previewSwap(decisions, data);
      setImprovement(data);
    } catch (error) {
      if (isCurrent()) setImproveError(timedOut ? "Советник не ответил за 30 секунд. Повторите запрос." :
        requestError(error, "Советник временно недоступен. Проверьте соединение и повторите запрос."));
    } finally {
      clearTimeout(timeout);
      if (isCurrent()) { improveRequest.current = null; setLoadingImprove(false); }
    }
  }

  function applySuggestion() {
    if (!improvement?.suggestion) return;
    try {
      const preview = previewSwap(decisions, improvement);
      if (preview) {
        updateDecisions(preview.decisions, "Замена применена. Результат пересчитан; объяснение и рекомендацию можно запросить заново.");
        setDestination(improvement.suggestion.added.districtId ?? "city");
      }
    } catch (error) {
      setImprovement(null);
      setImproveError(error instanceof Error ? error.message : "Не удалось применить замену.");
    }
  }

  return (
    <main lang="ru" className="game-shell">
      <Header cost={cost} count={decisions.length}
        onReset={() => { updateDecisions([]); setDestination(null); }}
        onExample={() => { updateDecisions(EXAMPLE, "Пример загружен и рассчитан. Попробуйте улучшить его одной заменой."); setDestination("nura"); }} />
      <div className="game-intro">
        <div><p className="eyebrow">ВАШ ПЕРВЫЙ ДЕНЬ В РОЛИ АКИМА</p><h1>Ваш город. Ваши решения.</h1><p>Гуляйте по районам, помогайте жителям и создавайте Астану, в которой хочется жить.</p></div>
        <div className="game-mission"><span className="mission-label">ПЛАН НА СЕГОДНЯ</span><div className="decision-dots" aria-label={`Выбрано ${decisions.length} из ${DECISIONS_REQUIRED} решений`}>{Array.from({ length: DECISIONS_REQUIRED }, (_, i) => <span key={i} className={i < decisions.length ? "filled" : ""}>{i < decisions.length ? "✓" : i + 1}</span>)}</div><p>Пять решений, которые меняют город</p></div>
      </div>
      <div className="game-workspace">
        <CityMap destination={destination} decisions={decisions} onVisit={setDestination} />
        <DistrictVisit key={destination ?? "welcome"} destination={destination} decisions={decisions} cost={cost}
          onFund={fundMeasure} onVisit={setDestination} onLeave={() => setDestination(null)} />
      </div>
      <p className="game-notice" role="status">{notice ?? "Начните с прогулки: выберите район на карте или воспользуйтесь готовым примером."}</p>
      <div className="game-plan">
        <SelectionPanel decisions={decisions} reason={reason} valid={Boolean(scenario)}
          onRemove={(decision) => updateDecisions(decisions.filter((d) => !sameDecision(d, decision)))} />
        <div className="plan-note"><div className="plan-avatar"><AkimPortrait /></div><div><span className="eyebrow">СЛОВО АКИМА</span><h2>Каждое решение имеет значение</h2><p>У города общий бюджет. На одно направление можно выбрать максимум две инициативы. Эффекты оцениваются за {HORIZON_QUARTERS} кварталов.</p>{scenario ? <a href="#results" className="game-primary">Посмотреть, что изменилось ↓</a> : <p className="plan-progress">До результата: ещё {Math.max(0, DECISIONS_REQUIRED - decisions.length)} решений{decisions.length === DECISIONS_REQUIRED ? ". Исправьте замечания к плану." : "."}</p>}</div></div>
      </div>
      {scenario && <ResultsPanel scenario={scenario} explanation={explanation} loadingExplain={loadingExplain}
        explainError={explainError} onExplain={requestExplanation} improvement={improvement}
        loadingImprove={loadingImprove} improveError={improveError} onImprove={requestImprove} onApply={applySuggestion} />}
      <details className="game-reference">
        <summary>Заглянуть в городскую статистику</summary>
        <ReferenceTable />
      </details>
      <footer className="game-footer"><span>Аким на 5 часов · Astana Innovations</span><p>Учебная симуляция на синтетических данных. Результаты не являются прогнозом реального развития города.</p></footer>
    </main>
  );
}

function Header({ cost, count, onReset, onExample }: { cost: number; count: number; onReset: () => void; onExample: () => void }) {
  return <header className="game-topbar">
    <a className="game-brand" href="#" aria-label="Аким на 5 часов, в начало"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>аким<small>на 5 часов</small></span></a>
    <div className="game-hud" aria-live="polite"><div className={`hud-budget ${cost > BUDGET ? "is-over" : ""}`}><span className="coin-icon" aria-hidden="true">₸</span><div><span>Бюджет города</span><strong>{BUDGET - cost} <small>у.е.</small></strong><span className="hud-used">Потрачено {cost} / {BUDGET} у.е.</span></div></div><div className="hud-decisions"><span>Решения</span><strong>{count}<small> / {DECISIONS_REQUIRED}</small></strong></div></div>
    <div className="game-actions"><button onClick={onExample}>Загрузить пример</button><button className="reset-game" onClick={onReset}>Сбросить</button><div className="header-portrait"><AkimPortrait /></div></div>
  </header>;
}

function SelectionPanel({ decisions, reason, valid, onRemove }: { decisions: Decision[]; reason: string | null; valid: boolean; onRemove: (d: Decision) => void }) {
  return (
    <section className="plan-list" aria-label="Ваши решения">
      <div className="plan-list-title"><h2>План развития города</h2><span>{decisions.length} / {DECISIONS_REQUIRED}</span></div>
      {decisions.length === 0 && <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">Здесь появятся проекты, которые вы выберете во время прогулки по районам.</p>}
      <ul className="mt-4 flex flex-col gap-4">
        {decisions.map((d) => <li key={d.measureId} className="flex items-start gap-2 text-sm">
          <div className="flex-1"><p className="font-medium">{d.measureId} · {MEASURE_MAP[d.measureId].name}</p><p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{districtLabel(d)} · {MEASURE_MAP[d.measureId].cost} у.е.</p></div>
          <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label={`Убрать ${d.measureId}`} onClick={() => onRemove(d)}>×</button>
        </li>)}
      </ul>
      <p role="status" className={`mt-4 rounded-lg p-3 text-sm ${valid ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200"}`}>
        {valid ? "Сценарий допустим. Результат рассчитан." : reason}
      </p>
      {decisions.length === DECISIONS_REQUIRED && <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">Для выбора другой инициативы сначала уберите одну из пяти.</p>}
    </section>
  );
}

function ResultsPanel({ scenario, explanation, loadingExplain, explainError, onExplain, improvement, loadingImprove, improveError, onImprove, onApply }: {
  scenario: ScenarioResult; explanation: Explanation | null; loadingExplain: boolean; explainError: string | null; onExplain: () => void;
  improvement: ImproveResponse | null; loadingImprove: boolean; improveError: string | null; onImprove: () => void; onApply: () => void;
}) {
  const delta = scenario.score - BASELINE.score;
  const suggestion = improvement?.suggestion;
  return (
    <section id="results" aria-label="Результат сценария" className="game-results flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-lg font-semibold">Результат сценария</h2>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Astana Quality of Life Score</p>
          <p className="mt-2 text-5xl font-bold tabular-nums" data-testid="scenario-score">{scenario.score.toFixed(2)}</p>
          <p className="mt-2 text-sm">Было {BASELINE.score.toFixed(2)} <span className={`ml-2 font-bold ${delta >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`} data-testid="score-delta">{signed(delta)} к исходному</span></p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Средний балл города" value={scenario.dAvg.toFixed(2)} />
          <Stat label={`Слабейший район · ${scenario.worstDistrict.name}`} value={scenario.worstDistrict.score.toFixed(2)} />
          <Stat label="Показателей ниже 40" value={String(scenario.nCrit)} />
          <Stat label="Остаток бюджета" value={`${scenario.budgetLeft} у.е.`} />
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold">Как изменились районы</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">{scenario.districts.map((d) => <DistrictBar key={d.districtId} name={d.name} before={d.baseScore} after={d.finalScore} />)}</div>
      </div>
      {scenario.synergiesApplied.length > 0 && <p className="text-sm text-emerald-800 dark:text-emerald-300">Совместный эффект: {scenario.synergiesApplied.map((s) => `${s.pair.join(" + ")} → ${s.indicator} +${s.amount} (${s.district})`).join("; ")}.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950" aria-label="Советник">
          <h3 className="font-semibold">Улучшить одной заменой</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">Советник ищет допустимую замену одного решения. Это не поиск глобально оптимального бюджета.</p>
          <button className={`${button} mt-4`} disabled={loadingImprove} onClick={onImprove}>{loadingImprove ? "Ищем допустимую замену…" : improveError ? "Повторить поиск" : "Найти улучшение"}</button>
          <div aria-live="polite" aria-busy={loadingImprove}>
            {improveError && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{improveError}</p>}
            {improvement && suggestion === null && <p className="mt-4 text-sm">Среди допустимых замен одного решения улучшение не найдено.</p>}
            {suggestion && <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900"><p className="text-xs text-zinc-600 dark:text-zinc-400">Убрать</p><p className="mt-1 font-medium">{suggestion.removed.measureId} · {MEASURE_MAP[suggestion.removed.measureId].name}</p><p>{districtLabel(suggestion.removed)} · {MEASURE_MAP[suggestion.removed.measureId].cost} у.е.</p></div>
              <div className="rounded-lg bg-emerald-50 p-3 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100"><p className="text-xs">Добавить</p><p className="mt-1 font-medium">{suggestion.added.measureId} · {MEASURE_MAP[suggestion.added.measureId].name}</p><p>{districtLabel(suggestion.added)} · {MEASURE_MAP[suggestion.added.measureId].cost} у.е.</p></div>
              <p>Score: {scenario.score.toFixed(2)} → <strong>{suggestion.scenario.score.toFixed(2)}</strong> ({signed(suggestion.scoreDelta)}).</p>
              <p>Стоимость: {scenario.cost} → <strong>{suggestion.scenario.cost} у.е.</strong> ({suggestion.costDelta >= 0 ? "+" : ""}{suggestion.costDelta}).</p>
              <button className={primaryButton} onClick={onApply}>Применить замену</button>
            </div>}
          </div>
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950" aria-label="AI-объяснение">
          <h3 className="font-semibold">Последствия и компромиссы</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">Объяснение строится по уже рассчитанным данным. При недоступности AI сервис возвращает объяснение по шаблону.</p>
          <button className={`${primaryButton} mt-4`} disabled={loadingExplain} onClick={onExplain}>{loadingExplain ? "Объяснение загружается…" : explainError ? "Повторить запрос объяснения" : explanation ? "Обновить объяснение" : "Получить AI-объяснение"}</button>
          <div aria-live="polite" aria-busy={loadingExplain}>
            {explainError && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{explainError}</p>}
            {explanation && <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <p className="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">Объяснение готово · {sourceLabel(explanation.source)}</p>
              <p className="whitespace-pre-line text-sm leading-relaxed">{explanation.explanation}</p>
            </div>}
          </div>
        </section>
      </div>
    </section>
  );
}

function sourceLabel(source: Explanation["source"]): string {
  if (source === "anthropic") return "Claude · Anthropic API";
  if (source === "openai") return "GPT · OpenAI API";
  return "Офлайн-шаблон по расчётным данным";
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white p-3 dark:bg-zinc-950"><p className="text-xs leading-snug text-zinc-600 dark:text-zinc-400">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>;
}
function DistrictBar({ name, before, after }: { name: string; before: number; after: number }) {
  return <div className="rounded-xl bg-white p-3 dark:bg-zinc-950">
    <div className="mb-3 flex items-center justify-between gap-2 text-sm"><span className="font-semibold">{name}</span><span className={after >= before ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>{signed(after - before)}</span></div>
    <div aria-hidden="true" className="relative h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"><div className="absolute h-2 rounded-full bg-blue-600" style={{ width: `${after}%` }} /><div className="absolute top-0 h-2 border-l-2 border-zinc-800 dark:border-white" style={{ left: `${before}%` }} /></div>
    <p className="mt-2 flex justify-between text-xs text-zinc-600 dark:text-zinc-400"><span>Было {before.toFixed(2)}</span><span>Стало {after.toFixed(2)}</span></p>
  </div>;
}
function ReferenceTable() {
  return <>
    <p className="my-3 text-sm text-zinc-600 dark:text-zinc-400">Все показатели от 0 до 100: больше — лучше. На телефоне таблицу можно прокрутить вбок.</p>
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Таблица исходных данных">
      <table className="w-full min-w-[720px] text-sm">
        <caption className="sr-only">Исходные значения по пяти районам</caption>
        <thead className="bg-zinc-100 text-left dark:bg-zinc-900"><tr><th scope="col" className="p-2">Район</th><th scope="col" className="p-2">Доля населения</th>{INDICATORS.map((i) => <th scope="col" key={i.code} className="p-2" title={i.name}>{i.code}</th>)}</tr></thead>
        <tbody>{DISTRICTS.map((d) => <tr key={d.id} className="border-t border-zinc-200 dark:border-zinc-800"><th scope="row" className="p-2 text-left font-medium">{d.name}</th><td className="p-2">{(d.populationShare * 100).toFixed(0)}%</td>{INDICATORS.map((i) => <td key={i.code} className="p-2">{d.base[i.code]}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <dl className="mt-4 grid gap-2 text-xs text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">{INDICATORS.map((i) => <div key={i.code}><dt className="inline font-semibold">{i.code}: </dt><dd className="inline">{i.name}</dd></div>)}</dl>
  </>;
}
