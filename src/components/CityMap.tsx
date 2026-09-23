import type { CSSProperties } from "react";
import { DISTRICTS, MEASURE_MAP } from "@/lib/data";
import type { DistrictId } from "@/lib/data";
import type { Decision } from "@/lib/engine";

export type Destination = DistrictId | "city" | null;

const PLACES: Record<DistrictId, { x: number; y: number; color: string; accent: string; kind: "towers" | "homes" | "mixed" }> = {
  esil: { x: 245, y: 150, color: "#9bca9c", accent: "#67a3b6", kind: "towers" },
  almaty: { x: 545, y: 118, color: "#d1c99a", accent: "#d99470", kind: "mixed" },
  saryarka: { x: 755, y: 305, color: "#bfd29a", accent: "#c99978", kind: "homes" },
  baikonur: { x: 494, y: 437, color: "#afc8b4", accent: "#aaa1cc", kind: "mixed" },
  nura: { x: 205, y: 372, color: "#b4caa2", accent: "#d2b274", kind: "homes" },
};

function Tree({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}>
    <ellipse cy="6" rx="15" ry="7" fill="#416b45" opacity=".13" />
    <path d="M0 3v-23" stroke="#88725a" strokeWidth="5" />
    <ellipse cy="-30" rx="17" ry="23" fill="#699964" /><ellipse cx="-5" cy="-34" rx="12" ry="18" fill="#88b67a" />
  </g>;
}

function Building({ x, y, height = 55, color = "#eee6d5", roof = "#c18f72", width = 34 }: {
  x: number; y: number; height?: number; color?: string; roof?: string; width?: number;
}) {
  const w = width, h = height;
  return <g transform={`translate(${x} ${y})`}>
    <path d={`M-${w} 0 0 ${w / 2} ${w + 13} 0 13 -${w / 2}Z`} fill="#486852" opacity=".12" transform="translate(7 8)" />
    <path d={`M-${w} 0 V-${h} L0 ${-h + w / 2} V${w / 2}Z`} fill={color} />
    <path d={`M0 ${w / 2} V${-h + w / 2} L${w} -${h} V0Z`} fill={color} />
    <path d={`M0 ${w / 2} V${-h + w / 2} L${w} -${h} V0Z`} fill="#655a57" opacity=".16" />
    <path d={`M-${w} -${h} 0 ${-h - w / 2} ${w} -${h} 0 ${-h + w / 2}Z`} fill={roof} />
    {Array.from({ length: Math.max(1, Math.floor(h / 23)) }, (_, row) => <g key={row} fill="#789896">
      <path d={`M${-w + 8} ${-h + 15 + row * 21} l9 4 v10 l-9 -4Z`} />
      <path d={`M${w - 17} ${-h + 19 + row * 21} l9 -4 v10 l-9 4Z`} />
    </g>)}
    <path d="M-10 11v-16l-9 -4v16" fill="#a88b69" />
  </g>;
}

function Person() {
  return <g>
    <ellipse cy="3" rx="15" ry="6" fill="#2d5748" opacity=".2" />
    <path d="M-7 -19 -8 0M7 -19 8 0" stroke="#253e4f" strokeWidth="7" strokeLinecap="round" />
    <path d="M-9 0h-7M8 0h7" stroke="#26394a" strokeWidth="5" strokeLinecap="round" />
    <path d="M-12 -36 -17 -22M12 -36 17 -22" stroke="#d5a27d" strokeWidth="6" strokeLinecap="round" />
    <path d="M-11 -42 Q0 -47 11 -42 L13 -18 H-13Z" fill="#407c77" />
    <path d="M-4 -44 0 -27 5 -44" fill="#f8f0db" /><path d="M0 -39 2 -31 0 -27 -2 -31Z" fill="#d5af68" />
    <rect x="-4" y="-50" width="8" height="9" rx="3" fill="#c79370" />
    <ellipse cy="-58" rx="12" ry="14" fill="#e0af87" />
    <path d="M-12 -58Q-17 -77 1 -76Q18 -74 12 -56L8 -67Q-2 -61 -10 -66Z" fill="#344447" />
    <path d="M-5 -57h1m9 0h1" stroke="#344447" strokeWidth="2" strokeLinecap="round" />
    <path d="M-3 -51q3 3 6 0" fill="none" stroke="#a86d54" strokeWidth="1.5" strokeLinecap="round" />
  </g>;
}

export function AkimPortrait() {
  return <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#e4edcc" /><path d="M13 81Q50 57 87 81V100H13Z" fill="#bfd7ba" /><g transform="translate(50 109) scale(1.12)"><Person /></g><path d="M78 7 85 17 78 27 71 17Z" fill="#97bc68" /><path d="M78 7v20l-7 -10Z" fill="#c3dc81" /></svg>;
}

export default function CityMap({ destination, decisions, onVisit }: {
  destination: Destination; decisions: Decision[]; onVisit: (destination: Exclude<Destination, null>) => void;
}) {
  const cityProjects = decisions.filter((d) => MEASURE_MAP[d.measureId].scope === "Город").length;
  const position = destination && destination !== "city" ? PLACES[destination] : { x: 464, y: 265 };
  const location = destination === "city" || !destination ? "Акимат" : DISTRICTS.find((d) => d.id === destination)!.name;
  return <section className="city-world" aria-label="Карта города">
    <div className="map-heading"><span className="map-live-dot" />АСТАНА <span className="map-caption">Ваш город начинается с решения</span></div>
    <div className="map-stage">
      <svg className="city-illustration" viewBox="0 0 960 580" aria-hidden="true">
        <defs>
          <pattern id="grass" width="37" height="29" patternUnits="userSpaceOnUse"><path d="m7 9 3 -3m17 18 2 -3" stroke="#95b18d" strokeWidth="1.5" opacity=".25" /></pattern>
          <linearGradient id="water" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a9d4d5" /><stop offset="1" stopColor="#88bdc7" /></linearGradient>
          <filter id="tile-shadow" x="-30%" y="-40%" width="160%" height="190%"><feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#557952" floodOpacity=".14" /></filter>
        </defs>
        <rect width="960" height="580" fill="#dce7cc" /><rect width="960" height="580" fill="url(#grass)" />
        <path d="M-70 270Q185 260 350 200T740 175T1040 110" fill="none" stroke="#c4d5b1" strokeWidth="75" />
        <path d="M-70 270Q185 260 350 200T740 175T1040 110" fill="none" stroke="url(#water)" strokeWidth="55" />
        <path d="M-50 263Q185 253 350 193T740 168T1020 106" fill="none" stroke="#e8f6ed" strokeWidth="2" opacity=".65" />
        <path d="M55 440 185 375 465 265 545 118M245 150 465 265 755 305M465 265 494 437 775 552" fill="none" stroke="#afba9d" strokeWidth="29" strokeLinejoin="round" />
        <path d="M55 440 185 375 465 265 545 118M245 150 465 265 755 305M465 265 494 437 775 552" fill="none" stroke="#f6f0d9" strokeWidth="22" strokeLinejoin="round" />
        <path d="M397 222 433 180" stroke="#e2cdb0" strokeWidth="29" /><path d="M392 223 428 179M404 229 440 185" stroke="#a9997a" strokeWidth="2" />
        <g opacity=".9"><Tree x={90} y={158} size={1.1} /><Tree x={111} y={181} size={.8} /><Tree x={827} y={474} size={1.15} /><Tree x={866} y={445} /><Tree x={665} y={89} /><Tree x={684} y={111} size={.7} /><Tree x={94} y={510} /><Tree x={366} y={491} size={.8} /></g>
        {(Object.entries(PLACES) as [DistrictId, typeof PLACES[DistrictId]][]).map(([id, place]) => {
          const selected = destination === id;
          const funded = decisions.filter((d) => d.districtId === id).length;
          return <g key={id} transform={`translate(${place.x} ${place.y})`} className={selected ? "district-island is-visited" : "district-island"}>
            <path d="M-113 0 0 -57 113 0 0 57Z" fill={place.color} filter="url(#tile-shadow)" stroke={selected ? "#427969" : "#d4dfc1"} strokeWidth={selected ? 4 : 2} />
            <path d="M-113 0v10L0 67l113 -57V0L0 57Z" fill="#91a981" />
            <path d="M-85 10 0 -32 83 11M-36 -30 45 12" stroke="#e8e5c8" strokeWidth="11" fill="none" />
            <Building x={-34} y={-7} height={place.kind === "towers" ? 91 : 52} color="#f6efda" roof={place.accent} />
            <Building x={29} y={-28} height={place.kind === "homes" ? 37 : 74} width={26} color="#e6dfc7" roof={place.accent} />
            <Building x={46} y={23} height={place.kind === "towers" ? 60 : 38} width={24} color="#fbf1dc" roof={place.accent} />
            <Tree x={-74} y={6} size={.7} /><Tree x={75} y={-1} size={.6} />
            {funded > 0 && <g className="funded-marker" transform="translate(-62 -61)"><circle r="13" fill="#427969" stroke="#f9fff0" strokeWidth="3" /><path d="m-5 0 3 4 7 -8" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" /></g>}
          </g>;
        })}
        <g transform="translate(465 267)"><ellipse cy="-21" rx="73" ry="34" fill="#c5d4b0" /><Building x={0} y={-30} height={55} width={42} color="#faf3df" roof="#759b96" /><path d="M0 -106v-28h20v13H0" stroke="#6d8275" strokeWidth="2" fill="#91bdd0" /><path d="M-9 -67v23M9 -67v23" stroke="#fdf9e9" strokeWidth="5" /></g>
        <g className="akim-on-map" style={{ transform: `translate(${position.x - 3}px, ${position.y + 53}px)` }}>
          <g className="akim-diamond"><path d="M0 -104 9 -91 0 -78 -9 -91Z" fill="#76a65a" /><path d="M0 -104v26l-9 -13Z" fill="#bcdb7c" /></g>
          <Person />
        </g>
        <g transform="translate(884 60)" fill="none" stroke="#6e8c71" strokeWidth="1.5"><circle r="21" opacity=".3" /><path d="M0 -15 -5 6 0 3 5 6Z" fill="#6e8c71" /><text y="-28" textAnchor="middle" fill="#6e8c71" stroke="none" fontSize="10">С</text></g>
      </svg>
      {DISTRICTS.map((district) => {
        const place = PLACES[district.id];
        const count = decisions.filter((d) => d.districtId === district.id).length;
        return <button key={district.id} className={`map-stop ${destination === district.id ? "is-current" : ""}`}
          style={{ "--stop-x": `${place.x / 9.6}%`, "--stop-y": `${(place.y + 92) / 5.8}%` } as CSSProperties}
          onClick={() => onVisit(district.id)} aria-label={`Посетить район ${district.name}`} aria-pressed={destination === district.id}>
          {district.name}{count > 0 && <span className="map-count">{count}</span>}<span aria-hidden="true" className="map-stop-arrow">↗</span>
        </button>;
      })}
      <button className={`map-stop city-hall-stop ${destination === "city" ? "is-current" : ""}`}
        style={{ "--stop-x": "48.5%", "--stop-y": "58%" } as CSSProperties}
        aria-label="Посетить акимат" aria-pressed={destination === "city"} onClick={() => onVisit("city")}>Акимат {cityProjects > 0 && <span className="map-count">{cityProjects}</span>}<span aria-hidden="true">⌂</span></button>
    </div>
    <div className="map-bottom"><span><i className="legend-dot" />Ваш персонаж · {location}</span><span>Нажмите на район, чтобы отправиться туда</span></div>
    <p className="sr-only" role="status">{destination ? `Аким прибыл: ${location}. Выберите проект для финансирования.` : "Аким находится у акимата. Выберите район на карте."}</p>
  </section>;
}

