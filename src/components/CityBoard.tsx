"use client";

// Прототип «игровой» визуализации города — отдельный компонент, не связан с Simulator.tsx,
// чтобы не конфликтовать с параллельной работой над интерфейсом. Показывает ровно те же
// данные, что и текстовый режим (DistrictOutcome из calculateScenario), без своей логики.
import { useState } from "react";
import { DistrictOutcome, IndicatorOutcome } from "@/lib/engine";
import { INDICATORS } from "@/lib/data";

type Tier = "thriving" | "developing" | "struggling";

function tierOf(score: number): Tier {
  if (score >= 65) return "thriving";
  if (score >= 50) return "developing";
  return "struggling";
}

const TIER_COLORS: Record<Tier, { base: string; roof: string; glow: string; label: string }> = {
  thriving: { base: "#1f9d55", roof: "#38d97a", glow: "#38d97a", label: "Процветает" },
  developing: { base: "#b7862c", roof: "#e0ab4b", glow: "#e0ab4b", label: "Развивается" },
  struggling: { base: "#9d1f2c", roof: "#e0473f", glow: "#e0473f", label: "В упадке" },
};

// Блочная (изометрическая, "pixel-art"-стилизация) плитка района — сгенерирована из CSS/SVG,
// без внешних спрайтов/шрифтов, чтобы не тянуть сетевые зависимости в демо.
function DistrictTile({ district, selected, onSelect }: { district: DistrictOutcome; selected: boolean; onSelect: () => void }) {
  const tier = tierOf(district.finalScore);
  const colors = TIER_COLORS[tier];
  const critical = district.indicators.filter((i) => i.critical).length;
  const buildingCount = tier === "thriving" ? 5 : tier === "developing" ? 3 : 2;

  return (
    <button
      onClick={onSelect}
      className={`group relative flex flex-col items-center gap-2 rounded-lg border-4 p-3 transition-transform hover:-translate-y-1 ${
        selected ? "border-yellow-300" : "border-zinc-800"
      }`}
      style={{
        background: "linear-gradient(180deg, #0d1b12 0%, #071008 100%)",
        boxShadow: selected ? `0 0 0 3px #000, 0 0 18px ${colors.glow}` : "0 0 0 3px #000",
        imageRendering: "pixelated",
      }}
    >
      {critical > 0 && (
        <span
          className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-black bg-red-600 text-xs font-bold text-white"
          title={`${critical} критических показателей`}
        >
          !
        </span>
      )}

      {/* "изометрическая" плитка-земля */}
      <svg width="96" height="56" viewBox="0 0 96 56" style={{ imageRendering: "pixelated" }}>
        <polygon points="48,4 92,26 48,48 4,26" fill="#274a2f" stroke="#0a1a0d" strokeWidth="3" />
      </svg>

      {/* блочные "здания", высота/число зависит от состояния района */}
      <div className="-mt-9 flex h-16 items-end gap-1">
        {Array.from({ length: buildingCount }).map((_, i) => {
          const h = 14 + ((i * 7) % 20);
          return (
            <div key={i} className="flex flex-col items-center" style={{ imageRendering: "pixelated" }}>
              <div style={{ width: 10, height: h, background: colors.base, border: "2px solid #000" }} />
              <div style={{ width: 12, height: 6, background: colors.roof, border: "2px solid #000", marginTop: -2 }} />
            </div>
          );
        })}
      </div>

      <div className="mt-1 text-center font-mono">
        <div className="text-[11px] uppercase tracking-widest text-zinc-400">{district.name}</div>
        <div className="text-lg font-bold text-white">{district.finalScore.toFixed(1)}</div>
        <div className="text-[10px]" style={{ color: colors.glow }}>
          {colors.label}
        </div>
      </div>
    </button>
  );
}

function indicatorLabel(indicator: IndicatorOutcome): string {
  return INDICATORS.find((i) => i.code === indicator.indicator)?.name ?? indicator.indicator;
}

function DistrictDetails({ district }: { district: DistrictOutcome }) {
  return (
    <div className="rounded-lg border-2 border-zinc-800 bg-black/60 p-4 font-mono">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm uppercase tracking-widest text-zinc-400">{district.name} — показатели</h3>
        <span className="text-xs text-zinc-500">было {district.baseScore.toFixed(1)} → стало {district.finalScore.toFixed(1)}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {district.indicators.map((indicator) => (
          <div key={indicator.indicator} className="flex items-center gap-2 text-xs">
            <span className={`w-24 shrink-0 truncate ${indicator.critical ? "text-red-400" : "text-zinc-400"}`}>
              {indicator.indicator} {indicatorLabel(indicator)}
            </span>
            <div className="relative h-2 flex-1 bg-zinc-800">
              <div
                className="absolute inset-y-0 left-0"
                style={{ width: `${indicator.final}%`, background: indicator.critical ? "#e0473f" : "#38d97a" }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-zinc-300">{indicator.final.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CityBoard({ districts }: { districts: DistrictOutcome[] }) {
  const [selectedId, setSelectedId] = useState(districts[0]?.districtId ?? null);
  const selected = districts.find((d) => d.districtId === selectedId) ?? null;

  return (
    <div className="rounded-2xl border-4 border-zinc-900 bg-[#050a06] p-6">
      <div className="mb-6 grid grid-cols-2 gap-6 sm:grid-cols-5">
        {districts.map((d) => (
          <DistrictTile key={d.districtId} district={d} selected={d.districtId === selectedId} onSelect={() => setSelectedId(d.districtId)} />
        ))}
      </div>
      {selected && <DistrictDetails district={selected} />}
    </div>
  );
}
