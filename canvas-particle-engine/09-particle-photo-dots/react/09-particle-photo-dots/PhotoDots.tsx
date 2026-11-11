// PhotoDots — vanilla 판(run/012/demo/09-particle-photo-dots/index.html) 의 React 포트.
// 외부 이미지를 쓰지 않는다 — 토큰색 풍경(산 능선+달)을 화면 밖 캔버스에 직접 그리고 drawImage 로
// 판 크기에 옮겨 루마를 격자 샘플링해 점의 크기와 진하기로 바꾼다. 상수·식은 vanilla 와 같다.
// 포인터에 점이 물결치고 놓으면 스프링(16)이 그림으로 되돌린다.
import { useEffect, useRef, useState } from "react";
import styles from "./PhotoDots.module.scss";

export type PhotoDotsProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type PointerEvt = { clientX: number; clientY: number; preventDefault(): void };
type KeyEvt = { key: string; preventDefault(): void };
type Dot = { hx: number; hy: number; x: number; y: number; vx: number; vy: number; r: number; alpha: number; fill: string; ph: number; sp: number };

// 풍경 원본 — 고정 크기로 그린 뒤 drawImage 로 판 크기에 맞춰 옮긴다
const SCENE_W = 420;
const SCENE_H = 190;
const SPRING = 16;                       // 집으로 당기는 스프링 힘
const PUSH = 2300;                       // 포인터가 밀어내는 최대 가속
const RADIUS = 56;                       // 포인터 영향 반경
const HINT = "점을 밀면 물결치고 놓으면 그림으로 돌아옵니다";
const FIELD_LABEL = "풍경 파티클 실험판";

// 산 능선 하나 — 정현파 세 개를 겹쳐 자연스러운 능선실을 만든다
function ridge(c: CanvasRenderingContext2D, baseY: number, amp: number, seed: number, fill: string): void {
  c.beginPath();
  c.moveTo(0, SCENE_H);
  for (let x = 0; x <= SCENE_W; x += 4) {
    const t = (x / SCENE_W) * Math.PI * 2;
    const y = baseY
      - Math.sin(t * 1.7 + seed) * amp
      - Math.sin(t * 3.1 + seed * 2.3) * amp * 0.45
      - Math.sin(t * 5.3 + seed * 4.1) * amp * 0.18;
    c.lineTo(x, y);
  }
  c.lineTo(SCENE_W, SCENE_H);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}

export default function PhotoDots({
  duration = "2s",
  easing = "linear",
  color = "#ffd23f",
}: PhotoDotsProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  // 화면 밖 캔버스 두 장 — 풍경 원본(scene) 과 샘플링용(sample), 모두 useEffect 안에서 생성
  const sceneRef = useRef<HTMLCanvasElement | null>(null);
  const sceneCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sampleRef = useRef<HTMLCanvasElement | null>(null);
  const sampleCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 }) as Box<{ w: number; h: number; dpr: number }>;
  const dotsRef = useRef<Dot[]>([]) as Box<Dot[]>;
  const ptrRef = useRef({ x: -9999, y: -9999, on: false }) as Box<{ x: number; y: number; on: boolean }>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function paintScene(): void {
    const c = sceneCtxRef.current;
    if (!c) return;
    // 밤하늘 — 잉크색 하늘이 지평선으로 내려갈수록 옅은 파랑에 젖는다
    const sky = c.createLinearGradient(0, 0, 0, SCENE_H);
    sky.addColorStop(0, "#17141a");
    sky.addColorStop(1, "#2c2f4d");
    c.fillStyle = sky;
    c.fillRect(0, 0, SCENE_W, SCENE_H);
    // 달과 달무리 — 노랑 원 하나와 그 주위로 번지는 빛
    const mx = SCENE_W * 0.72, my = SCENE_H * 0.26, mr = 20;
    const halo = c.createRadialGradient(mx, my, mr * 0.4, mx, my, mr * 5);
    halo.addColorStop(0, "rgba(255, 210, 63, 0.30)");
    halo.addColorStop(1, "rgba(255, 210, 63, 0)");
    c.fillStyle = halo;
    c.fillRect(0, 0, SCENE_W, SCENE_H);
    c.fillStyle = "#ffd23f";
    c.beginPath();
    c.arc(mx, my, mr, 0, Math.PI * 2);
    c.fill();
    // 별 — 크림과 노랑 알갱이를 하늘에 흩뿌린다
    for (let s = 0; s < 46; s++) {
      c.globalAlpha = 0.35 + Math.random() * 0.65;
      c.fillStyle = Math.random() < 0.3 ? "#ffd23f" : "#fff7e6";
      c.fillRect(Math.random() * SCENE_W, Math.random() * SCENE_H * 0.5, 1.6, 1.6);
    }
    c.globalAlpha = 1;
    // 산 능선 세 겹 — 멀수록 옅고 가까울수록 진한 크림
    ridge(c, SCENE_H * 0.56, 18, 1.2, "rgba(255, 247, 230, 0.32)");
    ridge(c, SCENE_H * 0.71, 14, 4.7, "rgba(255, 247, 230, 0.55)");
    ridge(c, SCENE_H * 0.86, 10, 8.3, "rgba(255, 247, 230, 0.80)");
  }

  function build(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    const ctx = ctxRef.current;
    const scene = sceneRef.current;
    const sample = sampleRef.current;
    const sampleCtx = sampleCtxRef.current;
    if (!field || !cv || !ctx || !scene || !sample || !sampleCtx) return;
    const r = field.getBoundingClientRect();
    const size = sizeRef.current;
    size.w = r.width;
    size.h = r.height;
    size.dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(size.w * size.dpr);
    cv.height = Math.round(size.h * size.dpr);
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);

    paintScene();
    // 원본 풍경을 판 크기로 축소·확대해 샘플링 캔버스에 옮긴다 — drawImage 한 번으로 끝난다
    const W = size.w, H = size.h;
    sample.width = Math.max(1, Math.round(W));
    sample.height = Math.max(1, Math.round(H));
    sampleCtx.clearRect(0, 0, sample.width, sample.height);
    sampleCtx.drawImage(scene, 0, 0, sample.width, sample.height);

    const gap = W < 360 ? 4 : 5;          // 좁은 판은 간격을 줄여 그림이 뭉개지지 않게 한다
    const img = sampleCtx.getImageData(0, 0, sample.width, sample.height).data;
    const built: Dot[] = [];
    for (let y = gap / 2; y < H; y += gap) {
      const iy = Math.min(sample.height - 1, Math.round(y)) * sample.width;
      for (let x = gap / 2; x < W; x += gap) {
        const ix = Math.min(sample.width - 1, Math.round(x));
        const k = (iy + ix) * 4;
        // 루마 — 사람 눈이 느끼는 밝기 가중치. 밝은 곳은 크고 진한 점, 어두운 곳은 작고 연한 점이 된다
        const lum = (img[k] * 0.2126 + img[k + 1] * 0.7152 + img[k + 2] * 0.0722) / 255;
        // 어두운 색은 하늘색 기운을 남겨 밤하늘의 결로 보이게 한다
        const rr = Math.round(91 + (img[k] - 91) * lum);
        const gg = Math.round(140 + (img[k + 1] - 140) * lum);
        const bb = Math.round(248 + (img[k + 2] - 248) * lum);
        built.push({
          hx: x, hy: y, x: x, y: y, vx: 0, vy: 0,
          r: 0.7 + lum * 2.0,
          alpha: 0.28 + lum * 0.72,
          fill: "rgb(" + rr + "," + gg + "," + bb + ")",
          ph: Math.random() * Math.PI * 2,
          sp: 0.4 + Math.random() * 0.8,
        });
      }
    }
    dotsRef.current = built;
  }

  function step(dt: number): void {
    const damp = Math.exp(-4.5 * dt);     // 마찰을 약하게 두면 점이 물결처럼 출렁이고 돌아온다
    const dots = dotsRef.current;
    const ptr = ptrRef.current;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      let ax = (d.hx - d.x) * SPRING;
      let ay = (d.hy - d.y) * SPRING;
      if (ptr.on) {
        const dx = d.x - ptr.x;
        const dy = d.y - ptr.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < RADIUS * RADIUS) {
          const dist = Math.sqrt(dist2) || 0.001;
          const force = (1 - dist / RADIUS) * PUSH;
          ax += (dx / dist) * force;
          ay += (dy / dist) * force;
        }
      }
      d.vx = (d.vx + ax * dt) * damp;
      d.vy = (d.vy + ay * dt) * damp;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    }
  }

  function draw(nowSec: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const size = sizeRef.current;
    const dots = dotsRef.current;
    ctx.clearRect(0, 0, size.w, size.h);
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const ox = Math.sin(nowSec * d.sp + d.ph) * 0.9;
      const oy = Math.cos(nowSec * d.sp * 0.7 + d.ph) * 0.9;
      ctx.globalAlpha = d.alpha * (0.82 + 0.18 * Math.sin(nowSec * d.sp * 1.6 + d.ph));
      ctx.fillStyle = d.fill;
      ctx.beginPath();
      ctx.arc(d.x + ox, d.y + oy, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(now: number): void {
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    step(dt);
    draw(now / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  // 키보드 대체 — 판에 포커스를 두고 Enter 나 Space 를 누르면 중심에서부터 물결이 번져 나간다
  function wave(): void {
    const size = sizeRef.current;
    const cx = size.w / 2, cy = size.h / 2;
    const dots = dotsRef.current;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const dx = d.x - cx, dy = d.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const s = 300 + Math.random() * 200;
      d.vx += (dx / dist) * s;
      d.vy += (dy / dist) * s;
    }
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;
    const scene = document.createElement("canvas");
    scene.width = SCENE_W;
    scene.height = SCENE_H;
    const sceneCtx = scene.getContext("2d");
    const sample = document.createElement("canvas");
    const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
    if (!sceneCtx || !sampleCtx) return;
    sceneRef.current = scene;
    sceneCtxRef.current = sceneCtx;
    sampleRef.current = sample;
    sampleCtxRef.current = sampleCtx;
    build();
    function onResize(): void { build(); draw(0); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 돌리지 않고 풍경이 온전히 점으로 그려진 한 장만 남긴다
      setStill(true);
      draw(0);
    } else {
      lastRef.current = 0;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function onPointerMove(event: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const ptr = ptrRef.current;
    ptr.x = event.clientX - r.left;
    ptr.y = event.clientY - r.top;
    ptr.on = true;
  }

  function onPointerLeave(): void { ptrRef.current.on = false; }
  function onPointerUp(): void { ptrRef.current.on = false; }

  function onKeyDown(event: KeyEvt): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      wave();
    }
  }

  const cls = [styles.root, still ? styles.isStill : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><circle cx="68" cy="68" r="28"/><circle cx="188" cy="68" r="28" opacity=".55"/><circle cx="68" cy="188" r="28" opacity=".55"/><circle cx="188" cy="188" r="28" opacity=".3"/></g></svg>
          <span>{HINT}</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
      </div>
    </main>
  );
}
