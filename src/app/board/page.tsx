import CityBoard from "@/components/CityBoard";
import { calculateScenario } from "@/lib/engine";

// Прототип игровой визуализации на контрольном примере из датасета.
// Отдельный маршрут — не мешает работе над src/components/Simulator.tsx.
const EXAMPLE = [
  { measureId: "M7" as const, districtId: "nura" as const },
  { measureId: "M8" as const, districtId: "nura" as const },
  { measureId: "M10" as const, districtId: "nura" as const },
  { measureId: "M12" as const },
  { measureId: "M5" as const, districtId: "saryarka" as const },
];

export default function BoardPreview() {
  const scenario = calculateScenario(EXAMPLE);
  if (!scenario.valid) return <div className="p-8 text-red-500">Ошибка примера: {scenario.reason}</div>;

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-[#050a06] p-8">
      <div className="text-center font-mono text-zinc-400">
        <h1 className="text-xl font-bold text-white">Прототип: игровая доска города</h1>
        <p className="mt-1 text-sm">
          Контрольный сценарий: Score {scenario.score.toFixed(2)}, бюджет {scenario.cost}/100. Кликните на район.
        </p>
      </div>
      <CityBoard districts={scenario.districts} />
    </div>
  );
}
