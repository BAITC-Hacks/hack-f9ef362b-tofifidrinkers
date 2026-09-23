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
export const ROAD_TILES: Point[] = [];
for (let x = 1; x <= 25; x++)
  for (let y = 1; y <= 25; y++) if (isRoad(x, y)) ROAD_TILES.push({ x, y });
export function nearestRoad(point: Point): Point {
  return ROAD_TILES.reduce((best, tile) =>
    distance(tile, point) < distance(best, point) ? tile : best,
  );
}
export function neighbours(point: Point): Point[] {
  return [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 },
  ].filter((p) => isRoad(p.x, p.y));
}
/** All movement follows the road graph, including taps on buildings. */
export function route(start: Point, destination: Point): Point[] {
  const from = nearestRoad(start),
    to = nearestRoad(destination);
  const key = (p: Point) => `${p.x},${p.y}`;
  const queue = [from],
    previous = new Map<string, Point | null>([[key(from), null]]);
  for (let i = 0; i < queue.length; i++) {
    const point = queue[i];
    if (key(point) === key(to)) break;
    for (const next of neighbours(point))
      if (!previous.has(key(next))) {
        previous.set(key(next), point);
        queue.push(next);
      }
  }
  if (!previous.has(key(to))) return [];
  const path: Point[] = [];
  let point: Point | null = to;
  while (point) {
    path.unshift(point);
    point = previous.get(key(point)) ?? null;
  }
  return distance(start, from) > 0.01 ? path : path.slice(1);
}
export function nearbyPlace(point: Point): PlaceId | null {
  const place = (Object.keys(PLACES) as PlaceId[]).find(
    (id) => distance(point, PLACES[id]) < 1.8,
  );
  return place ?? null;
}
