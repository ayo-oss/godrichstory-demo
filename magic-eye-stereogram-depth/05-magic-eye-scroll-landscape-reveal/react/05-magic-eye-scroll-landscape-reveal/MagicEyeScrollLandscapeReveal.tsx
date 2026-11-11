// MagicEyeScrollLandscapeReveal — vanilla 판(run/325/demo/05-magic-eye-scroll-landscape-reveal/index.html) 의 React 포트.
// 깊이 지도를 가로지르는 이동 거리를 입력에 묶는다. 지형 높이 = 무빙 램프 3옥타브
// (서로 다른 파장의 사인 합) — x 에 여행 오프셋을 더해 샘플한다.
// 휠·가로 드래그로 직접 여행하고, 손을 떼면 자동 주행이 이어받아 루프가 끊기지 않는다.
// 산맥이 노이즈 너머로 흐르는 대표 장면 — 스크롤 트리거와 픽셀 계산이 한 몸이다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MagicEyeScrollLandscapeReveal.module.scss";

export type MagicEyeScrollLandscapeRevealProps = {
  duration?: string;
  easing?: string;
  color?: string;
  maxshift?: number;  // 산 높이(px)
  speed?: number;     // 자동 주행 속도(px/초)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const MAXSHIFT = 12;   // 산 높이(px)
const SPEED    = 90;   // 자동 주행 속도(px/초)

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "스크롤 지형 탐사판";
const META_LEFT = "휠·드래그로 이동 · 무빙 램프 3옥타브 · 깊이 12px";
const META_RIGHT = "ImageData · 이동 오프셋";
const HINT_TITLE = "스크롤 지형";
const HINT_DESC = "스크롤 위치를 지형 이동 거리에 묶으면 산맥과 골짜기가 노이즈 너머로 흐릅니다";
const GUIDE = "휠이나 드래그로 지형을 지나가 보세요";

export default function MagicEyeScrollLandscapeReveal({
  duration = "2s",
  easing = "ease-out",
  color = "#ccd8ea",
  maxshift = MAXSHIFT,
  speed = SPEED
}: MagicEyeScrollLandscapeRevealProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef<RGB[] | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const travelRef = useRef(0) as Box<number>;
  const hoverRef = useRef(false) as Box<boolean>;
  const dragRef = useRef<number | null>(null) as Box<number | null>;
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
  }

  // 지형 — 3옥타브 무빙 램프. wx = 세계 좌표(여행 오프셋 더한 x)
  function terrain(wx: number, y: number): number {
    const H = hRef.current;
    let v = 0;
    v += Math.sin(wx * 0.011 + y * 0.004) * 0.45;
    v += Math.sin(wx * 0.031 + 1.7 + y * 0.010) * 0.30;
    v += Math.sin(wx * 0.074 + 4.2) * 0.18;
    v += (Math.cos(wx * 0.005 + y * 0.006) * 0.5 + 0.5) * 0.35;
    const front = y / H;                       // 화면 하단(앞쪽)이 더 높게 솟는다
    return Math.max(0, Math.min(1, v * 0.5 + 0.5)) * (0.35 + 0.65 * front * front);
  }

  function draw(travel: number, hover: boolean): void {
    const ctx = ctxRef.current;
    const img = imgRef.current;
    const pal = palRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !img || !pal) return;
    const d = img.data;
    const col = new Int32Array(W);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const s = Math.round(terrain(x + travel, y) * maxshift);
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

    if (!hover) {
      ctx.fillStyle = "rgba(214, 222, 236, 0.8)";
      ctx.font = '500 11px "Segoe UI", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(GUIDE, W / 2, H - 10);
    }
  }

  let t0 = -1;
  let lastNow = -1;
  function frame(now: number): void {
    if (t0 < 0) { t0 = now; lastNow = now; }
    const dt = Math.min(0.05, (now - lastNow) / 1000 || 0.016);
    lastNow = now;
    travelRef.current += dt * speed;   // 자동 주행 — 손이 있으면 휠·드래그가 겹쳐 더해진다
    draw(travelRef.current, hoverRef.current);
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

    // ── 입력 — 휠 · 가로 드래그 ──
    function onWheel(ev: WheelEvent): void {
      ev.preventDefault();
      travelRef.current += (ev.deltaY + ev.deltaX) * 0.6;
      hoverRef.current = true;
    }
    function onPointerDown(ev: PointerEvent): void {
      dragRef.current = ev.clientX; hoverRef.current = true;
      ev.preventDefault();
    }
    function onPointerMove(ev: PointerEvent): void {
      if (dragRef.current === null) return;
      travelRef.current -= (ev.clientX - dragRef.current) * 1.2;
      dragRef.current = ev.clientX;
    }
    function onPointerUp(): void { dragRef.current = null; }
    function onPointerEnter(): void { hoverRef.current = true; }

    field.addEventListener("wheel", onWheel, { passive: false });
    field.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    field.addEventListener("pointerenter", onPointerEnter);

    function onResize(): void {
      fit();
      if (reduced()) draw(0, true);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(0, true);                               // reduce — 골짜기 한 장만 고정
      setStill(true);
    } else {
      t0 = -1;
      lastNow = -1;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      field.removeEventListener("wheel", onWheel);
      field.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      field.removeEventListener("pointerenter", onPointerEnter);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxshift, speed]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

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
