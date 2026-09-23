"use client";

import { useState } from "react";
import CityBoard from "@/components/CityBoard";
import { calculateScenario, computeBaseline, type Decision } from "@/lib/engine";
import { BUDGET } from "@/lib/data";

const EXAMPLE: Decision[] = [
  { measureId: "M7", districtId: "nura" },
  { measureId: "M8", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12" },
  { measureId: "M5", districtId: "saryarka" },
];
const example = calculateScenario(EXAMPLE);
const baseline = computeBaseline();

export default function BoardPreview() {
  const [showBaseline, setShowBaseline] = useState(false);
  const scenario = showBaseline ? baseline : example;
  if (!scenario.valid) return <p className="p-8 text-red-400">Ошибка примера: {scenario.reason}</p>;
  return (
    <main className="min-h-screen bg-[#111b2b] px-3 py-8 font-mono text-[#e8e3c5] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs uppercase tracking-widest text-[#a2b6ad]">Учебная симуляция · демо доски</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-4xl">Аким на 5 часов</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#a2b6ad]">Зайдите в район, чтобы посмотреть, как решения меняют качество жизни. Показатели рассчитаны движком симуляции.</p>
        <div className="my-6 flex flex-wrap gap-3" aria-label="Сценарий доски">
          {[false, true].map((value) => <button key={String(value)} type="button" aria-pressed={showBaseline === value} onClick={() => setShowBaseline(value)} className="min-h-11 border-2 border-[#647c83] px-4 py-2 text-sm aria-pressed:border-[#e5ba70] aria-pressed:bg-[#223449] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a4d5d5]">{value ? "До решений" : "Контрольный пример"}</button>)}
        </div>
        <div className="mb-6 flex flex-wrap gap-x-10 gap-y-3" aria-live="polite">
          <p className="text-sm text-[#a2b6ad]">Score <strong className="ml-2 text-3xl text-[#e8e3c5]">{scenario.score.toFixed(2)}</strong></p>
          <p className="text-sm text-[#a2b6ad]">Бюджет <strong className="ml-2 text-3xl text-[#e8e3c5]">{scenario.cost}<span className="text-base"> / {BUDGET}</span></strong></p>
          <p className="text-sm text-[#a2b6ad]">Критических показателей <strong className="ml-2 text-3xl text-[#e8e3c5]">{scenario.nCrit}</strong></p>
        </div>
        {!showBaseline && <p className="mb-5 text-xs leading-6 text-[#a2b6ad]">M7, M8, M10 — Нура · M12 — весь город · M5 — Сарыарка</p>}
        <CityBoard districts={scenario.districts} synergiesApplied={scenario.synergiesApplied} />
        <p className="mt-6 text-xs leading-6 text-[#a2b6ad]">Синтетические данные. Результаты учебной симуляции не являются прогнозом реального развития города.</p>
      </div>
    </main>
  );
}
