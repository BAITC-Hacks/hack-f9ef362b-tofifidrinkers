import { useState } from "react";
import type { ReactNode } from "react";
import { BUDGET, DECISIONS_REQUIRED, DISTRICTS, INDICATORS, MAX_PER_DIRECTION, MEASURES, MEASURE_MAP } from "@/lib/data";
import type { Direction, Measure } from "@/lib/data";
import type { Decision } from "@/lib/engine";
import { AkimPortrait } from "./CityMap";
import type { Destination } from "./CityMap";

const DIRECTIONS: Direction[] = ["Транспорт", "Экология", "Соцсфера", "Безопасность", "Сервисы"];

export function ProjectIcon({ direction }: { direction: Direction }) {
  const paths: Record<Direction, ReactNode> = {
    "Транспорт": <><rect x="5" y="3" width="14" height="16" rx="4" /><path d="M5 11h14M8 19v2m8 -2v2M8 15h1m6 0h1" /></>,
    "Экология": <><path d="M12 21v-8m0 3 -4 -3m4 1 4 -3M12 2C2 7 3 17 12 17S22 7 12 2Z" /></>,
    "Соцсфера": <><path d="M3 21V9l9 -6 9 6v12H3Zm6 0v-7h6v7M7 10h.01M17 10h.01" /></>,
    "Безопасность": <><path d="m12 3 8 3v6c0 5 -8 9 -8 9S4 17 4 12V6Z" /><path d="m8 12 3 3 5 -6" /></>,
    "Сервисы": <><path d="M12 3v5m0 8v5M3 12h5m8 0h5M6 6l3 3m6 6 3 3M6 18l3 -3m6 -6 3 -3" /><circle cx="12" cy="12" r="4" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[direction]}</svg>;
}

export default function DistrictVisit({ destination, decisions, cost, onFund, onVisit, onLeave }: {
  destination: Destination; decisions: Decision[]; cost: number;
  onFund: (measure: Measure, destination: Exclude<Destination, null>) => void;
  onVisit: (destination: Exclude<Destination, null>) => void; onLeave: () => void;
}) {
  const [filter, setFilter] = useState<Direction | "Все">("Все");
  if (!destination) return <aside className="district-visit welcome-visit" aria-label="Задание акима">
    <span className="eyebrow">ВАШ ПЕРВЫЙ ДЕНЬ</span>
    <div className="welcome-portrait"><AkimPortrait /><span className="portrait-badge">Аким</span></div>
    <h2>Ну что, изменим город?</h2>
    <p className="visit-description">Вы — аким Астаны. Познакомьтесь с районами, узнайте, чего не хватает жителям, и решите, куда направить бюджет.</p>
    <ol className="mission-steps"><li><span>1</span><div><strong>Отправляйтесь в район</strong><p>Выберите его на карте</p></div></li><li><span>2</span><div><strong>Вложитесь в нужное</strong><p>Школы, парки, транспорт и не только</p></div></li><li><span>3</span><div><strong>Узнайте, что изменилось</strong><p>Примите пять решений</p></div></li></ol>
    <button className="game-primary" onClick={() => onVisit("nura")}>Начать с Нуры <span aria-hidden="true">↗</span></button>
    <p className="welcome-footnote">100 у.е. · 5 решений · один город</p>
  </aside>;

  const district = destination === "city" ? null : DISTRICTS.find((d) => d.id === destination)!;
  const measures = MEASURES.filter((m) => m.scope === (district ? "Район" : "Город") && (filter === "Все" || m.direction === filter));
  const needs = district ? [...INDICATORS].sort((a, b) => district.base[a.code] - district.base[b.code]).slice(0, 2) : [];
  const selection = Object.fromEntries(decisions.map((d) => [d.measureId, d]));

  return <aside className="district-visit" aria-label={district ? `Проекты района ${district.name}` : "Общегородские проекты"}>
    <div className="visit-topline"><span className="eyebrow">{district ? "ВЫ ПРИБЫЛИ В РАЙОН" : "ВЫ В АКИМАТЕ"}</span><button className="map-return" onClick={onLeave} aria-label="Вернуться к обзору города">↗</button></div>
    <div className="visit-title"><h2>{district?.name ?? "Для всего города"}</h2><span className="visit-avatar"><AkimPortrait /></span></div>
    <p className="visit-description">{district ? `${district.profile[0].toUpperCase()}${district.profile.slice(1)}` : "Здесь вы принимаете решения, которые помогут сразу всем пяти районам."}</p>
    {district && <p className="district-baseline-caption">Исходные показатели · точки роста</p>}
    {district && <div className="district-needs">{needs.map((indicator) => <div key={indicator.code}><span>{indicator.name}</span><strong>{district.base[indicator.code]}<small>/100</small></strong><div className="need-track"><i style={{ width: `${district.base[indicator.code]}%` }} /></div></div>)}</div>}
    <div className="projects-heading"><h3>На что направим бюджет?</h3><span>{BUDGET - cost} у.е.</span></div>
    <div className="project-filters" aria-label="Направления проектов">{(["Все", ...DIRECTIONS] as const).map((direction) => <button key={direction} aria-pressed={filter === direction} onClick={() => setFilter(direction)}>{direction}</button>)}</div>
    <div className="visit-projects">
      {measures.length === 0 && <p className="empty-projects">В этом направлении нет общегородских мер. Выберите другое направление или посетите район.</p>}
      {measures.map((measure) => {
        const existing = selection[measure.id];
        const here = Boolean(existing && (!district || existing.districtId === district.id));
        const usedDirection = decisions.filter((d) => MEASURE_MAP[d.measureId].direction === measure.direction).length;
        const block = !existing && cost + measure.cost > BUDGET ? "Не хватает бюджета"
          : !existing && decisions.length >= DECISIONS_REQUIRED ? "Уже выбрано 5 решений"
          : !existing && usedDirection >= MAX_PER_DIRECTION ? "Уже 2 меры в этом направлении" : null;
        const previousDistrict = existing?.districtId ? DISTRICTS.find((d) => d.id === existing.districtId)?.name : null;
        return <article key={measure.id} className={`project-card ${here ? "is-funded" : ""}`}>
          <div className="project-card-top"><span className="project-icon" data-direction={measure.direction}><ProjectIcon direction={measure.direction} /></span><span className="project-category">{measure.direction}</span><span className="project-cost">{measure.cost}<small> у.е.</small></span></div>
          <h4>{measure.name}</h4>
          <p className="project-effect">{measure.effects.map((effect) => `${INDICATORS.find((i) => i.code === effect.indicator)?.name}: ${effect.amount > 0 ? "+" : ""}${effect.amount}`).join(" · ")}</p>
          <p className="project-lag">Полный эффект до задержки · начало через {measure.lag} кв.</p>
          {existing && !here && <p className="project-transfer">Уже выбрано: {previousDistrict}. Можно перенести сюда без дополнительной оплаты.</p>}
          <button className="project-fund" disabled={Boolean(block)} onClick={() => onFund(measure, destination)}
            aria-label={`${here ? "Отменить" : existing ? "Перенести" : "Выделить бюджет на"} ${measure.id}: ${measure.name}`}>
            {here ? <><span>✓ В плане района</span><span className="cancel-project">Отменить</span></> : block ?? (existing ? "Перенести в этот район →" : `Выделить ${measure.cost} у.е. →`)}
          </button>
        </article>;
      })}
    </div>
    <div className="visit-footnote">{district ? <button onClick={() => onVisit("city")}>Общегородские проекты — в акимате ↗</button> : "Городские меры действуют во всех пяти районах."}</div>
  </aside>;
}

