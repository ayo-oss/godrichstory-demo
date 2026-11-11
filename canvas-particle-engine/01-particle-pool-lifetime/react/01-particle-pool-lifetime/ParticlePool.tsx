// ParticlePool — vanilla 판(run/012/demo/01-particle-pool-lifetime/index.html) 의 React 포트.
// 풀 220칸은 배열 길이를 고정해 두고 수명이 끝난 칸을 그 자리에서 덮어쓴다(push/splice 없음 — 프레임마다 할당이 없어 시간이 튀지 않는다).
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 미리보기가 없다 — props 는 CSS 변수로 무대 격식에만 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ParticlePool.module.scss";

export type ParticlePoolProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type InputEvt = { target: { value: string } };
type Particle = { x: number; y: number; vx: number; vy: number; r: number; life: number; age: number; wait: number };

const POOL = 220;                 // 풀 크기 — 이 숫자는 처음 한 번만 정해지고 끝까지 바뀌지 않는다
const FIELD_LABEL = "파티클 풀 실험판";

export default function ParticlePool({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#2f6df6",                          // vanilla $color: $subject-blue
}: ParticlePoolProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const aliveRef = useRef<HTMLSpanElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const poolRef = useRef<Particle[]>([]) as Box<Particle[]>;
  const lifeSecRef = useRef(1.2) as Box<number>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [life, setLife] = useState(12);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 파티클 한 칸 — 객체를 새로 만들지 않고 이 자리의 값만 갈아 끼운다
  function spawn(p: Particle, seedT?: number): Particle {
    const W = sizeRef.current.w, H = sizeRef.current.h;
    p.x = Math.random() * W;
    p.y = H + Math.random() * 18;
    p.vx = (Math.random() - 0.5) * 18;
    p.vy = -(90 + Math.random() * 70);
    p.r = 1.2 + Math.random() * 2.6;
    p.life = lifeSecRef.current * (0.6 + Math.random() * 0.8);
    p.age = seedT === undefined ? 0 : Math.random() * p.life;
    p.wait = 0;
    return p;
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

  function draw(): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const pool = poolRef.current;
    let alive = 0;
    for (let i = 0; i < POOL; i++) {
      const p = pool[i];
      if (!p) continue;
      if (p.wait > 0) continue;            // 비어 있는 칸 — 아직 아무것도 그리지 않는다
      const t = p.age / p.life;
      if (t >= 1) continue;
      alive++;
      // 수명이 끝나갈수록 투명해진다 — 사라지는 것이 아니라 자리를 비우는 중이다
      ctx.globalAlpha = t < 0.18 ? t / 0.18 : 1 - (t - 0.18) / 0.82;
      ctx.fillStyle = i % 7 === 0 ? "#ffd23f" : "#2f6df6";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (aliveRef.current) aliveRef.current.textContent = String(alive);
  }

  function step(dt: number): void {
    const W = sizeRef.current.w;
    const pool = poolRef.current;
    for (let i = 0; i < POOL; i++) {
      const p = pool[i];
      if (!p) continue;
      // 빈 칸은 잠깐 쉬었다 다시 쓴다 — 배열은 그대로고 이 칸만 비어 있다
      if (p.wait > 0) { p.wait -= dt; if (p.wait <= 0) spawn(p); continue; }
      p.age += dt;
      if (p.age >= p.life) { p.wait = 0.05 + Math.random() * 0.4; continue; }   // 죽은 칸은 버리지 않고 비워 둔다
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 30 * dt;                                // 위로 뜬 알갱이를 다시 끌어내리는 중력
      if (p.x < -8) p.x = W + 8;
      if (p.x > W + 8) p.x = -8;
    }
  }

  function frame(now: number): void {
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    step(dt);
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  function restart(): void {
    const pool = poolRef.current;
    for (let i = 0; i < POOL; i++) {
      if (pool[i]) spawn(pool[i]);
    }
    draw();
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
    // vanilla 와 같은 순서 — 풀을 먼저 채운 뒤 fit() 한다(첫 알갱이는 판 크기를 모른 채 태어나 곧 죽아 다시 뿌려진다)
    for (let i = 0; i < POOL; i++) {
      pool[i] = spawn({ x: 0, y: 0, vx: 0, vy: 0, r: 0, life: 0, age: 0, wait: 0 }, 1);
    }
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 아예 돌리지 않고 알갱이가 골고루 퍼진 한 장만 그린다
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

  function onLifeInput(event: InputEvt): void {
    const v = Number(event.target.value);
    lifeSecRef.current = v / 10;
    setLife(v);
  }

  function onFieldKey(event: KeyEvt): void {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); restart(); }
  }

  const cls = [styles.root, still ? styles.isStill : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M164 128a36 36 0 1 1-36-36a36 36 0 0 1 36 36" opacity=".2"/><path d="M128 84a44 44 0 1 0 44 44a44.05 44.05 0 0 0-44-44m0 72a28 28 0 1 1 28-28a28 28 0 0 1-28 28m0-128a100 100 0 1 0 100 100A100.11 100.11 0 0 0 128 28m0 184a84 84 0 1 1 84-84a84.09 84.09 0 0 1-84 84"/></g></svg>
          <span>판을 클릭하면 파티클 전부가 수명을 다시 시작합니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onClick={restart}
          onKeyDown={onFieldKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.live} aria-hidden="true"><span className={styles.liveNum} ref={aliveRef}>220</span><span className={styles.liveUnit}>개 살아 있음</span></b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>수명
            <input type="range" min={6} max={24} step={2} value={life} aria-label="수명" onChange={onLifeInput} />
            <b className={styles.val}>{(life / 10).toFixed(1)}초</b>
          </label>
          <button className={styles.reset} type="button" onClick={restart}>
            <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M232 128a104 104 0 1 1-104-104a104 104 0 0 1 104 104" opacity=".2"/><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z"/></g></svg>
            <span>전부 다시</span>
          </button>
        </div>
      </div>
    </main>
  );
}
