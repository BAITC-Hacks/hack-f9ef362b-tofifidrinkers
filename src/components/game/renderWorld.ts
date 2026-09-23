import { MEASURE_MAP } from "@/lib/data";
import type { Decision, DistrictOutcome, ScenarioResult } from "@/lib/engine";
import { PALETTE as P, SPRITES, type PixelMatrix } from "../pixelSprites";
import {
  PLACES,
  project,
  isRoad,
  BUILDINGS,
  type Point,
  type PlaceId,
} from "./world";

import { districtName, translator, type Locale } from "./i18n";

export type WorldData = {
  locale: Locale;
  districts: DistrictOutcome[];
  decisions: Decision[];
  calculated: boolean;
  synergies: ScenarioResult["synergiesApplied"];
};
export type Camera = { x: number; y: number; zoom: number };
const avatar = [
  "....0000....",
  "...000000...",
  "...ABBBBA...",
  "...AB0B0A...",
  "....ABBA....",
  "...EE55EE...",
  "..EEEEEEEE..",
  "..BEEBBEEB..",
  "..BEEEEEEB..",
  "...EEEEEE...",
  "....0000....",
  "....0..0....",
];
function sprite(
  ctx: CanvasRenderingContext2D,
  matrix: PixelMatrix,
  x: number,
  y: number,
  scale: number,
) {
  matrix.forEach((row, yy) =>
    row.forEach((colour, xx) => {
      if (colour !== null) {
        ctx.fillStyle = P[colour];
        ctx.fillRect(
          Math.round(x + xx * scale),
          Math.round(y + yy * scale),
          scale,
          scale,
        );
      }
    }),
  );
}
function polygon(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}
function ground(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size = 1,
) {
  polygon(
    ctx,
    [
      project({ x, y }),
      project({ x: x + size, y }),
      project({ x: x + size, y: y + size }),
      project({ x, y: y + size }),
    ],
    color,
  );
}
function building(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  depth: number,
  height: number,
  style: number,
  time: number,
) {
  const a = project({ x, y }),
    b = project({ x: x + width, y }),
    c = project({ x: x + width, y: y + depth }),
    d = project({ x, y: y + depth });
  const lift = (p: Point) => ({ x: p.x, y: p.y - height });
  polygon(
    ctx,
    [b, c, { x: c.x + 32, y: c.y + 12 }, { x: b.x + 32, y: b.y + 12 }],
    "#233c38",
  );
  polygon(ctx, [lift(d), lift(c), c, d], style === 0 ? P[2] : P[3]);
  polygon(ctx, [lift(b), lift(c), c, b], style === 0 ? P[1] : P[2]);
  polygon(
    ctx,
    [lift(a), lift(b), lift(c), lift(d)],
    [P[14], P[10], P[8]][style % 3],
  );
  for (let floor = 10; floor < height - 6; floor += 14) {
    for (let k = 8; k < c.x - d.x - 5; k += 12) {
      ctx.fillStyle =
        (k + floor + Math.floor(time / 6000)) % 4 === 0 ? P[11] : P[15];
      ctx.fillRect(d.x + k, d.y + k / 2 - floor, 5, 6);
    }
    for (let k = 8; k < b.x - c.x - 5; k += 12) {
      ctx.fillStyle = P[3];
      ctx.fillRect(c.x + k, c.y - k / 2 - floor, 4, 6);
    }
  }
  ctx.fillStyle = P[0];
  ctx.fillRect(c.x - 7, c.y - 12, 7, 12);
}
function tree(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const p = project({ x, y });
  ctx.fillStyle = P[10];
  ctx.fillRect(p.x - 2, p.y - 15, 4, 17);
  ctx.fillStyle = P[6];
  ctx.fillRect(p.x - 13, p.y - 28, 26, 17);
  ctx.fillStyle = P[7];
  ctx.fillRect(p.x - 10, p.y - 38, 20, 24);
  ctx.fillStyle = P[8];
  ctx.fillRect(p.x - 7, p.y - 38, 12, 9);
}
function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  accent = P[5] as string,
) {
  ctx.font = "bold 14px monospace";
  const width = ctx.measureText(text).width + 20;
  ctx.fillStyle = P[0];
  ctx.fillRect(x - width / 2, y - 18, width, 28);
  ctx.fillStyle = accent;
  ctx.fillText(text, x - width / 2 + 10, y);
}
export function renderWorld(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: Camera,
  player: Point,
  facing: number,
  moving: boolean,
  time: number,
  data: WorldData,
  path: Point[],
  reduced: boolean,
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = P[0];
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(
    Math.round(width / 2 - camera.x * camera.zoom),
    Math.round(height / 2 - camera.y * camera.zoom),
  );
  ctx.scale(camera.zoom, camera.zoom);
  // Decorative river and embankment around the city island; not a statistical layer.
  ground(ctx, -1, -1, "#1e3c4a", 29);
  ground(ctx, 0, 0, P[2], 27);
  for (let y = 1; y <= 25; y++)
    for (let x = 1; x <= 25; x++) {
      ground(
        ctx,
        x,
        y,
        isRoad(x, y) ? P[1] : (x + y) % 4 === 0 ? "#3b6453" : P[6],
      );
      if (isRoad(x, y) && (x + y) % 2 === 0) {
        const p = project({ x: x + 0.5, y: y + 0.5 });
        ctx.fillStyle = P[3];
        ctx.fillRect(p.x - 3, p.y - 1, 6, 2);
      }
    }
  path.forEach((p, i) => {
    if (i % 2) return;
    const v = project(p);
    ctx.fillStyle = P[11];
    ctx.fillRect(v.x - 2, v.y - 2, 4, 4);
  });
  const objects: { depth: number; draw: () => void }[] = [];
  // Shared footprints keep the painted buildings and collision mesh aligned.
  for (const { x, y } of BUILDINGS) {
    const variant = (x * 3 + y) % 3;
    objects.push({
      depth: x + y + 3,
      draw: () => {
        const height =
          32 + ((Math.floor(x / 5) * 3 + Math.floor(y / 5) * 2) % 5) * 17;
        const hero = project(player),
          left = project({ x, y: y + 1.5 }),
          right = project({ x: x + 1.6, y }),
          front = project({ x: x + 1.6, y: y + 1.5 });
        // Fade foreground walls when they would obscure the mayor on the road behind.
        ctx.save();
        if (
          hero.x > left.x - 12 &&
          hero.x < right.x + 12 &&
          hero.y > project({ x, y }).y - height &&
          hero.y - 35 < front.y &&
          player.x + player.y < x + y + 3
        )
          ctx.globalAlpha = 0.32;
        building(ctx, x, y, 1.6, 1.5, height, variant, reduced ? 0 : time);
        ctx.restore();
      },
    });
    objects.push({ depth: x + y + 1, draw: () => tree(ctx, x - 1, y + 1) });
    objects.push({
      depth: x + y + 4,
      draw: () => tree(ctx, x + 2.5, y + 1.5),
    });
  }
  // Public amenities and lamps share the same palette and road-free lots.
  for (const point of [
    { x: 8, y: 6 },
    { x: 18, y: 16 },
    { x: 8, y: 18 },
  ]) {
    objects.push({
      depth: point.x + point.y,
      draw: () => {
        const p = project(point);
        ctx.fillStyle = P[10];
        ctx.fillRect(p.x - 9, p.y - 4, 18, 4);
        ctx.fillRect(p.x - 7, p.y, 3, 5);
        ctx.fillRect(p.x + 4, p.y, 3, 5);
      },
    });
  }
  for (const point of [
    { x: 12.3, y: 8 },
    { x: 22.3, y: 18 },
    { x: 8, y: 22.3 },
  ]) {
    objects.push({
      depth: point.x + point.y,
      draw: () => {
        const p = project(point);
        ctx.fillStyle = P[3];
        ctx.fillRect(p.x, p.y - 32, 3, 32);
        ctx.fillStyle = P[11];
        ctx.fillRect(p.x - 4, p.y - 35, 11, 5);
      },
    });
  }
  // Baiterek-inspired landmark: a stylised observation tower, entirely procedural.
  objects.push({
    depth: 23,
    draw: () => {
      const p = project({ x: 11, y: 11 });
      ground(ctx, 10, 10, P[3], 2);
      polygon(
        ctx,
        [
          { x: p.x - 16, y: p.y },
          { x: p.x - 5, y: p.y - 96 },
          { x: p.x + 5, y: p.y - 96 },
          { x: p.x + 16, y: p.y },
        ],
        P[4],
      );
      ctx.fillStyle = P[15];
      ctx.fillRect(p.x - 3, p.y - 88, 6, 88);
      ctx.fillStyle = P[10];
      ctx.fillRect(p.x - 23, p.y - 116, 46, 26);
      ctx.fillStyle = P[11];
      ctx.fillRect(p.x - 17, p.y - 123, 34, 37);
      ctx.fillStyle = P[5];
      ctx.fillRect(p.x - 12, p.y - 118, 12, 8);
    },
  });
  for (const [id, place] of Object.entries(PLACES) as [PlaceId, Point][]) {
    if (id === "city") {
      const cityProjects = data.decisions.filter((d) => !d.districtId);
      if (cityProjects.length)
        objects.push({
          depth: 29,
          draw: () => {
            const p = project(place);
            label(
              ctx,
              translator(data.locale)(data.calculated ? "funded" : "planned"),
              p.x,
              p.y + 65,
              data.calculated ? P[8] : P[11],
            );
          },
        });
      continue;
    }
    const district = data.districts.find((d) => d.districtId === id);
    if (!district) continue;
    const tier =
      district.finalScore >= 65
        ? "thriving"
        : district.finalScore >= 50
          ? "developing"
          : "struggling";
    const lot = { x: place.x - 1.8, y: place.y - 1.8 };
    const p = project(lot);
    objects.push({
      depth: lot.x + lot.y,
      draw: () => {
        sprite(ctx, SPRITES.ground[tier], p.x - 36, p.y - 10, 3);
        sprite(ctx, SPRITES.buildings[tier], p.x - 36, p.y - 63, 3);
      },
    });
    const funded = data.decisions.filter((d) => d.districtId === id);
    if (funded.length)
      objects.push({
        depth: place.x + place.y,
        draw: () => {
          ctx.strokeStyle = data.calculated ? P[8] : P[11];
          ctx.lineWidth = 3;
          ctx.strokeRect(p.x - 39, p.y - 66, 78, 96);
          label(
            ctx,
            translator(data.locale)(data.calculated ? "funded" : "planned"),
            p.x,
            p.y + 45,
            data.calculated ? P[8] : P[11],
          );
          if (
            data.calculated &&
            funded.some(
              (d) => MEASURE_MAP[d.measureId].direction === "Экология",
            )
          )
            tree(ctx, lot.x + 1, lot.y - 0.5);
        },
      });
  }
  // Small road traffic loops, away from the player's walking lane.
  for (let i = 0; i < 4; i++) {
    const pos = reduced ? i * 5 + 2 : 2 + ((time / 1600 + i * 5) % 22);
    const p = project({ x: pos, y: i % 2 ? 13.5 : 3.5 });
    objects.push({
      depth: pos + (i % 2 ? 13.5 : 3.5),
      draw: () => {
        ctx.fillStyle = i % 2 ? P[11] : P[14];
        ctx.fillRect(p.x - 10, p.y - 10, 20, 9);
        ctx.fillStyle = P[15];
        ctx.fillRect(p.x - 6, p.y - 13, 11, 5);
        ctx.fillStyle = P[0];
        ctx.fillRect(p.x - 7, p.y - 2, 4, 4);
        ctx.fillRect(p.x + 5, p.y - 2, 4, 4);
      },
    });
  }
  for (let i = 0; i < 5; i++) {
    const pos = reduced ? i * 4 + 2 : 2 + ((time / 5000 + i * 4) % 22),
      p = project({ x: 23.5, y: pos });
    objects.push({
      depth: 23.5 + pos,
      draw: () => {
        ctx.fillStyle = P[11];
        ctx.fillRect(p.x - 2, p.y - 12, 4, 4);
        ctx.fillStyle = i % 2 ? P[12] : P[14];
        ctx.fillRect(p.x - 3, p.y - 8, 6, 7);
        ctx.fillStyle = P[0];
        ctx.fillRect(p.x - 3, p.y - 1, 2, 4);
        ctx.fillRect(p.x + 1, p.y - 1, 2, 4);
      },
    });
  }
  objects.push({
    depth: player.x + player.y + 0.2,
    draw: () => {
      const p = project(player),
        bob = reduced
          ? 0
          : moving
            ? Math.sin(time / 85) * 2
            : Math.sin(time / 700);
      ctx.fillStyle = "#111b2b88";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 3, 15, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y + bob));
      ctx.scale(facing, 1);
      avatar.forEach((row, y) =>
        Array.from(row).forEach((c, x) => {
          if (c !== ".") {
            ctx.fillStyle = P[parseInt(c, 16)];
            ctx.fillRect((x - 6) * 3, (y - 12) * 3, 3, 3);
          }
        }),
      );
      ctx.fillStyle = P[0];
      const step = !reduced && moving ? Math.round(Math.sin(time / 85) * 3) : 0;
      ctx.fillRect(-6, step, 5, 4);
      ctx.fillRect(3, -step, 5, 4);
      ctx.restore();
      // The mayor's emerald marker remains visible above scenery.
    },
  });
  objects.sort((a, b) => a.depth - b.depth).forEach((o) => o.draw());
  for (const [id, place] of Object.entries(PLACES) as [PlaceId, Point][]) {
    const p = project(place),
      district = data.districts.find((d) => d.districtId === id);
    label(
      ctx,
      id === "city"
        ? translator(data.locale)("city")
        : districtName(id, data.locale),
      p.x,
      p.y + 35,
    );
    if (district) {
      const critical = district.indicators.filter((i) => i.critical);
      if (critical.length) {
        sprite(
          ctx,
          SPRITES.alarm.struggling,
          p.x - 12,
          p.y - 83 - (reduced ? 0 : Math.round(Math.sin(time / 350) * 3)),
          3,
        );
        label(ctx, `! ${critical.length}`, p.x, p.y - 92, P[13]);
      }
      if (data.synergies.some((s) => s.district === district.name))
        sprite(ctx, SPRITES.synergy.thriving, p.x + 32, p.y - 60, 3);
    }
  }
  const hero = project(player);
  polygon(
    ctx,
    [
      { x: hero.x, y: hero.y - 65 },
      { x: hero.x + 7, y: hero.y - 54 },
      { x: hero.x, y: hero.y - 44 },
      { x: hero.x - 7, y: hero.y - 54 },
    ],
    P[8],
  );
  ctx.restore();
}
