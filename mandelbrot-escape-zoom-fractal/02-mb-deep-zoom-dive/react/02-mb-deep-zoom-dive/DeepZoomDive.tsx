// DeepZoomDive — vanilla 판(run/323/demo/02-mb-deep-zoom-dive/index.html) 의 React 포트.
// 목표점을 향한 자동 잠수. 매 프레임 scale 을 s = s / k 로 줄이고(=배율 k 배), 중심을 목표점 쪽으로
// 끌어당긴다. 핵심 균형: 배율이 커질수록 집합 가장자리 구조가 가늘어지므로 maxIter 를 log(배율)에
// 비례해 올린다(변형 "최대 반복 횟수"가 500 → 2,000). 2초 루프가 끝나면 배율 1 로 되감는다 — 무한 반복 렌더.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DeepZoomDive.module.scss";

export type DeepZoomDiveProps = {
  duration?: string;
  easing?: string;
  color?: string;
  maxit1?: number;   // 루프 끝 최대 반복 — 변형 "최대 반복 횟수"가 500 → 2,000
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const MAXIT0 = 96;   // 시작 최대 반복 — 배율 1 에서의 기본값
const ZOOM2S = 25;   // 2초 동안의 총 배율(倍) — 잠수 깊이
const IRES = 260;    // 내부 계산 해상도(가로 픽셀)

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "무한 딥 줌 실험판";
const META_LEFT = "초기 2초 x25 · 최대 반복 96 → 500";
const META_RIGHT = "canvas · z = z² + c · requestAnimationFrame";
const HINT = "명치 끝 목표점을 향해 배율을 매 프레임 곱해 파고들면 미니 만델브로와 나선이 끝없이 이어지는데, 배율이 커질수록 최대 반복도 함께 올려야 윤곽이 끊기지 않습니다";
const ZOOM_INIT = "x1";

// 목표점 — 명치 끝(시클로이드 첨두) 안쪽의 나선 지대. 줌 시퀀스의 고전 좌표
const TX = -0.743643887037, TY = 0.13182590421;

// t(0~1) 진행도의 줌 상태 — 지수 잠수: scale = 2.9 / k, k = 25^t.
// 중심은 시작 프레임(-0.75, 0)에서 목표점으로 t 에 맞춰 다가간다(화면 밖 목표가 갑자기 튀지 않게).
type ZoomState = { cx: number; cy: number; scale: number; maxit: number; k: number };

export default function DeepZoomDive({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#6ec8ff",
  maxit1 = 500
}: DeepZoomDiveProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ovRef = useRef<HTMLCanvasElement | null>(null);
  const octxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef<RGB[] | null>(null);
  const setRef = useRef<RGB | null>(null);
  const maxit1Ref = useRef(maxit1) as Box<number>;
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [zoom, setZoom] = useState(ZOOM_INIT);
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

  function render(cx: number, cy: number, scale: number, maxit: number): void {
    const octx = octxRef.current;
    const ov = ovRef.current;
    const ctx = ctxRef.current;
    const PAL = palRef.current;
    const C_SET = setRef.current;
    const W = wRef.current, H = hRef.current;
    if (!octx || !ov || !ctx || !PAL || !C_SET) return;
    const iw = ov.width, ih = ov.height;
    const img = octx.createImageData(iw, ih);
    const px = img.data;
    const dx = scale / iw, dy = scale / iw;
    const oy0 = cy - (ih * dy) / 2;
    let k = 0;
    for (let j = 0; j < ih; j++) {
      const ci = oy0 + j * dy;
      for (let i = 0; i < iw; i++) {
        const cr = cx - scale / 2 + i * dx;
        let zr = 0, zi = 0, n = 0;
        while (n < maxit && zr * zr + zi * zi <= 4) {
          const t = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci;
          zr = t;
          n++;
        }
        let r: number, g: number, b: number;
        if (n >= maxit) {
          r = C_SET[0]; g = C_SET[1]; b = C_SET[2];
        } else {
          const u = (n / maxit) * 4;
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
    ctx.drawImage(ov, 0, 0, W, H);
  }

  function stateAt(t: number): ZoomState {
    const k = Math.pow(ZOOM2S, t);
    const progress = Math.log(k) / Math.log(ZOOM2S);   // 배율→진행도 역변환(=t, 검산용)
    const cx = -0.75 + (TX + 0.75) * t;
    const cy = TY * t;
    const maxit = Math.round(MAXIT0 + (maxit1Ref.current - MAXIT0) * progress);
    return { cx: cx, cy: cy, scale: 2.9 / k, maxit: maxit, k: k };
  }

  function setZoomLabel(k: number): void {
    // 배율 라벨 — x25 처럼 짧게. 1,000 넘으면 k 단위로
    setZoom(k >= 1000 ? "x" + Math.round(k / 100) / 10 + "k" : "x" + Math.round(k));
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % 2.0;   // 2초 루프 — 잠수 후 배율 1 복귀
    const s = stateAt(loop / 2.0);
    render(s.cx, s.cy, s.scale, s.maxit);
    setZoomLabel(s.k);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    maxit1Ref.current = maxit1;
    palRef.current = ["--mb-c0", "--mb-c1", "--mb-c2", "--mb-c3", "--mb-c4"].map((nm) => tokRGB(root, nm));
    setRef.current = tokRGB(root, "--mb-set");
    fit();
    function onResize(): void {
      fit();
      const s = stateAt(0.5);
      render(s.cx, s.cy, s.scale, s.maxit);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      const s = stateAt(0.55);
      render(s.cx, s.cy, s.scale, s.maxit);   // reduce — 잠수 중반 한 장 고정
      setZoomLabel(s.k);
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
  }, [maxit1]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : `${styles.root} ${styles.isDemo}`;

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
          <span className={styles.zoom}>{zoom}</span>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT}</span>
          <span className={styles.metaDim}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
