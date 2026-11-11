// JuliaOrbitLink — vanilla 판(run/323/demo/03-mb-julia-orbit-link/index.html) 의 React 포트.
// 만델브로와 줄리아는 같은 식의 두 닮은 축.
//   만델브로: c 를 픽셀로, z 를 0 에서 시작 → "어떤 c 가 집합에 드나"
//   줄리아  : z 를 픽셀로, c 를 고정     → "고정 c 에서 어떤 z 가 집합에 드나"
// 포인터(·자동 순항)가 만델브로 위 좌표를 고르면 오른쪽 캔버스가 그 c 로 다시 계산된다.
// 사람이 손을 대면 포인터 좌표가 자동 순항을 이긴다(pointerC). 포인터를 떼면 순항 재개.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as RPointerEvent } from "react";
import styles from "./JuliaOrbitLink.module.scss";

export type JuliaOrbitLinkProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const MAXIT_M = 64, MAXIT_J = 80;   // 만델브로판은 뷰가 넓어 얕게, 줄리아판은 깊게
const IRES = 150;                   // 두 캔버스 각각의 내부 해상도 — 동시 계산이라 낮게 잡는다

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_M_LABEL = "만델브로 c 선택판";
const FIELD_J_LABEL = "줄리아 집합 전시판";
const META_RIGHT = "canvas · z = z² + c · pointermove";
const HINT = "왼쪽 만델브로 위를 포인터가 지나는 좌표가 곧 오른쪽 줄리아 집합의 c 입니다 — 같은 식 z = z² + c 에서 고정하는 쪽이 바뀔 뿐인데 구름과 가지가 실시간으로 변합니다";
const C_INIT = "-0.75, 0.00";

// 만델브로 뷰포트
const MX = -0.75, MY = 0, MSPAN = 2.9;

type Ov = { cv: HTMLCanvasElement; octx: CanvasRenderingContext2D | null };

export default function JuliaOrbitLink({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ff9ebb"
}: JuliaOrbitLinkProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvMRef = useRef<HTMLCanvasElement | null>(null);
  const cvJRef = useRef<HTMLCanvasElement | null>(null);
  const ctxMRef = useRef<CanvasRenderingContext2D | null>(null);
  const ctxJRef = useRef<CanvasRenderingContext2D | null>(null);
  const ovMRef = useRef<Ov | null>(null);
  const ovJRef = useRef<Ov | null>(null);
  const palRef = useRef<RGB[] | null>(null);
  const setRef = useRef<RGB | null>(null);
  const crossRef = useRef<RGB | null>(null);
  const wmRef = useRef(0) as Box<number>;
  const hmRef = useRef(0) as Box<number>;
  const wjRef = useRef(0) as Box<number>;
  const hjRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  // 현재 선택된 c (복소수) — 사람 포인터가 고른 좌표(있으면 자동 순항을 이긴다)
  const curCRef = useRef({ x: -0.75, y: 0 }) as Box<{ x: number; y: number }>;
  const pointerCRef = useRef(null) as Box<{ x: number; y: number } | null>;
  const [cLabel, setCLabel] = useState(C_INIT);
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
    const cvM = cvMRef.current, cvJ = cvJRef.current;
    if (!cvM || !cvJ) return;
    const rM = cvM.parentElement as HTMLDivElement | null;
    const rJ = cvJ.parentElement as HTMLDivElement | null;
    if (!rM || !rJ) return;
    const WM = Math.round(rM.getBoundingClientRect().width), HM = Math.round(rM.getBoundingClientRect().height);
    const WJ = Math.round(rJ.getBoundingClientRect().width), HJ = Math.round(rJ.getBoundingClientRect().height);
    wmRef.current = WM; hmRef.current = HM;
    wjRef.current = WJ; hjRef.current = HJ;
    cvM.width = WM; cvM.height = HM;
    cvJ.width = WJ; cvJ.height = HJ;
    ctxMRef.current = cvM.getContext("2d");
    ctxJRef.current = cvJ.getContext("2d");
    const ovM = document.createElement("canvas");
    ovM.width = IRES; ovM.height = Math.max(2, Math.round(IRES * HM / WM));
    const ovJ = document.createElement("canvas");
    ovJ.width = IRES; ovJ.height = Math.max(2, Math.round(IRES * HJ / WJ));
    ovMRef.current = { cv: ovM, octx: ovM.getContext("2d") };
    ovJRef.current = { cv: ovJ, octx: ovJ.getContext("2d") };
  }

  function colorOf(n: number, maxit: number): RGB {
    const PAL = palRef.current as RGB[];
    const C_SET = setRef.current as RGB;
    if (n >= maxit) return C_SET;
    const u = (n / maxit) * 4;
    const seg = u - Math.floor(u / 4) * 4;
    const a = PAL[Math.floor(seg) % 4], b = PAL[(Math.floor(seg) + 1) % 4];
    const f = seg - Math.floor(seg);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }

  // 만델브로 렌더 — 한 번 그리고 고정(좌표축은 움직이지 않으니)
  function renderM(): void {
    const o = ovMRef.current;
    const ctx = ctxMRef.current;
    const C_SET = setRef.current;
    if (!o || !o.octx || !ctx || !C_SET) return;
    const iw = o.cv.width, ih = o.cv.height;
    const img = o.octx.createImageData(iw, ih);
    const px = img.data;
    const dx = MSPAN / iw, dy = MSPAN / iw;
    const oy0 = MY - (ih * dy) / 2;
    let k = 0;
    for (let j = 0; j < ih; j++) {
      const ci = oy0 + j * dy;
      for (let i = 0; i < iw; i++) {
        const cr = MX - MSPAN / 2 + i * dx;
        let zr = 0, zi = 0, n = 0;
        while (n < MAXIT_M && zr * zr + zi * zi <= 4) {
          const t = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci;
          zr = t; n++;
        }
        const c = colorOf(n, MAXIT_M);
        px[k++] = c[0]; px[k++] = c[1]; px[k++] = c[2]; px[k++] = 255;
      }
    }
    o.octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(o.cv, 0, 0, wmRef.current, hmRef.current);
  }

  // 줄리아 렌더 — z 를 픽셀로, c 고정. 반복문이 colorOf 안으로 들어온 차이가 전부
  function renderJ(cr: number, ci: number): void {
    const o = ovJRef.current;
    const ctx = ctxJRef.current;
    const C_SET = setRef.current;
    if (!o || !o.octx || !ctx || !C_SET) return;
    const iw = o.cv.width, ih = o.cv.height;
    const img = o.octx.createImageData(iw, ih);
    const px = img.data;
    const span = 3.0;                     // 줄리아 뷰포트 폭 — z 평면 ±1.5
    const dx = span / iw, dy = span / iw;
    const oy0 = -(ih * dy) / 2;
    let k = 0;
    for (let j = 0; j < ih; j++) {
      const zi0 = oy0 + j * dy;
      for (let i = 0; i < iw; i++) {
        const zr0 = -span / 2 + i * dx;
        let zr = zr0, zi = zi0, n = 0;
        while (n < MAXIT_J && zr * zr + zi * zi <= 4) {
          const t = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci;
          zr = t; n++;
        }
        const c = colorOf(n, MAXIT_J);
        px[k++] = c[0]; px[k++] = c[1]; px[k++] = c[2]; px[k++] = 255;
      }
    }
    o.octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(o.cv, 0, 0, wjRef.current, hjRef.current);
  }

  // 만델브로 위 c 위치 십자 표식
  function drawCross(): void {
    const ctx = ctxMRef.current;
    const C_CROSS = crossRef.current;
    const WM = wmRef.current, HM = hmRef.current;
    const curC = curCRef.current;
    if (!ctx || !C_CROSS) return;
    const x = (curC.x - (MX - MSPAN / 2)) / MSPAN * WM;
    const y = (curC.y - (MY - (HM / WM * MSPAN) / 2)) / (HM / WM * MSPAN) * HM;
    ctx.strokeStyle = "rgba(" + C_CROSS[0] + "," + C_CROSS[1] + "," + C_CROSS[2] + ",0.95)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y);
    ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7);
    ctx.stroke();
  }

  // 자동 순항 c 경로 — 집합 가장자리(명치 오목부 ↔ 전구 위 안테나)를 부드럽게 왕복.
  // 경계 근처에서 줄리아가 가장 극적으로 바뀐다(연결 dust ↔ 토끼 ↔ 가지).
  function orbitC(t: number): { x: number; y: number } {
    const a = t * Math.PI * 2;
    return {
      x: -0.62 + 0.24 * Math.cos(a),
      y: 0.42 * Math.sin(a) * Math.cos(a * 0.5)
    };
  }

  function setLabel(): void {
    const curC = curCRef.current;
    setCLabel((Math.round(curC.x * 100) / 100) + ", " + (Math.round(curC.y * 100) / 100).toFixed(2));
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % 2.0;
    const pc = pointerCRef.current;
    if (pc) { curCRef.current.x = pc.x; curCRef.current.y = pc.y; }
    else {
      const o = orbitC(loop / 2.0);
      curCRef.current.x = o.x; curCRef.current.y = o.y;
    }
    renderM(); drawCross();
    renderJ(curCRef.current.x, curCRef.current.y);
    setLabel();
    rafRef.current = requestAnimationFrame(frame);
  }

  // 사람 포인터 — 만델브로 캔버스 위. pointermove 로 c 를 직접 고른다
  function onPick(e: RPointerEvent<HTMLCanvasElement>): void {
    const cvM = cvMRef.current;
    if (!cvM) return;
    const r = cvM.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;   // 0~1
    const y = (e.clientY - r.top) / r.height;
    // 세로 span 은 화면 비율과 동일하게 종횡비 보정
    const vspan = MSPAN * (r.height / r.width);
    pointerCRef.current = { x: MX - MSPAN / 2 + x * MSPAN, y: MY - vspan / 2 + y * vspan };
  }
  function onLeave(): void {
    pointerCRef.current = null;
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    palRef.current = ["--mb-c0", "--mb-c1", "--mb-c2", "--mb-c3", "--mb-c4"].map((nm) => tokRGB(root, nm));
    setRef.current = tokRGB(root, "--mb-set");
    crossRef.current = tokRGB(root, "--mb-cross");
    fit();
    renderM();
    function onResize(): void {
      fit(); renderM(); drawCross();
      renderJ(curCRef.current.x, curCRef.current.y); setLabel();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 순항 대신 토끼 근처 한 점을 고정
      curCRef.current = { x: -0.62, y: 0.38 };
      drawCross(); renderJ(curCRef.current.x, curCRef.current.y); setLabel();
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
  }, []);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>{HINT}</span>
        </p>
        <div className={styles.duo}>
          <div className={styles.field} role="application" aria-label={FIELD_M_LABEL} tabIndex={0}>
            <canvas
              className={styles.cv}
              ref={cvMRef}
              onPointerMove={onPick}
              onPointerDown={onPick}
              onPointerLeave={onLeave}
            ></canvas>
          </div>
          <div className={styles.field} role="application" aria-label={FIELD_J_LABEL} tabIndex={0}>
            <canvas className={styles.cv} ref={cvJRef}></canvas>
          </div>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>c = {cLabel}</span>
          <span className={styles.metaDim}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
