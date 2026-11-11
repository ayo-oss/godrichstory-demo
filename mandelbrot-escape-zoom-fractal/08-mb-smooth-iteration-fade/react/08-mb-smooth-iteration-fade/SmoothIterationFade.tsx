// SmoothIterationFade — vanilla 판(run/323/demo/08-mb-smooth-iteration-fade/index.html) 의 React 포트.
// 후처리 한 겹의 차이.
// 정수 반복수 n 은 색 띠를 계단으로 만든다(링 안쪽으로 갈수록 띠가 넓어져 굵은 계단).
// 스무스 공식: ν = n + 1 − log₂(log|z|). 탈출 직후의 |z| 가 2에서 얼마나 떨어졌는지를
// 로그 두 번으로 0~1 소수로 바꿔 n 에 보간한다 — 같은 계산에 이 한 줄만 얹으면 띠가 사라진다.
// 왼쪽 캔버스 = 원본 정수 n, 오른쪽 = 스무스 ν. 같은 팔레트, 같은 주기로 순환시키면
// 차이가 옆에서 바로 보인다. 뷰는 띠가 가장 두드러지는 명치-전구 사이 해안가 클로즈업.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SmoothIterationFade.module.scss";

export type SmoothIterationFadeProps = {
  duration?: string;
  easing?: string;
  color?: string;
  period?: number;   // 색 순환 주기(반복수 단위) — 변형 "팔레트 주기"가 64 → 16
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const MAXIT = 160;   // 최대 반복
const IRES = 150;    // 두 캔버스 각각의 내부 해상도

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_B_LABEL = "정수 반복수 원본판";
const FIELD_S_LABEL = "스무스 반복수 처리판";
const META_LEFT = "ν = n + 1 − log₂(log|z|) · 주기 64";
const META_RIGHT = "canvas · Math.log · requestAnimationFrame";
const HINT = "탈출 직후 크기의 로그를 반복 횟수에 더해 소수 반복수를 만들면 계단처럼 끊기던 색 띠가 연속 그라디언트로 흐릅니다 — 왼쪽이 원본, 오른쪽이 스무스입니다";
const TAG_B = "정수 n";
const TAG_S = "스무스 n";

// 해안가 클로즈업 — 전구와 명치 사이 목(띠가 가장 두꺼운 지점)
const CX = -0.65, CY = -0.42, SPAN = 0.55;

export default function SmoothIterationFade({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#4cd4a6",
  period = 64
}: SmoothIterationFadeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvBRef = useRef<HTMLCanvasElement | null>(null);
  const cvSRef = useRef<HTMLCanvasElement | null>(null);
  const ctxBRef = useRef<CanvasRenderingContext2D | null>(null);
  const ctxSRef = useRef<CanvasRenderingContext2D | null>(null);
  const ovBRef = useRef<HTMLCanvasElement | null>(null);
  const ovSRef = useRef<HTMLCanvasElement | null>(null);
  const octxBRef = useRef<CanvasRenderingContext2D | null>(null);
  const octxSRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef<RGB[] | null>(null);
  const setRef = useRef<RGB | null>(null);
  const periodRef = useRef(period) as Box<number>;
  const wbRef = useRef(0) as Box<number>;
  const hbRef = useRef(0) as Box<number>;
  const wsRef = useRef(0) as Box<number>;
  const hsRef = useRef(0) as Box<number>;
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
    const cvB = cvBRef.current, cvS = cvSRef.current;
    if (!cvB || !cvS) return;
    const rB = cvB.parentElement as HTMLDivElement | null;
    const rS = cvS.parentElement as HTMLDivElement | null;
    if (!rB || !rS) return;
    const WB = Math.round(rB.getBoundingClientRect().width), HB = Math.round(rB.getBoundingClientRect().height);
    const WS = Math.round(rS.getBoundingClientRect().width), HS = Math.round(rS.getBoundingClientRect().height);
    wbRef.current = WB; hbRef.current = HB;
    wsRef.current = WS; hsRef.current = HS;
    cvB.width = WB; cvB.height = HB;
    cvS.width = WS; cvS.height = HS;
    ctxBRef.current = cvB.getContext("2d");
    ctxSRef.current = cvS.getContext("2d");
    const ovB = document.createElement("canvas");
    ovB.width = IRES; ovB.height = Math.max(2, Math.round(IRES * HB / WB));
    const ovS = document.createElement("canvas");
    ovS.width = IRES; ovS.height = Math.max(2, Math.round(IRES * HS / WS));
    ovBRef.current = ovB;
    ovSRef.current = ovS;
    octxBRef.current = ovB.getContext("2d");
    octxSRef.current = ovS.getContext("2d");
  }

  // 색 — u(반복수/주기) 를 팔레트 고리로
  function palAt(u: number): RGB {
    const PAL = palRef.current as RGB[];
    const seg = u - Math.floor(u / 4) * 4;
    const a = PAL[Math.floor(seg) % 4], b = PAL[(Math.floor(seg) + 1) % 4];
    const f = seg - Math.floor(seg);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }

  // nu 조리개 — smooth=false 면 정수 n, true 면 스무스 ν
  function render(octx: CanvasRenderingContext2D | null, iw: number, ih: number, smooth: boolean, phase: number): void {
    const C_SET = setRef.current;
    const PERIOD = periodRef.current;
    if (!octx || !C_SET) return;
    const img = octx.createImageData(iw, ih);
    const px = img.data;
    const dx = SPAN / iw, dy = SPAN / iw;
    const oy0 = CY - (ih * dy) / 2;
    let k = 0;
    for (let j = 0; j < ih; j++) {
      const ci = oy0 + j * dy;
      for (let i = 0; i < iw; i++) {
        const cr = CX - SPAN / 2 + i * dx;
        let zr = 0, zi = 0, n = 0, zz = 0;
        while (n < MAXIT && (zz = zr * zr + zi * zi) <= 4) {
          const t = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci;
          zr = t; n++;
        }
        let c: RGB;
        if (n >= MAXIT) {
          c = C_SET;
        } else {
          let nu: number;
          if (smooth) {
            // ── 스무스 공식 — 탈출 직후 |z| 의 이중 로그를 보간 ──
            const mod = Math.sqrt(zz);
            nu = n + 1 - Math.log(Math.log(mod)) / Math.LN2;
          } else {
            nu = n;                       // 원본 — 계단의 원인
          }
          c = palAt((nu / PERIOD) * 4 + phase);
        }
        px[k++] = c[0]; px[k++] = c[1]; px[k++] = c[2]; px[k++] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
  }

  function blit(): void {
    const ctxB = ctxBRef.current, ctxS = ctxSRef.current;
    const ovB = ovBRef.current, ovS = ovSRef.current;
    if (!ctxB || !ctxS || !ovB || !ovS) return;
    ctxB.drawImage(ovB, 0, 0, wbRef.current, hbRef.current);
    ctxS.drawImage(ovS, 0, 0, wsRef.current, hsRef.current);
    // 스무스판 하이라이트 — 창 아래쪽 절반에 파스텔 크림 광택을 살짝(차이 돋보이게)
    const WS = wsRef.current, HS = hsRef.current;
    const lg = ctxS.createLinearGradient(0, HS * 0.5, 0, HS);
    lg.addColorStop(0, "rgba(239,234,255,0)");
    lg.addColorStop(1, "rgba(239,234,255,0.05)");
    ctxS.fillStyle = lg;
    ctxS.fillRect(0, HS * 0.5, WS, HS * 0.5);
  }

  function drawStill(): void {
    const ovB = ovBRef.current, ovS = ovSRef.current;
    if (!ovB || !ovS) return;
    render(octxBRef.current, ovB.width, ovB.height, false, 0.8);
    render(octxSRef.current, ovS.width, ovS.height, true, 0.8);
    blit();
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % 2.0;
    const phase = (loop / 2.0) * 4;         // 주기 안에 파장 한 바퀴
    const ovB = ovBRef.current, ovS = ovSRef.current;
    if (ovB && ovS) {
      render(octxBRef.current, ovB.width, ovB.height, false, phase);
      render(octxSRef.current, ovS.width, ovS.height, true, phase);
      blit();
    }
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    periodRef.current = period;
    palRef.current = ["--mb-c0", "--mb-c1", "--mb-c2", "--mb-c3", "--mb-c4"].map((nm) => tokRGB(root, nm));
    setRef.current = tokRGB(root, "--mb-set");
    fit();
    function onResize(): void {
      fit(); drawStill();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      drawStill();                  // reduce — 같은 위상 한 장 고정(비교는 여전히 성립)
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
  }, [period]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>{HINT}</span>
        </p>
        <div className={styles.duo}>
          <div className={styles.field} role="application" aria-label={FIELD_B_LABEL} tabIndex={0}>
            <canvas className={styles.cv} ref={cvBRef}></canvas>
            <span className={styles.tag}>{TAG_B}</span>
          </div>
          <div className={styles.field} role="application" aria-label={FIELD_S_LABEL} tabIndex={0}>
            <canvas className={styles.cv} ref={cvSRef}></canvas>
            <span className={`${styles.tag} ${styles.tagOn}`}>{TAG_S}</span>
          </div>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT}</span>
          <span className={styles.metaDim}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
