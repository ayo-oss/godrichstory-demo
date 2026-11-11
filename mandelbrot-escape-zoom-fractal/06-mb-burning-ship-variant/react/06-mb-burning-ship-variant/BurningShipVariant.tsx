// BurningShipVariant — vanilla 판(run/323/demo/06-mb-burning-ship-variant/index.html) 의 React 포트.
// 식 한 줄의 힘. 만델브로: z = z² + c. 버닝쉽: z = (|Re z| + i|Im z|)² + c — 제곱 전에 두 성분의 절댓값.
// 절댓값이 위 반평면의 궤적을 아래로 접기 때문에 지수가 쌓이는 방향(아래)으로 "불꽃"이 뻗는다.
// 뷰포트는 표준 버닝쉽 프레임(배 본체가 보이는 -1.8~-0.7 · -0.1~-0.9, y 뒤집기).
// 움직임: 불꽃 발광 위상 순환(불꽃 끝단이 위로 갈수록 밝아지는 램프를 얹어 "타오르는" 느낌)
// + 미세 확대 숨.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BurningShipVariant.module.scss";

export type BurningShipVariantProps = {
  duration?: string;
  easing?: string;
  color?: string;
  power?: number;    // 지수 — 변형 "식 바꾸기"가 2 → 3 (z³+c, 대칭 2회→3회)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const MAXIT = 128;   // 최대 반복
const IRES = 240;    // 내부 계산 해상도(가로 픽셀)

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "버닝쉽 변형 실험판";
const META_LEFT = "z = |z|² + c · 최대 반복 128";
const META_RIGHT = "canvas · Math.abs · requestAnimationFrame";
const HINT = "제곱 전에 실수·허수에 절댓값 한 줄만 씌우면 만델브로가 사라지고 불꽃을 뿜는 배가 나타납니다 — 절댓값이 궤적을 아래 반평면으로 접어 넣어 불꽃 무늬가 생깁니다";

// 버닝쉽 표준 뷰 — 본체(배)가 중앙, 불꽃이 아래로. y 축은 화면 좌표(위가 -)라 뒤집는다
const CX = -1.755, CY = -0.04, SPAN0 = 1.35;

export default function BurningShipVariant({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ffe9ad",
  power = 2
}: BurningShipVariantProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ovRef = useRef<HTMLCanvasElement | null>(null);
  const octxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef<RGB[] | null>(null);
  const setRef = useRef<RGB | null>(null);
  const powerRef = useRef(power) as Box<number>;
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

  function render(phase: number, breath: number): void {
    const octx = octxRef.current;
    const ov = ovRef.current;
    const ctx = ctxRef.current;
    const PAL = palRef.current;
    const C_SET = setRef.current;
    const W = wRef.current, H = hRef.current;
    const POWER = powerRef.current;
    if (!octx || !ov || !ctx || !PAL || !C_SET) return;
    const iw = ov.width, ih = ov.height;
    const span = SPAN0 * breath;
    const img = octx.createImageData(iw, ih);
    const px = img.data;
    const dx = span / iw, dy = span / iw;
    const oy0 = CY - (ih * dy) / 2;
    let k = 0;
    for (let j = 0; j < ih; j++) {
      const ci = oy0 + j * dy;
      for (let i = 0; i < iw; i++) {
        const cr = CX - span / 2 + i * dx;
        let zr = 0, zi = 0, n = 0;
        while (n < MAXIT && zr * zr + zi * zi <= 4) {
          // ── 버닝쉽의 한 줄 — 제곱 전 절댓값 ──
          const ar = Math.abs(zr), ai = Math.abs(zi);
          let t: number;
          if (POWER === 2) {
            t = ar * ar - ai * ai + cr;
            zi = 2 * ar * ai + ci;
          } else {
            // 3차 변형 — (|z|)³: 데 무아브르 3배각
            t = ar * ar * ar - 3 * ar * ai * ai + cr;
            zi = 3 * ar * ar * ai - ai * ai * ai + ci;
          }
          zr = t;
          n++;
        }
        let r: number, g: number, b: number;
        if (n >= MAXIT) {
          r = C_SET[0]; g = C_SET[1]; b = C_SET[2];
        } else {
          // 불꽃 램프 — 화면 아래(불꽃 끝)로 갈수록 밝게. j 가 클수록 아래
          const heat = (j / ih) * 0.7 + (n / MAXIT) * 0.3;
          const u = heat * 3 + phase;
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

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % 2.0;
    const t = loop / 2.0;
    const phase = t * 3;                                   // 발광 위상 — 2초에 파장 3칸
    const breath = 1 + 0.045 * Math.sin(t * Math.PI * 2);  // 미세 확대 숨(±4.5%)
    render(phase, breath);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    powerRef.current = power;
    // 불 팔레트 — 짙은 밤청 → 보라 → 파스텔 골드 → 복숭아 (고명도 파스텔이라 vivid 아님)
    palRef.current = ["--mb-f0", "--mb-f1", "--mb-f2", "--mb-f3", "--mb-f4"].map((nm) => tokRGB(root, nm));
    setRef.current = tokRGB(root, "--mb-set");
    fit();
    function onResize(): void {
      fit(); render(0.5, 1);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      render(0.5, 1);                      // reduce — 발광 위상 한 장 고정
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
  }, [power]);

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
