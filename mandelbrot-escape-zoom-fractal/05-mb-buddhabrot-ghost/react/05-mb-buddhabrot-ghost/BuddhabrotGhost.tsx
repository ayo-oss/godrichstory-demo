// BuddhabrotGhost — vanilla 판(run/323/demo/05-mb-buddhabrot-ghost/index.html) 의 React 포트.
// 탈출 시간의 거울상. 01 은 발산 횟수를 색으로 썼다. 여기선 발산하는 점을 골라 그 궤적이
// 지나간 모든 픽셀에 1 씩 더한다. 발산하지 않는 점(집합 내부)의 궤적은 버린다 — 이 한 줄
// 차이가 명치 모양을 명상 상 인체상으로 뒤집는다. 표준 부다브로트는 90도 회전한 뷰(세로 대칭
// 인체상)를 쓴다. 난수 표본은 시드 고정 LCG — 결정론 렌더(같은 프레임 시각 = 같은 누적 상태).
// 2초 루프: 누적 → 리셋 → 다시 누적. 감마 0.94 감쇠로 오래된 궤적이 서서히 잦아들게 하면
// 형상이 떠오르는 과정 자체가 매 루프 재현된다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BuddhabrotGhost.module.scss";

export type BuddhabrotGhostProps = {
  duration?: string;
  easing?: string;
  color?: string;
  orbits?: number;   // 프레임당 새로 뿌리는 궤적 수 — 변형 "궤적 수"가 260 → 600
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const MAXIT = 90;    // 궤적 추적 반복 — 이 안에 발산해야 궤적을 남긴다
const DECAY = 0.94;  // 프레임 감마 감쇠 — 오래된 궤적이 잦아드는 비율
const IRES = 200;    // 내부 계산 해상도(가로 픽셀)

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "부다브로트 실험판";
const META_LEFT = "프레임당 궤적 260개 · 누적 감마 0.94";
const META_RIGHT = "canvas · Math.random · requestAnimationFrame";
const HINT = "발산하는 점의 궤적만 캔버스에 쌓으면 명상하는 듯한 대칭 형상이 천천히 떠오릅니다 — 같은 식에서 어떤 점의 궤적을 남기느냐만 바꾼 그림입니다";

// 표본 영역 — 만델브로가 살고 있는 c 상자(약 -2.2~1.2 · ±1.4)
const RX0 = -2.2, RX1 = 1.2, RY0 = -1.4, RY1 = 1.4;

// mulberry32 — 시드 고정. Math.random 을 쓰면 렌더마다 다른 그림이 나온다
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function (): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function BuddhabrotGhost({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#c9bdf2",
  orbits = 260
}: BuddhabrotGhostProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ovRef = useRef<HTMLCanvasElement | null>(null);
  const octxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ glow: RGB; warm: RGB; ink: RGB } | null>(null);
  const accRef = useRef<Float32Array | null>(null);
  const rndRef = useRef<() => number>(mulberry32(20260916));
  const orbitsRef = useRef(orbits) as Box<number>;
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const stepsRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const W = Math.round(r.width), H = Math.round(r.height);
    wRef.current = W; hRef.current = H;
    cv.width = W; cv.height = H;
    ctxRef.current = cv.getContext("2d");
    const ov = document.createElement("canvas");
    ov.width = IRES;
    ov.height = Math.max(2, Math.round(IRES * H / W));
    ovRef.current = ov;
    octxRef.current = ov.getContext("2d");
    reset();
  }

  function reset(): void {
    const ov = ovRef.current;
    if (!ov) return;
    accRef.current = new Float32Array(ov.width * ov.height);
  }

  // 궤적 하나 시도 — 발산하면 지나간 픽셀에 가중치를 남긴다
  function traceOrbit(): void {
    const ov = ovRef.current;
    const acc = accRef.current;
    const rnd = rndRef.current;
    if (!ov || !acc || !rnd) return;
    const cr = RX0 + rnd() * (RX1 - RX0);
    const ci = RY0 + rnd() * (RY1 - RY0);
    let zr = 0, zi = 0, n = 0;
    // 먼저 발산 판정(궤적 저장 없이) — 발산하는 점만 다시 걸어 흔적을 남긴다
    while (n < MAXIT && zr * zr + zi * zi <= 4) {
      const t = zr * zr - zi * zi + cr;
      zi = 2 * zr * zi + ci;
      zr = t; n++;
    }
    if (n >= MAXIT) return;                    // 집합 내부 — 궤적을 남기지 않는다(부다브로트의 조건)
    zr = 0; zi = 0;                            // 다시 출발해 흔적을 남긴다
    const iw = ov.width, ih = ov.height;
    for (let m = 0; m < n; m++) {
      // 표준 부다브로트 뷰 — 만델브로를 90도 회전해 세로 대칭 인체상으로
      const px = (zi - RX0) / (RX1 - RX0) * iw;  // 허수축을 가로로(회전)
      const py = (zr - RY0) / (RY1 - RY0) * ih;  // 실수축을 세로로
      const ix = px | 0, iy = py | 0;
      if (ix >= 0 && ix < iw && iy >= 0 && iy < ih) {
        acc[iy * iw + ix] += 1;                // 방문 가중치(긴 궤적이 더 밝다)
      }
      const t2 = zr * zr - zi * zi + cr;
      zi = 2 * zr * zi + ci;
      zr = t2;
    }
  }

  function render(): void {
    const octx = octxRef.current;
    const ov = ovRef.current;
    const ctx = ctxRef.current;
    const acc = accRef.current;
    const col = colRef.current;
    const W = wRef.current, H = hRef.current;
    if (!octx || !ov || !ctx || !acc || !col) return;
    const img = octx.createImageData(ov.width, ov.height);
    const px = img.data;
    let k = 0;
    // 누적값 로그 스케일 → 라벤더에서 복숭아로 옮는 온도곡선
    for (let q = 0; q < acc.length; q++) {
      let v = Math.log(1 + acc[q]) / Math.log(1 + 30);   // 0~1(30 방문이면 포화)
      if (v > 1) v = 1;
      const r = col.ink[0] + (col.warm[0] - col.glow[0]) * v + (col.glow[0] - col.ink[0]) * Math.min(1, v * 1.8);
      const g = col.ink[1] + (col.warm[1] - col.glow[1]) * v + (col.glow[1] - col.ink[1]) * Math.min(1, v * 1.8);
      const b = col.ink[2] + (col.warm[2] - col.glow[2]) * v + (col.glow[2] - col.ink[2]) * Math.min(1, v * 1.8);
      px[k++] = r; px[k++] = g; px[k++] = b; px[k++] = 255;
    }
    octx.putImageData(img, 0, 0);
    // 밝은 궤적 위 얇은 광채 겹 — globalAlpha 로 온도곡선 하이라이트를 살짝 덧칠한다
    ctx.globalAlpha = 1;
    ctx.drawImage(ov, 0, 0, W, H);
    ctx.globalAlpha = 0.14;
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(ov, 0, 0, W, H);   // 같은 프레임 두 번 — 밝은 곳만 더 밝게(가산)
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  function sprinkle(n: number): void {
    for (let s = 0; s < n; s++) {
      for (let o = 0; o < orbitsRef.current; o++) traceOrbit();
    }
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % 2.0;
    const target = Math.floor(loop * 30);            // 초당 30 스텝 기준 누적 목표
    while (stepsRef.current < target) {
      sprinkle(1);
      stepsRef.current++;
    }
    if (target < stepsRef.current - 3) { reset(); stepsRef.current = 0; } // 루프 리셋 — 되감아 다시 떠오른다
    // 감쇠 — 오래된 궤적이 잦아들며 형상이 계속 다듬어진다
    const acc = accRef.current;
    if (acc && stepsRef.current % 4 === 0) for (let q = 0; q < acc.length; q++) acc[q] *= DECAY;
    render();
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    orbitsRef.current = orbits;
    colRef.current = {
      glow: tokRGB(root, "--mb-glow"),   // 궤적 빛 — 라벤더
      warm: tokRGB(root, "--mb-warm"),   // 밝은 중심 — 복숭아
      ink: tokRGB(root, "--mb-ink"),     // 바닥
    };
    fit();
    stepsRef.current = 0;
    rndRef.current = mulberry32(20260916);
    function onResize(): void {
      fit(); stepsRef.current = 0; rndRef.current = mulberry32(20260916);
      sprinkle(60); render();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 40 스텝만 쌓은 한 장을 고정(형상이 떠오른 직후)
      sprinkle(40);
      render();
      setStill(true);
    } else {
      t0 = -1;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orbits]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>{HINT}</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT}</span>
          <span className={styles.metaDim}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
