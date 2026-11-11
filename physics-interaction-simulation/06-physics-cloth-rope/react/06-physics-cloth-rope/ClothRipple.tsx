// ClothRipple — vanilla 판(run/292/demo/06-physics-cloth-rope/index.html) 의 React 포트.
// 맨 윗줄이 고정점(핀)인 12x5 점 격자. 커서 반경 36px 안의 점을 밀고, 이웃 변위 끌림
// (가로 실 두 개 + 윗점) 이 파동을 번지게 하며 제자리 스프링(90)과 감쇠(0.9)가 잡아당긴다.
// 물리 상수·식은 vanilla 와 같은 값이다. 격자 미리보기(isDemo)는 module.scss 의 키프레임이 돌린다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./ClothRipple.module.scss";

export type ClothRippleProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type DotVars = CSSProperties & { "--hx"?: string; "--hy"?: string; "--r"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 KeyboardEvent 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type Dot = { c: number; r: number; hx: number; hy: number; ox: number; oy: number; vx: number; vy: number };
type Home = { hx: number; hy: number; r: number };

const COLS = 12;
const ROWS = 5;
const JUMP = 24; // 키보드 한 번에 커서가 옮겨 가는 거리
const HINT = "판을 문지르면 점 격자가 출렁이고 이웃 점 끌림으로 파동이 퍼집니다";
const FIELD_LABEL = "천 격자판";
const RESET_LABEL = "가만히 두기";

function HandIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden="true" fill="currentColor"><g><path d="M216 116v36a80 80 0 0 1-80 80c-44.18 0-55.81-24-93.32-90a20 20 0 0 1 34.64-20L96 152V44a20 20 0 0 1 40 0v56a20 20 0 0 1 40 0v16a20 20 0 0 1 40 0" opacity=".2"/><path d="M196 88a27.86 27.86 0 0 0-13.35 3.39A28 28 0 0 0 144 74.7V44a28 28 0 0 0-56 0v80l-3.82-6.13A28 28 0 0 0 35.73 146l4.67 8.23C74.81 214.89 89.05 240 136 240a88.1 88.1 0 0 0 88-88v-36a28 28 0 0 0-28-28m12 64a72.08 72.08 0 0 1-72 72c-37.63 0-47.84-18-81.68-77.68l-4.69-8.27V138A12 12 0 0 1 54 121.61a11.9 11.9 0 0 1 6-1.6a12 12 0 0 1 10.41 6a2 2 0 0 0 .14.23l18.67 30A8 8 0 0 0 104 152V44a12 12 0 0 1 24 0v68a8 8 0 0 0 16 0v-12a12 12 0 0 1 24 0v20a8 8 0 0 0 16 0v-4a12 12 0 0 1 24 0Z"/></g></svg>
  );
}

function ResetIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden="true" fill="currentColor"><g><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z" opacity=".2"/><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z"/></g></svg>
  );
}

export default function ClothRipple({
  duration = 2000,
  easing = "ease-in-out",
  color = "#2f6df6",
}: ClothRippleProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLSpanElement | null>(null);
  const elsBox = useRef<Array<HTMLElement | null>>([]) as Box<Array<HTMLElement | null>>;
  const dotsBox = useRef<Dot[]>([]) as Box<Dot[]>;
  const ptrBox = useRef({ x: -60, y: -60 }) as Box<{ x: number; y: number }>;
  const lastBox = useRef(0) as Box<number>;
  const idleBox = useRef(0) as Box<number>;
  const runningBox = useRef(false) as Box<boolean>;
  const frameBox = useRef(0) as Box<number>;
  const [homes, setHomes] = useState<Home[]>([]);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function homeXY(c: number, r: number, w: number, h: number): { x: number; y: number } {
    return { x: ((c + 0.5) * w) / COLS, y: 14 + (r * (h - 22)) / (ROWS - 1) };
  }

  // 점 격자를 판 크기에 맞춰 놓는다 — 첫 마운트와 창 크기 변화에서 같은 함수를 쓴다
  function layout(): void {
    const field = fieldRef.current;
    if (!field) { return; }
    const w = field.clientWidth;
    const h = field.clientHeight;
    const dots = dotsBox.current;
    const fresh = dots.length === 0;
    const next: Home[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const home = homeXY(c, r, w, h);
        if (fresh) {
          dots.push({ c: c, r: r, hx: home.x, hy: home.y, ox: 0, oy: 0, vx: 0, vy: 0 });
        } else {
          const d = dots[r * COLS + c];
          d.hx = home.x;
          d.hy = home.y;
        }
        next.push({ hx: home.x, hy: home.y, r: r });
      }
    }
    setHomes(next);
  }

  function paint(): void {
    const dots = dotsBox.current;
    const els = elsBox.current;
    for (let i = 0; i < dots.length; i++) {
      const el = els[i];
      if (!el) { continue; }
      const d = dots[i];
      el.style.transform =
        "translate(calc(var(--hx) + " + d.ox.toFixed(1) + "px), calc(var(--hy) + " + d.oy.toFixed(1) + "px))";
    }
    const cursor = cursorRef.current;
    if (cursor) {
      cursor.style.transform = "translate(" + ptrBox.current.x + "px, " + ptrBox.current.y + "px)";
    }
  }

  function wake(): boolean {
    setDemo(false);
    if (reduced()) { paint(); return false; }
    idleBox.current = performance.now();
    if (!runningBox.current) {
      runningBox.current = true;
      lastBox.current = performance.now();
      frameBox.current = requestAnimationFrame(step);
    }
    return true;
  }

  function step(now: number): void {
    const dt = Math.min((now - lastBox.current) / 1000, 0.033);
    lastBox.current = now;
    const lively = now - idleBox.current < 1400;
    let allCalm = true;
    const dots = dotsBox.current;
    const ptr = ptrBox.current;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (d.r === 0) { continue; } // 고정점은 안 흔든다
      const x = d.hx + d.ox;
      const y = d.hy + d.oy;
      // 커서 반경 36px 안의 점을 밀어낸다 — 커서가 지나가는 길이 파동의 시작점이다
      const dx = x - ptr.x;
      const dy = y - ptr.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < 1296 && dist2 > 0.01) {
        const dist = Math.sqrt(dist2);
        const push = (1 - dist / 36) * 900;
        d.vx += (dx / dist) * push * dt;
        d.vy += (dy / dist) * push * dt;
        allCalm = false;
      }
      // 이웃 끌림 — 왼쪽·오른쪽·위 점의 현재 변위를 조금 따라간다 (천의 가로 실)
      const left = dots[d.r * COLS + Math.max(0, d.c - 1)];
      const right = dots[d.r * COLS + Math.min(COLS - 1, d.c + 1)];
      const up = dots[Math.max(0, d.r - 1) * COLS + d.c];
      d.vx += ((left.ox + right.ox) / 2 - d.ox) * 60 * dt;
      d.vy += ((left.oy + right.oy + up.oy) / 3 - d.oy) * 60 * dt;
      // 제자리 스프링 + 감쇠
      d.vx += -d.ox * 90 * dt;
      d.vy += -d.oy * 90 * dt;
      d.vx *= 0.9;
      d.vy *= 0.9;
      d.ox += d.vx * dt;
      d.oy += d.vy * dt;
      if (Math.abs(d.ox) + Math.abs(d.oy) > 0.25 || Math.abs(d.vx) + Math.abs(d.vy) > 2) { allCalm = false; }
    }
    paint();
    if (!lively && allCalm) { runningBox.current = false; return; }
    frameBox.current = requestAnimationFrame(step);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const field = fieldRef.current;
    if (!field) { return; }
    const r = field.getBoundingClientRect();
    ptrBox.current.x = event.clientX - r.left - 14;
    ptrBox.current.y = event.clientY - r.top - 14;
    wake();
  }

  function onPointerLeave(): void {
    ptrBox.current.x = -60;
    ptrBox.current.y = -60;
    paint();
  }

  function onKeyDown(event: KeyEvt): void {
    const ptr = ptrBox.current;
    if (event.key === "ArrowLeft") { ptr.x -= JUMP; }
    else if (event.key === "ArrowRight") { ptr.x += JUMP; }
    else if (event.key === "ArrowUp") { ptr.y -= JUMP; }
    else if (event.key === "ArrowDown") { ptr.y += JUMP; }
    else { return; }
    event.preventDefault();
    wake();
  }

  function onReset(): void {
    const dots = dotsBox.current;
    for (let i = 0; i < dots.length; i++) {
      dots[i].ox = 0;
      dots[i].oy = 0;
      dots[i].vx = 0;
      dots[i].vy = 0;
    }
    paint();
  }

  useEffect(() => {
    layout();
    const onResize = (): void => { layout(); paint(); };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frameBox.current);
    };
  }, []);

  // 점이 새로 그려진 뒤에 현재 변위를 한 번 칠한다
  useEffect(() => { paint(); }, [homes]);

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <p className={styles.hint}><HandIcon className={styles.ico} /><span>{HINT}</span></p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onKeyDown={onKeyDown}
        >
          <span className={styles.pin} aria-hidden="true"></span>
          <span className={styles.cursor} ref={cursorRef} aria-hidden="true">
            <HandIcon className={styles.cursorIco} />
          </span>
          <span aria-hidden="true">
            {homes.map((home, i) => (
              <i
                key={i}
                className={home.r === 0 ? `${styles.dot} ${styles.dotPin}` : styles.dot}
                ref={(el: HTMLElement | null) => { elsBox.current[i] = el; }}
                style={{
                  "--hx": home.hx.toFixed(1) + "px",
                  "--hy": home.hy.toFixed(1) + "px",
                  "--r": String(home.r),
                } as DotVars}
              />
            ))}
          </span>
        </div>
        <div className={styles.bar}>
          <button className={styles.reset} type="button" onClick={onReset}>
            <ResetIcon className={styles.ico} /><span>{RESET_LABEL}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
