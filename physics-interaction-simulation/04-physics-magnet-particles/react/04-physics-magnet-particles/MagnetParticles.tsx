// MagnetParticles — vanilla 판(run/292/demo/04-physics-magnet-particles/index.html) 의 React 포트.
// 커서가 자석이다. 힘 = 부호 / (r² + 연화) 의 쿨롱 간이로 밀거나 당기고,
// 제자리 스프링(46)과 감쇠(0.86)가 철가루를 격자 자리로 되돌린다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./MagnetParticles.module.scss";

export type MagnetParticlesProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type DotVars = CSSProperties & { "--i"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 KeyboardEvent 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type Dot = { el: HTMLElement; c: number; r: number; hx: number; hy: number; x: number; y: number; vx: number; vy: number };

// 철가루 32개 — 8×4 격자에 지터를 준 자리가 제자리(home)다
const COLS = 8;
const ROWS = 4;
const JUMP = 28;   // 방향키 한 번에 옮기는 자석 거리
const FIELD_LABEL = "자석 실험판";
const INDEXES: number[] = [];
for (let n = 0; n < COLS * ROWS; n++) INDEXES.push(n);

export default function MagnetParticles({
  duration = 2000,
  easing = "ease-in-out",
  color = "#17141a",
}: MagnetParticlesProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const magnetRef = useRef<HTMLSpanElement | null>(null);
  const dotsBoxRef = useRef<HTMLSpanElement | null>(null);
  const dotsRef = useRef<Dot[]>([]) as Box<Dot[]>;
  const magRef = useRef<{ x: number; y: number }>({ x: 212, y: 88 }) as Box<{ x: number; y: number }>;
  const attractRef = useRef<boolean>(false) as Box<boolean>;
  const lastRef = useRef<number>(0) as Box<number>;
  const idleAtRef = useRef<number>(0) as Box<number>;
  const rafRef = useRef<number>(0) as Box<number>;
  const runningRef = useRef<boolean>(false) as Box<boolean>;
  const [attract, setAttract] = useState(false);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function homeXY(c: number, r: number): { x: number; y: number } {
    const field = fieldRef.current;
    const w = field ? field.clientWidth : 424;
    const h = field ? field.clientHeight : 176;
    return {
      x: ((c + 0.5) * w) / COLS - 5 + (r % 2) * 8 - 4,
      y: ((r + 0.5) * h) / ROWS - 5 + ((c % 3) - 1) * 6,
    };
  }

  function paintMagnet(): void {
    const magnet = magnetRef.current;
    if (magnet) magnet.style.transform = "translate(" + magRef.current.x + "px, " + magRef.current.y + "px)";
  }

  function paintDots(): void {
    const dots = dotsRef.current;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      d.el.style.transform = "translate(" + d.x + "px, " + d.y + "px)";
    }
  }

  function wake(): void {
    setDemo(false);
    if (reduced()) { paintMagnet(); paintDots(); return; }
    idleAtRef.current = performance.now();
    if (!runningRef.current) {
      runningRef.current = true;
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
  }

  function step(now: number): void {
    const dt = Math.min((now - lastRef.current) / 1000, 0.033);
    lastRef.current = now;
    const dots = dotsRef.current;
    const mag = magRef.current;
    const lively = now - idleAtRef.current < 1600;
    let allCalm = true;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const dx = d.x - mag.x;
      const dy = d.y - mag.y;
      const r2 = dx * dx + dy * dy;
      // 쿨롱 간이: 힘 = 부호 / (r² + 연화) — 거리 제곱에 반비례하고 0 나누기를 막는다
      const f = (attractRef.current ? -5200 : 4200) / (r2 + 900);
      const len = Math.sqrt(r2) || 1;
      d.vx += (dx / len) * f * dt * 60;
      d.vy += (dy / len) * f * dt * 60;
      // 제자리 스프링 + 감쇠 — 철가루가 흩어지지 않고 돌아온다
      d.vx += (d.hx - d.x) * 46 * dt;
      d.vy += (d.hy - d.y) * 46 * dt;
      d.vx *= 0.86; d.vy *= 0.86;
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (Math.abs(d.vx) + Math.abs(d.vy) > 3 || Math.abs(d.hx - d.x) + Math.abs(d.hy - d.y) > 0.4) allCalm = false;
      d.el.style.transform = "translate(" + d.x + "px, " + d.y + "px)";
    }
    if (!lively && allCalm) { paintDots(); runningRef.current = false; return; }
    rafRef.current = requestAnimationFrame(step);
  }

  function moveMagnet(x: number, y: number): void {
    const field = fieldRef.current;
    if (!field) return;
    const mag = magRef.current;
    mag.x = Math.max(-8, Math.min(field.clientWidth - 24, x));
    mag.y = Math.max(-8, Math.min(field.clientHeight - 24, y));
    paintMagnet();
    wake();
  }

  function home(): void {
    const field = fieldRef.current;
    const dots = dotsRef.current;
    for (let i = 0; i < dots.length; i++) {
      const spot = homeXY(dots[i].c, dots[i].r);
      dots[i].hx = spot.x; dots[i].hy = spot.y;
      dots[i].x = spot.x; dots[i].y = spot.y;
      dots[i].vx = 0; dots[i].vy = 0;
      dots[i].el.style.setProperty("--hx", spot.x.toFixed(1) + "px");
      dots[i].el.style.setProperty("--hy", spot.y.toFixed(1) + "px");
    }
    if (field) {
      magRef.current.x = field.clientWidth / 2 - 12;
      magRef.current.y = field.clientHeight / 2 - 12;
    }
    paintMagnet();
    paintDots();
  }

  useEffect(() => {
    const box = dotsBoxRef.current;
    if (box) {
      const nodes = box.querySelectorAll("i");
      const built: Dot[] = [];
      for (let n = 0; n < nodes.length; n++) {
        const el = nodes[n];
        const c = n % COLS;
        const r = Math.floor(n / COLS);
        const spot = homeXY(c, r);
        el.style.setProperty("--hx", spot.x.toFixed(1) + "px");
        el.style.setProperty("--hy", spot.y.toFixed(1) + "px");
        built.push({ el: el, c: c, r: r, hx: spot.x, hy: spot.y, x: spot.x, y: spot.y, vx: 0, vy: 0 });
      }
      dotsRef.current = built;
    }
    paintMagnet();
    paintDots();
    function onResize(): void { home(); }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    moveMagnet(event.clientX - r.left - 12, event.clientY - r.top - 12);
  }

  function onKeyDown(event: KeyEvt): void {
    const mag = magRef.current;
    if (event.key === "ArrowLeft") moveMagnet(mag.x - JUMP, mag.y);
    else if (event.key === "ArrowRight") moveMagnet(mag.x + JUMP, mag.y);
    else if (event.key === "ArrowUp") moveMagnet(mag.x, mag.y - JUMP);
    else if (event.key === "ArrowDown") moveMagnet(mag.x, mag.y + JUMP);
    else return;
    event.preventDefault();
  }

  function toggleMode(): void {
    const next = !attractRef.current;
    attractRef.current = next;
    setAttract(next);
    wake();
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const dotVars = (n: number): DotVars => ({ "--i": String(n) });
  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-magnet" viewBox="0 0 256 256" fill="currentColor"><g><path d="m168.36 200.36l-30 29.35a8 8 0 0 1-11.26-.05L98.46 201a8 8 0 0 1 .08-11.4l30-29Zm-142-82.76a8 8 0 0 0 0 11.28L55 157.54a8 8 0 0 0 11.38-.06l29.18-29.92l-39.79-39.79Z" opacity=".2"/><path d="M207 50.25A87.46 87.46 0 0 0 144.6 24h-.33A87.48 87.48 0 0 0 82 49.81l-31.89 32.3L20.61 112a16 16 0 0 0 .06 22.56l28.66 28.66a15.92 15.92 0 0 0 11.32 4.69h.09a16 16 0 0 0 11.36-4.82l60.9-62.4a16.08 16.08 0 0 1 22.41-.21a15.6 15.6 0 0 1 4.73 11.19a16.9 16.9 0 0 1-4.85 12L93 183.88a16 16 0 0 0-.17 22.79l28.66 28.66a16.06 16.06 0 0 0 22.52.12l61.8-60.45c34.45-34.5 34.98-90.44 1.19-124.75M60.7 156.47l-27-27L55.87 108l27 27Zm98.46-71.25a24 24 0 0 0-34.29.44l-30 30.72l-27-27l30.11-30.42A71.5 71.5 0 0 1 144.36 40h.27a71.49 71.49 0 0 1 50.71 21.53c.51.52 1 1.05 1.5 1.59l-37.68 22.1Zm53.76 53.76L151 200l-27-27l61.81-60.46l.24-.24c.4-.4.79-.8 1.17-1.21a24 24 0 0 0-17.3-40.48l25.6-15A71.66 71.66 0 0 1 213 138.87Z"/></g></symbol>
          <symbol id="ico-reset" viewBox="0 0 256 256" fill="currentColor"><g><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z" opacity=".2"/><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z"/></g></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true"><use href="#ico-magnet" /></svg>
          <span>판 위에서 마우스를 움직이면 철가루가 커서 자석을 따라 밀리고 당겨집니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onKeyDown={onKeyDown}
        >
          <span className={styles.magnet} ref={magnetRef} aria-hidden="true">
            <svg className={styles.magnetIco}><use href="#ico-magnet" /></svg>
          </span>
          <span ref={dotsBoxRef} aria-hidden="true">
            {INDEXES.map((n) => (
              <i key={n} className={styles.dot} style={dotVars(n)} />
            ))}
          </span>
        </div>
        <div className={styles.bar}>
          <button className={styles.mode} type="button" aria-pressed={attract} onClick={toggleMode}>
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-magnet" /></svg>
            <span>{attract ? "밀어내기" : "당기기"}</span>
          </button>
          <button className={styles.reset} type="button" onClick={home}>
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-reset" /></svg><span>처음대로</span>
          </button>
        </div>
      </div>
    </main>
  );
}
