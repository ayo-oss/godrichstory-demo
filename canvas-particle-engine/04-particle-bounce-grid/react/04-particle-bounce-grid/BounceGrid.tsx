// BounceGrid — vanilla 판(run/012/demo/04-particle-bounce-grid/index.html) 의 React 포트.
// 140개를 전부 견주면 9,730쌍이라 프레임이 무거워진다 — 공간을 칸으로 나눠 Map 에 "cx,cy" 문자열
// 열쇠로 묶고 이웃 칸만 견주는 공간 해시로 쌍 수를 줄인다. 값·수치는 vanilla 와 같다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다(렌더러는 실시간으로 24장을 찍는다).
// reduce 에서는 루프를 돌리지 않고 튕김이 1.5초 남짓 진행된 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BounceGrid.module.scss";

export type BounceGridProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };
type InputEvt = { target: { value: string } };
// 알갱이 한 개 — cx·cy 는 이번 프레임의 공간 해시 칸 좌표
type Bit = { x: number; y: number; vx: number; vy: number; r: number; col: number; cx: number; cy: number };

const N = 140;
const CELL = 24;                                       // 칸 한 변 — 지름이 가장 큰 알갱이 둘을 더한 것보다 크면 놓치는 쌍이 없다
const RP = 64;                                         // 포인터로 미는 반경
const COLS = ["#17141a", "#2f6df6", "#c2361a", "#2b9d74"];
const OFF = [[1, 0], [-1, 1], [0, 1], [1, 1]];         // 오른쪽과 아래 반쪽만 — 왼쪽·위 짝은 상대가 챙긴다
const FIELD_LABEL = "벽과 이웃 튕김 실험판";

export default function BounceGrid({
  duration = "2s",
  easing = "linear",
  color = "#2f6df6",
}: BounceGridProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const pairsRef = useRef<HTMLSpanElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 }) as Box<{ w: number; h: number; dpr: number }>;
  const poolRef = useRef<Bit[]>([]) as Box<Bit[]>;
  const gridRef = useRef(new Map<string, number[]>()) as Box<Map<string, number[]>>;
  const paceRef = useRef(1) as Box<number>;
  const pointRef = useRef({ x: 0, y: 0, on: false }) as Box<{ x: number; y: number; on: boolean }>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [pace, setPace] = useState(1);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 고DPI 대응 — 배킹 스토어를 devicePixelRatio 배로 키우고 좌표계는 CSS 픽셀 그대로 쓴다
  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const size = sizeRef.current;
    const r = field.getBoundingClientRect();
    size.dpr = window.devicePixelRatio || 1;
    size.w = r.width;
    size.h = r.height;
    cv.width = Math.round(r.width * size.dpr);
    cv.height = Math.round(r.height * size.dpr);
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctxRef.current = ctx;
  }

  function scatter(): void {
    const size = sizeRef.current;
    const pool = poolRef.current;
    for (let i = 0; i < N; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 90;
      pool[i] = {
        x: 12 + Math.random() * (size.w - 24),
        y: 12 + Math.random() * (size.h - 24),
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        r: 2.6 + Math.random() * 2,
        col: i % 4,
        cx: 0,
        cy: 0,
      };
    }
  }

  // 칸 묶기 — 매 프레임 Map 을 비우고 다시 채운다. 열쇠는 "cx,cy" 문자열 하나
  function buildGrid(): void {
    const grid = gridRef.current;
    const pool = poolRef.current;
    grid.clear();
    for (let i = 0; i < N; i++) {
      const p = pool[i];
      p.cx = Math.floor(p.x / CELL);
      p.cy = Math.floor(p.y / CELL);
      const key = p.cx + "," + p.cy;
      const arr = grid.get(key);
      if (!arr) {
        grid.set(key, [i]);
      } else {
        arr.push(i);
      }
    }
  }

  // 두 알갱이 충돌 — 겹침은 반씩 밀어내고, 충돌 방향 속도를 같은 질량끼리 맞바꾼다
  function hit(a: Bit, b: Bit): void {
    const dx = b.x - a.x, dy = b.y - a.y;
    const rr = a.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr || d2 === 0) return;
    const d = Math.sqrt(d2);
    const nx = dx / d, ny = dy / d;
    const push = (rr - d) / 2;
    a.x -= nx * push; a.y -= ny * push;
    b.x += nx * push; b.y += ny * push;
    const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rel < 0) {                        // 다가오는 중일 때만 — 헤어지는 쌍은 건드리지 않는다
      const imp = rel * 0.97;             // (1 + 반발계수 0.94) / 2
      a.vx += imp * nx; a.vy += imp * ny;
      b.vx -= imp * nx; b.vy -= imp * ny;
    }
  }

  function collideAll(): number {
    const grid = gridRef.current;
    const pool = poolRef.current;
    let checked = 0;
    for (let i = 0; i < N; i++) {
      const a = pool[i];
      const here = grid.get(a.cx + "," + a.cy);
      if (here) {
        for (let k = 0; k < here.length; k++) {
          const j = here[k];
          if (j > i) {                    // 같은 칸 안에서는 번호가 큰 쪽만 한 번
            checked++;
            hit(a, pool[j]);
          }
        }
      }
      for (let o = 0; o < 4; o++) {
        const near = grid.get((a.cx + OFF[o][0]) + "," + (a.cy + OFF[o][1]));
        if (!near) continue;
        for (let k2 = 0; k2 < near.length; k2++) {
          checked++;
          hit(a, pool[near[k2]]);
        }
      }
    }
    return checked;
  }

  function step(dt: number): void {
    const size = sizeRef.current;
    const pool = poolRef.current;
    const pt = pointRef.current;
    // 포인터 주변 밀어내기 — 손으로 헤치듯 반경 안의 알갱이를 민다
    if (pt.on) {
      for (let i = 0; i < N; i++) {
        const p = pool[i];
        const dx = p.x - pt.x, dy = p.y - pt.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < RP * RP && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = (1 - d / RP) * 900 * dt / d;
          p.vx += dx * f;
          p.vy += dy * f;
        }
      }
    }
    for (let m = 0; m < N; m++) {
      const q = pool[m];
      q.x += q.vx * paceRef.current * dt;
      q.y += q.vy * paceRef.current * dt;
    }
    buildGrid();
    const checked = collideAll();
    for (let w = 0; w < N; w++) {
      const g = pool[w];
      if (g.x < g.r) { g.x = g.r; g.vx = Math.abs(g.vx) * 0.92; }
      else if (g.x > size.w - g.r) { g.x = size.w - g.r; g.vx = -Math.abs(g.vx) * 0.92; }
      if (g.y < g.r) { g.y = g.r; g.vy = Math.abs(g.vy) * 0.92; }
      else if (g.y > size.h - g.r) { g.y = size.h - g.r; g.vy = -Math.abs(g.vy) * 0.92; }
    }
    // 속도 정리 — 최저를 두어 판이 죽지 않게, 최고를 두어 터지지 않게
    for (let s = 0; s < N; s++) {
      const v = pool[s];
      const sp2 = v.vx * v.vx + v.vy * v.vy;
      if (sp2 > 460 * 460) {
        const down = 460 / Math.sqrt(sp2);
        v.vx *= down; v.vy *= down;
      } else if (sp2 < 34 * 34) {
        if (sp2 < 0.01) {
          const ka = Math.random() * Math.PI * 2;
          v.vx = Math.cos(ka) * 34;
          v.vy = Math.sin(ka) * 34;
        } else {
          const up = 34 / Math.sqrt(sp2);
          v.vx *= up; v.vy *= up;
        }
      }
    }
    const out = pairsRef.current;
    if (out) out.textContent = String(checked);
  }

  function draw(): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const size = sizeRef.current;
    const pool = poolRef.current;
    const pt = pointRef.current;
    ctx.clearRect(0, 0, size.w, size.h);
    for (let i = 0; i < N; i++) {
      const p = pool[i];
      ctx.fillStyle = COLS[p.col];
      // 알갱이는 정사각형 — fillRect 로 찍는 게 그리기 비용이 가장 싸다
      ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    // 미는 반경 링 — save 로 상태를 보관하고 translate 으로 원점을 옮겨 그린 뒤 restore 로 되돌린다
    if (pt.on) {
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.strokeStyle = "rgba(23,20,26,.3)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, RP, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#2f6df6";
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function frame(now: number): void {
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    step(dt);
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    fit();
    scatter();
    function onResize(): void {
      fit();
      const size = sizeRef.current;
      for (let i = 0; i < N; i++) {
        const p = poolRef.current[i];
        if (p.x > size.w - p.r) p.x = size.w - p.r;
        if (p.y > size.h - p.r) p.y = size.h - p.r;
      }
      draw();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 돌리지 않는다. 튕김이 1.5초 남짓 진행된 한 장만 남긴다.
      for (let warm = 0; warm < 90; warm++) step(1 / 60);
      setStill(true);
      draw();
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function setPointer(e: PointerEvt): void {
    const cv = cvRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const pt = pointRef.current;
    pt.x = e.clientX - r.left;
    pt.y = e.clientY - r.top;
  }

  function onPointerIn(e: PointerEvt): void {
    setPointer(e);
    pointRef.current.on = true;
  }

  function onPointerOff(): void {
    pointRef.current.on = false;
  }

  function onKeyDown(e: KeyEvt): void {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      // 흔들기 — 전체에 한 번씩 충격을 준다
      for (let i = 0; i < N; i++) {
        const ka = Math.random() * Math.PI * 2;
        poolRef.current[i].vx += Math.cos(ka) * 150;
        poolRef.current[i].vy += Math.sin(ka) * 150;
      }
      if (reduced()) draw();
    }
  }

  function onPace(e: InputEvt): void {
    const v = Number(e.target.value);
    paceRef.current = v;
    setPace(v);
    if (reduced()) draw();
  }

  function onReset(): void {
    scatter();
    if (reduced()) draw();
  }

  const rootCls = still ? styles.root + " " + styles.isStill : styles.root;
  return (
    <main className={styles.stage}>
      <div className={rootCls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 48v160a16 16 0 0 1-16 16H48a16 16 0 0 1-16-16V48a16 16 0 0 1 16-16h160a16 16 0 0 1 16 16" opacity=".2"/><path d="M72 60a12 12 0 1 1-12-12a12 12 0 0 1 12 12m56-12a12 12 0 1 0 12 12a12 12 0 0 0-12-12m68 24a12 12 0 1 0-12-12a12 12 0 0 0 12 12M60 116a12 12 0 1 0 12 12a12 12 0 0 0-12-12m68 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12m68 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12M60 184a12 12 0 1 0 12 12a12 12 0 0 0-12-12m68 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12m68 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12"/></g></svg>
          <span>포인터를 대면 알갱이가 그 주변으로 살짝 밀려납니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerEnter={onPointerIn}
          onPointerMove={onPointerIn}
          onPointerDown={onPointerIn}
          onPointerLeave={onPointerOff}
          onPointerCancel={onPointerOff}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.live} aria-hidden="true"><span className={styles.liveNum} ref={pairsRef}>0</span><span className={styles.liveUnit}>쌍 비교/프레임</span></b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>배속
            <input
              type="range" min="0.5" max="2" step="0.25" value={pace} aria-label="배속"
              onChange={onPace}
            />
            <b className={styles.val}>{pace.toFixed(1)}배</b>
          </label>
          <button className={styles.reset} type="button" onClick={onReset}>
            <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M232 128a104 104 0 1 1-104-104a104 104 0 0 1 104 104" opacity=".2"/><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z"/></g></svg>
            <span>다시 뿌리기</span>
          </button>
        </div>
      </div>
    </main>
  );
}
