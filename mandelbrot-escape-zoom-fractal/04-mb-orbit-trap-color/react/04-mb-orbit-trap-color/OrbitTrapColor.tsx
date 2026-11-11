// OrbitTrapColor — vanilla 판(run/323/demo/04-mb-orbit-trap-color/index.html) 의 React 포트.
// 같은 집합, 다른 질문. 탈출 시간은 "몇 번 만에 떠났나"만 묻는다. 궤도 트랩은 반복이 지나간 길을 본다:
//   축 트랩  — 궤적이 실수축(zr=0)·허수축(zi=0)에 얼마나 근접했는가 → 대칭 무늬
//   원 트랩  — 원점에서의 최근접 거리 → 동심원문
// 최근접 거리 d 를 기억해 두면 색은 1/d 처럼 밝아진다(가까이 스칠수록 밝게).
// 트랩 3종을 2초 루프 안에서 교체하며(팔레트 위상도 함께 순환) 같은 집합이 완전히 다른 그림이
// 되는 과정을 한눈에 보여준다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./OrbitTrapColor.module.scss";

export type OrbitTrapColorProps = {
  duration?: string;
  easing?: string;
  color?: string;
  maxit?: number;   // 최대 반복 — 궤적을 충분히 걷는 깊이. 변형 "최대 반복"이 110 → 200
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const CYCLE = 2.0;   // 트랩 교체 + 팔레트 순환 주기(초)
const IRES = 240;    // 내부 계산 해상도(가로 픽셀)

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "궤도 트랩 채색 실험판";
const META_LEFT = "실수축·허수축·원 트랩 3종 · 트랩 순환";
const META_RIGHT = "canvas · Math.hypot · requestAnimationFrame";
const HINT = "발산 횟수 대신 z 의 궤적이 실수축·허수축·원에 얼마나 가까이 스쳤는지를 기록해 색으로 입히면, 집합 위에 또 하나의 프랙탈 무늬가 겹쳐 나타납니다";

const CX = -0.75, CY = 0, SPAN = 2.9;

// 트랩 종류: 0 실수축 | 1 허수축 | 2 원(반지름 0.62)
// 궤적이 각 트랩에 남긴 최근접 거리를 돌려준다.
function trapDist(zr: number, zi: number, kind: number, best: number): number {
  let d: number;
  if (kind === 0) d = Math.abs(zi);                    // 실수축 근접
  else if (kind === 1) d = Math.abs(zr);               // 허수축 근접
  else d = Math.abs(Math.hypot(zr, zi) - 0.62);        // 원 근접 — 반지름 0.62 원문
  return d < best ? d : best;
}

export default function OrbitTrapColor({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#4cd4a6",
  maxit = 110
}: OrbitTrapColorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ovRef = useRef<HTMLCanvasElement | null>(null);
  const octxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef<RGB[] | null>(null);
  const setRef = useRef<RGB | null>(null);
  const trapRef = useRef<RGB | null>(null);
  const maxitRef = useRef(maxit) as Box<number>;
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
  }

  function render(kind: number, phase: number): void {
    const octx = octxRef.current;
    const ov = ovRef.current;
    const ctx = ctxRef.current;
    const PAL = palRef.current;
    const C_SET = setRef.current;
    const C_TRAP = trapRef.current;
    const W = wRef.current, H = hRef.current;
    const MAXIT = maxitRef.current;
    if (!octx || !ov || !ctx || !PAL || !C_SET || !C_TRAP) return;
    const iw = ov.width, ih = ov.height;
    const img = octx.createImageData(iw, ih);
    const px = img.data;
    const dx = SPAN / iw, dy = SPAN / iw;
    const oy0 = CY - (ih * dy) / 2;
    let k = 0;
    for (let j = 0; j < ih; j++) {
      const ci = oy0 + j * dy;
      for (let i = 0; i < iw; i++) {
        const cr = CX - SPAN / 2 + i * dx;
        let zr = 0, zi = 0, n = 0;
        let best = 1e9;                     // 이 픽셀 궤적의 트랩 최근접 거리
        while (n < MAXIT && zr * zr + zi * zi <= 4) {
          const t = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci;
          zr = t;
          best = trapDist(zr, zi, kind, best);
          n++;
        }
        let r: number, g: number, b: number;
        if (n >= MAXIT) {
          r = C_SET[0]; g = C_SET[1]; b = C_SET[2];
        } else {
          // 스친 거리 → 밝기. d 가 작을수록 밝게(1/d 포화 곡선).
          // 위상 phase 로 트랩 강조색과 팔레트를 번갈아 섞어 순환시킨다.
          const glow = 1 / (1 + best * 26);            // 0(멀리) ~ 1(아주 가까이)
          const u = glow * 4 + phase;
          const seg = u - Math.floor(u / 4) * 4;
          const a = (Math.floor(seg) % 4 === 3) ? C_TRAP : PAL[Math.floor(seg) % 4];
          const bb2 = PAL[(Math.floor(seg) + 1) % 4];
          const f = seg - Math.floor(seg);
          const w1 = glow, w2 = 1 - glow;              // 가까울수록 트랩색 · 멀수록 짙은 팔레트
          r = (a[0] * w1 + bb2[0] * w2) * f + a[0] * (1 - f);
          g = (a[1] * w1 + bb2[1] * w2) * f + a[1] * (1 - f);
          b = (a[2] * w1 + bb2[2] * w2) * f + a[2] * (1 - f);
          // 바닥은 짙은 남보라로 눌러 트랩 무늬가 뜨도록
          const dim = 0.35 + glow * 0.65;
          r = C_SET[0] + (r - C_SET[0]) * dim;
          g = C_SET[1] + (g - C_SET[1]) * dim;
          b = C_SET[2] + (b - C_SET[2]) * dim;
        }
        px[k++] = r; px[k++] = g; px[k++] = b; px[k++] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.drawImage(ov, 0, 0, W, H);
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % CYCLE;
    const t = loop / CYCLE;
    // 2초를 3구간으로 — 축(실수) → 축(허수) → 원. 경계는 색이 자연 섞이며 넘어간다
    const kind = t < 1 / 3 ? 0 : (t < 2 / 3 ? 1 : 2);
    const phase = t * 4;
    render(kind, phase);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    maxitRef.current = maxit;
    palRef.current = ["--mb-c0", "--mb-c1", "--mb-c2", "--mb-c3", "--mb-c4"].map((nm) => tokRGB(root, nm));
    setRef.current = tokRGB(root, "--mb-set");
    trapRef.current = tokRGB(root, "--mb-trap");
    fit();
    function onResize(): void {
      fit(); render(0, 0.8);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      render(2, 0.8);                      // reduce — 원 트랩 한 장 고정(가장 무늬가 또렷)
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
  }, [maxit]);

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
