import type { DistrictId } from "@/lib/data";
export type PlaceId = DistrictId | "city";
export type Point = { x: number; y: number };
export const PLACES: Record<PlaceId, Point> = {
  esil: { x: 9, y: 3 },
  almaty: { x: 23, y: 8 },
  nura: { x: 23, y: 21 },
  saryarka: { x: 9, y: 23 },
  baikonur: { x: 3, y: 13 },
  city: { x: 13, y: 13 },
};
export const HALF_TILE = { x: 26, y: 13 };
export const project = ({ x, y }: Point): Point => ({
  x: (x - y) * HALF_TILE.x,
  y: (x + y) * HALF_TILE.y,
});
export const unproject = ({ x, y }: Point): Point => ({
  x: (x / HALF_TILE.x + y / HALF_TILE.y) / 2,
  y: (y / HALF_TILE.y - x / HALF_TILE.x) / 2,
});
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export const isRoad = (x: number, y: number) =>
  x >= 1 &&
  x <= 25 &&
  y >= 1 &&
  y <= 25 &&
  ([3, 13, 23].includes(x) || [3, 13, 23].includes(y));
// The renderer and navigation share the exact building footprints.
export const BUILDINGS = [5, 10, 15, 20].flatMap((x) =>
  [5, 10, 15, 20]
    .filter((y) => !(x === 10 && y === 10))
    .map((y) => ({ x, y, width: 1.6, depth: 1.5 })),
);
const OBSTACLES = [
  ...BUILDINGS,
  { x: 10, y: 10, width: 2, depth: 2 }, // observation tower
  ...Object.entries(PLACES)
    .filter(([id]) => id !== "city")
    .map(([, p]) => ({ x: p.x - 2.8, y: p.y - 2.8, width: 2, depth: 2 })),
  ...BUILDINGS.flatMap(({ x, y }) => [
    { x: x - 1.15, y: y + 0.85, width: 0.3, depth: 0.3 },
    { x: x + 2.35, y: y + 1.35, width: 0.3, depth: 0.3 },
  ]),
];
const RADIUS = 0.18;
export function canWalk(point: Point) {
  return (
    point.x >= 1 &&
    point.x <= 26 &&
    point.y >= 1 &&
    point.y <= 26 &&
    !OBSTACLES.some(
      (b) =>
        point.x > b.x - RADIUS &&
        point.x < b.x + b.width + RADIUS &&
        point.y > b.y - RADIUS &&
        point.y < b.y + b.depth + RADIUS,
    )
  );
}
export function segmentClear(from: Point, to: Point) {
  const samples = Math.max(1, Math.ceil(distance(from, to) / 0.08));
  for (let i = 0; i <= samples; i++)
    if (
      !canWalk({
        x: from.x + ((to.x - from.x) * i) / samples,
        y: from.y + ((to.y - from.y) * i) / samples,
      })
    )
      return false;
  return true;
}
export const WALK_SPEED = 145; // screen-space world pixels/second; independent of direction
export function moveScreen(from: Point, direction: Point, dt: number): Point {
  const length = Math.hypot(direction.x, direction.y);
  if (!length) return from;
  const shift = unproject({
    x: (direction.x / length) * WALK_SPEED * dt,
    y: (direction.y / length) * WALK_SPEED * dt,
  });
  const to = { x: from.x + shift.x, y: from.y + shift.y };
  // Stop at an obstacle without silently redirecting a single key diagonally.
  const steps = Math.max(1, Math.ceil(distance(from, to) / 0.05));
  let last = from;
  for (let i = 1; i <= steps; i++) {
    const p = {
      x: from.x + (shift.x * i) / steps,
      y: from.y + (shift.y * i) / steps,
    };
    if (!canWalk(p)) break;
    last = p;
  }
  return last;
}
const NODES: Point[] = [];
for (let x = 1; x <= 26; x += 0.5)
  for (let y = 1; y <= 26; y += 0.5)
    if (canWalk({ x, y })) NODES.push({ x, y });
const key = (p: Point) => `${p.x},${p.y}`;
const NODE_KEYS = new Set(NODES.map(key));
const STEPS = [-0.5, 0, 0.5].flatMap((x) =>
  [-0.5, 0, 0.5].filter((y) => x !== 0 || y !== 0).map((y) => ({ x, y })),
);
/** Walkable public space allows screen-axis controls; BFS routes avoid all building footprints. */
export function route(start: Point, destination: Point): Point[] {
  const from = [...NODES]
    .sort((a, b) => distance(a, start) - distance(b, start))
    .find((p) => segmentClear(start, p));
  if (!from) return [];
  const to = NODES.reduce((best, p) =>
    distance(p, destination) < distance(best, destination) ? p : best,
  );
  const queue = [from],
    previous = new Map<string, Point | null>([[key(from), null]]);
  for (let i = 0; i < queue.length; i++) {
    const point = queue[i];
    if (key(point) === key(to)) break;
    for (const shift of STEPS) {
      const next = { x: point.x + shift.x, y: point.y + shift.y };
      if (
        NODE_KEYS.has(key(next)) &&
        !previous.has(key(next)) &&
        segmentClear(point, next)
      ) {
        previous.set(key(next), point);
        queue.push(next);
      }
    }
  }
  if (!previous.has(key(to))) return [];
  const path: Point[] = [];
  let point: Point | null = to;
  while (point) {
    path.unshift(point);
    point = previous.get(key(point)) ?? null;
  }
  return distance(start, from) > 0.001 ? path : path.slice(1);
}
export function nearbyPlace(point: Point): PlaceId | null {
  return (
    (Object.keys(PLACES) as PlaceId[]).find(
      (id) => distance(point, PLACES[id]) < 1.8,
    ) ?? null
  );
}
