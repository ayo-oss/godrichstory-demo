// LorenzButterflyBasic — vanilla 판(run/324/demo/01-lorenz-butterfly-basic/index.html) 의 React 포트.
// dx = σ(y−x), dy = x(ρ−z)−y, dz = xy−βz 세 속도를 오일러로 한 걸음씩 적분해
// 위치를 옮기고 선을 잇는다. 미리 계산한 3,000걸음을 주기 안에 순서대로 드러내고
// 마지막 18% 구간에서 서서히 지워 루프가 이어진다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LorenzButterflyBasic.module.scss";

export type LorenzButterflyBasicProps = {
  duration?: string;
  easing?: string;
  color?: string;
  dt?: number;      // 오일러 걸음 — 0.005 로 줄이면 같은 거리에 두 배 걸음(변형 1)
  steps?: number;   // 사전 계산 걸음 수 — 공개 구간에 전부 드러난다
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const DT    = 0.01;   // 오일러 걸음
const STEPS = 3000;   // 사전 계산 걸음 수
const CYCLE = 2.0;    // 공개 주기(초) — 설정 초(2s)와 같아 한 바퀴가 한 루프
const REVEAL_END = 0.82;   // 걸음 공개가 끝나는 위상 — 이후 지우기

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "나비 기본 실험판";
const META_LEFT = "σ 10 · ρ 28 · β 8/3 · 오일러 dt 0.01";
const META_RIGHT = "canvas · 3,000걸음 · 주기 2초";
const HINT = "세 개의 속도 식에서 위치를 매 프레임 조금씩 옮겨 선을 잇으면 두 날개를 오가는 나비 궤적이 저절로 쌓입니다";

const SIG = 10, RHO = 28, BETA = 8 / 3;

// 로렌츠 속도 — 반환 순서 dx, dy, dz (단위: 무차원)
function deriv(x: number, y: number, z: number): [number, number, number] {
  return [SIG * (y - x), x * (RHO - z) - y, x * y - BETA * z];
}

function rgba(c: RGB, a: number): string {
  return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
}
function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export default function LorenzButterflyBasic({
  duration = "2s",
  easing = "ease-out",
  color = "#cfe3ff",
  dt = DT,
  steps = STEPS
}: LorenzButterflyBasicProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const c0Ref = useRef<RGB | null>(null);
  const c1Ref = useRef<RGB | null>(null);
  const headRef = useRef<RGB | null>(null);
  const panelRef = useRef<RGB | null>(null);
  const guideRef = useRef<RGB | null>(null);
  const trajRef = useRef<{ xs: Float32Array; ys: Float32Array; zs: Float32Array; chunkNy: Float32Array } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
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
    const ctx = ctxRef.current;
    if (!field || !cv || !ctx) return;
    const r = field.getBoundingClientRect();
    wRef.current = Math.round(r.width);
    hRef.current = Math.round(r.height);
    cv.width = wRef.current;
    cv.height = hRef.current;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  // 궤적 사전 계산 — 과도기 200걸음을 건너뛰어 어트랙터 위에서 시작한다
  function precompute(n: number, step: number): void {
    const xs = new Float32Array(n), ys = new Float32Array(n), zs = new Float32Array(n);
    let x = 0.6, y = 0.7, z = 21;
    for (let i = 0; i < 200; i++) {
      const d0 = deriv(x, y, z);
      x += d0[0] * step; y += d0[1] * step; z += d0[2] * step;
    }
    for (let i = 0; i < n; i++) {
      xs[i] = x; ys[i] = y; zs[i] = z;
      const d1 = deriv(x, y, z);
      x += d1[0] * step; y += d1[1] * step; z += d1[2] * step;
    }
    // 조각별 평균 깊이 — y 는 관찰 방향이라 멀/가까이가 색 농도와 두께가 된다
    const CH = 24;
    const chunkNy = new Float32Array(CH);
    for (let k = 0; k < CH; k++) {
      const a = Math.floor(k * n / CH), b = Math.floor((k + 1) * n / CH);
      let sum = 0, cnt = 0;
      for (let ci = a; ci < b; ci++) { sum += ys[ci]; cnt++; }
      const v = cnt ? (sum / cnt + 27) / 57 : 0.5;
      chunkNy[k] = Math.max(0, Math.min(1, v));
    }
    trajRef.current = { xs, ys, zs, chunkNy };
  }

  function draw(phase: number): void {
    const ctx = ctxRef.current;
    const traj = trajRef.current;
    const PANEL = panelRef.current;
    const GUIDE = guideRef.current;
    const C0 = c0Ref.current;
    const C1 = c1Ref.current;
    const HEAD = headRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !traj || !PANEL || !GUIDE || !C0 || !C1 || !HEAD) return;
    const { xs, zs, chunkNy } = traj;
    const STEPSN = xs.length;
    const CH = chunkNy.length;

    ctx.fillStyle = rgba(PANEL, 1);
    ctx.fillRect(0, 0, W, H);

    const s = Math.min(W / 44, H / 52);
    const ox = W / 2, oy = H / 2;

    // 안내선 — 날개 경계 x = 0
    ctx.strokeStyle = rgba(GUIDE, 0.22);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox, 0);
    ctx.lineTo(ox, H);
    ctx.stroke();

    const upto = Math.min(1, phase / REVEAL_END);
    const n = Math.floor(upto * STEPSN);
    if (n < 2) return;
    const fade = phase > REVEAL_END ? Math.max(0, 1 - (phase - REVEAL_END) / (1 - REVEAL_END)) : 1;

    // 두 번의 stroke — 뒤네루게(넓고 옅게) + 알맹이(가늘고 진하게)
    const passes: [number, number][] = [[3.2, 0.14], [1.4, 0.85]];
    for (let pass = 0; pass < 2; pass++) {
      const wMul = passes[pass][0], aMul = passes[pass][1];
      for (let k = 0; k < CH; k++) {
        const a = Math.floor(k * STEPSN / CH);
        const b = Math.min(n, Math.floor((k + 1) * STEPSN / CH));
        if (b - a < 2) continue;
        const t = (k + 0.5) / CH;
        const ny = chunkNy[k];
        const col = mix(C0, C1, t);
        ctx.strokeStyle = rgba(col, aMul * (0.45 + 0.55 * ny) * fade);
        ctx.lineWidth = wMul * (0.8 + 0.9 * ny);
        ctx.beginPath();
        ctx.moveTo(ox + xs[a] * s, oy - (zs[a] - 25) * s);
        for (let ci = a + 1; ci < b; ci++) ctx.lineTo(ox + xs[ci] * s, oy - (zs[ci] - 25) * s);
        ctx.stroke();
      }
    }

    // 머리 — 현재 걸음 위치에 크림 점과 옅은 광원
    const hx = ox + xs[n - 1] * s, hy = oy - (zs[n - 1] - 25) * s;
    ctx.fillStyle = rgba(HEAD, 0.22 * fade);
    ctx.beginPath(); ctx.arc(hx, hy, 6, 0, 6.2832); ctx.fill();
    ctx.fillStyle = rgba(HEAD, fade);
    ctx.beginPath(); ctx.arc(hx, hy, 2.2, 0, 6.2832); ctx.fill();
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const phase = (((now - t0) / 1000) % CYCLE) / CYCLE;
    draw(phase);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    c0Ref.current = tokRGB(root, "--lz-c0");      // 꼬리 색 — 얼음 파스텔
    c1Ref.current = tokRGB(root, "--lz-c1");      // 머리 색 — 복숭아 파스텔
    headRef.current = tokRGB(root, "--lz-head");  // 머리 점 — 크림(토큰)
    panelRef.current = tokRGB(root, "--lz-panel");// 관측창 바닥
    guideRef.current = tokRGB(root, "--lz-mid");  // 안내선 — 저채도 청색
    ctxRef.current = cv.getContext("2d");
    precompute(steps, dt);
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(0.62);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(0.62);                                  // reduce — 드러난 궤적 한 장만 고정
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
  }, [steps, dt]);

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
