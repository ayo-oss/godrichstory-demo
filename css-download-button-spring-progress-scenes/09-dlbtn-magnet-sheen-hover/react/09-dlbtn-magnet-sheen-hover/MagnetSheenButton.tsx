// MagnetSheenButton — vanilla 판(09-dlbtn-magnet-sheen-hover) 의 React 포트.
// 커서와 버튼 중심의 거리 x PULL_RATE 만큼 버튼이 끌려가고(LEAN_MAX 에서 멈춤), 광택 띠는 커서의 가로 위치를 지수 보간으로 쫓는다.
import { useEffect, useRef } from "react";
import styles from "./MagnetSheenButton.module.scss";

const PULL_RATE = 0.12;
const SHEEN_W = 64;
const LEAN_MAX = 10;
const LEAN_LERP = 10;
const SHEEN_LERP = 14;
const START_MS = 200;
const CYCLE_MS = 2000;
const ORBIT_X = 150;
const ORBIT_Y = 48;

type Point = { x: number; y: number };
type Goal = { lx: number; ly: number; sx: number; a: number; gx: number; gy: number };

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function MagnetSheenButton() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const sheenRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const btn = btnRef.current;
    const sheen = sheenRef.current;
    if (!root || !btn || !sheen) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let lx = 0;
    let ly = 0;
    let sx = -SHEEN_W * 2;
    let alpha = 0;
    let cursor: Point | null = null;
    let kbFocus = false;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;

    sheen.style.width = SHEEN_W + "px";

    const goal = (now: number): Goal => {
      const w = btn.offsetWidth;
      const h = btn.offsetHeight;
      let d: Point | null = null;
      if (demo && now >= START_MS) {
        const a = 2 * Math.PI * ((now - START_MS) % CYCLE_MS) / CYCLE_MS;
        d = { x: ORBIT_X * Math.cos(a), y: ORBIT_Y * Math.sin(a) };
      } else if (cursor) {
        d = cursor;
      }
      if (kbFocus && !d) return { lx: 0, ly: 0, sx: w / 2, a: 1, gx: 50, gy: 50 };
      if (!d) return { lx: 0, ly: 0, sx: -SHEEN_W * 2, a: 0, gx: 50, gy: 50 };
      return {
        lx: clamp(d.x * PULL_RATE, -LEAN_MAX, LEAN_MAX),
        ly: clamp(d.y * PULL_RATE, -LEAN_MAX, LEAN_MAX),
        sx: clamp(d.x + w / 2, -SHEEN_W, w + SHEEN_W),
        a: 1,
        gx: clamp((d.x + w / 2) / w * 100, -20, 120),
        gy: clamp((d.y + h / 2) / h * 100, -40, 140)
      };
    };
    const render = (g: Goal): void => {
      btn.style.transform = `translate(${lx.toFixed(2)}px,${ly.toFixed(2)}px)`;
      sheen.style.transform = `translateX(${(sx - SHEEN_W / 2).toFixed(1)}px) skewX(-20deg)`;
      sheen.style.opacity = alpha.toFixed(3);
      btn.style.setProperty("--gx", g.gx.toFixed(1) + "%");
      btn.style.setProperty("--gy", g.gy.toFixed(1) + "%");
      btn.style.setProperty("--ga", (alpha * 0.55).toFixed(3));
    };
    const snap = (): void => {
      const g = goal(0);
      lx = g.lx; ly = g.ly; sx = g.sx; alpha = g.a;
      render(g);
    };

    const onMove = (e: PointerEvent): void => {
      const r = btn.getBoundingClientRect();
      demo = false;
      cursor = { x: e.clientX - (r.left - lx) - r.width / 2, y: e.clientY - (r.top - ly) - r.height / 2 };
      if (reduce) snap();
    };
    const onLeave = (): void => { cursor = null; if (reduce) snap(); };
    const onFocus = (): void => { kbFocus = btn.matches(":focus-visible"); if (kbFocus) demo = false; if (reduce) snap(); };
    const onBlur = (): void => { kbFocus = false; if (reduce) snap(); };
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    btn.addEventListener("focus", onFocus);
    btn.addEventListener("blur", onBlur);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      const g = goal(now);
      const kl = 1 - Math.exp(-dt * LEAN_LERP);
      const ks = 1 - Math.exp(-dt * SHEEN_LERP);
      lx += (g.lx - lx) * kl;
      ly += (g.ly - ly) * kl;
      sx += (g.sx - sx) * ks;
      alpha += (g.a - alpha) * ks;
      render(g);
      raf = requestAnimationFrame(tick);
    }

    if (reduce) snap();
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      btn.removeEventListener("focus", onFocus);
      btn.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.mg} ref={rootRef}>
        <button className={styles.mg__btn} type="button" ref={btnRef}>
          <span className={styles.mg__sheen} aria-hidden="true" ref={sheenRef} />
          <svg className={styles.mg__icon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v11M6.5 10.5 12 16l5.5-5.5M5 20h14" />
          </svg>
          <span className={styles.mg__text}>내려받기</span>
        </button>
      </div>
    </main>
  );
}
