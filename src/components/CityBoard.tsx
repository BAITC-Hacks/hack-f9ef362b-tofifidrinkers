"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DistrictOutcome, ScenarioResult } from "@/lib/engine";
import { DISTRICTS, INDICATORS } from "@/lib/data";
import { PALETTE, SPRITES, type PixelMatrix, type Tier } from "./pixelSprites";

function tierOf(score: number): Tier {
  if (score >= 65) return "thriving";
  if (score >= 50) return "developing";
  return "struggling";
}
const TIERS = {
  thriving: { label: "Процветает", color: PALETTE[8] },
  developing: { label: "Развивается", color: PALETTE[11] },
  struggling: { label: "В упадке", color: PALETTE[13] },
};

function Sprite({ matrix }: { matrix: PixelMatrix }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.scale(4, 4);
    matrix.forEach((row, y) => row.forEach((color, x) => {
      if (color === null) return;
      ctx.fillStyle = PALETTE[color];
      ctx.fillRect(x, y, 1, 1);
    }));
  }, [matrix]);
  return <canvas ref={ref} width={matrix[0].length * 4} height={matrix.length * 4} aria-hidden="true" />;
}

type Synergies = ScenarioResult["synergiesApplied"];

function DistrictDetails({ district, synergies, id }: { district: DistrictOutcome; synergies: Synergies; id: string }) {
  return (
    <section className="pcb-details" id={id} aria-label={`${district.name} — показатели`}>
      <header className="pcb-detail-heading">
        <div><p className="pcb-eyebrow">Паспорт района</p><h3>{district.name}</h3></div>
        <p>Было <b>{district.baseScore.toFixed(1)}</b><span aria-hidden="true"> → </span>стало <b>{district.finalScore.toFixed(1)}</b></p>
      </header>
      {synergies.length > 0 && <div className="pcb-synergies">
        {synergies.map((s) => <p key={`${s.id}-${s.indicator}`}>✦ Синергия {s.pair.join(" + ")}: {s.indicator} +{s.amount}</p>)}
      </div>}
      <div className="pcb-indicators">
        {district.indicators.map((indicator) => (
          <div className="pcb-indicator" key={indicator.indicator} data-critical={indicator.critical}>
            <div className="pcb-indicator-heading">
              <span><small>{indicator.indicator}</small> {INDICATORS.find((i) => i.code === indicator.indicator)?.name ?? indicator.indicator}</span>
              <strong>{indicator.final.toFixed(2)}</strong>
            </div>
            <div className="pcb-bar" role="meter" aria-label={INDICATORS.find((i) => i.code === indicator.indicator)?.name ?? indicator.indicator} aria-valuemin={0} aria-valuemax={100} aria-valuenow={indicator.final}>
              <span style={{ width: `${Math.min(100, Math.max(0, indicator.final))}%` }} />
            </div>
            <span className="text-xs">Было {indicator.base.toFixed(2)} · изменение {indicator.delta >= 0 ? "+" : ""}{indicator.delta.toFixed(2)}</span>
            {indicator.critical && <span className="pcb-critical-text"> ! Ниже 40 — критический показатель</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CityBoard({ districts, synergiesApplied = [] }: { districts: DistrictOutcome[]; synergiesApplied?: Synergies }) {
  const [selectedId, setSelectedId] = useState(districts[0]?.districtId ?? null);
  const selected = districts.find((d) => d.districtId === selectedId) ?? districts[0];
  const detailsId = useId();
  // The engine's synergy contract uses district names, not array positions or IDs.
  const synergiesFor = (district: DistrictOutcome) => synergiesApplied.filter((s) => s.district === (DISTRICTS.find((d) => d.id === district.districtId)?.name ?? district.name));
  return (
    <div className="pcb">
      <div className="pcb-heading"><div><p className="pcb-eyebrow">Аким на 5 часов / карта города</p><h2>Астана в пикселях</h2></div><span className="pcb-hint">Выберите район ↓</span></div>
      <div className="pcb-legend" aria-label="Состояния районов">
        {Object.entries(TIERS).map(([key, tier]) => <span key={key}><i style={{ background: tier.color }} />{tier.label}</span>)}
        <span>! Критический показатель</span><span>✦ Синергия</span>
      </div>
      <p className="pcb-eyebrow">Условные уровни визуализации: ниже 50 · от 50 до 65 · от 65. На формулу Score не влияют.</p>
      <div className="pcb-map">
        {districts.map((district) => {
          const tier = tierOf(district.finalScore);
          const critical = district.indicators.filter((i) => i.critical).length;
          const synergies = synergiesFor(district);
          return <button type="button" className="pcb-tile" key={district.districtId} data-tier={tier} aria-pressed={selected?.districtId === district.districtId} aria-controls={detailsId} onClick={() => setSelectedId(district.districtId)}>
            <span className="pcb-tile-top"><span>{district.name}</span><span aria-hidden="true">↗</span></span>
            <span className="pcb-scene">
              <span className="pcb-ground"><Sprite matrix={SPRITES.ground[tier]} /></span>
              <span className="pcb-buildings"><Sprite matrix={SPRITES.buildings[tier]} /></span>
              {critical > 0 && <span className="pcb-alarm"><Sprite matrix={SPRITES.alarm[tier]} /></span>}
              {synergies.length > 0 && <span className="pcb-spark"><Sprite matrix={SPRITES.synergy[tier]} /></span>}
            </span>
            <span className="pcb-score">{district.finalScore.toFixed(1)}<small> / 100</small></span>
            <span style={{ color: TIERS[tier].color }}>{TIERS[tier].label}</span>
            <span className="pcb-flags">{critical > 0 && <span>! Критических: {critical}</span>}{synergies.length > 0 && <span>✦ Синергия</span>}</span>
          </button>;
        })}
      </div>
      {selected ? <DistrictDetails district={selected} synergies={synergiesFor(selected)} id={detailsId} /> : <p>Нет данных о районах. Рассчитайте сценарий.</p>}
      <style>{`
        .pcb{--ink:${PALETTE[0]};--panel:${PALETTE[1]};--edge:${PALETTE[2]};--muted:${PALETTE[4]};--text:${PALETTE[5]};background:var(--ink);color:var(--text);border:2px solid var(--edge);padding:24px;font:14px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;box-shadow:6px 6px 0 #080f19}
        .pcb *{box-sizing:border-box}.pcb-heading,.pcb-detail-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}.pcb h2{font-size:24px;font-weight:800;margin:4px 0}.pcb h3{font-size:22px;font-weight:800;margin:0}.pcb p{margin:0}.pcb-eyebrow{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--muted)}.pcb-hint{color:${PALETTE[11]};font-size:12px}.pcb-legend{display:flex;flex-wrap:wrap;gap:8px 18px;margin:18px 0;color:var(--muted);font-size:11px}.pcb-legend span{display:flex;align-items:center;gap:6px}.pcb-legend i{width:8px;height:8px;display:inline-block}
        .pcb-map{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:24px}.pcb-tile{font:inherit;font-size:12px;color:inherit;text-align:center;border:2px solid var(--edge);background:var(--panel);padding:12px 8px;cursor:pointer;min-width:0;box-shadow:0 4px 0 #080f19;display:flex;flex-direction:column;align-items:center}.pcb-tile:hover{border-color:var(--muted)}.pcb-tile[aria-pressed=true]{border-color:${PALETTE[11]};background:#2a3a43}.pcb-tile:focus-visible{outline:3px solid ${PALETTE[15]};outline-offset:4px}.pcb-tile-top{display:flex;justify-content:space-between;width:100%;gap:4px;font-weight:700;font-size:14px}.pcb-tile-top>span:last-child{color:var(--muted)}.pcb-scene{position:relative;display:block;width:128px;height:144px}.pcb canvas{display:block;image-rendering:pixelated}.pcb-ground{position:absolute;left:16px;bottom:12px}.pcb-buildings{position:absolute;left:16px;bottom:32px}.pcb-alarm{position:absolute;left:0;top:4px;animation:pcb-alert 1.6s steps(2,end) infinite}.pcb-spark{position:absolute;right:0;top:16px}.pcb-score{font-size:28px;font-weight:800;line-height:1.3}.pcb-score small{font-size:11px;font-weight:400;color:var(--muted)}.pcb-flags{display:flex;flex-wrap:wrap;justify-content:center;gap:3px 8px;min-height:20px;font-size:10px;margin-top:6px;color:${PALETTE[15]}}.pcb-flags span:first-child{color:${PALETTE[11]}}
        .pcb-details{border:2px solid var(--edge);background:var(--panel);padding:20px}.pcb-detail-heading>p{color:var(--muted);font-size:12px}.pcb-detail-heading b{color:var(--text);font-size:16px}.pcb-indicators{display:grid;grid-template-columns:1fr 1fr;gap:18px 28px;margin-top:20px}.pcb-indicator-heading{display:flex;gap:12px;justify-content:space-between;align-items:start;font-size:12px;margin-bottom:8px;min-height:36px}.pcb-indicator-heading small{color:var(--muted);font-size:10px}.pcb-indicator-heading strong{font-size:16px}.pcb-bar{height:10px;background:var(--ink);position:relative}.pcb-bar>span{display:block;height:100%;background:${PALETTE[8]}}.pcb-bar:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(10% - 2px),var(--panel) calc(10% - 2px),var(--panel) 10%)}.pcb-indicator[data-critical=true] .pcb-bar>span{background:${PALETTE[13]}}.pcb-critical-text{font-size:10px;color:${PALETTE[13]}}.pcb-synergies{color:${PALETTE[15]};font-size:12px;margin-top:14px}
        @keyframes pcb-alert{50%{opacity:.45;transform:translateY(-4px)}}
        @media(max-width:1000px){.pcb-map{grid-template-columns:repeat(3,minmax(0,1fr))}}
        @media(max-width:600px){.pcb{padding:12px}.pcb h2{font-size:20px}.pcb-map{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.pcb-tile{padding:10px 4px}.pcb-scene{width:104px;height:116px}.pcb-scene canvas{width:72px;height:auto}.pcb-ground,.pcb-buildings{left:16px}.pcb-ground{bottom:9px}.pcb-buildings{bottom:24px}.pcb-alarm canvas,.pcb-spark canvas{width:24px}.pcb-details{padding:12px}.pcb-indicators{grid-template-columns:1fr;gap:16px}.pcb-indicator-heading{min-height:0}.pcb-score{font-size:24px}}
        @media(prefers-reduced-motion:reduce){.pcb-alarm{animation:none}}
      `}</style>
    </div>
  );
}
