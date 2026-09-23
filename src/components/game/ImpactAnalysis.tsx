import { DISTRICTS } from "@/lib/data";
import type { Decision, ScenarioResult } from "@/lib/engine";
import { BASELINE } from "./useGame";
import { analyse, money, number, signed } from "./presentation";
import {
  districtName,
  indicatorNames,
  select,
  translator,
  type Locale,
} from "./i18n";
import styles from "./game.module.css";

export default function ImpactAnalysis({
  decisions,
  result,
  locale,
}: {
  decisions: Decision[];
  result: ScenarioResult;
  locale: Locale;
}) {
  const t = translator(locale),
    analysis = analyse(decisions, result);
  return (
    <section className={styles.analysis} aria-label={t("analysis")}>
      <h3>{t("analysis")}</h3>
      <h4>{t("allocation")}</h4>
      {[
        ...analysis.spending.map((d) => ({
          label: districtName(d.id, locale),
          cost: d.cost,
        })),
        { label: t("citywide"), cost: analysis.citywide },
      ].map((row) => (
        <div className={styles.allocationRow} key={row.label}>
          <div>
            <span>{row.label}</span>
            <b>{money(row.cost, locale)}</b>
          </div>
          <div className={styles.allocationBar}>
            <span
              style={{
                width: `${result.cost ? (row.cost / result.cost) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      ))}
      <p className={styles.muted}>{t("noDoubleCount")}</p>
      {analysis.concentrated.map((d) => {
        const before = BASELINE.districts.find((b) => b.districtId === d.id)!;
        return (
          <div key={d.id} className={styles.analysisNote}>
            <p>
              {t("concentration", {
                place: districtName(d.id, locale),
                percent: number((d.cost / result.cost) * 100, locale, 1),
              })}
            </p>
            <p>
              {t("priorityContext", {
                score: number(before.finalScore, locale),
                count: before.indicators.filter((i) => i.critical).length,
              })}
            </p>
          </div>
        );
      })}
      <p className={styles.synergy}>
        {t(analysis.allImproved ? "allImproved" : "uneven")}
      </p>
      {analysis.districts.map((d) => (
        <div className={styles.districtImpact} key={d.districtId}>
          <div>
            <strong>{districtName(d.districtId, locale)}</strong>
            <b>{signed(d.change, locale)}</b>
          </div>
          <p>
            {number(d.baseScore, locale)} → {number(d.finalScore, locale)} ·{" "}
            {t(d.category)}
          </p>
          <p>
            {t("criticalLeft", {
              count: d.indicators.filter((i) => i.critical).length,
            })}
          </p>
          {d.indicators
            .filter((i) => i.critical)
            .map((i) => (
              <p className={styles.critical} key={i.indicator}>
                {select(indicatorNames[i.indicator], locale)}:{" "}
                {number(i.final, locale, 1)}
              </p>
            ))}
        </div>
      ))}
      <p className={styles.muted}>{t("thresholdHelp")}</p>
      <h4>{t("tradeoffs")}</h4>
      {analysis.losses.length ? (
        analysis.losses.map((loss) => (
          <p
            className={styles.critical}
            key={`${loss.districtId}-${loss.indicator}`}
          >
            {districtName(loss.districtId, locale)} ·{" "}
            {select(indicatorNames[loss.indicator], locale)}:{" "}
            {signed(loss.delta, locale)}
          </p>
        ))
      ) : (
        <p className={styles.muted}>{t("noDrops")}</p>
      )}
      {result.synergiesApplied.map((s) => {
        const id = DISTRICTS.find((d) => d.name === s.district)?.id;
        return (
          <p className={styles.synergy} key={s.id}>
            ✦ {t("synergy")} · {id ? districtName(id, locale) : s.district} ·{" "}
            {select(indicatorNames[s.indicator], locale)} +
            {number(s.amount, locale, 0)}
          </p>
        );
      })}
    </section>
  );
}
