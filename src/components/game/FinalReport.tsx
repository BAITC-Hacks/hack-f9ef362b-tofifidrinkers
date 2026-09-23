"use client";
import { useEffect, useId, useRef } from "react";
import { BUDGET } from "@/lib/data";
import { BASELINE, type useGame } from "./useGame";
import {
  districtName,
  indicatorNames,
  measureNames,
  select,
  translator,
  type Locale,
} from "./i18n";
import {
  analyse,
  issueText,
  locationOf,
  money,
  MONEY_SCALE,
  number,
  signed,
} from "./presentation";
import { reportText } from "./reportText";
import ImpactAnalysis from "./ImpactAnalysis";
import type { PlaceId } from "./world";
import styles from "./game.module.css";

type Props = {
  game: ReturnType<typeof useGame>;
  locale: Locale;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onApply: (id: PlaceId) => void;
};
export default function FinalReport({
  game,
  locale,
  open,
  onOpen,
  onClose,
  onApply,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null),
    title = useId();
  const result = game.result,
    t = translator(locale),
    r = reportText(locale);
  useEffect(() => {
    if (open && result) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open, result]);
  const report =
    game.explanation.data?.language === locale
      ? game.explanation.data
      : undefined;
  const narrative = report?.narrative;
  const suggestion = game.advisor.data;
  const request = () => {
    void game.request("explain", locale);
    if (game.advisor.status === "idle" || game.advisor.status === "error")
      void game.request("improve");
  };
  if (!result) return null;
  const spread = (values: number[]) =>
    Math.max(...values) - Math.min(...values);
  const nextDecisions = suggestion
    ? game.decisions.map((d) =>
        d.measureId === suggestion.removed.measureId &&
        (d.districtId ?? null) === (suggestion.removed.districtId ?? null)
          ? suggestion.added
          : d,
      )
    : [];
  const beforeAllocation = analyse(game.decisions, result),
    afterAllocation = suggestion
      ? analyse(nextDecisions, suggestion.scenario)
      : null;
  return (
    <>
      <div className={styles.reportLaunch}>
        <button
          className={styles.primary}
          onClick={() => {
            onOpen();
            if (game.explanation.status === "idle") request();
          }}
        >
          {r("open")} →
        </button>
      </div>
      <dialog
        ref={dialog}
        className={`${styles.dialog} ${styles.reportDialog}`}
        aria-labelledby={title}
        onCancel={onClose}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className={styles.dialogContent}>
          <header className={styles.dialogHeader}>
            <div>
              <p className={styles.overline}>{t("advisor")}</p>
              <h2 id={title}>{r("title")}</h2>
            </div>
            <button
              className={styles.close}
              aria-label={t("close")}
              onClick={onClose}
            >
              ×
            </button>
          </header>
          <p className={styles.reportLead}>
            {r(result.score > BASELINE.score ? "growth" : "noGrowth")}
          </p>
          <section className={styles.reportFacts} aria-label={r("facts")}>
            <h3>{r("facts")}</h3>
            <p className={styles.muted}>
              {t("simulationMoney")}{" "}
              {t(MONEY_SCALE.approved ? "approvedScale" : "proposedScale", {
                money: money(1, locale),
              })}
            </p>
            <div className={styles.resultScore}>
              <span>{number(BASELINE.score, locale)} →</span>
              <strong>{number(result.score, locale)}</strong>
              <em>{signed(result.score - BASELINE.score, locale)}</em>
            </div>
            <p>{t("index")}</p>
            <div className={styles.reportStats}>
              <p>
                {t("cost")}
                <b>{money(result.cost, locale)}</b>
              </p>
              <p>
                {t("remaining")}
                <b>{money(result.budgetLeft, locale)}</b>
              </p>
              <p>
                {t("budget")}
                <b>{money(BUDGET, locale)}</b>
              </p>
            </div>
            <p>
              {r("initialCritical")}:{" "}
              <b>
                {BASELINE.nCrit} → {result.nCrit}
              </b>
            </p>
          </section>
          <section
            className={styles.reportNarrative}
            aria-live="polite"
            aria-busy={game.explanation.status === "loading"}
          >
            {game.explanation.status === "loading" && (
              <p role="status">{t("explaining")}</p>
            )}
            {game.explanation.status === "error" && (
              <p role="alert" className={styles.error}>
                {issueText(game.explanation.error!, locale)}
              </p>
            )}
            {report?.source === "offline-template" && (
              <>
                <h3>{r("offline")}</h3>
                <p>
                  {r(
                    report.fallbackReason === "not-configured"
                      ? "noKey"
                      : "unavailable",
                  )}
                </p>
              </>
            )}
            {narrative && (
              <>
                <p className={styles.source}>
                  {r("interpretation")} · {report?.source}
                </p>
                <p className={styles.reportLead}>{narrative.summary}</p>
                {(["quality", "priority", "reach", "budget"] as const).map(
                  (key) => (
                    <details key={key} className={styles.reportSection}>
                      <summary>{r(key)}</summary>
                      <p>{narrative[key]}</p>
                    </details>
                  ),
                )}
                {(["strengths", "tradeoffs"] as const).map((key) => (
                  <details key={key} className={styles.reportSection}>
                    <summary>{r(key)}</summary>
                    <ul>
                      {narrative[key].map((text, i) => (
                        <li key={i}>{text}</li>
                      ))}
                    </ul>
                  </details>
                ))}
                <h3>{r("nextStep")}</h3>
                <p>{narrative.nextStep}</p>
              </>
            )}
            {game.explanation.status !== "loading" && (
              <button className={styles.secondary} onClick={request}>
                {t(game.explanation.status === "idle" ? "explain" : "retry")}
              </button>
            )}
          </section>
          <section className={styles.reportSection}>
            <h3>{r("reach")}</h3>
            <p>{r("fairness")}</p>
            <p>
              {r("needsAttention")}:{" "}
              {BASELINE.worstDistrictIds
                .map((id) => districtName(id, locale))
                .join(", ")}
            </p>
            <p>
              {r("spread")}:{" "}
              {number(
                spread(BASELINE.districts.map((d) => d.finalScore)),
                locale,
              )}{" "}
              →{" "}
              {number(
                spread(result.districts.map((d) => d.finalScore)),
                locale,
              )}
            </p>
            {result.districts.map((d) => (
              <details className={styles.reportDistrict} key={d.districtId}>
                <summary>
                  <strong>{districtName(d.districtId, locale)}</strong>
                  <span>
                    {number(d.baseScore, locale)} →{" "}
                    {number(d.finalScore, locale)} (
                    {signed(d.finalScore - d.baseScore, locale)})
                  </span>
                </summary>
                <p>
                  {t("cost")}:{" "}
                  {money(
                    beforeAllocation.spending.find(
                      (s) => s.id === d.districtId,
                    )!.cost,
                    locale,
                  )}
                </p>
                <p>
                  {r("initialCritical")}:{" "}
                  {
                    BASELINE.districts
                      .find((b) => b.districtId === d.districtId)!
                      .indicators.filter((i) => i.critical).length
                  }{" "}
                  → {d.indicators.filter((i) => i.critical).length}
                </p>
                {d.indicators.map((i) => (
                  <p
                    className={i.critical ? styles.critical : ""}
                    key={i.indicator}
                  >
                    {select(indicatorNames[i.indicator], locale)}:{" "}
                    {number(i.base, locale)} → {number(i.final, locale)} (
                    {signed(i.delta, locale)})
                    {i.critical ? ` · ${t("critical")}` : ""}
                  </p>
                ))}
              </details>
            ))}
            <p>
              {t("citywide")}: {money(beforeAllocation.citywide, locale)}
            </p>
            <details className={styles.reportSection}>
              <summary>{r("tradeoffs")}</summary>
              <ImpactAnalysis
                decisions={game.decisions}
                result={result}
                locale={locale}
              />
            </details>
          </section>
          <section className={styles.reportSection}>
            <h3>{r("checked")}</h3>
            <p>{r("scope")}</p>
            {game.advisor.status === "loading" && (
              <p role="status">{t("searching")}</p>
            )}
            {game.advisor.status === "error" && (
              <p role="alert" className={styles.error}>
                {issueText(game.advisor.error!, locale)}
              </p>
            )}
            {(game.advisor.status === "idle" ||
              game.advisor.status === "error") && (
              <button
                className={styles.secondary}
                onClick={() => game.request("improve")}
              >
                {t(game.advisor.status === "error" ? "retry" : "improve")}
              </button>
            )}
            {game.advisor.status === "ready" && suggestion === null && (
              <p>{t("noImprovement")}</p>
            )}
            {suggestion && (
              <>
                <p className={styles.reportLead}>
                  {select(measureNames[suggestion.removed.measureId], locale)} ·{" "}
                  {locationOf(suggestion.removed, locale)} →{" "}
                  {select(measureNames[suggestion.added.measureId], locale)} ·{" "}
                  {locationOf(suggestion.added, locale)}
                </p>
                <h4>{r("compare")}</h4>
                <p>
                  {t("index")}: {number(result.score, locale)} →{" "}
                  {number(suggestion.scenario.score, locale)} (
                  {signed(suggestion.scoreDelta, locale)})
                </p>
                <p>
                  {t("cost")}: {money(result.cost, locale)} →{" "}
                  {money(suggestion.scenario.cost, locale)}
                </p>
                <p>
                  {t("remaining")}: {money(result.budgetLeft, locale)} →{" "}
                  {money(suggestion.scenario.budgetLeft, locale)}
                </p>
                {suggestion.scenario.districts.map((d) => {
                  const before = result.districts.find(
                    (b) => b.districtId === d.districtId,
                  )!;
                  return (
                    <details
                      className={styles.reportDistrict}
                      key={d.districtId}
                    >
                      <summary>
                        {districtName(d.districtId, locale)} ·{" "}
                        {number(before.finalScore, locale)} →{" "}
                        {number(d.finalScore, locale)} (
                        {signed(d.finalScore - before.finalScore, locale)})
                      </summary>
                      <p>
                        {t("cost")}:{" "}
                        {money(
                          beforeAllocation.spending.find(
                            (s) => s.id === d.districtId,
                          )!.cost,
                          locale,
                        )}{" "}
                        →{" "}
                        {money(
                          afterAllocation!.spending.find(
                            (s) => s.id === d.districtId,
                          )!.cost,
                          locale,
                        )}
                      </p>
                      {d.indicators
                        .filter(
                          (i) =>
                            Math.abs(
                              i.final -
                                before.indicators.find(
                                  (b) => b.indicator === i.indicator,
                                )!.final,
                            ) > 1e-8,
                        )
                        .map((i) => (
                          <p key={i.indicator}>
                            {select(indicatorNames[i.indicator], locale)}:{" "}
                            {number(
                              before.indicators.find(
                                (b) => b.indicator === i.indicator,
                              )!.final,
                              locale,
                            )}{" "}
                            → {number(i.final, locale)}
                            {i.critical ? ` · ${t("critical")}` : ""}
                          </p>
                        ))}
                    </details>
                  );
                })}
                <p>
                  {t("citywide")}: {money(beforeAllocation.citywide, locale)} →{" "}
                  {money(afterAllocation!.citywide, locale)}
                </p>
                <button
                  className={styles.primary}
                  onClick={() => {
                    const added = game.applySuggestion();
                    if (added) {
                      onClose();
                      onApply(added.districtId ?? "city");
                    }
                  }}
                >
                  {t("apply")}
                </button>
              </>
            )}
          </section>
          <p className={styles.muted}>{t("disclaimer")}</p>
        </div>
      </dialog>
    </>
  );
}
