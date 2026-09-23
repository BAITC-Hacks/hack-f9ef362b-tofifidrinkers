"use client";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BUDGET,
  DECISIONS_REQUIRED,
  DISTRICTS,
  HORIZON_QUARTERS,
  INCOMPATIBILITIES,
  MEASURES,
  MEASURE_MAP,
  SYNERGIES,
  type Measure,
} from "@/lib/data";
import type { Decision } from "@/lib/engine";
import WorldCanvas from "./WorldCanvas";
import ImpactAnalysis from "./ImpactAnalysis";
import { BASELINE, costOf, planIssue, useGame } from "./useGame";
import { useLocale, useStoredValue } from "./useLocale";
import {
  directions,
  districtName,
  indicatorMeanings,
  indicatorNames,
  measureDescriptions,
  measureNames,
  select,
  type Locale,
  type MessageKey,
} from "./i18n";
import {
  analyse,
  issueText,
  locationOf,
  MONEY_SCALE,
  money,
  nonFinancialRussianExplanation,
  number,
  signed,
} from "./presentation";
import type { PlaceId } from "./world";
import styles from "./game.module.css";

type Notice = { key: MessageKey; place?: PlaceId };
export default function Game() {
  const { locale, setLocale, t } = useLocale();
  const game = useGame();
  const [near, setNear] = useState<PlaceId | null>("city");
  const [travel, setTravel] = useState<{ id: PlaceId; serial: number }>({
    id: "city",
    serial: 0,
  });
  const [visit, setVisit] = useState<PlaceId | null>(null);
  const [panelTab, setPanelTab] = useState<"projects" | "indicators">(
    "projects",
  );
  const [sidebar, setSidebar] = useState<"plan" | "result">("plan");
  const [confirm, setConfirm] = useState<Measure | null>(null);
  const [notice, setNotice] = useState<Notice>({ key: "startNotice" });
  const [seenTutorial, setSeenTutorial] = useStoredValue(
    "akim-controls-screen-v2",
    "unseen",
  );
  const tutorial = seenTutorial !== "seen";
  const dialog = useRef<HTMLDialogElement>(null),
    headingId = useId();
  const dismissTutorial = () => setSeenTutorial("seen");
  const placeName = (id: PlaceId | null) =>
    id === "city" ? t("city") : id ? districtName(id, locale) : t("travelling");
  const mName = (id: Measure["id"]) => select(measureNames[id], locale);
  const cost = costOf(game.decisions),
    result = game.result;
  const district = (result ?? BASELINE).districts.find(
    (d) => d.districtId === visit,
  );
  const navigate = (id: PlaceId) => {
    setTravel((previous) => ({ id, serial: previous.serial + 1 }));
    setNotice({ key: "routeNotice", place: id });
  };
  const open = useCallback(() => {
    if (!near) return;
    setVisit(near);
    setPanelTab("projects");
    setConfirm(null);
  }, [near]);
  const close = () => {
    setVisit(null);
    setConfirm(null);
  };
  useEffect(() => {
    if (visit) dialog.current?.showModal();
    else dialog.current?.close();
  }, [visit]);
  const onNear = useCallback((id: PlaceId | null) => {
    setNear(id);
    if (id) setNotice({ key: "arrivalNotice", place: id });
  }, []);
  const worldData = useMemo(
    () => ({
      locale,
      districts: (result ?? BASELINE).districts,
      decisions: game.decisions,
      calculated: !!result,
      synergies: result?.synergiesApplied ?? [],
    }),
    [result, game.decisions, locale],
  );
  const decisionFor = (measure: Measure): Decision => ({
    measureId: measure.id,
    ...(measure.scope === "Район" && visit && visit !== "city"
      ? { districtId: visit }
      : {}),
  });
  const confirmationIssue = confirm
    ? planIssue([...game.decisions, decisionFor(confirm)])
    : null;
  const measures = MEASURES.filter(
    (m) => m.scope === (visit === "city" ? "Город" : "Район"),
  );
  const suggestion = game.advisor.data;
  const currentShare =
    result && result.cost
      ? (Math.max(
          ...analyse(game.decisions, result).spending.map((d) => d.cost),
        ) /
          result.cost) *
        100
      : 0;
  const swappedDecisions = suggestion
    ? game.decisions.map((d) =>
        d.measureId === suggestion.removed.measureId &&
        (d.districtId ?? null) === (suggestion.removed.districtId ?? null)
          ? suggestion.added
          : d,
      )
    : [];
  const nextShare =
    suggestion && suggestion.scenario.cost
      ? (Math.max(
          ...analyse(swappedDecisions, suggestion.scenario).spending.map(
            (d) => d.cost,
          ),
        ) /
          suggestion.scenario.cost) *
        100
      : 0;
  const provider = game.explanation.data
    ? nonFinancialRussianExplanation(game.explanation.data.explanation)
    : null;
  const ruleKey = (first: string): MessageKey =>
    first === "M1"
      ? "conflictTransport"
      : first === "M4"
        ? "conflictLand"
        : "conflictHeat";
  return (
    <main className={styles.game} lang={locale}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            А
          </span>
          <span>
            {t("mayor")}
            <span className={styles.brandSub}>{t("fiveHours")}</span>
          </span>
        </div>
        <label className={styles.language}>
          <span>{t("language")}</span>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            <option value="kk">Қазақша</option>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </label>
        <button
          className={styles.secondary}
          onClick={() => {
            game.loadExample();
            navigate("nura");
            setSidebar("result");
          }}
        >
          {t("demo")} ↗
        </button>
      </header>
      <section className={styles.hud} aria-label={t("budget")}>
        <div className={styles.budgetBlock}>
          <span className={styles.overline}>{t("remaining")}</span>
          <strong key={cost} className={styles.budgetNumber}>
            {money(BUDGET - cost, locale)}
          </strong>
          <span className={styles.muted}>
            {t("of")} {money(BUDGET, locale)}
          </span>
          <div className={styles.budgetTrack}>
            <span
              style={{
                width: `${(Math.max(0, BUDGET - cost) / BUDGET) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className={styles.hudStat}>
          <span className={styles.overline}>{t("planned")}</span>
          <strong className={styles.moneyAmount}>{money(cost, locale)}</strong>
        </div>
        <div className={styles.hudStat}>
          <span className={styles.overline}>{t("decisions")}</span>
          <strong>
            {game.decisions.length}
            <small> / {DECISIONS_REQUIRED}</small>
          </strong>
        </div>
        <div className={styles.hudStatus}>
          <span className={styles.overline}>
            {t(result ? "ready" : "planning")}
          </span>
          <strong>
            {result
              ? `${t("index")}: ${number(result.score, locale)}`
              : t("missionTitle")}
          </strong>
          <span className={styles.muted}>
            {result
              ? `${t("change")}: ${signed(result.score - BASELINE.score, locale)}`
              : t("chooseFive", { count: DECISIONS_REQUIRED })}
          </span>
        </div>
      </section>
      <p className={styles.moneyNote}>
        {t("simulationMoney")}{" "}
        {t(MONEY_SCALE.approved ? "approvedScale" : "proposedScale", {
          money: money(1, locale),
        })}
      </p>
      <div className={styles.layout}>
        <section className={styles.stage} aria-label={t("world")}>
          <div className={styles.mapTop}>
            <span className={styles.mapTitle}>
              <span className={styles.liveDot} /> {placeName(near)}
            </span>
            <span className={styles.mapLegend}>{t("legend")}</span>
          </div>
          <WorldCanvas
            data={worldData}
            travel={travel}
            onNear={onNear}
            onInteract={open}
            paused={!!visit}
          />
          <div className={styles.mission}>
            <span className={styles.overline}>{t("mission")}</span>
            <strong>{t("missionTitle")}</strong>
            <p>{t("tutorial")}</p>
          </div>
          {tutorial && (
            <div
              className={styles.tutorial}
              role="region"
              aria-label={t("controlsShort")}
            >
              <p>{t("controls")}</p>
              <button className={styles.secondary} onClick={dismissTutorial}>
                {t("understood")}
              </button>
            </div>
          )}
          <div className={styles.locationNotice} role="status">
            {t(notice.key, {
              place: notice.place ? placeName(notice.place) : "",
            })}
          </div>
          <div className={styles.interaction}>
            {near ? (
              <button className={styles.primary} onClick={open}>
                <kbd>E</kbd>{" "}
                {near === "city"
                  ? t("enterCity")
                  : t("visit", { place: placeName(near) })}{" "}
                →
              </button>
            ) : (
              <span className={styles.walking}>{t("travelling")}…</span>
            )}
          </div>
          <div className={styles.mapBottom}>
            <span>{t("controlsShort")}</span>
            <span>{t("map")}</span>
          </div>
        </section>
        <aside className={styles.sidebar}>
          <section className={styles.destinations}>
            <div className={styles.sectionHeading}>
              <h2>{t("where")}</h2>
              <span>↗</span>
            </div>
            <p className={styles.muted}>{t("routeHelp")}</p>
            <nav aria-label={t("where")}>
              {[...DISTRICTS.map((d) => d.id), "city" as const].map((id) => (
                <button
                  key={id}
                  className={styles.destination}
                  aria-current={near === id ? "location" : undefined}
                  onClick={() => navigate(id)}
                >
                  <span>{placeName(id)}</span>
                  {id !== "city" &&
                  (result ?? BASELINE).districts
                    .find((d) => d.districtId === id)
                    ?.indicators.some((i) => i.critical) ? (
                    <span className={styles.critical}>!</span>
                  ) : (
                    <span aria-hidden="true">↗</span>
                  )}
                </button>
              ))}
            </nav>
          </section>
          <div className={styles.tabs}>
            <button
              aria-pressed={sidebar === "plan"}
              onClick={() => setSidebar("plan")}
            >
              {t("plan")} <span>{game.decisions.length}</span>
            </button>
            <button
              aria-pressed={sidebar === "result"}
              onClick={() => setSidebar("result")}
            >
              {t("impact")}
            </button>
          </div>
          <div className={styles.sidebarContent}>
            {sidebar === "plan" ? (
              <>
                {!game.decisions.length && (
                  <div className={styles.empty}>
                    <span aria-hidden="true">✦</span>
                    <h3>{t("emptyTitle")}</h3>
                    <p>{t("emptyHelp")}</p>
                    <button
                      className={styles.secondary}
                      onClick={() => navigate("nura")}
                    >
                      {t("goNura")} →
                    </button>
                  </div>
                )}
                <ol className={styles.planList}>
                  {game.decisions.map((d, i) => (
                    <li key={`${d.measureId}-${d.districtId ?? "city"}`}>
                      <span className={styles.planIndex}>{i + 1}</span>
                      <div>
                        <small>{locationOf(d, locale)}</small>
                        <strong>{mName(d.measureId)}</strong>
                        <span>
                          {money(MEASURE_MAP[d.measureId].cost, locale)}
                        </span>
                      </div>
                      <button
                        className={styles.remove}
                        aria-label={`${t("remove")}: ${mName(d.measureId)} — ${locationOf(d, locale)}`}
                        onClick={() => game.remove(d)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ol>
                {game.decisions.length > 0 && (
                  <button
                    className={styles.textButton}
                    onClick={() => {
                      game.reset();
                      setNotice({ key: "resetNotice" });
                    }}
                  >
                    {t("clear")}
                  </button>
                )}
              </>
            ) : result ? (
              <div className={styles.results}>
                <p className={styles.overline}>{t("index")}</p>
                <div className={styles.resultScore}>
                  <span>{number(BASELINE.score, locale)} →</span>
                  <strong>{number(result.score, locale)}</strong>
                  <em>{signed(result.score - BASELINE.score, locale)}</em>
                </div>
                <p className={styles.muted}>{t("indexHelp")}</p>
                <p className={styles.muted}>
                  {t("cost")}: {money(result.cost, locale)}.{" "}
                  {t("criticalLeft", { count: result.nCrit })}
                </p>
                <ImpactAnalysis
                  decisions={game.decisions}
                  result={result}
                  locale={locale}
                />
                <div className={styles.advisor}>
                  <h3>{t("advisor")}</h3>
                  <p className={styles.muted}>{t("advisorHelp")}</p>
                  <button
                    className={styles.secondary}
                    disabled={game.advisor.status === "loading"}
                    onClick={() => game.request("improve")}
                  >
                    {t(
                      game.advisor.status === "loading"
                        ? "searching"
                        : game.advisor.status === "error"
                          ? "retry"
                          : "improve",
                    )}
                  </button>
                  {game.advisor.error && (
                    <p role="alert" className={styles.error}>
                      {issueText(game.advisor.error, locale)}
                    </p>
                  )}
                  {game.advisor.status === "ready" && suggestion === null && (
                    <p>{t("noImprovement")}</p>
                  )}
                  {suggestion && (
                    <div className={styles.suggestion}>
                      <p>
                        {mName(suggestion.removed.measureId)} ·{" "}
                        {locationOf(suggestion.removed, locale)}
                        <br />↓<br />
                        {mName(suggestion.added.measureId)} ·{" "}
                        {locationOf(suggestion.added, locale)}
                      </p>
                      <strong>
                        {t("change")}: {signed(suggestion.scoreDelta, locale)}
                      </strong>
                      <p>
                        {t("cost")}: {money(suggestion.scenario.cost, locale)}
                      </p>
                      <h4>{t("swapImpact")}</h4>
                      {suggestion.scenario.districts.map((d) => {
                        const previous = result.districts.find(
                          (old) => old.districtId === d.districtId,
                        )!;
                        return (
                          <p key={d.districtId}>
                            {districtName(d.districtId, locale)}:{" "}
                            {signed(d.finalScore - previous.finalScore, locale)}
                          </p>
                        );
                      })}
                      <p>
                        {t("swapConcentration", {
                          before: number(currentShare, locale, 1),
                          after: number(nextShare, locale, 1),
                        })}
                      </p>
                      {nextShare > currentShare + 0.01 && (
                        <p className={styles.rule}>{t("moreConcentrated")}</p>
                      )}
                      <p className={styles.muted}>{t("swapHelp")}</p>
                      <button
                        className={styles.primary}
                        onClick={() => {
                          const added = game.applySuggestion();
                          if (added) navigate(added.districtId ?? "city");
                        }}
                      >
                        {t("apply")}
                      </button>
                    </div>
                  )}
                </div>
                <div className={styles.advisor}>
                  <h3>{t("why")}</h3>
                  <p className={styles.muted}>{t("aiLanguage")}</p>
                  <button
                    className={styles.secondary}
                    disabled={game.explanation.status === "loading"}
                    onClick={() => game.request("explain")}
                  >
                    {t(
                      game.explanation.status === "loading"
                        ? "explaining"
                        : game.explanation.status === "error"
                          ? "retry"
                          : "explain",
                    )}
                  </button>
                  {game.explanation.error && (
                    <p role="alert" className={styles.error}>
                      {issueText(game.explanation.error, locale)}
                    </p>
                  )}
                  {game.explanation.data && (
                    <>
                      <p className={styles.source}>
                        {t(
                          game.explanation.data.source === "offline-template"
                            ? "offline"
                            : "aiReady",
                        )}
                      </p>
                      {game.explanation.data.source === "offline-template" ? (
                        <p className={styles.muted}>{t("offlineHelp")}</p>
                      ) : (
                        <>
                          {provider?.hidden && (
                            <p className={styles.muted}>{t("aiMoneyHidden")}</p>
                          )}
                          <details>
                            <summary>{t("aiOriginal")}</summary>
                            <p lang="ru" className={styles.explanation}>
                              {provider?.text}
                            </p>
                          </details>
                        </>
                      )}
                    </>
                  )}
                </div>
                <details className={styles.technical}>
                  <summary>{t("details")}</summary>
                  <p>{t("parameters")}</p>
                  {game.decisions.map((d) => (
                    <p key={d.measureId}>
                      {d.measureId} · {mName(d.measureId)} ·{" "}
                      {locationOf(d, locale)}
                    </p>
                  ))}
                  {result.synergiesApplied.map((s) => (
                    <p key={s.id}>
                      {s.pair.join(" + ")} → {s.indicator} +
                      {number(s.amount, locale, 0)}
                    </p>
                  ))}
                </details>
              </div>
            ) : (
              <div className={styles.empty}>
                <span aria-hidden="true">↗</span>
                <h3>{t("impact")}</h3>
                <p>{t("needsCalculation")}</p>
              </div>
            )}
            {game.error && (
              <p className={styles.error} role="alert">
                {issueText(game.error, locale)}
              </p>
            )}
          </div>
          <div className={styles.calculate}>
            <button
              className={styles.primary}
              onClick={() => {
                if (game.calculate()) {
                  setSidebar("result");
                  setNotice({ key: "readyNotice" });
                }
              }}
            >
              {t("calculate")} →
            </button>
            <small>
              {result
                ? t("currentResult")
                : t("pendingPlan", {
                    count: game.decisions.length,
                    required: DECISIONS_REQUIRED,
                  })}
            </small>
          </div>
        </aside>
      </div>
      <footer className={styles.footer}>
        <span>HACKALEM · ASTANA INNOVATIONS</span>
        <p>{t("disclaimer")}</p>
      </footer>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={headingId}
        onCancel={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className={styles.dialogContent}>
          <header className={styles.dialogHeader}>
            <div>
              <p className={styles.overline}>
                {t(confirm ? "beforeConfirm" : "arrived")}
              </p>
              <h2 id={headingId}>{confirm ? t("invest") : placeName(visit)}</h2>
            </div>
            <button
              className={styles.close}
              onClick={close}
              aria-label={t("close")}
            >
              ×
            </button>
          </header>
          {confirm ? (
            <div className={styles.confirm}>
              <span className={styles.pill}>
                {select(directions[confirm.direction], locale)}
              </span>
              <h3>{mName(confirm.id)}</h3>
              <p>{select(measureDescriptions[confirm.id], locale)}</p>
              <p>
                {t("coverage", {
                  place: locationOf(decisionFor(confirm), locale),
                })}
              </p>
              <div className={styles.purchase}>
                <div>
                  <span>{t("cost")}</span>
                  <strong>{money(confirm.cost, locale)}</strong>
                </div>
                <div>
                  <span>{t("afterwards")}</span>
                  <strong>{money(BUDGET - cost - confirm.cost, locale)}</strong>
                </div>
              </div>
              <p>
                {t("timing", { lag: confirm.lag, horizon: HORIZON_QUARTERS })}
              </p>
              <h4>{t("effects")}</h4>
              <ul>
                {confirm.effects.map((effect) => (
                  <li
                    key={effect.indicator}
                    className={effect.amount < 0 ? styles.critical : ""}
                  >
                    {t(effect.amount < 0 ? "harms" : "helps", {
                      indicator: select(
                        indicatorNames[effect.indicator],
                        locale,
                      ),
                    })}
                  </li>
                ))}
              </ul>
              <p className={styles.muted}>{t("effectHelp")}</p>
              {INCOMPATIBILITIES.filter((rule) =>
                rule.pair.includes(confirm.id),
              ).map((rule) => (
                <p className={styles.rule} key={rule.pair.join()}>
                  {t(ruleKey(rule.pair[0]))}
                </p>
              ))}
              {SYNERGIES.filter((s) => s.pair.includes(confirm.id)).map((s) => (
                <p className={styles.synergy} key={s.pair.join()}>
                  {t("possibleSynergy", {
                    project: mName(s.pair.find((id) => id !== confirm.id)!),
                  })}
                </p>
              ))}
              <details className={styles.technical}>
                <summary>{t("details")}</summary>
                <p>
                  {confirm.id} · {t("parameters")}
                </p>
                {confirm.effects.map((effect) => (
                  <p key={effect.indicator}>
                    {effect.indicator}: {effect.amount > 0 ? "+" : ""}
                    {number(effect.amount, locale, 0)}
                  </p>
                ))}
              </details>
              {confirmationIssue && (
                <p className={styles.error} role="alert">
                  {issueText(confirmationIssue, locale)}
                </p>
              )}
              <div className={styles.confirmActions}>
                <button
                  className={styles.secondary}
                  onClick={() => setConfirm(null)}
                >
                  {t("back")}
                </button>
                <button
                  className={styles.primary}
                  disabled={!!confirmationIssue}
                  onClick={() => {
                    if (game.add(decisionFor(confirm))) {
                      setSidebar("plan");
                      setNotice({ key: "addedNotice" });
                      close();
                    }
                  }}
                >
                  {t("include")} · {money(confirm.cost, locale)}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className={styles.profile}>
                {t(visit === "city" ? "cityHelp" : "indexHelp")}
              </p>
              {district && (
                <div className={styles.problemSummary}>
                  <span>
                    {t("index")} <b>{number(district.finalScore, locale, 1)}</b>
                  </span>
                  <span>{t(result ? "afterCalculation" : "initial")}</span>
                  {district.indicators
                    .filter((i) => i.critical)
                    .map((i) => (
                      <p key={i.indicator} className={styles.critical}>
                        ! {select(indicatorNames[i.indicator], locale)}:{" "}
                        {number(i.final, locale, 1)}
                      </p>
                    ))}
                </div>
              )}
              <div className={styles.tabs}>
                <button
                  aria-pressed={panelTab === "projects"}
                  onClick={() => setPanelTab("projects")}
                >
                  {t("projects")}
                </button>
                {district && (
                  <button
                    aria-pressed={panelTab === "indicators"}
                    onClick={() => setPanelTab("indicators")}
                  >
                    {t("allIndicators")}
                  </button>
                )}
              </div>
              {panelTab === "indicators" && district ? (
                <div className={styles.indicators}>
                  {district.indicators.map((i) => (
                    <div key={i.indicator}>
                      <div>
                        <span>
                          {select(indicatorNames[i.indicator], locale)}
                        </span>
                        <b className={i.critical ? styles.critical : ""}>
                          {number(i.final, locale, 1)}
                        </b>
                      </div>
                      <meter
                        min={0}
                        max={100}
                        value={i.final}
                        aria-label={select(indicatorNames[i.indicator], locale)}
                      />
                      <p>{select(indicatorMeanings[i.indicator], locale)}</p>
                      <small>
                        {t("before")} {number(i.base, locale, 1)} ·{" "}
                        {t("change")} {signed(i.delta, locale)}
                        {i.critical ? ` · ${t("critical")}` : ""}
                      </small>
                      <details className={styles.technical}>
                        <summary>{t("details")}</summary>
                        {i.indicator}
                      </details>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.projects}>
                  {measures.map((measure) => {
                    const chosen = game.decisions.find(
                      (d) => d.measureId === measure.id,
                    );
                    return (
                      <article
                        className={styles.project}
                        key={measure.id}
                        data-project={measure.id}
                      >
                        <div className={styles.projectHeading}>
                          <span className={styles.overline}>
                            {select(directions[measure.direction], locale)}
                          </span>
                          <strong>{money(measure.cost, locale)}</strong>
                        </div>
                        <h3>{mName(measure.id)}</h3>
                        <p>{select(measureDescriptions[measure.id], locale)}</p>
                        <p>
                          {t("coverage", {
                            place: locationOf(decisionFor(measure), locale),
                          })}
                        </p>
                        <p>
                          {t("timing", {
                            lag: measure.lag,
                            horizon: HORIZON_QUARTERS,
                          })}
                        </p>
                        {chosen ? (
                          <div className={styles.chosen}>
                            <span>
                              {t("planned")} · {locationOf(chosen, locale)}
                            </span>
                            <button
                              className={styles.textButton}
                              onClick={() => game.remove(chosen)}
                            >
                              {t("remove")}
                            </button>
                          </div>
                        ) : (
                          <button
                            className={styles.secondary}
                            onClick={() => setConfirm(measure)}
                          >
                            {t("explore")} →
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </dialog>
    </main>
  );
}
