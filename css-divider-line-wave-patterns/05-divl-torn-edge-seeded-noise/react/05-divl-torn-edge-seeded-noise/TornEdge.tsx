// TornEdge — vanilla 판(05-divl-torn-edge-seeded-noise) 의 React 포트.
// 직접 구현한 시드 난수로 꼭짓점 높이를 정해 clip-path polygon 으로 종이 아래 경계를 찢는다. 같은 시드는 같은 모양이다.
import { useEffect, useRef } from "react";
import styles from "./TornEdge.module.scss";

type Box<T> = { current: T };

const TORN_SEED = 20261008;
const TORN_STEP = 9;
const TORN_AMP = 20;
const BASE_Y = 48;
const START_MS = 200;
const TEAR_MS = 1400;
const CYCLE_MS = 2000;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

export default function TornEdge() {
  const sheetRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const btnRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;

  useEffect(() => {
    const sheet = sheetRef.current;
    const btn = btnRef.current;
    if (!sheet || !btn) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = mulberry32(TORN_SEED);
    const table: number[] = [];
    for (let i = 0; i < 256; i += 1) table.push(rand());
    const noiseAt = (k: number): number => {
      const big = k / 4;
      const i0 = Math.floor(big);
      const f = smooth(big - i0);
      const coarse = table[i0 % 256] * (1 - f) + table[(i0 + 1) % 256] * f;
      const fine = table[(k * 7 + 3) % 256];
      return 0.65 * coarse + 0.35 * fine;
    };

    let demo = !reduce;
    let progress = reduce ? 1 : 0;
    let restartAt: number | null = null;
    let t0: number | null = null;
    let raf = 0;

    const paint = (): void => {
      const count = Math.max(8, Math.ceil(sheet.clientWidth / TORN_STEP));
      const edge: string[] = [];
      for (let k = 0; k <= count; k += 1) {
        const xr = k / count;
        const y = xr <= progress ? BASE_Y + TORN_AMP * noiseAt(k) : BASE_Y + TORN_AMP * 0.5;
        edge.push((xr * 100).toFixed(2) + "% " + y.toFixed(1) + "px");
      }
      edge.reverse();
      sheet.style.clipPath = "polygon(" + ["0 0", "100% 0"].concat(edge).join(",") + ")";
    };
    const onClick = (): void => {
      demo = false;
      if (reduce) {
        progress = 1;
        paint();
        return;
      }
      restartAt = -1;
    };
    btn.addEventListener("click", onClick);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      let local: number | null = null;
      if (restartAt === -1) restartAt = ts;
      if (demo) local = (ts - t0) % CYCLE_MS;
      else if (restartAt !== null) local = ts - restartAt;
      if (local !== null) {
        progress = Math.min(1, Math.max(0, (local - START_MS) / TEAR_MS));
        paint();
      }
      raf = requestAnimationFrame(tick);
    }

    paint();
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div className={styles.dv}>
      <div className={styles.paper} role="separator">
        <div className={styles.sheet} ref={sheetRef} />
      </div>
      <div className={styles.bar}>
        <button className={styles.btn} ref={btnRef} type="button">다시 찢기</button>
        <p className={styles.meta}>
          <span className={styles.tag}>TORN_SEED</span> <b>{TORN_SEED}</b>
        </p>
      </div>
    </div>
  );
}
