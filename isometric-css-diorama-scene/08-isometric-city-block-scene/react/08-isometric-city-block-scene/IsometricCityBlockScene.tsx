// IsometricCityBlockScene — vanilla 판(run/333/demo/08-isometric-city-block-scene/index.html)
// 의 React 포트. 건물 높이·창문 개수·깜빡임 지연은 mulberry32(시드 42) 로 한 번만 뽑아
// 고정한다 — 배치는 정적, 창문 깜빡임만 진짜 @keyframes 무한 애니메이션으로 계속 돈다.
import { useEffect, useRef } from "react";
import styles from "./IsometricCityBlockScene.module.scss";

export type IsometricCityBlockSceneProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "건물 높이는 시드 42 난수로, 창문 깜빡임 지연도 같은 시드 난수로 정해 매번 같은 도시가 나옵니다";
const ARIA_FIELD = "높이가 저마다 다른 건물 아홉 채가 늘어서고 창문이 각자 다른 박자로 깜빡이는 도시 블록 장면";
const LABEL_SEED = "시드 ";
const LABEL_BUILDINGS = " · 건물 ";
const LABEL_UNIT = "채";

const SEED = 42;
const N = 3;
const TILE_W = 40, TILE_H = 20;

function mulberry32(seed: number): () => number {
  let a = seed;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Building = { x: number; y: number; h: number; windows: number[] };

export default function IsometricCityBlockScene({
  duration = "3s",
  easing = "ease-in-out",
  color = "#2f6df6"
}: IsometricCityBlockSceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const countRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const world = worldRef.current;
    const root = rootRef.current;
    if (!world || !root) return;

    const rand = mulberry32(SEED);
    const buildings: Building[] = [];
    let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const x = ((col - row) * TILE_W) / 2;
        const y = ((col + row) * TILE_H) / 2;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        const h = 40 + Math.round(rand() * 60);
        const winCount = 2 + Math.round(rand() * 3);
        const windows: number[] = [];
        for (let i = 0; i < winCount; i++) windows.push(rand() * 3);
        buildings.push({ x, y, h, windows });
      }
    }
    const shiftX = -(minX + maxX) / 2;
    const shiftY = -maxY / 2;

    while (world.firstChild) world.removeChild(world.firstChild);
    for (const b of buildings) {
      const bld = document.createElement("div");
      bld.className = styles.bld;
      bld.style.setProperty("--tx", (b.x + shiftX).toFixed(2) + "px");
      bld.style.setProperty("--ty", (b.y + shiftY).toFixed(2) + "px");
      bld.style.setProperty("--h", b.h + "px");

      const roof = document.createElement("div");
      roof.className = styles.roof;
      bld.appendChild(roof);

      const winRows = Math.max(1, Math.floor(b.h / 22));
      let wi = 0;
      for (let r = 0; r < winRows && wi < b.windows.length; r++) {
        const win = document.createElement("div");
        win.className = styles.win;
        win.style.top = 8 + r * 16 + "px";
        win.style.setProperty("--delay", b.windows[wi].toFixed(2) + "s");
        bld.appendChild(win);
        wi++;
      }
      world.appendChild(bld);
    }
    if (countRef.current) countRef.current.textContent = String(buildings.length);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.add(styles.isStill);

    return () => {
      while (world.firstChild) world.removeChild(world.firstChild);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cb} ref={rootRef} data-duration={duration} data-easing={easing} data-color={color}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.field} role="img" aria-label={ARIA_FIELD}>
          <div className={styles.world} ref={worldRef}></div>
        </div>
        <p className={styles.meta}>
          <span>{LABEL_SEED}</span>
          <b>{SEED}</b>
          <span>{LABEL_BUILDINGS}</span>
          <b ref={countRef}>9</b>
          <span>{LABEL_UNIT}</span>
        </p>
      </div>
    </main>
  );
}
