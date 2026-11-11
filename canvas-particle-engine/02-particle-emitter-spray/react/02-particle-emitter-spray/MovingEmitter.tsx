// MovingEmitter — vanilla 판(run/012/demo/02-particle-emitter-spray/index.html) 의 React 포트.
// 파티클 각각을 움직이는 게 아니라 뿌리는 곳을 움직인다 — 방출기는 스스로 가로 톱니(삼각파) 주사 + 세로 사인 경로를
// 돌며 초당 90개를 뿌리고, 드래그하면 노즐이 손끝으로 따라와 그 자리에서 계속 분사한다. 놓으면 자율 주행으로 돌아간다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 미리보기가 없다 — props 는 CSS 변수로 무대 격식에만 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MovingEmitter.module.scss";

export type MovingEmitterProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type PointerEvt = { clientX: number; clientY: number; pointerId?: number; preventDefault(): void };
type KeyEvt = { key: string; preventDefault(): void };
type InputEvt = { target: { value: string } };
type Grain = { x: number; y: number; vx: number; vy: number; r: number; life: number; age: number; pick: number };
type Point = { x: number; y: number };
type EmitterState = {
  cursor: number; t: number;
  ex: number; ey: number; aim: number; prevEx: number; prevEy: number;   // 방출기 위치와 분사 방향
  emitAcc: number; spreadDeg: number;
  dragging: boolean; px: number; py: number;                             // 손끝 위치
};

const POOL = 170;            // 초당 90개 × 최대 수명 1.5초 + 여유 — 링 버퍼로 돌려 쓴다
const RATE = 90;             // 초당 방출 수
const FIELD_LABEL = "이동하는 방출기 실험판";

export default function MovingEmitter({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#0a4fe8",                          // vanilla $color: $subject-blue-deep
}: MovingEmitterProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const aliveRef = useRef<HTMLSpanElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const poolRef = useRef<Grain[]>([]) as Box<Grain[]>;
  const trailRef = useRef<Point[]>([]) as Box<Point[]>;   // 방출기가 지나온 길 — quadraticCurveTo 로 부드럽게 잇는다
  const stRef = useRef<EmitterState>({
    cursor: 0, t: 0,
    ex: 0, ey: 0, aim: 0, prevEx: 0, prevEy: 0,
    emitAcc: 0, spreadDeg: 24,
    dragging: false, px: 0, py: 0,
  }) as Box<EmitterState>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [spread, setSpread] = useState(24);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 고DPI 대응 — 배킹 스토어를 devicePixelRatio 배로 키우고 좌표계는 CSS 픽셀 그대로 쓴다
  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    const ctx = ctxRef.current;
    if (!field || !cv || !ctx) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnAt(x: number, y: number, ang: number, spreadRad: number): void {
    const pool = poolRef.current;
    const s = stRef.current;
    const p = pool[s.cursor];
    s.cursor = (s.cursor + 1) % POOL;                 // 가장 낡은 칸을 덮어 쓴다
    if (!p) return;
    const a = ang + (Math.random() - 0.5) * spreadRad;
    const sp = 70 + Math.random() * 110;
    p.x = x; p.y = y;
    p.vx = Math.cos(a) * sp;
    p.vy = Math.sin(a) * sp;
    p.r = 1.8 + Math.random() * 1.8;
    p.life = 0.7 + Math.random() * 0.8;
    p.age = 0;
    p.pick = Math.random();
  }

  function step(dt: number): void {
    const s = stRef.current;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    s.t += dt;
    // 자율 주행 경로 — 가로는 삼각파(톱니 주사), 세로는 사인. 레이저가 판을 훑는 길이다.
    let tri = (s.t * 0.14) % 2;
    tri = tri < 1 ? tri : 2 - tri;
    const pad = Math.max(12, W * 0.07);
    const tx = pad + tri * (W - pad * 2);
    const ty = H * 0.46 + Math.sin(s.t * 2 + 0.7) * H * 0.24;
    s.prevEx = s.ex; s.prevEy = s.ey;
    if (s.dragging) {
      const k = 1 - Math.exp(-14 * dt);             // 노즐이 손끝으로 스르르 온다
      s.ex += (s.px - s.ex) * k;
      s.ey += (s.py - s.ey) * k;
    } else {
      const k2 = 1 - Math.exp(-6 * dt);             // 자율 경로도 급차 없이 따라간다
      s.ex += (tx - s.ex) * k2;
      s.ey += (ty - s.ey) * k2;
    }
    // 분사 방향 — 이동 방향을 따라 부드럽게 돌아간다
    const vx = (s.ex - s.prevEx) / dt, vy = (s.ey - s.prevEy) / dt;
    if (vx * vx + vy * vy > 900) {
      const want = Math.atan2(vy, vx);
      let diff = want - s.aim;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      s.aim += diff * Math.min(1, 10 * dt);
    } else {
      s.aim += Math.sin(s.t * 3.1) * 1.5 * dt;        // 제자리에서는 노즐이 살짝 흔들린다
    }
    trailRef.current.push({ x: s.ex, y: s.ey });
    if (trailRef.current.length > 26) trailRef.current.shift();
    s.emitAcc += RATE * dt;
    const spreadRad = s.spreadDeg * Math.PI / 180;
    while (s.emitAcc >= 1) {
      spawnAt(s.ex, s.ey, s.aim, spreadRad);
      s.emitAcc -= 1;
    }
    const pool = poolRef.current;
    for (let i = 0; i < POOL; i++) {
      const p = pool[i];
      if (!p || p.age >= p.life) continue;
      p.age += dt;
      p.vy += 210 * dt;                           // 중력 — 뿌린 알갱이를 끌어내린다
      p.vx *= (1 - 0.35 * dt);                    // 공기 저항으로 살짝 감쇠
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  function draw(): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    // 지나온 길 — 점을 이어 붙이는 게 아니라 중간점을 향해 quadraticCurveTo 로 잇는다
    const trail = trailRef.current;
    if (trail.length > 2) {
      ctx.strokeStyle = "rgba(23,20,26,.32)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length - 1; i++) {
        const mx = (trail[i].x + trail[i + 1].x) / 2;
        const my = (trail[i].y + trail[i + 1].y) / 2;
        ctx.quadraticCurveTo(trail[i].x, trail[i].y, mx, my);
      }
      const lastPt = trail[trail.length - 1];
      ctx.lineTo(lastPt.x, lastPt.y);
      ctx.stroke();
    }
    const pool = poolRef.current;
    let alive = 0;
    for (let j = 0; j < POOL; j++) {
      const p = pool[j];
      if (!p || p.age >= p.life) continue;
      alive++;
      const tt = p.age / p.life;
      // 감쇠 — 태어날 때 잠깐 나타나고 수명이 끝나갈수록 옅어져 자리를 비운다
      ctx.globalAlpha = tt < 0.12 ? tt / 0.12 : 1 - (tt - 0.12) / 0.88;
      ctx.fillStyle = p.pick < 0.5 ? "#17141a" : (p.pick < 0.8 ? "#0a4fe8" : "#2f6df6");
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const s = stRef.current;
    // 노즐 — save 로 상태를 보관하고 이동·회전시켜 그린 뒤 restore 로 되돌린다
    ctx.save();
    ctx.translate(s.ex, s.ey);
    ctx.rotate(s.aim);
    ctx.fillStyle = "#17141a";
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-7, -8);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(23,20,26,.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(-15, 0);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#0a4fe8";
    ctx.beginPath();
    ctx.arc(s.ex, s.ey, 2.4, 0, Math.PI * 2);
    ctx.fill();
    if (aliveRef.current) aliveRef.current.textContent = String(alive);
  }

  function frame(now: number): void {
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    step(dt);
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  function setPointer(event: PointerEvt): void {
    const cv = cvRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    stRef.current.px = event.clientX - r.left;
    stRef.current.py = event.clientY - r.top;
  }

  function restart(): void {
    const s = stRef.current;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    s.t = 0;
    trailRef.current.length = 0;
    s.emitAcc = 0;
    const pool = poolRef.current;
    for (let i = 0; i < POOL; i++) {
      if (pool[i]) pool[i].age = pool[i].life;   // 전부 빈 칸으로
    }
    s.ex = Math.max(12, W * 0.07);
    s.ey = H * 0.46;
    s.aim = 0;
    if (reduced()) draw();
  }

  function onResize(): void {
    fit();
    draw();
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    const pool = poolRef.current;
    for (let i = 0; i < POOL; i++) {
      pool[i] = { x: 0, y: 0, vx: 0, vy: 0, r: 1, life: 1, age: 1, pick: 0 };   // age >= life — 빈 칸
    }
    fit();
    restart();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 돌리지 않는다. 뿌리던 순간의 상태를 1.3초 남짓 밟아 본 뒤 한 장만 남긴다.
      for (let warm = 0; warm < 80; warm++) step(1 / 60);
      setStill(true);
      draw();
    } else {
      lastRef.current = 0;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function onSpreadInput(event: InputEvt): void {
    const v = Number(event.target.value);
    stRef.current.spreadDeg = v;
    setSpread(v);
    if (reduced()) draw();
  }

  function onFieldPointerDown(event: PointerEvt): void {
    const field = fieldRef.current;
    stRef.current.dragging = true;
    setPointer(event);
    if (field && typeof event.pointerId === "number") field.setPointerCapture(event.pointerId);
  }

  function onFieldKey(event: KeyEvt): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const s = stRef.current;
      for (let i = 0; i < 60; i++) spawnAt(s.ex, s.ey, (i / 60) * Math.PI * 2, 0);   // 사방으로 일제 분사
      if (reduced()) draw();
    }
  }

  const cls = [styles.root, still ? styles.isStill : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M216 116v36a80 80 0 0 1-80 80c-44.18 0-55.81-24-93.32-90a20 20 0 0 1 34.64-20L96 152V44a20 20 0 0 1 40 0v56a20 20 0 0 1 40 0v16a20 20 0 0 1 40 0" opacity=".2"/><path d="M196 88a27.86 27.86 0 0 0-13.35 3.39A28 28 0 0 0 144 74.7V44a28 28 0 0 0-56 0v80l-3.82-6.13A28 28 0 0 0 35.73 146l4.67 8.23C74.81 214.89 89.05 240 136 240a88.1 88.1 0 0 0 88-88v-36a28 28 0 0 0-28-28m12 64a72.08 72.08 0 0 1-72 72c-37.63 0-47.84-18-81.68-77.68l-4.69-8.27V138A12 12 0 0 1 54 121.61a11.9 11.9 0 0 1 6-1.6a12 12 0 0 1 10.41 6a2 2 0 0 0 .14.23l18.67 30A8 8 0 0 0 104 152V44a12 12 0 0 1 24 0v68a8 8 0 0 0 16 0v-12a12 12 0 0 1 24 0v20a8 8 0 0 0 16 0v-4a12 12 0 0 1 24 0Z"/></g></svg>
          <span>노즐을 잡아 끌면 그 자리에서 계속 뿌립니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerDown={onFieldPointerDown}
          onPointerMove={setPointer}
          onPointerUp={() => { stRef.current.dragging = false; }}
          onPointerCancel={() => { stRef.current.dragging = false; }}
          onKeyDown={onFieldKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.live} aria-hidden="true"><span className={styles.liveNum} ref={aliveRef}>0</span><span className={styles.liveUnit}>알갱이 비행 중</span></b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>분사 폭
            <input type="range" min={12} max={60} step={6} value={spread} aria-label="분사 폭" onChange={onSpreadInput} />
            <b className={styles.val}>{spread}°</b>
          </label>
          <button className={styles.reset} type="button" onClick={restart}>
            <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M232 128a104 104 0 1 1-104-104a104 104 0 0 1 104 104" opacity=".2"/><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z"/></g></svg>
            <span>처음부터</span>
          </button>
        </div>
      </div>
    </main>
  );
}
