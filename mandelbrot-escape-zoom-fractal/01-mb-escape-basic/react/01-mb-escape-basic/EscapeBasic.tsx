// EscapeBasic — vanilla 판(run/323/demo/01-mb-escape-basic/index.html) 의 React 포트.
// 모든 픽셀 = 복소수 c. z 를 0 에서 시작해 z = z² + c 를 반복하고 |z| > 2 가 되는 순간의
// 반복 횟수 n 이 그 픽셀의 색이 된다. 96회 안에 발산하지 않는 픽셀은 집합 내부(먹보라).
// 움직임 = 팔레트 순환 — 반복 횟수는 정수라 색 띠가 계단인데(08 스무스 채색으로 이어지는 다리),
// 띠 전체가 위상을 옮겨 순환하면 명치 가장자리가 물결처럼 흐른다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EscapeBasic.module.scss";

export type EscapeBasicProps = {
  duration?: string;
  easing?: string;
  color?: string;
  maxit?: number;    // 최대 반복 횟수 — 변형 "최대 반복"이 96 → 240
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const CYCLE = 2.0;   // 팔레트 순환 주기(초) — 설정 초(2s)와 같아 한 바퀴가 한 루프
const IRES = 240;    // 내부 계산 해상도(가로 픽셀) — 성능 조절 노브

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "탈출 시간 기본 실험판";
const META_LEFT = "내부 해상도 240px · 최대 반복 96";
const META_RIGHT = "canvas · z = z² + c · requestAnimationFrame";
const HINT = "화면 모든 픽셀을 복소수 c 로 삼아 z = z² + c 를 반복하고, 크기가 2를 넘어 발산하기까지의 횟수를 색으로 칠하면 심장 모양 명치와 전구가 나타납니다";

// c 평면 뷰포트 — 만덜브로 표준 프레임(가로 -2.5 ~ 1.0, 세로 ±1.15 근사)
const CX = -0.75, CY = 0, SPAN = 2.9;

export default function EscapeBasic({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#c9bdf2",
  maxit = 96
}: EscapeBasicProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ovRef = useRef<HTMLCanvasElement | null>(null);
  const octxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef<RGB[] | null>(null);
  const setRef = useRef<RGB | null>(null);
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

  function render(phase: number): void {
    const octx = octxRef.current;
    const ov = ovRef.current;
    const ctx = ctxRef.current;
    const PAL = palRef.current;
    const C_SET = setRef.current;
    const W = wRef.current, H = hRef.current;
    const MAXIT = maxitRef.current;
    if (!octx || !ov || !ctx || !PAL || !C_SET) return;
    const iw = ov.width, ih = ov.height;
    const img = octx.createImageData(iw, ih);
    const px = img.data;
    const dx = SPAN / iw, dy = SPAN / iw;   // dy 를 dx 와 같게 — 정사각 픽셀(종횡비 보정)
    const oy0 = CY - (ih * dy) / 2;
    let k = 0;
    for (let j = 0; j < ih; j++) {
      const ci = oy0 + j * dy;
      for (let i = 0; i < iw; i++) {
        const cr = CX - SPAN / 2 + i * dx;
        // z = 0 부터 z = z² + c 반복 — 발산 시점의 n 이 색 인덱스
        let zr = 0, zi = 0, n = 0;
        while (n < MAXIT && zr * zr + zi * zi <= 4) {
          const t = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci;
          zr = t;
          n++;
        }
        let r: number, g: number, b: number;
        if (n >= MAXIT) {
          r = C_SET[0]; g = C_SET[1]; b = C_SET[2];
        } else {
          // 팔레트 순환 — n 에 phase 를 더해 5색 파장을 반복 통과시킨다
          const u = (n / MAXIT) * 4 + phase;
          const seg = u - Math.floor(u / 4) * 4;
          const a = PAL[Math.floor(seg) % 4], bb = PAL[(Math.floor(seg) + 1) % 4];
          const f = seg - Math.floor(seg);
          r = a[0] + (bb[0] - a[0]) * f;
          g = a[1] + (bb[1] - a[1]) * f;
          b = a[2] + (bb[2] - a[2]) * f;
        }
        px[k++] = r; px[k++] = g; px[k++] = b; px[k++] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(ov, 0, 0, W, H);
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % CYCLE;   // 2초 주기 순환 — 결정론 루프
    render((loop / CYCLE) * 4);                 // 파장 4칸을 주기 안에 한 바퀴
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    maxitRef.current = maxit;
    // 팔레트 5색(짙은 남보라 → 라벤더 → 크림 → 복숭아 → 다시 짙은 보라) + 집합 내부 먹보라
    palRef.current = ["--mb-c0", "--mb-c1", "--mb-c2", "--mb-c3", "--mb-c4"].map((nm) => tokRGB(root, nm));
    setRef.current = tokRGB(root, "--mb-set");
    fit();
    function onResize(): void {
      fit();
      render(0.6);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      render(0.6);                              // reduce — 순환 한 장면만 고정
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
