"use client";

import { useEffect, useRef, useState } from "react";
import { renderWorld, type WorldData } from "./renderWorld";
import {
  distance,
  nearbyPlace,
  moveScreen,
  WALK_SPEED,
  PLACES,
  project,
  route,
  unproject,
  type PlaceId,
  type Point,
} from "./world";
import styles from "./game.module.css";
import { translator } from "./i18n";

export default function WorldCanvas({
  data,
  travel,
  onNear,
  onInteract,
  paused,
}: {
  data: WorldData;
  travel: { id: PlaceId; serial: number };
  onNear: (id: PlaceId | null) => void;
  onInteract: () => void;
  paused: boolean;
}) {
  const t = translator(data.locale);
  const canvas = useRef<HTMLCanvasElement>(null);
  const player = useRef<Point>({ ...PLACES.city });
  const path = useRef<Point[]>([]),
    keys = useRef(new Set<string>());
  const callbacks = useRef({ data, onNear, onInteract, paused });
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    callbacks.current = { data, onNear, onInteract, paused };
    if (paused) keys.current.clear();
  }, [data, onNear, onInteract, paused]);
  useEffect(() => {
    path.current = route(player.current, PLACES[travel.id]);
  }, [travel]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext("2d");
    if (!ctx) {
      setUnavailable(true);
      return;
    }
    const pressedKeys = keys.current;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 900,
      height = 650,
      frame = 0,
      previous = 0,
      lastPaint = 0,
      facing = 1;
    let lastNear: PlaceId | null | undefined;
    const projected = project(player.current);
    const camera = { x: projected.x, y: projected.y - 50, zoom: 1 };
    const resize = () => {
      const rect = element.getBoundingClientRect();
      width = Math.round(rect.width);
      height = Math.round(rect.height);
      element.width = width;
      element.height = height;
      camera.zoom = width < 600 ? 0.85 : Math.min(1.1, width / 1100);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const animate = (time: number) => {
      const dt = Math.min((time - (previous || time)) / 1000, 0.05);
      previous = time;
      const movingAllowed = !callbacks.current.paused;
      let dx = 0,
        dy = 0;
      for (const key of keys.current) {
        if (["arrowleft", "a", "ф"].includes(key)) dx--;
        if (["arrowright", "d", "в"].includes(key)) dx++;
        if (["arrowup", "w", "ц"].includes(key)) dy--;
        if (["arrowdown", "s", "ы"].includes(key)) dy++;
      }
      const before = { ...player.current };
      if (movingAllowed && (dx || dy)) {
        path.current = [];
        player.current = moveScreen(player.current, { x: dx, y: dy }, dt);
      } else if (movingAllowed && path.current[0]) {
        const target = path.current[0],
          from = project(player.current),
          to = project(target);
        const direction = { x: to.x - from.x, y: to.y - from.y };
        if (Math.hypot(direction.x, direction.y) <= WALK_SPEED * dt) {
          player.current = target;
          path.current.shift();
        } else player.current = moveScreen(player.current, direction, dt);
      }
      const moving = distance(before, player.current) > 0.0001;
      const screenDirection = project(player.current).x - project(before).x;
      if (Math.abs(screenDirection) > 0.001)
        facing = screenDirection > 0 ? 1 : -1;
      const near = nearbyPlace(player.current);
      if (near !== lastNear) {
        lastNear = near;
        callbacks.current.onNear(near);
      }
      const p = project(player.current),
        smoothing = media.matches ? 1 : 1 - Math.exp(-dt * 7);
      camera.x += (Math.max(-480, Math.min(480, p.x)) - camera.x) * smoothing;
      camera.y +=
        (Math.max(150, Math.min(590, p.y - 30)) - camera.y) * smoothing;
      // Limit drawing to 30fps; game state lives in refs, not React renders.
      if (time - lastPaint >= 32) {
        renderWorld(
          ctx,
          width,
          height,
          camera,
          player.current,
          facing,
          moving,
          time,
          callbacks.current.data,
          path.current,
          media.matches,
        );
        lastPaint = time;
      }
      frame = requestAnimationFrame(animate);
    };
    const click = (event: PointerEvent) => {
      if (callbacks.current.paused) return;
      element.focus();
      const rect = element.getBoundingClientRect();
      const point = unproject({
        x: (event.clientX - rect.left - width / 2) / camera.zoom + camera.x,
        y: (event.clientY - rect.top - height / 2) / camera.zoom + camera.y,
      });
      path.current = route(player.current, point);
    };
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (
        [
          "arrowleft",
          "arrowright",
          "arrowup",
          "arrowdown",
          "w",
          "a",
          "s",
          "d",
          "ц",
          "ф",
          "ы",
          "в",
        ].includes(key)
      ) {
        event.preventDefault();
        keys.current.add(key);
        path.current = [];
      }
      if (["e", "у", "enter"].includes(key)) {
        event.preventDefault();
        callbacks.current.onInteract();
      }
    };
    const up = (event: KeyboardEvent) =>
      keys.current.delete(event.key.toLowerCase());
    const clear = () => keys.current.clear();
    const visibility = () => {
      cancelAnimationFrame(frame);
      clear();
      previous = 0;
      if (!document.hidden) frame = requestAnimationFrame(animate);
    };
    element.addEventListener("pointerdown", click);
    element.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    element.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", visibility);
    if (!document.hidden) frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener("pointerdown", click);
      element.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      element.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", visibility);
      pressedKeys.clear();
    };
  }, []);
  return (
    <div className={styles.canvasWrap}>
      <canvas
        ref={canvas}
        className={styles.canvas}
        tabIndex={0}
        aria-label={t("controls")}
      />
      {unavailable && (
        <p className={styles.canvasError} role="alert">
          {t("canvasError")}
        </p>
      )}
      <div className={styles.dpad} aria-label={t("controlsShort")}>
        {[
          ["↑", "arrowup"],
          ["←", "arrowleft"],
          ["↓", "arrowdown"],
          ["→", "arrowright"],
        ].map(([label, key]) => (
          <button
            type="button"
            key={key}
            aria-label={t("move", { arrow: label })}
            disabled={paused}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              keys.current.add(key);
              path.current = [];
            }}
            onPointerUp={() => keys.current.delete(key)}
            onPointerCancel={() => keys.current.delete(key)}
            onLostPointerCapture={() => keys.current.delete(key)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                keys.current.add(key);
              }
            }}
            onKeyUp={() => keys.current.delete(key)}
            onBlur={() => keys.current.delete(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
