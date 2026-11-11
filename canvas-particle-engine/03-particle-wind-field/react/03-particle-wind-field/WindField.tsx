// WindField — vanilla 판(run/012/demo/03-particle-wind-field/index.html) 의 React 포트.
// 판 전체가 시간에 따라 방향을 바꾸는 바람장이다 — 파티클은 매번 힘을 쌓는 게 아니라 장이 정한 목표 속도로 부드럽게 steer 된다.
// 포인터를 올리면 그 자리가 소용돌이 중심 — 접선 힘으로 돌리고 살짝 빨아들여 궤도에 올린다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 미리보기가 없다 — props 는 CSS 변수로 무대 격식에만 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WindField.module.scss";

export type WindFieldProps = {
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
type Dot = { x: number; y: number; vx: number; vy: number; r: number; ghost: boolean };
type WindState = { t: number; strength: number; px: number; py: number; inside: boolean; pulseT: number };

const N = 170;                 // 잉크 점 120 + 크림 유령 50
const GHOSTS = 50;
const R = 78;                  // 소용돌이 반경 — 같은 크기의 링으로 화면에도 보인다
const FIELD_LABEL = "중력과 바람의 필드 실험판";

export default function WindField({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#17141a",                          // vanilla $color: $stage-ink
}: WindFieldProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const windRef = useRef<HTMLSpanElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const poolRef = useRef<Dot[]>([]) as Box<Dot[]>;
  const stRef = useRef<WindState>({ t: 0, strength: 80, px: 0, py: 0, inside: false, pulseT: 0 }) as Box<WindState>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [gust, setGust] = useState(80);
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

  function scatter(): void {
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const pool = poolRef.current;
    for (let i = 0; i < N; i++) {
      pool[i] = {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: 0, vy: 0,
        r: i < GHOSTS ? 3.2 + Math.random() * 2 : 1.6 + Math.random() * 1.2,
        ghost: i < GHOSTS
      };
    }
  }

  // 소용돌이 — 중심에 가까울수록 세게. 접선(수직) 방향 힘과 살짝의 안쪽 당김으로 궤도를 만든다
  function swirl(p: Dot, sx: number, sy: number, dt: number, scale: number): void {
    const dx = p.x - sx, dy = p.y - sy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= R * R || d2 < 4) return;
    const d = Math.sqrt(d2);
    const fall = 1 - d / R;
    const inv = 1 / d;
    p.vx += (-dy * inv * 760 - dx * inv * 260) * fall * scale * dt;
    p.vy += ( dx * inv * 760 - dy * inv * 260) * fall * scale * dt;
  }

  function step(dt: number): void {
    const s = stRef.current;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    s.t += dt;
    // 사인과 코사인을 합성한 기준 풍향 — 판 전체의 바람이 천천히 돌아간다
    const base = Math.sin(s.t * 0.2) * 1.15 + Math.cos(s.t * 0.34) * 0.5;
    const steer = Math.min(1, 2.6 * dt);
    const sx = s.inside ? s.px : W / 2;
    const sy = s.inside ? s.py : H / 2;
    const live = s.inside || s.pulseT > 0;
    const scale = (!s.inside && s.pulseT > 0) ? s.pulseT : 1;
    if (s.pulseT > 0) s.pulseT -= dt;
    const pool = poolRef.current;
    for (let i = 0; i < N; i++) {
      const p = pool[i];
      if (!p) continue;
      // 자리마다 물결 — 같은 순간에도 판 위의 곳마다 바람 방향이 다르다
      const ang = base + Math.sin(p.x * 0.012 + s.t * 0.6) * 0.85 + Math.cos(p.y * 0.016 - s.t * 0.45) * 0.6;
      const spd = (p.ghost ? 0.55 : 1) * s.strength;
      p.vx += (Math.cos(ang) * spd - p.vx) * steer;
      p.vy += (Math.sin(ang) * spd * 0.62 - p.vy) * steer;
      if (live) swirl(p, sx, sy, dt, scale);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // 흐름이 판 밖으로 새면 반대편에서 다시 들어온다
      if (p.x < -10) p.x = W + 10;
      else if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      else if (p.y > H + 10) p.y = -10;
    }
    const deg = ((base * 180 / Math.PI) % 360 + 360) % 360;
    if (windRef.current) windRef.current.textContent = String(Math.round(deg)) + "°";
  }

  function draw(): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const pool = poolRef.current;
    // 크림 유령 — 크고 느린 안개 알갱이. 반투명으로 죽이면 대비가 3:1 아래로 내려가니 불투명 그대로 크게 둔다
    ctx.fillStyle = "#fff7e6";
    for (let i = 0; i < GHOSTS; i++) {
      const g = pool[i];
      if (!g) continue;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 잉크 점 — 한 경로에 몰아 넣고 한 번에 채운다
    ctx.fillStyle = "#17141a";
    ctx.beginPath();
    for (let j = GHOSTS; j < N; j++) {
      const p = pool[j];
      if (!p) continue;
      ctx.moveTo(p.x + p.r, p.y);
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    }
    ctx.fill();
    // 소용돌이 반경 링 — translate 로 원점을 옮겨 그리고 restore 로 되돌린다
    const s = stRef.current;
    if (s.inside || s.pulseT > 0) {
      const cx = s.inside ? s.px : W / 2;
      const cy = s.inside ? s.py : H / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = "rgba(255,247,230,.9)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#fff7e6";
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

  function setPointer(event: PointerEvt): void {
    const cv = cvRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    stRef.current.px = event.clientX - r.left;
    stRef.current.py = event.clientY - r.top;
  }

  function restart(): void {
    const s = stRef.current;
    s.t = 0;
    s.pulseT = 0;
    scatter();
    if (reduced()) draw();
  }

  function onResize(): void {
    fit();
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const pool = poolRef.current;
    for (let i = 0; i < N; i++) {
      const p = pool[i];
      if (!p) continue;
      if (p.x > W) p.x = W - 2;
      if (p.y > H) p.y = H - 2;
    }
    draw();
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    fit();
    restart();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 돌리지 않는다. 바람이 2초 남짓 흐른 뒤의 한 장만 남긴다.
      for (let warm = 0; warm < 120; warm++) step(1 / 60);
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

  function onGustInput(event: InputEvt): void {
    const v = Number(event.target.value);
    stRef.current.strength = v;
    setGust(v);
    if (reduced()) draw();
  }

  function onFieldKey(event: KeyEvt): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      stRef.current.pulseT = 1.1;             // 한가운데에 소용돌이를 일으킨 뒤 서서히 잦아들게 한다
      if (reduced()) draw();
    }
  }

  const cls = [styles.root, still ? styles.isStill : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M120 96a24 24 0 1 1 24-24a24 24 0 0 1-24 24m88-16a24 24 0 1 0 24 24a24 24 0 0 0-24-24m-56 80a24 24 0 1 0 24 24a24 24 0 0 0-24-24" opacity=".2"/><path d="M184 184a32 32 0 0 1-32 32c-13.7 0-26.95-8.93-31.5-21.22a8 8 0 0 1 15-5.56C137.74 195.27 145 200 152 200a16 16 0 0 0 0-32H40a8 8 0 0 1 0-16h112a32 32 0 0 1 32 32m-64-80a32 32 0 0 0 0-64c-13.7 0-26.95 8.93-31.5 21.22a8 8 0 0 0 15 5.56C105.74 60.73 113 56 120 56a16 16 0 0 1 0 32H24a8 8 0 0 0 0 16Zm88-32c-13.7 0-26.95 8.93-31.5 21.22a8 8 0 0 0 15 5.56C193.74 92.73 201 88 208 88a16 16 0 0 1 0 32H32a8 8 0 0 0 0 16h176a32 32 0 0 0 0-64"/></g></svg>
          <span>포인터를 올린 자리가 소용돌이 중심이 됩니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerDown={(event: PointerEvt) => { setPointer(event); stRef.current.inside = true; }}
          onPointerMove={(event: PointerEvt) => { setPointer(event); stRef.current.inside = true; }}
          onPointerLeave={() => { stRef.current.inside = false; }}
          onPointerCancel={() => { stRef.current.inside = false; }}
          onKeyDown={onFieldKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.live} aria-hidden="true"><span className={styles.liveUnit}>풍향</span><span className={styles.liveNum} ref={windRef}>0°</span></b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>바람 세기
            <input type="range" min={40} max={140} step={10} value={gust} aria-label="바람 세기" onChange={onGustInput} />
            <b className={styles.val}>{gust}</b>
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
