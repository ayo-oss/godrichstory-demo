// IsometricPainterStackingOrder — vanilla 판(run/333/demo/04-isometric-painter-stacking-order/index.html)
// 의 React 포트. 고정 블록은 z-index = round((col+row)*10) 을 한 번만 계산해 굳히고,
// 궤도를 도는 이동 블록만 매 프레임 같은 공식으로 z-index 를 다시 계산해 앞뒤를 뒤집는다.
import { useEffect, useRef } from "react";
import styles from "./IsometricPainterStackingOrder.module.scss";

export type IsometricPainterStackingOrderProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };

const HINT = "z-index = (col+row)×10 을 매 프레임 계산해 대입합니다 — 이동 블록이 격자를 가로지르며 앞뒤가 저절로 뒤집힙니다";
const ARIA_FIELD = "이동하는 블록이 고정 격자 블록들 사이를 지나며 앞뒤 순서가 계산으로 바뀌는 장면";
const LABEL_Z = "이동 블록 z-index = ";

const N = 4;
const TILE_W = 40, TILE_H = 20;
const CENTER = (N - 1) / 2;
const RADIUS = CENTER + 0.35;

function toScreen(col: number, row: number): { x: number; y: number } {
  return { x: ((col - row) * TILE_W) / 2, y: ((col + row) * TILE_H) / 2 };
}

export default function IsometricPainterStackingOrder({
  duration = "2s",
  easing = "linear",
  color = "#c93000"
}: IsometricPainterStackingOrderProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const travelerRef = useRef<HTMLDivElement | null>(null);
  const zTextRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const world = worldRef.current;
    const traveler = travelerRef.current;
    const root = rootRef.current;
    if (!world || !traveler || !root) return;

    let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    const blocks: { x: number; y: number }[] = [];
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const p = toScreen(col, row);
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
        blocks.push(p);
      }
    }
    const shiftX = -(minX + maxX) / 2;
    const shiftY = -maxY / 2;

    let idx = 0;
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const p = blocks[idx++];
        const el = document.createElement("div");
        el.className = styles.block;
        el.style.setProperty("--tx", (p.x + shiftX).toFixed(2) + "px");
        el.style.setProperty("--ty", (p.y + shiftY).toFixed(2) + "px");
        el.style.zIndex = String(Math.round((col + row) * 10));
        world.appendChild(el);
      }
    }
    world.appendChild(traveler);

    function paint(t: number): void {
      const ang = t * 0.9;
      const col = CENTER + Math.cos(ang) * RADIUS;
      const row = CENTER + Math.sin(ang) * RADIUS;
      const p = toScreen(col, row);
      traveler!.style.setProperty("--tx", (p.x + shiftX).toFixed(2) + "px");
      traveler!.style.setProperty("--ty", (p.y + shiftY).toFixed(2) + "px");
      const z = Math.round((col + row) * 10) + 1;
      traveler!.style.zIndex = String(z);
      if (zTextRef.current) zTextRef.current.textContent = String(z);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      paint(0.7);
      root.classList.add(styles.isStill);
    } else {
      const start = performance.now();
      const step = (now: number): void => {
        paint((now - start) / 1000);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
      while (world.firstChild) world.removeChild(world.firstChild);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ps} ref={rootRef} data-duration={duration} data-easing={easing} data-color={color}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.field} role="img" aria-label={ARIA_FIELD}>
          <div className={styles.world} ref={worldRef}>
            <div className={styles.blockTraveler} ref={travelerRef}></div>
          </div>
        </div>
        <p className={styles.meta}>
          <span className={styles.metaLabel}>{LABEL_Z}</span>
          <b className={styles.zVal} ref={zTextRef}>0</b>
        </p>
      </div>
    </main>
  );
}
