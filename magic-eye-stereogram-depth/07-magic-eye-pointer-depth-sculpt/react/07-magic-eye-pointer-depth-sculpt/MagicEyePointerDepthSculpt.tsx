// MagicEyePointerDepthSculpt — vanilla 판(run/325/demo/07-magic-eye-pointer-depth-sculpt/index.html) 의 React 포트.
// 깊이 지도를 손으로 만지는 항목. sculpt 버퍼(Float32Array)에 포인터가 지나간 자리의 깊이를
// 더하고 빼고, 흔적은 6초에 걸쳐 지수 감쇠로 스며든다. 눈에는 아무 변화가 없다가
// 눈을 늦추는 순간 진흙 위에 쌓인 조각이 떠오른다 — 결과 확인 자체가 반전.
// 왼쪽 끌기는 끌어올림(+0.8), 오른쪽 끌기는 누르기(−0.5).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MagicEyePointerDepthSculpt.module.scss";

export type MagicEyePointerDepthSculptProps = {
  duration?: string;
  easing?: string;
  color?: string;
  brush?: number;    // 브러시 지름(px)
  lift?: number;     // 끌어올림(왼쪽 끌기) — 한 번 스치면 올라가는 깊이 계수
  press?: number;    // 누르기(오른쪽 끌기)
  decay?: number;    // 이행 감쇠(초) — 흔적이 스며드는 시간
  maxshift?: number; // 최대 시프트(px)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const BRUSH    = 26;    // 브러시 지름(px)
const LIFT     = 0.8;   // 끌어올림(왼쪽 끌기)
const PRESS    = 0.5;   // 누르기(오른쪽 끌기)
const DECAY    = 6;     // 이행 감쇠(초)
const MAXSHIFT = 10;    // 최대 시프트(px)
const HOOKS    = 5;     // 격자 연출 갈고리 수

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "깊이 조각 판";
const META_LEFT = "브러시 26px · 끌어올림(+0.8)·누르기(−0.5) · 이행 6초 감쇠";
const META_RIGHT = "ImageData · 깊이 버퍼";
const HINT_TITLE = "포인터 조각";
const HINT_DESC = "포인터가 지나간 자리마다 깊이 흔적이 쌓여 눈에 안 보이는 진흙이 조각이 됩니다";
const GUIDE = "왼쪽 끌기는 끌어올림 · 오른쪽 끌기는 누르기";

// 격자 연출 갈고리 — 리사주 궤적 계수
const RX = [0.40, 0.30, 0.44, 0.36, 0.24];
const RY = [0.36, 0.44, 0.24, 0.30, 0.40];
const CYc = [0.5, 0.3, 0.7, 0.5, 0.5];

export default function MagicEyePointerDepthSculpt({
  duration = "2s",
  easing = "ease-out",
  color = "#e8dcc8",
  brush = BRUSH,
  lift = LIFT,
  press = PRESS,
  decay = DECAY,
  maxshift = MAXSHIFT
}: MagicEyePointerDepthSculptProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef<RGB[] | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const sculptRef = useRef<Float32Array | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const demoRef = useRef(true) as Box<boolean>;
  const modeRef = useRef(0) as Box<number>;
  const lastXRef = useRef<number | null>(null) as Box<number | null>;
  const lastYRef = useRef<number | null>(null) as Box<number | null>;
  const prevXsRef = useRef<(number | null)[]>([]) as Box<(number | null)[]>;
  const prevYsRef = useRef<(number | null)[]>([]) as Box<(number | null)[]>;
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

  function baseIdx(x: number, y: number): number {
    const pal = palRef.current;
    if (!pal) return 0;
    let h = (Math.imul(x + 11, 374761393) + Math.imul(y + 7, 668265263)) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 1274126177) >>> 0;
    h ^= h >>> 16;
    return ((h % pal.length) + pal.length) % pal.length;
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
    imgRef.current = ctx.createImageData(wRef.current, hRef.current);
    sculptRef.current = new Float32Array(wRef.current * hRef.current);   // 리사이즈의 흔적 리셋은 감수한다
  }

  // 브러시 — 선분 (x0,y0)→(x1,y1) 을 따라 반지름 r 원뿔로 찍는다
  function brushStroke(x0: number, y0: number, x1: number, y1: number, amount: number, r2?: number): void {
    const sculpt = sculptRef.current;
    const W = wRef.current, H = hRef.current;
    if (!sculpt) return;
    const r = r2 || brush / 2;
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / (r * 0.4)));
    for (let i = 0; i <= steps; i++) {
      const bx = x0 + (x1 - x0) * (i / steps);
      const by = y0 + (y1 - y0) * (i / steps);
      const x0i = Math.max(0, Math.floor(bx - r)), x1i = Math.min(W - 1, Math.ceil(bx + r));
      const y0i = Math.max(0, Math.floor(by - r)), y1i = Math.min(H - 1, Math.ceil(by + r));
      for (let yy = y0i; yy <= y1i; yy++) {
        for (let xx = x0i; xx <= x1i; xx++) {
          const dx = xx - bx, dy = yy - by;
          const dd = Math.sqrt(dx * dx + dy * dy);
          if (dd >= r) continue;
          const fall = 1 - dd / r;               // 원뿔 falloff — 가장자리는 얕게
          const idx = yy * W + xx;
          const v = sculpt[idx] + amount * fall;
          sculpt[idx] = v < 0 ? 0 : (v > 1 ? 1 : v);
        }
      }
    }
  }

  function draw(): void {
    const ctx = ctxRef.current;
    const img = imgRef.current;
    const pal = palRef.current;
    const sculpt = sculptRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !img || !pal || !sculpt) return;
    const d = img.data;
    const col = new Int32Array(W);
    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let x = 0; x < W; x++) {
        const s = Math.round(sculpt[row + x] * maxshift);
        if (s <= 0) {
          col[x] = baseIdx(x, y);
        } else {
          const from = x - s;
          col[x] = from >= 0 ? col[from] : baseIdx(from + W, y);
        }
      }
      for (let x = 0; x < W; x++) {
        const c = pal[col[x]];
        const di = (y * W + x) * 4;
        d[di] = c[0]; d[di + 1] = c[1]; d[di + 2] = c[2]; d[di + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    if (demoRef.current) {
      ctx.fillStyle = "rgba(240, 224, 208, 0.85)";
      ctx.font = '500 11px "Segoe UI", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(GUIDE, W / 2, H - 10);
    }
  }

  let t0 = -1;
  let lastNow = -1;
  function frame(now: number): void {
    const sculpt = sculptRef.current;
    const W = wRef.current, H = hRef.current;
    if (t0 < 0) { t0 = now; lastNow = now; }
    const dt = Math.min(0.05, (now - lastNow) / 1000 || 0.016);
    lastNow = now;
    const t = (now - t0) / 1000;

    // 격자 연출(demoRef 참) — 갈고리 5개(리사주 궤적)가 판을 넓게 쓸고 다닌다
    if (demoRef.current && sculpt) {
      for (let g = 0; g < HOOKS; g++) {
        const ph = t * 2.6 + g * 1.26;
        const bx = W / 2 + Math.cos(ph) * W * RX[g];
        const by = H * CYc[g] + Math.sin(ph * 2 + g) * H * RY[g];
        const prevX = prevXsRef.current[g];
        if (prevX !== null && prevX !== undefined) {
          const amt = Math.sin(t * 1.9 + g) > -0.25 ? lift : -press;
          brushStroke(prevX, prevYsRef.current[g] as number, bx, by, amt, 20 + (g % 3) * 5);
        }
        prevXsRef.current[g] = bx;
        prevYsRef.current[g] = by;
      }
    }

    // 이행 감쇠 — 흔적이 6초에 걸쳐 스며든다
    if (sculpt) {
      const k = Math.exp(-dt / decay);
      for (let i = 0; i < sculpt.length; i++) {
        if (sculpt[i] !== 0) sculpt[i] *= k;
      }
    }

    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    const field = fieldRef.current;
    if (!root || !cv || !field) return;
    const pal: RGB[] = [];
    for (let i = 0; i < 5; i++) pal.push(tokRGB(root, "--me-p" + i));
    palRef.current = pal;
    ctxRef.current = cv.getContext("2d");
    fit();

    // ── 사람 입력 — 왼쪽/오른쪽 끌기 ──
    const fld: HTMLDivElement = field;
    function localXY(ev: PointerEvent): [number, number] {
      const r = fld.getBoundingClientRect();
      return [ev.clientX - r.left, ev.clientY - r.top];
    }
    function onContext(ev: MouseEvent): void { ev.preventDefault(); }
    function onPointerDown(ev: PointerEvent): void {
      ev.preventDefault();
      demoRef.current = false;   // 첫 손질에서 격자 연출을 물린다
      modeRef.current = ev.button === 2 ? -1 : 1;    // 오른쪽 버튼 = 누르기
      const p = localXY(ev); lastXRef.current = p[0]; lastYRef.current = p[1];
      try { fld.setPointerCapture(ev.pointerId); } catch { /* 캡처 실패는 무시 */ }
    }
    function onPointerMove(ev: PointerEvent): void {
      if (!modeRef.current) return;
      const p = localXY(ev);
      if (lastXRef.current !== null) {
        brushStroke(lastXRef.current, lastYRef.current as number, p[0], p[1], modeRef.current > 0 ? lift : -press);
      }
      lastXRef.current = p[0]; lastYRef.current = p[1];
    }
    function endStroke(): void { modeRef.current = 0; lastXRef.current = null; lastYRef.current = null; }

    field.addEventListener("contextmenu", onContext);
    field.addEventListener("pointerdown", onPointerDown);
    field.addEventListener("pointermove", onPointerMove);
    field.addEventListener("pointerup", endStroke);
    field.addEventListener("pointercancel", endStroke);

    function onResize(): void {
      fit();
      if (reduced()) draw();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 조각 한 점(브러시 자국 몇 개)만 남긴 정지 판
      const W = wRef.current, H = hRef.current;
      brushStroke(W * 0.36, H * 0.5, W * 0.64, H * 0.5, lift);
      brushStroke(W * 0.5, H * 0.3, W * 0.5, H * 0.7, lift);
      draw();
      setStill(true);
    } else {
      t0 = -1;
      lastNow = -1;
      prevXsRef.current = [];
      prevYsRef.current = [];
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      field.removeEventListener("contextmenu", onContext);
      field.removeEventListener("pointerdown", onPointerDown);
      field.removeEventListener("pointermove", onPointerMove);
      field.removeEventListener("pointerup", endStroke);
      field.removeEventListener("pointercancel", endStroke);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brush, lift, press, decay, maxshift]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : `${styles.root} ${styles.isDemo}`;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>{HINT_TITLE}</span>
          <span className={styles.desc}>{HINT_DESC}</span>
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
