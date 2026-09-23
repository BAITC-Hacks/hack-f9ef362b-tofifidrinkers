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
  INDICATORS,
  MEASURES,
  MEASURE_MAP,
  SYNERGIES,
  type Measure,
} from "@/lib/data";
import type { Decision } from "@/lib/engine";
import WorldCanvas from "./WorldCanvas";
import { BASELINE, costOf, locationOf, planIssue, useGame } from "./useGame";
import type { PlaceId } from "./world";
import styles from "./game.module.css";

const placeName = (id: PlaceId | null) =>
  id === "city"
    ? "Акимат"
    : (DISTRICTS.find((d) => d.id === id)?.name ?? "В пути");
const signed = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
const directionIcon: Record<string, string> = {
  Транспорт: "↔",
  Экология: "♧",
  Соцсфера: "+",
  Безопасность: "◇",
  Сервисы: "⌘",
};

export default function Game() {
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
  const [notice, setNotice] = useState(
    "Посетите Нуру и изучите показатели, которым нужна помощь.",
  );
  const dialog = useRef<HTMLDialogElement>(null),
    headingId = useId();
  const cost = costOf(game.decisions),
    district = (game.result ?? BASELINE).districts.find(
      (d) => d.districtId === visit,
    );
  const navigate = (id: PlaceId) => {
    setTravel((previous) => ({ id, serial: previous.serial + 1 }));
    setNotice(`Маршрут: ${placeName(id)}. Аким идёт по дорогам города.`);
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
    if (id)
      setNotice(
        `Вы прибыли: ${placeName(id)}. Откройте объект, чтобы изучить проблемы и проекты.`,
      );
  }, []);
  const worldData = useMemo(
    () => ({
      districts: (game.result ?? BASELINE).districts,
      decisions: game.decisions,
      calculated: !!game.result,
      synergies: game.result?.synergiesApplied ?? [],
    }),
    [game.result, game.decisions],
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
  const result = game.result;
  return (
    <main className={styles.game} lang="ru">
      <header className={styles.header}>
        <a className={styles.brand} href="/game">
          <span className={styles.logo} aria-hidden="true">
            А
          </span>
          <span>
            АКИМ<span className={styles.brandSub}>НА 5 ЧАСОВ</span>
          </span>
        </a>
        <div className={styles.headerCenter}>
          <span className={styles.liveDot} /> АСТАНА{" "}
          <span className={styles.muted}> / город ваших решений</span>
        </div>
        <button
          className={styles.secondary}
          onClick={() => {
            game.loadExample();
            navigate("nura");
            setSidebar("result");
          }}
        >
          Загрузить пример <span aria-hidden="true">↗</span>
        </button>
      </header>
      <section className={styles.hud} aria-label="Бюджет и состояние игры">
        <div className={styles.budgetBlock}>
          <span className={styles.overline}>ГОРОДСКОЙ БЮДЖЕТ</span>
          <div>
            <strong key={cost} className={styles.budgetNumber}>
              {BUDGET - cost}
            </strong>
            <span className={styles.muted}> / {BUDGET} у.е. осталось</span>
          </div>
          <div className={styles.budgetTrack}>
            <span
              style={{
                width: `${(Math.max(0, BUDGET - cost) / BUDGET) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className={styles.hudStat}>
          <span className={styles.overline}>В ПЛАНЕ</span>
          <strong>
            {cost} <small>у.е.</small>
          </strong>
        </div>
        <div className={styles.hudStat}>
          <span className={styles.overline}>РЕШЕНИЯ</span>
          <strong>
            {game.decisions.length}
            <small> / {DECISIONS_REQUIRED}</small>
          </strong>
        </div>
        <div className={styles.hudStatus}>
          <span className={styles.overline}>
            {result ? "РАСЧЁТ ГОТОВ" : "ПЛАНИРОВАНИЕ"}
          </span>
          <strong>
            {result
              ? `Score ${result.score.toFixed(2)}`
              : "Будущее начинается здесь"}
          </strong>
          <span className={styles.muted}>
            {result
              ? `${signed(result.score - BASELINE.score)} к исходному сценарию`
              : "Выберите 5 решений и рассчитайте последствия"}
          </span>
        </div>
      </section>
      <div className={styles.layout}>
        <section className={styles.stage} aria-label="Игровой мир">
          <div className={styles.mapTop}>
            <span className={styles.mapTitle}>
              <span className={styles.liveDot} /> {placeName(near)}
            </span>
            <span className={styles.mapLegend}>! критично · ✦ синергия</span>
          </div>
          <WorldCanvas
            data={worldData}
            travel={travel}
            onNear={onNear}
            onInteract={open}
            paused={!!visit}
          />
          <div className={styles.mission}>
            <span className={styles.overline}>ВАША МИССИЯ</span>
            <strong>
              Город меняется
              <br />с вашего решения.
            </strong>
            <p>
              Посетите район → изучите проблему → выберите проект → рассчитайте
              эффект.
            </p>
          </div>
          <div className={styles.locationNotice} role="status" key={notice}>
            {notice}
          </div>
          <div className={styles.interaction}>
            {near ? (
              <button className={styles.primary} onClick={open}>
                <kbd>E</kbd>{" "}
                {near === "city"
                  ? "Войти в акимат"
                  : `Изучить район ${placeName(near)}`}{" "}
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <span className={styles.walking}>Идём к объекту…</span>
            )}
          </div>
          <div className={styles.mapBottom}>
            <span>WASD / стрелки · клик по дороге</span>
            <span>Схематическая карта</span>
          </div>
        </section>
        <aside className={styles.sidebar}>
          <section className={styles.destinations}>
            <div className={styles.sectionHeading}>
              <h2>Куда отправимся?</h2>
              <span>↗</span>
            </div>
            <p className={styles.muted}>Выберите пункт — аким дойдёт сам.</p>
            <nav aria-label="Маршруты по городу">
              {[...DISTRICTS.map((d) => d.id), "city" as const].map((id) => (
                <button
                  key={id}
                  className={styles.destination}
                  aria-current={near === id ? "location" : undefined}
                  onClick={() => navigate(id)}
                >
                  <span>{placeName(id)}</span>
                  {id !== "city" &&
                  (game.result ?? BASELINE).districts
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
          <div className={styles.tabs} aria-label="Панель решений">
            <button
              aria-pressed={sidebar === "plan"}
              onClick={() => setSidebar("plan")}
            >
              Ваш план <span>{game.decisions.length}</span>
            </button>
            <button
              aria-pressed={sidebar === "result"}
              onClick={() => setSidebar("result")}
            >
              Последствия
            </button>
          </div>
          <div className={styles.sidebarContent}>
            {sidebar === "plan" ? (
              <>
                {!game.decisions.length && (
                  <div className={styles.empty}>
                    <span aria-hidden="true">✦</span>
                    <h3>
                      Пять решений.
                      <br />
                      Один город.
                    </h3>
                    <p>
                      Начните с районов, которым нужна помощь. Или загрузите
                      готовый пример.
                    </p>
                    <button
                      className={styles.secondary}
                      onClick={() => navigate("nura")}
                    >
                      Отправиться в Нуру →
                    </button>
                  </div>
                )}
                <ol className={styles.planList}>
                  {game.decisions.map((d, i) => (
                    <li key={`${d.measureId}-${d.districtId ?? "city"}`}>
                      <span className={styles.planIndex}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <small>
                          {locationOf(d)} · {d.measureId}
                        </small>
                        <strong>{MEASURE_MAP[d.measureId].name}</strong>
                        <span>{MEASURE_MAP[d.measureId].cost} у.е.</span>
                      </div>
                      <button
                        className={styles.remove}
                        aria-label={`Отменить ${d.measureId} — ${locationOf(d)}`}
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
                      setNotice(
                        "План очищен. На карте снова исходное состояние города.",
                      );
                    }}
                  >
                    Очистить план
                  </button>
                )}
              </>
            ) : result ? (
              <div className={styles.results}>
                <p className={styles.overline}>КАЧЕСТВО ЖИЗНИ · SCORE</p>
                <div className={styles.resultScore}>
                  <span>{BASELINE.score.toFixed(2)} →</span>
                  <strong>{result.score.toFixed(2)}</strong>
                  <em>{signed(result.score - BASELINE.score)}</em>
                </div>
                <p className={styles.muted}>
                  Горизонт — {HORIZON_QUARTERS} кварталов. Расход: {result.cost}{" "}
                  / {BUDGET}. Критических значений: {result.nCrit}.
                </p>
                <div className={styles.resultDistricts}>
                  {result.districts.map((d) => (
                    <button
                      key={d.districtId}
                      onClick={() => navigate(d.districtId)}
                    >
                      <span>{d.name}</span>
                      <small>{d.baseScore.toFixed(1)} →</small>
                      <b>{d.finalScore.toFixed(1)}</b>
                    </button>
                  ))}
                </div>
                {result.synergiesApplied.map((s) => (
                  <p className={styles.synergy} key={s.id}>
                    ✦ {s.pair.join(" + ")} · {s.district} · {s.indicator} +
                    {s.amount}
                  </p>
                ))}
                <div className={styles.advisor}>
                  <h3>Советник акима</h3>
                  <p className={styles.muted}>
                    Проверим, улучшит ли план замена одного решения.
                  </p>
                  <button
                    className={styles.secondary}
                    disabled={game.advisor.status === "loading"}
                    onClick={() => game.request("improve")}
                  >
                    {game.advisor.status === "loading"
                      ? "Ищем замену…"
                      : game.advisor.status === "error"
                        ? "Повторить поиск"
                        : "Найти улучшение"}
                  </button>
                  {game.advisor.error && (
                    <p role="alert" className={styles.error}>
                      {game.advisor.error}
                    </p>
                  )}
                  {game.advisor.status === "ready" &&
                    game.advisor.data === null && (
                      <p>
                        Среди допустимых замен одного решения улучшение не
                        найдено.
                      </p>
                    )}
                  {game.advisor.data && (
                    <div className={styles.suggestion}>
                      <p>
                        {game.advisor.data.removed.measureId} ·{" "}
                        {locationOf(game.advisor.data.removed)}
                        <br />↓<br />
                        {game.advisor.data.added.measureId} ·{" "}
                        {locationOf(game.advisor.data.added)}
                      </p>
                      <strong>
                        {signed(game.advisor.data.scoreDelta)} Score
                      </strong>
                      <p>
                        Стоимость плана: {game.advisor.data.scenario.cost} у.е.
                      </p>
                      <button
                        className={styles.primary}
                        onClick={() => {
                          const added = game.applySuggestion();
                          if (added) navigate(added.districtId ?? "city");
                        }}
                      >
                        Применить замену
                      </button>
                    </div>
                  )}
                </div>
                <div className={styles.advisor}>
                  <h3>Почему так получилось?</h3>
                  <button
                    className={styles.secondary}
                    disabled={game.explanation.status === "loading"}
                    onClick={() => game.request("explain")}
                  >
                    {game.explanation.status === "loading"
                      ? "Объяснение загружается…"
                      : game.explanation.status === "error"
                        ? "Повторить объяснение"
                        : "Объяснить результат"}
                  </button>
                  {game.explanation.error && (
                    <p role="alert" className={styles.error}>
                      {game.explanation.error}
                    </p>
                  )}
                  {game.explanation.data && (
                    <>
                      <p className={styles.source}>
                        {game.explanation.data.source === "offline-template"
                          ? "Объяснение по данным · без AI"
                          : "AI-объяснение готово"}
                      </p>
                      <p className={styles.explanation}>
                        {game.explanation.data.explanation}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.empty}>
                <span aria-hidden="true">↗</span>
                <h3>Каким станет город?</h3>
                <p>
                  После изменения плана нужен новый расчёт. На карте показаны
                  исходные показатели.
                </p>
              </div>
            )}
            {game.error && (
              <p className={styles.error} role="alert">
                {game.error}
              </p>
            )}
          </div>
          <div className={styles.calculate}>
            <button
              className={styles.primary}
              onClick={() => {
                if (game.calculate()) {
                  setSidebar("result");
                  setNotice(
                    "Расчёт готов. Откройте район, чтобы изучить изменения показателей.",
                  );
                }
              }}
            >
              Рассчитать последствия <span aria-hidden="true">→</span>
            </button>
            <small>
              {result
                ? "Результат соответствует текущему плану"
                : `${game.decisions.length} из ${DECISIONS_REQUIRED} решений · результат ещё не рассчитан`}
            </small>
          </div>
        </aside>
      </div>
      <footer className={styles.footer}>
        <span>HACKALEM · ASTANA INNOVATIONS</span>
        <p>
          Учебная симуляция на синтетических данных. Результаты не являются
          прогнозом развития города.
        </p>
        <a href="/board">Доска районов ↗</a>
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
                {confirm ? "ПЕРЕД ВКЛЮЧЕНИЕМ В ПЛАН" : "ВЫ НА МЕСТЕ"}
              </p>
              <h2 id={headingId}>
                {confirm ? "Инвестируем в город?" : placeName(visit)}
              </h2>
            </div>
            <button
              className={styles.close}
              onClick={close}
              aria-label="Закрыть объект"
            >
              ×
            </button>
          </header>
          {confirm ? (
            <div className={styles.confirm}>
              <span className={styles.pill}>
                {confirm.id} · {confirm.direction}
              </span>
              <h3>{confirm.name}</h3>
              <p>{locationOf(decisionFor(confirm))}</p>
              <div className={styles.purchase}>
                <div>
                  <span>Стоимость</span>
                  <strong>
                    {confirm.cost}
                    <small> у.е.</small>
                  </strong>
                </div>
                <div>
                  <span>Останется</span>
                  <strong>
                    {BUDGET - cost - confirm.cost}
                    <small> у.е.</small>
                  </strong>
                </div>
              </div>
              <p>
                Мера начинает работать с {confirm.lag}-го квартала. Итог
                рассчитывается на горизонте {HORIZON_QUARTERS} кварталов.
              </p>
              <h4>Направления воздействия по паспорту меры</h4>
              <ul>
                {confirm.effects.map((effect) => (
                  <li key={effect.indicator}>
                    {INDICATORS.find((i) => i.code === effect.indicator)?.name}:{" "}
                    <b className={effect.amount < 0 ? styles.critical : ""}>
                      {effect.amount > 0 ? "+" : ""}
                      {effect.amount}
                    </b>
                  </li>
                ))}
              </ul>
              <p className={styles.muted}>
                Это параметры меры. Итоговые изменения зависят от правил движка
                и появятся после расчёта.
              </p>
              {INCOMPATIBILITIES.filter((rule) =>
                rule.pair.includes(confirm.id),
              ).map((rule) => (
                <p className={styles.rule} key={rule.pair.join()}>
                  {rule.reason}
                </p>
              ))}
              {SYNERGIES.filter((s) => s.pair.includes(confirm.id)).map((s) => (
                <p className={styles.synergy} key={s.pair.join()}>
                  Возможная синергия: {s.pair.join(" + ")}, {s.bonusIndicator} +
                  {s.bonusAmount}. Проверяется при расчёте.
                </p>
              ))}
              {confirmationIssue && (
                <p className={styles.error} role="alert">
                  {confirmationIssue}
                </p>
              )}
              <div className={styles.confirmActions}>
                <button
                  className={styles.secondary}
                  onClick={() => setConfirm(null)}
                >
                  Назад
                </button>
                <button
                  className={styles.primary}
                  disabled={!!confirmationIssue}
                  onClick={() => {
                    if (game.add(decisionFor(confirm))) {
                      setSidebar("plan");
                      setNotice(
                        `${confirm.id}: добавлено в план. Для последствий нужен расчёт.`,
                      );
                      setConfirm(null);
                      close();
                    }
                  }}
                >
                  Включить в план · {confirm.cost}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className={styles.profile}>
                {visit === "city"
                  ? "Здесь выбирают решения для всего города. Район для них не требуется."
                  : DISTRICTS.find((d) => d.id === visit)?.profile}
              </p>
              {district && (
                <div className={styles.problemSummary}>
                  <span>
                    Score района <b>{district.finalScore.toFixed(1)}</b>
                  </span>
                  <span>
                    {game.result ? "После расчёта" : "Исходное состояние"}
                  </span>
                  {district.indicators
                    .filter((i) => i.critical)
                    .map((i) => (
                      <p key={i.indicator} className={styles.critical}>
                        !{" "}
                        {
                          INDICATORS.find((meta) => meta.code === i.indicator)
                            ?.name
                        }
                        : {i.final.toFixed(1)}
                      </p>
                    ))}
                </div>
              )}
              <div className={styles.tabs}>
                <button
                  aria-pressed={panelTab === "projects"}
                  onClick={() => setPanelTab("projects")}
                >
                  Проекты
                </button>
                {district && (
                  <button
                    aria-pressed={panelTab === "indicators"}
                    onClick={() => setPanelTab("indicators")}
                  >
                    Все 10 показателей
                  </button>
                )}
              </div>
              {panelTab === "indicators" && district ? (
                <div className={styles.indicators}>
                  {district.indicators.map((i) => {
                    const meta = INDICATORS.find(
                      (m) => m.code === i.indicator,
                    )!;
                    return (
                      <div key={i.indicator}>
                        <div>
                          <span>
                            {i.indicator} · {meta.name}
                          </span>
                          <b className={i.critical ? styles.critical : ""}>
                            {i.final.toFixed(1)}
                          </b>
                        </div>
                        <meter
                          min={0}
                          max={100}
                          value={i.final}
                          aria-label={meta.name}
                        />
                        <p>{meta.meaning}</p>
                        <small>
                          Было {i.base.toFixed(1)} · изменение {signed(i.delta)}
                          {i.critical ? " · критический показатель" : ""}
                        </small>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.projects}>
                  {measures.map((measure) => {
                    const chosen = game.decisions.find(
                      (d) => d.measureId === measure.id,
                    );
                    const relevant = district?.indicators.filter((i) =>
                      measure.effects.some((e) => e.indicator === i.indicator),
                    );
                    return (
                      <article className={styles.project} key={measure.id}>
                        <div className={styles.projectHeading}>
                          <span
                            className={styles.projectIcon}
                            aria-hidden="true"
                          >
                            {directionIcon[measure.direction]}
                          </span>
                          <span className={styles.overline}>
                            {measure.direction} · {measure.id}
                          </span>
                          <strong>
                            {measure.cost}
                            <small> у.е.</small>
                          </strong>
                        </div>
                        <h3>{measure.name}</h3>
                        <p>
                          {relevant
                            ?.map(
                              (i) =>
                                `${i.indicator}: ${i.final.toFixed(0)}${i.critical ? " !" : ""}`,
                            )
                            .join(" · ") ?? "Мера действует на весь город"}
                        </p>
                        {chosen ? (
                          <div className={styles.chosen}>
                            <span>В плане · {locationOf(chosen)}</span>
                            <button
                              className={styles.textButton}
                              onClick={() => game.remove(chosen)}
                            >
                              Отменить
                            </button>
                          </div>
                        ) : (
                          <button
                            className={styles.secondary}
                            onClick={() => setConfirm(measure)}
                          >
                            Изучить проект →
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
